import {cast} from './story.js';
import {roles,roleLessons,waysIn} from './content.js';
import {character,selector} from './scenes.js';
import {isClean,isGameName,makeNickname} from './filter.js';
import {qr} from './qr.js';
import {ARCADE_TICK,JOBS,PICKUPS,newArcadeGame,applyArcadeInput,arcadeProfile,nearbyJob,nextInstruction,jobAction,newPracticeGame,practiceInstruction,applyPracticeInput,MIN_ROLE_JOBS} from './arcade-world.js';
import {createArcadeRenderer,createRoomRenderer,posterSVG,drawGameIcon,drawPractice} from './arcade-renderer.js';

const q=s=>document.querySelector(s),safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root=q('#app'),params=new URLSearchParams(location.search);
let view=params.get('view')||'home',roomCode=(params.get('room')||'').toUpperCase();
let selected=0,creds=null,live=null,game=null,solo=null,ackGame=null,ackSeq=0,pending=[],nextSeq=0;
let poller=null,sending=false,connected=false,clockOffset=0,sceneKey='',renderer=null,modalType=null,busy=false;
let practice=null,practiceSaving=false,movementPointer=null,nickname=makeNickname();
let held='',keys=[],actionQueued=false,lastInput=0,lastSave=0,toastUntil=0,spotlight=-1,spotlightAt=0,sound=false,audio=null;
const gameStore='wr-arcade-solo';
const loadJSON=key=>{try{return JSON.parse(sessionStorage.getItem(key)||'null')}catch{return null}};
try{creds=JSON.parse(localStorage.getItem((view==='host'?'wr-arc-host-':'wr-arc-player-')+roomCode)||'null')}catch{}
if(view==='stage')creds=null;
const clock=()=>Date.now()+clockOffset;
const brand=()=>`<a class="brand" href="/" aria-label="The Agency home"><span class="brand-icon">A</span><span class="brand-name">THE<br>AGENCY<span class="acid">.</span></span></a>`;
const prettyTime=n=>{n=Math.max(0,Math.ceil(n));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0')};
const toView=(v,code='')=>{location.href='/?view='+v+(code?'&room='+code:'')};
const playerLink=()=>location.origin+'/?view=player&room='+roomCode;
function toast(text){const el=q('#toast');el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3200)}
// The message moves to whichever half of the map your next target is not in.
function note(text,ms=2500){const n=q('#game-message');if(n){const target=game&&nextInstruction(game,clock()).target;n.textContent=text;n.classList.add('visible');toastUntil=Date.now()+ms}}
function playNote(type){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const frequencies=type==='job'?[392,523,659]:type==='pickup'?[740,988]:[440];frequencies.forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.07;o.type='square';o.frequency.value=f;g.gain.setValueAtTime(.025,t);g.gain.exponentialRampToValueAtTime(.0001,t+.10);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.11)})}catch{}}
function header(){return `<div class="shell"><header class="nav arc-nav">${brand()}<div class="arc-nav-right"><span class="arc-mode mono">${view==='solo'?'SOLO GAME':view==='host'||view==='stage'||view==='roles'?'':roomCode?'ROOM '+safe(roomCode):'THE PIXEL GAME'}</span>${['solo','player'].includes(view)?`<button class="sound-toggle mono" data-action="sound" aria-pressed="${sound}">${sound?'SOUND ON':'SOUND OFF'}</button>`:''}${view==='player'?`<span class="arc-connection mono${connected?'':' offline'}" id="arc-connection">${connected?'CONNECTED':'CONNECTING…'}</span>`:''}</div></header></div>`}
function itemIcon(kind,label){return `<canvas class="arc-item-icon" width="24" height="24" data-game-icon="${safe(kind)}" role="img" aria-label="${safe(label)}"></canvas>`;}
function paintIcons(){document.querySelectorAll('[data-game-icon]').forEach(el=>drawGameIcon(el,el.dataset.gameIcon));}
function howToPlay(){return `<div class="arc-help-guide"><p class="arc-guide-goal">Do jobs for the crew. Do 2 to unlock your role.</p><ol class="arc-guide-steps"><li><b>1. MOVE</b><span>Hold an arrow. On a computer, use the arrow keys.</span></li><li><b>2. COLLECT</b><span>Walk over flashing items.</span></li><li><b>3. HELP</b><span>Stand beside the right person. Press the round button, or Space.</span></li></ol><h3 class="arc-guide-heading">THE FOUR JOBS</h3><div class="arc-guide-jobs"><article><small>TOP LEFT · STRATEGY</small><div>${itemIcon('clue','Green customer clue card')}<b>3 green clue cards</b></div><p>Take all 3 to <strong>Rem</strong>.<br>Press <strong>MAKE PLAN</strong>.</p></article><article><small>TOP RIGHT · CREATIVE</small><div>${itemIcon('paint','Colour tin')}${itemIcon('word','Word tile')}<b>1 colour + 1 word</b></div><p>Take them to <strong>Nova</strong>.<br>Press <strong>MAKE AD</strong>.</p></article><article><small>BOTTOM LEFT · ACCOUNTS</small><div>${itemIcon('brief','Client message envelope')}<b>A client message</b></div><p>Get it from <strong>Sol</strong>.<br>Take it where he says.</p></article><article><small>BOTTOM RIGHT · PRODUCTION</small><div>${itemIcon('spanner','Spanner')}${itemIcon('battery','Battery')}<b>1 spanner + 1 battery</b></div><p>Take them to <strong>Patch</strong>.<br>Press <strong>FIX KIT</strong>.</p></article></div></div>`;}

function quickStart(){return `<div class="arc-quick-start"><ol><li><b>MOVE</b><span>Hold an arrow.</span></li><li><b>COLLECT</b><span>Walk over flashing items.</span></li><li><b>HELP</b><span>Follow the dots. Press the round button.</span></li></ol><p class="arc-quick-note">Do 2 jobs to unlock your role.</p></div>`;}

function home(){
 document.body.className='arcade-home';
 root.innerHTML=`<div class="shell"><header class="nav">${brand()}</header><main><section class="hero character-home"><div class="hero-text"><h1>SAVE THE<br><span class="accent">LAUNCH.</span></h1><p class="hero-desc">Help the crew launch a new trainer, and find out which agency job suits you.</p><div class="hero-actions"><button class="btn" data-action="host">HOST A GAME <span class="arrow">→</span></button><a class="btn secondary" href="/?view=roles">SKIP TO JOB ROLES ↗</a></div><button class="text-button arc-home-solo" data-action="solo">Play solo →</button>${loadJSON(gameStore)?.phase==='active'?'<button class="text-button" data-action="resume-solo" style="margin-top:18px">Continue your solo game →</button>':''}</div><div class="cast-hero"><div class="cast-backdrop"><b>YOU’RE UP.</b><div class="hero-floor"></div></div><div class="hero-cast hero-rem">${character(0)}<span>REM</span></div><div class="hero-cast hero-nova">${character(1)}<span>NOVA</span></div><div class="hero-cast hero-patch">${character(2)}<span>PATCH</span></div><div class="incoming-card"><div class="call-portrait">${character(3)}</div><div><small>SOL</small><b>“The launch is in five minutes. Can you help?”</b></div><span class="call-pulse">↗</span></div></div></section></main></div>`;
}
function openModal(type){
 closeModal();actionQueued=false;modalType=type;const bg=document.createElement('div');bg.id='arc-modal';bg.className='modal-bg';let inside='';
 if(type==='map'&&solo?.phase==='active'){solo.remaining=Math.max(0,solo.deadline-Date.now());solo.phase='paused';saveSolo();}
 if(type==='solo'||type==='join')inside=`<div class="eyebrow acid">${type==='solo'?'SOLO GAME':'JOIN YOUR GROUP'}</div><h2 id="arc-modal-title">PICK YOUR LOOK.</h2><p>Every look can do every job.</p>${selector(selected)}<form id="arc-entry"><input type="hidden" name="mode" value="${type}">${type==='join'?(/^[A-Z2-9]{6}$/.test(roomCode)?`<input type="hidden" name="room" value="${safe(roomCode)}"><p class="arc-room-joined">ROOM <b>${safe(roomCode)}</b></p>`:`<label class="field-label" for="arc-room">ROOM CODE</label><input id="arc-room" name="room" class="code-input" type="text" value="${safe(roomCode)}" placeholder="ON THE BIG SCREEN" maxlength="6" pattern="[A-Za-z2-9]{6}" autocapitalize="characters" autocomplete="off" required>`):''}<span class="field-label">YOUR GAME NAME</span><div class="arc-name-pick"><b id="arc-name-display">${safe(nickname)}</b><input type="hidden" name="alias" id="arc-alias" value="${safe(nickname)}"><button type="button" class="arc-shuffle" data-action="shuffle-name" aria-label="Get a different game name">SHUFFLE ↻</button></div><div class="form-error" id="arc-error" role="alert"></div><button class="btn full" type="submit">LET’S GO →</button></form>`;
 else if(type==='host')inside=`<div class="eyebrow acid">HOST A GAME</div><h2 id="arc-modal-title">GET THE CREW IN.</h2><p>This tab becomes the big screen. Put it on the projector.</p><label class="field-label" for="arc-duration">GAME LENGTH</label><select id="arc-duration"><option value="300">5 minutes / first play</option><option value="600">10 minutes / longer session</option></select><div class="form-error" id="arc-error" role="alert"></div><button class="btn full" data-action="create-room">CREATE ROOM ↗</button>`;
 else if(type==='map')inside=`<div class="eyebrow acid">CONTROLS + OBJECTS + JOBS</div><h2 id="arc-modal-title">HOW TO PLAY.</h2>${solo?.phase==='paused'?'<p class="arc-help-clock">Timer paused.</p>':view==='player'&&live?.phase==='active'?'<p class="arc-help-clock">The clock is still running.</p>':''}${howToPlay()}<button class="btn full" data-action="close-modal">BACK TO THE GAME →</button>`;
 else if(type==='pause')inside=`<div class="eyebrow acid">${view==='solo'?'SOLO GAME PAUSED':'YOUR GAME'}</div><h2 id="arc-modal-title">TAKE A BREATHER.</h2><p>${view==='solo'?'Your timer is paused.':'The group’s timer keeps running while this menu is open.'}</p><button class="btn full" data-action="close-modal">KEEP PLAYING →</button>${solo?'<button class="btn secondary full" data-action="finish-self" style="margin-top:14px">FINISH GAME</button>':''}`;
 bg.innerHTML=`<section class="modal cast-modal${type==='map'?' arc-help-modal':''}" role="dialog" aria-modal="true" aria-labelledby="arc-modal-title"><button class="close-modal" data-action="close-modal" aria-label="Close">×</button>${inside}</section>`;document.body.append(bg);paintIcons();if(type==='map'||type==='pause')clearMovement();setTimeout(()=>bg.querySelector('input:not([type=hidden]),button')?.focus(),30);
}
function closeModal(){const was=modalType;q('#arc-modal')?.remove();modalType=null;if(['pause','map'].includes(was)&&solo?.phase==='paused'){solo.phase='active';solo.deadline=Date.now()+solo.remaining;saveSolo();}lastInput=performance.now();}
function setNickname(name){nickname=name;const d=q('#arc-name-display'),i=q('#arc-alias');if(d)d.textContent=name;if(i)i.value=name;}
function showError(message){const el=q('#arc-error');if(el)el.textContent=message;else toast(message)}
async function api(path,body){
 const headers={'content-type':'application/json'};if(creds?.token)headers.authorization='Bearer '+creds.token;if(creds?.id)headers['x-player']=creds.id;
 const response=await fetch('/api/arcade/'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify({...body,code:roomCode}):undefined,cache:'no-store'});
 let data;try{data=await response.json()}catch{throw Error('The room could not connect. Try again.')}if(!response.ok){const e=Error(data.error||'Please try again.');e.status=response.status;e.data=data;throw e}return data;
}
async function createRoom(){if(busy)return;busy=true;try{const result=await api('create',{duration:Number(q('#arc-duration').value)});localStorage.setItem('wr-arc-host-'+result.code,JSON.stringify({token:result.token,host:true}));toView('host',result.code)}catch(e){showError(e.message)}finally{busy=false}}
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
function practiceStatus(){return live?.phase==='active'||live?.phase==='paused'?'The game has started. Finish practice to jump in.':'Get ready while the room fills up.'}
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
 root.innerHTML=header()+`<main class="arc-player-shell"><div class="arc-hud"><div><span>YOU</span><b>${safe(alias)}</b></div><div class="arc-score"><span>POINTS</span><b id="arc-score">${game?.score||0}</b></div><div><span>TIME LEFT</span><b id="arc-time">${prettyTime(secondsLeft())}</b></div></div><div class="arc-task"><canvas id="arc-objective-icon" class="arc-item-icon" width="24" height="24" aria-hidden="true"></canvas><p id="arc-hint" role="status" aria-live="polite"></p><small id="arc-hint-detail"></small></div><div class="arc-canvas-frame"><canvas id="arc-canvas" role="img" aria-label="Top-down pixel agency. Use the direction pad or arrow keys to move. Collect items, then stand next to a teammate and press the action button."></canvas><div class="arc-game-message" id="game-message" role="status" aria-live="polite"></div><div id="arc-freeze" class="arc-freeze" hidden></div></div><div class="arc-bag" id="arc-bag" aria-label="Items in your bag"></div>${controlsMarkup()}<div class="arc-play-footer"><button data-action="map">HOW TO PLAY</button><span id="arc-role-progress" aria-label="Jobs needed for a role"></span><button data-action="pause-menu">${view==='solo'?'PAUSE':'MENU'} Ⅱ</button></div></main>`;
 renderer=createArcadeRenderer(q('#arc-canvas'));updatePlayUI();
}
function updatePlayUI(){
 if(!game||!q('#arc-score'))return;q('#arc-score').textContent=game.score;q('#arc-time').textContent=prettyTime(secondsLeft());q('#arc-time').classList.toggle('urgent',secondsLeft()<30);
 const step=nextInstruction(game,clock()),hint=q('#arc-hint'),detail=q('#arc-hint-detail');
 if(hint.textContent!==step.title)hint.textContent=step.title;if(detail.textContent!==step.detail)detail.textContent=step.detail;
 const icon=q('#arc-objective-icon');if(icon.dataset.icon!==step.icon){icon.dataset.icon=step.icon;drawGameIcon(icon,step.icon);}
 const near=nearbyJob(game),action=jobAction(game,clock()),use=q('#arc-use');use.disabled=!action.enabled;
 use.textContent=action.label;use.classList.toggle('ready',action.ready);
 use.setAttribute('aria-label',near<0?'Move beside a teammate to use this button':action.label+' with '+JOBS[near].person);
 q('#arc-action-hint').textContent=near<0?'Move beside a teammate.':action.ready?'Press this button now.':'Press TALK for help.';
 const completed=game.jobs.reduce((a,b)=>a+b,0);q('#arc-role-progress').textContent=completed<MIN_ROLE_JOBS?`Role: ${completed}/${MIN_ROLE_JOBS} jobs`:'Role unlocked ✓';
 const bag=q('#arc-bag');const bagKey=game.inventory.join(',');if(bag.dataset.items!==bagKey){bag.dataset.items=bagKey;bag.innerHTML='<span class="bag-label">BAG</span>'+(game.inventory.length?game.inventory.map(id=>{const p=PICKUPS.find(i=>i.id===id),label=id==='brief'?'MESSAGE':p?.kind==='clue'?'CLUE':p?.kind==='colour'?'COLOUR':p?.kind==='word'?'WORD':p?.icon==='battery'?'BATTERY':'SPANNER';return `<span class="bag-item" title="${safe(p?.name||'CLIENT MESSAGE')}">${itemIcon(p?.icon||'brief',p?.name||'Client message')}<small>${label}</small></span>`}).join(''):'<span class="bag-empty">Empty</span>');paintIcons();}
 bag.hidden=false;
 const freeze=q('#arc-freeze'),p=phaseNow(),blocked=p==='paused'||!solo&&pending.length>=24;
 freeze.hidden=!blocked;if(blocked)freeze.innerHTML=`<b>${p==='paused'?'GAME PAUSED':'RECONNECTING…'}</b><span>${p==='paused'?'Wait for your host to resume.':'Your progress is syncing. Keep this tab open.'}</span>`;
 updateConnection();
}
function processInput(input){
 if(sceneKey==='practice'&&practice&&!modalType){if(!solo&&live?.phase==='paused')return;applyPracticeInput(practice,input);updatePracticeUI();if(practice.complete)return completePractice();return;}
 if(!game||phaseNow()!=='active'||modalType||!solo&&(live?.finished||pending.length>=24))return;
 const op={...input,n:++nextSeq};const events=applyArcadeInput(game,op,clock());game.seq=op.n;
 if(!solo)pending.push(op);else saveSolo();
 const done=events.find(e=>e.kind==='job'),pickup=events.find(e=>e.kind==='pickup');
 if(done){note(['Plan made!','Ad made!','Message delivered!','Kit fixed!'][done.type]+' +'+done.points+' points.\n'+JOBS[done.type].real,5000);playNote('job');if(done.poster)showPoster(done.poster);}
 else if(pickup){if(pickup.name==='CLIENT MESSAGE')note('Got the client’s message.');playNote('pickup');}
 else for(const event of events)if(event.kind==='note')note(event.text);

 updatePlayUI();
}
function showPoster(poster){const el=document.createElement('div');el.className='arc-poster-pop';el.innerHTML=posterSVG(poster)+'<span>YOUR AD IS READY!</span>';q('.arc-canvas-frame')?.append(el);setTimeout(()=>el.remove(),2300)}
function rebase(g,seq){
 if(!g||seq<ackSeq)return;ackSeq=seq;ackGame=structuredClone(g);pending=pending.filter(op=>op.n>seq);game=structuredClone(g);for(const op of pending)applyArcadeInput(game,op,clock());nextSeq=Math.max(seq,...pending.map(o=>o.n));
}
async function flushInputs(){
 if(sending||solo||!pending.length||phaseNow()!=='active'||live?.finished)return;sending=true;const batch=pending.slice(0,32);
 try{const data=await api('input',{ops:batch});connected=true;rebase(data.game,data.seq);updatePlayUI();}
 catch(e){connected=false;if(e.status===409){pending=[];await fetchState(true)}else if(e.status!==429)note('Reconnecting to the room. Your game will wait if the connection drops.');}
 finally{sending=false}
}
function acceptLive(data,force=false){
 if(data.error){connected=false;return}if(live&&data.serverNow<live.serverNow)return;clockOffset=data.serverNow-Date.now();connected=true;const previous=live?.phase;live=data;
 if(data.game&&(force||!pending.length&&!sending||data.seq>ackSeq))rebase(data.game,data.seq);
 if(previous==='active'&&data.phase==='paused'){pending=[];if(data.game)rebase(data.game,data.seq);clearMovement();}
 if(view==='host'||view==='stage'){renderRoom();return}
 if(data.finished||data.phase==='finished'){practice=null;clearMovement();pending=[];if(data.game){game=structuredClone(data.game);ackSeq=data.seq;nextSeq=data.seq;}if(modalType)closeModal();if(sceneKey!=='result'){sceneKey='result';renderResult(data.profile)}return}
 if(data.phase==='lobby'){if(!data.ready){if(sceneKey!=='practice')renderPractice();return;}practice=null;if(sceneKey!=='waiting'){sceneKey='waiting';renderWaiting()}else q('#arc-wait-count')&&(q('#arc-wait-count').textContent=data.count);return}
 if(!data.ready&&data.seq===0){if(sceneKey!=='practice')renderPractice();else updatePracticeUI();return;}
 practice=null;
 if(game&&sceneKey!=='play')renderPlay();updatePlayUI();
}
async function fetchState(force=false){try{acceptLive(await api('state?room='+roomCode),force);updateConnection()}catch(e){connected=false;updateConnection();if(!live){root.innerHTML=header()+`<div class="shell"><div class="waiting"><h1>COULDN’T JOIN<br>THE ROOM.</h1><div class="error-banner">${safe(e.message)}</div><button class="btn" data-action="retry">TRY AGAIN ↻</button><a class="text-button" href="/">Back to home</a></div></div>`}updatePlayUI()}}
function connectRoom(){
 fetchState(true);clearInterval(poller);
 poller=setInterval(()=>fetchState(),1500);
}
function renderWaiting(){document.body.className='arcade-waiting';root.innerHTML=header()+`<div class="shell"><section class="arc-learn arc-wait-learn"><div class="eyebrow acid">PLAYING AS ${safe(creds.alias)}</div><h1>YOU’RE IN.</h1><p class="arc-wait-instruction">Wait for the game to start. Keep this page open.</p><div class="label-pill"><span id="arc-wait-count">${live.count}</span> PLAYERS IN</div><button class="text-button arc-guide-link" data-action="map">How to play</button></section></div>`;}


function roomControls(){
 if(view!=='host')return '';const p=live.phase,ready=live.readyCount||0,waiting=live.count-ready;
 return `<div class="arc-host-controls">${p==='lobby'?`<button class="btn" data-action="control" data-value="start" ${!live.count||waiting?'disabled':''}>${waiting?waiting+' STILL PRACTISING':'START THE GAME →'}</button>${waiting?'<button class="text-button" data-action="control" data-value="start-anyway">Start anyway</button>':''}`:p==='active'?'<button class="btn secondary" data-action="control" data-value="pause">PAUSE EVERYONE Ⅱ</button><button class="btn" data-action="control" data-value="finish">END GAME + SHOW JOB ROLES →</button>':p==='paused'?'<button class="btn" data-action="control" data-value="resume">RESUME EVERYONE →</button><button class="btn secondary" data-action="control" data-value="finish">END GAME + SHOW JOB ROLES →</button>':'<button class="btn secondary" data-action="new-room">NEW GAME ↗</button><a class="text-button" href="/">Home</a>'}${p==='lobby'?'<a class="text-button" href="/?view=roles">Skip to job roles</a><button class="text-button" data-action="copy">Copy player link</button>':''}</div>`;
}

function leaderboard(){return `<div class="arc-leaderboard"><div class="eyebrow">${live.phase==='finished'?'FINAL':'LIVE'} LEADERBOARD</div>${live.leaderboard.length?live.leaderboard.slice(0,live.phase==='finished'?10:8).map((p,i)=>`<div class="arc-rank-row"><span class="arc-rank-num">${String(i+1).padStart(2,'0')}</span><span class="mini-head">${character(p.character)}</span><div><b>${safe(p.alias)}</b><small>${p.completed} ${p.completed===1?'JOB':'JOBS'} DONE</small></div><strong>${p.score.toLocaleString('en-GB')}</strong></div>`).join(''):'<p class="fine">Players appear when they join.</p>'}</div>`}
function highlights(){if(live.phase!=='finished')return `<div class="arc-feed"><div class="eyebrow">JUST DONE</div>${live.events.length?live.events.slice(0,7).map(e=>`<div class="arc-feed-row" style="--c:${JOBS[e.type].colour}"><b>${safe(e.alias)}</b><span>${['made a plan','made an ad','delivered a message','fixed the kit'][e.type]}</span><strong>+${e.points}</strong></div>`).join(''):'<p class="arc-feed-empty">Finished jobs appear here.</p>'}</div>`;
 return `<div class="arc-highlights"><div class="eyebrow">PLAYER HIGHLIGHTS</div>${live.events.length?live.events.slice(0,4).map(e=>`<article class="arc-highlight" style="--event-colour:${JOBS[e.type].colour}">${e.poster?`<div class="arc-highlight-poster">${posterSVG(e.poster)}</div>`:`<span class="arc-highlight-symbol">${['⌕','✳','✉','⚒'][e.type]}</span>`}<div><b>${safe(e.alias)}</b><p>${safe(e.detail)}</p><span>+${e.points} POINTS / ${JOBS[e.type].role.toUpperCase()}</span></div></article>`).join(''):'<div class="arc-highlight-empty">No jobs finished.</div>'}</div>`}
const list=items=>`<ul>${items.map(t=>`<li>${safe(t)}</li>`).join('')}</ul>`;
const crewName=index=>cast[roleLessons[roles[index].key].crew].name;
function roleLessonBody(index){
 const lesson=roleLessons[roles[index].key];
 return `<div class="arc-lesson-body"><p class="arc-lesson-oneliner">${safe(lesson.oneLiner)}</p><p class="arc-lesson-example">${safe(lesson.example)}</p><span class="arc-lesson-label">A NORMAL DAY</span>${list(lesson.day)}<span class="arc-lesson-label">YOU’D BE INTO IT IF…</span>${list(lesson.into)}<span class="arc-lesson-label">WHAT MAKES YOU GOOD AT IT</span>${list(lesson.habits)}<span class="arc-lesson-label">JOB TITLES TO SEARCH</span><p class="arc-titles">${lesson.titles.map(t=>`<span>${safe(t)}</span>`).join('')}</p></div>`;
}
// The closing big screen is three slides: the crew at a glance, a deeper look, then scores.
const SLIDES=[['GAME COMPLETE / CHECK YOUR ROLE ON YOUR PHONE','MEET THE TEAM.'],['WHAT THE JOBS ARE REALLY LIKE','GO DEEPER.'],['GAME COMPLETE','FINAL SCORES.']];
let finaleSlide=0;
const slideCount=()=>view==='roles'?2:SLIDES.length;
function renderRoles(){document.body.className='arcade-room arcade-stage arcade-roles';sceneKey='room-result';finaleSlide=0;root.innerHTML=header()+roomFinale(true).replace('<div id="arc-room-controls"></div>','<div class="arc-host-controls"><button class="btn" data-action="host">HOST A GAME →</button><a class="text-button" href="/">Home</a></div>');}
function setSlide(n,share=true){
 finaleSlide=Math.max(0,Math.min(slideCount()-1,n));const shell=q('.arc-room-finale');if(!shell||!shell.dataset)return;
 shell.dataset.slide=String(finaleSlide);const [eyebrow,title]=SLIDES[finaleSlide];
 const e=q('#arc-slide-eyebrow'),t=q('#arc-slide-title');if(e)e.textContent=eyebrow;if(t)t.textContent=title;
 document.querySelectorAll('.arc-slide-tab').forEach((b,i)=>b.setAttribute('aria-current',i===finaleSlide?'step':'false'));
 if(share)try{localStorage.setItem('wr-arc-slide-'+roomCode,String(finaleSlide))}catch{}
}
function roleLearning(ownRole=-1,partial=false){return `<section class="arc-role-learning" id="meet-team" aria-labelledby="arc-learning-title"><h2 id="arc-learning-title">MEET THE TEAM.</h2><p>Tap a job to find out more.</p><div class="arc-role-lessons">${roles.map((r,i)=>`<details class="arc-role-lesson" style="--lesson-color:${r.color}" ${i===ownRole?'open':''}><summary><span class="mini-head arc-lesson-head" aria-hidden="true">${character(roleLessons[r.key].crew)}</span><span><b>${safe(roleLessons[r.key].title)}</b><small>WITH ${crewName(i)} · ${safe(r.name)}${i===ownRole?(partial?' · YOUR JOB IN THE GAME':' · YOUR GAME ROLE'):''}</small></span><span class="arc-lesson-toggle" aria-hidden="true">+</span></summary>${roleLessonBody(i)}</details>`).join('')}</div><div class="arc-learning-close"><strong>Which one sounds most like you?</strong></div><a class="text-button" href="/">Back to home →</a></section>`;}
function roomFinale(standalone=false){
 const [eyebrow,title]=SLIDES[finaleSlide];
 const team=roles.map((r,i)=>{const l=roleLessons[r.key];return `<article class="arc-stage-lesson" style="--lesson-color:${r.color}"><div class="arc-crew-portrait">${character(l.crew)}</div><b class="arc-crew-name">${crewName(i)}</b><h2>${safe(l.title)}</h2><small class="arc-stage-alias">${safe(r.name)}</small><p class="arc-crew-line">${safe(l.oneLiner)}</p><p class="arc-stage-role-count" id="arc-role-count-${i}"></p></article>`}).join('');
 const deeper=roles.map((r,i)=>{const l=roleLessons[r.key];return `<article class="arc-deeper" style="--lesson-color:${r.color}"><header><span class="mini-head">${character(l.crew)}</span><div><b>${safe(l.title)}</b><small>WITH ${crewName(i)}</small></div></header><span class="arc-lesson-label">A NORMAL DAY</span>${list(l.day)}<span class="arc-lesson-label">YOU’D BE INTO IT IF…</span>${list(l.into)}<span class="arc-lesson-label">JOB TITLES TO SEARCH</span><p class="arc-titles">${l.titles.map(t=>`<span>${safe(t)}</span>`).join('')}</p></article>`}).join('');
 return `<div class="shell arc-room-shell arc-room-finale" data-slide="${finaleSlide}"><div class="arc-room-heading"><div><span class="eyebrow acid" id="arc-slide-eyebrow">${eyebrow}</span><h1 id="arc-slide-title">${title}</h1></div><div class="arc-finale-right"><nav class="arc-slide-nav" aria-label="Closing slides"><button data-action="slide" data-value="prev" aria-label="Previous slide">←</button>${SLIDES.slice(0,slideCount()).map((sl,i)=>`<button class="arc-slide-tab" data-action="slide" data-value="${i}" aria-current="${i===finaleSlide?'step':'false'}">${i+1}. ${['THE TEAM','GO DEEPER','SCORES'][i]}</button>`).join('')}<button data-action="slide" data-value="next" aria-label="Next slide">→</button></nav>${standalone?'':`<div class="arc-room-clock"><span>ROOM POINTS</span><b id="arc-room-clock">${live.launch.score.toLocaleString('en-GB')}</b></div>`}</div></div>
 <section class="arc-slide arc-slide-team" aria-label="Meet the team"><div class="arc-stage-lessons">${team}</div><p class="arc-finale-question">Which one sounds most like you?</p></section>
 <section class="arc-slide arc-slide-deeper" aria-label="Go deeper"><div class="arc-deeper-grid">${deeper}</div><p class="arc-ways-in">${safe(waysIn)}</p></section>
 ${standalone?'':`<section class="arc-slide arc-slide-scores" aria-label="Final scores"><div class="arc-final-score-grid"><div id="arc-leaderboard-wrap"></div><div id="arc-highlights-wrap"></div></div></section>`}
<div id="arc-room-controls"></div></div>`;}
function renderRoom(){
 document.body.className='arcade-room arcade-stage'+(view==='host'?' arcade-host':'');
 const key=live.phase==='lobby'?'lobby':live.phase==='finished'?'room-result':'room-playing';
 const structural=sceneKey!==key;if(structural){sceneKey=key;
  if(key==='lobby'){root.innerHTML=header()+`<div class="shell"><section class="arc-room-lobby"><div><div class="eyebrow acid">GROUP GAME / ${Math.round(live.duration/60)} MINUTES</div><h1>GET THE<br><span class="acid">CREW IN.</span></h1><p>Scan the code to join.</p><div class="arc-join-count"><b id="arc-joined">0</b><span>PLAYERS IN<br><strong id="arc-ready">0 READY</strong></span></div><div class="player-cloud" id="arc-player-cloud"></div></div><div class="qr-box">${qr(playerLink())}<div class="mono" style="margin-top:14px">ROOM CODE</div><div class="room-display">${safe(roomCode)}</div></div></section><div id="arc-room-controls"></div></div>`;}
  else if(key==='room-result'){renderer?.destroy?.();renderer=null;root.innerHTML=header()+roomFinale();}
  else root.innerHTML=header()+`<div class="shell arc-room-shell arc-live"><div class="arc-live-top"><h1>THE CREW’S ON IT.</h1><div class="arc-dept-bars" id="arc-dept-bars"></div><div class="arc-room-clock"><b id="arc-room-clock">0:00</b></div></div><div class="arc-live-grid"><div class="arc-canvas-frame arc-stage-canvas"><canvas id="arc-stage-canvas" role="img" aria-label="Every player on the shared agency map"></canvas></div><aside><div id="arc-leaderboard-wrap"></div><div id="arc-highlights-wrap"></div></aside></div><div id="arc-room-controls"></div></div>`;
  if(key==='room-playing'){renderer=createRoomRenderer(q('#arc-stage-canvas'));}
 }
 if(key==='lobby'){q('#arc-joined').textContent=live.count;q('#arc-ready').textContent=(live.readyCount||0)+' READY TO PLAY';q('#arc-player-cloud').innerHTML=live.players.map(p=>`<span class="alias-chip character-chip${p.ready?' is-ready':''}"><span class="mini-head">${character(p.character)}</span>${safe(p.alias)}<small class="arc-ready-tag">${p.ready?'READY ✓':'PRACTISING'}</small></span>`).join('');}
 else {q('#arc-leaderboard-wrap').innerHTML=leaderboard();q('#arc-highlights-wrap').innerHTML=highlights();if(key==='room-result'){roles.forEach((r,i)=>{const count=live.players.filter(p=>p.profile?.role===i).length;q('#arc-role-count-'+i).textContent=count+' '+(count===1?'PLAYER':'PLAYERS')+' IN THIS ROLE';});}else{const done=[0,1,2,3].map(t=>live.players.reduce((a,p)=>a+(p.game?.jobs?.[t]||0),0)),top=Math.max(4,...done);q('#arc-dept-bars').innerHTML=JOBS.map((j,t)=>`<div style="--c:${j.colour}"><span>${j.name}</span><strong>${done[t]}</strong><div class="arc-bar"><div style="width:${done[t]/top*100}%"></div></div></div>`).join('');}}
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
function renderResult(profile){
 document.body.className='arcade-result';sceneKey='result';const g=game||live?.game,alias=solo?.alias||creds?.alias||'PLAYER',ci=g?.character??0;
 if(!profile){const jobs=g?.jobs||[0,0,0,0],done=jobs.reduce((a,b)=>a+b,0),lean=done?jobs.indexOf(Math.max(...jobs)):-1;
  root.innerHTML=header()+`<div class="shell"><div class="waiting arc-no-role"><h1>GOOD START.</h1><p>You completed ${done} ${done===1?'job':'jobs'} and earned ${g?.score||0} points.</p>${lean>=0?`<p>You worked in <b style="color:${roles[lean].color}">${safe(roleLessons[roles[lean].key].title)}</b>. Find out what that job is like below.</p>`:'<p>Every agency needs these four jobs. Find out what each one does below.</p>'}${solo?`<p>Complete ${MIN_ROLE_JOBS} jobs in a game to unlock your role card.</p><button class="btn" data-action="solo" style="margin-top:20px">PLAY AGAIN →</button><a class="text-button" href="#meet-team">EXPLORE THE ROLES ↓</a>`:'<a class="btn" href="#meet-team" style="margin-top:20px">EXPLORE THE ROLES ↓</a>'}</div>${roleLearning(lean,true)}</div>`;return}

 const r=roles[profile.role],jobs=profile.completed;
 root.innerHTML=header()+`<div class="shell"><section class="arc-result-grid"><div class="arc-result-copy"><div class="eyebrow acid">${safe(alias)} / GAME COMPLETE</div><h1>${r.name}</h1><span class="arc-result-job" style="color:${r.color}">${r.job}</span><p>${r.description}</p><div class="arc-result-stats"><div><b>${profile.score.toLocaleString('en-GB')}</b><span>POINTS</span></div><div><b>${jobs}</b><span>${jobs===1?'JOB':'JOBS'} COMPLETED</span></div></div><div class="arc-result-evidence"><span>THE WORK YOU CHOSE</span>${JOBS.map((j,i)=>`<div><b style="color:${j.colour}">${j.role}</b><span>${profile.jobs[i]} ${profile.jobs[i]===1?'job':'jobs'}</span></div>`).join('')}</div><p class="fine">Just a game, not a careers test.</p><div class="reveal-actions"><button class="btn" data-action="download-role">SAVE ROLE CARD ↓</button><a class="btn secondary" href="#meet-team">WHAT DOES MY ROLE DO? ↓</a></div></div><div class="arc-result-card" id="arc-role-card" style="--role:${r.color}"><div class="id-top"><span class="brand-name">THE<br>AGENCY.</span><span class="mono">YOUR AGENCY ROLE<br>PIXEL GAME / ${new Date().getFullYear()}</span></div><div class="arc-card-character">${character(ci,'reacting')}</div><div class="id-name">${safe(alias.toUpperCase())}</div><h2>${r.name}</h2><span class="mono">${r.job}</span><div class="arc-card-score"><b>${profile.score}</b><span>POINTS / ${jobs} JOBS</span></div><div class="barcode"></div></div></section>${roleLearning(profile.role)}${g?.posters?.length?`<section class="arc-your-posters"><div class="eyebrow">THE ADS YOU MADE</div><div>${g.posters.map(p=>`<article>${posterSVG(p)}</article>`).join('')}</div></section>`:''}</div>`;
}
async function downloadRole(){
 const p=solo?arcadeProfile(game):live?.profile;if(!p)return;const r=roles[p.role],ci=game?.character??0,alias=solo?.alias||creds?.alias||'PLAYER';await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=800;canvas.height=1100;const c=canvas.getContext('2d');c.fillStyle=r.color;c.fillRect(0,0,800,1100);c.fillStyle='#172c35';const text=(s,x,y,size=25,font='WarMono')=>{c.font=`${size}px ${font}`;c.fillText(s,x,y)};
 text('THE AGENCY',45,80,65,'WarDisplay');text('YOUR AGENCY ROLE / PIXEL GAME',45,120,18);c.fillRect(45,148,710,2);const image=new Image();image.src='/assets/crew-reactions.png';await image.decode();const cw=image.width/4,ch=image.height*.65,w=350*cw/ch;c.drawImage(image,ci*cw,0,cw,ch,(800-w)/2,160,w,350);c.fillRect(45,520,710,2);text(alias.toUpperCase(),45,565,30);text(r.name,45,665,83,'WarDisplay');text(r.job,45,713,22);text(String(p.score),45,830,93,'WarDisplay');text('POINTS / '+p.completed+' JOBS',45,874,20);c.fillRect(45,925,710,2);text('YOUR JOBS. YOUR ROLE.',45,982,36,'WarDisplay');text('THE AGENCY / PIXEL GAME',45,1040,19);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob){toast('You can screenshot your role card.');return}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='The-Agency-'+alias.replace(/[^a-z0-9]/gi,'-')+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('Role card ready to save.');
}

document.addEventListener('submit',e=>{if(e.target.id==='arc-entry'){e.preventDefault();enter(e.target)}});
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-action]');if(!button||button.disabled)return;const action=button.dataset.action;
 if(action==='solo')openModal('solo');if(action==='join')openModal('join');if(action==='host'||action==='new-room')openModal('host');if(action==='close-modal')closeModal();if(action==='create-room')createRoom();if(action==='begin-solo')beginSolo();if(action==='begin-practice')renderPractice();
 if(action==='character'){selected=Number(button.dataset.value);document.querySelectorAll('.character-pick').forEach((el,i)=>{el.classList.toggle('selected',i===selected);el.setAttribute('aria-pressed',String(i===selected));el.querySelector('.pick-check').textContent=i===selected?'✓':'+'});}
 if(action==='shuffle-name'){setNickname(makeNickname());q('#arc-error')&&(q('#arc-error').textContent='');}
 if(action==='resume-solo'){solo=loadJSON(gameStore);if(!solo)return;game=solo.game;selected=solo.character;view='solo';clockOffset=0;history.pushState(null,'','/?view=solo');if(solo.phase==='paused'){solo.phase='active';solo.deadline=Date.now()+solo.remaining;renderPlay();}else if(solo.phase==='active'&&solo.deadline>Date.now())renderPlay();else{solo.phase='finished';renderResult(arcadeProfile(game))}}
 if(action==='use')actionQueued=true;if(action==='map')openModal('map');
 if(action==='pause-menu'){if(solo?.phase==='active'){solo.remaining=Math.max(0,solo.deadline-Date.now());solo.phase='paused';saveSolo();}openModal('pause');}
 if(action==='slide'){const v=button.dataset.value;setSlide(v==='next'?finaleSlide+1:v==='prev'?finaleSlide-1:Number(v));}
 if(action==='finish-self')finishSelf();if(action==='download-role')downloadRole();if(action==='retry')fetchState(true);if(action==='control')control(button.dataset.value);
 if(action==='stage')window.open('/?view=stage&room='+roomCode,'the-agency-stage');if(action==='copy'){try{await navigator.clipboard.writeText(playerLink());toast('Player link copied.')}catch{toast('Room code: '+roomCode)}}
 if(action==='sound'){sound=!sound;button.textContent=sound?'SOUND ON':'SOUND OFF';button.setAttribute('aria-pressed',String(sound));if(sound)playNote('pickup');}
});
document.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-dir]');if(!b||modalType||!['play','practice'].includes(sceneKey)||movementPointer!==null)return;e.preventDefault();movementPointer=e.pointerId;held=b.dataset.dir;keys=[];b.setPointerCapture?.(e.pointerId);b.classList.add('pressed');});
function releaseMovement(e){if(e.pointerId!==movementPointer)return;held='';movementPointer=null;document.querySelectorAll('[data-dir]').forEach(b=>b.classList.remove('pressed'));}
document.addEventListener('pointerup',releaseMovement);document.addEventListener('pointercancel',releaseMovement);document.addEventListener('lostpointercapture',releaseMovement);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if(modalType)closeModal();return}
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
  if(live.phase!=='finished'&&renderer?.draw)renderer.draw(live.players,live.events,clock(),{paused:live.phase==='paused'});
  const t=q('#arc-room-clock');if(t)t.textContent=live.phase==='finished'?live.launch.score.toLocaleString('en-GB'):prettyTime(secondsLeft());
 }
 requestAnimationFrame(frame);
}
setInterval(flushInputs,650);requestAnimationFrame(frame);
if(view==='solo'||view==='practice'){const old=loadJSON(gameStore);if(old){solo=old;game=old.game;view='solo';if(old.phase==='intro')renderIntro();else if(old.phase==='finished'||old.phase==='active'&&old.deadline<=Date.now()){solo.phase='finished';renderResult(arcadeProfile(game))}else if(old.phase==='paused'){solo.phase='active';solo.deadline=Date.now()+solo.remaining;renderPlay()}else renderPlay();}else{home();openModal('solo')}}
else if(view==='roles')renderRoles();
else if(view==='player'&&!creds?.id){home();openModal('join')}
else if(view==='host'&&!creds?.host){home();openModal('host')}
else if(['player','host','stage'].includes(view)){root.innerHTML=header()+`<div class="waiting"><div class="radar">A</div><h1>CONNECTING<br><span class="acid">YOUR ROOM…</span></h1></div>`;connectRoom()}
else home();
