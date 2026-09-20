# Personal branding site · Dr. Mohammed Al Amin

Bilingual (EN/AR) personal branding page modelled on the malabed.com structure, with a
working booking calendar and an "open to collaboration" form.

Zero dependencies · plain Node + static HTML/CSS/JS. No build step, no `node_modules`.

## Security

Hardening lives in `server.js`, so it applies whatever you put in front of the
app. The full assessment lives in `SECURITY-AUDIT.md`, deliberately outside this
repository: the repo is public and that document enumerates the holes.

**Reading submissions.** Send the admin token in a header, never in the URL:

```bash
curl -H "X-Admin-Token: $ADMIN_TOKEN" https://your-host/api/admin/bookings
```

There is no default token. If `ADMIN_TOKEN` is unset every admin route returns
`503`, so a forgotten environment variable closes the door rather than opening
it. The token used to travel as `?token=...`, which leaks into access logs,
proxy logs and browser history, so the query parameter is no longer accepted.

**Rate limiting** is per IP, in memory, fixed window:

| Endpoint | Limit |
|---|---|
| `POST /api/bookings` | 10 per 10 min |
| `POST /api/collaborations` | 5 per 10 min |
| `POST /api/questionnaire` | 5 per 10 min |
| `GET /api/slots` | 60 per min |
| `/api/admin/*` | 20 per 10 min |

Blocked requests get `429` with a `Retry-After` header. Buckets are pruned
every minute. Set `TRUST_PROXY=1` only if the app sits behind a proxy you
control, otherwise a client can spoof `X-Forwarded-For` to dodge the limits.

**Headers** are sent on every response: a nonce-based `Content-Security-Policy`,
`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
`Permissions-Policy`, `Cross-Origin-Opener-Policy` and
`Cross-Origin-Resource-Policy`. The CSP allows `challenges.cloudflare.com` for
scripts, connections and frames so Turnstile keeps working, and it permits no
inline scripts, styles or event handlers.

Two consequences worth knowing when editing the front end:

- Inline `<script>` blocks need the per-response nonce the server injects.
- Inline `onclick`, `onerror` and `style=` attributes are blocked. Attach
  listeners from a script file instead. The portrait fallback in `app.js` is
  the example to copy.

**HSTS** is off by default. Set `ENABLE_HSTS=1` once you have confirmed the
site is served over HTTPS, since sending it over plain HTTP can lock visitors
out for the `max-age` period.

## Run

```bash
cd brand-site
cp config.example.env .env     # optional, now actually read on startup
node server.js                 # http://localhost:3000
```

## Replace the photo

Drop your photo here and it replaces everything automatically:

```
public/assets/portrait.jpg      (square, ~640×640 or larger)
```

Fallback chain if that file is missing: GitHub avatar → "MA" monogram.

## Booking calendar

- Sun–Thu only (Saudi working week), Fri/Sat closed
- Slots 10:00–11:30 and 13:00–15:30 Asia/Riyadh, 30-minute granularity
- Lunch 12:00–13:00 blocked; a 60-min session never straddles it
- Minimum 4 hours' notice, 60-day booking horizon
- Booked slots disappear for everyone (stored server-side)
- Three session types: Discovery (30 min), Technical Deep Dive (60 min), Advisory (45 min)

Change the rules in the `Availability rules` block at the top of `server.js`.

## Collaboration form

Fields: name, email, organisation, collaboration type, link, message.
Stored to `data/collaborations.json` and emailed if SMTP is configured.

## Email notifications (optional)

Without SMTP everything still works · submissions are stored to `data/` and printed to
the console. To enable email, copy `config.example.env` to `.env` and export the values:

```bash
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=mo7dalamin@gmail.com
export SMTP_PASS=your-app-password
export NOTIFY_EMAIL=mo7dalamin@gmail.com
export ADMIN_TOKEN=some-long-random-string   # no default: unset disables admin reads
node server.js
```

Gmail needs a 16-character App Password (not your account password).

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/config` | public settings, currently the Turnstile site key |
| GET | `/api/health` | server time, Riyadh time, mail and captcha status |
| GET | `/api/slots?month=YYYY-MM&type=discovery` | available slots for a month |
| POST | `/api/bookings` | create a booking (returns a `MA-XXXXXX` reference) |
| POST | `/api/collaborations` | submit the collaboration form (`COL-XXXXXX`) |
| POST | `/api/questionnaire` | submit the questionnaire (`QNR-XXXXXX`) |
| GET | `/api/admin/bookings` | list bookings (needs `X-Admin-Token` header) |
| GET | `/api/admin/collaborations` | list collaboration requests (needs `X-Admin-Token` header) |

### Bot protection

The questionnaire is guarded with Cloudflare Turnstile. Both keys live in
`.env`, and the page fetches the public site key from `GET /api/config`, so no
key is baked into the markup. When no keys are configured the widget never
renders and the server skips the check, which is what keeps `preview.html`
working offline.

Get keys from Cloudflare dashboard, Turnstile, Add site. You do **not** need an
API Token, and you do not need to move your DNS to Cloudflare. See the
Turnstile section in `config.example.env`, which ships with Cloudflare's public
test keys.

`GET /api/health` reports `captcha: turnstile` when the check is active.

Bookings live in `data/bookings.json`, requests in `data/collaborations.json`,
questionnaire answers in `data/questionnaire.json`.

### How the questionnaire links to a booking

Submitting the questionnaire saves and emails the answers immediately and returns a
`QNR-XXXXXX` reference. The visitor is then sent to `/?qref=QNR-XXXXXX#booking`. If
they book, the reference is stored on the booking record and the questionnaire is
marked `booked`, so the two can be read together. If they leave without booking, the
answers are already saved.

## Files

```
server.js           static host + API + availability engine
smtp.js             minimal SMTP client (SMTPS + STARTTLS)
public/index.html   page structure (English text is the no-JS fallback)
public/styles.css   amber-on-near-black theme, RTL-aware
public/app.js       i18n dictionary, content data, calendar, forms
public/questionnaire.html       eight-question intake page
public/questionnaire.js         its questions, copy and submit logic
public/questionnaire-widget.css prompt card styling, inherits site tokens
public/questionnaire-widget.js  prompt card: timing, drag, dismissal, i18n
config.example.env  email settings template
```

The prompt card loads on the main page only. Its appearance delay, dismissal
lifetime and analytics are set in `window.QUESTIONNAIRE_CONFIG` in `index.html`.
Dismissal is remembered for 14 days in `localStorage`. Copy lives in the `TEXT`
object at the top of `questionnaire-widget.js`; the eight questions and their
answer options live in `QUESTIONS` at the top of `questionnaire.js`.

## Editing content

- **Copy**: `public/app.js` → the `T` object (UI strings, both languages), plus the
  `SKILLS`, `FOCUS`, `SERVICES`, `INITIATIVES`, `TIMELINE`, `CREDS`, `INTERESTS`,
  `SESSIONS` and `KINDS` arrays. Each entry carries `{en, ar}`.
- **Design**: colour tokens are the `:root` block at the top of `public/styles.css`.
