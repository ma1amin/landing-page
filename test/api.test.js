'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const Module=require('node:module');
const bookings=[],emails=[];
const db={pool:{},getBookings:async()=>bookings,getBookingByRef:async ref=>bookings.find(b=>b.ref===ref),
 getSession:async()=>({user_id:1,username:'admin'}),updateBookingStatus:async(ref,status)=>{const b=bookings.find(b=>b.ref===ref);if(b)b.status=status;},
 createBooking:async b=>{const min=t=>Number(t.slice(0,2))*60+Number(t.slice(3,5));if(bookings.some(old=>old.date===b.date&&old.status!=='cancelled'&&min(old.time)<min(b.time)+b.duration&&min(old.time)+old.duration>min(b.time)))return false;bookings.push({...b,session_name:b.sessionName,meeting_provider:b.meetingProvider,meeting_status:'disabled',join_url:'https://meet.google.com/private-link',external_id:'private'});return true;}};
require.cache[require.resolve('../database')]={id:require.resolve('../database'),filename:require.resolve('../database'),loaded:true,exports:db};
Object.assign(process.env,{MEETINGS_ENABLED:'0',SMTP_HOST:'fake',SMTP_USER:'fake',SMTP_PASS:'fake',SMTP_FROM:'host@example.com'});
const load=Module._load;Module._load=function(name,...args){return name==='nodemailer'?{createTransport:()=>({sendMail:async email=>emails.push(email)})}:load.call(this,name,...args);};
let server;try{({server}=require('../server'));}finally{Module._load=load;}
test('HTTP booking eligibility, defaults, overlap, private admin details and cancellation',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const date=new Date(Date.now()+7*86400000);while(date.getUTCDay()!==0)date.setUTCDate(date.getUTCDate()+1);
 const body={name:'Client',email:'client@example.com',date:date.toISOString().slice(0,10),time:'10:00',type:'advisory',meetingProvider:'zoom',duration:20};
 const post=async value=>fetch(base+'/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
 const cookie={Cookie:'session_id='+'a'.repeat(64)};
 try{
  const invalid=await post(body);assert.equal(invalid.status,400);assert.equal((await invalid.json()).fields.meetingProvider,'invalid');
  const created=await post({...body,type:'technical'});assert.equal(created.status,201);const result=await created.json();assert.equal(result.booking.duration,40);assert.equal(result.booking.meetingProvider,'zoom');assert.ok(!JSON.stringify(result).includes('https://'));
  assert.equal((await post({...body,type:'discovery',time:'10:20'})).status,409);
  const defaulted=await post({...body,type:'discovery',time:'11:00',meetingProvider:undefined});assert.equal((await defaulted.json()).booking.meetingProvider,'google_meet');
  assert.equal((await fetch(base+'/api/admin/bookings/'+result.booking.ref)).status,401);
  for(const endpoint of ['/api/admin/bookings','/api/admin/bookings/'+result.booking.ref]){const response=await fetch(base+endpoint,{headers:cookie});assert.equal(response.status,200);assert.ok(!(await response.text()).includes('private'));}
  const retry=await fetch(base+'/api/admin/bookings/'+result.booking.ref+'/retry-meeting',{method:'POST',headers:cookie});assert.equal(retry.status,503);
  const cancel=await fetch(base+'/api/admin/bookings/'+result.booking.ref+'/cancel',{method:'POST',headers:cookie});assert.equal(cancel.status,200);assert.equal(bookings[0].status,'cancelled');
  const dashboard=await fetch(base+'/admin',{headers:cookie});const html=await dashboard.text();assert.match(dashboard.headers.get('content-security-policy'),/style-src 'self' 'nonce-/);assert.match(html,/<style nonce=/);assert.ok(!html.includes('onclick='));
  const pending=emails.find(e=>e.to==='client@example.com');assert.ok(pending);assert.ok(!pending.icalEvent);assert.ok(!pending.text.includes('meet.google.com'));
 }finally{await new Promise(resolve=>server.close(resolve));}
});
