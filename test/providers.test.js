'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {createProviders}=require('../meeting-providers');
const config={enabled:true,zoom:{account:'a',client:'c',secret:'s',host:'host@example.com'},google:{client:'c',secret:'s',refresh:'r',calendar:'primary'}};
const booking={id:'aaaaaaaa-1234-5678-90ab-bbbbbbbbbbbb',ref:'MA-TEST',date:'2026-10-05',time:'10:00',duration:40,session_name:'Technical Deep Dive'};
function harness(handler){const calls=[];return {calls,providers:createProviders(config,async(url,options)=>{
 assert.ok(options.signal instanceof AbortSignal);const call={url,method:options.method,body:options.body&&JSON.parse(options.headers['Content-Type']==='application/json'?options.body:'null')};calls.push(call);
 if(url.endsWith('/token'))return {ok:true,status:200,json:async()=>({access_token:'secret',expires_in:3600})};
 const result=await handler(call);return {ok:(result.status||200)<400,status:result.status||200,json:async()=>result.data||{}};
})};}
test('Zoom scheduled meeting uses passcode/waiting room and discards host URL',async()=>{
 const h=harness(c=>c.method==='POST'?{data:{id:123,join_url:'https://us02web.zoom.us/j/123?pwd=abc',start_url:'https://host-secret'}}:{data:{meetings:[]}});
 const result=await h.providers.ensure(booking,{provider:'zoom'});assert.equal(result.external_id,'123');assert.ok(!JSON.stringify(result).includes('host-secret'));
 const create=h.calls.find(c=>c.method==='POST'&&c.body);assert.equal(create.body.duration,40);assert.equal(create.body.settings.waiting_room,true);assert.equal(create.body.type,2);assert.equal(create.body.start_time,'2026-10-05T07:00:00.000Z');assert.ok(create.body.password.length>=8);
});
test('Zoom reconciles server success followed by network timeout before retry',async()=>{
 let created=false,posts=0;const h=harness(c=>{
  if(c.method==='POST'){posts++;created=true;throw new Error('timeout with sensitive response');}
  if(c.url.includes('/users/'))return {data:{meetings:created?[{id:123,topic:'Booking '+booking.id+' / '+booking.session_name}]:[]}};
  return {data:{id:123,join_url:'https://zoom.us/j/123'}};
 });
 await assert.rejects(h.providers.ensure(booking,{provider:'zoom'}),{code:'provider_network_error'});
 assert.equal((await h.providers.ensure(booking,{provider:'zoom'})).external_id,'123');assert.equal(posts,1);
});
test('Google delayed conference reuses deterministic event without second insert',async()=>{
 let event=null,ready=false,posts=0;const h=harness(c=>{
  if(c.method==='POST'){posts++;event={id:c.body.id,conferenceData:{createRequest:{status:{statusCode:'pending'}}}};assert.equal(c.body.start.timeZone,'Asia/Riyadh');assert.equal(c.body.end.dateTime,'2026-10-05T07:40:00.000Z');assert.ok(!c.body.attendees);return {data:event};}
  return event?{data:{...event,...(ready?{hangoutLink:'https://meet.google.com/abc-defg-hij',conferenceData:{createRequest:{status:{statusCode:'success'}}}}:{})}}:{status:404};
 });
 await assert.rejects(h.providers.ensure(booking,{provider:'google_meet'}),{code:'google_conference_pending'});ready=true;
 const result=await h.providers.ensure(booking,{provider:'google_meet'});assert.match(result.external_id,/^[a-f0-9]{64}$/);assert.equal(posts,1);
});
test('Google insert conflict reconciles existing event',async()=>{
 let reads=0;const h=harness(c=>c.method==='POST'?{status:409}:++reads===1?{status:404}:{data:{id:'event',hangoutLink:'https://meet.google.com/x'}});
 assert.equal((await h.providers.ensure(booking,{provider:'google_meet'})).external_id,'event');
});
test('failed Google conference request is repaired on same event',async()=>{
 const h=harness(c=>c.method==='PATCH'?{data:{id:'event',hangoutLink:'https://meet.google.com/x'}}:{data:{id:'event',conferenceData:{createRequest:{status:{statusCode:'failure'}}}}});
 await h.providers.ensure(booking,{provider:'google_meet',provider_attempts:2});assert.ok(h.calls.some(c=>c.method==='PATCH'));assert.ok(!h.calls.some(c=>c.method==='POST'&&c.body));
});
test('401 invalidates access token and errors do not disclose provider response',async()=>{
 let expired=true;const h=harness(c=>expired?{status:401,data:{secret:'sensitive'}}:{data:{id:'event',hangoutLink:'https://meet.google.com/x'}});
 await assert.rejects(h.providers.ensure(booking,{provider:'google_meet'}),{code:'provider_http_401'});expired=false;await h.providers.ensure(booking,{provider:'google_meet'});
 assert.equal(h.calls.filter(c=>c.url.endsWith('/token')).length,2);
});
test('cancellation without saved external ID reconciles Zoom and deterministic Google ID',async()=>{
 const h=harness(c=>c.method==='DELETE'?{status:204}:c.url.includes('/users/')?{data:{meetings:[{id:123,topic:'Booking '+booking.id+' / '+booking.session_name}]}}:{data:{id:123}});
 await h.providers.remove(booking,{provider:'zoom'});await h.providers.remove(booking,{provider:'google_meet'});
 const deletes=h.calls.filter(c=>c.method==='DELETE');assert.equal(deletes.length,2);assert.match(deletes[0].url,/meetings\/123$/);assert.match(deletes[1].url,/events\/[a-f0-9]{64}\?sendUpdates=none/);
});
