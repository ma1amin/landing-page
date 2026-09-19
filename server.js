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
const { sendMail } = require('./smtp');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'letmein';
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'mo7dalamin@gmail.com';

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
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
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
  try {
    const stat = await fsp.stat(filePath);
    if (stat.isDirectory()) throw new Error('dir');
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (_) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1><p>Not found</p><a href="/">Back to site</a>');
  }
}

/* ------------------------------------------------------------------ *
 * Routes
 * ------------------------------------------------------------------ */
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' });
    return res.end();
  }
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const p = url.pathname;

  try {
    /* ---------- Slots ---------- */
    if (p === '/api/slots' && req.method === 'GET') {
      const month = (url.searchParams.get('month') || '').slice(0, 7); // YYYY-MM
      const type = url.searchParams.get('type') || 'discovery';
      const session = SESSION_TYPES[type] || SESSION_TYPES.discovery;
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
      const type = SESSION_TYPES[b.type] ? b.type : 'discovery';
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
      if (url.searchParams.get('token') !== ADMIN_TOKEN) return json(res, 401, { error: 'unauthorized' });
      if (p === '/api/admin/bookings') return json(res, 200, { bookings: await loadBookings() });
      if (p === '/api/admin/collaborations') return json(res, 200, { collaborations: await loadCollabs() });
      return json(res, 404, { error: 'not_found' });
    }

    /* ---------- Health ---------- */
    if (p === '/api/health') {
      return json(res, 200, { ok: true, now: new Date().toISOString(), riyadh: riyadhParts().toISOString(), mail: mailEnabled });
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
  console.log(`  ▸ Data dir:    ${DATA_DIR}\n`);
});
