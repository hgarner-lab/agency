import {UG_MONOGRAM_URL} from './underground-brand.js';
import {taskById} from './agency-tasks.js';
import {cast} from './story.js';
import {roles,roleLessons,waysIn} from './content.js';
import {TASK_COPY,nudge} from './task-copy.js';
import {character,selector} from './scenes.js';
import {isClean,isGameName,makeNickname} from './filter.js';
import {qr} from './qr.js';
import {drawRoleCard,MCCANN_LOGO_URL} from './role-card.js';
import {music,sfx,unlockAudio} from './arcade-audio.js';
import {AD_WEAK,adLook} from './arcade-world.js';
import {rushAt,AD_STYLE,adStyle,ARCADE_TICK,JOBS,PICKUPS,pickupInfo,newArcadeGame,applyArcadeInput,arcadeProfile,nearbyJob,nextInstruction,jobAction,newPracticeGame,practiceInstruction,applyPracticeInput,MIN_ROLE_JOBS} from './arcade-world.js';
import {createArcadeRenderer,createRoomRenderer,trainerSVG,COLOURWAYS,posterSVG,drawGameIcon,drawPractice} from './arcade-renderer.js';

const q=s=>document.querySelector(s),safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root=q('#app'),params=new URLSearchParams(location.search);
let view=params.get('view')||'home',roomCode=(params.get('room')||'').toUpperCase();
let savingRole=false,workDraft=null,viewedWork=null;
let selected=0,creds=null,live=null,game=null,solo=null,ackGame=null,ackSeq=0,pending=[],nextSeq=0;
let poller=null,sending=false,connected=false,clockOffset=0,sceneKey='',renderer=null,modalType=null,busy=false;
let practice=null,practiceSaving=false,movementPointer=null,nickname=makeNickname();
let held='',keys=[],actionQueued=false,lastInput=0,lastSave=0,toastUntil=0,spotlight=-1,spotlightAt=0,sound=false;
const gameStore='wr-arcade-solo';
const loadJSON=key=>{try{return JSON.parse(sessionStorage.getItem(key)||'null')}catch{return null}};
try{creds=JSON.parse(localStorage.getItem((view==='host'?'wr-arc-host-':'wr-arc-player-')+roomCode)||'null')}catch{}
if(view==='stage')creds=null;
const clock=()=>Date.now()+clockOffset;
const mccannMark=()=>`<span class="mccann-mark"><img src="${MCCANN_LOGO_URL}" alt="McCann" width="800" height="200" decoding="async"></span>`;
const mccannStageCredit=()=>`<div class="arc-stage-credit" aria-label="A McCann experience"><small>A McCANN EXPERIENCE</small>${mccannMark()}</div>`;
const brand=()=>`<div class="brand-lockup"><a class="brand" href="/" aria-label="The Agency home"><span class="brand-icon">A</span><span class="brand-name">THE<br>AGENCY<span class="acid">.</span></span></a><div class="mccann-endorsement"><small>AN EXPERIENCE BY</small>${mccannMark()}</div></div>`;
const prettyTime=n=>{n=Math.max(0,Math.ceil(n));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0')};
const toView=(v,code='')=>{location.href='/?view='+v+(code?'&room='+code:'')};
const playerLink=()=>location.origin+'/?view=player&room='+roomCode;
function toast(text){const el=q('#toast');el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3200)}
// The message moves to whichever half of the map your next target is not in.
function note(text,ms=2500){const n=q('#game-message');if(n){const target=game&&nextInstruction(game,clock()).target;n.textContent=text;n.classList.add('visible');toastUntil=Date.now()+ms}}
function playNote(type){if(sound)sfx(type)}
// The laptop running the big screen plays the music and room sounds. Phones only play short sounds.
let hostSound=(()=>{try{return localStorage.getItem('wr-arc-host-sound')!=='off'}catch{return true}})(),lastTick=0;
const soundIcon=on=>`<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M3 7h3l5-4v14l-5-4H3z" fill="currentColor"/>${on?'<path d="M13.5 7a4 4 0 0 1 0 6M15.5 4.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.6"/>':'<path d="M13.5 7.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="1.8"/>'}</svg>`;
function roomSounds(){
 if(view==='host'&&live){const s=secondsLeft(),on=hostSound&&live.phase==='active'&&sceneKey==='room-playing';music(on,s<30);const n=Math.ceil(s);if(on&&n<=10&&n>0&&n!==lastTick)sfx('tick');lastTick=n;}
 else if(solo)music(sound&&sceneKey==='play'&&solo.phase==='active'&&secondsLeft()>0,secondsLeft()<30);
 else music(false);
}
function header(){return `<div class="shell"><header class="nav arc-nav">${brand()}<div class="arc-nav-right"><span class="arc-mode mono">${view==='solo'?'':view==='host'||view==='stage'||view==='roles'||view==='brief'?'':roomCode?'ROOM '+safe(roomCode):'THE PIXEL GAME'}</span>${view==='player'?`<span class="arc-connection mono${connected?'':' offline'}" id="arc-connection">${connected?'CONNECTED':'CONNECTING…'}</span>`:''}</div></header></div>`}
function itemIcon(kind,label){return `<canvas class="arc-item-icon" width="24" height="24" data-game-icon="${safe(kind)}" role="img" aria-label="${safe(label)}"></canvas>`;}
function paintIcons(){document.querySelectorAll('[data-game-icon]').forEach(el=>drawGameIcon(el,el.dataset.gameIcon));}
function howToPlay(){return `<div class="arc-help-guide"><p class="arc-guide-goal">Do jobs for the four teams. Finish 2 to unlock your role.</p><ol class="arc-guide-steps"><li><b>1. MOVE</b><span>Hold an arrow. On a computer, use the arrow keys.</span></li><li><b>2. COLLECT</b><span>Some jobs need items first. Walk over anything flashing.</span></li><li><b>3. START A JOB</b><span>Stand next to a teammate and press START. Answer 3 quick questions. Get one wrong and they’ll tell you why.</span></li></ol><h3 class="arc-guide-heading">THE FOUR TEAMS</h3><div class="arc-guide-jobs"><article><small>TOP LEFT · STRATEGY</small><div>${itemIcon('clue','Green research note')}<b>3 research notes</b></div><p>Collect them, then talk to <strong>Rem</strong>.<br>Work out what customers really think.</p></article><article><small>TOP RIGHT · CREATIVE</small><div>${itemIcon('paint','Colour tin')}${itemIcon('word','Word tile')}<b>1 colour + 1 word</b></div><p>Collect them, then talk to <strong>Nova</strong>.<br>Come up with the ad.</p></article><article><small>BOTTOM LEFT · ACCOUNTS</small><div>${itemIcon('brief','Client message envelope')}<b>Nothing to collect</b></div><p>Talk to <strong>Sol</strong>.<br>Sort a deal with the client, then take it to the teammate he names.</p></article><article><small>BOTTOM RIGHT · PRODUCTION</small><div>${itemIcon('clue','Kit list')}${itemIcon('clue','Location sheet')}<b>Kit list + location sheet</b></div><p>Collect them, then talk to <strong>Patch</strong>.<br>Book the shoot on budget.</p></article></div><p class="arc-guide-scenery">After your first job in a room, the next ones there need nothing collected.</p><p class="arc-guide-scenery">⚡ When an urgent job flashes up, the first to finish one in that team gets double points. 🤝 Finish a job just after someone in a different team and you both get a bonus.</p></div>`;}

function quickStart(){return `<div class="arc-quick-start"><ol><li><b>MOVE</b><span>Hold an arrow.</span></li><li><b>COLLECT</b><span>Walk over flashing items.</span></li><li><b>START</b><span>Follow the dots to a teammate. Press START and answer 3 quick questions.</span></li></ol><p class="arc-quick-note">Do 2 jobs to unlock your role.</p></div>`;}

function lastHost(){try{const l=JSON.parse(localStorage.getItem('wr-arc-last-host')||'null');return l&&Date.now()-l.at<12*3600000&&/^[A-Z2-9]{6}$/.test(l.code)&&localStorage.getItem('wr-arc-host-'+l.code)?l.code:''}catch{return ''}}
function home(){
 document.body.className='arcade-home';
 root.innerHTML=`<div class="shell"><header class="nav">${brand()}</header><main><section class="hero character-home"><div class="hero-text"><h1>SAVE THE<br><span class="accent">LAUNCH.</span></h1><p class="hero-desc">Help the crew launch a new trainer, and find out which agency job suits you.</p><div class="hero-actions"><button class="btn" data-action="host">HOST A GAME <span class="arrow">→</span></button><a class="btn secondary" href="/?view=roles">SKIP TO JOB ROLES ↗</a></div>${lastHost()?`<a class="btn secondary arc-resume" href="/?view=host&room=${safe(lastHost())}">BACK TO YOUR GAME · ${safe(lastHost())} →</a>`:''}<button class="text-button arc-home-solo" data-action="solo">Play solo →</button>${loadJSON(gameStore)?.phase==='active'?'<button class="text-button" data-action="resume-solo" style="margin-top:18px">Continue your solo game →</button>':''}</div><div class="cast-hero"><div class="cast-backdrop"><b>YOU’RE UP.</b><div class="hero-floor"></div></div><div class="hero-cast hero-rem">${character(0)}<span>REM</span></div><div class="hero-cast hero-nova">${character(1)}<span>NOVA</span></div><div class="hero-cast hero-patch">${character(2)}<span>PATCH</span></div><div class="incoming-card"><div class="call-portrait">${character(3)}</div><div><small>SOL</small><b>“The launch is in five minutes. Can you help?”</b></div><span class="call-pulse">↗</span></div></div></section></main></div>`;
}
function openModal(type){
 closeModal();actionQueued=false;modalType=type;const bg=document.createElement('div');bg.id='arc-modal';bg.className='modal-bg';let inside='';
 if(type==='map'&&solo?.phase==='active'){solo.remaining=Math.max(0,solo.deadline-Date.now());solo.phase='paused';saveSolo();}
 if(type==='solo'||type==='join')inside=`<div class="arc-mini-brief"><b>THE BRIEF</b><span>UNDERGROUND’s new £160 trainer launches today. Get students to trust it and try a pair at Saturday’s pop-up.</span></div><h2 id="arc-modal-title">PICK YOUR LOOK.</h2>${selector(selected)}<form id="arc-entry"><input type="hidden" name="mode" value="${type}">${type==='join'?(/^[A-Z2-9]{6}$/.test(roomCode)?`<input type="hidden" name="room" value="${safe(roomCode)}"><p class="arc-room-joined">ROOM <b>${safe(roomCode)}</b></p>`:`<label class="field-label" for="arc-room">ROOM CODE</label><input id="arc-room" name="room" class="code-input" type="text" value="${safe(roomCode)}" placeholder="ON THE BIG SCREEN" maxlength="6" pattern="[A-Za-z2-9]{6}" autocapitalize="characters" autocomplete="off" required>`):''}<span class="field-label">YOUR GAME NAME</span><div class="arc-name-pick"><b id="arc-name-display">${safe(nickname)}</b><input type="hidden" name="alias" id="arc-alias" value="${safe(nickname)}"><button type="button" class="arc-shuffle" data-action="shuffle-name" aria-label="Get a different game name">SHUFFLE ↻</button></div><div class="form-error" id="arc-error" role="alert"></div><button class="btn full" type="submit">LET’S GO →</button></form>`;
 else if(type==='work')inside=workMarkup();
 else if(type==='artifact')inside=`<div class="eyebrow acid">CAMPAIGN WALL</div><h2 id="arc-modal-title">${safe(viewedWork?.taskTitle||'Work complete')}</h2><p>${safe(viewedWork?.text)}</p><ul class="arc-artifact-lines">${(viewedWork?.lines||[]).map(v=>`<li>${safe(v)}</li>`).join('')}</ul><button class="btn full" data-action="close-modal">BACK TO THE WALL →</button>`;
 else if(type==='host')inside=`<div class="eyebrow acid">HOST A GAME</div><h2 id="arc-modal-title">GET THE CREW IN.</h2><p>This tab becomes the big screen. Put it on the projector.</p><label class="field-label" for="arc-duration">GAME LENGTH</label><select id="arc-duration"><option value="300">5 minutes (good for a first go)</option><option value="600">10 minutes (more time to try every team)</option></select><div class="form-error" id="arc-error" role="alert"></div><button class="btn full" data-action="create-room">CREATE ROOM ↗</button>`;
 else if(type==='map')inside=`<div class="eyebrow acid">QUICK GUIDE</div><h2 id="arc-modal-title">HOW TO PLAY.</h2>${solo?.phase==='paused'?'<p class="arc-help-clock">Timer paused.</p>':view==='player'&&live?.phase==='active'?'<p class="arc-help-clock">The clock is still running.</p>':''}${howToPlay()}<button class="btn full" data-action="close-modal">BACK TO THE GAME →</button>`;
 else if(type==='pause')inside=`<div class="eyebrow acid">${view==='solo'?'SOLO GAME PAUSED':'YOUR GAME'}</div><h2 id="arc-modal-title">TAKE A BREATHER.</h2><p>${view==='solo'?'Your timer is paused.':'The group’s timer keeps running while this menu is open.'}</p><button class="btn full" data-action="close-modal">KEEP PLAYING →</button>${solo?'<button class="btn secondary full" data-action="finish-self" style="margin-top:14px">FINISH GAME</button>':''}`;
 bg.innerHTML=`<section class="modal cast-modal${type==='map'?' arc-help-modal':type==='work'?' arc-work-modal':''}" role="dialog" aria-modal="true" aria-labelledby="arc-modal-title"><button class="close-modal" data-action="close-modal" aria-label="Close">×</button>${inside}</section>`;document.body.append(bg);paintIcons();if(['map','pause','work'].includes(type))clearMovement();setTimeout(()=>bg.querySelector('input:not([type=hidden]),button')?.focus(),30);
}
function closeModal(){const was=modalType;q('#arc-modal')?.remove();modalType=null;if(['pause','map'].includes(was)&&solo?.phase==='paused'){solo.phase='active';solo.deadline=Date.now()+solo.remaining;saveSolo();}lastInput=performance.now();}
function dismissModal(){if(modalType==='work'){if(phaseNow()==='active')processInput({c:1});else toast('Wait for the host to resume.');}else closeModal();}
function workMarkup(){
 const w=game?.work,task=taskById(w?.id);if(!task)return '';
 const key=w.id+':'+w.run;if(workDraft?.key!==key)workDraft={key,picks:task.slots.map(()=>null),wrong:null,flash:null,style:freshStyle()};
 const copy=TASK_COPY[task.id]||{},picks=workDraft.picks,at=picks.findIndex(v=>v===null),n=task.slots.length;
 const total=picks.reduce((t,v,i)=>t+(v===null?0:task.slots[i].options[v]?.cost||0),0),colour=JOBS[w.type].colour;
 const steps=task.slots.map((sl,i)=>`<li class="${picks[i]!==null?'done':i===at?'now':''}"></li>`).join('');
 let body='';
 if(at>=0){
  const slot=task.slots[at],order=slot.options.map((v,i)=>i);if((task.id.length+at+w.run)%2)order.reverse();
  const left=task.budget?task.budget-total:null;
  body=`<div class="arc-q"><small>QUESTION ${at+1} OF ${n}</small><h3>${safe(copy.ask?.[at]||slot.label)}</h3>${task.budget?`<p class="arc-q-budget">Left to spend: <b>£${left}</b></p>`:''}<div class="arc-q-options">${order.map(i=>{const o=slot.options[i],bad=workDraft.wrong?.slot===at&&workDraft.wrong.option===i;return `<button class="arc-q-option${bad?' wrong':''}" data-action="work-pick" data-slot="${at}" data-value="${i}"${bad?' disabled':''}>${safe(o.text)}</button>`}).join('')}</div>${workDraft.wrong?.slot===at?`<p class="arc-q-nudge" role="alert">${safe(workDraft.wrong.message)}</p>`:workDraft.flash?`<p class="arc-q-good" role="status">✓ ${safe(workDraft.flash)}</p>`:''}</div>`;
 }else if(task.kind==='ad')body=styleStep(task);
 else body=`<div class="arc-q arc-q-done"><p class="arc-q-good" role="status">✓ ${safe(workDraft.flash||'Plan done.')}</p><p class="arc-q-sending">Sending your work to the big screen…</p><button class="btn full" data-action="work-submit">SEND IT →</button></div>`;
 return `<div class="arc-work-header" style="--c:${colour}"><span>${safe(JOBS[w.type].role.toUpperCase())} · ${safe(JOBS[w.type].person)}</span><b id="arc-work-time">${prettyTime(secondsLeft())}</b></div><h2 id="arc-modal-title">${safe(task.title)}</h2><p class="arc-work-context">${safe(copy.scene||task.context)}</p>${task.sources?`<details class="arc-work-research"><summary>Your research (3 notes)</summary>${task.sources.map(v=>`<p>${safe(v)}</p>`).join('')}</details>`:''}<div id="arc-work-status" role="status"></div><ol class="arc-q-steps" style="--c:${colour}" aria-label="${picks.filter(v=>v!==null).length} of ${n} answered">${steps}</ol>${body}<p class="arc-work-feedback" role="alert">${safe(w.feedback||'')}</p><button class="text-button arc-work-back" data-action="close-modal">Back to map · keep your items</button>`;
}
// One tap per question. Wrong picks get a nudge and can be retried at once; the
// last good pick sends the plan, which the game (and server) still checks.
function pickWork(slotIndex,option){
 const w=game?.work,task=taskById(w?.id);if(!task||workDraft.picks[slotIndex]!==null)return;
 const o=task.slots[slotIndex].options[option],copy=TASK_COPY[task.id]||{};
 const spent=workDraft.picks.reduce((t,v,i)=>t+(v===null?0:task.slots[i].options[v]?.cost||0),0);
 if(o.why){workDraft.wrong={slot:slotIndex,option,message:nudge(o.why)};workDraft.flash=null;playNote('miss');refreshWork();return;}
 if(task.budget&&spent+(o.cost||0)>task.budget-minRemaining(task,slotIndex)){workDraft.wrong={slot:slotIndex,option,message:`Not quite. That leaves too little for the rest. You have £${task.budget-spent} left. Try again.`};workDraft.flash=null;refreshWork();return;}
 workDraft.picks[slotIndex]=option;workDraft.wrong=null;workDraft.flash=o.say||copy.good?.[slotIndex]||'Good choice.';game.work.feedback=null;playNote('pickup');refreshWork();
 if(workDraft.picks.every(v=>v!==null)&&task.kind!=='ad')setTimeout(submitWork,700);
}
function submitWork(){if(!game?.work||!workDraft?.picks.every(v=>v!==null))return;const ad=taskById(game.work.id)?.kind==='ad';processInput({b:{task:game.work.id,run:game.work.run,picks:[...workDraft.picks],...(ad?{style:{...workDraft.style}}:{})}});}
// After the questions, creatives style their ad. Every choice changes the finished poster.
// No repeats: skip headlines and looks already used by any ad in this room.
function usedAds(){const ads=[...(live?.events||[]).filter(e=>e.type===1).map(e=>e.poster).filter(Boolean),...(game?.posters||[])];return {heads:new Set(ads.map(p=>p.title)),looks:new Set(ads.map(adLook))};}
function freshHead(after){const used=usedAds().heads,n=AD_STYLE.head.length,start=after??Math.floor(Math.random()*(n-AD_WEAK.size));for(let k=after==null?0:1;k<=n;k++){const h=(start+k)%n;if(!used.has(AD_STYLE.head[h])||k===n)return h;}return start;}
function freshLook(st){const r=n=>Math.floor(Math.random()*n),looks=usedAds().looks;let next;for(let k=0;k<40;k++){next={...st,bg:r(AD_STYLE.bg.length),shoe:r(AD_STYLE.shoe.length),layout:r(3),sticker:r(AD_STYLE.sticker.length),model:r(AD_STYLE.model.length)};if(!looks.has(adLook(adStyle(next)))&&!(next.bg===st.bg&&next.layout===st.layout))break;}return next;}
function freshStyle(){return freshLook({bg:-1,layout:-1,tag:Math.floor(Math.random()*AD_STYLE.tag.length),head:freshHead()});}
const myAlias=()=>solo?.alias||creds?.alias||'';
function styleStep(task){
 const st=workDraft.style,title=AD_STYLE.head[st.head];
 return `<div class="arc-q arc-style"><p class="arc-q-good" role="status">✓ All three answers right.</p><h3>Make it yours.</h3><p class="arc-style-hint">Pick a headline and a look. It goes on the big screen, and everyone votes for the best ad.</p><div class="arc-style-preview">${posterSVG({kind:'ad',...adStyle(st),by:myAlias()})}</div>${AD_WEAK.has(title)?'<p class="arc-style-nudge">Jamie: “Hmm. Bit plain?” You can still send it.</p>':''}<div class="arc-style-buttons"><button class="arc-style-opt" data-action="work-headline">↻ New headline</button><button class="arc-style-opt" data-action="work-style-next" data-key="tag">↻ New tagline</button><button class="arc-style-opt wide" data-action="work-style-shuffle">↻ New look</button></div><button class="btn full" data-action="work-submit">SEND IT →</button></div>`;
}
function minRemaining(task,from){let n=0;for(let i=from+1;i<task.slots.length;i++)n+=Math.min(...task.slots[i].options.filter(o=>!o.why).map(o=>o.cost||0));return n;}
function refreshWork(){const modal=q('#arc-modal .arc-work-modal');if(!modal)return;modal.innerHTML='<button class="close-modal" data-action="close-modal" aria-label="Back to map">×</button>'+workMarkup();modal.querySelector('.arc-q-option:not([disabled])')?.focus();}
function setNickname(name){nickname=name;const d=q('#arc-name-display'),i=q('#arc-alias');if(d)d.textContent=name;if(i)i.value=name;}
function showError(message){const el=q('#arc-error');if(el)el.textContent=message;else toast(message)}
async function api(path,body){
 const headers={'content-type':'application/json'};if(creds?.token)headers.authorization='Bearer '+creds.token;if(creds?.id)headers['x-player']=creds.id;
 const response=await fetch('/api/arcade/'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify({...body,code:roomCode}):undefined,cache:'no-store'});
 let data;try{data=await response.json()}catch{throw Error('The room could not connect. Try again.')}if(!response.ok){const e=Error(data.error||'Please try again.');e.status=response.status;e.data=data;throw e}return data;
}
async function createRoom(){if(busy)return;busy=true;try{const result=await api('create',{duration:Number(q('#arc-duration').value)});localStorage.setItem('wr-arc-host-'+result.code,JSON.stringify({token:result.token,host:true}));localStorage.setItem('wr-arc-last-host',JSON.stringify({code:result.code,at:Date.now()}));toView('host',result.code)}catch(e){showError(e.message)}finally{busy=false}}
async function enter(form){
 if(busy)return;const values=new FormData(form),alias=String(values.get('alias')||'').trim(),mode=values.get('mode');
 if(mode!=='solo'&&!isGameName(alias)){setNickname(makeNickname());showError('Tap LET’S GO again.');return}
 if(mode==='solo'){closeModal();view='solo';creds=null;clockOffset=0;game=newArcadeGame(selected);solo={alias,character:selected,phase:'intro',remaining:300000,deadline:null,game};history.pushState(null,'','/?view=solo');saveSolo();renderIntro();return}
 roomCode=String(values.get('room')||'').toUpperCase();busy=true;form.querySelector('button[type=submit]').disabled=true;
 try{let p;for(let attempt=0;;attempt++){try{p=await api('join',{alias:nickname,character:selected});break}catch(e){if(e.status!==409||attempt>=4)throw e;setNickname(makeNickname());}}localStorage.setItem('wr-arc-player-'+roomCode,JSON.stringify(p));toView('player',roomCode)}catch(e){showError(e.message);form.querySelector('button[type=submit]').disabled=false}finally{busy=false}
}
function renderIntro(){document.body.className='arcade-intro';root.innerHTML=header()+`<div class="shell"><section class="arc-learn"><div class="eyebrow acid">PLAYING AS ${safe(solo.alias)} / 5 MINUTES</div><h1>READY TO PLAY?</h1>${quickStart()}<button class="btn full" data-action="begin-practice">TRY THE CONTROLS →</button><button class="text-button arc-guide-link" data-action="map">How to play</button></section></div>`;}

function controlsMarkup(){return `<div class="arc-controls"><div class="arc-dpad-wrap"><div class="arc-dpad" aria-label="Movement controls"><button class="pad-up" data-dir="up" aria-label="Move up">▲</button><button class="pad-left" data-dir="left" aria-label="Move left">◀</button><span class="pad-center"></span><button class="pad-right" data-dir="right" aria-label="Move right">▶</button><button class="pad-down" data-dir="down" aria-label="Move down">▼</button></div></div><div class="arc-action-wrap"><button class="arc-action" data-action="use" id="arc-use" aria-label="Talk to the nearest teammate or complete their job">TALK</button><span id="arc-action-hint" hidden></span></div></div>`;}
function clearMovement(){held='';keys=[];actionQueued=false;movementPointer=null;document.querySelectorAll('[data-dir]').forEach(b=>b.classList.remove('pressed'));}
function renderPractice(){
 closeModal();clearMovement();renderer?.destroy?.();practice??=newPracticeGame(solo?.character??creds?.character??0);sceneKey='practice';document.body.className='arcade-playing arcade-practice';
 root.innerHTML=header()+`<main class="arc-player-shell"><div class="arc-hud"><div><span>PRACTICE</span><b>Try the controls</b></div><div><span>POINTS</span><b>Not scored</b></div></div><div class="arc-task"><canvas id="arc-objective-icon" class="arc-item-icon" width="24" height="24" aria-hidden="true"></canvas><p id="arc-hint" role="status" aria-live="polite"></p><small id="arc-hint-detail"></small></div><div class="arc-canvas-frame"><canvas id="arc-practice-canvas" role="img" aria-label="Practice area. Move over the star, stand beside your teammate and press Ready."></canvas><div id="arc-practice-freeze" class="arc-freeze" hidden><b>GAME PAUSED</b><span>Wait for your host to resume.</span></div></div><div class="arc-bag"></div>${controlsMarkup()}<div class="arc-play-footer"><button data-action="map">HOW TO PLAY</button><span id="arc-practice-save" role="status">${solo?'Your timer has not started.':practiceStatus()}</span></div></main>`;
 updatePracticeUI();
}
function practiceStatus(){return live?.phase==='active'||live?.phase==='paused'?'The game has started. Finish practice to jump in.':'Practise while everyone joins.'}
function updateConnection(){const el=q('#arc-connection');if(el){el.textContent=connected?'CONNECTED':'RECONNECTING';el.classList.toggle('offline',!connected);}}
function updatePracticeUI(){
 if(!practice||sceneKey!=='practice')return;const step=practiceInstruction(practice);
 q('#arc-hint').textContent=step.title;q('#arc-hint-detail').textContent=step.detail;
 const paused=!solo&&live?.phase==='paused';q('#arc-practice-freeze').hidden=!paused;
 const use=q('#arc-use');use.textContent='READY';use.disabled=!step.ready||practiceSaving||paused;use.classList.toggle('ready',step.ready);
 q('#arc-action-hint').textContent=step.ready?'Press READY to finish practice.':'Move beside your teammate.';
 const save=q('#arc-practice-save');if(!solo&&save&&!practiceSaving&&save.dataset.error!=='1')save.textContent=practiceStatus();
 const icon=q('#arc-objective-icon');if(!icon.dataset.icon){icon.dataset.icon='player-'+practice.character;drawGameIcon(icon,icon.dataset.icon);}
}
async function completePractice(){
 if(practiceSaving)return;
 if(solo){practice=null;beginSolo();return;}
 practiceSaving=true;updatePracticeUI();q('#arc-practice-save').textContent='Saving your ready status…';
 try{await api('ready',{});practice=null;await fetchState(true);}
 catch(e){if(sceneKey==='practice'){const el=q('#arc-practice-save');el.textContent='Couldn’t save. Press READY to try again.';el.dataset.error='1';}}
 finally{practiceSaving=false;updatePracticeUI();}
}

function beginSolo(){practice=null;clearMovement();solo.phase='active';solo.deadline=Date.now()+solo.remaining;game=solo.game;saveSolo();sceneKey='';renderPlay();}
function saveSolo(){if(solo){solo.game=game;try{sessionStorage.setItem(gameStore,JSON.stringify(solo))}catch{}}}
function phaseNow(){return solo?solo.phase:live?.phase}
function secondsLeft(){if(solo)return solo.phase==='paused'?solo.remaining/1000:(solo.deadline-Date.now())/1000;return live?.phase==='paused'?(live.remaining||0)/1000:((live?.deadline||clock())-clock())/1000}
function renderPlay(){
 clearMovement();renderer?.destroy?.();document.body.className='arcade-playing';sceneKey='play';
 const alias=solo?.alias||creds?.alias||'PLAYER';
 root.innerHTML=header()+`<main class="arc-player-shell"><div class="arc-hud"><div><span>YOU</span><b>${safe(alias)}</b></div><div class="arc-score"><span>POINTS</span><b id="arc-score">${game?.score||0}</b></div><div><span>TIME LEFT</span><b id="arc-time">${prettyTime(secondsLeft())}</b></div></div><div class="arc-task"><canvas id="arc-objective-icon" class="arc-item-icon" width="24" height="24" aria-hidden="true"></canvas><p id="arc-hint" role="status" aria-live="polite"></p><small id="arc-hint-detail"></small></div><div class="arc-canvas-frame"><div id="arc-rush" class="arc-rush" hidden></div><canvas id="arc-canvas" role="img" aria-label="Top-down pixel agency. Use the direction pad or arrow keys to move. Collect items, then stand next to a teammate and press the action button."></canvas><div class="arc-game-message" id="game-message" role="status" aria-live="polite"></div><div id="arc-freeze" class="arc-freeze" hidden></div></div><div class="arc-bag" id="arc-bag" aria-label="Items in your bag"></div>${controlsMarkup()}<div class="arc-play-footer"><button class="arc-icon-btn" data-action="map" aria-label="Help">?</button><button class="arc-sound arc-icon-btn" data-action="sound" aria-pressed="${sound}" aria-label="Sound">${soundIcon(sound)}</button><span id="arc-role-progress" aria-label="Jobs needed for a role"></span><button data-action="pause-menu">${view==='solo'?'PAUSE':'MENU'} Ⅱ</button></div></main>`;
 renderer=createArcadeRenderer(q('#arc-canvas'));updatePlayUI();
}
// Bonus points from urgent jobs and team-ups sit outside the game state.
function myBonus(){return solo?solo.bonus||0:live?.bonus||0}
function celebrate(x){if(live)live.bonus=(live.bonus||0)+x.points;if(x.kind==='rush')note(`⚡ You got Jamie’s urgent job first! Double points: +${x.points}.`,4500);else note(`🤝 Team-up with ${x.with}! Strategy, creative, accounts and production need each other. +${x.points} each.`,4500);playNote('job');}
const teamJob=team=>({STRATEGY:'a strategy job',CREATIVE:'a creative job',ACCOUNTS:'an accounts job',PRODUCTION:'a production job'})[team.name]||'a job';
function currentRush(){
 if(solo){const r=rushAt('SOLO',300000,300000-secondsLeft()*1000);return r?{...r,left:r.left,claimedBy:(solo.rushWon||[]).includes(r.index)?solo.alias:null}:null;}
 if(!live?.rush)return null;return {...live.rush,left:live.phase==='paused'?live.rush.left:live.rush.endsAt-clock()};
}
// Jamie pops up over everything (even an open job) when an urgent job starts, so nobody misses it.
let rushSeen=-1,popTimer=0;
function jamiePop(r,stage){
 const old=q('#arc-client-pop');if(old&&(!r||r.left<=0||r.claimedBy))old.remove();
 if(!r||r.left<=0||r.claimedBy||r.index===rushSeen)return;rushSeen=r.index;
 const team=JOBS[r.type],el=document.createElement('div');old?.remove();
 el.id='arc-client-pop';el.className='arc-client-pop'+(stage?' stage':'');el.style.setProperty('--c',team.colour);el.setAttribute('role','alert');
 el.innerHTML=`<img src="/assets/client-jamie-v1.webp" alt="" width="768" height="1152"><div><small>JAMIE · YOUR CLIENT</small><b>“I need ${safe(team.name)} help. Now!”</b><span>First to finish ${teamJob(team)} gets <strong>double points</strong>.</span></div>`;
 el.addEventListener('click',()=>el.remove());document.body.append(el);
 if(stage){if(view==='host'&&hostSound)sfx('jamie')}else{playNote('jamie');try{navigator.vibrate?.([120,60,120])}catch{}}
 clearTimeout(popTimer);popTimer=setTimeout(()=>el.remove(),stage?9000:5000);
}
function updateRush(){
 const el=q('#arc-rush');if(!el)return;const r=currentRush();jamiePop(r,false);
 if(!r||r.left<=0){el.hidden=true;return;}
 const team=JOBS[r.type],mine=r.claimedBy&&r.claimedBy===(solo?.alias||creds?.alias);
 el.hidden=false;el.style.setProperty('--c',team.colour);
 el.innerHTML=r.claimedBy?`<b>${mine?'⚡ YOU GOT IT!':'⚡ TAKEN'}</b><span>${mine?'Double points':safe(r.claimedBy)+' got Jamie’s urgent job'}</span>`:`<b>⚡ URGENT: ${safe(team.name)}</b><span>First to finish ${teamJob(team)} gets double points · ${Math.ceil(r.left/1000)}s</span>`;
}
function updatePlayUI(){
 if(!game||!q('#arc-score'))return;
 if(game.work&&!modalType)openModal('work');else if(!game.work&&modalType==='work')closeModal();
 const workTime=q('#arc-work-time');if(workTime)workTime.textContent=prettyTime(secondsLeft());
 const workStatus=q('#arc-work-status');if(workStatus){const paused=phaseNow()==='paused';workStatus.textContent=paused?'GAME PAUSED · Wait for your host to resume.':!solo&&pending.length>=24?'Reconnecting. Keep this page open.':'';q('#arc-modal')?.querySelectorAll('[data-action]').forEach(b=>b.disabled=paused||secondsLeft()<=0||!solo&&pending.length>=24||b.classList.contains('wrong'));}
q('#arc-score').textContent=game.score+myBonus();updateRush();q('#arc-time').textContent=prettyTime(secondsLeft());q('#arc-time').classList.toggle('urgent',secondsLeft()<30);
 const step=nextInstruction(game,clock()),hint=q('#arc-hint'),detail=q('#arc-hint-detail');
 if(hint.textContent!==step.title)hint.textContent=step.title;if(detail.textContent!==step.detail)detail.textContent=step.detail;
 const icon=q('#arc-objective-icon');if(icon.dataset.icon!==step.icon){icon.dataset.icon=step.icon;drawGameIcon(icon,step.icon);}
 const near=nearbyJob(game),action=jobAction(game,clock()),use=q('#arc-use');use.disabled=!action.enabled;
 use.textContent=action.label;use.classList.toggle('ready',action.ready);
 use.setAttribute('aria-label',near<0?'Move beside a teammate to use this button':action.label+' with '+JOBS[near].person);
 q('#arc-action-hint').textContent=near<0?'Move beside a teammate.':action.ready?'Press this button now.':'Press TALK for help.';
 const completed=game.jobs.reduce((a,b)=>a+b,0);q('#arc-role-progress').textContent=completed<MIN_ROLE_JOBS?`Jobs ${completed}/${MIN_ROLE_JOBS}`:'Role unlocked ✓';
 const bag=q('#arc-bag');const bagKey=game.inventory.join(',');if(bag.dataset.items!==bagKey){bag.dataset.items=bagKey;bag.innerHTML='<span class="bag-label">BAG</span>'+(game.inventory.length?game.inventory.map(id=>{const p=pickupInfo(game,id),label=game.taskVersion&&p?.type===3?'DOC':id==='brief'?'MESSAGE':p?.kind==='clue'?'CLUE':p?.kind==='colour'?'COLOUR':p?.kind==='word'?'WORD':p?.icon==='battery'?'BATTERY':'SPANNER';return `<span class="bag-item" title="${safe(p?.name||'CLIENT MESSAGE')}">${itemIcon(p?.icon||'brief',p?.name||'Client message')}<small>${label}</small></span>`}).join(''):'<span class="bag-empty">Empty</span>');paintIcons();}
 bag.hidden=false;
 const freeze=q('#arc-freeze'),p=phaseNow(),blocked=p==='paused'||!solo&&pending.length>=24;
 freeze.hidden=!blocked;if(blocked)freeze.innerHTML=`<b>${p==='paused'?'GAME PAUSED':'RECONNECTING…'}</b><span>${p==='paused'?'Wait for your host to resume.':'Your progress is syncing. Keep this tab open.'}</span>`;
 updateConnection();
}
function processInput(input){
 if(sceneKey==='practice'&&practice&&!modalType){if(!solo&&live?.phase==='paused')return;applyPracticeInput(practice,input);updatePracticeUI();if(practice.complete)return completePractice();return;}
 if(!game||phaseNow()!=='active'||secondsLeft()<=0||modalType&&!(modalType==='work'&&(input.b||input.c))||!solo&&(live?.finished||pending.length>=24))return;
 const op={...input,n:++nextSeq};const events=applyArcadeInput(game,op,clock());game.seq=op.n;
 if(!solo)pending.push(op);else saveSolo();
 const done=events.find(e=>e.kind==='job'),pickup=events.find(e=>e.kind==='pickup');
 if(done&&solo){const r=rushAt('SOLO',300000,300000-secondsLeft()*1000);solo.rushWon??=[];if(r&&r.type===done.type&&!solo.rushWon.includes(r.index)){solo.rushWon.push(r.index);solo.bonus=(solo.bonus||0)+done.points;saveSolo();}}
 if(done){note((done.poster?.label||['Plan made!','Ad made!','Message delivered!','Kit fixed!'][done.type])+' +'+done.points+' points.\n'+JOBS[done.type].real,5000);playNote('job');if(done.poster)showPoster(done.poster);}
 else if(pickup){if(pickup.name==='CLIENT MESSAGE')note('Got the client’s message.');playNote('pickup');}
 else for(const event of events)if(event.kind==='note')note(event.text);

 updatePlayUI();if(modalType==='work'&&input.b)refreshWork();
}
function showPoster(poster){const el=document.createElement('div');el.className='arc-poster-pop';el.innerHTML=posterSVG(poster)+'<span>'+safe(poster.label||'YOUR WORK IS READY!')+'</span>';q('.arc-canvas-frame')?.append(el);setTimeout(()=>el.remove(),2300)}
function rebase(g,seq){
 if(!g||seq<ackSeq)return;ackSeq=seq;ackGame=structuredClone(g);pending=pending.filter(op=>op.n>seq);game=structuredClone(g);for(const op of pending)applyArcadeInput(game,op,clock());nextSeq=Math.max(seq,...pending.map(o=>o.n));
}
async function flushInputs(){
 if(sending||solo||!pending.length||phaseNow()!=='active'||live?.finished)return;sending=true;const batch=pending.slice(0,32);
 try{const data=await api('input',{ops:batch});connected=true;rebase(data.game,data.seq);for(const x of data.bonuses||[])celebrate(x);updatePlayUI();}
 catch(e){connected=false;if(e.status===409){pending=[];await fetchState(true)}else if(e.status!==429)note('Reconnecting to the room. Your game will wait if the connection drops.');}
 finally{sending=false}
}
function acceptLive(data,force=false){
 if(data.error){connected=false;return}if(live&&data.serverNow<live.serverNow)return;clockOffset=data.serverNow-Date.now();connected=true;const previous=live?.phase;live=data;
 if(data.game&&(force||!pending.length&&!sending||data.seq>ackSeq))rebase(data.game,data.seq);
 if(previous==='active'&&data.phase==='paused'){pending=[];if(data.game)rebase(data.game,data.seq);clearMovement();}
 if(view==='host'||view==='stage'){renderRoom();return}
 if(data.finished||data.phase==='finished'){practice=null;clearMovement();pending=[];if(data.game){game=structuredClone(data.game);ackSeq=data.seq;nextSeq=data.seq;}if(modalType)closeModal();if(sceneKey!=='result'){sceneKey='result';renderResult(data.profile)}updateVote();return}
 if(data.phase==='lobby'){if(!data.ready){if(sceneKey!=='practice')renderPractice();return;}practice=null;if(sceneKey!=='waiting'){sceneKey='waiting';renderWaiting()}else q('#arc-wait-count')&&(q('#arc-wait-count').textContent=data.count,q('#arc-wait-word').textContent=data.count===1?'PLAYER':'PLAYERS');return}
 if(!data.ready&&data.seq===0){if(sceneKey!=='practice')renderPractice();else updatePracticeUI();return;}
 practice=null;
 if(game&&sceneKey!=='play')renderPlay();updatePlayUI();
}
async function fetchState(force=false){try{acceptLive(await api('state?room='+roomCode),force);updateConnection()}catch(e){connected=false;updateConnection();if(!live){root.innerHTML=header()+`<div class="shell"><div class="waiting"><h1>COULDN’T JOIN<br>THE ROOM.</h1><div class="error-banner">${safe(e.message)}</div><button class="btn" data-action="retry">TRY AGAIN ↻</button><a class="text-button" href="/">Back to home</a></div></div>`}updatePlayUI()}}
function connectRoom(){
 fetchState(true);clearInterval(poller);
 poller=setInterval(()=>fetchState(),1500);
}
function renderWaiting(){document.body.className='arcade-waiting';root.innerHTML=header()+`<div class="shell"><section class="arc-learn arc-wait-learn"><div class="eyebrow acid">PLAYING AS ${safe(creds.alias)}</div><h1>YOU’RE IN.</h1><p class="arc-wait-instruction">Wait for the game to start. Keep this page open.</p><div class="label-pill"><span id="arc-wait-count">${live.count}</span> <span id="arc-wait-word">${live.count===1?'PLAYER':'PLAYERS'}</span> IN</div><button class="text-button arc-guide-link" data-action="map">How to play</button></section></div>`;}


function roomControls(){
 if(view!=='host')return '';const p=live.phase,ready=live.readyCount||0,waiting=live.count-ready;
 return `<div class="arc-host-controls">${p==='lobby'?`<button class="btn" data-action="control" data-value="start" ${!live.count||waiting?'disabled':''}>${waiting?waiting+' STILL PRACTISING':'START THE GAME →'}</button>${waiting?'<button class="text-button" data-action="control" data-value="start-anyway">Start anyway</button>':''}`:p==='active'?'<button class="btn secondary" data-action="control" data-value="pause">PAUSE EVERYONE Ⅱ</button><button class="btn" data-action="control" data-value="finish">END GAME + SHOW JOB ROLES →</button>':p==='paused'?'<button class="btn" data-action="control" data-value="resume">RESUME EVERYONE →</button><button class="btn secondary" data-action="control" data-value="finish">END GAME + SHOW JOB ROLES →</button>':'<button class="btn secondary" data-action="new-room">NEW GAME ↗</button><a class="text-button" href="/">Home</a>'}${p==='lobby'?'<a class="text-button" href="/?view=roles">Skip to job roles</a><button class="text-button" data-action="copy">Copy player link</button>':''}<button class="text-button arc-host-sound" data-action="host-sound" aria-pressed="${hostSound}">${hostSound?'♪ Sound on':'♪ Sound off'}</button><button class="text-button" data-action="fullscreen">${document.fullscreenElement?'Exit full screen':'Full screen ⛶'}</button></div>`;
}

function leaderboard(){return `<div class="arc-leaderboard"><div class="eyebrow">${live.phase==='finished'?'FINAL':'LIVE'} LEADERBOARD</div>${live.leaderboard.length?live.leaderboard.slice(0,live.phase==='finished'?10:8).map((p,i)=>`<div class="arc-rank-row"><span class="arc-rank-num">${String(i+1).padStart(2,'0')}</span><span class="mini-head">${character(p.character)}</span><div><b>${safe(p.alias)}</b><small>${p.completed} ${p.completed===1?'JOB':'JOBS'} DONE</small></div><strong>${p.score.toLocaleString('en-GB')}</strong></div>`).join(''):'<p class="fine">Players appear when they join.</p>'}</div>`}
function highlights(){if(live.phase!=='finished')return `<div class="arc-wall"><div class="eyebrow">CAMPAIGN WALL <b>${live.launch.jobs}</b></div>${live.events.length?`<div class="arc-wall-grid">${wallTiles(live.events,9)}</div>`:'<p class="arc-feed-empty">Every finished job adds a piece here.</p>'}</div>`;
 return `<div class="arc-highlights"><div class="eyebrow">PLAYER HIGHLIGHTS</div>${live.events.length?live.events.slice(0,3).map(e=>`<article class="arc-highlight" style="--event-colour:${JOBS[e.type].colour}">${e.poster?`<div class="arc-highlight-poster">${posterSVG(e.poster)}</div>`:`<span class="arc-highlight-symbol">${['⌕','✳','✉','⚒'][e.type]}</span>`}<div><b>${safe(e.alias)}</b><p>${safe(e.detail)}</p><span>+${e.points} POINTS / ${JOBS[e.type].role.toUpperCase()}</span></div></article>`).join(''):'<div class="arc-highlight-empty">No jobs finished.</div>'}</div>`}
const list=items=>`<ul>${items.map(t=>`<li>${safe(t)}</li>`).join('')}</ul>`;
const crewName=index=>cast[roleLessons[roles[index].key].crew].name;
function roleStory(lesson,i){return `<blockquote class="arc-role-voice">“${safe(lesson.voice)}”<cite>${crewName(i)}</cite></blockquote><p class="arc-role-love"><b>You’d love it if</b> ${safe(lesson.loveIf)}</p><p class="arc-role-skills">${lesson.skills.map(t=>`<span>${safe(t)}</span>`).join('')}</p><p class="arc-role-start"><b>Start as:</b> ${safe(lesson.startAs)}</p>`;}
function roleLessonBody(index){
 const lesson=roleLessons[roles[index].key];
 return `<div class="arc-lesson-body">${roleStory(lesson,index)}</div>`;
}
// Closing big screen: the campaign the room made, the crew, a deeper look, then scores.
const SLIDE_DEFS={pitch:['VOTE ON YOUR PHONES','THE PITCH.','THE PITCH'],campaign:['GAME OVER','YOUR CAMPAIGN.','THE CAMPAIGN'],team:[view==='roles'?'THE FOUR AGENCY JOBS':'YOUR ROLE IS ON YOUR PHONE','MEET THE TEAM.','THE TEAM'],deeper:['WHAT THE JOBS ARE REALLY LIKE','GO DEEPER.','GO DEEPER'],scores:['GAME OVER','FINAL SCORES.','SCORES']};
const slideKeys=()=>view==='roles'?['team','deeper']:[...(live?.ads?.length?['pitch']:[]),'campaign','team','deeper','scores'];
let finaleSlide=0;
const slideCount=()=>slideKeys().length;
async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Press F11 (or Ctrl+Cmd+F on a Mac) for full screen.')}}
// While presenting full screen, hide the host controls while keeping the experience credit visible.
document.addEventListener('fullscreenchange',()=>{const on=!!document.fullscreenElement;document.documentElement.classList.toggle('is-presenting',on);document.querySelectorAll('[data-action=fullscreen]').forEach(b=>b.textContent=b.classList.contains('arc-present')?(on?'EXIT ⛶':'PRESENT ⛶'):(on?'Exit full screen':'Full screen ⛶'));});
function renderRoles(){document.body.className='arcade-room arcade-stage arcade-roles';sceneKey='room-result';finaleSlide=0;root.innerHTML=header()+roomFinale(true);}
function setSlide(n,share=true){
 finaleSlide=Math.max(0,Math.min(slideCount()-1,n));const shell=q('.arc-room-finale');if(!shell||!shell.dataset)return;
 const key=slideKeys()[finaleSlide];shell.dataset.slide=key;const [eyebrow,title]=SLIDE_DEFS[key];
 const e=q('#arc-slide-eyebrow'),t=q('#arc-slide-title');if(e)e.textContent=eyebrow;if(t)t.textContent=title;
 document.querySelectorAll('.arc-slide-tab').forEach((b,i)=>b.setAttribute('aria-current',i===finaleSlide?'step':'false'));
 if(share)try{localStorage.setItem('wr-arc-slide-'+roomCode,String(finaleSlide))}catch{}
}
// Campaign pieces: every finished job adds one to the wall.
const pieceOf=e=>e.poster||{kind:['insight','ad','approval','live'][e.type],text:e.detail,title:'YOUR WAY'};
const votesFor=id=>(live?.ads||[]).find(a=>a.id===id)?.votes||0;
function pitchLine(){const ads=(live?.ads||[]).filter(a=>a.votes).sort((a,b)=>b.votes-a.votes);if(!(live?.ads||[]).length)return '';return ads.length?`<b>PITCH VOTE</b> Leading: ${safe(ads[0].alias)}’s ad · ${ads[0].votes} ${ads[0].votes===1?'vote':'votes'}. Vote for the best ad on your phone.`:'<b>PITCH VOTE</b> Vote for the best ad on your phone.';}
const wallTile=(e,i,label=e.poster?.taskTitle)=>`<figure class="arc-wall-tile" style="--c:${JOBS[e.type].colour}">${e.type===1&&votesFor(e.id)?`<i class="arc-vote-badge">♥ ${votesFor(e.id)}</i>`:''}<button data-action="view-work" data-value="${i}" aria-label="View work by ${safe(e.alias)}">${posterSVG({...pieceOf(e),by:e.alias})}</button><figcaption>${safe(e.alias)}${label?`<small>${safe(label).replace(/_/g,'_<wbr>')}</small>`:''}</figcaption></figure>`;
// The pitch: every ad full size on the big screen, one at a time, while the room votes.
let reelBase=Date.now(),reelVotes=-1;
const AD_KIND=['poster','billboard','social post'];
function pitchReel(){
 const ads=live?.ads||[];if(!ads.length)return '';
 const i=Math.floor((Date.now()-reelBase)/5000)%ads.length,a=ads[i],voted=ads.reduce((n,x)=>n+x.votes,0);
 return `<div class="arc-reel"><figure class="arc-reel-main" data-ad="${i}">${posterSVG({...a.poster,by:a.alias})}</figure><div class="arc-reel-side"><small>AD ${i+1} OF ${ads.length}</small><h2>${safe(a.alias)}’s ${AD_KIND[(a.poster?.pattern||0)%3]}</h2><p class="arc-reel-line">“${safe(a.poster?.title||'')}”</p><p class="arc-reel-votes${a.votes?'':' none'}">♥ ${a.votes} ${a.votes===1?'vote':'votes'}</p><p class="arc-reel-cta">Vote for your favourite on your phone. You can’t vote for your own.</p><p class="arc-reel-count"><b>${voted}</b> of ${live.count} voted</p></div><div class="arc-reel-strip">${ads.map((x,j)=>`<button data-action="reel" data-value="${j}" class="${j===i?'on':''}" aria-label="Show ${safe(x.alias)}’s ad">${posterSVG({...x.poster,by:x.alias})}${x.votes?`<i>♥ ${x.votes}</i>`:''}</button>`).join('')}</div></div>`;
}
function updateReel(){
 const el=q('#arc-reel');if(!el)return;setHTML(el,pitchReel());
 const total=(live?.ads||[]).reduce((n,x)=>n+x.votes,0);if(reelVotes>=0&&total>reelVotes&&view==='host'&&hostSound)sfx('pickup');reelVotes=total;
}
const wallTiles=(events,n)=>events.slice(0,n).map((e,i)=>wallTile(e,i)).join('');
// End of the game: every piece of work, grouped by project like a real agency folder.
// Each new go at the same project is the next version, named the way real files end up.
const VERSIONS=['V1','V2','V3_FINAL','V4_FINAL_final','V5_FINAL_actual_final','V6_USE_THIS_ONE','V7_FINAL_FINAL_v2','V8_ok_THIS_one'];
const versionName=(title,n)=>title.replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'')+'_'+(VERSIONS[n]||'V'+(n+1)+'_FINAL_promise');
function finalWall(events){
 const all=events.map((e,i)=>({e,i})),groups=new Map();
 for(const x of [...all].reverse()){const title=x.e.poster?.taskTitle||JOBS[x.e.type].role;const key=x.e.type+'|'+title;if(!groups.has(key))groups.set(key,{title,type:x.e.type,items:[]});groups.get(key).items.push(x);}
 const names={};for(const g of groups.values())g.items.forEach((x,n)=>names[x.i]=versionName(g.title,n));
 const faves=all.filter(x=>x.e.type===1&&votesFor(x.e.id)).sort((a,b)=>votesFor(b.e.id)-votesFor(a.e.id)||a.i-b.i).slice(0,4);
 const top=faves.length?`<section class="arc-project arc-faves"><h3><span>♥ CROWD FAVOURITES</span>The ads you voted for</h3><div class="arc-campaign-grid">${faves.map(x=>wallTile(x.e,x.i,names[x.i])).join('')}</div></section>`:'';
 const folders=[...groups.values()].sort((a,b)=>a.type-b.type).map(g=>`<section class="arc-project" style="--c:${JOBS[g.type].colour}"><h3><span>${JOBS[g.type].name}</span>${safe(g.title)}<small>${g.items.length} ${g.items.length===1?'version':'versions'}</small></h3><div class="arc-campaign-grid">${g.items.map((x,n)=>wallTile(x.e,x.i,names[x.i])).join('')}</div></section>`).join('');
 return top+folders;
}
function campaignSummary(){const n=[0,0,0,0];for(const p of live.players)for(let t=0;t<4;t++)n[t]+=p.game?.jobs?.[t]||0;const words=[['strategy plan','strategy plans'],['creative piece','creative pieces'],['client agreement','client agreements'],['production plan','production plans']];return [1,0,2,3].filter(t=>n[t]).map(t=>`<span style="color:${JOBS[t].colour}">${n[t]} ${words[t][n[t]===1?0:1]}</span>`).join('<i>·</i>');}
function setHTML(el,html){if(el&&el._html!==html){el.innerHTML=html;el._html=html;}}
function roleLearning(ownRole=-1,partial=false){return `<section class="arc-role-learning" id="meet-team" aria-labelledby="arc-learning-title"><h2 id="arc-learning-title">MEET THE TEAM.</h2><p>Tap a job to find out more.</p><div class="arc-role-lessons">${roles.map((r,i)=>`<details class="arc-role-lesson" style="--lesson-color:${r.color}" ${i===ownRole?'open':''}><summary><span class="mini-head arc-lesson-head" aria-hidden="true">${character(roleLessons[r.key].crew)}</span><span><b>${safe(roleLessons[r.key].title)}</b><small>WITH ${crewName(i)} · ${safe(r.name)}${i===ownRole?(partial?' · YOUR JOB IN THE GAME':' · YOUR GAME ROLE'):''}</small></span><span class="arc-lesson-toggle" aria-hidden="true">+</span></summary>${roleLessonBody(i)}</details>`).join('')}</div><div class="arc-learning-close"><strong>Which one sounds most like you?</strong></div><a class="text-button" href="/">Back to home →</a></section>`;}
function roomFinale(standalone=false){
 const key=slideKeys()[Math.min(finaleSlide,slideCount()-1)],[eyebrow,title]=SLIDE_DEFS[key];
 const team=roles.map((r,i)=>{const l=roleLessons[r.key];return `<article class="arc-stage-lesson" style="--lesson-color:${r.color}"><div class="arc-crew-portrait">${character(l.crew)}</div><b class="arc-crew-name">${crewName(i)}</b><h2>${safe(l.title)}</h2><small class="arc-stage-alias">${safe(r.name)}</small><p class="arc-crew-line">${safe(l.oneLiner)}</p><p class="arc-stage-role-count" id="arc-role-count-${i}"></p></article>`}).join('');
 const deeper=roles.map((r,i)=>{const l=roleLessons[r.key];return `<article class="arc-deeper" style="--lesson-color:${r.color}"><header><span class="mini-head">${character(l.crew)}</span><div><b>${safe(l.title)}</b><small>${safe(l.oneLiner)}</small></div></header>${roleStory(l,i)}</article>`}).join('');
 return `<div class="shell arc-room-shell arc-room-finale" data-slide="${key}"><div class="arc-room-heading"><div><span class="eyebrow acid" id="arc-slide-eyebrow">${eyebrow}</span><h1 id="arc-slide-title">${title}</h1></div><div class="arc-finale-right"><nav class="arc-slide-nav" aria-label="Closing slides"><button data-action="slide" data-value="prev" aria-label="Previous slide">←</button>${slideKeys().map((k,i)=>`<button class="arc-slide-tab" data-action="slide" data-value="${i}" aria-current="${i===finaleSlide?'step':'false'}">${i+1}. ${SLIDE_DEFS[k][2]}</button>`).join('')}<button data-action="slide" data-value="next" aria-label="Next slide">→</button><button class="arc-present" data-action="fullscreen" aria-label="Present full screen">${document.fullscreenElement?'EXIT ⛶':'PRESENT ⛶'}</button></nav>${standalone?'':`<div class="arc-room-clock"><span>ROOM POINTS</span><b id="arc-room-clock">${live.launch.score.toLocaleString('en-GB')}</b></div>`}</div></div>
 ${standalone?'':`<section class="arc-slide arc-slide-pitch" aria-label="The pitch"><div id="arc-reel"></div></section><section class="arc-slide arc-slide-campaign" aria-label="Your campaign"><p class="arc-campaign-brief"><b>THE BRIEF</b>${BRIEF_LINE} <strong>Did we answer it?</strong></p><p class="arc-campaign-summary" id="arc-campaign-summary"></p><p class="arc-pitch" id="arc-pitch"></p><div class="arc-campaign-projects" id="arc-campaign-wrap" tabindex="0" aria-label="All the work, by project"></div></section>`}
 <section class="arc-slide arc-slide-team" aria-label="Meet the team"><div class="arc-stage-lessons">${team}</div><p class="arc-finale-question">Which one sounds most like you?</p></section>
 <section class="arc-slide arc-slide-deeper" aria-label="Go deeper"><div class="arc-deeper-grid">${deeper}</div><p class="arc-ways-in">${safe(waysIn)}</p></section>
 ${standalone?'':`<section class="arc-slide arc-slide-scores" aria-label="Final scores"><div class="arc-final-score-grid"><div id="arc-leaderboard-wrap"></div><div id="arc-highlights-wrap"></div></div></section>`}
<div id="arc-room-controls"></div></div>`;}
// Opening screens the host talks through before the QR code goes up.
const BRIEF_LINE='Get students to trust a new £160 trainer and try a pair at Saturday’s pop-up.';
const INTRO_STEPS=3;
function introStep(){try{return Math.min(INTRO_STEPS,Number(sessionStorage.getItem('wr-arc-intro-'+roomCode)||0))}catch{return INTRO_STEPS}}
function setIntro(n){try{sessionStorage.setItem('wr-arc-intro-'+roomCode,String(Math.max(0,Math.min(INTRO_STEPS,n))))}catch{}if(live)renderRoom();}
function introScreen(step){
 const mins=Math.round((live?.duration||300)/60),gloss=t=>`<p class="arc-gloss">${t}</p>`;
 const nav=view==='brief'?`<div class="arc-intro-nav"><a class="btn" href="/?view=host">HOST A GAME →</a><a class="text-button" href="/">Back to home</a><span class="arc-intro-count">BRIEF PREVIEW</span></div>`:`<div class="arc-intro-nav">${step>0?'<button class="btn secondary" data-action="intro" data-value="prev">← BACK</button>':''}<button class="btn" data-action="intro" data-value="next">${step<INTRO_STEPS-1?'NEXT →':'SHOW THE QR CODE →'}</button>${step<INTRO_STEPS-1?'<button class="text-button" data-action="intro" data-value="skip">Skip to QR code</button>':''}<span class="arc-intro-count">${step+1} / ${INTRO_STEPS}</span></div>`;
 const team=[['Strategy','Works out who to talk to and what to say to them.'],['Creative','Comes up with the idea and makes the ads.'],['Account management','Looks after the brand and keeps everyone on the same page.'],['Production','Makes it actually happen: kit, crew, money and time.']];
 if(step===0)return `<div class="shell arc-brief arc-intro"><div class="eyebrow acid">WELCOME</div><h1>YOU WORK AT AN<br><span class="acid">AGENCY NOW.</span></h1><p class="arc-intro-lead">Brands that make trainers, games or drinks don’t make their own ads. They pay an agency to get people to notice them, trust them and buy. That’s marketing.</p><div class="arc-crew-cards">${roles.map((r,i)=>`<article style="--c:${r.color}"><div class="arc-crew-art">${character(roleLessons[r.key].crew,'reacting')}</div><div class="arc-crew-copy"><small>${crewName(i)}</small><b>${team[i][0]}</b><p>${team[i][1]}</p></div></article>`).join('')}</div>${nav}</div>`;
 if(step===1)return `<div class="shell arc-brief arc-intro arc-client-brief"><div class="eyebrow acid">THE BRIEF</div><h1>MEET YOUR CLIENT.<br><span class="acid">HERE’S THE BRIEF.</span></h1><p class="arc-intro-lead">A brief is the client telling the agency what they need. Jamie has brought you hers.</p><div class="arc-brief-layout"><section class="arc-client-intro" aria-labelledby="arc-client-name"><div class="arc-client-portrait"><img src="/assets/client-jamie-ug-v2.webp" alt="Jamie, founder of UNDERGROUND, holding an open box with the cream-and-orange trainer" width="768" height="1152" fetchpriority="high" decoding="async"></div><div class="arc-client-voice"><span class="arc-client-tag">YOUR CLIENT</span><h2 id="arc-client-name">JAMIE</h2><p class="arc-client-role">Founder, UNDERGROUND</p><blockquote>“These are our first trainers. £160 is a big ask from a new brand. Help us give students a reason to try them.”</blockquote><p class="arc-client-explain">Your job: get students to give UNDERGROUND a chance.</p></div></section><div class="arc-brief-doc"><header><span>CLIENT BRIEF</span><div class="arc-client-brand"><img src="${UG_MONOGRAM_URL}" alt="" width="56" height="31" aria-hidden="true"><b>UNDERGROUND</b></div><i>£160</i></header><div class="arc-product"><div class="arc-product-hero">${COLOURWAYS.map(c=>trainerSVG(c)).join('')}</div><div class="arc-product-copy"><dt>THE PRODUCT</dt><dd>A new trainer, designed with young local creators.</dd><div class="arc-colourways">${COLOURWAYS.map(c=>`<span title="${c.name}">${trainerSVG(c)}<small>${c.name}</small></span>`).join('')}</div></div></div><dl><div><dt>WHO WE’RE TALKING TO</dt><dd>Students who want their own style, not what everyone else is wearing.</dd></div><div><dt>WHAT’S IN THE WAY</dt><dd>£160 is a lot to risk on a brand you’ve never tried.</dd></div><div><dt>A WIN LOOKS LIKE</dt><dd>They trust it enough to try a pair at Saturday’s pop-up.</dd></div><div><dt>DEADLINE</dt><dd>The campaign goes live in ${mins} minutes.</dd></div></dl></div></div><p class="arc-brief-words"><span><b>Client</b> = the brand paying the agency</span><span><b>Audience</b> = who you want to reach</span><span><b>Colourway</b> = same shoe, different colours</span><span><b>Pop-up</b> = a shop open for a few days</span></p>${nav}</div>`;
 return `<div class="shell arc-brief arc-intro"><div class="eyebrow acid">HOW IT WORKS</div><h1>YOUR PHONE IS<br><span class="acid">YOUR DESK.</span></h1><ol class="arc-how-steps arc-how-visual"><li><figure><canvas id="arc-intro-map" aria-label="The agency map with four team rooms"></canvas></figure><b>1</b><div><strong>1. Walk in</strong><span>Pick a team’s room on the map. Any order you like.</span></div></li><li><figure class="arc-how-items">${itemIcon('clue','Research note')}${itemIcon('paint','Colour tin')}${itemIcon('word','Word tile')}${itemIcon('spanner','Kit list')}</figure><b>2</b><div><strong>2. Grab what you need</strong><span>Some jobs need research or kit first. It flashes on the map.</span></div></li><li><figure class="arc-how-pick"><small>THE PROMISE</small><span class="ok">Wear it your way ✓</span><span class="no">Most expensive wins ✗</span></figure><b>3</b><div><strong>3. Make the call</strong><span>Stand next to a teammate and press START. Answer 3 quick questions. Get one wrong and they’ll tell you why.</span></div></li><li><figure class="arc-how-land">${posterSVG({kind:'ad',title:'YOUR WAY',colour:'#b69bf4',pattern:2})}${posterSVG({kind:'approval',text:'Final ad approved'})}</figure><b>4</b><div><strong>4. See it land</strong><span>Your finished work appears up here for everyone to see.</span></div></li></ol><p class="arc-intro-lead">Points for every job. Finish 2 jobs and your phone tells you which role suits you.</p><p class="arc-intro-extras"><span>⚡ <b>Urgent jobs:</b> Jamie flashes up a team that needs help. First to finish there gets double points.</span><span>🤝 <b>Team-ups:</b> finish a job just after someone in a different team and you both get a bonus.</span><span>🗳 <b>Pitch:</b> at the end, vote for the best ad.</span></p>${nav}</div>`;
}
function updateStageRush(){
 const el=q('#arc-stage-rush');if(!el)return;const r=live?.rush,left=r?(live.phase==='paused'?r.left:r.endsAt-clock()):0;
 jamiePop(r&&{...r,left},true);if(!r||left<=0){el.hidden=true;return;}const team=JOBS[r.type];el.hidden=false;el.style.setProperty('--c',team.colour);
 setHTML(el,r.claimedBy?`<b>⚡ ${safe(r.claimedBy)} GOT JAMIE’S URGENT JOB</b><span>Double points</span>`:`<b>⚡ URGENT: ${safe(team.name)}</b><span>First to finish ${teamJob(team)} gets double points · ${Math.ceil(left/1000)}s</span>`);
}
// Jamie reacts to whatever just happened: urgent jobs, team-ups and finished work.
const JAMIE={
 insight:['That’s exactly what I needed to hear.','Proof over hype. I like it.','So it’s a trust thing. Makes sense.'],
 ad:['Ooh, I like that one!','That’s so us.','I’d stop scrolling for that.','Hmm… bold. I think I love it?'],
 approval:['Thanks for keeping me in the loop.','Deal. Let’s do it.','Fair. I can live with that.'],
 live:['It’s actually happening!','Sorted already? You lot are quick.','Phew. Crisis avoided.'],
 idle:['I’m watching. No pressure… £160 is riding on this.','Every job gets us closer to launch day.','Who’s going to surprise me next?']
};
function jamieLine(){
 const now=live.serverNow||clock(),r=live.rush,pick=(list,key)=>list[[...String(key)].reduce((a,c)=>a+c.charCodeAt(0),0)%list.length];
 const latest=[...(live.events||[]).map(e=>({t:e.created_at,e})),...(live.moments||[]).map(m=>({t:m.created_at,m}))].sort((a,b)=>b.t-a.t)[0];
 if(latest&&now-latest.t<9000){
  if(latest.m?.type===-1)return `${latest.m.alias} sorted my urgent job. Lifesaver!`;
  if(latest.m?.type===-2)return `${latest.m.alias} and ${latest.m.info?.with} teamed up. That’s how campaigns get made.`;
  const kind=latest.e.poster?.kind||['insight','ad','approval','live'][latest.e.type];return `${latest.e.alias}: ${pick(JAMIE[kind]||JAMIE.idle,latest.e.id)}`;
 }
 if(r&&!r.claimedBy)return `I need ${JOBS[r.type].role.toLowerCase()} help, fast! First one done gets double points.`;
 return pick(JAMIE.idle,Math.floor(now/20000));
}
function renderRoom(){
 document.body.className='arcade-room arcade-stage'+(view==='host'?' arcade-host':'');
 const key=live.phase==='lobby'?(view==='host'&&introStep()<INTRO_STEPS?'intro-'+introStep():'lobby'):live.phase==='finished'?'room-result':'room-playing';
 const structural=sceneKey!==key;if(structural){if(key==='room-result'&&sceneKey==='room-playing'&&view==='host'&&hostSound){music(false);sfx('buzzer');setTimeout(()=>sfx('fanfare'),900);}sceneKey=key;
  if(key.startsWith('intro')){root.innerHTML=header()+introScreen(introStep())+'<div id="arc-room-controls"></div>';paintIcons();const m=q('#arc-intro-map');if(m)createRoomRenderer(m).draw([],[],clock());}
  else if(key==='lobby'){root.innerHTML=header()+`<div class="shell"><section class="arc-room-lobby"><div><div class="eyebrow acid">GROUP GAME / ${Math.round(live.duration/60)} MINUTES</div><h1>GET THE<br><span class="acid">CREW IN.</span></h1><p>Scan the code to join, then try the controls.</p><p class="arc-lobby-brief"><b>THE BRIEF</b>${BRIEF_LINE}</p><div class="arc-join-count"><b id="arc-joined">0</b><span>PLAYERS IN<br><strong id="arc-ready">0 READY</strong></span></div><div class="player-cloud" id="arc-player-cloud"></div></div><div class="qr-box">${qr(playerLink())}<div class="mono" style="margin-top:14px">ROOM CODE</div><div class="room-display">${safe(roomCode)}</div></div></section><div id="arc-room-controls"></div></div>`;}
  else if(key==='room-result'){renderer?.destroy?.();renderer=null;root.innerHTML=header()+roomFinale();}
  else root.innerHTML=header()+`<div class="shell arc-room-shell arc-live"><div class="arc-live-top"><h1>THE CREW’S ON IT.</h1><div class="arc-dept-bars" id="arc-dept-bars"></div><div class="arc-live-meta">${mccannStageCredit()}<div class="arc-room-clock"><b id="arc-room-clock">0:00</b></div></div></div><div class="arc-live-grid"><div class="arc-canvas-frame arc-stage-canvas"><div id="arc-stage-rush" class="arc-rush arc-stage-rush" hidden></div><canvas id="arc-stage-canvas" role="img" aria-label="Every player on the shared agency map"></canvas></div><aside><div class="arc-jamie"><img src="/assets/client-jamie-v1.webp" alt="Jamie, the client" width="768" height="1152"><div><small>JAMIE · YOUR CLIENT</small><p id="arc-jamie-line">I’m watching. No pressure.</p></div></div><div id="arc-leaderboard-wrap"></div><div id="arc-highlights-wrap"></div></aside></div><div id="arc-room-controls"></div></div>`;
  if(key==='room-playing'){renderer=createRoomRenderer(q('#arc-stage-canvas'));}
 }
 if(key==='lobby'){q('#arc-joined').textContent=live.count;q('#arc-ready').textContent=(live.readyCount||0)+' READY TO PLAY';{const cap=view==='host'||view==='stage'?((globalThis.innerHeight||900)<820?12:24):99,list=[...live.players].reverse(),shown=list.slice(0,cap);setHTML(q('#arc-player-cloud'),shown.map(p=>`<span class="alias-chip character-chip${p.ready?' is-ready':''}"><span class="mini-head">${character(p.character)}</span>${safe(p.alias)}${p.ready?'<small class="arc-ready-tag">✓</small>':''}</span>`).join('')+(list.length>cap?`<span class="alias-chip arc-more">+${list.length-cap} more</span>`:''));}}
 else if(!key.startsWith('intro')){setHTML(q('#arc-leaderboard-wrap'),leaderboard());setHTML(q('#arc-highlights-wrap'),highlights());if(key==='room-result'){setHTML(q('#arc-pitch'),pitchLine());setHTML(q('#arc-campaign-wrap'),live.events.length?finalWall(live.events):'<p class="arc-feed-empty">No jobs were finished this time.</p>');setHTML(q('#arc-campaign-summary'),campaignSummary());roles.forEach((r,i)=>{const count=live.players.filter(p=>p.profile?.role===i).length;q('#arc-role-count-'+i).textContent=count+' '+(count===1?'PLAYER':'PLAYERS')+' IN THIS ROLE';});}else{const jl=q('#arc-jamie-line');if(jl&&jl.textContent!==jamieLine())jl.textContent=jamieLine();const done=[0,1,2,3].map(t=>live.players.reduce((a,p)=>a+(p.game?.jobs?.[t]||0),0)),top=Math.max(4,...done);q('#arc-dept-bars').innerHTML=JOBS.map((j,t)=>`<div style="--c:${j.colour}"><span>${j.name}</span><strong>${done[t]}</strong><div class="arc-bar"><div style="width:${done[t]/top*100}%"></div></div></div>`).join('');}}
 q('#arc-room-controls').innerHTML=roomControls();
}
async function control(action){if(busy)return;if(action==='finish'&&!window.confirm('End the game for everyone and show the job roles?'))return;
 const allowUnready=action==='start-anyway';if(allowUnready&&!window.confirm(`${live.count-(live.readyCount||0)} players are still practising. Start the clock anyway?`))return;
 busy=true;try{await api('control',{action:allowUnready?'start':action,allowUnready});await fetchState(true)}catch(e){toast(e.message)}finally{busy=false}}

async function finishSelf(){
 if(busy)return;busy=true;held='';keys=[];
 try{if(solo){closeModal();solo.phase='finished';saveSolo();sceneKey='result';renderResult(arcadeProfile(game));}
 else{closeModal();await flushInputs();if(pending.length){toast('Wait for your last moves to sync, then finish.');return}await api('finish',{});await fetchState(true)}}catch(e){toast(e.message)}finally{busy=false}
}
// Pitch vote: after the game, players vote for the best ad that someone else made.
function updateVote(){
 if(solo||!live)return;let el=q('#arc-vote');
 if(!el){const anchor=q('#meet-team');if(!anchor||!anchor.parentElement)return;el=document.createElement('section');el.id='arc-vote';el.className='arc-vote';anchor.parentElement.insertBefore(el,anchor);}
 const ads=(live.ads||[]).filter(a=>!a.mine),cta=q('#arc-vote-cta');
 if(cta){cta.hidden=!ads.length;const pick=ads.find(a=>a.id===live.myVote);setHTML(cta,pick?`<b>✓ YOU VOTED</b><span>For ${safe(pick.alias)}’s ad. The big screen shows the winner.</span><i>CHANGE VOTE ↓</i>`:`<b>🗳 PITCH TIME</b><span>Vote for the best ad. The winner goes up on the big screen.</span><i>VOTE NOW ↓</i>`);cta.classList.toggle('done',!!pick);}
 if(!ads.length){el.hidden=true;return;}el.hidden=false;
 setHTML(el,`<h2>PITCH TIME.</h2><p>${live.myVote?'Vote counted. Change it any time.':'Vote for the best ad someone else made. The big screen shows the winner.'}</p><div class="arc-vote-grid">${ads.map(a=>`<button class="arc-vote-ad${live.myVote===a.id?' picked':''}" data-action="vote" data-value="${safe(a.id)}" aria-pressed="${live.myVote===a.id}">${posterSVG({...a.poster,by:a.alias})}<span>${safe(a.alias)}</span>${live.myVote===a.id?'<b>✓ YOUR VOTE</b>':''}</button>`).join('')}</div>`);
}
function renderResult(profile){
 document.body.className='arcade-result';sceneKey='result';const g=game||live?.game,alias=solo?.alias||creds?.alias||'PLAYER',ci=g?.character??0;
 if(!profile){const jobs=g?.jobs||[0,0,0,0],done=jobs.reduce((a,b)=>a+b,0),lean=done?jobs.indexOf(Math.max(...jobs)):-1;
  root.innerHTML=header()+`<div class="shell"><div class="waiting arc-no-role"><h1>${done?'GOOD START.':'TIME’S UP.'}</h1><p>${done?`You finished ${done} job and earned ${(g?.score||0)+myBonus()} points.`:'You didn’t finish a job this time. No worries.'}</p>${lean>=0?`<p>You worked in <b style="color:${roles[lean].color}">${safe(roleLessons[roles[lean].key].title)}</b>. Find out what that job is like below.</p>`:'<p>Every agency needs these four jobs. Find out what each one does below.</p>'}${solo?`<p>Complete ${MIN_ROLE_JOBS} jobs in a game to unlock your role card.</p><div class="arc-no-role-actions"><button class="btn" data-action="solo">PLAY AGAIN →</button><a class="text-button" href="#meet-team">Explore the roles ↓</a></div>`:'<div class="arc-no-role-actions"><a class="btn" href="#meet-team">EXPLORE THE ROLES ↓</a></div>'}</div>${roleLearning(lean,true)}</div>`;return}

 const r=roles[profile.role],jobs=profile.completed,total=profile.score+myBonus();
 root.innerHTML=header()+`<div class="shell"><section class="arc-result-grid"><div class="arc-result-copy"><div class="eyebrow acid">${safe(alias)} / GAME COMPLETE</div><h1>${r.name}</h1><span class="arc-result-job" style="color:${r.color}">${r.job}</span><p>${r.description}</p><div class="arc-result-stats"><div><b>${total.toLocaleString('en-GB')}</b><span>POINTS</span></div><div><b>${jobs}</b><span>${jobs===1?'JOB':'JOBS'} COMPLETED</span></div></div><div class="arc-result-evidence"><span>THE WORK YOU CHOSE</span>${JOBS.map((j,i)=>`<div><b style="color:${j.colour}">${j.role}</b><span>${profile.jobs[i]} ${profile.jobs[i]===1?'job':'jobs'}</span></div>`).join('')}</div><p class="fine">Just a game, not a careers test.</p><div class="reveal-actions"><button class="btn" data-action="download-role">SAVE ROLE CARD ↓</button><a class="btn secondary" href="#meet-team">WHAT DOES MY ROLE DO? ↓</a></div></div><div class="arc-result-card" id="arc-role-card" style="--role:${r.color}"><div class="arc-card-brand">${mccannMark()}<span class="arc-card-project">THE<br>AGENCY.</span><span class="arc-card-brand-caption">YOUR AGENCY ROLE / ${new Date().getFullYear()}</span></div><div class="arc-card-character">${character(ci,'reacting')}</div><div class="id-name">${safe(alias.toUpperCase())}</div><h2>${r.name}</h2><span class="mono">${r.job}</span><div class="arc-card-score"><b>${total}</b><span>POINTS / ${jobs} JOBS</span></div><div class="barcode"></div><div class="arc-card-endorsement">A McCann experience</div></div>${solo?'':'<a class="arc-vote-cta" id="arc-vote-cta" href="#arc-vote" hidden></a>'}</section>${roleLearning(profile.role)}${(g?.workProducts||g?.posters)?.length?`<section class="arc-your-posters"><div class="eyebrow">THE WORK YOU MADE</div><div>${(g.workProducts||g.posters).map(p=>`<article>${posterSVG(p)}${p.lines?`<details><summary>${safe(p.taskTitle)}</summary><ul>${p.lines.map(v=>`<li>${safe(v)}</li>`).join('')}</ul></details>`:''}</article>`).join('')}</div></section>`:''}</div>`;
}
function loadCardImage(src){const image=new Image();image.decoding='async';image.src=src;return image.decode().then(()=>image);}
async function downloadRole(){
 const profile=solo?arcadeProfile(game):live?.profile;if(!profile||savingRole)return;
 const button=q('[data-action="download-role"]');savingRole=true;if(button){button.disabled=true;button.textContent='SAVING…';}
 try{
  await document.fonts.ready;
  const [characterImage,brandImage]=await Promise.all([loadCardImage('/assets/crew-reactions.png'),loadCardImage(MCCANN_LOGO_URL)]);
  const canvas=document.createElement('canvas'),alias=solo?.alias||creds?.alias||'PLAYER';
  drawRoleCard(canvas,{role:roles[profile.role],profile:{...profile,score:profile.score+myBonus()},alias,characterIndex:game?.character??live?.game?.character??0,characterImage,brandImage});
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Card export failed.');
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='McCann-The-Agency-'+alias.replace(/[^a-z0-9]/gi,'-')+'.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('Your McCann role card is ready to save.');
 }catch(e){toast('Couldn’t save the card. Try again, or screenshot your branded card.');}
 finally{savingRole=false;if(button){button.disabled=false;button.textContent='SAVE ROLE CARD ↓';}}
}

document.addEventListener('submit',e=>{if(e.target.id==='arc-entry'){e.preventDefault();enter(e.target)}});
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-action]');if(!button||button.disabled)return;const action=button.dataset.action;
 if(action==='solo')openModal('solo');if(action==='join')openModal('join');if(action==='host'||action==='new-room')openModal('host');if(action==='close-modal')dismissModal();if(action==='create-room')createRoom();if(action==='begin-solo')beginSolo();if(action==='begin-practice')renderPractice();
 if(action==='character'){selected=Number(button.dataset.value);document.querySelectorAll('.character-pick').forEach((el,i)=>{el.classList.toggle('selected',i===selected);el.setAttribute('aria-pressed',String(i===selected));el.querySelector('.pick-check').textContent=i===selected?'✓':'+'});}
 if(action==='shuffle-name'){setNickname(makeNickname());q('#arc-error')&&(q('#arc-error').textContent='');}
 if(action==='resume-solo'){solo=loadJSON(gameStore);if(!solo)return;game=solo.game;selected=solo.character;view='solo';clockOffset=0;history.pushState(null,'','/?view=solo');if(solo.phase==='paused'){solo.phase='active';solo.deadline=Date.now()+solo.remaining;renderPlay();}else if(solo.phase==='active'&&solo.deadline>Date.now())renderPlay();else{solo.phase='finished';renderResult(arcadeProfile(game))}}
 if(action==='view-work'){const e=live.events[Number(button.dataset.value)];viewedWork={...pieceOf(e),by:e.alias};openModal('artifact');}
 if(action==='work-pick'&&game?.work)pickWork(Number(button.dataset.slot),Number(button.dataset.value));
 if(action==='work-edit'&&game?.work){workDraft.edit=Number(button.dataset.value);refreshWork();}
 if(action==='work-submit')submitWork();
 if(action==='work-headline'&&workDraft?.style){workDraft.style.head=freshHead(workDraft.style.head);refreshWork();}
 if(action==='work-style-shuffle'&&workDraft?.style){workDraft.style=freshLook(workDraft.style);refreshWork();}
 if(action==='work-style-next'&&workDraft?.style){const k=button.dataset.key;workDraft.style[k]=((workDraft.style[k]||0)+1)%AD_STYLE[k].length;refreshWork();}
 if(action==='work-style'&&workDraft?.style){workDraft.style[button.dataset.key]=Number(button.dataset.value);refreshWork();}
 if(action==='use')actionQueued=true;if(action==='map')openModal('map');
 if(action==='pause-menu'){if(solo?.phase==='active'){solo.remaining=Math.max(0,solo.deadline-Date.now());solo.phase='paused';saveSolo();}openModal('pause');}
 if(action==='slide'){const v=button.dataset.value;setSlide(v==='next'?finaleSlide+1:v==='prev'?finaleSlide-1:Number(v));}
 if(action==='fullscreen')toggleFullscreen();
 if(action==='reel'&&live?.ads?.length){reelBase=Date.now()-Number(button.dataset.value)*5000;updateReel();}
 if(action==='intro'){const v=button.dataset.value;setIntro(v==='skip'?INTRO_STEPS:introStep()+(v==='prev'?-1:1));}
 if(action==='vote'&&live){const id=button.dataset.value;live.myVote=id;updateVote();api('vote',{target:id}).then(()=>fetchState(true)).catch(e=>toast(e.message));}
 if(action==='finish-self')finishSelf();if(action==='download-role')await downloadRole();if(action==='retry')fetchState(true);if(action==='control')control(button.dataset.value);
 if(action==='stage')window.open('/?view=stage&room='+roomCode,'the-agency-stage');if(action==='copy'){try{await navigator.clipboard.writeText(playerLink());toast('Player link copied.')}catch{toast('Room code: '+roomCode)}}
 if(action==='host-sound'){hostSound=!hostSound;try{localStorage.setItem('wr-arc-host-sound',hostSound?'on':'off')}catch{}button.textContent=hostSound?'♪ Sound on':'♪ Sound off';button.setAttribute('aria-pressed',String(hostSound));if(hostSound)unlockAudio();}
 if(action==='sound'){sound=!sound;button.innerHTML=soundIcon(sound);button.setAttribute('aria-pressed',String(sound));if(sound)playNote('pickup');}
});
document.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-dir]');if(!b||modalType||!['play','practice'].includes(sceneKey)||movementPointer!==null)return;e.preventDefault();movementPointer=e.pointerId;held=b.dataset.dir;keys=[];b.setPointerCapture?.(e.pointerId);b.classList.add('pressed');});
function releaseMovement(e){if(e.pointerId!==movementPointer)return;held='';movementPointer=null;document.querySelectorAll('[data-dir]').forEach(b=>b.classList.remove('pressed'));}
document.addEventListener('pointerup',releaseMovement);document.addEventListener('pointercancel',releaseMovement);document.addEventListener('lostpointercapture',releaseMovement);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if(modalType)dismissModal();return}
 if(sceneKey.startsWith('intro')&&!modalType){const step={ArrowRight:1,PageDown:1,' ':1,Enter:1,ArrowLeft:-1,PageUp:-1}[e.key];if(step){e.preventDefault();setIntro(introStep()+step);}return}
 if((e.key==='f'||e.key==='F')&&(sceneKey==='room-result'||sceneKey.startsWith('intro'))&&!modalType&&!e.target.closest?.('input,textarea')){e.preventDefault();toggleFullscreen();return}
 if(sceneKey==='room-result'&&!modalType){const step={ArrowRight:1,PageDown:1,' ':1,ArrowLeft:-1,PageUp:-1}[e.key];if(step){e.preventDefault();setSlide(finaleSlide+step);}return}if(!['play','practice'].includes(sceneKey)||modalType)return;
 const dir={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'}[e.key];
 if(dir){e.preventDefault();if(!keys.includes(dir))keys.push(dir)}if((e.key===' '||e.key==='e'||e.key==='E')&&!e.repeat){e.preventDefault();actionQueued=true;}
});
document.addEventListener('keyup',e=>{const d={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'}[e.key];if(d)keys=keys.filter(k=>k!==d)});
window.addEventListener('storage',e=>{if(e.key==='wr-arc-slide-'+roomCode&&sceneKey==='room-result')setSlide(Number(e.newValue)||0,false)});
window.addEventListener('blur',()=>{clearMovement();saveSolo()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearMovement();saveSolo()}else if(roomCode&&!solo)fetchState(true)});
document.addEventListener('keydown',e=>{if(e.key!=='Tab'||!modalType)return;const nodes=[...q('#arc-modal').querySelectorAll('button,a,input:not([type=hidden]),select')].filter(n=>!n.disabled);if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus()}});
function frame(time){
 if(sceneKey==='practice'&&practice){if(!modalType&&!practiceSaving&&time-lastInput>=ARCADE_TICK){if(actionQueued){processInput({a:1});actionQueued=false;lastInput=time;}else{const d=held||keys.at(-1);if(d){processInput({d});lastInput=time;}}}if(practice)drawPractice(q('#arc-practice-canvas'),practice,clock());}
 if(sceneKey==='play'&&game){
  if(phaseNow()==='active'&&(!solo||solo.phase==='active')&&!modalType&&time-lastInput>=ARCADE_TICK){if(actionQueued){processInput({a:1});actionQueued=false;lastInput=time}else{const d=held||keys.at(-1);if(d){processInput({d});lastInput=time}}}
  renderer?.draw(game,clock(),{paused:phaseNow()==='paused'});updatePlayUI();if(toastUntil&&Date.now()>toastUntil){q('#game-message')?.classList.remove('visible');toastUntil=0;}
  if(solo&&solo.phase==='active'&&secondsLeft()<=0){solo.phase='finished';saveSolo();if(modalType)closeModal();renderResult(arcadeProfile(game));}
  if(solo&&time-lastSave>1000){saveSolo();lastSave=time;}
 }
 if((view==='host'||view==='stage')&&live&&live.phase!=='lobby'){
  if(live.phase!=='finished'&&renderer?.draw){renderer.draw(live.players,live.events,clock(),{paused:live.phase==='paused'});updateStageRush();}
  if(live.phase==='finished')updateReel();
  const t=q('#arc-room-clock');if(t)t.textContent=live.phase==='finished'?live.launch.score.toLocaleString('en-GB'):prettyTime(secondsLeft());
 }
 roomSounds();
 requestAnimationFrame(frame);
}
setInterval(flushInputs,650);requestAnimationFrame(frame);
if(view==='solo'||view==='practice'){const old=loadJSON(gameStore);if(old){solo=old;game=old.game;view='solo';if(old.phase==='intro')renderIntro();else if(old.phase==='finished'||old.phase==='active'&&old.deadline<=Date.now()){solo.phase='finished';renderResult(arcadeProfile(game))}else if(old.phase==='paused'){solo.phase='active';solo.deadline=Date.now()+solo.remaining;renderPlay()}else renderPlay();}else{home();openModal('solo')}}
else if(view==='roles')renderRoles();
else if(view==='brief'){sceneKey='brief-preview';document.body.className='arcade-room arcade-stage';root.innerHTML=header()+introScreen(1);}
else if(view==='player'&&!creds?.id){home();openModal('join')}
else if(view==='host'&&!creds?.host){home();openModal('host')}
else if(['player','host','stage'].includes(view)){root.innerHTML=header()+`<div class="waiting"><div class="radar">A</div><h1>CONNECTING<br><span class="acid">YOUR ROOM…</span></h1></div>`;connectRoom()}
else home();


// Browsers only allow sound after a tap or key press on the page.
for(const ev of ['pointerdown','keydown'])document.addEventListener(ev,()=>{if(view==='host'?hostSound:sound)unlockAudio()},{capture:true});
