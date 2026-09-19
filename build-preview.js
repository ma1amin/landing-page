'use strict';
/**
 * Builds a single self-contained preview.html · CSS, JS, photo and favicon
 * inlined · plus an in-browser stand-in for the booking API so the calendar
 * and forms work with no server (bookings persist in localStorage).
 *
 *   node build-preview.js [outfile]
 */
const fs = require('node:fs');
const path = require('node:path');

const PUB = path.join(__dirname, 'public');
const read = (f) => fs.readFileSync(path.join(PUB, f), 'utf8');
const b64 = (f) => fs.readFileSync(path.join(PUB, f)).toString('base64');

const html = read('index.html');
const css = read('styles.css');
const appjs = read('app.js');
const widgetCss = read('questionnaire-widget.css');
const widgetJs = read('questionnaire-widget.js');

/* ---- offline stand-in for the backend ------------------------------- */
const SHIM = `
(function(){
  var BK='ma_preview_bookings', CK='ma_preview_collabs', mem={};
  function load(k){ try{ var v=localStorage.getItem(k); if(v) return JSON.parse(v); }catch(e){}
                    return mem[k] || (mem[k]=[]); }
  function save(k,v){ mem[k]=v; try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

  var DUR={discovery:30,technical:60,advisory:45};
  var NAMES={discovery:'Discovery Call',technical:'Technical Deep Dive',advisory:'Advisory Retainer Intro'};
  var STARTS=[];
  for(var m=600;m<960;m+=30){ if(m>=720&&m<780) continue; STARTS.push(m); }

  function riyadh(){ return new Date(Date.now()+3*3600e3); }
  function today(){ return riyadh().toISOString().slice(0,10); }
  function nowMin(){ var s=riyadh(); return s.getUTCHours()*60+s.getUTCMinutes(); }
  function toMin(t){ var p=String(t).split(':'); return (+p[0])*60+(+p[1]); }
  function hhmm(m){ return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); }

  function dayAvail(date,dur){
    var p=date.split('-').map(Number);
    var dow=new Date(Date.UTC(p[0],p[1]-1,p[2])).getUTCDay();
    var out={date:date,slots:[]};
    if([0,1,2,3,4].indexOf(dow)<0) return out;
    var t=today();
    var hz=new Date(riyadh().getTime()+60*864e5).toISOString().slice(0,10);
    if(date<t||date>hz) return out;
    var busy=load(BK).filter(function(b){return b.date===date;})
                     .map(function(b){return [toMin(b.time), toMin(b.time)+b.duration];});
    for(var i=0;i<STARTS.length;i++){
      var s=STARTS[i], e=s+dur;
      if(e>960) continue;
      if(s<780 && e>720) continue;
      if(date===t && s<nowMin()+240) continue;
      var taken=busy.some(function(b){ return s<b[1] && b[0]<e; });
      out.slots.push({time:hhmm(s), available:!taken});
    }
    return out;
  }
  function mkref(p){
    var c='0123456789ABCDEF', r='';
    for(var i=0;i<6;i++) r+=c[Math.floor(Math.random()*16)];
    return p+'-'+r;
  }

  window.fetch=function(u,opts){
    var url=new URL(String(u), location.href);
    var p=url.pathname;
    return new Promise(function(resolve){
      setTimeout(function(){
        var body={};
        try{ body=opts&&opts.body?JSON.parse(opts.body):{}; }catch(e){}
        var status=200, data={};

        if(p==='/api/slots'){
          var month=url.searchParams.get('month')||'';
          var type=url.searchParams.get('type')||'discovery';
          var dur=DUR[type]||30;
          var y=+month.slice(0,4), mo=+month.slice(5,7);
          var n=new Date(Date.UTC(y,mo,0)).getUTCDate(), arr=[];
          for(var d=1;d<=n;d++){
            var ds=month+'-'+String(d).padStart(2,'0');
            var av=dayAvail(ds,dur);
            if(av.slots.length) arr.push(av);
          }
          data={month:month,timezone:'Asia/Riyadh (GMT+3)',duration:dur,days:arr};
        }
        else if(p==='/api/bookings'){
          var dur2=DUR[body.type]||30;
          var av2=dayAvail(body.date,dur2);
          var slot=null;
          for(var i=0;i<av2.slots.length;i++) if(av2.slots[i].time===body.time) slot=av2.slots[i];
          if(!slot||!slot.available){
            status=409;
            data={error:'slot_taken',message:'That slot was just taken. Please pick another time.'};
          } else {
            var b={ref:mkref('MA'),date:body.date,time:body.time,duration:dur2,
                   type:body.type,sessionName:NAMES[body.type]||'Session',
                   name:body.name,email:body.email,org:body.org,notes:body.notes,
                   status:'confirmed',timezone:'Asia/Riyadh (GMT+3)',
                   createdAt:new Date().toISOString()};
            var all=load(BK); all.push(b); save(BK,all);
            data={ok:true,booking:b,notified:false};
          }
        }
        else if(p==='/api/collaborations'){
          var c={ref:mkref('COL'),name:body.name,email:body.email,org:body.org,
                 kind:body.kind,link:body.link,message:body.message,
                 createdAt:new Date().toISOString()};
          var ac=load(CK); ac.push(c); save(CK,ac);
          data={ok:true,ref:c.ref,notified:false};
        }
        else { status=404; data={error:'not_found'}; }

        resolve({
          ok: status>=200 && status<300,
          status: status,
          json: function(){ return Promise.resolve(data); },
          text: function(){ return Promise.resolve(JSON.stringify(data)); }
        });
      }, 220);
    });
  };
  window.__OFFLINE_PREVIEW__ = true;
})();
`;

const portrait = 'data:image/jpeg;base64,' + b64('assets/portrait.jpg');
const favicon = 'data:image/svg+xml;base64,' + b64('assets/favicon.svg');

// NOTE: use replacer *functions*, not strings. In a string replacement, `$$`
// collapses to a single `$`, which would corrupt app.js (every `$$(` helper
// would silently become `$(`).
let out = html
  .replace('<link rel="icon" href="assets/favicon.svg" type="image/svg+xml" />',
           () => '<link rel="icon" href="' + favicon + '" type="image/svg+xml" />')
  .replace('<link rel="stylesheet" href="styles.css" />',
           () => '<style>\n' + css + '\n</style>')
  .replace('src="assets/portrait.jpg"',
           () => 'src="' + portrait + '"')
  .replace('<link rel="stylesheet" href="questionnaire-widget.css" />',
           () => '<style>\n' + widgetCss + '\n</style>')
  .replace('<script src="app.js"></script>',
           () => '<script>' + SHIM + '</script>\n<script>\n' + appjs + '\n</script>')
  .replace('<script src="questionnaire-widget.js" defer></script>',
           () => '<script>\n' + widgetJs + '\n</script>');

if (out.indexOf('data:image/jpeg;base64,') === -1) throw new Error('portrait not inlined');
if (out.indexOf('<style>') === -1) throw new Error('css not inlined');
if (out.indexOf('window.fetch=function') === -1) throw new Error('shim not injected');
if (out.indexOf('QuestionnaireWidget') === -1) throw new Error('widget js not inlined');
if (out.indexOf('.questionnaire-widget') === -1) throw new Error('widget css not inlined');

const outPath = process.argv[2] || path.join(__dirname, 'preview.html');
fs.writeFileSync(outPath, out);
console.log('preview.html -> ' + outPath + '  (' + (out.length / 1024).toFixed(0) + ' KB)');
