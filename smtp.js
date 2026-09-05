'use strict';
/**
 * Minimal zero-dependency SMTP client (SMTPS + STARTTLS + AUTH LOGIN/PLAIN).
 * Avoids node_modules so the site keeps running across workspace snapshots.
 */
const net = require('node:net');
const tls = require('node:tls');

function b64(s) { return Buffer.from(s, 'utf8').toString('base64'); }

class SMTPClient {
  constructor() { this.socket = null; this.buf = ''; }

  connect(host, port, secure) {
    return new Promise((resolve, reject) => {
      const onConnect = () => {
        this.socket.setEncoding('utf8');
        this.socket.on('data', (d) => { this.buf += d; this._pump(); });
        this.socket.on('error', reject);
        resolve();
      };
      this.socket = secure
        ? tls.connect({ host, port, servername: host }, onConnect)
        : net.connect({ host, port }, onConnect);
      if (!secure) this.socket.once('connect', onConnect);
      this.socket.setTimeout(20000, () => reject(new Error('SMTP timeout')));
    });
  }

  _pump() {
    if (this._resolve && /\r?\n$/.test(this.buf)) {
      const chunk = this.buf; this.buf = '';
      const r = this._resolve; this._resolve = null;
      r(chunk);
    }
  }

  _read() {
    if (this._resolve) throw new Error('overlapping read');
    return new Promise((resolve) => {
      if (/\r?\n$/.test(this.buf)) {
        const chunk = this.buf; this.buf = '';
        return resolve(chunk);
      }
      this._resolve = resolve;
    });
  }

  async _readCode() {
    let out = '';
    for (;;) {
      const chunk = await this._read();
      out += chunk;
      // multiline reply finishes with "NNN text\r\n"
      const lines = out.split('\r\n').filter(Boolean);
      const last = lines[lines.length - 1] || '';
      if (/^\d{3} /.test(last)) {
        const code = parseInt(last.slice(0, 3), 10);
        if (code >= 400) throw new Error('SMTP error: ' + out.trim());
        return { code, text: out.trim() };
      }
    }
  }

  _write(line) { this.socket.write(line); }

  async send(cmd, masking) {
    this._write(cmd + '\r\n');
    if (masking) return this._readCode();
    return this._readCode();
  }

  async upgrade() {
    this._write('STARTTLS\r\n');
    const { code } = await this._readCode();
    if (code !== 220) throw new Error('STARTTLS refused');
    const plain = this.socket;
    plain.removeAllListeners('data');
    plain.removeAllListeners('error');
    this.buf = '';
    await new Promise((resolve, reject) => {
      this.socket = tls.connect({
        socket: plain,
        servername: this.host,
      }, () => {
        this.socket.setEncoding('utf8');
        this.socket.on('data', (d) => { this.buf += d; this._pump(); });
        resolve();
      });
      this.socket.once('error', reject);
    });
    return this._readCode();
  }

  quit() {
    try { this._write('QUIT\r\n'); this.socket.end(); } catch (_) {}
  }
}

function wrap(text, width = 78) {
  return text.split(/\r?\n/).map((line) => {
    if (line.length <= width) return line;
    const words = line.split(' ');
    const out = [];
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > width) { out.push(cur); cur = w; }
      else cur = (cur ? cur + ' ' : '') + w;
    }
    if (cur) out.push(cur);
    return out.join('\r\n');
  }).join('\r\n');
}

function qp(str) {
  // Quoted-printable safe encoding for UTF-8 subject/body
  const out = [];
  const bytes = Buffer.from(str, 'utf8');
  let line = '';
  for (const b of bytes) {
    let enc;
    if (b === 0x20) enc = '_';
    else if (b >= 33 && b <= 126 && b !== 0x3d && b !== 0x3f && b !== 0x5f) enc = String.fromCharCode(b);
    else enc = '=' + b.toString(16).toUpperCase().padStart(2, '0');
    if (line.length + enc.length > 74) { out.push(line + '='); line = ''; }
    line += enc;
  }
  out.push(line);
  return out.join('\r\n');
}

function b64lines(str, width = 76) {
  const s = Buffer.from(str, 'utf8').toString('base64');
  const out = [];
  for (let i = 0; i < s.length; i += width) out.push(s.slice(i, i + width));
  return out.join('\r\n');
}

async function sendMail({ host, port = 587, secure = false, user, pass, from, to, subject, text }) {
  const c = new SMTPClient();
  c.host = host;
  await c.connect(host, port, secure);
  await c._readCode(); // 220 greeting

  let greeting;
  const ehlo = 'EHLO ' + (require('node:os').hostname() || 'localhost');
  c._write(ehlo + '\r\n');
  greeting = await c._readCode();

  if (!secure && /STARTTLS/i.test(greeting.text)) {
    greeting = await c.upgrade();
    c._write(ehlo + '\r\n');
    greeting = await c._readCode();
  }

  if (user && pass) {
    if (/AUTH[^\n]*PLAIN/i.test(greeting.text)) {
      c._write('AUTH PLAIN ' + b64('\0' + user + '\0' + pass) + '\r\n');
      await c._readCode();
    } else if (/AUTH[^\n]*LOGIN/i.test(greeting.text)) {
      c._write('AUTH LOGIN\r\n');
      await c._readCode();
      c._write(b64(user) + '\r\n');
      await c._readCode();
      c._write(b64(pass) + '\r\n');
      await c._readCode();
    }
  }

  c._write('MAIL FROM:<' + from + '>\r\n');
  await c._readCode();
  for (const rcpt of [].concat(to)) {
    c._write('RCPT TO:<' + rcpt + '>\r\n');
    await c._readCode();
  }
  c._write('DATA\r\n');
  await c._readCode();

  const headers = [
    'From: ' + from,
    'To: ' + [].concat(to).join(', '),
    'Subject: =?UTF-8?Q?' + qp(subject).replace(/\r?\n/g, '') + '?=',
    'Date: ' + new Date().toUTCString(),
    'Message-ID: <' + Date.now() + '.' + Math.random().toString(36).slice(2) + '@brand-site>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
  ].join('\r\n');

  c._write(headers + '\r\n' + b64lines(wrap(text)) + '\r\n.\r\n');
  await c._readCode();
  c.quit();
  return true;
}

module.exports = { sendMail };
