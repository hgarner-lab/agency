// A DOM adapter executes the shipped controller code. Browser layout and touch
// compatibility need device QA; map pixels are rendered separately with Canvas.
import {test} from 'node:test';
import * as world from '../src/arcade-world.js';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {cast} from '../src/story.js';
import {roles} from '../src/content.js';
import {character,selector} from '../src/scenes.js';
import {isClean} from '../src/filter.js';
import {qr} from '../src/qr.js';
import {ARCADE_TICK,JOBS,PICKUPS,newArcadeGame,applyArcadeInput,arcadeProfile,gameHint,jobLabel,jobChecklist,nearbyJob,nextInstruction,publicArcadeGame,canWalk} from '../src/arcade-world.js';
import {posterSVG} from '../src/arcade-renderer.js';
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
 const context={console,URLSearchParams,URL,JSON,Math,Date:class extends Date{static now(){return time}},performance:{now:()=>time},structuredClone,TextEncoder,Blob,
  ...world,cast,roles,character,selector,isClean,qr,ARCADE_TICK,JOBS,PICKUPS,newArcadeGame,applyArcadeInput,arcadeProfile,gameHint,jobLabel,jobChecklist,nearbyJob,nextInstruction,publicArcadeGame,posterSVG,drawGameIcon(){},drawPractice(){},createArcadeRenderer:()=>({draw(){}}),
  location:{origin:'https://game.test',search:options.search||'',href:'https://game.test/'},history:{pushState(){}},sessionStorage:store(),localStorage:store(),navigator:{},
  setTimeout(){return 0},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},
  FormData:class{constructor(form){this.fields=form.fields}get(k){return this.fields[k]}},
  fetch:options.fetchImpl,window:{addEventListener(){},confirm(){return true}},
  document:{hidden:false,body:{className:'',append(el){ids.set(el.id,el)}},querySelector(s){return s.startsWith('#')?ids.get(s.slice(1))||null:new Element()},querySelectorAll(){return []},createElement(){return new Element()},addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)}}
 };
 for(const [k,v] of Object.entries(options.storage||{}))context.localStorage.setItem(k,JSON.stringify(v));
 const source=readFileSync(new URL('../src/arcade-app.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');
 vm.createContext(context);vm.runInContext(source+'\nglobalThis.arcTest={read:()=>({game,solo,view,sceneKey,practice,held,movementPointer}),step:processInput};',context);
 async function dispatch(name,target,extra={}){for(const fn of listeners.get(name)||[])await fn({target,preventDefault(){},...extra})}
 async function click(action,value){return dispatch('click',{closest(s){return s==='[data-action]'?{dataset:{action,value},disabled:false}:null}})}
 const walkTo=(x,y,adjacent=false)=>{
  const g=context.arcTest.read().game,queue=[[g.x,g.y,[]]],seen=new Set([g.x+','+g.y]);let route;
  while(queue.length){const [cx,cy,p]=queue.shift();if(adjacent?Math.abs(cx-x)+Math.abs(cy-y)<=1:cx===x&&cy===y){route=p;break}for(const [d,dx,dy] of [['up',0,-1],['down',0,1],['left',-1,0],['right',1,0]]){const nx=cx+dx,ny=cy+dy,k=nx+','+ny;if(!seen.has(k)&&canWalk(nx,ny)){seen.add(k);queue.push([nx,ny,[...p,d]])}}}
  assert.ok(route);for(const d of route){time+=ARCADE_TICK;context.arcTest.step({d})}
 };
 return {context,app,ids,click,walkTo,dispatch,async settle(){await new Promise(setImmediate)},async start(){await click('begin-practice');for(let i=0;i<4;i++){time+=ARCADE_TICK;context.arcTest.step({d:'right'})}time+=ARCADE_TICK;await context.arcTest.step({a:1});},advance(ms){time+=ms},use(){time+=ARCADE_TICK;return context.arcTest.step({a:1})},submit(fields){return dispatch('submit',{id:'arc-entry',fields})}};
}
test('solo player selects a character, moves, collects, makes an ad and reaches a role card',async()=>{
 const h=ui();assert.match(h.app.innerHTML,/PLAY SOLO/);await h.click('solo');await h.click('character','2');await h.submit({mode:'solo',alias:'PixelHG'});
 assert.equal(h.context.arcTest.read().solo.character,2);assert.match(h.app.innerHTML,/TRY THE CONTROLS/);await h.start();
 assert.equal(h.context.arcTest.read().sceneKey,'play');assert.match(h.app.innerHTML,/arc-dpad/);assert.match(h.app.innerHTML,/arc-action/);
 h.walkTo(22,3);h.walkTo(22,8);h.walkTo(26,4,true);h.use();
 assert.equal(h.context.arcTest.read().game.jobs[1],1);assert.match(h.ids.get('arc-score').textContent.toString(),/180/);
 h.advance(4000);h.walkTo(22,3);h.walkTo(22,8);h.walkTo(26,4,true);h.use();
 await h.click('pause-menu');await h.click('finish-self');
 assert.equal(h.context.arcTest.read().solo.phase,'finished');assert.match(h.app.innerHTML,/THE INSTIGATOR/);assert.match(h.app.innerHTML,/THE ADS YOU MADE/);assert.match(h.app.innerHTML,/PixelHG/);
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
 h.walkTo(22,3);h.walkTo(22,8);assert.equal(h.ids.get('arc-hint').textContent,'Take colour + word to Nova.');
 h.walkTo(26,4,true);assert.equal(h.ids.get('arc-hint').textContent,'Press MAKE AD.');
 assert.equal(h.ids.get('arc-use').disabled,false);assert.equal(h.ids.get('arc-use').textContent,'MAKE AD');h.use();
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
