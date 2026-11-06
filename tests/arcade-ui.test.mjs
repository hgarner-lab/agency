// A DOM adapter executes the shipped controller code. Browser layout and touch
// compatibility need device QA; map pixels are rendered separately with Canvas.
import {test} from 'node:test';
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
function ui(){
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
  cast,roles,character,selector,isClean,qr,ARCADE_TICK,JOBS,PICKUPS,newArcadeGame,applyArcadeInput,arcadeProfile,gameHint,jobLabel,jobChecklist,nearbyJob,nextInstruction,publicArcadeGame,posterSVG,drawGameIcon(){},createArcadeRenderer:()=>({draw(){}}),
  location:{origin:'https://game.test',search:'',href:'https://game.test/'},history:{pushState(){}},sessionStorage:store(),localStorage:store(),navigator:{},
  setTimeout(){return 0},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},
  FormData:class{constructor(form){this.fields=form.fields}get(k){return this.fields[k]}},
  window:{addEventListener(){},confirm(){return true}},
  document:{hidden:false,body:{className:'',append(el){ids.set(el.id,el)}},querySelector(s){return s.startsWith('#')?ids.get(s.slice(1))||null:new Element()},querySelectorAll(){return []},createElement(){return new Element()},addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)}}
 };
 const source=readFileSync(new URL('../src/arcade-app.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');
 vm.createContext(context);vm.runInContext(source+'\nglobalThis.arcTest={read:()=>({game,solo,view,sceneKey}),step:processInput};',context);
 async function dispatch(name,target){for(const fn of listeners.get(name)||[])await fn({target,preventDefault(){}})}
 async function click(action,value){return dispatch('click',{closest(s){return s==='[data-action]'?{dataset:{action,value},disabled:false}:null}})}
 const walkTo=(x,y,adjacent=false)=>{
  const g=context.arcTest.read().game,queue=[[g.x,g.y,[]]],seen=new Set([g.x+','+g.y]);let route;
  while(queue.length){const [cx,cy,p]=queue.shift();if(adjacent?Math.abs(cx-x)+Math.abs(cy-y)<=1:cx===x&&cy===y){route=p;break}for(const [d,dx,dy] of [['up',0,-1],['down',0,1],['left',-1,0],['right',1,0]]){const nx=cx+dx,ny=cy+dy,k=nx+','+ny;if(!seen.has(k)&&canWalk(nx,ny)){seen.add(k);queue.push([nx,ny,[...p,d]])}}}
  assert.ok(route);for(const d of route){time+=ARCADE_TICK;context.arcTest.step({d})}
 };
 return {context,app,ids,click,walkTo,advance(ms){time+=ms},use(){time+=ARCADE_TICK;context.arcTest.step({a:1})},submit(fields){return dispatch('submit',{id:'arc-entry',fields})}};
}
test('solo player selects a character, moves, collects, makes an ad and reaches a role card',async()=>{
 const h=ui();assert.match(h.app.innerHTML,/PLAY SOLO/);await h.click('solo');await h.click('character','2');await h.submit({mode:'solo',alias:'PixelHG'});
 assert.equal(h.context.arcTest.read().solo.character,2);assert.match(h.app.innerHTML,/START PLAYING/);await h.click('begin-solo');
 assert.equal(h.context.arcTest.read().sceneKey,'play');assert.match(h.app.innerHTML,/arc-dpad/);assert.match(h.app.innerHTML,/arc-action/);
 h.walkTo(22,3);h.walkTo(22,8);h.walkTo(26,4,true);h.use();
 assert.equal(h.context.arcTest.read().game.jobs[1],1);assert.match(h.ids.get('arc-score').textContent.toString(),/180/);
 await h.click('pause-menu');await h.click('finish-self');
 assert.equal(h.context.arcTest.read().solo.phase,'finished');assert.match(h.app.innerHTML,/THE INSTIGATOR/);assert.match(h.app.innerHTML,/THE ADS YOU MADE/);assert.match(h.app.innerHTML,/PixelHG/);
});
test('solo pause keeps the remaining time, and the chosen character never preselects a role',async()=>{
 const h=ui();await h.click('solo');await h.click('character','0');await h.submit({mode:'solo',alias:'RemPlayer'});await h.click('begin-solo');h.advance(10000);await h.click('pause-menu');
 const left=h.context.arcTest.read().solo.remaining;h.advance(60000);await h.click('close-modal');
 assert.equal(h.context.arcTest.read().solo.phase,'active');assert.equal(h.context.arcTest.read().solo.deadline-1800000070000,left);assert.equal(arcadeProfile(h.context.arcTest.read().game),null);
});
test('opening the object guide pauses solo time and movement, then resumes with the same time left',async()=>{
 const h=ui();await h.click('solo');await h.submit({mode:'solo',alias:'GuideReader'});await h.click('begin-solo');
 h.walkTo(22,3);const before=h.context.arcTest.read().game.x;h.advance(10000);await h.click('map');
 const left=h.context.arcTest.read().solo.remaining;assert.equal(h.context.arcTest.read().solo.phase,'paused');
 h.advance(60000);h.context.arcTest.step({d:'right'});assert.equal(h.context.arcTest.read().game.x,before);
 await h.click('close-modal');assert.equal(h.context.arcTest.read().solo.phase,'active');
 assert.equal(h.context.arcTest.read().solo.deadline-h.context.Date.now(),left);
 h.walkTo(22,8);h.walkTo(26,4,true);h.use();assert.equal(h.context.arcTest.read().game.jobs[1],1);
});
test('the live instruction and action button advance from collecting to completing a job',async()=>{
 const h=ui();await h.click('solo');await h.submit({mode:'solo',alias:'FollowDots'});await h.click('begin-solo');
 assert.equal(h.ids.get('arc-use').disabled,true);assert.equal(h.ids.get('arc-hint').textContent,'Choose any room.');
 h.walkTo(22,3);h.walkTo(22,8);assert.equal(h.ids.get('arc-hint').textContent,'Take your items to Nova.');
 h.walkTo(26,4,true);assert.equal(h.ids.get('arc-hint').textContent,'Press MAKE AD.');
 assert.equal(h.ids.get('arc-use').disabled,false);assert.equal(h.ids.get('arc-use').textContent,'MAKE AD');h.use();
 assert.equal(h.ids.get('arc-hint').textContent,'Job done. Choose your next one.');
 assert.equal(h.ids.get('arc-bag').hidden,true);
});
