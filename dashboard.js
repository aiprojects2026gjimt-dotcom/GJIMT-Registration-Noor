const API_URL='https://script.google.com/macros/s/AKfycbz65qwX_SLWFK4zMft9PlbpRg2dvDE8TIe2i2Gp8B2NpeixMa1-_CLfcCr2Pg2Zu7hLNg/exec';let loading=false;function getStats(){return new Promise((resolve,reject)=>{const cb='dash_'+Date.now()+'_'+Math.floor(Math.random()*1e6),s=document.createElement('script');let done=false;const t=setTimeout(()=>end(new Error('Timed out')),12000);function end(e,v){if(done)return;done=true;clearTimeout(t);delete window[cb];s.remove();e?reject(e):resolve(v)}window[cb]=v=>end(v.error?new Error(v.error):null,v);s.onerror=()=>end(new Error('Network error'));s.src=API_URL+'?action=stats&callback='+cb+'&_='+Date.now();document.head.appendChild(s)})}async function refresh(){if(loading)return;loading=true;try{const s=await getStats();if(!s.ok)throw Error(s.error||'API error');document.getElementById('total').textContent=s.total??0;document.getElementById('existing').textContent=s.existingCount??0;document.getElementById('newCount').textContent=s.newCount??0;document.getElementById('sync').textContent='● Google Sheet connected • Updated '+new Date().toLocaleTimeString('en-IN')}catch(e){document.getElementById('sync').textContent='⚠ '+e.message+' • Will retry'}finally{loading=false}}refresh();setInterval(refresh,10000);
let lastEventId = Number(sessionStorage.getItem('noorDashboardLastId')||0);
let initialized = false, polling = false, speaking = false, voiceReady = false;
const announcementQueue = [];
const alertBox=document.getElementById('donorAlert');
const lineBox=document.getElementById('line');
const halo=document.querySelector('.halo');
const DEFAULT_LINE='Gian Jyoti Blood Donation Camp. Every donor brings hope and helps save lives.';
function femaleVoice(){
 const voices=window.speechSynthesis?.getVoices()||[];
 const names=['Microsoft Neerja','Microsoft Heera','Google हिन्दी','Google Hindi','Microsoft Swara','Veena','Lekha','Google UK English Female','Samantha','Karen','Moira','Tessa','Microsoft Zira'];
 for(const name of names){const v=voices.find(x=>x.name.toLowerCase().includes(name.toLowerCase()));if(v)return v}
 return voices.find(v=>/^(hi|en)[-_ ]?IN/i.test(v.lang)&&/female|woman|neerja|heera|swara|veena|lekha/i.test(v.name))||voices.find(v=>/female|woman|neerja|heera|swara|veena|lekha|samantha|karen|zira/i.test(v.name))||null;
}
function sayDashboard(message, onFinish){
 if(!('speechSynthesis' in window)){onFinish?.();return}
 const v=femaleVoice();
 // Never allow browser to silently fall back to its default male voice.
 if(!v){alertBox.textContent='♥ '+(currentDonor||'NOOR')+' • Voice setup: select/install a female system voice on this display.';onFinish?.();return}
 speechSynthesis.cancel();
 const u=new SpeechSynthesisUtterance(message);
 u.voice=v;u.lang=v.lang||'en-IN';u.rate=1.02;u.pitch=1.10;u.volume=1;
 u.onstart=()=>halo.classList.add('talking');
 let finished=false;
 const done=()=>{if(finished)return;finished=true;halo.classList.remove('talking');onFinish?.()};
 u.onend=done;u.onerror=done;
 speechSynthesis.speak(u);
}
let currentDonor='';
function announceNext(){
 if(speaking||!announcementQueue.length)return;
 const donor=announcementQueue.shift();speaking=true;currentDonor=donor.name;
 const msg='Thank you '+donor.name+' for registering at the Gian Jyoti Blood Donation Camp. Your generous act can help save lives and bring hope to families. Please proceed to the P G I registration desk for the next step.';
 alertBox.textContent='♥ Thank you, '+donor.name+'!;
 lineBox.textContent=msg;
 refresh();
 sayDashboard(msg,()=>{speaking=false;setTimeout(announceNext,350)});
}
function getEvents(after){
 return new Promise((resolve,reject)=>{
  const cb='noorEvent_'+Date.now()+'_'+Math.floor(Math.random()*1e6);
  const script=document.createElement('script');let done=false;
  const timer=setTimeout(()=>finish(new Error('Announcement connection timed out')),12000);
  function finish(err,result){if(done)return;done=true;clearTimeout(timer);delete window[cb];script.remove();err?reject(err):resolve(result)}
  window[cb]=r=>finish(r&&r.error?new Error(r.error):null,r);
  script.onerror=()=>finish(new Error('Announcement service unreachable'));
  script.src=API_URL+'?action=events&after='+encodeURIComponent(after)+'&callback='+cb+'&_='+Date.now();
  document.head.appendChild(script);
 });
}
async function pollEvents(){
 if(polling)return;polling=true;
 try{
  const r=await getEvents(lastEventId);
  if(!r.ok||!Array.isArray(r.events))throw Error('Please deploy the latest Code.gs (events API).');
  if(!initialized){
   initialized=true;
   // First opening: do not announce historical registrations; DO announce the last donor if registered in the past 2 minutes.
   if(lastEventId===0){
    const recent=r.events.filter(d=>Date.now()-Number(d.time)<120000);
    if(recent.length)announcementQueue.push(...recent);
    lastEventId=Math.max(lastEventId,Number(r.latest)||0);
   }else{
    for(const d of r.events)if(Number(d.id)>lastEventId)announcementQueue.push(d);
    lastEventId=Math.max(lastEventId,Number(r.latest)||0);
   }
  }else{
   for(const d of r.events)if(Number(d.id)>lastEventId){announcementQueue.push(d);lastEventId=Number(d.id)}
   lastEventId=Math.max(lastEventId,Number(r.latest)||0);
  }
  sessionStorage.setItem('noorDashboardLastId',String(lastEventId));
  if(announcementQueue.length)announceNext();
 }catch(e){console.warn(e);alertBox.textContent='⚠ Dashboard announcement connection: '+e.message}
 finally{polling=false}
}
document.getElementById('speak').onclick=()=>{
 voiceReady=true;
 if(announcementQueue.length)announceNext();
 else sayDashboard(lineBox.textContent||DEFAULT_LINE);
};
if('speechSynthesis' in window){speechSynthesis.getVoices();speechSynthesis.addEventListener?.('voiceschanged',()=>{});}
pollEvents();setInterval(pollEvents,2000);
