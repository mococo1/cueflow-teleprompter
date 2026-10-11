const $ = (s) => document.querySelector(s);
const els = { editor:$('#editor'), prompter:$('#prompter'), script:$('#script'), wordCount:$('#wordCount'), font:$('#fontSize'), fontValue:$('#fontValue'), speed:$('#speed'), speedValue:$('#speedValue'), mirror:$('#mirrorBtn'), cameraToggle:$('#cameraBtn'), start:$('#startBtn'), close:$('#closeBtn'), camera:$('#camera'), scroll:$('#scrollArea'), text:$('#promptText'), play:$('#playBtn'), slower:$('#slowerBtn'), faster:$('#fasterBtn'), liveSpeed:$('#liveSpeed'), record:$('#recordBtn'), recordingBadge:$('#recordingBadge'), recordingTime:$('#recordingTime'), countdown:$('#countdown'), toast:$('#toast'), install:$('#installBtn') };

let state = { playing:false, mirror:false, camera:true, speed:38, font:52, raf:0, last:0, stream:null, recorder:null, chunks:[], recordStarted:0, recordTimer:0, wakeLock:null, installPrompt:null };
const saved = JSON.parse(localStorage.getItem('cueflow') || '{}');
if (saved.script) els.script.value = saved.script;
['speed','font'].forEach(k => { if(saved[k]) { state[k] = saved[k]; (k==='font'?els.font:els.speed).value=saved[k]; }});

function words(){ const n=(els.script.value.trim().match(/[\w’'-]+/g)||[]).length; els.wordCount.textContent=`${n} words`; }
function multiplier(){ return state.speed / 38; }
function labels(){ els.fontValue.value=state.font; els.speedValue.value=`${multiplier().toFixed(1)}×`; els.liveSpeed.textContent=`${multiplier().toFixed(1)}×`; }
function persist(){ localStorage.setItem('cueflow', JSON.stringify({script:els.script.value,speed:state.speed,font:state.font})); }
function toast(msg){ els.toast.textContent=msg; els.toast.classList.remove('hidden'); clearTimeout(toast.t); toast.t=setTimeout(()=>els.toast.classList.add('hidden'),2600); }
function toggle(btn,key){ state[key]=!state[key]; btn.classList.toggle('active',state[key]); btn.setAttribute('aria-pressed',state[key]); }

els.script.addEventListener('input',()=>{ words(); persist(); });
els.font.addEventListener('input',e=>{state.font=+e.target.value; labels(); persist();});
els.speed.addEventListener('input',e=>{state.speed=+e.target.value; labels(); persist();});
els.mirror.addEventListener('click',()=>toggle(els.mirror,'mirror'));
els.cameraToggle.addEventListener('click',()=>toggle(els.cameraToggle,'camera'));

async function openCamera(){
  if(!state.camera) return;
  try { state.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1920},height:{ideal:1080}},audio:true}); els.camera.srcObject=state.stream; await els.camera.play(); }
  catch(e){ toast('无法打开摄像头，已切换为纯提词模式'); state.camera=false; }
}
async function wake(){ try{ if('wakeLock' in navigator) state.wakeLock=await navigator.wakeLock.request('screen'); }catch(e){} }
function tick(t){ if(state.playing){ if(state.last) els.scroll.scrollTop += (t-state.last)*state.speed/1000; state.last=t; } else state.last=0; state.raf=requestAnimationFrame(tick); }
async function start(){
  if(!els.script.value.trim()) return toast('请先粘贴英文台词');
  els.text.textContent=els.script.value; els.text.style.fontSize=`${state.font}px`; els.text.classList.toggle('mirror',state.mirror); els.scroll.scrollTop=0;
  els.editor.classList.add('hidden'); els.prompter.classList.remove('hidden');
  await Promise.all([openCamera(),wake()]);
  state.playing=false; els.play.textContent='▶'; countdown(); cancelAnimationFrame(state.raf); state.raf=requestAnimationFrame(tick);
}
async function countdown(){
  els.countdown.classList.remove('hidden');
  for(let n=3;n>0;n--){ els.countdown.textContent=n; await new Promise(r=>setTimeout(r,650)); }
  els.countdown.classList.add('hidden'); state.playing=true; els.play.textContent='Ⅱ';
}
function playPause(){ state.playing=!state.playing; els.play.textContent=state.playing?'Ⅱ':'▶'; }
function adjust(n){ state.speed=Math.max(10,Math.min(90,state.speed+n)); els.speed.value=state.speed; labels(); persist(); }
async function close(){
  if(state.recorder?.state==='recording') stopRecording();
  state.playing=false; cancelAnimationFrame(state.raf); state.stream?.getTracks().forEach(t=>t.stop()); state.stream=null; await state.wakeLock?.release().catch(()=>{});
  els.prompter.classList.add('hidden'); els.editor.classList.remove('hidden');
}
function startRecording(){
  if(!state.stream) return toast('摄像头未开启，无法录像');
  if(!window.MediaRecorder) return toast('当前浏览器不支持网页录像');
  state.chunks=[];
  const preferred=['video/mp4;codecs=h264','video/webm;codecs=vp9','video/webm'].find(MediaRecorder.isTypeSupported);
  state.recorder=new MediaRecorder(state.stream,preferred?{mimeType:preferred}:undefined);
  state.recorder.ondataavailable=e=>{if(e.data.size) state.chunks.push(e.data)};
  state.recorder.onstop=saveRecording; state.recorder.start(1000); state.recordStarted=Date.now();
  els.record.classList.add('recording-now'); els.recordingBadge.classList.remove('hidden');
  state.recordTimer=setInterval(()=>{ const s=Math.floor((Date.now()-state.recordStarted)/1000); els.recordingTime.textContent=`${String(s/60|0).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; },500);
}
function stopRecording(){ state.recorder?.stop(); clearInterval(state.recordTimer); els.record.classList.remove('recording-now'); els.recordingBadge.classList.add('hidden'); }
function saveRecording(){
  const type=state.recorder.mimeType||'video/webm'; const blob=new Blob(state.chunks,{type}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`cueflow-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.${type.includes('mp4')?'mp4':'webm'}`; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),3000); toast('录像已保存到下载文件');
}

els.start.addEventListener('click',start); els.close.addEventListener('click',close); els.play.addEventListener('click',playPause); els.slower.addEventListener('click',()=>adjust(-5)); els.faster.addEventListener('click',()=>adjust(5));
els.record.addEventListener('click',()=>state.recorder?.state==='recording'?stopRecording():startRecording());
let touchX=0; els.scroll.addEventListener('touchstart',e=>touchX=e.touches[0].clientX,{passive:true}); els.scroll.addEventListener('touchend',e=>{const d=e.changedTouches[0].clientX-touchX;if(Math.abs(d)>70)adjust(d>0?5:-5);else if(Math.abs(d)<12)playPause()},{passive:true});
els.scroll.addEventListener('click',e=>{ if(e.detail && !('ontouchstart' in window)) playPause(); });
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&!els.prompter.classList.contains('hidden')) wake(); });
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;els.install.classList.remove('hidden')});
els.install.addEventListener('click',async()=>{ if(state.installPrompt){state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;els.install.classList.add('hidden')}else toast('在浏览器分享菜单中选择“添加到主屏幕”'); });
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
words(); labels();
