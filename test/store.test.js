'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const Module=require('node:module');
const {createMeetingStore}=require('../meeting-store');
test('admin retry restarts exhausted sequence but rejects cancelled bookings',async()=>{
 const state={ref:'MA-TEST',state:'failed',status:'confirmed',provider_attempts:5,email_attempts:5,first_attempt_at:new Date(),admin_alert_sent:true,join_url:null};
 let acquired=true;const connection={release(){},execute:async(sql,params)=>{
  if(sql.includes('GET_LOCK'))return [[{acquired:acquired?1:0}]];
  if(sql.startsWith('SELECT b.*'))return [[{...state}]];
  if(sql.startsWith('UPDATE booking_meetings')){const fields=sql.split(' SET ')[1].split(' WHERE ')[0].split(',').map(field=>field.split('=')[0]);fields.forEach((field,i)=>state[field]=params[i]);}
  return [[]];}};
 const store=createMeetingStore({getConnection:async()=>connection});
 assert.equal(await store.retry(state.ref),true);assert.equal(state.state,'pending');assert.equal(state.provider_attempts,0);assert.equal(state.email_attempts,0);assert.equal(state.admin_alert_sent,false);assert.equal(state.first_attempt_at,null);
 state.status='cancelled';assert.equal(await store.retry(state.ref),false);state.status='confirmed';acquired=false;assert.equal(await store.retry(state.ref),null);
});
test('reservation transaction rolls back entire booking on meeting row failure or conflict',async()=>{
 const calls=[];let conflict=false,fail=false;const connection={beginTransaction:async()=>calls.push('begin'),commit:async()=>calls.push('commit'),rollback:async()=>calls.push('rollback'),release:()=>calls.push('release'),execute:async(sql,values)=>{
  calls.push(sql);if(sql.startsWith('SELECT id FROM bookings'))return [conflict?[{id:'old'}]:[]];
  if(sql.startsWith('INSERT INTO bookings'))assert.equal((sql.match(/\?/g)||[]).length,values.length);
  if(sql.startsWith('INSERT INTO booking_meetings')&&fail)throw new Error('meeting row failed');return [[]];}};
 const load=Module._load;Module._load=function(name,...args){return name==='mysql2/promise'?{createPool:()=>({getConnection:async()=>connection})}:load.call(this,name,...args);};
 let db;try{db=require('../database');}finally{Module._load=load;}
 const b={id:'id',ref:'MA-TEST',date:'2026-10-05',time:'10:00',duration:40,meetingProvider:'google_meet'};
 assert.equal(await db.createBooking(b,true),true);assert.ok(calls.includes('commit'));assert.ok(calls.findIndex(s=>s.includes('FOR UPDATE'))<calls.findIndex(s=>s.startsWith('SELECT id FROM bookings')));
 calls.length=0;conflict=true;assert.equal(await db.createBooking(b,true),false);assert.ok(!calls.includes('commit'));assert.equal(calls.at(-2),'rollback');
 calls.length=0;conflict=false;fail=true;await assert.rejects(db.createBooking(b,true),/meeting row failed/);assert.ok(!calls.includes('commit'));assert.equal(calls.at(-2),'rollback');
});
