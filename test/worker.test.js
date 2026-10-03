'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {createMeetingWorker}=require('../meeting-worker');
function fixture(overrides={}){
 let clock=new Date('2026-10-03T00:00:00Z');let locked=false;
 const state={id:'id',ref:'MA-TEST',provider:'google_meet',state:'pending',status:'confirmed',provider_attempts:0,email_attempts:0,cleanup_attempts:0,pending_email_sent:false,ready_email_sent:false,admin_alert_sent:false, ...overrides};
 const store={due:async()=>[state.ref],withLock:async(ref,fn)=>{if(locked)return null;locked=true;try{return await fn({...state},{refresh:async()=>({...state}),patch:async patch=>Object.assign(state,patch)});}finally{locked=false;}}};
 const sent=[],alerts=[],calls=[];
 const providers={ensure:async()=>{calls.push('ensure');return {join_url:'https://meet.google.com/abc-defg-hij',external_id:'event-id'};},remove:async()=>calls.push('remove')};
 const opts={store,providers,sendConfirmation:async(job,ready)=>{sent.push({ready,job:{...job}});return {sent:true};},notifyAdmin:async(...args)=>{alerts.push(args);return {sent:true};},now:()=>clock};
 return {state,store,providers,opts,sent,alerts,calls,advance:minutes=>{clock=new Date(Date.parse('2026-10-03T00:00:00Z')+minutes*60000);},worker:()=>createMeetingWorker(opts)};
}
test('immediate ready notification runs once, never exposes a host link',async()=>{
 const f=fixture();const w=f.worker();await w.run(f.state.ref);await w.run(f.state.ref);
 assert.equal(f.calls.length,1);assert.equal(f.sent.length,1);assert.equal(f.sent[0].ready,true);assert.equal(f.state.next_attempt_at,null);
});
test('pending confirmation then ready email after persisted retry and process restart',async()=>{
 const f=fixture();let count=0;const ensure=f.providers.ensure;f.providers.ensure=async(...args)=>{if(++count===1)throw Object.assign(new Error(),{code:'google_conference_pending'});return ensure(...args);};
 await f.worker().run(f.state.ref);assert.equal(f.state.state,'pending');assert.equal(f.sent[0].ready,false);assert.equal(f.state.provider_next_attempt_at.toISOString(),'2026-10-03T00:01:00.000Z');
 f.advance(.5);await f.worker().run(f.state.ref);assert.equal(count,1);
 f.advance(1);await f.worker().tick();assert.equal(f.state.state,'ready');assert.deepEqual(f.sent.map(s=>s.ready),[false,true]);
});
test('creation attempts at 0, 1, 5, 15, 60 minutes and exhausted admin alert',async()=>{
 const f=fixture();let count=0;f.providers.ensure=async()=>{count++;throw Object.assign(new Error(),{code:'provider_network_error'});};
 const w=f.worker();for(const minute of [0,1,5,15,60]){f.advance(minute);await w.run(f.state.ref);}
 assert.equal(count,5);assert.equal(f.state.state,'failed');assert.equal(f.alerts.length,1);assert.equal(f.state.status,'confirmed');assert.equal(f.state.next_attempt_at,null);
});
test('email failures retry ready link without creating another meeting',async()=>{
 const f=fixture();let n=0;f.opts.sendConfirmation=async()=>({sent:++n===3});const w=f.worker();
 for(const m of [0,1,2]){f.advance(m);await w.run(f.state.ref);}
 assert.equal(n,3);assert.equal(f.calls.filter(s=>s==='ensure').length,1);assert.equal(f.state.ready_email_sent,true);
});
test('failed pending email does not halt provider retries',async()=>{
 const f=fixture();f.opts.sendConfirmation=async()=>({sent:false});f.providers.ensure=async()=>{throw Object.assign(new Error(),{code:'provider_network_error'});};
 const w=f.worker();for(const m of [0,1,2,3,4]){f.advance(m);await w.run(f.state.ref);}
 assert.equal(f.state.email_attempts,5);assert.equal(f.state.state,'pending');assert.equal(f.state.next_attempt_at.toISOString(),'2026-10-03T00:05:00.000Z');
 f.advance(5);await w.run(f.state.ref);assert.equal(f.state.provider_attempts,3);
});
test('simultaneous workers cannot provision one booking twice',async()=>{
 const f=fixture();let finish;const gate=new Promise(r=>finish=r);f.providers.ensure=async()=>{f.calls.push('ensure');await gate;return {join_url:'https://meet.google.com/x',external_id:'x'};};
 const first=f.worker().run(f.state.ref);await new Promise(r=>setImmediate(r));assert.equal(await f.worker().run(f.state.ref),null);finish();await first;assert.equal(f.calls.length,1);
});
test('cancel during successful creation queues deletion and sends no client email',async()=>{
 const f=fixture();f.providers.ensure=async()=>{f.state.status='cancelled';f.state.state='cleanup_pending';return {join_url:'https://meet.google.com/x',external_id:'new-event'};};
 const w=f.worker();await w.run(f.state.ref);assert.equal(f.state.state,'cleanup_pending');assert.equal(f.state.external_id,'new-event');assert.equal(f.sent.length,0);
 await w.run(f.state.ref);assert.equal(f.state.state,'cancelled');assert.equal(f.state.join_url,null);assert.ok(f.calls.includes('remove'));
});
test('cancel during uncertain response immediately reconciles cleanup',async()=>{
 const f=fixture();f.providers.ensure=async()=>{f.state.status='cancelled';throw Object.assign(new Error(),{code:'provider_network_error'});};
 await f.worker().run(f.state.ref);assert.equal(f.state.state,'cleanup_pending');assert.equal(f.state.next_attempt_at.toISOString(),'2026-10-03T00:00:00.000Z');assert.equal(f.sent.length,0);
});
test('cleanup failures persist, back off, and alert without a join link',async()=>{
 const f=fixture({status:'cancelled',state:'cleanup_pending'});f.providers.remove=async()=>{throw Object.assign(new Error(),{code:'provider_http_401'});};
 for(let i=0;i<5;i++)await f.worker().run(f.state.ref);
 assert.equal(f.state.cleanup_attempts,5);assert.equal(f.alerts.length,1);assert.ok(!JSON.stringify(f.alerts).includes('https://'));assert.equal(f.sent.length,0);
});

test('cancelled uncertain create stays queued when remote meeting is not visible yet',async()=>{
 const f=fixture({status:'cancelled',state:'cleanup_pending',provider_attempts:1});let found=false;
 f.providers.remove=async()=>({found});const w=f.worker();await w.run(f.state.ref);
 assert.equal(f.state.state,'cleanup_pending');assert.equal(f.state.cleanup_checks,1);
 found=true;f.advance(1);await w.run(f.state.ref);assert.equal(f.state.state,'cancelled');assert.equal(f.state.next_attempt_at,null);
});

test('exhausted provider does not discard retries of the initial confirmation email',async()=>{
 const f=fixture({state:'failed',provider_attempts:5});let count=0;f.opts.sendConfirmation=async()=>({sent:++count===2});
 const w=f.worker();await w.run(f.state.ref);assert.equal(f.state.next_attempt_at.toISOString(),'2026-10-03T00:01:00.000Z');
 f.advance(1);await w.run(f.state.ref);assert.equal(f.state.pending_email_sent,true);assert.equal(f.state.next_attempt_at,null);assert.equal(f.alerts.length,1);
});
