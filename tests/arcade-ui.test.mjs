import * as undergroundBrand from '../src/underground-brand.js';
import * as agencyTasks from '../src/agency-tasks.js';
// A DOM adapter executes the shipped controller code. Browser layout and touch
// compatibility need device QA; map pixels are rendered separately with Canvas.
import {test} from 'node:test';
import * as world from '../src/arcade-world.js';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {cast} from '../src/story.js';
import {roles,roleLessons,waysIn} from '../src/content.js';
import {character,selector} from '../src/scenes.js';
import {isClean,isGameName,makeNickname} from '../src/filter.js';
import {qr} from '../src/qr.js';
import {drawRoleCard,MCCANN_LOGO_URL} from '../src/role-card.js';
import {ARCADE_TICK,JOBS,PICKUPS,newArcadeGame,applyArcadeInput,arcadeProfile,gameHint,jobLabel,jobChecklist,nearbyJob,nextInstruction,publicArcadeGame,canWalk} from '../src/arcade-world.js';
import {posterSVG,trainerSVG,COLOURWAYS} from '../src/arcade-renderer.js';
import {TASK_COPY,nudge} from '../src/task-copy.js';
function ui(options={}){
 const ids=new Map(),listeners=new Map();let time=1800000000000;
 class Element{
  constructor(id=''){this.id=id;this.dataset=new Proxy({},{set(o,k,v){o[k]=String(v);return true}});this.value='';this.textContent='';this.hidden=false;this.classList={add(){},remove(){},toggle(){}};this.html='';}
  set innerHTML(value){this.html=value;for(const match of value.matchAll(/\bid="([^"]+)"/g))ids.set(match[1],new Element(match[1]));}
  get innerHTML(){return this.html}
  append(el){if(el.id)ids.set(el.id,el)}
  remove(){ids.delete(this.id)}
  querySelector(){return new Element()}
  querySelectorAll(){return []}
  setAttribute(){}
  focus(){}
 }
 const app=new Element('app'),toast=new Element('toast');ids.set('app',app);ids.set('toast',toast);
 const store=()=>({data:new Map(),getItem(k){return this.data.get(k)||null},setItem(k,v){this.data.set(k,v)}});
 const context={console,URLSearchParams,URL,JSON,Math,Date:class extends Date{static now(){return time}},performance:{now:()=>time},structuredClone,TextEncoder,Blob,Image:options.Image,
  ...world,...agencyTasks,...undergroundBrand,cast,roles,roleLessons,waysIn,character,selector,isClean,isGameName,makeNickname,qr,ARCADE_TICK,JOBS,PICKUPS,newArcadeGame,applyArcadeInput,arcadeProfile,gameHint,jobLabel,jobChecklist,nearbyJob,nextInstruction,publicArcadeGame,posterSVG,trainerSVG,COLOURWAYS,TASK_COPY,nudge,drawRoleCard,MCCANN_LOGO_URL,drawGameIcon(){},drawPractice(){},createArcadeRenderer:()=>({draw(){}}),createRoomRenderer:()=>({draw(){}}),
  location:{origin:'https://game.test',search:options.search||'',href:'https://game.test/'},history:{pushState(){}},sessionStorage:store(),localStorage:store(),navigator:{},
  setTimeout(){return 0},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},
  FormData:class{constructor(form){this.fields=form.fields}get(k){return this.fields[k]}},
  fetch:options.fetchImpl,window:{addEventListener(){},confirm(){return true}},
  document:{fonts:{ready:Promise.resolve()},hidden:false,body:{className:'',append(el){ids.set(el.id,el)}},querySelector(s){return s.startsWith('#')?ids.get(s.slice(1))||null:new Element()},querySelectorAll(){return []},createElement(tag){if(tag==='canvas'&&options.canvasFactory)return options.canvasFactory();const el=new Element();if(tag==='a')el.click=()=>options.onDownload?.(el);return el;},addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)}}
 };
 for(const [k,v] of Object.entries(options.session||{}))context.sessionStorage.setItem(k,JSON.stringify(v));
 for(const [k,v] of Object.entries(options.storage||{}))context.localStorage.setItem(k,JSON.stringify(v));
 const source=readFileSync(new URL('../src/arcade-app.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');
 vm.createContext(context);vm.runInContext(source+'\nglobalThis.arcTest={read:()=>({game,solo,view,sceneKey,practice,held,movementPointer,modalType}),step:processInput,workMarkup,update:updatePlayUI};',context);
 async function dispatch(name,target,extra={}){for(const fn of listeners.get(name)||[])await fn({target,preventDefault(){},...extra})}
 async function click(action,value,slot){return dispatch('click',{closest(s){return s==='[data-action]'?{dataset:{action,value,slot},disabled:false}:null}})}
 const walkTo=(x,y,adjacent=false)=>{
  const g=context.arcTest.read().game,queue=[[g.x,g.y,[]]],seen=new Set([g.x+','+g.y]);let route;
  while(queue.length){const [cx,cy,p]=queue.shift();if(adjacent?Math.abs(cx-x)+Math.abs(cy-y)<=1:cx===x&&cy===y){route=p;break}for(const [d,dx,dy] of [['up',0,-1],['down',0,1],['left',-1,0],['right',1,0]]){const nx=cx+dx,ny=cy+dy,k=nx+','+ny;if(!seen.has(k)&&canWalk(nx,ny)){seen.add(k);queue.push([nx,ny,[...p,d]])}}}
  assert.ok(route);for(const d of route){time+=ARCADE_TICK;context.arcTest.step({d})}
 };
 return {context,app,ids,click,walkTo,dispatch,async settle(){await new Promise(setImmediate)},async start(){await click('begin-practice');for(let i=0;i<4;i++){time+=ARCADE_TICK;context.arcTest.step({d:'right'})}time+=ARCADE_TICK;await context.arcTest.step({a:1});},advance(ms){time+=ms},use(){time+=ARCADE_TICK;const result=context.arcTest.step({a:1});const w=context.arcTest.read().game?.work;if(w){time+=ARCADE_TICK;context.arcTest.step({b:{task:w.id,run:w.run,picks:[0,0,0]}})}return result},submit(fields){return dispatch('submit',{id:'arc-entry',fields})}};
}
test('saving a role card loads the McCann artwork into the PNG and names the file for McCann',async()=>{
 const game=newArcadeGame(2);game.jobs[1]=2;game.affinity[1]=7;game.score=360;
 const drawn=[],downloads=[];
 class CardImage{constructor(){this.width=1536;this.height=1024;}async decode(){if(this.src===MCCANN_LOGO_URL){this.width=800;this.height=200;}}}
 const c={fillRect(){},drawImage(image){drawn.push(image.src)},measureText(value){return {width:value.length*parseFloat(this.font)*.5}},fillText(){}};
 const h=ui({search:'?view=solo',session:{'wr-arcade-solo':{alias:'BrandedFox',character:2,phase:'finished',game}},Image:CardImage,canvasFactory:()=>({getContext:()=>c,toBlob(done,type){assert.equal(type,'image/png');done(new Blob(['mock-canvas'],{type}));}}),onDownload:a=>downloads.push({name:a.download,url:a.href})});
 assert.match(h.app.innerHTML,/arc-card-brand/);assert.match(h.app.innerHTML,/alt="McCann"/);
 await h.click('download-role');assert.deepEqual(drawn,[MCCANN_LOGO_URL,'/assets/crew-reactions.png']);
 assert.equal(downloads[0].name,'McCann-The-Agency-BrandedFox.png');assert.match(h.ids.get('toast').textContent,/McCann role card/);URL.revokeObjectURL(downloads[0].url);
});
test('McCann stays visible in the active phone game and the live room screen',async()=>{
 const h=ui();await h.click('solo');await h.submit({mode:'solo',alias:'VisibleBrand'});await h.start();
 assert.equal(h.context.arcTest.read().sceneKey,'play');assert.match(h.app.innerHTML,/mccann-endorsement/);assert.match(h.app.innerHTML,/alt="McCann"/);
 const source=readFileSync(new URL('../src/arcade-app.js',import.meta.url),'utf8');
 assert.match(source,/arc-stage-credit/);
 const css=readFileSync(new URL('../src/arcade.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/\.arcade-playing \.mccann-endorsement\{display:none\}/);
 assert.match(css,/\.arc-stage-credit \.mccann-mark/);
});
test('a missing logo reports a saving error instead of exporting an unbranded card',async()=>{
 const game=newArcadeGame();game.jobs[0]=2;game.affinity[0]=8;
 class MissingLogo{async decode(){if(this.src===MCCANN_LOGO_URL)throw Error('Image failed');}}
 let downloads=0;const h=ui({search:'?view=solo',session:{'wr-arcade-solo':{alias:'CarefulFox',character:0,phase:'finished',game}},Image:MissingLogo,onDownload(){downloads++}});
 await h.click('download-role');assert.equal(downloads,0);assert.match(h.ids.get('toast').textContent,/screenshot your branded card/);
});
test('solo player selects a character, moves, collects, makes an ad and reaches a role card',async()=>{
 const h=ui();assert.match(h.app.innerHTML,/HOST A GAME/);assert.match(h.app.innerHTML,/SKIP TO JOB ROLES/);assert.doesNotMatch(h.app.innerHTML,/JOIN A GROUP GAME/);await h.click('solo');await h.click('character','2');await h.submit({mode:'solo',alias:'PixelHG'});
 assert.equal(h.context.arcTest.read().solo.character,2);assert.match(h.app.innerHTML,/TRY THE CONTROLS/);await h.start();
 assert.equal(h.context.arcTest.read().sceneKey,'play');assert.match(h.app.innerHTML,/arc-dpad/);assert.match(h.app.innerHTML,/arc-action/);
 h.walkTo(22,3);h.walkTo(22,8);h.walkTo(26,4,true);h.use();
 assert.equal(h.context.arcTest.read().game.jobs[1],1);assert.match(h.ids.get('arc-score').textContent.toString(),/180/);
 h.advance(4000);h.walkTo(22,3);h.walkTo(22,8);h.walkTo(26,4,true);h.use();
 await h.click('pause-menu');await h.click('finish-self');
 assert.equal(h.context.arcTest.read().solo.phase,'finished');assert.match(h.app.innerHTML,/THE INSTIGATOR/);assert.match(h.app.innerHTML,/THE WORK YOU MADE/);assert.match(h.app.innerHTML,/PixelHG/);assert.match(h.app.innerHTML,/href="#meet-team"/);assert.match(h.app.innerHTML,new RegExp('lesson-color:'+roles[1].color+'" open'));assert.match(h.app.innerHTML,/YOUR GAME ROLE/);
});
test('solo pause keeps the remaining time, and the chosen character never preselects a role',async()=>{
 const h=ui();await h.click('solo');await h.click('character','0');await h.submit({mode:'solo',alias:'RemPlayer'});await h.start();h.advance(10000);await h.click('pause-menu');
 const left=h.context.arcTest.read().solo.remaining;h.advance(60000);await h.click('close-modal');
 assert.equal(h.context.arcTest.read().solo.phase,'active');assert.equal(h.context.arcTest.read().solo.deadline-h.context.Date.now(),left);assert.equal(arcadeProfile(h.context.arcTest.read().game),null);
});
test('opening the object guide pauses solo time and movement, then resumes with the same time left',async()=>{
 const h=ui();await h.click('solo');await h.submit({mode:'solo',alias:'GuideReader'});await h.start();
 h.walkTo(22,3);const before=h.context.arcTest.read().game.x;h.advance(10000);await h.click('map');
 const left=h.context.arcTest.read().solo.remaining;assert.equal(h.context.arcTest.read().solo.phase,'paused');
 h.advance(60000);h.context.arcTest.step({d:'right'});assert.equal(h.context.arcTest.read().game.x,before);
 await h.click('close-modal');assert.equal(h.context.arcTest.read().solo.phase,'active');
 assert.equal(h.context.arcTest.read().solo.deadline-h.context.Date.now(),left);
 h.walkTo(22,8);h.walkTo(26,4,true);h.use();assert.equal(h.context.arcTest.read().game.jobs[1],1);
});
test('the live instruction and action button advance from collecting to completing a job',async()=>{
 const h=ui();await h.click('solo');await h.submit({mode:'solo',alias:'FollowDots'});await h.start();
 assert.equal(h.ids.get('arc-use').disabled,true);assert.equal(h.ids.get('arc-hint').textContent,'Choose your first job.');
 h.walkTo(22,3);h.walkTo(22,8);assert.equal(h.ids.get('arc-hint').textContent,'Help NOVA make a campaign idea.');
 h.walkTo(26,4,true);assert.equal(h.ids.get('arc-hint').textContent,'Press START.');
 assert.equal(h.ids.get('arc-use').disabled,false);assert.equal(h.ids.get('arc-use').textContent,'START');h.use();
 assert.equal(h.ids.get('arc-hint').textContent,'Job done. Choose your next one.');
 assert.equal(h.ids.get('arc-bag').hidden,false);
});
test('practice uses the real controls and starts the solo timer only when ready',async()=>{
 const h=ui();await h.click('solo');await h.submit({mode:'solo',alias:'PracticePlayer'});await h.click('begin-practice');
 assert.equal(h.context.arcTest.read().sceneKey,'practice');assert.equal(h.context.arcTest.read().solo.deadline,null);
 for(let i=0;i<3;i++)h.context.arcTest.step({d:'right'});h.advance(60000);
 assert.equal(h.context.arcTest.read().practice.collected,true);assert.equal(h.ids.get('arc-use').disabled,true);
 assert.equal(h.context.arcTest.read().game.score,0);assert.equal(h.context.arcTest.read().solo.deadline,null);
 h.context.arcTest.step({d:'right'});assert.equal(h.ids.get('arc-use').disabled,false);await h.use();
 const state=h.context.arcTest.read();assert.equal(state.sceneKey,'play');assert.equal(state.game.score,0);assert.equal(state.game.x,16);
 assert.equal(state.solo.deadline-h.context.Date.now(),300000);assert.deepEqual([...state.game.affinity],[0,0,0,0]);
});
test('lifting the action thumb does not stop the movement thumb',async()=>{
 const h=ui();await h.click('solo');await h.submit({mode:'solo',alias:'TwoThumbs'});await h.start();
 const button={dataset:{dir:'right'},classList:{add(){}},setPointerCapture(){}};
 await h.dispatch('pointerdown',{closest(){return button}},{pointerId:11});assert.equal(h.context.arcTest.read().held,'right');
 await h.dispatch('pointerup',{closest(){return null}},{pointerId:22});assert.equal(h.context.arcTest.read().held,'right');
 await h.dispatch('pointercancel',{closest(){return null}},{pointerId:22});assert.equal(h.context.arcTest.read().held,'right');
 await h.dispatch('pointerup',{closest(){return button}},{pointerId:11});assert.equal(h.context.arcTest.read().held,'');
});
test('live practice survives polling and reports ready before entering the host game',async()=>{
 const player={id:'player-1',token:'player-token',alias:'LivePractice',character:1};
 let state={code:'ROOM24',phase:'lobby',serverNow:1800000000000,game:newArcadeGame(1),seq:0,count:1,ready:false,readyCount:0,players:[],finished:false};
 const h=ui({search:'?view=player&room=ROOM24',storage:{'wr-arc-player-ROOM24':player},fetchImpl:async(url,options)=>{
  if(url.endsWith('/ready')){assert.equal(options.headers.authorization,'Bearer player-token');state.ready=true;state.readyCount=1;state.game.practiceReady=true;return Response.json({ok:true});}
  return Response.json(state);
 }});
 await h.settle();assert.equal(h.context.arcTest.read().sceneKey,'practice');h.context.arcTest.step({d:'right'});
 await h.click('retry');await h.settle();assert.equal(h.context.arcTest.read().practice.x,3);
 for(let i=0;i<3;i++)h.context.arcTest.step({d:'right'});await h.use();
 assert.equal(h.context.arcTest.read().sceneKey,'waiting');assert.equal(state.ready,true);assert.equal(state.game.score,0);
 state={...state,phase:'active',deadline:1800000300000};await h.click('retry');await h.settle();assert.equal(h.context.arcTest.read().sceneKey,'play');assert.equal(h.context.arcTest.read().game.x,16);
});
test('late arrivals finish neutral practice while the shared clock keeps running',async()=>{
 const player={id:'late-1',token:'late-token',alias:'LatePractice',character:2};
 const state={code:'ROOM25',phase:'active',serverNow:1800000000000,deadline:1800000200000,game:newArcadeGame(2),seq:0,count:1,ready:false,readyCount:0,players:[],finished:false};
 const h=ui({search:'?view=player&room=ROOM25',storage:{'wr-arc-player-ROOM25':player},fetchImpl:async(url)=>{if(url.endsWith('/ready')){state.ready=true;state.game.practiceReady=true;return Response.json({ok:true});}return Response.json(state);}});
 await h.settle();assert.equal(h.context.arcTest.read().sceneKey,'practice');state.phase='paused';await h.click('retry');await h.settle();h.context.arcTest.step({d:'right'});assert.equal(h.context.arcTest.read().practice.x,2);assert.equal(h.ids.get('arc-practice-freeze').hidden,false);state.phase='active';await h.click('retry');await h.settle();for(let i=0;i<4;i++)h.context.arcTest.step({d:'right'});await h.use();
 assert.equal(h.context.arcTest.read().sceneKey,'play');assert.equal(h.context.arcTest.read().game.score,0);
});
test('players without a role card can still explore all four real agency jobs',async()=>{
 const h=ui();await h.click('solo');await h.submit({mode:'solo',alias:'RoleExplorer'});await h.start();await h.click('pause-menu');await h.click('finish-self');
 assert.match(h.app.innerHTML,/TIME’S UP/);assert.match(h.app.innerHTML,/didn’t finish a job/);assert.match(h.app.innerHTML,/Explore the roles/);
 assert.equal((h.app.innerHTML.match(/class="arc-role-lesson"/g)||[]).length,4);
 assert.doesNotMatch(h.app.innerHTML,/YOUR GAME ROLE/);assert.doesNotMatch(h.app.innerHTML,/SAVE ROLE CARD/);
});
test('the shared closing screen teaches all four roles and keeps the final scores available',async()=>{
 const players=roles.map((r,i)=>({alias:'Crew'+i,character:i%3,score:400-i*10,completed:2,profile:{role:i},game:newArcadeGame(i%3)}));
 const state={code:'ROOM26',phase:'finished',serverNow:1800000000000,count:4,players,leaderboard:players,events:[],launch:{score:1540,jobs:8,target:16,progress:50}};
 const h=ui({search:'?view=stage&room=ROOM26',fetchImpl:async()=>Response.json(state)});await h.settle();
 assert.equal(h.context.arcTest.read().sceneKey,'room-result');assert.match(h.app.innerHTML,/aria-label="Meet the team"/);
 assert.equal((h.app.innerHTML.match(/class="arc-stage-lesson"/g)||[]).length,4);
 for(let i=0;i<4;i++)assert.equal(h.ids.get('arc-role-count-'+i).textContent,'1 PLAYER IN THIS ROLE');
 assert.match(h.ids.get('arc-leaderboard-wrap').innerHTML,/FINAL LEADERBOARD/);assert.doesNotMatch(h.app.innerHTML,/id="arc-stage-canvas"/);
 await h.click('retry');await h.settle();assert.equal(h.context.arcTest.read().sceneKey,'room-result');
 for(const name of ['REM','NOVA','SOL','PATCH'])assert.match(h.app.innerHTML,new RegExp('arc-crew-name">'+name));
 assert.equal((h.app.innerHTML.match(/class="arc-deeper"/g)||[]).length,4);assert.match(h.app.innerHTML,/Start as:/);assert.doesNotMatch(h.app.innerHTML,/A NORMAL DAY/);assert.match(h.app.innerHTML,/Ways in:/);
 assert.match(h.app.innerHTML,/data-slide="campaign"/);assert.match(h.app.innerHTML,/YOUR CAMPAIGN/);
});
test('players learn more about each job on their phone, with the crew member who does it',async()=>{
 const h=ui();await h.click('solo');await h.submit({mode:'solo',alias:'Turbo Llama'});await h.start();
 h.walkTo(22,3);h.walkTo(22,8);h.walkTo(26,4,true);h.use();await h.click('pause-menu');await h.click('finish-self');
 assert.match(h.app.innerHTML,/GOOD START/);assert.match(h.app.innerHTML,/You worked in <b[^>]*>Creative/);assert.match(h.app.innerHTML,/YOUR JOB IN THE GAME/);
 assert.match(h.app.innerHTML,/WITH NOVA/);assert.match(h.app.innerHTML,/arc-role-voice/);assert.match(h.app.innerHTML,/You’d love it if/);assert.match(h.app.innerHTML,/Junior copywriter/);
});
test('the host can skip straight to the job roles slides without a game',async()=>{
 const h=ui({search:'?view=roles'});
 assert.equal(h.context.arcTest.read().sceneKey,'room-result');assert.match(h.app.innerHTML,/MEET THE TEAM/);
 assert.equal((h.app.innerHTML.match(/class="arc-stage-lesson"/g)||[]).length,4);assert.equal((h.app.innerHTML.match(/class="arc-deeper"/g)||[]).length,4);
 assert.equal((h.app.innerHTML.match(/class="arc-slide-tab"/g)||[]).length,2);assert.doesNotMatch(h.app.innerHTML,/arc-slide-scores/);assert.doesNotMatch(h.app.innerHTML,/ROOM POINTS/);
});
test('the host sees the brief first, then the QR lobby, and can get back to the game from home',async()=>{
 const state={code:'ROOM27',phase:'lobby',duration:300,serverNow:1800000000000,count:0,readyCount:0,players:[],leaderboard:[],events:[],launch:{score:0,jobs:0,target:0,progress:0}};
 const h=ui({search:'?view=host&room=ROOM27',storage:{'wr-arc-host-ROOM27':{token:'t',host:true}},fetchImpl:async()=>Response.json(state)});await h.settle();
 assert.equal(h.context.arcTest.read().sceneKey,'intro-0');assert.match(h.app.innerHTML,/AGENCY NOW/);assert.doesNotMatch(h.app.innerHTML,/Client<\/b> = the brand/);assert.doesNotMatch(h.app.innerHTML,/ROOM CODE/);
 await h.click('intro','next');assert.equal(h.context.arcTest.read().sceneKey,'intro-1');assert.match(h.app.innerHTML,/A brief is the client/);assert.match(h.app.innerHTML,/Client<\/b> = the brand/);assert.match(h.app.innerHTML,/5 minutes/);assert.match(h.app.innerHTML,/£160/);assert.match(h.app.innerHTML,/YOUR CLIENT/);assert.match(h.app.innerHTML,/JAMIE/);assert.match(h.app.innerHTML,/Founder, UNDERGROUND/);assert.match(h.app.innerHTML,/client-jamie-ug-v2.webp/);for(const c of COLOURWAYS)assert.ok(h.app.innerHTML.includes(c.image),'Brief must show '+c.name);
 await h.click('intro','prev');assert.equal(h.context.arcTest.read().sceneKey,'intro-0');
 await h.click('intro','next');await h.click('intro','next');assert.equal(h.context.arcTest.read().sceneKey,'intro-2');assert.match(h.app.innerHTML,/Make the call/);
 await h.click('intro','next');assert.equal(h.context.arcTest.read().sceneKey,'lobby');assert.match(h.app.innerHTML,/ROOM CODE/);assert.match(h.app.innerHTML,/Saturday’s pop-up/);
 h.context.localStorage.setItem('wr-arc-last-host',JSON.stringify({code:'ROOM27',at:h.context.Date.now()}));
 const home=ui({storage:{'wr-arc-host-ROOM27':{token:'t',host:true},'wr-arc-last-host':{code:'ROOM27',at:1800000000000}}});
 assert.match(home.app.innerHTML,/BACK TO YOUR GAME · ROOM27/);
});


test('the phone builds a plan one part at a time and submits the actual chosen tiles',async()=>{
 const h=ui();await h.click('solo');await h.submit({mode:'solo',alias:'PlanBuilder'});await h.start();h.walkTo(6,20,true);h.context.arcTest.step({a:1});
 assert.equal(h.context.arcTest.read().modalType,'work');assert.match(h.context.arcTest.workMarkup(),/QUESTION 1 OF 3/);assert.match(h.context.arcTest.workMarkup(),/What can the team deliver today\?/);assert.match(h.context.arcTest.workMarkup(),/arc-work-time/);
 const before=h.context.arcTest.read().game.score;
 await h.click('work-pick','1','0');assert.match(h.context.arcTest.workMarkup(),/Not quite\. One editor can’t make six films/);assert.match(h.context.arcTest.workMarkup(),/QUESTION 1 OF 3/);assert.equal(h.context.arcTest.read().game.score,before);
 await h.click('work-pick','0','0');assert.match(h.context.arcTest.workMarkup(),/QUESTION 2 OF 3/);assert.match(h.context.arcTest.workMarkup(),/Realistic/);
 await h.click('work-pick','0','1');await h.click('work-pick','0','2');assert.match(h.context.arcTest.workMarkup(),/SEND IT/);await h.click('work-submit');
 const state=h.context.arcTest.read();assert.equal(state.modalType,null);assert.equal(state.game.delivery.to,1);assert.equal(state.game.jobs[2],0);h.walkTo(26,4,true);h.context.arcTest.step({a:1});assert.equal(h.context.arcTest.read().game.jobs[2],1);
});
test('work can be abandoned safely, and no plan can be submitted after the clock expires',async()=>{
 const h=ui();await h.click('solo');await h.submit({mode:'solo',alias:'ClockBuilder'});await h.start();h.walkTo(6,20,true);h.context.arcTest.step({a:1});
 await h.click('close-modal');assert.equal(h.context.arcTest.read().game.work,null);assert.equal(h.context.arcTest.read().modalType,null);
 h.context.arcTest.step({a:1});await h.click('work-pick','0','0');await h.click('work-pick','0','1');await h.click('work-pick','0','2');h.advance(300000);await h.click('work-submit');assert.equal(h.context.arcTest.read().game.delivery,null);assert.equal(h.context.arcTest.read().game.score,0);
});
test('live work survives polling and host pause, then completes after resuming',async()=>{
 const game=newArcadeGame();game.x=6;game.y=19;game.practiceReady=true;
 const player={id:'work-player',token:'token',alias:'LiveBuilder',character:0};
 let state={code:'ROOM28',phase:'active',serverNow:1800000000000,deadline:1800000300000,game,seq:0,count:1,ready:true,readyCount:1,players:[],finished:false};
 const h=ui({search:'?view=player&room=ROOM28',storage:{'wr-arc-player-ROOM28':player},fetchImpl:async()=>Response.json(state)});await h.settle();h.context.arcTest.step({a:1});await h.click('work-pick','0','0');await h.click('work-pick','0','1');await h.click('work-pick','0','2');
 state={...state,game:structuredClone(h.context.arcTest.read().game),seq:h.context.arcTest.read().game.seq,phase:'paused',remaining:280000};await h.click('retry');await h.settle();assert.equal(h.context.arcTest.read().modalType,'work');assert.match(h.ids.get('arc-work-status').textContent,/PAUSED/);await h.click('work-submit');assert.equal(h.context.arcTest.read().game.delivery,null);
 state={...state,phase:'active'};await h.click('retry');await h.settle();assert.match(h.context.arcTest.workMarkup(),/SEND IT/);await h.click('work-submit');assert.equal(h.context.arcTest.read().game.delivery.to,1);
});

test('the shared campaign wall opens the actual plan a player built',async()=>{
 const event={alias:'Budget Fox',type:3,points:150,detail:'Shoot booked',poster:{kind:'live',label:'SHOOT BOOKED',taskTitle:'Plan a shoot within budget',text:'Shoot booked for £850.',lines:['Premium camera package — £650','Sound recorder — £200','Courtyard — free']}};
 const state={code:'ROOM29',phase:'finished',serverNow:1800000000000,count:0,players:[],leaderboard:[],events:[event],launch:{score:150,jobs:1,target:4,progress:25}};
 const h=ui({search:'?view=stage&room=ROOM29',fetchImpl:async()=>Response.json(state)});await h.settle();assert.match(h.ids.get('arc-campaign-wrap').innerHTML,/View work by Budget Fox/);await h.click('view-work','0');assert.equal(h.context.arcTest.read().modalType,'artifact');assert.match(h.ids.get('arc-modal').innerHTML,/Premium camera package/);assert.match(h.ids.get('arc-modal').innerHTML,/£850/);
});


test('the client brief preview works without a room or database and keeps the full campaign ask',()=>{
 let requests=0;const h=ui({search:'?view=brief',fetchImpl:async()=>{requests++;throw Error('Preview must not need a server');}});
 assert.equal(h.context.arcTest.read().sceneKey,'brief-preview');assert.equal(requests,0);
 assert.match(h.app.innerHTML,/MEET YOUR CLIENT/);assert.match(h.app.innerHTML,/Jamie, founder of UNDERGROUND/);assert.match(h.app.innerHTML,/Help us give students a reason to try them/);
 assert.match(h.app.innerHTML,/WHO WE’RE TALKING TO/);assert.match(h.app.innerHTML,/WHAT’S IN THE WAY/);assert.match(h.app.innerHTML,/A WIN LOOKS LIKE/);assert.match(h.app.innerHTML,/Saturday’s pop-up/);assert.match(h.app.innerHTML,/5 minutes/);
 assert.match(h.app.innerHTML,/arc-moodboard-tag/);assert.match(h.app.innerHTML,/<b>Colourway<\/b>/);assert.match(h.app.innerHTML,/href="\/\?view=host"/);assert.doesNotMatch(h.app.innerHTML,/data-action="intro"/);
});
