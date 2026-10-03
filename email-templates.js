'use strict';
const { providerLabel } = require('./meeting-policy');

/**
 * Email templates for user confirmation emails
 * Dark-themed, branded HTML with inline CSS for email client compatibility
 */

// Brand colors (matching website)
const COLORS = {
  bg: '#07080b',
  text: '#a0a8b6',
  text2: '#7a8290',
  amber: '#f5c256',
  amber2: '#d08a12',
  line: '#1a1d23',
  green: '#4ade80',
  blue: '#60a5fa'
};

// Brand icon SVG (shield with amber gradient)
const BRAND_ICON = `<svg viewBox="0 0 40 40" width="40" height="40" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="emailBg1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffcf5c"/>
      <stop offset="100%" stop-color="#d08a12"/>
    </linearGradient>
  </defs>
  <rect width="40" height="40" rx="8" fill="${COLORS.bg}"/>
  <path d="M9 28V13l6.5 7.5L22 13v15" fill="none" stroke="url(#emailBg1)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M22 20.5l4.5 7.5M22 20.5l4.5-7.5" fill="none" stroke="url(#emailBg1)" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M31 28v-8" fill="none" stroke="url(#emailBg1)" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>
</svg>`;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createEmailWrapper(content) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: ${COLORS.bg}; }
    table { border-collapse: collapse; }
  </style>
</head>
<body style="background-color: ${COLORS.bg}; padding: 20px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: ${COLORS.bg};">
    ${content}
  </table>
</body>
</html>`;
}

function createHeader() {
  return `
    <tr>
      <td style="padding: 30px 20px; border-bottom: 1px solid ${COLORS.line};">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="vertical-align: middle;">
              ${BRAND_ICON}
            </td>
            <td style="padding-left: 15px; vertical-align: middle;">
              <p style="margin: 0; color: ${COLORS.text}; font-size: 16px; font-weight: 600;">Dr. Mohammed Al Amin</p>
              <p style="margin: 4px 0 0 0; color: ${COLORS.text2}; font-size: 13px;">Cybersecurity Leader · Founder</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function createSection(content) {
  return `
    <tr>
      <td style="padding: 30px 20px;">
        ${content}
      </td>
    </tr>`;
}

function createReference(ref) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0; background-color: ${COLORS.line}; border-radius: 8px; padding: 20px;">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; color: ${COLORS.text2}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Reference</p>
          <p style="margin: 0; color: ${COLORS.amber}; font-size: 20px; font-weight: 700;">${escapeHtml(ref)}</p>
        </td>
      </tr>
    </table>`;
}

function createDetailsTable(rows) {
  const rowHtml = rows.map(row => `
    <tr>
      <td style="padding: 8px 0; color: ${COLORS.text2}; font-size: 13px; width: 140px; vertical-align: top;">${escapeHtml(row.label)}</td>
      <td style="padding: 8px 0; color: ${COLORS.text}; font-size: 13px; vertical-align: top;">${escapeHtml(row.value)}</td>
    </tr>
  `).join('');
  
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
      ${rowHtml}
    </table>`;
}

function createSecurityNotice(type) {
  const notices = {
    booking: 'This is an automated email from the Dr. Mohammed Al Amin booking system.',
    collaboration: 'This is an automated email from the Dr. Mohammed Al Amin collaboration system.',
    questionnaire: 'This is an automated email from the Dr. Mohammed Al Amin questionnaire system.'
  };
  
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 25px 0; padding: 15px; background-color: ${COLORS.line}; border-left: 3px solid ${COLORS.amber}; border-radius: 4px;">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; color: ${COLORS.amber}; font-size: 14px; font-weight: 600;">🔒 Security Notice</p>
          <p style="margin: 0 0 8px 0; color: ${COLORS.text}; font-size: 13px; line-height: 1.5;">${notices[type] || 'This is an automated email.'}</p>
          <p style="margin: 0 0 8px 0; color: ${COLORS.text}; font-size: 13px; line-height: 1.5;">Please do not reply to this email. For any questions or changes, please visit <a href="https://malamin.cc" style="color: ${COLORS.amber}; text-decoration: none;">https://malamin.cc</a> or contact <a href="mailto:info@malamin.cc" style="color: ${COLORS.amber}; text-decoration: none;">info@malamin.cc</a> directly.</p>
          <p style="margin: 0; color: ${COLORS.text}; font-size: 13px; line-height: 1.5;">Your information is handled securely and in accordance with our <a href="https://malamin.cc/privacy" style="color: ${COLORS.amber}; text-decoration: none;">privacy policy</a>.</p>
        </td>
      </tr>
    </table>`;
}

function createFooter() {
  return `
    <tr>
      <td style="padding: 30px 20px; border-top: 1px solid ${COLORS.line}; text-align: center;">
        <p style="margin: 0 0 8px 0; color: ${COLORS.text2}; font-size: 12px;">© 2026 Dr. Mohammed Al Amin. All Rights Reserved.</p>
        <p style="margin: 0; color: ${COLORS.text2}; font-size: 12px;">Security Infrastructure · Logistics Technology · Innovation Ecosystems</p>
        <p style="margin: 8px 0 0 0;">
          <a href="https://malamin.cc" style="color: ${COLORS.amber}; text-decoration: none; font-size: 12px;">https://malamin.cc</a>
          <span style="color: ${COLORS.text2}; margin: 0 8px;">|</span>
          <a href="https://malamin.cc/privacy" style="color: ${COLORS.amber}; text-decoration: none; font-size: 12px;">Privacy Policy</a>
        </p>
      </td>
    </tr>`;
}

function bookingConfirmationHTML(booking) {
  const sectionContent = `
    <p style="margin: 0 0 20px 0; color: ${COLORS.text}; font-size: 15px; line-height: 1.5;">Hello ${escapeHtml(booking.name)},</p>
    <p style="margin: 0 0 20px 0; color: ${COLORS.text}; font-size: 15px; line-height: 1.5;">Your session has been booked successfully.</p>
    ${createReference(booking.ref)}
    ${createDetailsTable([
      { label: 'Session Type', value: booking.sessionName },
      { label: 'Date', value: booking.date },
      { label: 'Time', value: `${booking.time} (${booking.timezone})` },
      { label: 'Duration', value: `${booking.duration} minutes` },
      { label: 'Platform', value: providerLabel(booking.provider || booking.meetingProvider) }
    ])}
    ${booking.meetingPending
      ? '<p>Your booking is reserved. Your meeting link and calendar invitation will be sent by email once ready.</p>'
      : '<p><a href="' + escapeHtml(booking.join_url) + '">Join your ' + providerLabel(booking.provider || booking.meetingProvider) + ' meeting</a></p>'}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 25px 0; padding: 15px; background-color: ${COLORS.line}; border-radius: 8px;">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; color: ${COLORS.green}; font-size: 14px; font-weight: 600;">📅 Calendar Invitation</p>
          <p style="margin: 0; color: ${COLORS.text}; font-size: 13px; line-height: 1.5;">${booking.meetingPending ? 'Your calendar invitation will arrive with your meeting link.' : 'An .ics calendar file with your join link is attached. Open it to add the session to your calendar.'}</p>
        </td>
      </tr>
    </table>
    ${createSecurityNotice('booking')}
  `;
  
  return createEmailWrapper(
    createHeader() +
    createSection(sectionContent) +
    createFooter()
  );
}

function collaborationConfirmationHTML(collab) {
  const sectionContent = `
    <p style="margin: 0 0 20px 0; color: ${COLORS.text}; font-size: 15px; line-height: 1.5;">Hello ${escapeHtml(collab.name)},</p>
    <p style="margin: 0 0 20px 0; color: ${COLORS.text}; font-size: 15px; line-height: 1.5;">Thank you for your collaboration request.</p>
    ${createReference(collab.ref)}
    ${createDetailsTable([
      { label: 'Request Type', value: collab.kind },
      { label: 'Organization', value: collab.org || 'N/A' },
      { label: 'Your Email', value: collab.email }
    ])}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 25px 0; padding: 15px; background-color: ${COLORS.line}; border-radius: 8px;">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; color: ${COLORS.blue}; font-size: 14px; font-weight: 600;">📝 Response Time</p>
          <p style="margin: 0; color: ${COLORS.text}; font-size: 13px; line-height: 1.5;">I'll review your request and get back to you within 24 hours.</p>
        </td>
      </tr>
    </table>
    ${createSecurityNotice('collaboration')}
  `;
  
  return createEmailWrapper(
    createHeader() +
    createSection(sectionContent) +
    createFooter()
  );
}

function questionnaireConfirmationHTML(questionnaire) {
  const sectionContent = `
    <p style="margin: 0 0 20px 0; color: ${COLORS.text}; font-size: 15px; line-height: 1.5;">Hello ${escapeHtml(questionnaire.firstName)} ${escapeHtml(questionnaire.lastName)},</p>
    <p style="margin: 0 0 20px 0; color: ${COLORS.text}; font-size: 15px; line-height: 1.5;">Thank you for completing the questionnaire.</p>
    ${createReference(questionnaire.ref)}
    ${createDetailsTable([
      { label: 'Language', value: questionnaire.locale === 'ar' ? 'Arabic' : 'English' },
      { label: 'Company', value: questionnaire.company },
      { label: 'Role', value: questionnaire.role }
    ])}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 25px 0; padding: 15px; background-color: ${COLORS.line}; border-radius: 8px;">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; color: ${COLORS.green}; font-size: 14px; font-weight: 600;">✓ Submission Received</p>
          <p style="margin: 0; color: ${COLORS.text}; font-size: 13px; line-height: 1.5;">Your responses have been recorded. I'll review them and reach out if needed.</p>
        </td>
      </tr>
    </table>
    ${createSecurityNotice('questionnaire')}
  `;
  
  return createEmailWrapper(
    createHeader() +
    createSection(sectionContent) +
    createFooter()
  );
}

function bookingTextFallback(booking) {
  return `Your session has been booked successfully.

Reference: ${booking.ref}
Session Type: ${booking.sessionName}
Date: ${booking.date}
Time: ${booking.time} (${booking.timezone})
Duration: ${booking.duration} minutes

Platform: ${providerLabel(booking.provider || booking.meetingProvider)}
${booking.meetingPending ? 'Your booking is reserved. Your meeting link and calendar invitation will arrive by email once ready.' : 'Join: ' + booking.join_url + '\nA calendar file with your join link is attached.'}

---
This is an automated email from the Dr. Mohammed Al Amin booking system.
Please do not reply to this email.
For questions, visit https://malamin.cc or contact info@malamin.cc.

Your information is handled securely and in accordance with our privacy policy: https://malamin.cc/privacy

© 2026 Dr. Mohammed Al Amin. All Rights Reserved.`;
}

function collaborationTextFallback(collab) {
  return `Thank you for your collaboration request.

Reference: ${collab.ref}
Request Type: ${collab.kind}
Organization: ${collab.org || 'N/A'}
Your Email: ${collab.email}

I'll review your request and get back to you within 24 hours.

---
This is an automated email from the Dr. Mohammed Al Amin collaboration system.
Please do not reply to this email.
For urgent matters, contact info@malamin.cc directly.

Your information is handled securely and in accordance with our privacy policy: https://malamin.cc/privacy

© 2026 Dr. Mohammed Al Amin. All Rights Reserved.`;
}

function questionnaireTextFallback(questionnaire) {
  return `Thank you for completing the questionnaire.

Reference: ${questionnaire.ref}
Language: ${questionnaire.locale === 'ar' ? 'Arabic' : 'English'}
Company: ${questionnaire.company}
Role: ${questionnaire.role}

Your responses have been recorded. I'll review them and reach out if needed.

---
This is an automated email from the Dr. Mohammed Al Amin questionnaire system.
Please do not reply to this email.
For questions, contact info@malamin.cc directly.

Your information is handled securely and in accordance with our privacy policy: https://malamin.cc/privacy

© 2026 Dr. Mohammed Al Amin. All Rights Reserved.`;
}

module.exports = {
  bookingConfirmationHTML,
  collaborationConfirmationHTML,
  questionnaireConfirmationHTML,
  bookingTextFallback,
  collaborationTextFallback,
  questionnaireTextFallback
};
