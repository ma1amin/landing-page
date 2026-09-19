# Personal branding site · Dr. Mohammed Al Amin

Bilingual (EN/AR) personal branding page modelled on the malabed.com structure, with a
working booking calendar and an "open to collaboration" form.

Zero dependencies · plain Node + static HTML/CSS/JS. No build step, no `node_modules`.

## Run

```bash
cd brand-site
node server.js          # http://localhost:3000
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
export ADMIN_TOKEN=some-long-random-string
node server.js
```

Gmail needs a 16-character App Password (not your account password).

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | server time, Riyadh time, mail status |
| GET | `/api/slots?month=YYYY-MM&type=discovery` | available slots for a month |
| POST | `/api/bookings` | create a booking (returns a `MA-XXXXXX` reference) |
| POST | `/api/collaborations` | submit the collaboration form (`COL-XXXXXX`) |
| POST | `/api/questionnaire` | submit the questionnaire (`QNR-XXXXXX`) |
| GET | `/api/admin/bookings?token=…` | list bookings |
| GET | `/api/admin/collaborations?token=…` | list collaboration requests |

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
