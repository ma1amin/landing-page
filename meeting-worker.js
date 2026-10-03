'use strict';
const RETRY_MINUTES = [0, 1, 5, 15, 60];
function createMeetingWorker({ store, providers, sendConfirmation, notifyAdmin, now = () => new Date() }) {
  let scanning = false;
  const next = minutes => new Date(now().getTime() + minutes * 60000);
  async function run(ref) {
    return store.withLock(ref, async (job, { refresh, patch }) => {
      if (!job || job.state === 'disabled' || job.state === 'cancelled') return job;
      if (job.status === 'cancelled' || job.state === 'cleanup_pending') {
        await patch({ state: 'cleanup_pending', next_attempt_at: next(1) });
        try {
          const result = await providers.remove(job, job);
          if (!job.external_id && job.provider_attempts > 0 && result?.found === false && (job.cleanup_checks || 0) < 4) {
            // An aborted create may still be completing on the provider. Do
            // not consider its absence on the first search proof of deletion.
            const checks = (job.cleanup_checks || 0) + 1;
            await patch({ cleanup_checks: checks, next_attempt_at: next(RETRY_MINUTES[checks]), last_error: null });
            return refresh();
          }
          await patch({ state: 'cancelled', join_url: null, next_attempt_at: null, last_error: null });
        } catch (error) {
          const attempts = job.cleanup_attempts + 1;
          await patch({ cleanup_attempts: attempts, last_error: error.code || 'cleanup_failed', next_attempt_at: next(Math.min(60, attempts * 5)) });
          if (attempts >= 5 && !job.admin_alert_sent) {
            const result = await notifyAdmin('[Meeting cleanup requires attention] ' + job.ref, 'Cancellation is saved, but external meeting deletion needs attention. Open the admin portal.');
            if (result.sent) await patch({ admin_alert_sent: true });
          }
        }
        return refresh();
      }
      if (job.state === 'pending' && (!job.provider_next_attempt_at || new Date(job.provider_next_attempt_at) <= now())) {
        const count = job.provider_attempts + 1;
        const first = job.first_attempt_at ? new Date(job.first_attempt_at) : now();
        // Persist a recovery deadline before network work. MySQL releases the
        // advisory lock on a process crash; the next process resumes this job.
        await patch({ provider_attempts: count, first_attempt_at: first, next_attempt_at: next(1), provider_next_attempt_at: next(1) });
        try {
          const meeting = await providers.ensure(job, job);
          const current = await refresh();
          await patch({ ...meeting, state: current.status === 'cancelled' ? 'cleanup_pending' : 'ready',
            next_attempt_at: now(), provider_next_attempt_at: null, email_attempts: 0, admin_alert_sent: false, last_error: null });
        } catch (error) {
          const current = await refresh();
          if (current.status === 'cancelled') {
            await patch({ state: 'cleanup_pending', next_attempt_at: now(), provider_next_attempt_at: null });
            return refresh();
          }
          const failed = count >= RETRY_MINUTES.length;
          const deadline = failed ? null : new Date(Math.max(now().getTime(), first.getTime() + RETRY_MINUTES[count] * 60000));
          await patch({ state: failed ? 'failed' : 'pending', last_error: error.code || 'meeting_creation_failed',
            provider_next_attempt_at: deadline, next_attempt_at: deadline || now() });
        }
        job = await refresh();
      }
      // Cancellation may have arrived while a provider request was running.
      if (job.status === 'cancelled' || job.state === 'cleanup_pending') return job;
      const ready = job.state === 'ready';
      const sentField = ready ? 'ready_email_sent' : 'pending_email_sent';
      if (!job[sentField] && job.email_attempts < 5) {
        await patch({ email_attempts: job.email_attempts + 1, next_attempt_at: next(1) });
        const result = await sendConfirmation(job, ready);
        if (result.sent) await patch({ [sentField]: true, email_attempts: ready ? job.email_attempts + 1 : 0 });
        else await patch({ last_error: 'confirmation_email_failed' });
        job = await refresh();
      }
      if (job.state === 'failed' || job.email_attempts >= 5 && !job[sentField]) {
        const remainingMail = !job[sentField] && job.email_attempts < 5;
        const followUp = job.state === 'pending' ? job.provider_next_attempt_at : remainingMail ? next(1) : null;
        if (!job.admin_alert_sent) {
          const result = await notifyAdmin('[Meeting requires attention] ' + job.ref,
            'The booking is reserved. Meeting creation or confirmation email delivery failed. Use Retry meeting/email in the admin portal.');
          if (result.sent) await patch({ admin_alert_sent: true, next_attempt_at: followUp });
          else await patch({ next_attempt_at: followUp || next(60) });
        } else await patch({ next_attempt_at: followUp });
      } else if (job.state === 'ready' && job.ready_email_sent) {
        await patch({ next_attempt_at: null });
      } else if (job.state === 'pending' && job.pending_email_sent && job.email_attempts < 5) {
        await patch({ next_attempt_at: job.provider_next_attempt_at });
      }
      return refresh();
    });
  }
  async function tick() {
    if (scanning) return;
    scanning = true;
    try { for (const ref of await store.due()) { try { await run(ref); } catch (error) { console.error('[meetings] Retry deferred:', error.code || 'database_or_mail_error'); } } }
    finally { scanning = false; }
  }
  function start() {
    tick().catch(() => console.error('[meetings] Worker startup deferred'));
    const timer = setInterval(() => tick().catch(() => console.error('[meetings] Worker scan deferred')), 30000);
    timer.unref(); return () => clearInterval(timer);
  }
  return { run, tick, start, retry: store.retry };
}
module.exports = { createMeetingWorker, RETRY_MINUTES };
