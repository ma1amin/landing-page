# 📱 Dr. Mohammed Al Amin

> 💻 **Cybersecurity Leader & Founder** · Arabc0n Cyber Security · InfoLogix · Riyadh, Saudi Arabia

---

## 🤖 Vision

To be the leading cybersecurity voice in the Arab world, empowering organizations with robust security strategies, AI-native platforms, and digital transformation solutions that protect and advance regional business interests.

---

## 🎯 Mission

- ✅ Deliver cutting-edge red teaming and security architecture services
- ✅ Build AI-native platforms that transform logistics and operations
- ✅ Bridge the gap between technical and executive leadership
- ✅ Foster a security-first culture across the Arab world

---

## 🏃 Strategy

### 🔥 Core Pillars

| Pillar | Description |
|--------|-------------|
| 🔐 **Security First** | Every solution built with security at its foundation |
| 🌐 **Regional Focus** | Tailored for Saudi/GCC market needs and compliance |
| 🦯 **Innovation** | AI-native solutions that push boundaries |
| 👥 **Partnership** | Building lasting relationships through trust |

### 📅 Strategic Goals

- 🏃 Expand Arabc0n's reach across GCC region
- 📊 Launch 3 new AI-native platforms by 2027
- 💡 Train 100+ cybersecurity professionals annually
- 🔔 Establish InfoLogix as logistics tech leader

---

## 🚀 About This Site

A bilingual (English/Arabic) personal brand website featuring:

- 📞 **Self-hosted booking engine** with Saudi working week (Sunday-Thursday)
- 📋 **Client intake questionnaire** (10 questions, ~90 seconds)
- 🔐 **Admin portal** with MySQL database and session-based authentication
- 🚰 **Hardened security** with CSP, rate limiting, and Turnstile protection
- 📅 **Saudi/GCC compliance** with 12-month data retention

---

## Mobile layout and questionnaire widget

Updated on 3 October 2026. Public pages adapt to narrow phones, tablets, and desktop screens in English and Arabic. Grid cards and hero content shrink to the available width, the header switches to a scrollable menu, and booking controls and footer columns reflow on small screens.

The questionnaire invitation keeps its checklist, footer, and call to action visible. It stays above the cookie consent banner, accounts for the available viewport height, and scrolls internally on short screens. Resizing from a dragged desktop card to mobile resets its position so it stays on screen.

These changes require **no new environment variables, database migration, or dependency installation**. The widget's existing delay and dismissal settings remain in `window.QUESTIONNAIRE_CONFIG` in `public/index.html`.

Browser layout checks covered the home, questionnaire, and privacy pages in both languages at widths from 280 to 1,440 pixels, including portrait and landscape screens. Checks also covered mobile menu opening, cookie dismissal, desktop dragging followed by mobile resizing, and navigation through the widget's questionnaire link. Tests used local static pages with mocked configuration and availability responses; they do not verify production database, email delivery, or submissions.

After changing the public assets, regenerate the portable preview with `node build-preview.js`. See [README-DEPLOYMENT.md](README-DEPLOYMENT.md#deploying-the-mobile-layout-update) for the update checklist.

## 🎠 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare CDN                          │
│  (SSL, DDoS Protection, Turnstile, Rate Limiting)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              cPanel Node.js Application                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Node.js Server (server.js)              │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  Authentication (auth.js)                   │  │   │
│  │  │  - scrypt password hashing                   │  │   │
│  │  │  - Session management                       │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  Database Layer (database.js)                │  │   │
│  │  │  - MySQL connection pooling                  │  │   │
│  │  │  - CRUD operations                          │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  Security Layer                              │  │   │
│  │  │  - CSP with nonces                          │  │   │
│  │  │  - Rate limiting                            │  │   │
│  │  │  - Input validation                         │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  MySQL Database                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Users     │  │   Sessions   │  │  Bookings    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │ Collaboratns │  │Questionnaires│                       │
│  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### 🔄 Key Features

- 🔥 **Session-based authentication** with HTTP-only cookies
- 💾 **MySQL database** with connection pooling
- 📅 **12-month data retention** with automated cleanup
- 📈 **Admin dashboard** with CSV export and detailed views
- 📞 **Custom booking engine** (Saudi working week, Riyadh timezone)
- 🌍 **Bilingual support** (English/Arabic with RTL)

---

## 💻 Technology Stack

### 🔧 Backend

| Technology | Purpose |
|------------|---------|
| 💻 **Node.js 18+** | Runtime environment |
| 💾 **MySQL** | Database storage |
| 💳 **mysql2** | MySQL driver |
| 💰 **crypto** | Password hashing (scrypt) |
| 📧 **Custom SMTP client** | Email notifications |

### 🖥 Frontend

| Technology | Purpose |
|------------|---------|
| 🎯 **HTML5** | Semantic markup |
| 🎨 **CSS3** | Styling with custom properties |
| 📋 **Vanilla JS** | No frameworks, ES2019+ |
| 🌍 **RTL support** | Full Arabic layout support |

### 🌐 Infrastructure

| Technology | Purpose |
|------------|---------|
| 🌍 **Namecheap cPanel** | Shared hosting |
| 👥 **Cloudflare** | CDN, SSL, DDoS protection |
| 🔐 **Turnstile** | Bot protection |

---

## 🔐 Security & Privacy

### 🛡️ Security Features

- 🔐 **Content Security Policy (CSP)** with nonces
- 🔐 **Per-IP rate limiting** on all endpoints
- 🔐 **Session-based authentication** with HTTP-only cookies
- 🔐 **scrypt password hashing** (memory-hard algorithm)
- 🔐 **SQL injection prevention** (parameterized queries)
- 🔐 **Input validation** and sanitization
- 🔐 **Cloudflare Turnstile** bot protection
- 🔐 **Security headers** (X-Frame-Options, HSTS-ready)

### 🔇 Privacy & Compliance

- 📅 **12-month data retention** (Saudi/GCC compliance)
- 📅 **Automated data cleanup** of old records
- 📅 **No default credentials** (fail-closed design)
- 📅 **Environment-based configuration** (no secrets in code)
- 📅 **Minimized data collection** (only what's necessary)

### 📈 Security Best Practices

✅ **Zero-dependency architecture** (minimal attack surface)  
✅ **Timing-safe comparisons** (prevent timing attacks)  
✅ **Race condition mitigation** (booking double-check)  
✅ **HTTPS-only cookies** (prevent XSS theft)  
✅ **Session expiration** (24-hour validity)  

---

## 📅 Project Structure

```
brand-site/
├── server.js                      # Main server application
├── database.js                    # MySQL database operations
├── auth.js                        # Authentication & session management
├── smtp.js                        # Custom SMTP client
├── seed-admin.js                  # Admin user seeding script
├── schema.sql                     # Database schema
├── package.json                   # Dependencies
├── config.example.env             # Configuration template
├── .env                           # Environment variables (git ignored)
├── public/
│   ├── index.html                 # Main page
│   ├── styles.css                 # Styling
│   ├── app.js                     # Frontend logic
│   ├── questionnaire.html         # Questionnaire page
│   ├── questionnaire.js           # Questionnaire logic
│   ├── questionnaire-widget.css   # Widget styling
│   ├── questionnaire-widget.js    # Widget logic
│   ├── admin.html                 # Admin login
│   ├── admin-dashboard.html       # Admin dashboard
│   ├── admin-settings.html       # Admin settings
│   └── assets/
│       ├── portrait.jpg           # Profile photo
│       └── favicon.svg            # Site icon
└── README.md                      # This file
```

---

## 🌍 Getting Started

### 📱 Prerequisites

- 💻 Node.js 18 or higher
- 💾 MySQL/MariaDB database
- 🔐 SMTP server for email notifications

### 🚀 Local Development

```bash
# Clone the repository
git clone https://github.com/ma1amin/landing-page.git
cd landing-page

# Install dependencies
npm install

# Copy environment template
cp config.example.env .env

# Edit .env with your credentials
# Configure database, SMTP, Turnstile

# Import database schema
mysql -u root -p brand_site < schema.sql

# Seed admin user
npm run seed-admin
# Save the generated password!

# Start the server
npm start
```

### 🌐 Deployment

For production deployment on cPanel, see [README-DEPLOYMENT.md](README-DEPLOYMENT.md) for detailed instructions.

---

## 📊 Additional Suggestions

### 🔥 Future Enhancements

- 🔥 **Multi-language CMS** - Easy content updates without code changes
- 🔥 **Analytics dashboard** - Track visitor behavior and conversions
- 🔥 **Calendar integration** - Sync bookings with Google/Outlook calendars
- 🔥 **Payment gateway** - Accept payments directly through the booking flow
- 🔥 **Video conferencing** - Direct integration with Zoom/Google Meet
- 🔥 **Blog section** - Share cybersecurity insights and thought leadership
- 🔥 **Portfolio gallery** - Showcase past projects and case studies
- 🔥 **Testimonials** - Client feedback and success stories

### 🚀 Performance Optimizations

- 🚀 **Static asset CDN** - Cache static files on Cloudflare edge
- 🚀 **Image optimization** - WebP format with responsive images
- 🚀 **Code splitting** - Load JavaScript only when needed
- 🚀 **Database indexing** - Optimize frequently queried columns
- 🚀 **Connection pooling** - Tune MySQL pool size for production

### 🔐 Security Enhancements

- 🛡️ **Two-factor authentication** - Add 2FA for admin login
- 🛡️ **IP whitelisting** - Restrict admin access to specific IPs
- 🛡️ **Audit logging** - Track all admin actions for compliance
- 🛡️ **Security headers analyzer** - Automated security header testing
- 🛡️ **Rate limiting refinement** - Per-endpoint custom limits

### 📈 Developer Experience

- 💻 **Docker support** - Containerized development environment
- 💻 **Automated testing** - Unit and integration tests
- 💻 **CI/CD pipeline** - Automated deployment with GitHub Actions
- 💻 **API documentation** - Swagger/OpenAPI specification
- 💻 **Development mode** - Hot reload and debug tools

---

## 📞 Contact

- ✉️ **Email:** [info@malamin.cc](mailto:info@malamin.cc)
- 🌐 **Website:** [malamin.cc](https://malamin.cc)
- 🐦 **Location:** Riyadh, Saudi Arabia

---

## 👔 License

This project is **PRIVATE**. All Rights Reserved.

© 2026 Dr. Mohammed Al Amin

---

*Built with passion for cybersecurity excellence*
