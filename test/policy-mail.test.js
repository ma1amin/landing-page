'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {SESSION_TYPES,allowedProviders,publicBooking,adminBooking}=require('../meeting-policy');
const {generateICS}=require('../calendar-invite');
const mail=require('../email-templates');
const {configuration,assertConfiguration,safeJoinUrl,startTime}=require('../meeting-providers');
const booking={id:'aaaaaaaa-1234-5678-90ab-bbbbbbbbbbbb',ref:'MA-TEST',date:'2026-10-05',time:'10:00',duration:40,price:20,type:'technical',sessionName:'Technical Deep Dive',session_name:'Technical Deep Dive',name:'Client',email:'client@example.com',provider:'google_meet',timezone:'Asia/Riyadh (GMT+3)',join_url:'https://meet.google.com/abc-defg-hij'};
test('eligibility and unchanged prices for all sessions',()=>{
 assert.deepEqual(Object.values(SESSION_TYPES).map(s=>[s.duration,s.price]),[[20,0],[40,20],[60,50]]);
 for(const duration of [20,40,45])assert.deepEqual(allowedProviders(duration),['google_meet','zoom']);
 assert.deepEqual(allowedProviders(60),['google_meet']);
});
test('public and admin serializers exclude private meeting data',()=>{
 const secret={...booking,external_id:'private',last_error:'private',state:'ready'};
 for(const value of [publicBooking(secret,secret),adminBooking(secret)]){
  const json=JSON.stringify(value);assert.ok(!json.includes(booking.join_url));assert.ok(!json.includes('private'));
 }
 assert.equal(publicBooking(booking, {provider:'google_meet',state:'pending'}).meetingStatus,'pending');
});
test('configuration stays disabled until explicitly enabled and complete',()=>{
 assertConfiguration(configuration({})); assert.throws(()=>assertConfiguration(configuration({MEETINGS_ENABLED:'1'})));
 assert.equal(configuration({}).google.calendar,'primary');
});
test('provider links reject non-provider URLs and embedded credentials',()=>{
 for(const url of ['http://meet.google.com/x','https://meet.google.com.evil.test/x','https://a:b@meet.google.com/x','javascript:alert(1)'])assert.throws(()=>safeJoinUrl(url,'google_meet'));
 assert.equal(safeJoinUrl('https://us02web.zoom.us/j/123?pwd=abc','zoom'),'https://us02web.zoom.us/j/123?pwd=abc');
});
test('ready HTML/plain-text emails and ICS include link with Riyadh timing',()=>{
 const html=mail.bookingConfirmationHTML(booking), text=mail.bookingTextFallback(booking),ics=generateICS(booking).replace(/\r\n /g,'');
 assert.ok(html.includes(booking.join_url));assert.ok(text.includes(booking.join_url));assert.ok(ics.includes('URL:'+booking.join_url));
 assert.ok(ics.includes('DTSTART:20261005T070000Z'));assert.ok(ics.includes('DTEND:20261005T074000Z'));assert.ok(ics.includes('UID:MA-TEST@malamin.cc'));
 assert.equal(startTime(booking),'2026-10-05T07:00:00.000Z');
 for(const line of generateICS({...booking,sessionName:'جلسة تقنية معمقة '.repeat(15)}).split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
});
test('pending confirmation has no join URL and preserves historical duration',()=>{
 const pending={...booking,meetingPending:true,join_url:null};
 for(const content of [mail.bookingConfirmationHTML(pending),mail.bookingTextFallback(pending)]){assert.ok(!content.includes(booking.join_url));assert.match(content,/pending|soon|email/i);}
 assert.ok(generateICS({...booking,duration:45}).includes('DTEND:20261005T074500Z'));
});
module.exports={booking};
