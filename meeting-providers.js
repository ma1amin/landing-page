'use strict';
const crypto = require('node:crypto');
class ProviderError extends Error {
  constructor(code, status = 0) { super(code); this.code = code; this.status = status; }
}
function configuration(env = process.env) {
  return { enabled: env.MEETINGS_ENABLED === '1',
    zoom: { account: env.ZOOM_ACCOUNT_ID, client: env.ZOOM_CLIENT_ID, secret: env.ZOOM_CLIENT_SECRET, host: env.ZOOM_HOST_USER_ID },
    google: { client: env.GOOGLE_CLIENT_ID, secret: env.GOOGLE_CLIENT_SECRET, refresh: env.GOOGLE_REFRESH_TOKEN, calendar: env.GOOGLE_CALENDAR_ID || 'primary' } };
}
function assertConfiguration(config) {
  if (!config.enabled) return;
  if (!Object.values(config.zoom).every(Boolean) || !Object.values(config.google).every(Boolean)) {
    throw new Error('MEETINGS_ENABLED requires all Zoom and Google credentials. See MEETINGS-SETUP.md.');
  }
}
function startTime(booking) {
  return new Date(`${String(booking.date).slice(0, 10)}T${String(booking.time).slice(0, 5)}:00+03:00`).toISOString();
}
function safeJoinUrl(value, provider) {
  try {
    const url = new URL(value);
    const valid = provider === 'zoom' ? /(^|\.)zoom\.(us|com)$/.test(url.hostname) : url.hostname === 'meet.google.com';
    if (url.protocol === 'https:' && valid && !url.username && !url.password) return url.href;
  } catch (_) {}
  throw new ProviderError('invalid_join_url');
}
function createProviders(config = configuration(), fetchImpl = global.fetch) {
  const tokens = {};
  async function request(url, options = {}) {
    let response;
    try { response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(10000) }); }
    catch (_) { throw new ProviderError('provider_network_error'); }
    if (!response.ok) throw new ProviderError('provider_http_' + response.status, response.status);
    if (response.status === 204) return {};
    try { return await response.json(); } catch (_) { throw new ProviderError('provider_invalid_response'); }
  }
  async function token(provider) {
    if (tokens[provider] && tokens[provider].expiry > Date.now()) return tokens[provider].value;
    const c = config[provider];
    const params = provider === 'zoom'
      ? { grant_type: 'account_credentials', account_id: c.account }
      : { grant_type: 'refresh_token', client_id: c.client, client_secret: c.secret, refresh_token: c.refresh };
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (provider === 'zoom') headers.Authorization = 'Basic ' + Buffer.from(c.client + ':' + c.secret).toString('base64');
    const data = await request(provider === 'zoom' ? 'https://zoom.us/oauth/token' : 'https://oauth2.googleapis.com/token', {
      method: 'POST', headers, body: new URLSearchParams(params).toString() });
    if (!data.access_token) throw new ProviderError('provider_missing_token');
    tokens[provider] = { value: data.access_token, expiry: Date.now() + Math.max(0, (Number(data.expires_in) - 60) * 1000) };
    return data.access_token;
  }
  async function api(provider, resource, method = 'GET', body) {
    const access = await token(provider);
    const base = provider === 'zoom' ? 'https://api.zoom.us/v2' : 'https://www.googleapis.com/calendar/v3';
    try {
      return await request(base + resource, { method, headers: { Authorization: 'Bearer ' + access, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}) });
    } catch (error) { if (error.status === 401) delete tokens[provider]; throw error; }
  }
  const topic = booking => `Booking ${booking.id} / ${booking.session_name || booking.sessionName}`;
  async function findZoom(booking) {
    let next = '';
    for (let page = 0; page < 20; page++) {
      const query = new URLSearchParams({ type: 'scheduled', page_size: '100' });
      if (next) query.set('next_page_token', next);
      const data = await api('zoom', '/users/' + encodeURIComponent(config.zoom.host) + '/meetings?' + query);
      const found = (data.meetings || []).find(meeting => meeting.topic === topic(booking));
      if (found) return api('zoom', '/meetings/' + encodeURIComponent(String(found.id)));
      next = data.next_page_token;
      if (!next) return null;
    }
    // A partial search cannot establish that a previous create did not succeed.
    throw new ProviderError('zoom_reconciliation_incomplete');
  }
  const eventId = booking => crypto.createHash('sha256').update(booking.id).digest('hex');
  const calendarPath = () => '/calendars/' + encodeURIComponent(config.google.calendar) + '/events';
  async function getGoogle(booking) {
    try { return await api('google', calendarPath() + '/' + eventId(booking)); }
    catch (error) { if (error.status === 404 || error.status === 410) return null; throw error; }
  }
  async function ensure(booking, job) {
    if (job.provider === 'zoom') {
      let meeting = job.external_id ? await api('zoom', '/meetings/' + encodeURIComponent(job.external_id)) : await findZoom(booking);
      if (!meeting) {
        meeting = await api('zoom', '/users/' + encodeURIComponent(config.zoom.host) + '/meetings', 'POST', {
          topic: topic(booking), type: 2, start_time: startTime(booking), timezone: 'Asia/Riyadh', duration: booking.duration,
          password: crypto.randomBytes(6).toString('hex').slice(0, 10),
          settings: { waiting_room: true, join_before_host: false, use_pmi: false, auto_recording: 'none' } });
      }
      if (!meeting.id) throw new ProviderError('zoom_missing_meeting_id');
      return { external_id: String(meeting.id), join_url: safeJoinUrl(meeting.join_url, 'zoom') };
    }
    let event = await getGoogle(booking);
    if (!event) {
      const start = startTime(booking);
      try {
        event = await api('google', calendarPath() + '?conferenceDataVersion=1&sendUpdates=none', 'POST', {
          id: eventId(booking), summary: booking.session_name || booking.sessionName,
          description: 'Booking reference: ' + booking.ref,
          start: { dateTime: start, timeZone: 'Asia/Riyadh' },
          end: { dateTime: new Date(new Date(start).getTime() + booking.duration * 60000).toISOString(), timeZone: 'Asia/Riyadh' },
          conferenceData: { createRequest: { requestId: eventId(booking), conferenceSolutionKey: { type: 'hangoutsMeet' } } } });
      } catch (error) { if (error.status !== 409) throw error; event = await getGoogle(booking); }
    }
    if (event?.status === 'cancelled') throw new ProviderError('google_event_cancelled');
    if (event && (!event.conferenceData || event.conferenceData.createRequest?.status?.statusCode === 'failure')) {
      // A failed conference request can be replaced on the same event. Never
      // insert another calendar event to repair conference generation.
      event = await api('google', calendarPath() + '/' + eventId(booking) + '?conferenceDataVersion=1&sendUpdates=none', 'PATCH', {
        conferenceData: { createRequest: { requestId: eventId(booking) + '-' + (job.provider_attempts || 0),
          conferenceSolutionKey: { type: 'hangoutsMeet' } } } });
    }
    const conferenceStatus = event?.conferenceData?.createRequest?.status?.statusCode;
    if (conferenceStatus === 'pending') throw new ProviderError('google_conference_pending');
    if (conferenceStatus === 'failure') throw new ProviderError('google_conference_failed');
    const url = event?.hangoutLink || event?.conferenceData?.entryPoints?.find(p => p.entryPointType === 'video')?.uri;
    if (!url) throw new ProviderError(event?.conferenceData?.createRequest?.status?.statusCode === 'failure' ? 'google_conference_failed' : 'google_conference_pending');
    return { external_id: event.id, join_url: safeJoinUrl(url, 'google_meet') };
  }
  async function remove(booking, job) {
    if (job.provider === 'zoom') {
      let id = job.external_id;
      if (!id) id = (await findZoom(booking))?.id;
      if (!id) return { found: false };
      try { await api('zoom', '/meetings/' + encodeURIComponent(String(id)), 'DELETE'); }
      catch (error) { if (![404, 410].includes(error.status)) throw error; }
      return { found: true };
    } else {
      try { await api('google', calendarPath() + '/' + (job.external_id || eventId(booking)) + '?sendUpdates=none', 'DELETE'); }
      catch (error) { if (![404, 410].includes(error.status)) throw error; return { found: false }; }
      return { found: true };
    }
  }
  return { ensure, remove };
}
module.exports = { configuration, assertConfiguration, createProviders, startTime, safeJoinUrl, ProviderError };
