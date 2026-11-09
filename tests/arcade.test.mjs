import {taskFor,TASK_POOLS,checkTask} from '../src/agency-tasks.js';
import {test,beforeEach,mock} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {PIECES,newArcadeGame,applyArcadeInput,arcadeProfile,canWalk,JOBS,ARCADE_TICK,gameHint,jobChecklist,nextInstruction,guidancePath,jobAction,newPracticeGame,applyPracticeInput,practiceInstruction} from '../src/arcade-world.js';
import {arcadeApi} from '../src/arcade-server.js';
import {NAME_WORDS,NAME_ANIMALS} from '../src/filter.js';
let now,sql,env;
beforeEach(()=>{
 mock.restoreAll();now=1800000000000;mock.method(Date,'now',()=>now);
 sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../database/schema.sql',import.meta.url),'utf8'));
 env={DB:{
  prepare(query){
   const statement=sql.prepare(query);let args=[];
   return {
    bind(...values){args=values;return this},
    async run(){return statement.run(...args)},
    async first(){return statement.get(...args)||null},
    async all(){return {results:statement.all(...args)}}
   };
  }
 }};
});
function path(g,tx,ty,adjacent=false){
 const queue=[[g.x,g.y,[]]],seen=new Set([g.x+','+g.y]);
 while(queue.length){const [x,y,route]=queue.shift();if(adjacent?Math.abs(x-tx)+Math.abs(y-ty)<=1:x===tx&&y===ty)return route;
  for(const [d,dx,dy] of [['up',0,-1],['down',0,1],['left',-1,0],['right',1,0]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(!seen.has(k)&&canWalk(nx,ny)){seen.add(k);queue.push([nx,ny,[...route,{d}]]);}}
 }
 throw Error('Unreachable destination: '+tx+','+ty);
}
function walk(g,x,y,adjacent=false){const inputs=path(g,x,y,adjacent);for(const input of inputs){now+=ARCADE_TICK;applyArcadeInput(g,input,now)}return inputs;}
function act(g){now+=ARCADE_TICK;return applyArcadeInput(g,{a:1},now)}
function submit(g,picks=[0,0,0]){now+=ARCADE_TICK;return applyArcadeInput(g,{b:{task:g.work.id,run:g.work.run,picks}},now)}
function performJob(g,type){
 const input=[];const go=(x,y,a=false)=>input.push(...walk(g,x,y,a));const use=()=>{input.push({a:1});return act(g)};
 if(taskFor(g,type).resources){if(type===0){go(3,5);go(11,3);go(10,8);}if(type===1){go(22,3);go(22,8);}if(type===3){go(22,17);go(30,22);}}
 const job=JOBS[type];go(job.x,job.y,true);use();const b={task:g.work.id,run:g.work.run,picks:[0,0,0]};input.push({b});submit(g);
 if(type===2){const j=JOBS[g.delivery.to];go(j.x,j.y,true);use();}
 return input;
}
async function request(route,body=null,auth=null){
 const headers={'content-type':'application/json'};if(auth?.token)headers.authorization='Bearer '+auth.token;if(auth?.id)headers['x-player']=auth.id;
 const response=await arcadeApi(new Request('https://game.test/api/arcade/'+route,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined}),env);return {status:response.status,data:await response.json()};
}
async function room(){const host=(await request('create',{duration:300})).data;const player=(await request('join',{code:host.code,alias:'Turbo Llama',character:1})).data;await request('ready',{code:host.code},player);await request('control',{code:host.code,action:'start'},host);return {host,player};}

test('all four jobs can be completed through actual walkable routes on the map',()=>{
 for(const type of [0,1,2,3]){const g=newArcadeGame(1);const inputs=performJob(g,type);assert.ok(inputs.length>10);assert.equal(g.jobs[type],1);assert.ok(g.score>=180);assert.equal(arcadeProfile(g),null);now+=4000;performJob(g,type);assert.equal(arcadeProfile(g).role,type);assert.ok(canWalk(g.x,g.y));}
});
test('movement respects walls, desks and NPCs; talking without ingredients cannot award a job',()=>{
 const g=newArcadeGame();walk(g,6,4,true);const score=g.score;act(g);assert.equal(g.jobs[0],0);assert.equal(g.score,score);
 g.x=1;g.y=1;applyArcadeInput(g,{d:'left'},now);assert.equal(g.x,1);assert.equal(canWalk(6,4),false);assert.equal(canWalk(6,2),false);
});
test('collectibles are single-use, jobs consume them, and a poster uses the collected colour and word',()=>{
 const g=newArcadeGame();walk(g,22,3);assert.ok(g.inventory.includes('ink-green'));const score=g.score;
 applyArcadeInput(g,{a:1},now);assert.equal(g.score,score);walk(g,22,8);walk(g,26,4,true);act(g);const events=submit(g);
 assert.equal(g.posters.length,1);assert.equal(g.posters[0].colour,'#bbef66');assert.equal(g.posters[0].title,'YOUR WAY');assert.ok(events.some(e=>e.kind==='job'&&e.poster));assert.equal(g.inventory.filter(i=>i.startsWith('ink-')||i.startsWith('word-')).length,0);
});
test('points and character choice do not decide a role; identical work yields the same classification',()=>{
 const one=newArcadeGame(0),two=newArcadeGame(2);performJob(one,0);performJob(two,0);now+=4000;performJob(one,0);performJob(two,0);one.score=99999;two.score=1;
 assert.equal(arcadeProfile(one).role,0);assert.equal(arcadeProfile(two).role,0);assert.equal(arcadeProfile(newArcadeGame()),null);
});
test('instructions follow the current room, missing items and the action needed beside a teammate',()=>{
 const g=newArcadeGame();walk(g,22,3);
 assert.deepEqual(jobChecklist(g).map(i=>i.have),[true,false]);assert.match(gameHint(g,now),/Collect a word tile/);
 walk(g,22,8);assert.ok(jobChecklist(g).every(i=>i.have));assert.match(gameHint(g,now),/make a campaign idea/);
 walk(g,26,4,true);assert.match(gameHint(g,now),/Press START/);act(g);submit(g);assert.match(gameHint(g,now),/Job done/);
 walk(g,3,5);assert.deepEqual(jobChecklist(g),[{icon:'clue',label:'Research 1/3',have:false}]);assert.match(gameHint(g,now),/1\/3 collected/);
 walk(g,30,22);assert.deepEqual(jobChecklist(g).map(i=>i.have),[false,true]);assert.match(gameHint(g,now),/the kit list/);
});
test('client brief instructions keep the named destination while crossing other rooms',()=>{
 const g=newArcadeGame();walk(g,6,20,true);assert.match(gameHint(g,now),/Press START/);act(g);submit(g);
 assert.match(gameHint(g,now),/Take Sol’s agreement to Nova/);assert.equal(jobChecklist(g)[0].icon,'brief');
 walk(g,3,5);assert.match(gameHint(g,now),/Take Sol’s agreement to Nova/);
 walk(g,26,4,true);assert.match(gameHint(g,now),/Press DELIVER/);act(g);assert.equal(g.jobs[2],1);assert.equal(g.delivery,null);
});
test('following the marked routes completes any chosen job without crossing walls or desks',()=>{
 for(const type of [0,1,2,3]){
  const g=newArcadeGame();assert.equal(nextInstruction(g,now).target,null);
  const [x,y]=[[7,9],[24,9],[7,16],[24,16]][type];walk(g,x,y);
  for(let step=0;step<12&&!g.jobs[type];step++){
   const hint=nextInstruction(g,now);assert.ok(hint.target,'An unfinished job must have a next target');
   if(hint.kind==='act'){act(g);if(g.work)submit(g);continue;}
   const route=guidancePath(g,hint.target);assert.ok(route.length);
   for(const p of route){
    assert.ok(canWalk(p.x,p.y));assert.equal(Math.abs(p.x-g.x)+Math.abs(p.y-g.y),1);
    const d=p.x>g.x?'right':p.x<g.x?'left':p.y>g.y?'down':'up';now+=ARCADE_TICK;applyArcadeInput(g,{d},now);
   }
  }
  assert.equal(g.jobs[type],1);assert.equal(arcadeProfile(g),null);
 }
});
test('live input is replayed on the server; forged scores and duplicate batches cannot award points',async()=>{
 const {host,player}=await room(),model=newArcadeGame(1),route=performJob(model,0);let seq=0,last;
 for(let index=0;index<route.length;index+=16){const batch=route.slice(index,index+16).map(op=>({...op,n:++seq}));now+=batch.length*ARCADE_TICK+20;last=await request('input',{code:host.code,ops:batch,score:999999},player);assert.equal(last.status,200);}
 assert.equal(last.data.game.jobs[0],1);assert.equal(last.data.game.score,180);
 const replay=await request('input',{code:host.code,ops:[{n:seq,a:1}]},player);assert.equal(replay.data.game.score,180);assert.deepEqual(replay.data.events,[]);
 const state=(await request('state?room='+host.code,null,player)).data;assert.equal(state.events.length,1);assert.equal(state.launch.jobs,1);assert.equal(state.profile,null);
 assert.equal((await request('input',{code:host.code,ops:[{n:seq+1,d:'teleport'}]},player)).status,400);
});
test('rate limits, identity checks, room pause and clock expiry are server enforced',async()=>{
 const {host,player}=await room();const ops=Array.from({length:20},(_,i)=>({n:i+1,d:'right'}));
 assert.equal((await request('input',{code:host.code,ops},player)).status,429);
 assert.equal((await request('control',{code:host.code,action:'pause'},player)).status,403);
 await request('control',{code:host.code,action:'pause'},host);assert.equal((await request('input',{code:host.code,ops:[{n:1,a:1}]},player)).status,409);
 await request('control',{code:host.code,action:'resume'},host);now+=301000;
 assert.equal((await request('state?room='+host.code,null,player)).data.phase,'finished');assert.equal((await request('input',{code:host.code,ops:[{n:1,a:1}]},player)).status,409);
});
test('the shared screen gets high scores and highlights, with no credentials or hidden affinities',async()=>{
 const {host,player}=await room();const publicState=(await request('state?room='+host.code)).data;
 assert.equal(publicState.count,1);assert.equal(publicState.players[0].alias,'Turbo Llama');assert.equal(publicState.players[0].game.affinity,undefined);assert.equal(publicState.players[0].token,undefined);assert.equal(publicState.game,null);assert.equal(publicState.host,false);
 const own=(await request('state?room='+host.code,null,player)).data;assert.equal(own.game.character,1);assert.equal(own.seq,0);
 await request('control',{code:host.code,action:'finish'},host);assert.equal((await request('state?room='+host.code,null,player)).data.phase,'finished');
});
test('rooms allow 50 distinct players and reject a duplicate, typed or unsafe name',async()=>{
 const host=(await request('create',{})).data;for(let n=0;n<50;n++)assert.equal((await request('join',{code:host.code,alias:NAME_WORDS[n%NAME_WORDS.length]+' '+NAME_ANIMALS[Math.floor(n/NAME_WORDS.length)],character:n%3})).status,201);
 assert.equal((await request('join',{code:host.code,alias:'Royal Meerkat'})).status,400);assert.equal((await request('join',{code:host.code,alias:'cosmic goblin'})).status,400);assert.equal((await request('join',{code:host.code,alias:'Cosmic Goblin'})).status,409);assert.equal((await request('join',{code:host.code,alias:'BigDick'})).status,400);assert.equal((await request('join',{code:host.code,alias:'Moose Hawk 69'})).status,400);assert.equal((await request('join',{code:host.code,alias:'f u c k'})).status,400);
 assert.equal((await request('state?room='+host.code)).data.count,50);
});
test('the marked object stays selected while moving, until collected or changing rooms',()=>{
 const g=newArcadeGame();g.x=20;g.y=5;
 applyArcadeInput(g,{d:'left'},now);const selected=nextInstruction(g,now).target.id;
 assert.equal(selected,'ink-green');applyArcadeInput(g,{d:'down'},now+ARCADE_TICK);
 assert.equal(nextInstruction(g,now).target.id,selected);
 walk(g,22,3);assert.ok(g.inventory.includes(selected));assert.notEqual(nextInstruction(g,now).target?.id,selected);
 walk(g,3,5);assert.equal(nextInstruction(g,now).type,0);
});
test('TALK cannot complete an unrelated job while delivering a message',()=>{
 const g=newArcadeGame();walk(g,6,20,true);assert.equal(jobAction(g,now).label,'START');act(g);submit(g);
 walk(g,22,17);walk(g,30,22);walk(g,26,20,true);
 assert.equal(jobAction(g,now).label,'TALK');const before=g.score,events=act(g);
 assert.equal(g.score,before);assert.equal(g.jobs[3],0);assert.ok(events.every(e=>e.kind==='note'));
 walk(g,26,4,true);assert.equal(jobAction(g,now).label,'DELIVER');act(g);
 walk(g,26,20,true);assert.equal(jobAction(g,now).label,'START');act(g);submit(g);assert.equal(g.jobs[3],1);
 assert.equal(jobAction(g,now).label,'TALK');const score=g.score;act(g);assert.equal(g.score,score);
});
test('a role needs two completed jobs, even with many collected items',()=>{
 const g=newArcadeGame();walk(g,3,5);assert.equal(arcadeProfile(g),null);
 performJob(g,0);assert.equal(arcadeProfile(g),null);now+=4000;performJob(g,0);
 assert.equal(arcadeProfile(g).completed,2);assert.equal(arcadeProfile(g).role,0);
});
test('practice teaches movement, collection and the action button without affecting a game',()=>{
 const p=newPracticeGame(2),g=newArcadeGame(2),before=structuredClone(g);
 assert.equal(practiceInstruction(p).ready,false);applyPracticeInput(p,{a:1});assert.equal(p.complete,false);
 applyPracticeInput(p,{d:'right'});assert.equal(practiceInstruction(p).title,'Walk over the star.');
 applyPracticeInput(p,{d:'right'});applyPracticeInput(p,{d:'right'});assert.equal(p.collected,true);assert.equal(practiceInstruction(p).ready,false);
 applyPracticeInput(p,{d:'right'});assert.equal(practiceInstruction(p).ready,true);applyPracticeInput(p,{a:1});assert.equal(p.complete,true);
 assert.deepEqual(g,before);
});
test('the host sees readiness and ordinary start waits for everyone to practise',async()=>{
 const host=(await request('create',{})).data;
 const a=(await request('join',{code:host.code,alias:'Cosmic Goblin',character:0})).data,b=(await request('join',{code:host.code,alias:'Chaotic Waffle',character:1})).data;
 assert.equal((await request('ready',{code:host.code})).status,403);
 assert.equal((await request('control',{code:host.code,action:'start'},host)).status,409);
 await request('ready',{code:host.code},a);let state=(await request('state?room='+host.code,null,a)).data;
 assert.equal(state.readyCount,1);assert.equal(state.ready,true);assert.equal(state.players[0].score,0);assert.equal(state.players[0].completed,0);
 assert.equal((await request('control',{code:host.code,action:'start'},host)).status,409);
 await request('ready',{code:host.code},b);await request('ready',{code:host.code},b);
 state=(await request('state?room='+host.code,null,b)).data;assert.equal(state.readyCount,2);
 assert.equal((await request('control',{code:host.code,action:'start'},host)).status,200);
});
test('an explicit host override starts the clock and late arrivals can finish practice safely',async()=>{
 const host=(await request('create',{})).data,p=(await request('join',{code:host.code,alias:'Sneaky Taco',character:1})).data;
 assert.equal((await request('control',{code:host.code,action:'start',allowUnready:true},p)).status,403);
 assert.equal((await request('control',{code:host.code,action:'start',allowUnready:true},host)).status,200);
 assert.equal((await request('ready',{code:host.code},p)).status,200);
 const state=(await request('state?room='+host.code,null,p)).data;assert.equal(state.phase,'active');assert.equal(state.game.x,16);assert.equal(state.game.score,0);assert.equal(state.seq,0);assert.equal(state.ready,true);
 await request('control',{code:host.code,action:'finish'},host);assert.equal((await request('ready',{code:host.code},p)).status,409);
});
test('generated game names always pass the server name check and fit on screen',async()=>{
 const {makeNickname,isGameName,isClean}=await import('../src/filter.js');
 for(let i=0;i<2000;i++){const name=makeNickname();assert.ok(isGameName(name),name);assert.ok(isClean(name),name);assert.ok(name.length<=16,name);}
 assert.equal(isGameName('Turbo Llama 69'),false);assert.equal(isGameName('Penis Llama'),false);assert.equal(isGameName('Galactic Capybara'),false);assert.equal(isGameName('Turbo Llama'),true);
});


test('all twenty job types create the selected work and cycle without needing old floor items',()=>{
 for(const type of [0,1,2,3]){
  const g=newArcadeGame(type%3);
  for(let variant=0;variant<TASK_POOLS[type].length;variant++){
   now+=4000;const expected=TASK_POOLS[type][variant];performJob(g,type);
   assert.equal(g.jobs[type],variant+1);const product=g.workProducts.at(-1);
   assert.equal(product.taskTitle,expected.title);assert.deepEqual(product.lines,expected.slots.map(s=>s.options[0].text));assert.equal(product.kind,expected.kind);assert.equal(g.work,null);assert.equal(g.delivery,null);
  }
  assert.equal(taskFor(g,type).id,TASK_POOLS[type][0].id);
 }
});
test('building, revising and cancelling work cannot award points or consume materials early',()=>{
 const g=newArcadeGame();walk(g,3,5);walk(g,11,3);walk(g,10,8);walk(g,6,4,true);act(g);
 const score=g.score,affinity=[...g.affinity],items=[...g.inventory],position=[g.x,g.y],task=g.work.id;
 applyArcadeInput(g,{d:'down'},now);assert.deepEqual([g.x,g.y],position);
 submit(g,[1,0,0]);assert.match(g.work.feedback,/research/);assert.equal(g.score,score);assert.deepEqual(g.affinity,affinity);assert.deepEqual(g.inventory,items);
 applyArcadeInput(g,{b:{task,run:99,picks:[0,0,0]}},now);assert.equal(g.jobs[0],0);
 applyArcadeInput(g,{c:1},now);assert.equal(g.work,null);assert.deepEqual(g.inventory,items);
 applyArcadeInput(g,{b:{task,run:0,picks:[0,0,0]}},now);assert.equal(g.jobs[0],0);
 act(g);const accepted={b:{task,run:0,picks:[0,0,1]}};applyArcadeInput(g,accepted,now);assert.equal(g.jobs[0],1);assert.equal(g.workProducts[0].lines[2],TASK_POOLS[0][0].slots[2].options[1].text);
 const after=g.score;applyArcadeInput(g,accepted,now);assert.equal(g.score,after);
});
test('production accepts different affordable plans and explains an overspend without a penalty',()=>{
 const g=newArcadeGame();walk(g,22,17);walk(g,30,22);walk(g,26,20,true);act(g);const before=g.score;
 submit(g,[1,1,0]);assert.match(g.work.feedback,/£1000.*£900/);assert.equal(g.score,before);assert.equal(g.jobs[3],0);assert.ok(g.inventory.includes('spanner'));
 submit(g,[1,0,0]);assert.equal(g.jobs[3],1);assert.match(g.workProducts[0].text,/£850/);assert.match(g.workProducts[0].lines[0],/Premium/);
 const task=TASK_POOLS[3][0];assert.equal(checkTask(task,[0,1,0]).ok,true);assert.equal(checkTask(task,[0,0,0]).ok,true);
});
test('creative ideas allow several valid expressions while still responding to the brief',()=>{
 for(const picks of [[0,0,0],[0,1,1],[0,1,2]])assert.equal(checkTask(TASK_POOLS[1][0],picks).ok,true);
 assert.equal(checkTask(TASK_POOLS[1][0],[1,0,0]).ok,false);
});
test('new input validation rejects mixed actions, invalid tiles and work submitted away from a teammate',async()=>{
 const {host,player}=await room();
 for(const op of [{a:1,c:1},{a:1,b:{task:'strategy-insight',run:0,picks:[0,0,0]}},{b:{task:'strategy-insight',run:0,picks:[-1,0,0]}},{b:{task:'strategy-insight',run:0,picks:[0,0]}},{b:{task:'strategy-insight',run:'0',picks:[0,0,0]}}])assert.equal((await request('input',{code:host.code,ops:[{n:1,...op}]},player)).status,400);
 const forged=await request('input',{code:host.code,ops:[{n:1,b:{task:'strategy-insight',run:0,picks:[0,0,0]}}]},player);
 assert.equal(forged.status,200);assert.equal(forged.data.game.score,0);assert.equal(forged.data.game.jobs[0],0);
});
test('existing saved games retain their original job rules',()=>{
 const g=newArcadeGame();delete g.taskVersion;walk(g,22,3);walk(g,22,8);walk(g,26,4,true);act(g);assert.equal(g.jobs[1],1);assert.equal(g.work,null);
});
