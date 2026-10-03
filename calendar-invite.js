'use strict';
const { providerLabel } = require('./meeting-policy');
const { startTime } = require('./meeting-providers');
function escape(value) { return String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,'); }
function fold(line) {
  const rows = []; let current = '';
  for (const character of line) {
    if (Buffer.byteLength(current + character) > 73) { rows.push(current); current = ' '; }
    current += character;
  }
  rows.push(current); return rows.join('\r\n');
}
function generateICS(booking) {
  const start = new Date(startTime(booking));
  const end = new Date(start.getTime() + booking.duration * 60000);
  const format = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const url = booking.join_url || '';
  const provider = booking.provider || booking.meetingProvider;
  const description = `Booking reference: ${booking.ref}\nSession: ${booking.sessionName || booking.session_name}\nDuration: ${booking.duration} minutes\n` +
    (url ? `Platform: ${providerLabel(provider)}\nJoin: ${url}` : 'Meeting details will be sent by email.');
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Dr. Mohammed Al Amin//Brand Site//EN','CALSCALE:GREGORIAN','METHOD:REQUEST',
    'BEGIN:VEVENT', `UID:${booking.ref}@malamin.cc`,`DTSTAMP:${format(new Date())}`,`DTSTART:${format(start)}`,`DTEND:${format(end)}`,
    'SUMMARY:' + escape((booking.sessionName || booking.session_name) + ' - Dr. Mohammed Al Amin'), 'DESCRIPTION:' + escape(description),
    'ORGANIZER;CN=Dr. Mohammed Al Amin:mailto:info@malamin.cc', 'ATTENDEE;RSVP=TRUE:mailto:' + booking.email,
    'LOCATION:' + escape(url ? providerLabel(provider) + ' ' + url : 'Online (Video Call)'), ...(url ? ['URL:' + url] : []),
    'STATUS:CONFIRMED','SEQUENCE:' + (url && booking.pending_email_sent ? '1' : '0'),'END:VEVENT','END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}
module.exports = { generateICS };
