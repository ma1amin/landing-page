# Dr. Mohammed Al Amin · Personal Brand Site

A bilingual (English / Arabic) founder site with a self-hosted booking engine, a client intake
questionnaire, admin portal with MySQL database, and a hardened Node.js server.

> Cybersecurity leader and founder. Arabc0n Cyber Security and InfoLogix. Riyadh, Saudi Arabia.

---

## Deployment Guide

### Prerequisites

- Namecheap shared hosting with cPanel
- Cloudflare account (Free plan)
- MySQL database access via cPanel

### Step 1: Upload Files

Upload all files to your cPanel hosting:
1. Upload entire `brand-site/` directory to your hosting
2. Ensure `.env` file is uploaded (contains sensitive data)
3. Ensure `node_modules/` is NOT uploaded (will be installed on server)

### Step 2: Setup Database

1. Log in to cPanel
2. Navigate to **MySQL Database Wizard**
3. Create a new database (e.g., `brand_site`)
4. Create a new database user with strong password
5. Grant all privileges to the user on the database
6. Note down the database name, username, and password

### Step 3: Import Schema

1. Navigate to **phpMyAdmin** in cPanel
2. Select your database
3. Click the **Import** tab
4. Upload `schema.sql`
5. Click **Go** to import

### Step 4: Install Dependencies

1. Log in to cPanel via SSH
2. Navigate to your `brand-site` directory
3. Run: `npm install`

### Step 5: Configure Environment

Update the `.env` file with your actual credentials:

```env
# Database
DB_HOST=localhost
DB_USER=your_database_user
DB_PASS=your_database_password
DB_NAME=your_database_name

# SMTP
SMTP_PASS=your_actual_email_password
```

### Step 6: Seed Admin User

Run the admin seeding script:
```bash
npm run seed-admin
```

This will create an admin user with username `admin` and a randomly generated password. **Save the password securely.**

### Step 7: Setup Node.js App in cPanel

1. Navigate to **Setup Node.js App** in cPanel
2. Create or edit your application:
   - Node.js version: 18 or higher
   - Application mode: Production
   - Application root: Path to your files
   - Application URL: Your domain
   - Startup file: `server.js`
3. Add environment variables from `.env`
4. Restart the application

### Step 8: Configure Cloudflare

1. Set SSL/TLS mode to **Full**
2. Add Page Rule to bypass cache for `/api/*`
3. Enable Bot Fight Mode
4. Ensure `TRUST_PROXY=1` is set in `.env`

### Step 9: Access Admin Portal

- Login: `https://yourdomain.com/admin/login`
- Dashboard: `https://yourdomain.com/admin`
- Settings: `https://yourdomain.com/admin/settings`

---

## Configuration

All settings are environment variables, read from the process environment or from `.env`.

|| Variable | Default | Purpose |
||---|---|---|
|| `PORT` | `3000` | Listening port |
|| `HOST` | `0.0.0.0` | Bind address |
|| `DB_HOST` | `localhost` | MySQL database host |
|| `DB_USER` | *(required)* | MySQL database user |
|| `DB_PASS` | *(required)* | MySQL database password |
|| `DB_NAME` | *(required)* | MySQL database name |
|| `NOTIFY_EMAIL` | `info@malamin.cc` | Destination for submission notifications |
|| `SMTP_HOST` | *(unset)* | SMTP server. Absent means local storage only |
|| `SMTP_PORT` | `587` | SMTP port |
|| `SMTP_SECURE` | `false` | `true` for implicit TLS on port 465 |
|| `SMTP_USER` / `SMTP_PASS` | *(unset)* | SMTP credentials |
|| `SMTP_FROM` | `SMTP_USER` | Envelope sender |
|| `TURNSTILE_SITE_KEY` | *(unset)* | Public key, served to the browser through `/api/config` |
|| `TURNSTILE_SECRET` | *(unset)* | Private key, used for server side verification |
|| `TRUST_PROXY` | `0` | Set to `1` only behind a proxy you control, so `X-Forwarded-For` can be trusted |
|| `ENABLE_HSTS` | `0` | Set to `1` only once HTTPS is confirmed |

`.env` is git ignored. No secret is ever baked into the markup.

---

## Project Layout

```
server.js                        static host, MySQL API, availability engine, security layer
database.js                      MySQL database operations
auth.js                          authentication and session management
seed-admin.js                    admin user seeding script
smtp.js                          minimal SMTP client (SMTPS and STARTTLS)
build-preview.js                 inlines the site into a single portable preview.html
schema.sql                       MySQL database schema
package.json                     dependencies (mysql2)
config.example.env               annotated configuration template
.env                             actual configuration (git ignored)
preview.html                     generated, self contained, offline viewable build
public/
  index.html                     page structure, English text doubles as the no JavaScript fallback
  styles.css                     amber on near black theme, RTL aware, design tokens in :root
  app.js                         i18n dictionary, content data, calendar, forms, reveal logic
  questionnaire.html             intake page
  questionnaire.js               questions, copy, submit logic
  questionnaire-widget.css       prompt card styling, inherits the site tokens
  questionnaire-widget.js        prompt card timing, drag, dismissal, i18n
  admin.html                      admin login page
  admin-dashboard.html            admin dashboard
  admin-settings.html            admin settings page
  assets/                        portrait, favicon
```

---

## Admin Portal

### Features

- **Authentication**: Username/password login with secure scrypt hashing
- **Dashboard**: Statistics overview with bookings, collaborations, questionnaires
- **Bookings Management**: View, cancel, export bookings with detailed modal views
- **Collaborations Management**: View, export collaboration requests
- **Questionnaires Management**: View, export questionnaire submissions with answers
- **Settings**: Change password functionality
- **CSV Export**: Export all data types to CSV
- **12-Month Data Retention**: Automated cleanup of old data

### Access

- Login: `/admin/login`
- Dashboard: `/admin`
- Settings: `/admin/settings`

---

## Security

- Nonce-based CSP with strict policy
- Per-IP rate limiting on all endpoints
- Session-based authentication with HTTP-only cookies
- Password hashing with scrypt
- SQL injection prevention (parameterized queries)
- No default credentials
- Turnstile bot protection (questionnaire)
- 12-month automated data cleanup
- Saudi/GCC compliance ready

---

## License

UNLICENSED
