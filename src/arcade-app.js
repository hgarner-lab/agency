import {cast} from './story.js';
import {roles} from './content.js';
import {character,selector} from './scenes.js';
import {isClean} from './filter.js';
import {qr} from './qr.js';
import {ARCADE_TICK,JOBS,PICKUPS,newArcadeGame,applyArcadeInput,arcadeProfile,gameHint,jobLabel,jobChecklist,nearbyJob,publicArcadeGame} from './arcade-world.js';
import {createArcadeRenderer,posterSVG,drawGameIcon} from './arcade-renderer.js';

const q=s=>document.querySelector(s),safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root=q('#app'),params=new URLSearchParams(location.search);
let view=params.get('view')||'home',roomCode=(params.get('room')||'').toUpperCase();
let selected=0,creds=null,live=null,game=null,solo=null,ackGame=null,ackSeq=0,pending=[],nextSeq=0;
let poller=null,sending=false,connected=false,clockOffset=0,sceneKey='',renderer=null,modalType=null,busy=false;
let held='',keys=[],actionQueued=false,lastInput=0,lastSave=0,toastUntil=0,spotlight=-1,spotlightAt=0,sound=false,audio=null;
const gameStore='wr-arcade-solo';
const loadJSON=key=>{try{return JSON.parse(sessionStorage.getItem(key)||'null')}catch{return null}};
try{creds=JSON.parse(localStorage.getItem((view==='host'?'wr-arc-host-':'wr-arc-player-')+roomCode)||'null')}catch{}
if(view==='stage')creds=null;
const clock=()=>Date.now()+clockOffset;
const brand=()=>`<a class="brand" href="/" aria-label="The War Room home"><span class="brand-icon">W</span><span class="brand-name">THE WAR<br>ROOM<span class="acid">.</span></span></a>`;
const prettyTime=n=>{n=Math.max(0,Math.ceil(n));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0')};
const toView=(v,code='')=>{location.href='/?view='+v+(code?'&room='+code:'')};
const playerLink=()=>location.origin+'/?view=player&room='+roomCode;
function toast(text){const el=q('#toast');el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3200)}
function note(text){const n=q('#game-message');if(n){n.textContent=text;n.classList.add('visible');toastUntil=Date.now()+5500}}
function playNote(type){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const frequencies=type==='job'?[392,523,659]:type==='pickup'?[740,988]:[440];frequencies.forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.07;o.type='square';o.frequency.value=f;g.gain.setValueAtTime(.025,t);g.gain.exponentialRampToValueAtTime(.0001,t+.10);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.11)})}catch{}}
function header(){return `<div class="shell"><header class="nav arc-nav">${brand()}<div class="arc-nav-right"><span class="arc-mode mono">${view==='solo'?'SOLO GAME':view==='host'?'HOST CONTROLS':view==='stage'?'LIVE ROOM':roomCode?'ROOM '+safe(roomCode):'THE PIXEL GAME'}</span>${['solo','player'].includes(view)?`<button class="sound-toggle mono" data-action="sound" aria-pressed="${sound}">${sound?'SOUND ON':'SOUND OFF'}</button>`:''}${view==='player'?'<span class="arc-connection mono" id="arc-connection">CONNECTING…</span>':''}</div></header></div>`}
function itemIcon(kind,label){return `<canvas class="arc-item-icon" width="24" height="24" data-game-icon="${safe(kind)}" role="img" aria-label="${safe(label)}"></canvas>`;}
function paintIcons(){document.querySelectorAll('[data-game-icon]').forEach(el=>drawGameIcon(el,el.dataset.gameIcon));}
function howToPlay(){return `<div class="arc-help-guide"><p class="arc-guide-goal">Help the crew get a trainer launch ready. Complete jobs to earn points. Choose any job, then keep going until time runs out.</p><ol class="arc-guide-steps"><li><b>1. MOVE</b><span>Use the direction pad. On a computer, use arrow keys or WASD. Your character is marked <strong>YOU</strong>.</span></li><li><b>2. COLLECT</b><span>Walk over the small floating objects to put them in your bag.</span></li><li><b>3. HELP</b><span>Take the items to the right person. Stand beside them and press the round action button. On a computer, press Space.</span></li></ol><h3 class="arc-guide-heading">WHAT TO COLLECT + WHERE TO TAKE IT</h3><div class="arc-guide-jobs"><article><small>TOP LEFT · RESEARCH</small><div>${itemIcon('clue','Green customer clue card')}<b>3 green clue cards</b></div><p>Take all 3 to <strong>Rem</strong>.<br>Press <strong>RESEARCH</strong>.</p></article><article><small>TOP RIGHT · STUDIO</small><div>${itemIcon('paint','Colour tin')}${itemIcon('word','Word tile')}<b>1 colour + 1 word</b></div><p>Take them to <strong>Nova</strong>.<br>Press <strong>MAKE AD</strong>.</p></article><article><small>BOTTOM LEFT · CLIENT DESK</small><div>${itemIcon('brief','Client brief envelope')}<b>A client brief</b></div><p>Stand beside <strong>Sol</strong>. Press <strong>GET BRIEF</strong>. Take it to the person he names and press <strong>DELIVER</strong>.</p></article><article><small>BOTTOM RIGHT · WORKSHOP</small><div>${itemIcon('spanner','Spanner')}${itemIcon('battery','Battery')}<b>1 spanner + 1 battery</b></div><p>Take them to <strong>Patch</strong>.<br>Press <strong>REPAIR</strong>.</p></article></div><p class="arc-guide-scenery">Desks, computers and plants stay where they are. Walk around them. After a job, new items appear so you can play it again.</p><p class="arc-guide-role">Try the jobs you like. The work you do shapes your agency role.</p></div>`;}

function home(){
 document.body.className='arcade-home';
 root.innerHTML=`<div class="topline mono"><span><span class="dot"></span>THE WAR ROOM / THE PIXEL GAME</span><span>MOVE. COLLECT. MAKE IT HAPPEN.</span></div><div class="shell"><header class="nav">${brand()}<span class="brand-sub">ONE SMALL AGENCY.<br>ONE BIG LAUNCH.</span><button class="nav-host" data-action="host">HOST A GROUP GAME ↗</button></header><main><section class="hero character-home"><div class="hero-text"><div class="hero-kicker eyebrow"><span class="tiny-cross">✳</span> YOUR FIRST DAY. FIVE MINUTES TO LAUNCH.</div><h1>SAVE THE<br><span class="accent">LAUNCH.</span></h1><p class="hero-desc">The agency needs an extra pair of hands.<br>Walk around, collect useful things and help the crew get a trainer launch ready.<br><strong>The jobs you choose reveal your agency role.</strong></p><div class="hero-actions"><button class="btn" data-action="solo">PLAY SOLO <span class="arrow">→</span></button><button class="btn secondary" data-action="join">JOIN A GROUP GAME ↗</button></div><div class="hero-foot mono"><span>MOVE + ONE ACTION BUTTON</span><span>NO DOWNLOAD</span></div>${loadJSON(gameStore)?.phase==='active'?'<button class="text-button" data-action="resume-solo" style="margin-top:18px">Continue your solo game →</button>':''}</div><div class="cast-hero"><div class="cast-backdrop"><span>REM / NOVA / PATCH</span><b>YOU’RE UP.</b><div class="hero-floor"></div></div><div class="hero-cast hero-rem">${character(0)}<span>REM</span></div><div class="hero-cast hero-nova">${character(1)}<span>NOVA</span></div><div class="hero-cast hero-patch">${character(2)}<span>PATCH</span></div><div class="incoming-card"><div class="call-portrait">${character(3)}</div><div><small>SOL / YOUR CLIENT</small><b>“The launch starts in five. Can you help?”</b></div><span class="call-pulse">↗</span></div></div></section><section class="arc-how"><article><b>01</b><h2>MOVE AROUND.</h2><p>Use the direction pad. On a computer, use arrow keys or WASD.</p></article><article><b>02</b><h2>COLLECT + HELP.</h2><p>Walk over items. Take them to a teammate and press the action button.</p></article><article><b>03</b><h2>FIND YOUR ROLE.</h2><p>Earn points for the work. Your choice of jobs shapes your role.</p></article></section><div class="arc-home-bottom"><span class="mono">REM + NOVA + PATCH RETURN IN PIXEL FORM.</span><span class="mono">ONE MAP · FOUR KINDS OF JOB · YOUR CHOICE</span></div></main></div>`;
}
function openModal(type){
 closeModal();actionQueued=false;modalType=type;const bg=document.createElement('div');bg.id='arc-modal';bg.className='modal-bg';let inside='';
 if(type==='map'&&solo?.phase==='active'){solo.remaining=Math.max(0,solo.deadline-Date.now());solo.phase='paused';saveSolo();}
 if(type==='solo'||type==='join')inside=`<div class="eyebrow acid">${type==='solo'?'SOLO GAME':'JOIN YOUR GROUP'}</div><h2 id="arc-modal-title">PICK YOUR PLAYER.</h2><p>Same game. Different look. Your jobs decide your role.</p>${selector(selected)}<form id="arc-entry"><input type="hidden" name="mode" value="${type}">${type==='join'?`<label class="field-label" for="arc-room">ROOM CODE</label><input id="arc-room" name="room" class="code-input" type="text" value="${safe(roomCode)}" placeholder="FROM YOUR HOST" maxlength="6" pattern="[A-Za-z2-9]{6}" required><p class="fine">Use the code on the big screen.</p>`:''}<label class="field-label" for="arc-alias">YOUR NICKNAME</label><input id="arc-alias" name="alias" type="text" maxlength="16" minlength="2" autocomplete="off" placeholder="Leave your real name out" required><div class="form-error" id="arc-error" role="alert"></div><button class="btn full" type="submit">PLAY AS <span id="arc-player-name">${cast[selected].name}</span> →</button></form>`;
 else if(type==='host')inside=`<div class="eyebrow acid">GROUP GAME / HOST SETUP</div><h2 id="arc-modal-title">GET THE CREW IN.</h2><p>Players get their own map on their phones. The big screen follows their scores, completed jobs and posters.</p><label class="field-label" for="arc-duration">GAME LENGTH</label><select id="arc-duration"><option value="300">5 minutes / first play</option><option value="600">10 minutes / longer session</option></select><div class="form-error" id="arc-error" role="alert"></div><button class="btn full" data-action="create-room">CREATE ROOM ↗</button><p class="fine">Open the big-screen view on your projector after creating a room. Keep this tab for host controls.</p>`;
 else if(type==='map')inside=`<div class="eyebrow acid">CONTROLS + OBJECTS + JOBS</div><h2 id="arc-modal-title">HOW TO PLAY.</h2><p class="arc-help-clock">${solo?'Your timer is paused while you read.':'The group timer keeps running. You can close this guide at any time.'}</p>${howToPlay()}<button class="btn full" data-action="close-modal">BACK TO THE GAME →</button>`;
 else if(type==='pause')inside=`<div class="eyebrow acid">${view==='solo'?'SOLO GAME PAUSED':'YOUR GAME'}</div><h2 id="arc-modal-title">TAKE A BREATHER.</h2><p>${view==='solo'?'Your timer is paused.':'The group’s timer keeps running while this menu is open.'}</p><button class="btn full" data-action="close-modal">KEEP PLAYING →</button><button class="btn secondary full" data-action="finish-self" style="margin-top:14px">FINISH + SEE MY ROLE</button>`;
 bg.innerHTML=`<section class="modal cast-modal${type==='map'?' arc-help-modal':''}" role="dialog" aria-modal="true" aria-labelledby="arc-modal-title"><button class="close-modal" data-action="close-modal" aria-label="Close">×</button>${inside}</section>`;document.body.append(bg);paintIcons();if(type==='map'||type==='pause'){held='';keys=[];}setTimeout(()=>bg.querySelector('input:not([type=hidden]),button')?.focus(),30);
}
function closeModal(){const was=modalType;q('#arc-modal')?.remove();modalType=null;if(['pause','map'].includes(was)&&solo?.phase==='paused'){solo.phase='active';solo.deadline=Date.now()+solo.remaining;saveSolo();}lastInput=performance.now();}
function showError(message){const el=q('#arc-error');if(el)el.textContent=message;else toast(message)}
async function api(path,body){
 const headers={'content-type':'application/json'};if(creds?.token)headers.authorization='Bearer '+creds.token;if(creds?.id)headers['x-player']=creds.id;
 const response=await fetch('/api/arcade/'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify({...body,code:roomCode}):undefined,cache:'no-store'});
 let data;try{data=await response.json()}catch{throw Error('The room could not connect. Try again.')}if(!response.ok){const e=Error(data.error||'Please try again.');e.status=response.status;e.data=data;throw e}return data;
}
async function createRoom(){if(busy)return;busy=true;try{const result=await api('create',{duration:Number(q('#arc-duration').value)});localStorage.setItem('wr-arc-host-'+result.code,JSON.stringify({token:result.token,host:true}));toView('host',result.code)}catch(e){showError(e.message)}finally{busy=false}}
async function enter(form){
 if(busy)return;const values=new FormData(form),alias=String(values.get('alias')||'').trim(),mode=values.get('mode');
 if(!/^[A-Za-z0-9_ -]{2,16}$/.test(alias)){showError('Use 2–16 letters, numbers, spaces, _ or -.');return}if(!isClean(alias)){showError('Try another nickname. Keep it clean.');return}
 if(mode==='solo'){closeModal();view='solo';creds=null;clockOffset=0;game=newArcadeGame(selected);solo={alias,character:selected,phase:'intro',remaining:300000,deadline:null,game};history.pushState(null,'','/?view=solo');saveSolo();renderIntro();return}
 roomCode=String(values.get('room')||'').toUpperCase();busy=true;form.querySelector('button[type=submit]').disabled=true;
 try{const p=await api('join',{alias,character:selected});localStorage.setItem('wr-arc-player-'+roomCode,JSON.stringify(p));toView('player',roomCode)}catch(e){showError(e.message);form.querySelector('button[type=submit]').disabled=false}finally{busy=false}
}
function renderIntro(){document.body.className='arcade-intro';root.innerHTML=header()+`<div class="shell"><section class="arc-learn"><div class="eyebrow acid">${safe(solo.alias)} / PLAYING AS ${cast[solo.character].name} / 5 MINUTES</div><h1>HOW TO PLAY.</h1>${howToPlay()}<button class="btn full" data-action="begin-solo">START PLAYING →</button><p class="arc-learn-foot">You can open HOW TO PLAY again during the game.</p></section></div>`;paintIcons();}
function beginSolo(){solo.phase='active';solo.deadline=Date.now()+solo.remaining;game=solo.game;saveSolo();sceneKey='';renderPlay();}
function saveSolo(){if(solo){solo.game=game;try{sessionStorage.setItem(gameStore,JSON.stringify(solo))}catch{}}}
function phaseNow(){return solo?solo.phase:live?.phase}
function secondsLeft(){if(solo)return solo.phase==='paused'?solo.remaining/1000:(solo.deadline-Date.now())/1000;return live?.phase==='paused'?(live.remaining||0)/1000:((live?.deadline||clock())-clock())/1000}
function renderPlay(){
 document.body.className='arcade-playing';sceneKey='play';
 const alias=solo?.alias||creds?.alias||'PLAYER';
 root.innerHTML=header()+`<main class="arc-player-shell"><div class="arc-hud"><div><span>PLAYER</span><b>${safe(alias)}</b></div><div class="arc-score"><span>POINTS</span><b id="arc-score">${game?.score||0}</b></div><div><span>TIME LEFT</span><b id="arc-time">${prettyTime(secondsLeft())}</b></div></div><div class="arc-canvas-frame"><canvas id="arc-canvas" role="img" aria-label="Top-down pixel agency. Use the direction pad or arrow keys to move. Collect items, then stand next to a teammate and press the action button."></canvas><div class="arc-game-message" id="game-message" role="status" aria-live="polite"></div><div id="arc-freeze" class="arc-freeze" hidden></div></div><div class="arc-task"><span>YOUR NEXT STEP</span><button data-action="map" aria-label="How to play: controls, objects and room map">HOW TO PLAY</button><p id="arc-hint">${safe(gameHint(game,clock()))}</p><div class="arc-checklist" id="arc-checklist" aria-label="Items needed for this job"></div></div><div class="arc-bag" id="arc-bag" aria-label="Items in your bag"></div><div class="arc-controls"><div class="arc-dpad-wrap"><span class="arc-move-label">MOVE</span><div class="arc-dpad" aria-label="Movement controls"><button class="pad-up" data-dir="up" aria-label="Move up">▲</button><button class="pad-left" data-dir="left" aria-label="Move left">◀</button><span class="pad-center"></span><button class="pad-right" data-dir="right" aria-label="Move right">▶</button><button class="pad-down" data-dir="down" aria-label="Move down">▼</button></div></div><div class="arc-action-wrap"><button class="arc-action" data-action="use" id="arc-use" aria-label="Talk to the nearest teammate or complete their job">TALK</button><span id="arc-action-hint">Stand beside a teammate, then press this button.</span></div></div><div class="arc-play-footer"><span>${view==='solo'?'YOUR OWN MAP · CHOOSE ANY JOB':'YOUR OWN MAP · SCORES SHARED WITH THE ROOM'}</span><button data-action="pause-menu">${view==='solo'?'PAUSE':'MENU'} Ⅱ</button></div></main>`;
 renderer=createArcadeRenderer(q('#arc-canvas'));updatePlayUI();
}
function updatePlayUI(){
 if(!game||!q('#arc-score'))return;q('#arc-score').textContent=game.score;q('#arc-time').textContent=prettyTime(secondsLeft());q('#arc-time').classList.toggle('urgent',secondsLeft()<30);
 q('#arc-hint').textContent=gameHint(game,clock());q('#arc-use').textContent=jobLabel(game);
 const near=nearbyJob(game);q('#arc-action-hint').textContent=near<0?'Stand beside a teammate, then press this button.':`Press to ${jobLabel(game).toLowerCase()} with ${JOBS[near].person}.`;
 const checklist=q('#arc-checklist'),items=jobChecklist(game),checkKey=JSON.stringify(items);
 if(checklist.dataset.items!==checkKey){checklist.dataset.items=checkKey;checklist.innerHTML=items.map(item=>`<span class="arc-check-item${item.have?' collected':''}">${itemIcon(item.icon,item.label)}<span>${item.have?'✓':'○'} ${safe(item.label)}</span></span>`).join('');paintIcons();}
 const bag=q('#arc-bag');const bagKey=game.inventory.join(',');if(bag.dataset.items!==bagKey){bag.dataset.items=bagKey;bag.innerHTML='<span class="bag-label">YOUR BAG</span>'+(game.inventory.length?game.inventory.map(id=>{const p=PICKUPS.find(i=>i.id===id),label=id==='brief'?'BRIEF':p?.kind==='clue'?'CLUE':p?.kind==='colour'?'COLOUR':p?.kind==='word'?'WORD':p?.icon==='battery'?'BATTERY':'SPANNER';return `<span class="bag-item" title="${safe(p?.name||'CLIENT BRIEF')}">${itemIcon(p?.icon||'brief',p?.name||'Client brief')}<small>${label}</small></span>`}).join(''):'<span class="bag-empty">Empty. Walk over a floating object to collect it.</span>');paintIcons();}
 const freeze=q('#arc-freeze'),p=phaseNow(),blocked=p==='paused'||!solo&&pending.length>=24;
 freeze.hidden=!blocked;if(blocked)freeze.innerHTML=`<b>${p==='paused'?'GAME PAUSED':'RECONNECTING…'}</b><span>${p==='paused'?'Wait for your host to resume.':'Your progress is syncing. Keep this tab open.'}</span>`;
 const connection=q('#arc-connection');if(connection){connection.textContent=connected?'CONNECTED':'RECONNECTING';connection.classList.toggle('offline',!connected);}
}
function processInput(input){
 if(!game||phaseNow()!=='active'||modalType||!solo&&(live?.finished||pending.length>=24))return;
 const op={...input,n:++nextSeq};const events=applyArcadeInput(game,op,clock());game.seq=op.n;
 if(!solo)pending.push(op);else saveSolo();
 for(const event of events){if(event.kind==='job'){note(event.detail+' +'+event.points+' points!');playNote('job');if(event.poster)showPoster(event.poster)}else if(event.kind==='note')note(event.text);else if(event.kind==='pickup')playNote('pickup');}
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
 if(data.error){connected=false;return}clockOffset=data.serverNow-Date.now();connected=true;const previous=live?.phase;live=data;
 if(data.game&&(force||!pending.length&&!sending||data.seq>ackSeq))rebase(data.game,data.seq);
 if(previous==='active'&&data.phase==='paused'){pending=[];if(data.game)rebase(data.game,data.seq);held='';keys=[];}
 if(view==='host'||view==='stage'){renderRoom();return}
 if(data.finished||data.phase==='finished'){pending=[];if(data.game){game=structuredClone(data.game);ackSeq=data.seq;nextSeq=data.seq;}if(modalType)closeModal();if(sceneKey!=='result'){sceneKey='result';renderResult(data.profile)}return}
 if(data.phase==='lobby'){if(sceneKey!=='waiting'){sceneKey='waiting';renderWaiting()}else q('#arc-wait-count')&&(q('#arc-wait-count').textContent=data.count);return}
 if(game&&sceneKey!=='play')renderPlay();updatePlayUI();
}
async function fetchState(force=false){try{acceptLive(await api('state?room='+roomCode),force)}catch(e){connected=false;if(!live){root.innerHTML=header()+`<div class="shell"><div class="waiting"><h1>COULDN’T JOIN<br>THE ROOM.</h1><div class="error-banner">${safe(e.message)}</div><button class="btn" data-action="retry">TRY AGAIN ↻</button><a class="text-button" href="/">Back to home</a></div></div>`}updatePlayUI()}}
function connectRoom(){
 fetchState(true);clearInterval(poller);
 poller=setInterval(()=>fetchState(),1500);
}
function renderWaiting(){document.body.className='arcade-waiting';root.innerHTML=header()+`<div class="shell"><section class="arc-learn arc-wait-learn"><div class="eyebrow acid">${safe(creds.alias)} / AS ${cast[creds.character].name}</div><h1>YOU’RE IN.</h1><p class="arc-wait-instruction">Wait for your host to start. Read this while you wait.</p><div class="label-pill"><span id="arc-wait-count">${live.count}</span> PLAYERS HAVE JOINED</div><h2>HOW TO PLAY</h2>${howToPlay()}<p class="arc-learn-foot">Keep this page open. Everyone starts together.</p></section></div>`;paintIcons();}

function roomControls(){
 if(view!=='host')return '';const p=live.phase;return `<div class="arc-host-controls">${p==='lobby'?`<button class="btn" data-action="control" data-value="start" ${!live.count?'disabled':''}>START THE GAME →</button>`:p==='active'?'<button class="btn secondary" data-action="control" data-value="pause">PAUSE EVERYONE Ⅱ</button><button class="btn" data-action="control" data-value="finish">END GAME + REVEAL ROLES →</button>':p==='paused'?'<button class="btn" data-action="control" data-value="resume">RESUME EVERYONE →</button><button class="btn secondary" data-action="control" data-value="finish">END GAME + REVEAL ROLES →</button>':'<button class="btn" data-action="new-room">CREATE ANOTHER GAME ↗</button>'}<button class="btn secondary" data-action="stage">OPEN BIG SCREEN ↗</button><button class="text-button" data-action="copy">Copy player link</button></div>`;
}
function leaderboard(){return `<div class="arc-leaderboard"><div class="eyebrow">${live.phase==='finished'?'FINAL':'LIVE'} LEADERBOARD</div>${live.leaderboard.length?live.leaderboard.map((p,i)=>`<div class="arc-rank-row"><span class="arc-rank-num">${String(i+1).padStart(2,'0')}</span><span class="mini-head">${character(p.character)}</span><div><b>${safe(p.alias)}</b><small>${p.completed} ${p.completed===1?'JOB':'JOBS'} DONE</small></div><strong>${p.score.toLocaleString('en-GB')}</strong></div>`).join(''):'<p class="fine">Players appear when they join.</p>'}</div>`}
function highlights(){return `<div class="arc-highlights"><div class="eyebrow">PLAYER HIGHLIGHTS</div>${live.events.length?live.events.slice(0,4).map(e=>`<article class="arc-highlight" style="--event-colour:${JOBS[e.type].colour}">${e.poster?`<div class="arc-highlight-poster">${posterSVG(e.poster)}</div>`:`<span class="arc-highlight-symbol">${['⌕','✳','✉','⚒'][e.type]}</span>`}<div><b>${safe(e.alias)}</b><p>${safe(e.detail)}</p><span>+${e.points} POINTS / ${JOBS[e.type].role.toUpperCase()}</span></div></article>`).join(''):'<div class="arc-highlight-empty">The first completed job lands here.<br>Every player has their own map.</div>'}</div>`}
function renderRoom(){
 document.body.className='arcade-room '+(view==='stage'?'arcade-stage':'arcade-host');
 const key=live.phase==='lobby'?'lobby':live.phase==='finished'?'room-result':'room-playing';
 const structural=sceneKey!==key;if(structural){sceneKey=key;
  if(key==='lobby'){root.innerHTML=header()+`<div class="shell"><section class="arc-room-lobby"><div><div class="eyebrow acid">GROUP GAME / ${Math.round(live.duration/60)} MINUTES</div><h1>GET THE<br><span class="acid">CREW IN.</span></h1><p>Scan the code on your phone.<br>Choose a character and nickname.<br>Wait for your host to start.</p><div class="lobby-cast-line">${cast.slice(0,3).map((c,i)=>`<div>${character(i)}<span>${c.name}</span></div>`).join('')}</div></div><div class="qr-box">${qr(playerLink())}<div class="mono" style="margin-top:14px">SCAN TO JOIN / ROOM CODE</div><div class="room-display">${safe(roomCode)}</div><button data-action="copy">COPY PLAYER LINK ↗</button></div></section><div class="arc-join-count"><b id="arc-joined">0</b><span>OF 50 PLAYERS HAVE JOINED</span></div><div id="arc-room-controls"></div><div class="player-cloud" id="arc-player-cloud"></div><p class="fine">${view==='host'?'Open the big screen on your projector. Keep this tab for controls.':''} Each player explores their own map. The big screen follows the whole room.</p></div>`;}
  else root.innerHTML=header()+`<div class="shell arc-room-shell"><div class="arc-room-heading"><div><span class="eyebrow acid">${key==='room-result'?'GAME COMPLETE':'SHARED LAUNCH / EVERY JOB HELPS'}</span><h1>${key==='room-result'?'THAT’S A WRAP.':'THE CREW’S ON IT.'}</h1></div><div class="arc-room-clock"><span>${key==='room-result'?'ROOM POINTS':'TIME LEFT'}</span><b id="arc-room-clock">0:00</b></div></div><div class="arc-launch-progress"><div><b id="arc-launch-count">0 JOBS DONE</b><span id="arc-launch-goal">HELP GET THE LAUNCH READY</span></div><div class="arc-launch-track"><span id="arc-launch-bar"></span></div></div><div class="arc-room-grid"><section><div class="arc-spotlight-label"><span>PLAYER SPOTLIGHT</span><b id="arc-spotlight-name">WAITING FOR PLAYERS</b><span id="arc-spotlight-score"></span></div><div class="arc-canvas-frame arc-stage-canvas"><canvas id="arc-stage-canvas" role="img" aria-label="The spotlight player’s pixel agency map"></canvas></div>${key==='room-result'?'<div class="arc-role-spread" id="arc-role-spread"></div>':'<p class="arc-room-tip">Players choose their jobs. The type of work they choose reveals their agency role.</p>'}<div id="arc-room-controls"></div></section><aside><div id="arc-leaderboard-wrap"></div><div id="arc-highlights-wrap"></div></aside></div></div>`;
  if(key!=='lobby'){renderer=createArcadeRenderer(q('#arc-stage-canvas'),true);spotlight=-1;spotlightAt=0;}
 }
 if(key==='lobby'){q('#arc-joined').textContent=live.count;q('#arc-player-cloud').innerHTML=live.players.map(p=>`<span class="alias-chip character-chip"><span class="mini-head">${character(p.character)}</span>${safe(p.alias)}</span>`).join('');}
 else {q('#arc-leaderboard-wrap').innerHTML=leaderboard();q('#arc-highlights-wrap').innerHTML=highlights();q('#arc-launch-count').textContent=live.launch.jobs+' JOBS DONE';q('#arc-launch-goal').textContent=live.launch.progress>=100?'LAUNCH GOAL REACHED ✓':live.launch.target+' JOBS GET THE LAUNCH READY';q('#arc-launch-bar').style.width=live.launch.progress+'%';if(key==='room-result'){q('#arc-role-spread').innerHTML=roles.map((r,i)=>`<div style="--role:${r.color}"><b>${live.players.filter(p=>p.profile?.role===i).length}</b><span>${r.job}</span></div>`).join('');}}
 q('#arc-room-controls').innerHTML=roomControls();
}
async function control(action){if(busy)return;if(action==='finish'&&!window.confirm('End the game for everyone and reveal their roles?'))return;busy=true;try{await api('control',{action});await fetchState(true)}catch(e){toast(e.message)}finally{busy=false}}
async function finishSelf(){
 if(busy)return;busy=true;held='';keys=[];
 try{if(solo){closeModal();solo.phase='finished';saveSolo();sceneKey='result';renderResult(arcadeProfile(game));}
 else{closeModal();await flushInputs();if(pending.length){toast('Wait for your last moves to sync, then finish.');return}await api('finish',{});await fetchState(true)}}catch(e){toast(e.message)}finally{busy=false}
}
function renderResult(profile){
 document.body.className='arcade-result';sceneKey='result';const g=game||live?.game,alias=solo?.alias||creds?.alias||'PLAYER',ci=g?.character??0;
 if(!profile){root.innerHTML=header()+`<div class="shell"><div class="waiting"><h1>READY FOR<br><span class="acid">ANOTHER GO?</span></h1><p>You didn’t collect any items this time. Explore a room and help the crew to discover your role.</p><button class="btn" data-action="solo" style="margin-top:20px">PLAY SOLO →</button><a class="text-button" href="/">Back to home</a></div></div>`;return}
 const r=roles[profile.role],jobs=profile.completed;
 root.innerHTML=header()+`<div class="shell"><section class="arc-result-grid"><div class="arc-result-copy"><div class="eyebrow acid">${safe(alias)} / GAME COMPLETE</div><h1>${r.name}</h1><span class="arc-result-job" style="color:${r.color}">${r.job}</span><p>${r.description}</p><div class="arc-result-stats"><div><b>${profile.score.toLocaleString('en-GB')}</b><span>POINTS</span></div><div><b>${jobs}</b><span>${jobs===1?'JOB':'JOBS'} COMPLETED</span></div></div><div class="arc-result-evidence"><span>THE WORK YOU CHOSE</span>${JOBS.map((j,i)=>`<div><b style="color:${j.colour}">${j.role}</b><span>${profile.jobs[i]} ${profile.jobs[i]===1?'job':'jobs'}</span></div>`).join('')}</div><p class="fine">Your chosen jobs and collected items shape your role. Points reward completed work and quick deliveries. This is a game profile, not a careers test.</p><div class="reveal-actions"><button class="btn" data-action="download-role">SAVE ROLE CARD ↓</button><a class="btn secondary" href="/">BACK TO HOME ↗</a></div></div><div class="arc-result-card" id="arc-role-card" style="--role:${r.color}"><div class="id-top"><span class="brand-name">THE WAR<br>ROOM.</span><span class="mono">YOUR AGENCY ROLE<br>PIXEL GAME / ${new Date().getFullYear()}</span></div><div class="arc-card-character">${character(ci,'reacting')}</div><div class="id-name">${safe(alias.toUpperCase())}</div><h2>${r.name}</h2><span class="mono">${r.job}</span><div class="arc-card-score"><b>${profile.score}</b><span>POINTS / ${jobs} JOBS</span></div><div class="barcode"></div></div></section>${g?.posters?.length?`<section class="arc-your-posters"><div class="eyebrow">THE ADS YOU MADE</div><div>${g.posters.map(p=>`<article>${posterSVG(p)}</article>`).join('')}</div></section>`:''}</div>`;
}
async function downloadRole(){
 const p=solo?arcadeProfile(game):live?.profile;if(!p)return;const r=roles[p.role],ci=game?.character??0,alias=solo?.alias||creds?.alias||'PLAYER';await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=800;canvas.height=1100;const c=canvas.getContext('2d');c.fillStyle=r.color;c.fillRect(0,0,800,1100);c.fillStyle='#172c35';const text=(s,x,y,size=25,font='WarMono')=>{c.font=`${size}px ${font}`;c.fillText(s,x,y)};
 text('THE WAR ROOM',45,80,65,'WarDisplay');text('YOUR AGENCY ROLE / PIXEL GAME',45,120,18);c.fillRect(45,148,710,2);const image=new Image();image.src='/assets/crew-reactions.png';await image.decode();const cw=image.width/4,ch=image.height*.65,w=350*cw/ch;c.drawImage(image,ci*cw,0,cw,ch,(800-w)/2,160,w,350);c.fillRect(45,520,710,2);text(alias.toUpperCase(),45,565,30);text(r.name,45,665,83,'WarDisplay');text(r.job,45,713,22);text(String(p.score),45,830,93,'WarDisplay');text('POINTS / '+p.completed+' JOBS',45,874,20);c.fillRect(45,925,710,2);text('YOUR JOBS. YOUR ROLE.',45,982,36,'WarDisplay');text('THEWARROOM / '+cast[ci].name,45,1040,19);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob){toast('You can screenshot your role card.');return}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='War-Room-'+alias.replace(/[^a-z0-9]/gi,'-')+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('Role card ready to save.');
}

document.addEventListener('submit',e=>{if(e.target.id==='arc-entry'){e.preventDefault();enter(e.target)}});
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-action]');if(!button||button.disabled)return;const action=button.dataset.action;
 if(action==='solo')openModal('solo');if(action==='join')openModal('join');if(action==='host'||action==='new-room')openModal('host');if(action==='close-modal')closeModal();if(action==='create-room')createRoom();if(action==='begin-solo')beginSolo();
 if(action==='character'){selected=Number(button.dataset.value);document.querySelectorAll('.character-pick').forEach((el,i)=>{el.classList.toggle('selected',i===selected);el.setAttribute('aria-pressed',String(i===selected));el.querySelector('.pick-check').textContent=i===selected?'✓':'+'});q('#arc-player-name').textContent=cast[selected].name;}
 if(action==='resume-solo'){solo=loadJSON(gameStore);if(!solo)return;game=solo.game;selected=solo.character;view='solo';clockOffset=0;history.pushState(null,'','/?view=solo');if(solo.phase==='active'&&solo.deadline>Date.now())renderPlay();else{solo.phase='finished';renderResult(arcadeProfile(game))}}
 if(action==='use')actionQueued=true;if(action==='map')openModal('map');
 if(action==='pause-menu'){if(solo?.phase==='active'){solo.remaining=Math.max(0,solo.deadline-Date.now());solo.phase='paused';saveSolo();}openModal('pause');}
 if(action==='finish-self')finishSelf();if(action==='download-role')downloadRole();if(action==='retry')fetchState(true);if(action==='control')control(button.dataset.value);
 if(action==='stage')window.open('/?view=stage&room='+roomCode,'war-room-arcade-stage');if(action==='copy'){try{await navigator.clipboard.writeText(playerLink());toast('Player link copied.')}catch{toast('Room code: '+roomCode)}}
 if(action==='sound'){sound=!sound;button.textContent=sound?'SOUND ON':'SOUND OFF';button.setAttribute('aria-pressed',String(sound));if(sound)playNote('pickup');}
});
document.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-dir]');if(!b)return;e.preventDefault();held=b.dataset.dir;keys=[];b.setPointerCapture?.(e.pointerId);b.classList.add('pressed');});
document.addEventListener('pointerup',()=>{held='';document.querySelectorAll('[data-dir]').forEach(b=>b.classList.remove('pressed'))});document.addEventListener('pointercancel',()=>{held=''});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if(modalType)closeModal();return}if(sceneKey!=='play'||modalType)return;
 const dir={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'}[e.key];
 if(dir){e.preventDefault();if(!keys.includes(dir))keys.push(dir)}if((e.key===' '||e.key==='e'||e.key==='E')&&!e.repeat){e.preventDefault();actionQueued=true;}
});
document.addEventListener('keyup',e=>{const d={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'}[e.key];if(d)keys=keys.filter(k=>k!==d)});
window.addEventListener('blur',()=>{held='';keys=[];actionQueued=false;saveSolo()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){held='';keys=[];saveSolo()}else if(roomCode&&!solo)fetchState(true)});
document.addEventListener('keydown',e=>{if(e.key!=='Tab'||!modalType)return;const nodes=[...q('#arc-modal').querySelectorAll('button,a,input:not([type=hidden]),select')].filter(n=>!n.disabled);if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus()}});
function frame(time){
 if(sceneKey==='play'&&game){
  if(phaseNow()==='active'&&(!solo||solo.phase==='active')&&!modalType&&time-lastInput>=ARCADE_TICK){if(actionQueued){processInput({a:1});actionQueued=false;lastInput=time}else{const d=held||keys.at(-1);if(d){processInput({d});lastInput=time}}}
  renderer?.draw(game,clock(),{paused:phaseNow()==='paused'});updatePlayUI();if(toastUntil&&Date.now()>toastUntil){q('#game-message')?.classList.remove('visible');toastUntil=0;}
  if(solo&&solo.phase==='active'&&secondsLeft()<=0){solo.phase='finished';saveSolo();if(modalType)closeModal();renderResult(arcadeProfile(game));}
  if(solo&&time-lastSave>1000){saveSolo();lastSave=time;}
 }
 if((view==='host'||view==='stage')&&live&&live.phase!=='lobby'){
  const pool=live.players;if(pool.length&&(time-spotlightAt>4000||spotlight<0)){spotlight=(spotlight+1)%pool.length;spotlightAt=time;}
  const p=pool[spotlight%Math.max(1,pool.length)];if(p){renderer?.draw(p.game,clock(),{label:p.alias,paused:live.phase==='paused'});const name=q('#arc-spotlight-name');if(name)name.textContent=p.alias+' / '+cast[p.character].name;const score=q('#arc-spotlight-score');if(score)score.textContent=p.score+' PTS';}
  const t=q('#arc-room-clock');if(t)t.textContent=live.phase==='finished'?live.launch.score.toLocaleString('en-GB'):prettyTime(secondsLeft());
 }
 requestAnimationFrame(frame);
}
setInterval(flushInputs,650);requestAnimationFrame(frame);
if(view==='solo'||view==='practice'){const old=loadJSON(gameStore);if(old){solo=old;game=old.game;view='solo';if(old.phase==='intro')renderIntro();else if(old.phase==='finished'||old.deadline<=Date.now()){solo.phase='finished';renderResult(arcadeProfile(game))}else if(old.phase==='paused'){solo.phase='active';solo.deadline=Date.now()+solo.remaining;renderPlay()}else renderPlay();}else{home();openModal('solo')}}
else if(view==='player'&&!creds?.id){home();openModal('join')}
else if(view==='host'&&!creds?.host){home();openModal('host')}
else if(['player','host','stage'].includes(view)){root.innerHTML=header()+`<div class="waiting"><div class="radar">W</div><h1>CONNECTING<br><span class="acid">YOUR ROOM…</span></h1></div>`;connectRoom()}
else home();
