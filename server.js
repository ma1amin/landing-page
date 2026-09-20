'use strict';
/**
 * Personal branding site · zero-dependency Node server.
 *  - static hosting for /public
 *  - /api/slots          -> available booking slots for a month
 *  - /api/bookings       -> create a booking
 *  - /api/collaborations -> "Open to collaboration" submissions
 *  - /api/admin/*        -> read submissions (token protected)
 *
 * Email delivery is optional: set SMTP_* env vars (see config.example.env).
 * Without them, everything is still stored to /data and logged to the console.
 */
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const https = require('node:https');
const { sendMail } = require('./smtp');

/*
 * Reads ./.env if present so the keys documented in config.example.env
 * actually work. Real environment variables always win.
 */
(function loadDotEnv() {
  try {
    const file = path.join(__dirname, '.env');
    if (!fs.existsSync(file)) return;
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line) => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return;
      const i = t.indexOf('=');
      if (i === -1) return;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (val.length > 1 && val[0] === val[val.length - 1] && (val[0] === '"' || val[0] === "'")) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = val;
    });
  } catch (_) {}
})();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
/* No default. An empty value disables every admin route, so a forgotten
   env var closes the door instead of opening it. */
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'mo7dalamin@gmail.com';

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

/* Constant-time compare so the admin token cannot be recovered byte by byte
   from response timing. */
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
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
  'admin':                    { limit: 20, windowMs: 10 * 60 * 1000 },
};

/* ------------------------------------------------------------------ *
 * Security headers
 * ------------------------------------------------------------------ */
function csp(nonce) {
  return [
    "default-src 'self'",
    "script-src 'self' https://challenges.cloudflare.com" + (nonce ? " 'nonce-" + nonce + "'" : ''),
    "style-src 'self'",
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

function securityHeaders(req, nonce) {
  const h = {
    'Content-Security-Policy': csp(nonce),
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
const SESSION_TYPES = {
  discovery: { duration: 20, price: 0,  en: 'Discovery Call',         ar: 'مكالمة تعارف' },
  technical: { duration: 45, price: 20, en: 'Technical Deep Dive',    ar: 'جلسة تقنية معمقة' },
  advisory:  { duration: 60, price: 50, en: 'Advisory Retainer Intro', ar: 'جلسة استشارية تمهيدية' },
};
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
 * Persistence
 * ------------------------------------------------------------------ */
async function readJson(file, fallback) {
  try {
    return JSON.parse(await fsp.readFile(path.join(DATA_DIR, file), 'utf8'));
  } catch (_) {
    return fallback;
  }
}
async function writeJson(file, value) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const tmp = path.join(DATA_DIR, '.' + file + '.tmp');
  await fsp.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
  await fsp.rename(tmp, path.join(DATA_DIR, file));
}
const loadBookings = () => readJson('bookings.json', []);
const loadCollabs = () => readJson('collaborations.json', []);
const loadQuestionnaires = () => readJson('questionnaire.json', []);

function overlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

async function busyIntervals(dateStr) {
  const bookings = await loadBookings();
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
else console.log('[mail] SMTP not configured · submissions will be stored locally only.');
  console.log('[captcha] ' + (TURNSTILE_SECRET ? 'Turnstile enabled' : 'not configured · questionnaire submissions are unchecked'));

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
    await sendMail({ ...SMTP, to: NOTIFY_EMAIL, subject, text: body });
    return { sent: true };
  } catch (err) {
    console.error('[mail] failed:', err.message);
    return { sent: false, error: err.message };
  }
}

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

async function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  if (rel === '/questionnaire') rel = '/questionnaire.html';
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
      const patched = raw.replace(/<script(?![^>]*\bsrc=)(?![^>]*\bnonce=)/gi, '<script nonce="' + nonce + '"');
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
      const all = await loadBookings();
      all.push(booking);
      await writeJson('bookings.json', all);

      if (booking.questionnaireRef) {
        const qs = await loadQuestionnaires();
        const match = qs.find((q) => q.ref === booking.questionnaireRef);
        if (match && !match.booked) {
          match.booked = true;
          match.bookingRef = booking.ref;
          await writeJson('questionnaire.json', qs);
        }
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

      return json(res, 201, { ok: true, booking: { ref: booking.ref, date: booking.date, time: booking.time, duration: booking.duration, sessionName: booking.sessionName, timezone: TZ_LABEL }, notified: mail.sent });
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
      const all = await loadCollabs();
      all.push(entry);
      await writeJson('collaborations.json', all);

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

      return json(res, 201, { ok: true, ref: entry.ref, notified: mail.sent });
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
        answers: answers,
        booked: false,
        bookingRef: '',
        createdAt: new Date().toISOString(),
      };
      const all = await loadQuestionnaires();
      all.push(entry);
      await writeJson('questionnaire.json', all);

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

      return json(res, 201, { ok: true, ref: entry.ref, notified: mail.sent });
    }

    /* ---------- Admin reads ---------- */
    if (p.startsWith('/api/admin/') && req.method === 'GET') {
      /* Fail closed: with no token configured the route does not exist. */
      if (!ADMIN_TOKEN) return json(res, 503, { error: 'admin_disabled', message: 'Set ADMIN_TOKEN to enable admin reads.' });
      const adminGate = rateLimit(ip + '|admin', LIMITS.admin.limit, LIMITS.admin.windowMs);
      if (!adminGate.ok) {
        res.setHeader('Retry-After', String(adminGate.retryAfter));
        return json(res, 429, { error: 'rate_limited', message: 'Too many requests. Please try again in a few minutes.' });
      }
      /* Token travels in a header, not the query string, so it stays out of
         access logs, proxy logs and browser history. */
      const authHeader = String(req.headers.authorization || '');
      const provided = String(req.headers['x-admin-token'] || authHeader.replace(/^Bearer\s+/i, '')).trim();
      if (!provided || !safeEqual(provided, ADMIN_TOKEN)) return json(res, 401, { error: 'unauthorized' });
      if (p === '/api/admin/bookings') return json(res, 200, { bookings: await loadBookings() });
      if (p === '/api/admin/collaborations') return json(res, 200, { collaborations: await loadCollabs() });
      return json(res, 404, { error: 'not_found' });
    }

    /* ---------- Health ---------- */
    if (p === '/api/config' && req.method === 'GET') {
      return json(res, 200, { turnstileSiteKey: TURNSTILE_SITE_KEY });
    }

    if (p === '/api/health') {
      return json(res, 200, { ok: true, now: new Date().toISOString(), riyadh: riyadhParts().toISOString(), mail: mailEnabled, captcha: TURNSTILE_SECRET ? 'turnstile' : 'off' });
    }

    /* ---------- Static ---------- */
    return serveStatic(req, res, p);
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'server_error', message: err.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  ▸ Site running: http://${HOST}:${PORT}`);
  console.log(`  ▸ Riyadh date: ${todayRiyadh()}  (${TZ_LABEL})`);
  console.log(`  ▸ Admin reads: ${ADMIN_TOKEN ? 'enabled (header token)' : 'DISABLED · set ADMIN_TOKEN to enable'}`);
  console.log(`  ▸ Rate limits: on    HSTS: ${ENABLE_HSTS ? 'on' : 'off (set ENABLE_HSTS=1 behind HTTPS)'}`);
  console.log(`  ▸ Data dir:    ${DATA_DIR}\n`);
});
