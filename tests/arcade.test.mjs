import {test,beforeEach,mock} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {newArcadeGame,applyArcadeInput,arcadeProfile,canWalk,JOBS,ARCADE_TICK,gameHint,jobChecklist} from '../src/arcade-world.js';
import {arcadeApi} from '../src/arcade-server.js';
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
function performJob(g,type){
 const input=[];const go=(x,y,a=false)=>input.push(...walk(g,x,y,a));const use=()=>{input.push({a:1});return act(g)};
 if(type===0){go(3,5);go(11,3);go(10,8);go(6,4,true);use();}
 if(type===1){go(22,3);go(22,8);go(26,4,true);use();}
 if(type===2){go(6,20,true);use();const j=JOBS[g.delivery.to];go(j.x,j.y,true);use();}
 if(type===3){go(22,17);go(30,22);go(26,20,true);use();}
 return input;
}
async function request(route,body=null,auth=null){
 const headers={'content-type':'application/json'};if(auth?.token)headers.authorization='Bearer '+auth.token;if(auth?.id)headers['x-player']=auth.id;
 const response=await arcadeApi(new Request('https://game.test/api/arcade/'+route,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined}),env);return {status:response.status,data:await response.json()};
}
async function room(){const host=(await request('create',{duration:300})).data;const player=(await request('join',{code:host.code,alias:'CrewTester',character:1})).data;await request('control',{code:host.code,action:'start'},host);return {host,player};}

test('all four jobs can be completed through actual walkable routes on the map',()=>{
 for(const type of [0,1,2,3]){const g=newArcadeGame(1);const inputs=performJob(g,type);assert.ok(inputs.length>10);assert.equal(g.jobs[type],1);assert.ok(g.score>=180);assert.equal(arcadeProfile(g).role,type);assert.ok(canWalk(g.x,g.y));}
});
test('movement respects walls, desks and NPCs; talking without ingredients cannot award a job',()=>{
 const g=newArcadeGame();walk(g,6,4,true);const score=g.score;act(g);assert.equal(g.jobs[0],0);assert.equal(g.score,score);
 g.x=1;g.y=1;applyArcadeInput(g,{d:'left'},now);assert.equal(g.x,1);assert.equal(canWalk(6,4),false);assert.equal(canWalk(6,2),false);
});
test('collectibles are single-use, jobs consume them, and a poster uses the collected colour and word',()=>{
 const g=newArcadeGame();walk(g,22,3);assert.ok(g.inventory.includes('ink-green'));const score=g.score;
 applyArcadeInput(g,{a:1},now);assert.equal(g.score,score);walk(g,22,8);walk(g,26,4,true);const events=act(g);
 assert.equal(g.posters.length,1);assert.equal(g.posters[0].colour,'#bbef66');assert.equal(g.posters[0].title,'FOR EVERYONE');assert.ok(events.some(e=>e.kind==='job'&&e.poster));assert.equal(g.inventory.filter(i=>i.startsWith('ink-')||i.startsWith('word-')).length,0);
});
test('points and character choice do not decide a role; identical work yields the same classification',()=>{
 const one=newArcadeGame(0),two=newArcadeGame(2);performJob(one,0);performJob(two,0);one.score=99999;two.score=1;
 assert.equal(arcadeProfile(one).role,0);assert.equal(arcadeProfile(two).role,0);assert.equal(arcadeProfile(newArcadeGame()),null);
});
test('instructions follow the current room, missing items and the action needed beside a teammate',()=>{
 const g=newArcadeGame();walk(g,22,3);
 assert.deepEqual(jobChecklist(g).map(i=>i.have),[true,false]);assert.match(gameHint(g,now),/one word tile/);
 walk(g,22,8);assert.ok(jobChecklist(g).every(i=>i.have));assert.match(gameHint(g,now),/Stand next to NOVA.*MAKE AD/);
 walk(g,26,4,true);assert.match(gameHint(g,now),/Press MAKE AD/);act(g);assert.match(gameHint(g,now),/New items appear/);
 walk(g,3,5);assert.deepEqual(jobChecklist(g),[{icon:'clue',label:'Clues 1/3',have:false}]);assert.match(gameHint(g,now),/1\/3 found/);
 walk(g,30,22);assert.deepEqual(jobChecklist(g).map(i=>i.have),[false,true]);assert.match(gameHint(g,now),/the spanner/);
});
test('client brief instructions keep the named destination while crossing other rooms',()=>{
 const g=newArcadeGame();walk(g,6,20,true);assert.match(gameHint(g,now),/Press GET BRIEF/);act(g);
 assert.match(gameHint(g,now),/NOVA.*STUDIO \(top right\)/);assert.equal(jobChecklist(g)[0].icon,'brief');
 walk(g,3,5);assert.match(gameHint(g,now),/Sol’s brief to NOVA/);
 walk(g,26,4,true);assert.match(gameHint(g,now),/Press DELIVER/);act(g);assert.equal(g.jobs[2],1);assert.equal(g.delivery,null);
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
 assert.equal(publicState.count,1);assert.equal(publicState.players[0].alias,'CrewTester');assert.equal(publicState.players[0].game.affinity,undefined);assert.equal(publicState.players[0].token,undefined);assert.equal(publicState.game,null);assert.equal(publicState.host,false);
 const own=(await request('state?room='+host.code,null,player)).data;assert.equal(own.game.character,1);assert.equal(own.seq,0);
 await request('control',{code:host.code,action:'finish'},host);assert.equal((await request('state?room='+host.code,null,player)).data.phase,'finished');
});
test('rooms allow 50 distinct players and reject a duplicate nickname or unsafe alias',async()=>{
 const host=(await request('create',{})).data;for(let n=0;n<50;n++)assert.equal((await request('join',{code:host.code,alias:'Crew'+n,character:n%3})).status,201);
 assert.equal((await request('join',{code:host.code,alias:'Overflow'})).status,400);assert.equal((await request('join',{code:host.code,alias:'crew1'})).status,400);assert.equal((await request('join',{code:host.code,alias:'f u c k'})).status,400);
 assert.equal((await request('state?room='+host.code)).data.count,50);
});
