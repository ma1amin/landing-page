# <img src="https://animated-fluent-emoji.vercel.app/image/1f4f1?size=128&color=ff6b6b" width="32" /> Dr. Mohammed Al Amin

> <img src="https://animated-fluent-emoji.vercel.app/image/1f4bb?size=24&color=f5c256" width="20" /> **Cybersecurity Leader & Founder** · Arabc0n Cyber Security · InfoLogix · Riyadh, Saudi Arabia

---

## <img src="https://animated-fluent-emoji.vercel.app/image/1f916?size=32&color=3ddc97" width="28" /> Vision

<p align="center">
  <img src="https://animated-fluent-emoji.vercel.app/image/1f30c?size=64&color=f5c256" width="64" />
</p>

To be the leading cybersecurity voice in the Arab world, empowering organizations with robust security strategies, AI-native platforms, and digital transformation solutions that protect and advance regional business interests.

---

## <img src="https://animated-fluent-emoji.vercel.app/image/1f3af?size=32&color=3ddc97" width="28" /> Mission

<p align="center">
  <img src="https://animated-fluent-emoji.vercel.app/image/1f4e1?size=64&color=f5c256" width="64" />
</p>

- <img src="https://animated-fluent-emoji.vercel.app/image/2705?size=20&color=3ddc97" width="20" /> Deliver cutting-edge red teaming and security architecture services
- <img src="https://animated-fluent-emoji.vercel.app/image/2705?size=20&color=3ddc97" width="20" /> Build AI-native platforms that transform logistics and operations
- <img src="https://animated-fluent-emoji.vercel.app/image/2705?size=20&color=3ddc97" width="20" /> Bridge the gap between technical and executive leadership
- <img src="https://animated-fluent-emoji.vercel.app/image/2705?size=20&color=3ddc97" width="20" /> Foster a security-first culture across the Arab world

---

## <img src="https://animated-fluent-emoji.vercel.app/image/1f3c3?size=32&color=3ddc97" width="28" /> Strategy

<p align="center">
  <img src="https://animated-fluent-emoji.vercel.app/image/1f4c8?size=64&color=f5c256" width="64" />
</p>

### <img src="https://animated-fluent-emoji.vercel.app/image/1f525?size=24&color=f5c256" width="20" /> Core Pillars

| Pillar | Description |
|--------|-------------|
| <img src="https://animated-fluent-emoji.vercel.app/image/1f510?size=24&color=ff6b6b" width="20" /> **Security First** | Every solution built with security at its foundation |
| <img src="https://animated-fluent-emoji.vercel.app/image/1f310?size=24&color=3ddc97" width="20" /> **Regional Focus** | Tailored for Saudi/GCC market needs and compliance |
| <img src="https://animated-fluent-emoji.vercel.app/image/1f9af?size=24&color=f5c256" width="20" /> **Innovation** | AI-native solutions that push boundaries |
| <img src="https://animated-fluent-emoji.vercel.app/image/1f465?size=24&color=a8b0bd" width="20" /> **Partnership** | Building lasting relationships through trust |

### <img src="https://animated-fluent-emoji.vercel.app/image/1f4c5?size=24&color=f5c256" width="20" /> Strategic Goals

- <img src="https://animated-fluent-emoji.vercel.app/image/1f3c3?size=20&color=3ddc97" width="20" /> Expand Arabc0n's reach across GCC region
- <img src="https://animated-fluent-emoji.vercel.app/image/1f4ca?size=20&color=3ddc97" width="20" /> Launch 3 new AI-native platforms by 2027
- <img src="https://animated-fluent-emoji.vercel.app/image/1f4a1?size=20&color=3ddc97" width="20" /> Train 100+ cybersecurity professionals annually
- <img src="https://animated-fluent-emoji.vercel.app/image/1f514?size=20&color=3ddc97" width="20" /> Establish InfoLogix as logistics tech leader

---

## <img src="https://animated-fluent-emoji.vercel.app/image/1f680?size=32&color=3ddc97" width="28" /> About This Site

<p align="center">
  <img src="https://animated-fluent-emoji.vercel.app/image/1f4bb?size=64&color=f5c256" width="64" />
</p>

A bilingual (English/Arabic) personal brand website featuring:

- <img src="https://animated-fluent-emoji.vercel.app/image/1f4de?size=20&color=f5c256" width="20" /> **Self-hosted booking engine** with Saudi working week (Sunday-Thursday)
- <img src="https://animated-fluent-emoji.vercel.app/image/1f4cb?size=20&color=f5c256" width="20" /> **Client intake questionnaire** (10 questions, ~90 seconds)
- <img src="https://animated-fluent-emoji.vercel.app/image/1f510?size=20&color=f5c256" width="20" /> **Admin portal** with MySQL database and session-based authentication
- <img src="https://animated-fluent-emoji.vercel.app/image/1f6b0?size=20&color=f5c256" width="20" /> **Hardened security** with CSP, rate limiting, and Turnstile protection
- <img src="https://animated-fluent-emoji.vercel.app/image/1f3c3?size=20&color=f5c256" width="20" /> **Saudi/GCC compliance** with 12-month data retention

---

## <img src="https://animated-fluent-emoji.vercel.app/image/1f3a0?size=32&color=3ddc97" width="28" /> Architecture

<p align="center">
  <img src="https://animated-fluent-emoji.vercel.app/image/1f4f0?size=64&color=f5c256" width="64" />
</p>

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

### <img src="https://animated-fluent-emoji.vercel.app/image/1f504?size=24&color=f5c256" width="20" /> Key Features

- <img src="https://animated-fluent-emoji.vercel.app/image/1f525?size=20&color=ff6b6b" width="20" /> **Session-based authentication** with HTTP-only cookies
- <img src="https://animated-fluent-emoji.vercel.app/image/1f4be?size=20&color=3ddc97" width="20" /> **MySQL database** with connection pooling
- <img src="https://animated-fluent-emoji.vercel.app/image/1f4c5?size=20&color=f5c256" width="20" /> **12-month data retention** with automated cleanup
- <img src="https://animated-fluent-emoji.vercel.app/image/1f6b0?size=20&color=f5c256" width="20" /> **Admin dashboard** with CSV export and detailed views
- <img src="https://animated-fluent-emoji.vercel.app/image/1f4de?size=20&color=f5c256" width="20" /> **Custom booking engine** (Saudi working week, Riyadh timezone)
- <img src="https://animated-fluent-emoji.vercel.app/image/1f30d?size=20&color=f5c256" width="20" /> **Bilingual support** (English/Arabic with RTL)

---

## <img src="https://animated-fluent-emoji.vercel.app/image/1f4bb?size=32&color=3ddc97" width="28" /> Technology Stack

<p align="center">
  <img src="https://animated-fluent-emoji.vercel.app/image/1f9f0?size=64&color=f5c256" width="64" />
</p>

### <img src="https://animated-fluent-emoji.vercel.app/image/1f527?size=24&color=f5c256" width="20" /> Backend

| Technology | Purpose |
|------------|---------|
| <img src="https://animated-fluent-emoji.vercel.app/image/1f4bb?size=24&color=68a063" width="20" /> **Node.js 18+** | Runtime environment |
| <img src="https://animated-fluent-emoji.vercel.app/image/1f4be?size=24&color=00758f" width="20" /> **MySQL** | Database storage |
| <img src="https://animated-fluent-emoji.vercel.app/image/1f4b3?size=24&color=f5c256" width="20" /> **mysql2** | MySQL driver |
| <img src="https://animated-fluent-emoji.vercel.app/image/1f4b0?size=24&color=f5c256" width="20" /> **crypto** | Password hashing (scrypt) |
| <img src="https://animated-fluent-emoji.vercel.app/image/1f4e7?size=24&color=f5c256" width="20" /> **Custom SMTP client** | Email notifications |

### <img src="https://animated-fluent-emoji.vercel.app/image/1f5a5?size=24&color=f5c256" width="20" /> Frontend

| Technology | Purpose |
|------------|---------|
| <img src="https://animated-fluent-emoji.vercel.app/image/1f3af?size=24&color=e34c26" width="20" /> **HTML5** | Semantic markup |
| <img src="https://animated-fluent-emoji.vercel.app/image/1f3a8?size=24&color=264de4" width="20" /> **CSS3** | Styling with custom properties |
| <img src="https://animated-fluent-emoji.vercel.app/image/1f4cb?size=24&color=f7df1e" width="20" /> **Vanilla JS** | No frameworks, ES2019+ |
| <img src="https://animated-fluent-emoji.vercel.app/image/1f30d?size=24&color=f5c256" width="20" /> **RTL support** | Full Arabic layout support |

### <img src="https://animated-fluent-emoji.vercel.app/image/1f310?size=24&color=f5c256" width="20" /> Infrastructure

| Technology | Purpose |
|------------|---------|
| <img src="https://animated-fluent-emoji.vercel.app/image/1f30d?size=24&color=f5c256" width="20" /> **Namecheap cPanel** | Shared hosting |
| <img src="https://animated-fluent-emoji.vercel.app/image/1f465?size=24&color=f68212" width="20" /> **Cloudflare** | CDN, SSL, DDoS protection |
| <img src="https://animated-fluent-emoji.vercel.app/image/1f510?size=24&color=f5c256" width="20" /> **Turnstile** | Bot protection |

---

## <img src="https://animated-fluent-emoji.vercel.app/image/1f510?size=32&color=3ddc97" width="28" /> Security & Privacy

<p align="center">
  <img src="https://animated-fluent-emoji.vercel.app/image/1f6e1?size=64&color=f5c256" width="64" />
</p>

### <img src="https://animated-fluent-emoji.vercel.app/image/1f6e1?size=24&color=ff6b6b" width="20" /> Security Features

- <img src="https://animated-fluent-emoji.vercel.app/image/1f510?size=20&color=3ddc97" width="20" /> **Content Security Policy (CSP)** with nonces
- <img src="https://animated-fluent-emoji.vercel.app/image/1f510?size=20&color=3ddc97" width="20" /> **Per-IP rate limiting** on all endpoints
- <img src="https://animated-fluent-emoji.vercel.app/image/1f510?size=20&color=3ddc97" width="20" /> **Session-based authentication** with HTTP-only cookies
- <img src="https://animated-fluent-emoji.vercel.app/image/1f510?size=20&color=3ddc97" width="20" /> **scrypt password hashing** (memory-hard algorithm)
- <img src="https://animated-fluent-emoji.vercel.app/image/1f510?size=20&color=3ddc97" width="20" /> **SQL injection prevention** (parameterized queries)
- <img src="https://animated-fluent-emoji.vercel.app/image/1f510?size=20&color=3ddc97" width="20" /> **Input validation** and sanitization
- <img src="https://animated-fluent-emoji.vercel.app/image/1f510?size=20&color=3ddc97" width="20" /> **Cloudflare Turnstile** bot protection
- <img src="https://animated-fluent-emoji.vercel.app/image/1f510?size=20&color=3ddc97" width="20" /> **Security headers** (X-Frame-Options, HSTS-ready)

### <img src="https://animated-fluent-emoji.vercel.app/image/1f507?size=24&color=f5c256" width="20" /> Privacy & Compliance

- <img src="https://animated-fluent-emoji.vercel.app/image/1f4c5?size=20&color=3ddc97" width="20" /> **12-month data retention** (Saudi/GCC compliance)
- <img src="https://animated-fluent-emoji.vercel.app/image/1f4c5?size=20&color=3ddc97" width="20" /> **Automated data cleanup** of old records
- <img src="https://animated-fluent-emoji.vercel.app/image/1f4c5?size=20&color=3ddc97" width="20" /> **No default credentials** (fail-closed design)
- <img src="https://animated-fluent-emoji.vercel.app/image/1f4c5?size=20&color=3ddc97" width="20" /> **Environment-based configuration** (no secrets in code)
- <img src="https://animated-fluent-emoji.vercel.app/image/1f4c5?size=20&color=3ddc97" width="20" /> **Minimized data collection** (only what's necessary)

### <img src="https://animated-fluent-emoji.vercel.app/image/1f4c8?size=24&color=f5c256" width="20" /> Security Best Practices

✅ **Zero-dependency architecture** (minimal attack surface)  
✅ **Timing-safe comparisons** (prevent timing attacks)  
✅ **Race condition mitigation** (booking double-check)  
✅ **HTTPS-only cookies** (prevent XSS theft)  
✅ **Session expiration** (24-hour validity)  

---

## <img src="https://animated-fluent-emoji.vercel.app/image/1f5c4?size=32&color=3ddc97" width="28" /> Project Structure

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

## <img src="https://animated-fluent-emoji.vercel.app/image/1f30d?size=32&color=3ddc97" width="28" /> Getting Started

### <img src="https://animated-fluent-emoji.vercel.app/image/1f4f1?size=24&color=f5c256" width="20" /> Prerequisites

- <img src="https://animated-fluent-emoji.vercel.app/image/1f4bb?size=20&color=68a063" width="20" /> Node.js 18 or higher
- <img src="https://animated-fluent-emoji.vercel.app/image/1f4be?size=20&color=00758f" width="20" /> MySQL/MariaDB database
- <img src="https://animated-fluent-emoji.vercel.app/image/1f510?size=20&color=f5c256" width="20" /> SMTP server for email notifications

### <img src="https://animated-fluent-emoji.vercel.app/image/1f680?size=24&color=f5c256" width="20" /> Local Development

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

### <img src="https://animated-fluent-emoji.vercel.app/image/1f310?size=24&color=f5c256" width="20" /> Deployment

For production deployment on cPanel, see [README-DEPLOYMENT.md](README-DEPLOYMENT.md) for detailed instructions.

---

## <img src="https://animated-fluent-emoji.vercel.app/image/1f4ca?size=32&color=3ddc97" width="28" /> Additional Suggestions

### <img src="https://animated-fluent-emoji.vercel.app/image/1f3a8?size=24&color=f5c256" width="20" /> Future Enhancements

- <img src="https://animated-fluent-emoji.vercel.app/image/1f525?size=20&color=ff6b6b" width="20" /> **Multi-language CMS** - Easy content updates without code changes
- <img src="https://animated-fluent-emoji.vercel.app/image/1f525?size=20&color=ff6b6b" width="20" /> **Analytics dashboard** - Track visitor behavior and conversions
- <img src="https://animated-fluent-emoji.vercel.app/image/1f525?size=20&color=ff6b6b" width="20" /> **Calendar integration** - Sync bookings with Google/Outlook calendars
- <img src="https://animated-fluent-emoji.vercel.app/image/1f525?size=20&color=ff6b6b" width="20" /> **Payment gateway** - Accept payments directly through the booking flow
- <img src="https://animated-fluent-emoji.vercel.app/image/1f525?size=20&color=ff6b6b" width="20" /> **Video conferencing** - Direct integration with Zoom/Google Meet
- <img src="https://animated-fluent-emoji.vercel.app/image/1f525?size=20&color=ff6b6b" width="20" /> **Blog section** - Share cybersecurity insights and thought leadership
- <img src="https://animated-fluent-emoji.vercel.app/image/1f525?size=20&color=ff6b6b" width="20" /> **Portfolio gallery** - Showcase past projects and case studies
- <img src="https://animated-fluent-emoji.vercel.app/image/1f525?size=20&color=ff6b6b" width="20" /> **Testimonials** - Client feedback and success stories

### <img src="https://animated-fluent-emoji.vercel.app/image/1f4b0?size=24&color=f5c256" width="20" /> Performance Optimizations

- <img src="https://animated-fluent-emoji.vercel.app/image/1f680?size=20&color=3ddc97" width="20" /> **Static asset CDN** - Cache static files on Cloudflare edge
- <img src="https://animated-fluent-emoji.vercel.app/image/1f680?size=20&color=3ddc97" width="20" /> **Image optimization** - WebP format with responsive images
- <img src="https://animated-fluent-emoji.vercel.app/image/1f680?size=20&color=3ddc97" width="20" /> **Code splitting** - Load JavaScript only when needed
- <img src="https://animated-fluent-emoji.vercel.app/image/1f680?size=20&color=3ddc97" width="20" /> **Database indexing** - Optimize frequently queried columns
- <img src="https://animated-fluent-emoji.vercel.app/image/1f680?size=20&color=3ddc97" width="20" /> **Connection pooling** - Tune MySQL pool size for production

### <img src="https://animated-fluent-emoji.vercel.app/image/1f510?size=24&color=f5c256" width="20" /> Security Enhancements

- <img src="https://animated-fluent-emoji.vercel.app/image/1f6e1?size=20&color=ff6b6b" width="20" /> **Two-factor authentication** - Add 2FA for admin login
- <img src="https://animated-fluent-emoji.vercel.app/image/1f6e1?size=20&color=ff6b6b" width="20" /> **IP whitelisting** - Restrict admin access to specific IPs
- <img src="https://animated-fluent-emoji.vercel.app/image/1f6e1?size=20&color=ff6b6b" width="20" /> **Audit logging** - Track all admin actions for compliance
- <img src="https://animated-fluent-emoji.vercel.app/image/1f6e1?size=20&color=ff6b6b" width="20" /> **Security headers analyzer** - Automated security header testing
- <img src="https://animated-fluent-emoji.vercel.app/image/1f6e1?size=20&color=ff6b6b" width="20" /> **Rate limiting refinement** - Per-endpoint custom limits

### <img src="https://animated-fluent-emoji.vercel.app/image/1f4c8?size=24&color=f5c256" width="20" /> Developer Experience

- <img src="https://animated-fluent-emoji.vercel.app/image/1f4bb?size=20&color=68a063" width="20" /> **Docker support** - Containerized development environment
- <img src="https://animated-fluent-emoji.vercel.app/image/1f4bb?size=20&color=68a063" width="20" /> **Automated testing** - Unit and integration tests
- <img src="https://animated-fluent-emoji.vercel.app/image/1f4bb?size=20&color=68a063" width="20" /> **CI/CD pipeline** - Automated deployment with GitHub Actions
- <img src="https://animated-fluent-emoji.vercel.app/image/1f4bb?size=20&color=68a063" width="20" /> **API documentation** - Swagger/OpenAPI specification
- <img src="https://animated-fluent-emoji.vercel.app/image/1f4bb?size=20&color=68a063" width="20" /> **Development mode** - Hot reload and debug tools

---

## <img src="https://animated-fluent-emoji.vercel.app/image/1f4de?size=32&color=3ddc97" width="28" /> Contact

<p align="center">
  <img src="https://animated-fluent-emoji.vercel.app/image/1f4e9?size=64&color=f5c256" width="64" />
</p>

- <img src="https://animated-fluent-emoji.vercel.app/image/2709?size=20&color=f5c256" width="20" /> **Email:** [info@malamin.cc](mailto:info@malamin.cc)
- <img src="https://animated-fluent-emoji.vercel.app/image/1f310?size=20&color=f5c256" width="20" /> **Website:** [malamin.cc](https://malamin.cc)
- <img src="https://animated-fluent-emoji.vercel.app/image/1f426?size=20&color=f5c256" width="20" /> **Location:** Riyadh, Saudi Arabia

---

## <img src="https://animated-fluent-emoji.vercel.app/image/1f454?size=32&color=3ddc97" width="28" /> License

<p align="center">
  <img src="https://animated-fluent-emoji.vercel.app/image/1f512?size=64&color=f5c256" width="64" />
</p>

This project is **UNLICENSED**. All rights reserved.

© 2026 Dr. Mohammed Al Amin

---

<p align="center">
  <img src="https://animated-fluent-emoji.vercel.app/image/1f680?size=48&color=f5c256" width="48" />
  <br>
  <img src="https://animated-fluent-emoji.vercel.app/image/1f30c?size=32&color=f5c256" width="32" />
  <em>Built with passion for cybersecurity excellence</em>
  <img src="https://animated-fluent-emoji.vercel.app/image/1f30c?size=32&color=f5c256" width="32" />
</p>
