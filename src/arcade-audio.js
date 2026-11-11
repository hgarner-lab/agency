// Music and sound effects, made in code so there are no audio files to load or license.
// The tune is original: a bouncy handheld-console style loop. It breathes (melody for
// 8 bars, then 8 bars of just bass, drums and a soft arpeggio) so it doesn't grate.
let ctx=null,master=null,musicBus=null,pulse=null,hiss=null;
function ac(){
 try{
  if(!ctx){
   const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
   ctx=new C();master=ctx.createGain();master.gain.value=.9;
   const soften=ctx.createBiquadFilter();soften.type='lowpass';soften.frequency.value=3400;master.connect(soften);soften.connect(ctx.destination);
   musicBus=ctx.createGain();musicBus.gain.value=0;musicBus.connect(master);
   // 25% pulse wave: the classic retro lead sound, softer than a plain square
   const n=32,re=new Float32Array(n),im=new Float32Array(n);for(let k=1;k<n;k++)im[k]=2/(k*Math.PI)*Math.sin(k*Math.PI*.25);pulse=ctx.createPeriodicWave(re,im);
   hiss=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.2),ctx.sampleRate);const d=hiss.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  }
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  return ctx;
 }catch{return null}
}
const hz=m=>440*2**((m-69)/12);
function tone(m,t,dur,{wave='square',vol=.04,bus=master,slide=0}={}){
 const o=ctx.createOscillator(),g=ctx.createGain();
 if(wave==='pulse')o.setPeriodicWave(pulse);else o.type=wave;
 o.frequency.setValueAtTime(hz(m),t);if(slide)o.frequency.exponentialRampToValueAtTime(hz(m+slide),t+dur);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.008);g.gain.setValueAtTime(vol,t+dur*.55);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
 o.connect(g);g.connect(bus);o.start(t);o.stop(t+dur+.03);
}
function noise(t,dur,vol,bus,freq=7000){
 const s=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=freq;s.buffer=hiss;
 g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(bus);s.start(t);s.stop(t+dur+.02);
}
function kick(t,bus){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(45,t+.12);g.gain.setValueAtTime(.22,t);g.gain.exponentialRampToValueAtTime(.0001,t+.14);o.connect(g);g.connect(bus);o.start(t);o.stop(t+.16);}

// Chords: C, C, Am, Am, F, F, G, G (one per bar, eight eighth-notes per bar)
const ROOTS=[36,36,33,33,29,29,31,31],CHORDS=[[60,64,67],[60,64,67],[57,60,64],[57,60,64],[53,57,60],[53,57,60],[55,59,62],[55,59,62]];
const _=null,MELODY=[
 [72,_,76,79,_,76,74,72],[74,_,76,_,72,_,_,_],
 [69,_,72,76,_,74,72,69],[71,_,72,_,69,_,_,_],
 [65,_,69,72,_,77,76,74],[72,_,69,_,72,74,_,_],
 [74,_,79,_,77,76,74,71],[74,_,_,_,67,_,71,74],
];
function playStep(step,t){
 const bar=Math.floor(step/8)%16,beat=step%8,ch=bar%8,root=ROOTS[ch];
 tone(root+(beat%2?12:0),t,.16,{wave:'triangle',vol:.11,bus:musicBus});
 if(beat===0||beat===4)kick(t,musicBus);
 if(beat===2||beat===6)noise(t,.07,.05,musicBus,2500);
 if(beat%2)noise(t,.03,.025,musicBus);
 if(bar<8){const m=MELODY[ch][beat];if(m){const next=MELODY[ch].slice(beat+1).findIndex(x=>x!==null);tone(m,t,next===0?.12:.22,{wave:'pulse',vol:.035,bus:musicBus});}}
 else tone(CHORDS[ch][beat%3]+(beat>=6?12:0),t,.11,{wave:'triangle',vol:.03,bus:musicBus});
}
let timer=0,step=0,nextAt=0,bpm=126,playing=false;
function schedule(){while(nextAt<ctx.currentTime+.15){playStep(step,nextAt);nextAt+=60/bpm/2;step=(step+1)%128;}}
export function music(on,fast=false){
 bpm=fast?144:126;if(!!on===playing)return;
 if(on){if(!ac())return;playing=true;step=0;nextAt=ctx.currentTime+.1;musicBus.gain.cancelScheduledValues(ctx.currentTime);musicBus.gain.setValueAtTime(0,ctx.currentTime);musicBus.gain.linearRampToValueAtTime(.6,ctx.currentTime+1);timer=setInterval(schedule,40);}
 else{playing=false;clearInterval(timer);if(ctx){musicBus.gain.cancelScheduledValues(ctx.currentTime);musicBus.gain.setTargetAtTime(0,ctx.currentTime,.12);}}
}
export function unlockAudio(){ac();}
export function sfx(type){
 if(!ac())return;const t=ctx.currentTime+.01;
 if(type==='job')[67,72,76].forEach((m,i)=>tone(m,t+i*.07,.1,{vol:.03}));
 else if(type==='pickup')[78,83].forEach((m,i)=>tone(m,t+i*.07,.1,{vol:.03}));
 else if(type==='miss')[57,55].forEach((m,i)=>tone(m,t+i*.07,.1,{vol:.03}));
 // Jamie's alert: a quick rising call, then two bright pings
 else if(type==='jamie'){[72,76,79,84].forEach((m,i)=>tone(m,t+i*.06,.09,{wave:'pulse',vol:.06}));[91,91].forEach((m,i)=>tone(m,t+.3+i*.16,.14,{vol:.045}));tone(60,t+.3,.4,{wave:'triangle',vol:.12});}
 else if(type==='tick')tone(96,t,.05,{vol:.03});
 else if(type==='buzzer'){tone(45,t,.75,{vol:.07,slide:-4});tone(46,t,.75,{wave:'triangle',vol:.1,slide:-4});}
 else if(type==='fanfare'){[67,67,67].forEach((m,i)=>tone(m,t+i*.11,.09,{wave:'pulse',vol:.06}));tone(72,t+.33,.9,{wave:'pulse',vol:.06});[48,52,55].forEach(m=>tone(m,t+.33,1,{wave:'triangle',vol:.1}));[76,79].forEach((m,i)=>tone(m,t+.75+i*.12,.5,{wave:'pulse',vol:.045}));}
 else tone(69,t,.1,{vol:.03});
}
