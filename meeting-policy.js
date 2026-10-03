'use strict';
const SESSION_TYPES = {
  discovery: { duration: 20, price: 0, en: 'Discovery Call', ar: 'مكالمة تعارف' },
  technical: { duration: 40, price: 20, en: 'Technical Deep Dive', ar: 'جلسة تقنية معمقة' },
  advisory: { duration: 60, price: 50, en: 'Advisory Retainer Intro', ar: 'جلسة استشارية تمهيدية' },
};
function allowedProviders(duration) { return duration < 60 ? ['google_meet', 'zoom'] : ['google_meet']; }
function providerLabel(provider) { return provider === 'zoom' ? 'Zoom' : 'Google Meet'; }
function publicBooking(booking, meeting = {}) {
  return { ref: booking.ref, date: booking.date, time: booking.time,
    duration: booking.duration, sessionName: booking.sessionName || booking.session_name,
    timezone: booking.timezone, meetingProvider: meeting.provider || booking.meetingProvider,
    meetingStatus: meeting.state || 'disabled' };
}
function adminBooking(booking) {
  // Never export attendee links, external IDs, tokens, or provider responses.
  const { join_url, external_id, last_error, ...safe } = booking;
  return safe;
}
module.exports = { SESSION_TYPES, allowedProviders, providerLabel, publicBooking, adminBooking };
