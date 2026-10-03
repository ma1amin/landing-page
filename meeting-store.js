'use strict';
function createMeetingStore(pool) {
  async function get(ref, connection = pool) {
    const [rows] = await connection.execute(`SELECT b.*, m.* FROM bookings b JOIN booking_meetings m ON m.booking_id=b.id WHERE b.ref=?`, [ref]);
    return rows[0];
  }
  async function due() {
    const [rows] = await pool.query(`SELECT b.ref FROM booking_meetings m JOIN bookings b ON b.id=m.booking_id
      WHERE m.next_attempt_at <= UTC_TIMESTAMP() AND m.state NOT IN ('disabled','cancelled') ORDER BY m.next_attempt_at LIMIT 25`);
    return rows.map(row => row.ref);
  }
  async function withLock(ref, operation) {
    const connection = await pool.getConnection();
    const lock = 'meeting:' + ref;
    let acquired = false;
    try {
      const [rows] = await connection.execute('SELECT GET_LOCK(?, 0) AS acquired', [lock]);
      acquired = Number(rows[0].acquired) === 1;
      if (!acquired) return null;
      const refresh = () => get(ref, connection);
      const patch = async changes => {
        const allowed = ['state','join_url','external_id','provider_attempts','email_attempts','next_attempt_at','provider_next_attempt_at','first_attempt_at',
          'last_error','pending_email_sent','ready_email_sent','admin_alert_sent','cleanup_attempts','cleanup_checks'];
        const keys = Object.keys(changes);
        if (!keys.length || keys.some(key => !allowed.includes(key))) throw new Error('Invalid meeting state update');
        await connection.execute(`UPDATE booking_meetings SET ${keys.map(key => key + '=?').join(',')} WHERE booking_id=(SELECT id FROM bookings WHERE ref=?)`, [...keys.map(key => changes[key]), ref]);
      };
      return await operation(await refresh(), { refresh, patch });
    } finally {
      try { if (acquired) await connection.execute('SELECT RELEASE_LOCK(?)', [lock]); }
      finally { connection.release(); }
    }
  }
  async function retry(ref) {
    return withLock(ref, async (job, { patch }) => {
      if (!job || job.status === 'cancelled' || ['disabled','cancelled','cleanup_pending'].includes(job.state)) return false;
      await patch({ state: job.join_url ? 'ready' : 'pending', provider_attempts: 0, email_attempts: 0,
        first_attempt_at: null, provider_next_attempt_at: null, last_error: null, admin_alert_sent: false, next_attempt_at: new Date() });
      return true;
    });
  }
  return { get, due, withLock, retry };
}
module.exports = { createMeetingStore };
