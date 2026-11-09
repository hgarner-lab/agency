import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,access} from 'node:fs/promises';
import {createTursoDatabase} from '../server/turso.js';
import {arcadeApi} from '../src/arcade-server.js';
import endpoint from '../api/arcade/[action].js';

function databaseTransport(){
 const sqlite=new DatabaseSync(':memory:');const calls=[];
 const encode=value=>value===null?{type:'null'}:typeof value==='number'?Number.isInteger(value)?{type:'integer',value:String(value)}:{type:'float',value}:{type:'text',value:String(value)};
 const decode=v=>v.type==='null'?null:v.type==='integer'||v.type==='float'?Number(v.value):v.value;
 const fetchImpl=async(url,options)=>{
  calls.push({url,options});const payload=JSON.parse(options.body),results=[];
  for(const op of payload.requests){
   if(op.type==='close'){results.push({type:'ok',response:{type:'close'}});continue}
   try{const statement=sqlite.prepare(op.stmt.sql),args=(op.stmt.args||[]).map(decode),cols=statement.columns();let rows=[],changes=0;
    if(cols.length){rows=statement.all(...args).map(row=>cols.map(c=>encode(row[c.name])));}else changes=Number(statement.run(...args).changes);
    results.push({type:'ok',response:{type:'execute',result:{cols:cols.map(c=>({name:c.name})),rows,affected_row_count:changes}}});
   }catch(error){results.push({type:'error',error:{message:error.message}})}
  }
  return Response.json({baton:null,base_url:null,results});
 };
 return {db:createTursoDatabase({url:'libsql://example.turso.io',token:'test-only-not-a-real-token',fetchImpl}),calls};
}
test('Turso transport binds typed values, converts result rows and initializes idempotently',async()=>{
 const {db,calls}=databaseTransport();await db.initialize();await db.initialize();
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM arcade_rooms').first()).n,0);
 const result=await db.prepare('INSERT INTO arcade_rooms(code,host_hash,created_at) VALUES(?,?,?)').bind('TEST24','hash',1800000000000).run();
 assert.equal(result.meta.changes,1);const row=await db.prepare('SELECT * FROM arcade_rooms WHERE code=?').bind('TEST24').first();assert.equal(row.created_at,1800000000000);assert.equal(row.deadline,null);
 assert.equal(calls[0].url,'https://example.turso.io/v2/pipeline');assert.equal(JSON.parse(calls.at(-1).options.body).requests.at(-1).type,'close');
});
test('the actual game API creates, joins and controls a persistent room through the Turso adapter',async()=>{
 const {db}=databaseTransport();await db.initialize();
 async function call(path,body=null,auth=null){const headers={};if(auth?.token)headers.authorization='Bearer '+auth.token;if(auth?.id)headers['x-player']=auth.id;const r=await arcadeApi(new Request('https://example.vercel.app/api/arcade/'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined}),{DB:db});assert.equal(r.status>=200&&r.status<300,true,await r.clone().text());return r.json()}
 const host=await call('create',{duration:300}),player=await call('join',{code:host.code,alias:'VercelPlayer',character:2});await call('ready',{code:host.code},player);await call('control',{code:host.code,action:'start'},host);
 const moved=await call('input',{code:host.code,ops:[{n:1,d:'right'}]},player);assert.equal(moved.game.x,17);assert.equal(moved.seq,1);
 const state=await call('state?room='+host.code,null,player);assert.equal(state.game.character,2);assert.equal(state.count,1);assert.equal(state.launch.target,4);
 await call('control',{code:host.code,action:'finish'},host);assert.equal((await call('state?room='+host.code,null,player)).phase,'finished');
});
test('Vercel health and missing-database responses never expose environment values',async()=>{
 const saved=[process.env.TURSO_DATABASE_URL,process.env.TURSO_AUTH_TOKEN];delete process.env.TURSO_DATABASE_URL;delete process.env.TURSO_AUTH_TOKEN;
 try{const health=await endpoint.fetch(new Request('https://example.vercel.app/api/arcade/health'));assert.deepEqual(await health.json(),{ok:true,groupPlayConfigured:false});
 const create=await endpoint.fetch(new Request('https://example.vercel.app/api/arcade/create',{method:'POST',body:'{}'}));assert.equal(create.status,503);assert.match((await create.json()).error,/Solo play works/);
 }finally{saved.forEach((v,i)=>{const key=['TURSO_DATABASE_URL','TURSO_AUTH_TOKEN'][i];if(v===undefined)delete process.env[key];else process.env[key]=v})}
});
test('the Vercel build serves all required browser modules and excludes server code',async()=>{
 const root=new URL('../',import.meta.url),html=await readFile(new URL('public/index.html',root),'utf8');assert.match(html,/\/assets\/arcade-app\.js\?v=/);
 for(const name of ['arcade-app.js','arcade-world.js','arcade-renderer.js','style.css','arcade.css','crew.png','crew-reactions.png','display.woff'])await access(new URL('public/assets/'+name,root));
 await assert.rejects(access(new URL('public/assets/arcade-server.js',root)));await assert.rejects(access(new URL('public/server/turso.js',root)));
 const app=await readFile(new URL('public/assets/arcade-app.js',root),'utf8');assert.doesNotMatch(app,/new WebSocket/);assert.match(app,/setInterval\(\(\)=>fetchState\(\),1500\)/);
 const config=JSON.parse(await readFile(new URL('vercel.json',root),'utf8'));assert.equal(config.outputDirectory,'public');assert.equal(config.framework,null);
});
