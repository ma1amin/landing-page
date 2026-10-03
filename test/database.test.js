'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const crypto=require('node:crypto');
test('real MySQL concurrency, historical booking and durable retry (disposable database)',{skip:!process.env.MEETING_TEST_DATABASE_URL},async()=>{
 const mysql=require('mysql2/promise');const url=new URL(process.env.MEETING_TEST_DATABASE_URL);
 const options={host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),multipleStatements:true,timezone:'Z',dateStrings:['DATE']};
 const name='meeting_test_'+crypto.randomBytes(8).toString('hex');const connection=await mysql.createConnection(options);let db;
 try{
  await connection.query('CREATE DATABASE `'+name+'`');await connection.query('USE `'+name+'`');await connection.query(fs.readFileSync(require.resolve('../schema.sql'),'utf8'));
  Object.assign(process.env,{DB_HOST:options.host,DB_USER:options.user,DB_PASS:options.password,DB_NAME:name});
  // Substitute the test pool before loading the production database module.
  const original=mysql.createPool;mysql.createPool=()=>original({...options,database:name,connectionLimit:10});
  try{db=require('../database');}finally{mysql.createPool=original;}
  const base={date:'2026-10-05',time:'10:00',duration:40,price:20,type:'technical',sessionName:'Technical',name:'Client',email:'test@example.com',org:'',notes:'',questionnaireRef:'',status:'confirmed',timezone:'Asia/Riyadh',meetingProvider:'google_meet'};
  const make=overrides=>({...base,id:crypto.randomUUID(),ref:'MA-'+crypto.randomBytes(3).toString('hex'),...overrides});
  const attempts=await Promise.all(Array.from({length:8},()=>db.createBooking(make(),true)));assert.equal(attempts.filter(Boolean).length,1);
  assert.equal(await db.createBooking(make({time:'10:20'}),true),false);assert.equal(await db.createBooking(make({time:'10:40'}),true),true);
  const legacy=make({time:'11:30',duration:45});await db.createBooking(legacy,false);await connection.query('DELETE FROM booking_meetings WHERE booking_id=?',[legacy.id]);
  assert.equal((await db.getBookingByRef(legacy.ref)).duration,45);
  const {createMeetingStore}=require('../meeting-store');const store=createMeetingStore(db.pool);const ref=(await db.getBookings())[0].ref;
  assert.ok((await store.get(ref)).provider);await db.updateBookingStatus(ref,'cancelled');assert.equal((await db.getBookingByRef(ref)).status,'cancelled');
 }finally{if(db)await db.pool.end();await connection.query('DROP DATABASE IF EXISTS `'+name+'`');await connection.end();}
});
