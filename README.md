# Dr. Mohammed Al Amin · Personal Brand Site

A bilingual (English / Arabic) founder site with a self-hosted booking engine, a client intake
questionnaire, and a hardened Node.js server. No frameworks, no build pipeline, no third party
scheduling widgets.

> Cybersecurity leader and founder. Arabc0n Cyber Security and InfoLogix. Riyadh, Saudi Arabia.

---

## Contents

- [Highlights](#highlights)
- [Stack](#stack)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Project layout](#project-layout)
- [Booking engine](#booking-engine)
- [Questionnaire flow](#questionnaire-flow)
- [API reference](#api-reference)
- [Security](#security)
- [Editing content](#editing-content)
- [Standalone preview](#standalone-preview)
- [Contact](#contact)
- [License](#license)

---

## Highlights

| Capability | Detail |
|---|---|
| Bilingual by design | Full EN / AR dictionary with a language toggle, native Arabic copy, and complete RTL mirroring including logical spacing and direction aware iconography |
| Self hosted booking | Availability engine, Asia/Riyadh timezone, Saudi working week, server side pricing, collision free slot allocation |
| Client intake | Eight question matchmaking questionnaire with a dismissible prompt card, linked to the booking record by reference |
| Hardened server | Nonce based CSP, per IP rate limiting, header only admin authentication, no default credentials |
| Zero dependencies | Plain Node standard library, including a minimal SMTP client. No `node_modules`, no build step |
| Offline artifact | `preview.html` is a single self contained file with CSS, JS, and images inlined |

## Stack

- **Runtime**: Node.js 18 or newer, standard library only
- **Front end**: semantic HTML, hand written CSS with custom properties, vanilla ES2019 JavaScript
- **Storage**: append only JSON documents under `data/`, created on first write
- **Mail**: `smtp.js`, a minimal SMTPS and STARTTLS client written for this project
- **Bot protection**: Cloudflare Turnstile, optional and disabled unless keys are present

## Quick start

```bash
git clone git@github.com:ma1amin/landing-page.git
cd landing-page
cp config.example.env .env     # optional, read automatically on startup
node server.js                 # http://localhost:3000
```

The site runs with no configuration at all. Without SMTP credentials, submissions are written to
`data/` and echoed to the console. Without Turnstile keys, the captcha is skipped and the widget
never renders.

## Configuration

All settings are environment variables, read from the process environment or from `.env`.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Listening port |
| `HOST` | `0.0.0.0` | Bind address |
| `ADMIN_TOKEN` | *(unset)* | Enables the admin read routes. Unset means every admin route returns `503` |
| `NOTIFY_EMAIL` | `mo7dalamin@gmail.com` | Destination for submission notifications |
| `SMTP_HOST` | *(unset)* | SMTP server. Absent means local storage only |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_SECURE` | `false` | `true` for implicit TLS on port 465 |
| `SMTP_USER` / `SMTP_PASS` | *(unset)* | SMTP credentials. Gmail requires a 16 character App Password |
| `SMTP_FROM` | `SMTP_USER` | Envelope sender |
| `TURNSTILE_SITE_KEY` | *(unset)* | Public key, served to the browser through `/api/config` |
| `TURNSTILE_SECRET` | *(unset)* | Private key, used for server side verification |
| `TRUST_PROXY` | `0` | Set to `1` only behind a proxy you control, so `X-Forwarded-For` can be trusted |
| `ENABLE_HSTS` | `0` | Set to `1` only once HTTPS is confirmed |

`.env` and `data/` are git ignored. No secret is ever baked into the markup.

## Project layout

```
server.js                        static host, JSON API, availability engine, security layer
smtp.js                          minimal SMTP client (SMTPS and STARTTLS)
build-preview.js                 inlines the site into a single portable preview.html
config.example.env               annotated configuration template
preview.html                     generated, self contained, offline viewable build
public/
  index.html                     page structure, English text doubles as the no JavaScript fallback
  styles.css                     amber on near black theme, RTL aware, design tokens in :root
  app.js                         i18n dictionary, content data, calendar, forms, reveal logic
  questionnaire.html             intake page
  questionnaire.js               questions, copy, submit logic
  questionnaire-widget.css       prompt card styling, inherits the site tokens
  questionnaire-widget.js        prompt card timing, drag, dismissal, i18n
  assets/                        portrait, favicon
```

## Booking engine

Availability is computed server side, so a slot that is taken disappears for everyone.

- **Working week**: Sunday to Thursday. Friday and Saturday are closed
- **Hours**: 10:00 to 16:00 Asia/Riyadh, on a 30 minute grid
- **Lunch**: 12:00 to 13:00 is blocked, and no session is allowed to straddle it
- **Lead time**: 4 hours minimum
- **Horizon**: 60 days

| Session | Duration | Price |
|---|---|---|
| Discovery Call | 20 min | Free |
| Technical Deep Dive | 45 min | $20 |
| Advisory Retainer Intro | 60 min | $50 |

Prices are resolved from `SESSION_TYPES` in `server.js`. The client never transmits a price, so it
cannot be tampered with. Every confirmed booking returns a `MA-XXXXXX` reference.

Adjust the rules in the `Availability rules` block near the top of `server.js`.

## Questionnaire flow

The questionnaire exists to qualify a fit before any call is scheduled, not to collect applications.

1. A visitor completes the eight questions and receives a `QNR-XXXXXX` reference.
2. Answers are stored and emailed immediately, whether or not a booking follows.
3. The visitor is redirected to `/?qref=QNR-XXXXXX#booking`.
4. If they book, the reference is attached to the booking record and the questionnaire is marked
   `booked`, so both records can be read as one thread.

The prompt card appears on the main page only. Its delay, dismissal lifetime, and analytics hook
are configured through `window.QUESTIONNAIRE_CONFIG` in `index.html`. A dismissal is remembered for
14 days in `localStorage`.

## API reference

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/config` | Public settings, currently the Turnstile site key |
| `GET` | `/api/health` | Server time, Riyadh time, mail status, captcha status |
| `GET` | `/api/slots?month=YYYY-MM&type=discovery` | Available slots for a month |
| `POST` | `/api/bookings` | Create a booking, returns `MA-XXXXXX` |
| `POST` | `/api/collaborations` | Collaboration request, returns `COL-XXXXXX` |
| `POST` | `/api/questionnaire` | Questionnaire submission, returns `QNR-XXXXXX` |
| `GET` | `/api/admin/bookings` | List bookings, requires `X-Admin-Token` |
| `GET` | `/api/admin/collaborations` | List collaboration requests, requires `X-Admin-Token` |

Records are persisted to `data/bookings.json`, `data/collaborations.json`, and
`data/questionnaire.json`.

## Security

Hardening lives in `server.js`, so it holds regardless of what sits in front of the application.

**Admin authentication.** The token travels in a header, never in a query string, because query
strings leak into access logs, proxy logs, and browser history.

```bash
curl -H "X-Admin-Token: $ADMIN_TOKEN" https://your-host/api/admin/bookings
```

There is no default token. An unset `ADMIN_TOKEN` closes the admin surface rather than opening it.

**Rate limiting** is per IP, in memory, fixed window. Exceeding a limit returns `429` with
`Retry-After`. Buckets are pruned every minute.

| Endpoint | Limit |
|---|---|
| `POST /api/bookings` | 10 per 10 min |
| `POST /api/collaborations` | 5 per 10 min |
| `POST /api/questionnaire` | 5 per 10 min |
| `GET /api/slots` | 60 per min |
| `/api/admin/*` | 20 per 10 min |

**Response headers** on every request: a nonce based `Content-Security-Policy`,
`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`,
`Cross-Origin-Opener-Policy`, and `Cross-Origin-Resource-Policy`. The CSP permits
`challenges.cloudflare.com` for scripts, connections, and frames so Turnstile functions, and allows
no inline script, style, or event handler.

Two consequences when editing the front end:

- An inline `<script>` requires the per response nonce the server injects.
- `onclick`, `onerror`, and `style=` attributes are blocked. Attach listeners from a script file
  instead. The portrait fallback in `app.js` is the pattern to copy.

`X-Frame-Options: DENY` and `frame-ancestors 'none'` mean the site will not render inside an iframe.
That is intentional. Open it in a top level tab.

**HSTS** is off by default. Enable it only after HTTPS is confirmed, since sending it over plain
HTTP can lock visitors out for the duration of `max-age`.

## Editing content

- **Copy**: `public/app.js`, the `T` object holds every UI string in both languages.
- **Data**: the `SKILLS`, `FOCUS`, `SERVICES`, `INITIATIVES`, `TIMELINE`, `CREDS`, `INTERESTS`,
  `SESSIONS`, and `KINDS` arrays in `public/app.js`. Every entry carries an `{ en, ar }` pair.
- **Questions**: the `QUESTIONS` array at the top of `public/questionnaire.js`.
- **Design**: the `:root` token block at the top of `public/styles.css`.
- **Portrait**: drop a square image at `public/assets/portrait.jpg`, roughly 640 x 640 or larger.
  The fallback chain is GitHub avatar, then an "MA" monogram.

After changing anything under `public/`, regenerate the portable build:

```bash
node build-preview.js
```

## Standalone preview

`preview.html` is a single file with the stylesheet, scripts, favicon, and portrait inlined as data
URIs. It opens from disk with no server and no network, which makes it convenient for sharing a
snapshot or reviewing offline. Server backed features, meaning booking, forms, and captcha, are
inert in that file by design.

## Contact

- Email: mo7dalamin@gmail.com
- LinkedIn: [in/mohalamin](https://www.linkedin.com/in/mohalamin/)
- GitHub: [ma1amin](https://github.com/ma1amin)
- Web: [infologix.co](https://infologix.co)

## License

Copyright (c) Dr. Mohammed Al Amin. All rights reserved.

The source is published for reference and review. The content, branding, portrait, and copy are not
licensed for reuse. Open an issue if you would like to discuss permission.
