# Zoom and Google Meet setup

Discovery sessions last 20 minutes and technical sessions last 40 minutes. Both offer Google Meet or Zoom. Advisory sessions last 60 minutes and offer Google Meet only. Prices are unchanged. Existing bookings keep their saved duration.

Clients receive attendee links only by email and in the attached `.ics` invitation. Public API responses, confirmation screens, admin pages and CSV exports do not include those links. Provider host links and access tokens are never persisted or returned. Zoom Basic's 40-minute limit still applies; setting an API duration does not override your license.

## 1. Apply the database migration

Back up the database. In cPanel phpMyAdmin, import `migrations/001-meetings.sql` once into the existing database before deploying the new application. It creates the booking-day locking and meeting-job tables without changing historical bookings. New installations use the updated `schema.sql` instead. The server refuses to start without the required tables.

The migration uses InnoDB and MySQL named locks. All application instances must connect to the same writable database server. The worker runs inside the existing Node application; no separate cron service is required. Database dates are returned as strings, and retry deadlines use UTC.

## 2. Connect the Zoom host

As the Zoom account owner, create and activate a Server-to-Server OAuth app in the Zoom App Marketplace. Grant the meeting create, list/read, and delete scopes for your host. Current granular scopes are `meeting:write:meeting:admin`, `meeting:read:list_meetings:admin`, `meeting:read:meeting:admin` and `meeting:delete:meeting:admin`; use the equivalent scopes offered by your account if its interface differs.

Set `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, and `ZOOM_HOST_USER_ID` (your host's Zoom user ID or email). Credentials belong on the server only. Meetings use unique booking topics, generated passcodes, a waiting room, no personal meeting ID, and no automatic recording.

Reference: [Zoom server-to-server OAuth](https://developers.zoom.us/docs/internal-apps/s2s-oauth/) and [meeting API](https://developers.zoom.us/docs/api/meetings/).

## 3. Connect your personal Gmail account

1. Create a Google Cloud project and enable the Google Calendar API.
2. Configure an external OAuth consent screen for your own use, with the Calendar events scope (`https://www.googleapis.com/auth/calendar.events`).
3. Create an OAuth client with application type **Desktop app**. Set its client ID and secret as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your local ignored `.env`.
4. Run `npm run authorize-google` locally. Open the URL printed in the terminal, sign in to the Gmail account that hosts sessions, and grant Calendar permission. The script listens only on `127.0.0.1:8765` and saves the refresh token to your ignored `.env` without printing it.
5. Securely transfer these settings and `GOOGLE_REFRESH_TOKEN` to your hosting environment. Set `GOOGLE_CALENDAR_ID=primary` unless you use a different calendar that supports Google Meet.

External OAuth apps left in **Testing** normally receive refresh tokens that expire after seven days for Calendar access. Configure production publishing before relying on long-lived bookings; follow any consent or verification requirements shown for your app. Revoked tokens need reauthorization. Clients do not sign in to Google to book.

The integration creates host-calendar events without client attendees and with `sendUpdates=none`; the site's SMTP confirmation and calendar attachment deliver the client invitation, preventing duplicate Google notifications.

References: [Calendar conference creation](https://developers.google.com/workspace/calendar/api/guides/create-events), [Google OAuth token lifecycle](https://developers.google.com/identity/protocols/oauth2), and [native application loopback authorization](https://developers.google.com/identity/protocols/oauth2/native-app).

## 4. Configure and verify SMTP

Set the existing SMTP host, port, secure setting, user, password, sender and notification address. Automatic meetings cannot be enabled without complete SMTP configuration. A failed email remains queued and can be retried from the admin booking details.

## 5. Enable and check the deployment

Keep `MEETINGS_ENABLED=0` while creating accounts and applying the migration. Platform preferences are still saved; bookings receive a pending-details email for manual follow-up, and no external meetings are created. Enabling the integration does not retroactively provision bookings created while it was disabled, or legacy bookings.

After setting both providers and SMTP, set `MEETINGS_ENABLED=1` and restart Node. Create one authorized test booking on each provider, verify the actual attendee link and calendar attachment delivered by email, then cancel those bookings and verify the remote meetings/events are removed. Check the 60-minute choice offers only Meet and that no links appear in browser confirmation or admin responses. Purge cached public assets when deploying the new booking UI.

Run `npm test` for provider, scheduling, cancellation, privacy and mail tests. These use mocked external APIs and do not connect to your real accounts. Run the optional database concurrency tests only against a disposable database using `MEETING_TEST_DATABASE_URL`; they create and drop their own uniquely named test database. Live account validation and your production migration are separate deployment steps.

## Retry and cancellation behavior

The slot is reserved atomically before provider work. Meeting failures leave the booking confirmed and the link pending. Attempts occur immediately and at 1, 5, 15 and 60 minutes after the first attempt, picked up by the 30-second worker scan. Provider deadlines and mail retries persist across restarts. Google event IDs are deterministic; Zoom uses unique booking topics and searches existing meetings before recreating after an uncertain response. Provider requests time out after 10 seconds.

A pending confirmation contains no link or attachment. Once ready, a follow-up contains the attendee link and a calendar attachment with the same booking UID. Completed emails are recorded to avoid routine repeats. SMTP acceptance followed by a process crash can still cause a duplicate email; delivery is at-least-once, not exactly-once.

After five failed provider or email attempts, the admin is alerted and the booking remains reserved. Open booking details and select **Retry meeting/email**. Cancelled bookings cannot be retried. Cancellation queues external deletion; if a provider call completes after cancellation, its result is retained internally so cleanup can remove it. After an uncertain create response, a missing meeting is checked again after 1, 5, 15 and 60 minutes before cleanup is considered complete. Failed cleanup retries up to once per hour and alerts the admin after five failures. No attendee link is included in those alerts.

Changing credentials or disabling the worker pauses outstanding work. Keep it enabled until cancellations and pending confirmations have completed. Monitor application logs and meeting status in the admin portal; no provider response bodies or credentials are logged.
