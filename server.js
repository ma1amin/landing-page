'use strict';
/**
 * Personal branding site · MySQL database + admin portal
 *  - static hosting for /public
 *  - /api/slots          -> available booking slots for a month
 *  - /api/bookings       -> create a booking (stored in MySQL)
 *  - /api/collaborations -> "Open to collaboration" submissions (stored in MySQL)
 *  - /api/questionnaire  -> questionnaire submissions (stored in MySQL)
 *  - /api/admin/login     -> admin login (session-based)
 *  - /api/admin/logout    -> admin logout
 *  - /api/admin/*         -> admin dashboard endpoints (session protected)
 *
 * Email delivery is optional: set SMTP_* env vars (see config.example.env).
 * Database is required: set DB_* env vars (see config.example.env).
 */
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const https = require('node:https');
const nodemailer = require('nodemailer');
require('./env').loadEnv();
const db = require('./database');
const { SESSION_TYPES, allowedProviders, publicBooking, adminBooking } = require('./meeting-policy');
const { configuration, assertConfiguration, createProviders } = require('./meeting-providers');
const { createMeetingStore } = require('./meeting-store');
const { createMeetingWorker } = require('./meeting-worker');
const { generateICS } = require('./calendar-invite');
const meetingConfig = configuration();
assertConfiguration(meetingConfig);
const { 
  generateSalt, 
  hashPassword, 
  verifyPassword, 
  generateSessionId, 
  getSessionExpiry,
  isValidSessionId,
  validatePasswordStrength 
} = require('./auth');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'info@malamin.cc';

/* Bot protection for the questionnaire. Empty means the check is skipped,
   which is what keeps the offline preview working. */
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET || '';
const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY || '';

/* Trust X-Forwarded-For only when a proxy you control sets it. Left off, the
   socket address is used, which an attacker cannot spoof. */
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const ENABLE_HSTS = process.env.ENABLE_HSTS === '1';

/* Object lookups walk the prototype chain, so SESSION_TYPES['constructor']
   is truthy and would slip past a plain `SESSION_TYPES[t] ? t : fallback`
   check. Own-property checks close that. */
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

const isHttps = (req) =>
  Boolean(req.socket && req.socket.encrypted) ||
  String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';

function clientIp(req) {
  if (TRUST_PROXY) {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length) {
      const first = xff.split(',')[0].trim();
      if (first) return first;
    }
  }
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

/* ------------------------------------------------------------------ *
 * Rate limiting · in-memory, per IP, fixed window
 * ------------------------------------------------------------------ */
const RATE_BUCKETS = new Map();
function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  let b = RATE_BUCKETS.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    RATE_BUCKETS.set(key, b);
  }
  b.count += 1;
  if (b.count > limit) return { ok: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  return { ok: true };
}
/* Bound the map so a rotating source cannot grow it without limit. unref so
   the timer never keeps the process alive. */
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of RATE_BUCKETS) if (now >= v.resetAt) RATE_BUCKETS.delete(k);
}, 60000).unref();

const LIMITS = {
  'POST /api/bookings':       { limit: 10, windowMs: 10 * 60 * 1000 },
  'POST /api/collaborations': { limit: 5,  windowMs: 10 * 60 * 1000 },
  'POST /api/questionnaire':  { limit: 5,  windowMs: 10 * 60 * 1000 },
  'GET /api/slots':           { limit: 60, windowMs: 60 * 1000 },
  'POST /api/admin/login':    { limit: 5,  windowMs: 5 * 60 * 1000 },
  'admin':                    { limit: 20, windowMs: 10 * 60 * 1000 },
};

/* ------------------------------------------------------------------ *
 * Security headers
 * ------------------------------------------------------------------ */
function csp(nonce, isAdmin = false) {
  const adminDirectives = isAdmin 
    ? " script-src 'self' 'nonce-" + nonce + "'" 
    : " script-src 'self' https://challenges.cloudflare.com" + (nonce ? " 'nonce-" + nonce + "'" : '');
  
  return [
    "default-src 'self'",
    adminDirectives,
    "style-src 'self'" + (isAdmin ? " 'nonce-" + nonce + "'" : ''),
    "img-src 'self' data: https://avatars.githubusercontent.com",
    "font-src 'self'",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

function securityHeaders(req, nonce, isAdmin = false) {
  const h = {
    'Content-Security-Policy': csp(nonce, isAdmin),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Permitted-Cross-Domain-Policies': 'none',
  };
  if (ENABLE_HSTS && isHttps(req)) {
    h['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }
  return h;
}

/* ------------------------------------------------------------------ *
 * Session validation helper
 * ------------------------------------------------------------------ */
async function validateSession(req) {
  const sessionId = req.cookies.session_id;
  
  if (!sessionId || !isValidSessionId(sessionId)) {
    return null;
  }
  
  const session = await db.getSession(sessionId);
  if (!session) {
    return null;
  }
  
  return { id: session.user_id, username: session.username };
}

/* ------------------------------------------------------------------ *
 * Timezone helpers · Asia/Riyadh is a fixed UTC+3 (no DST)
 * ------------------------------------------------------------------ */
const TZ_OFFSET_MIN = 180;
const TZ_LABEL = 'Asia/Riyadh (GMT+3)';

function riyadhParts(d = new Date()) {
  return new Date(d.getTime() + TZ_OFFSET_MIN * 60000);
}
function isoDate(shifted) {
  return shifted.toISOString().slice(0, 10);
}
function todayRiyadh() {
  return isoDate(riyadhParts());
}
function nowRiyadhMinutes() {
  const s = riyadhParts();
  return s.getUTCHours() * 60 + s.getUTCMinutes();
}

/* ------------------------------------------------------------------ *
 * Availability rules
 * ------------------------------------------------------------------ */
const WORKDAYS = [0, 1, 2, 3, 4];           // Sun – Thu (Saudi working week)
const SLOT_MINUTES = 30;
const DAY_START = 10 * 60;                  // 10:00
const LUNCH_START = 12 * 60;                // 12:00
const LUNCH_END = 13 * 60;                  // 13:00
const DAY_END = 16 * 60;                    // last slot starts 15:30, ends 16:00
const LEAD_MINUTES = 4 * 60;                // must book at least 4h ahead
const HORIZON_DAYS = 60;

/* price is in USD; 0 means free. The client never sends a price, it is
   always derived from the session type here, so it cannot be spoofed. */

function priceText(usd) { return usd === 0 ? 'Free (no charge)' : '$' + usd + ' USD'; }

function slotStarts() {
  const out = [];
  for (let m = DAY_START; m < DAY_END; m += SLOT_MINUTES) {
    if (m >= LUNCH_START && m < LUNCH_END) continue;
    out.push(m);
  }
  return out;
}
const SLOT_STARTS = slotStarts();

function hhmm(m) {
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
function toMin(hhmmStr) {
  const [h, m] = hhmmStr.split(':').map(Number);
  return h * 60 + m;
}

/* ------------------------------------------------------------------ *
 * Database-based availability (replaces JSON)
 * ------------------------------------------------------------------ */
function overlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

async function busyIntervals(dateStr) {
  const bookings = await db.getBookings();
  return bookings
    .filter((b) => b.date === dateStr && b.status !== 'cancelled')
    .map((b) => [toMin(b.time), toMin(b.time) + (b.duration || 30)]);
}

async function dayAvailability(dateStr, duration) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  const dow = probe.getUTCDay();

  const result = { date: dateStr, slots: [] };
  if (!WORKDAYS.includes(dow)) return result;

  const today = todayRiyadh();
  const nowMin = nowRiyadhMinutes();
  const horizon = isoDate(riyadhParts(new Date(Date.now() + HORIZON_DAYS * 86400000)));
  if (dateStr < today || dateStr > horizon) return result;

  const busy = await busyIntervals(dateStr);

  for (const start of SLOT_STARTS) {
    const end = start + duration;
    if (end > DAY_END) continue;
    // cannot span the lunch break
    if (start < LUNCH_END && end > LUNCH_START) continue;
    if (dateStr === today && start < nowMin + LEAD_MINUTES) continue;
    const taken = busy.some(([bs, be]) => overlap(start, end, bs, be));
    result.slots.push({ time: hhmm(start), available: !taken });
  }
  return result;
}

/* ------------------------------------------------------------------ *
 * Email (optional)
 * ------------------------------------------------------------------ */
const SMTP = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false') === 'true',
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
};

const mailEnabled = Boolean(SMTP.host && SMTP.user && SMTP.pass && SMTP.from);
if (mailEnabled) console.log('[mail] SMTP configured · notifications will be sent to', NOTIFY_EMAIL);
else console.log('[mail] SMTP not configured · submissions will be stored in database only.');
console.log('[captcha] ' + (TURNSTILE_SECRET ? 'Turnstile enabled' : 'not configured · questionnaire submissions are unchecked'));
console.log('[database] MySQL integration enabled');

/*
 * Verifies a Turnstile token with Cloudflare. Resolves ok:true when no
 * secret is configured, so the site works without bot protection.
 */
async function verifyTurnstile(token, remoteIp) {
  if (!TURNSTILE_SECRET) return { ok: true, skipped: true };
  if (!token) return { ok: false, reason: 'missing_token' };

  const params = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token });
  if (remoteIp) params.set('remoteip', remoteIp);
  const body = params.toString();

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'challenges.cloudflare.com',
      path: '/turnstile/v0/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 8000,
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          resolve(j.success
            ? { ok: true }
            : { ok: false, reason: 'rejected', codes: j['error-codes'] || [] });
        } catch (_) {
          resolve({ ok: false, reason: 'bad_response' });
        }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, reason: 'timeout' }); });
    req.on('error', () => resolve({ ok: false, reason: 'network_error' }));
    req.write(body);
    req.end();
  });
}

async function notify(subject, body) {
  if (!mailEnabled) {
    console.log('\n[mail:skipped] ' + subject + '\n' + body + '\n');
    return { sent: false };
  }
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP.host,
      port: SMTP.port,
      secure: SMTP.secure,
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      auth: {
        user: SMTP.user,
        pass: SMTP.pass
      }
    });
    await transporter.sendMail({
      from: SMTP.from,
      to: NOTIFY_EMAIL,
      subject: subject,
      text: body
    });
    return { sent: true };
  } catch (err) {
    console.error('[mail] failed:', err.message);
    return { sent: false, error: err.message };
  }
}

async function sendUserConfirmation(type, data) {
  if (!mailEnabled) return { sent: false };
  
  const templates = require('./email-templates');
  let html, text, subject, icsContent = null;
  
  if (type === 'booking') {
    subject = `${data.meetingPending ? 'Booking Confirmed - Meeting Details Pending' : 'Booking Confirmed'}: ${data.ref} - ${data.sessionName}`;
    html = templates.bookingConfirmationHTML(data);
    text = templates.bookingTextFallback(data);
    icsContent = data.meetingPending ? null : generateICS(data);
  } else if (type === 'collaboration') {
    subject = `Collaboration Request Received: ${data.ref}`;
    html = templates.collaborationConfirmationHTML(data);
    text = templates.collaborationTextFallback(data);
  } else if (type === 'questionnaire') {
    subject = `Questionnaire Received: ${data.ref}`;
    html = templates.questionnaireConfirmationHTML(data);
    text = templates.questionnaireTextFallback(data);
  }
  
  const mailOptions = {
    from: SMTP.from,
    to: data.email,
    subject: subject,
    text: text,
    html: html,
    replyTo: 'no-reply@malamin.cc'
  };
  
  if (icsContent) {
    mailOptions.icalEvent = {
      filename: 'invite.ics',
      method: 'REQUEST',
      content: icsContent
    };
  }
  
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP.host,
      port: SMTP.port,
      secure: SMTP.secure,
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      auth: {
        user: SMTP.user,
        pass: SMTP.pass
      }
    });
    await transporter.sendMail(mailOptions);
    return { sent: true };
  } catch (err) {
    console.error('[user-mail] failed:', err.message);
    return { sent: false, error: err.message };
  }
}

const meetingStore = createMeetingStore(db.pool);
const meetingWorker = createMeetingWorker({ store: meetingStore, providers: createProviders(meetingConfig),
  sendConfirmation: (booking, ready) => sendUserConfirmation('booking', {
    ...booking, sessionName: booking.session_name, meetingPending: !ready, join_url: ready ? booking.join_url : null,
  }), notifyAdmin: notify });

/* ------------------------------------------------------------------ *
 * HTTP helpers
 * ------------------------------------------------------------------ */
function json(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  }, securityHeaders(res.req, null)));
  res.end(body);
}
function readBody(req, limit = 64000) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > limit) { reject(new Error('payload too large')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const clean = (v, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...parts] = cookie.split('=');
    const value = parts.join('=');
    cookies[name.trim()] = decodeURIComponent(value.trim());
  });
  
  return cookies;
}

async function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  if (rel === '/questionnaire') rel = '/questionnaire.html';
  if (rel === '/privacy') rel = '/privacy.html';
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403).end('Forbidden'); return; }
  const notFound = () => {
    const b = Buffer.from('<h1>404</h1><p>Not found</p><a href="/">Back to site</a>', 'utf8');
    res.writeHead(404, Object.assign({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': b.length,
    }, securityHeaders(req, null)));
    res.end(b);
  };
  try {
    const stat = await fsp.stat(filePath);
    if (stat.isDirectory()) throw new Error('dir');
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    /* HTML carries one inline script, so it gets a fresh per-response nonce.
       Everything else is served as-is. */
    if (ext === '.html') {
      const nonce = crypto.randomBytes(16).toString('base64');
      const raw = await fsp.readFile(filePath, 'utf8');
      const patched = raw.replace(/<script(?![^>]*\bsrc=)(?![^>]*\bnonce=)/gi, '<script nonce="' + nonce + '"')
          .replace(/<style(?![^>]*\bnonce=)/gi, '<style nonce="' + nonce + '"');
      const buf = Buffer.from(patched, 'utf8');
      res.writeHead(200, Object.assign({
        'Content-Type': type,
        'Content-Length': buf.length,
        'Cache-Control': 'no-cache',
      }, securityHeaders(req, nonce)));
      res.end(buf);
      return;
    }
    res.writeHead(200, Object.assign({
      'Content-Type': type,
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
    }, securityHeaders(req, null)));
    fs.createReadStream(filePath).pipe(res);
  } catch (_) {
    notFound();
  }
}

/* ------------------------------------------------------------------ *
 * Routes
 * ------------------------------------------------------------------ */
const server = http.createServer(async (req, res) => {
  /* Nothing in this project is a cross-origin client, so preflight is
     answered without any Access-Control-Allow-Origin. Browsers then block
     cross-origin reads, which is what we want. */
  if (req.method === 'OPTIONS') {
    res.writeHead(204, Object.assign({ 'Content-Length': 0 }, securityHeaders(req, null)));
    return res.end();
  }
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const p = url.pathname;
  const ip = clientIp(req);
  req.cookies = parseCookies(req.headers.cookie);

  /* Rate limit before any work is done. */
  const gate = LIMITS[req.method + ' ' + p];
  if (gate) {
    const r = rateLimit(ip + '|' + req.method + ' ' + p, gate.limit, gate.windowMs);
    if (!r.ok) {
      res.setHeader('Retry-After', String(r.retryAfter));
      return json(res, 429, { error: 'rate_limited', message: 'Too many requests. Please try again in a few minutes.' });
    }
  }

  try {
    /* ---------- Slots ---------- */
    if (p === '/api/slots' && req.method === 'GET') {
      const month = (url.searchParams.get('month') || '').slice(0, 7); // YYYY-MM
      const type = url.searchParams.get('type') || 'discovery';
      const session = hasOwn(SESSION_TYPES, type) ? SESSION_TYPES[type] : SESSION_TYPES.discovery;
      if (!/^\d{4}-\d{2}$/.test(month)) return json(res, 400, { error: 'month must be YYYY-MM' });

      const [y, m] = month.split('-').map(Number);
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const days = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${month}-${String(d).padStart(2, '0')}`;
        const avail = await dayAvailability(dateStr, session.duration);
        days.push(avail);
      }
      return json(res, 200, {
        month,
        timezone: TZ_LABEL,
        duration: session.duration,
        days: days.filter((d) => d.slots.length > 0),
      });
    }

    /* ---------- Create booking ---------- */
    if (p === '/api/bookings' && req.method === 'POST') {
      const b = await readBody(req);
      const type = hasOwn(SESSION_TYPES, b.type) ? b.type : 'discovery';
      const session = SESSION_TYPES[type];
      const errors = {};
      if (!clean(b.name, 120)) errors.name = 'required';
      if (!isEmail(b.email)) errors.email = 'invalid';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.date || ''))) errors.date = 'invalid';
      if (!/^\d{2}:\d{2}$/.test(String(b.time || ''))) errors.time = 'invalid';
      const meetingProvider = b.meetingProvider || 'google_meet';
      if (!allowedProviders(session.duration).includes(meetingProvider)) errors.meetingProvider = 'invalid';
      if (Object.keys(errors).length) return json(res, 400, { error: 'validation', fields: errors });

      const avail = await dayAvailability(b.date, session.duration);
      const slot = avail.slots.find((s) => s.time === b.time);
      if (!slot || !slot.available) {
        return json(res, 409, { error: 'slot_taken', message: 'That slot was just taken. Please pick another time.' });
      }

      const booking = {
        id: crypto.randomUUID(),
        ref: 'MA-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        date: b.date,
        time: b.time,
        duration: session.duration,
        meetingProvider,
        price: session.price,
        type,
        sessionName: session.en,
        name: clean(b.name, 120),
        email: clean(b.email, 160).toLowerCase(),
        org: clean(b.org, 160),
        notes: clean(b.notes, 1500),
        questionnaireRef: clean(b.questionnaireRef, 40),
        status: 'confirmed',
        timezone: TZ_LABEL,
        createdAt: new Date().toISOString(),
      };
      
      const reserved = await db.createBooking(booking, meetingConfig.enabled);
      if (!reserved) return json(res, 409, { error: 'slot_taken', message: 'That slot was just taken. Please pick another time.' });
      let meeting = { state: 'disabled', provider: meetingProvider };
      if (meetingConfig.enabled) {
        try { meeting = await meetingWorker.run(booking.ref) || await meetingStore.get(booking.ref); }
        catch (_) { meeting = { state: 'pending', provider: meetingProvider }; console.error('[meetings] Booking reserved; background worker will retry.'); }
      }

      if (booking.questionnaireRef) {
        await db.updateBookingQuestionnaireRef(booking.ref, booking.questionnaireRef);
      }

      const mail = await notify(
        `[Booking] ${booking.ref} · ${booking.name} · ${booking.date} ${booking.time} (${TZ_LABEL})`,
        `New session booking received from your personal site.\n\n` +
        `Reference:  ${booking.ref}\n` +
        `Session:    ${booking.sessionName} (${booking.duration} min)\n` +
        `Fee:        ${priceText(booking.price)}\n` +
        `When:       ${booking.date} at ${booking.time} · ${TZ_LABEL}\n\n` +
        `Name:       ${booking.name}\n` +
        `Email:      ${booking.email}\n` +
        `Org:        ${booking.org || 'N/A'}\n\n` +
        `Questionnaire: ${booking.questionnaireRef || 'N/A'}\n\n` +
        `Notes:\n${booking.notes || 'N/A'}\n\n` +
        `Booked at:  ${booking.createdAt}\n`
      );

      const userMail = meetingConfig.enabled
        ? { sent: Boolean(meeting.ready_email_sent || meeting.pending_email_sent) }
        : await sendUserConfirmation('booking', { ...booking, provider: meetingProvider, meetingPending: true });
      return json(res, 201, { ok: true, booking: publicBooking(booking, meeting), notified: mail.sent, userNotified: userMail.sent });

    }

    /* ---------- Collaboration form ---------- */
    if (p === '/api/collaborations' && req.method === 'POST') {
      const b = await readBody(req);
      const errors = {};
      if (!clean(b.name, 120)) errors.name = 'required';
      if (!isEmail(b.email)) errors.email = 'invalid';
      if (clean(b.message, 4000).length < 10) errors.message = 'too_short';
      if (Object.keys(errors).length) return json(res, 400, { error: 'validation', fields: errors });

      const entry = {
        id: crypto.randomUUID(),
        ref: 'COL-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        name: clean(b.name, 120),
        email: clean(b.email, 160).toLowerCase(),
        org: clean(b.org, 160),
        kind: clean(b.kind, 80) || 'other',
        link: clean(b.link, 300),
        message: clean(b.message, 4000),
        createdAt: new Date().toISOString(),
      };
      await db.createCollaboration(entry);

      const mail = await notify(
        `[Collaboration] ${entry.ref} · ${entry.name} (${entry.kind})`,
        `New collaboration request from your personal site.\n\n` +
        `Reference:  ${entry.ref}\n` +
        `Type:       ${entry.kind}\n\n` +
        `Name:       ${entry.name}\n` +
        `Email:      ${entry.email}\n` +
        `Org:        ${entry.org || 'N/A'}\n` +
        `Link:       ${entry.link || 'N/A'}\n\n` +
        `Message:\n${entry.message}\n\n` +
        `Received:   ${entry.createdAt}\n`
      );

      // Send confirmation to user
      const userMail = await sendUserConfirmation('collaboration', {
        ref: entry.ref,
        name: entry.name,
        email: entry.email,
        org: entry.org,
        kind: entry.kind
      });

      return json(res, 201, { ok: true, ref: entry.ref, notified: mail.sent, userNotified: userMail.sent });
    }

    /* ---------- Questionnaire ---------- */
    if (p === '/api/questionnaire' && req.method === 'POST') {
      const b = await readBody(req);

      /* Bot check runs first, so a rejected submission is never stored. */
      const remoteIp = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
        || req.socket.remoteAddress || '';
      const captcha = await verifyTurnstile(clean(b.turnstileToken, 2048), remoteIp);
      if (!captcha.ok) {
        return json(res, 400, {
          error: 'captcha',
          reason: captcha.reason,
          codes: captcha.codes || [],
        });
      }

      const errors = {};
      if (!clean(b.firstName, 80)) errors.firstName = 'required';
      if (!clean(b.lastName, 80)) errors.lastName = 'required';
      if (!isEmail(b.email)) errors.email = 'invalid';
      if (!clean(b.phone, 40)) errors.phone = 'required';
      if (!clean(b.company, 160)) errors.company = 'required';
      if (!clean(b.role, 80)) errors.role = 'required';
      if (Object.keys(errors).length) return json(res, 400, { error: 'validation', fields: errors });

      const answers = (Array.isArray(b.answers) ? b.answers : []).slice(0, 20).map((a) => ({
        id: clean(a && a.id, 40),
        question: clean(a && a.question, 300),
        type: clean(a && a.type, 10) === 'multi' ? 'multi' : 'single',
        values: (Array.isArray(a && a.values) ? a.values : [])
          .slice(0, 20).map((v) => clean(v, 200)).filter(Boolean),
      }));

      const entry = {
        id: crypto.randomUUID(),
        ref: 'QNR-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        firstName: clean(b.firstName, 80),
        lastName: clean(b.lastName, 80),
        email: clean(b.email, 160).toLowerCase(),
        phone: clean(b.phone, 40),
        company: clean(b.company, 160),
        role: clean(b.role, 80),
        about: clean(b.about, 2000),
        locale: clean(b.locale, 5) || 'en',
        booked: false,
        bookingRef: '',
        createdAt: new Date().toISOString(),
      };
      await db.createQuestionnaire(entry);
      await db.createQuestionnaireAnswers(entry.id, answers);

      const lines = answers.map((a, i) => {
        const label = String(i + 1).padStart(2, '0') + '. ' + a.question;
        return label + '\n     ' + (a.values.length ? a.values.join(' | ') : 'N/A');
      }).join('\n');

      const mail = await notify(
        `[Questionnaire] ${entry.ref} · ${entry.firstName} ${entry.lastName} (${entry.company})`,
        `New questionnaire submission from your personal site.\n\n` +
        `Reference:  ${entry.ref}\n` +
        `Language:   ${entry.locale}\n\n` +
        `Name:       ${entry.firstName} ${entry.lastName}\n` +
        `Email:      ${entry.email}\n` +
        `Phone:      ${entry.phone}\n` +
        `Company:    ${entry.company}\n` +
        `Role:       ${entry.role}\n\n` +
        `Answers:\n${lines || 'N/A'}\n\n` +
        `About:\n${entry.about || 'N/A'}\n\n` +
        `Received:   ${entry.createdAt}\n`
      );

      // Send confirmation to user
      const userMail = await sendUserConfirmation('questionnaire', {
        ref: entry.ref,
        firstName: entry.firstName,
        lastName: entry.lastName,
        email: entry.email,
        company: entry.company,
        role: entry.role,
        locale: entry.locale
      });

      return json(res, 201, { ok: true, ref: entry.ref, notified: mail.sent, userNotified: userMail.sent });
    }

    /* ---------- Admin login ---------- */
    if (p === '/api/admin/login' && req.method === 'POST') {
      const r = rateLimit(ip + '|POST /api/admin/login', 5, 5 * 60 * 1000);
      if (!r.ok) {
        res.setHeader('Retry-After', String(r.retryAfter));
        return json(res, 429, { error: 'rate_limited', message: 'Too many login attempts. Please try again later.' });
      }

      const b = await readBody(req);
      const errors = {};
      if (!clean(b.username, 50)) errors.username = 'required';
      if (!clean(b.password, 200)) errors.password = 'required';
      if (Object.keys(errors).length) return json(res, 400, { error: 'validation', fields: errors });

      const user = await db.getUserByUsername(b.username);
      if (!user) {
        return json(res, 401, { error: 'invalid_credentials' });
      }

      const isValid = await verifyPassword(b.password, user.salt, user.password_hash);
      if (!isValid) {
        return json(res, 401, { error: 'invalid_credentials' });
      }

      // Create session
      const sessionId = generateSessionId();
      const expiresAt = getSessionExpiry(24); // 24 hours
      await db.createSession(sessionId, user.id, expiresAt);
      await db.updateUserLastLogin(user.id);

      // Set HTTP-only cookie
      const cookieValue = `session_id=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}`;
      res.setHeader('Set-Cookie', cookieValue);

      return json(res, 200, { ok: true, username: user.username });
    }

    /* ---------- Admin logout ---------- */
    if (p === '/api/admin/logout' && req.method === 'POST') {
      const sessionId = req.cookies.session_id;
      if (sessionId) {
        await db.deleteSession(sessionId);
      }
      res.setHeader('Set-Cookie', 'session_id=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
      return json(res, 200, { ok: true });
    }

    /* ---------- Admin stats ---------- */
    if (p === '/api/admin/stats' && req.method === 'GET') {
      const user = await validateSession(req);
      if (!user) return json(res, 401, { error: 'unauthorized' });
      
      const bookingStats = await db.getBookingStats();
      const collabCount = (await db.getCollaborations({})).length;
      const questionnaireCount = (await db.getQuestionnaires({})).length;
      
      return json(res, 200, {
        bookings: bookingStats,
        collaborations: collabCount,
        questionnaires: questionnaireCount,
      });
    }

    /* ---------- Admin bookings ---------- */
    if (p === '/api/admin/bookings' && req.method === 'GET') {
      const user = await validateSession(req);
      if (!user) return json(res, 401, { error: 'unauthorized' });
      
      const filters = {
        startDate: url.searchParams.get('startDate'),
        endDate: url.searchParams.get('endDate'),
        status: url.searchParams.get('status'),
        type: url.searchParams.get('type'),
        search: url.searchParams.get('search'),
        limit: parseInt(url.searchParams.get('limit') || '20'),
        offset: parseInt(url.searchParams.get('offset') || '0'),
      };
      
      const bookings = await db.getBookings(filters);
      return json(res, 200, { bookings: bookings.map(adminBooking) });
    }

    if (p.match(/^\/api\/admin\/bookings\/[^/]+$/) && req.method === 'GET') {
      const user = await validateSession(req);
      if (!user) return json(res, 401, { error: 'unauthorized' });
      
      const ref = p.split('/').pop();
      const booking = await db.getBookingByRef(ref);
      if (!booking) return json(res, 404, { error: 'not_found' });
      
      const questionnaire = booking.questionnaire_ref
        ? await db.getQuestionnaireByRef(booking.questionnaire_ref)
        : null;
      
      return json(res, 200, { booking: adminBooking(booking), questionnaire });
    }

    if (p.match(/^\/api\/admin\/bookings\/[^/]+\/cancel$/) && req.method === 'POST') {
      const user = await validateSession(req);
      if (!user) return json(res, 401, { error: 'unauthorized' });
      
      const ref = p.split('/')[4];
      await db.updateBookingStatus(ref, 'cancelled');
      return json(res, 200, { ok: true });
    }

    if (p.match(/^\/api\/admin\/bookings\/[^/]+\/retry-meeting$/) && req.method === 'POST') {
      const user = await validateSession(req);
      if (!user) return json(res, 401, { error: 'unauthorized' });
      if (!meetingConfig.enabled) return json(res, 503, { error: 'meetings_disabled' });
      const ref = p.split('/')[4];
      const retried = await meetingWorker.retry(ref);
      return json(res, retried ? 202 : 409, retried ? { ok: true } : { error: 'meeting_not_retryable' });
    }

    /* ---------- Admin collaborations ---------- */
    if (p === '/api/admin/collaborations' && req.method === 'GET') {
      const user = await validateSession(req);
      if (!user) return json(res, 401, { error: 'unauthorized' });
      
      const filters = {
        startDate: url.searchParams.get('startDate'),
        endDate: url.searchParams.get('endDate'),
        kind: url.searchParams.get('kind'),
        search: url.searchParams.get('search'),
        limit: parseInt(url.searchParams.get('limit') || '20'),
        offset: parseInt(url.searchParams.get('offset') || '0'),
      };
      
      const collabs = await db.getCollaborations(filters);
      return json(res, 200, { collaborations: collabs });
    }

    if (p.match(/^\/api\/admin\/collaborations\/[^/]+$/) && req.method === 'GET') {
      const user = await validateSession(req);
      if (!user) return json(res, 401, { error: 'unauthorized' });
      
      const ref = p.split('/').pop();
      const collab = await db.getCollaborationByRef(ref);
      if (!collab) return json(res, 404, { error: 'not_found' });
      
      return json(res, 200, { collaboration: collab });
    }

    /* ---------- Admin questionnaires ---------- */
    if (p === '/api/admin/questionnaires' && req.method === 'GET') {
      const user = await validateSession(req);
      if (!user) return json(res, 401, { error: 'unauthorized' });
      
      const filters = {
        startDate: url.searchParams.get('startDate'),
        endDate: url.searchParams.get('endDate'),
        booked: url.searchParams.get('booked'),
        search: url.searchParams.get('search'),
        limit: parseInt(url.searchParams.get('limit') || '20'),
        offset: parseInt(url.searchParams.get('offset') || '0'),
      };
      
      const questionnaires = await db.getQuestionnaires(filters);
      return json(res, 200, { questionnaires });
    }

    if (p.match(/^\/api\/admin\/questionnaires\/[^/]+$/) && req.method === 'GET') {
      const user = await validateSession(req);
      if (!user) return json(res, 401, { error: 'unauthorized' });
      
      const ref = p.split('/').pop();
      const questionnaire = await db.getQuestionnaireByRef(ref);
      if (!questionnaire) return json(res, 404, { error: 'not_found' });
      
      const answers = await db.getQuestionnaireAnswers(questionnaire.id);
      
      return json(res, 200, { questionnaire, answers });
    }

    /* ---------- Admin settings - change password ---------- */
    if (p === '/api/admin/settings/password' && req.method === 'POST') {
      const user = await validateSession(req);
      if (!user) return json(res, 401, { error: 'unauthorized' });
      
      const b = await readBody(req);
      const errors = {};
      if (!clean(b.currentPassword, 200)) errors.currentPassword = 'required';
      if (!clean(b.newPassword, 200)) errors.newPassword = 'required';
      if (Object.keys(errors).length) return json(res, 400, { error: 'validation', fields: errors });
      
      // Verify current password
      const userData = await db.getUserByUsername(user.username);
      const isValid = await verifyPassword(b.currentPassword, userData.salt, userData.password_hash);
      if (!isValid) {
        return json(res, 401, { error: 'invalid_password' });
      }
      
      // Validate new password strength
      if (!validatePasswordStrength(b.newPassword)) {
        return json(res, 400, { error: 'password_too_weak', message: 'Password must be at least 12 characters with uppercase, lowercase, and numbers.' });
      }
      
      // Hash new password
      const newSalt = generateSalt();
      const newHash = await hashPassword(b.newPassword, newSalt);
      
      // Update user password
      await db.updateUserPassword(userData.id, newHash, newSalt);
      
      return json(res, 200, { ok: true, message: 'Password updated successfully.' });
    }

    /* ---------- Admin pages (serve HTML) ---------- */
    if (p === '/admin' || p === '/admin/') {
      const filePath = path.join(PUBLIC_DIR, 'admin-dashboard.html');
      try {
        const nonce = crypto.randomBytes(16).toString('base64');
        const raw = await fsp.readFile(filePath, 'utf8');
        const patched = raw.replace(/<script(?![^>]*\bsrc=)(?![^>]*\bnonce=)/gi, '<script nonce="' + nonce + '"')
          .replace(/<style(?![^>]*\bnonce=)/gi, '<style nonce="' + nonce + '"');
        const buf = Buffer.from(patched, 'utf8');
        res.writeHead(200, Object.assign({
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': buf.length,
          'Cache-Control': 'no-cache',
        }, securityHeaders(req, nonce, true)));
        res.end(buf);
      } catch (err) {
        if (err.code === 'ENOENT') {
          const b = Buffer.from('<h1>Admin dashboard not found. Please ensure admin-dashboard.html exists in public/</h1>', 'utf8');
          res.writeHead(404, Object.assign({
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Length': b.length,
          }, securityHeaders(req, null)));
          res.end(b);
        } else {
          throw err;
        }
      }
      return;
    }

    if (p === '/admin/login') {
      const filePath = path.join(PUBLIC_DIR, 'admin.html');
      try {
        const nonce = crypto.randomBytes(16).toString('base64');
        const raw = await fsp.readFile(filePath, 'utf8');
        const patched = raw.replace(/<script(?![^>]*\bsrc=)(?![^>]*\bnonce=)/gi, '<script nonce="' + nonce + '"')
          .replace(/<style(?![^>]*\bnonce=)/gi, '<style nonce="' + nonce + '"');
        const buf = Buffer.from(patched, 'utf8');
        res.writeHead(200, Object.assign({
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': buf.length,
          'Cache-Control': 'no-cache',
        }, securityHeaders(req, nonce, true)));
        res.end(buf);
      } catch (err) {
        if (err.code === 'ENOENT') {
          const b = Buffer.from('<h1>Login page not found. Please ensure admin.html exists in public/</h1>', 'utf8');
          res.writeHead(404, Object.assign({
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Length': b.length,
          }, securityHeaders(req, null)));
          res.end(b);
        } else {
          throw err;
        }
      }
      return;
    }

    if (p === '/admin/settings') {
      const user = await validateSession(req);
      if (!user) {
        res.writeHead(302, { 'Location': '/admin/login' });
        return res.end();
      }
      
      const filePath = path.join(PUBLIC_DIR, 'admin-settings.html');
      try {
        const nonce = crypto.randomBytes(16).toString('base64');
        const raw = await fsp.readFile(filePath, 'utf8');
        const patched = raw.replace(/<script(?![^>]*\bsrc=)(?![^>]*\bnonce=)/gi, '<script nonce="' + nonce + '"')
          .replace(/<style(?![^>]*\bnonce=)/gi, '<style nonce="' + nonce + '"');
        const buf = Buffer.from(patched, 'utf8');
        res.writeHead(200, Object.assign({
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': buf.length,
          'Cache-Control': 'no-cache',
        }, securityHeaders(req, nonce, true)));
        res.end(buf);
      } catch (err) {
        if (err.code === 'ENOENT') {
          const b = Buffer.from('<h1>Settings page not found. Please ensure admin-settings.html exists in public/</h1>', 'utf8');
          res.writeHead(404, Object.assign({
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Length': b.length,
          }, securityHeaders(req, null)));
          res.end(b);
        } else {
          throw err;
        }
      }
      return;
    }

    /* ---------- Config ---------- */
    if (p === '/api/config' && req.method === 'GET') {
      return json(res, 200, { turnstileSiteKey: TURNSTILE_SITE_KEY, meetingsEnabled: meetingConfig.enabled });
    }

    if (p === '/api/health') {
      return json(res, 200, { ok: true, now: new Date().toISOString(), riyadh: riyadhParts().toISOString(), mail: mailEnabled, captcha: TURNSTILE_SECRET ? 'turnstile' : 'off', database: 'mysql' });
    }

    /* ---------- Static ---------- */
    return serveStatic(req, res, p);
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'server_error', message: err.message });
  }
});

/* ------------------------------------------------------------------ *
 * Initialize database and start server
 * ------------------------------------------------------------------ */
async function initialize() {
  console.log('[init] Testing database connection...');
  const dbConnected = await db.testConnection();
  if (!dbConnected) {
    console.error('[init] Database connection failed. Please ensure:');
    console.error('  1. Database is created in cPanel');
    console.error('  2. DB_HOST, DB_USER, DB_PASS, DB_NAME are set in .env');
    console.error('  3. schema.sql has been run to create tables');
    process.exit(1);
  }
  
  console.log('[init] Checking database schema...');
  const schemaOk = await db.initializeSchema();
  if (!schemaOk) {
    console.error('[init] Database schema not found. Please run schema.sql in cPanel phpMyAdmin');
    process.exit(1);
  }
  
  console.log('[init] Database initialized successfully');
  if (meetingConfig.enabled) {
    if (!mailEnabled) throw new Error('MEETINGS_ENABLED requires SMTP configuration.');
    meetingWorker.start();
  }
  
  // Start 12-month data cleanup job
  setInterval(async () => {
    try {
      const result = await db.cleanupOldData();
      if (result.bookings > 0 || result.collaborations > 0 || result.questionnaires > 0) {
        console.log('[cleanup] Deleted records older than 12 months:', result);
      }
    } catch (err) {
      console.error('[cleanup] Error:', err.message);
    }
  }, 24 * 60 * 60 * 1000).unref();
  
  // Clean up expired sessions daily
  setInterval(async () => {
    try {
      const deleted = await db.deleteExpiredSessions();
      if (deleted > 0) {
        console.log('[sessions] Cleaned up', deleted, 'expired sessions');
      }
    } catch (err) {
      console.error('[sessions] Error cleaning sessions:', err.message);
    }
  }, 60 * 60 * 1000).unref();
}

if (require.main === module) initialize().then(() => {
  server.listen(PORT, HOST, () => {
    console.log(`\n  ▸ Site running: http://${HOST}:${PORT}`);
    console.log(`  ▸ Riyadh date: ${todayRiyadh()}  (${TZ_LABEL})`);
    console.log(`  ▸ Database: MySQL enabled`);
    console.log(`  ▸ Admin login: http://${HOST}:${PORT}/admin/login`);
    console.log(`  ▸ Admin dashboard: http://${HOST}:${PORT}/admin`);
    console.log(`  ▸ Admin settings: http://${HOST}:${PORT}/admin/settings`);
    console.log(`  ▸ Rate limits: on    HSTS: ${ENABLE_HSTS ? 'on' : 'off (set ENABLE_HSTS=1 behind HTTPS)'}\n`);
  });
}).catch((err) => {
  console.error('[init] Initialization failed:', err);
  process.exit(1);
});

module.exports = { server, initialize };
