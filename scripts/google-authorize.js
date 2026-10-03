#!/usr/bin/env node
'use strict';
// Run locally with a Google OAuth Desktop app. Never run on the public host.
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
require('../env').loadEnv();
const client = process.env.GOOGLE_CLIENT_ID, secret = process.env.GOOGLE_CLIENT_SECRET;
if (!client || !secret) { console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your local .env first.'); process.exit(1); }
const state = crypto.randomBytes(32).toString('hex');
const redirect = 'http://127.0.0.1:8765/callback';
let exchanging = false;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirect);
  if (url.pathname !== '/callback') return res.writeHead(404).end();
  if (url.searchParams.get('state') !== state || !url.searchParams.get('code')) {
    return res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Authorization was not completed. Retry from the local terminal.');
  }
  if (exchanging) return res.writeHead(409).end('Authorization is already in progress.');
  exchanging = true;
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST',
      signal: AbortSignal.timeout(10000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code: url.searchParams.get('code'),
        client_id: client, client_secret: secret, redirect_uri: redirect }).toString() });
    if (!response.ok) throw new Error('exchange_failed');
    const result = await response.json();
    if (!result.refresh_token) throw new Error('refresh_token_missing');
    const file = path.join(__dirname, '..', '.env');
    const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const filtered = existing.split(/\r?\n/).filter(line => !/^\s*GOOGLE_REFRESH_TOKEN\s*=/.test(line)).join('\n').trimEnd();
    fs.writeFileSync(file, filtered + '\nGOOGLE_REFRESH_TOKEN=' + result.refresh_token + '\n', { mode: 0o600 });
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }).end('Google Calendar connected. You can close this tab.');
    console.log('Refresh token saved to local ignored .env. Deploy it securely; it is not printed.');
  } catch (_) {
    res.writeHead(500, { 'Content-Type': 'text/plain' }).end('Authorization failed. Check the OAuth Desktop app configuration and try again.');
    console.error('Authorization failed; no credentials were printed.');
    process.exitCode = 1;
  } finally { clearTimeout(timeout); server.close(); }
});
const timeout = setTimeout(() => { console.error('Authorization timed out.'); server.close(); process.exitCode = 1; }, 5 * 60000);
server.listen(8765, '127.0.0.1', () => {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: client, redirect_uri: redirect, response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events', access_type: 'offline', prompt: 'consent', state }).toString();
  console.log('Open this URL in your browser and sign in to the Gmail account that will host sessions:\n' + url.href);
});
server.on('error', () => { clearTimeout(timeout); console.error('Cannot listen on 127.0.0.1:8765. Close the other authorization process and retry.'); process.exitCode = 1; });
