import {newArcadeGame,applyArcadeInput,arcadeProfile,publicArcadeGame,ARCADE_TICK} from './arcade-world.js';
import {isClean,isGameName} from './filter.js';
const arcJson=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const arcHash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(v=>v.toString(16).padStart(2,'0')).join('');
const arcFail=(message,status=400)=>{throw {message,status}};
const arcPhase=(r,now)=>r.phase==='active'&&r.deadline<=now?'finished':r.phase;
export async function arcadeApi(req,env){
 try{
  if(!env.DB)return arcJson({error:'Live rooms are unavailable on this host. You can still play solo.'},503);
  const db=env.DB,url=new URL(req.url),path=url.pathname.replace('/api/arcade/',''),now=Date.now();
  if(req.method!=='GET'&&req.headers.get('origin')&&req.headers.get('origin')!==url.origin)arcFail('Use this game’s own page to send a request.',403);
  let body={};if(req.method==='POST'){const raw=await req.text();if(raw.length>8192)arcFail('Request too large.',413);try{body=JSON.parse(raw)}catch{arcFail('Invalid request.')}if(!body||Array.isArray(body)||typeof body!=='object')arcFail('Invalid request.');}
  if(path==='create'&&req.method==='POST'){
   const duration=body.duration??300;if(![300,600].includes(duration))arcFail('Choose a five- or ten-minute game.');
   const code=Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[v%32]).join('');
   const token=crypto.randomUUID()+crypto.randomUUID();
   await db.prepare('INSERT INTO arcade_rooms(code,host_hash,duration,created_at) VALUES(?,?,?,?)').bind(code,await arcHash(token),duration,now).run();
   return arcJson({code,token},201);
  }
  const code=String(body.code||url.searchParams.get('room')||'').toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code))arcFail('Enter the six-character code from your host.');
  const room=await db.prepare('SELECT * FROM arcade_rooms WHERE code=?').bind(code).first();if(!room)arcFail('Room not found. Check the code with your host.',404);
  if(now-room.created_at>12*3600000)arcFail('This room has expired. Ask your host to create another.',410);
  const phase=arcPhase(room,now);
  if(path==='join'&&req.method==='POST'){
   if(phase==='finished')arcFail('This game has finished. Ask your host for a new room.');
   const alias=String(body.alias||'').trim(),character=body.character??0;
   if(!isGameName(alias)||!isClean(alias))arcFail('Use the game name you were given. Tap shuffle for a new one.');
   if(!Number.isInteger(character)||character<0||character>2)arcFail('Choose one of the three looks.');
   if(await db.prepare('SELECT id FROM arcade_players WHERE room=? AND lower(alias)=lower(?)').bind(code,alias).first())arcFail('That game name is taken. Tap shuffle for a new one.',409);
   const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),game=newArcadeGame(character);
   const added=await db.prepare('INSERT INTO arcade_players(id,room,alias,token_hash,character,game,updated_at,joined_at) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM arcade_players WHERE room=?)<50').bind(id,code,alias,await arcHash(token),character,JSON.stringify(game),now,now,code).run();
   if((added.meta?.changes??added.changes)===0)arcFail('This room has reached 50 players.');
   return arcJson({id,token,alias,character,code},201);
  }
  const token=req.headers.get('authorization')?.replace(/^Bearer /,'')||'',pid=req.headers.get('x-player')||'';
  const host=!!token&&await arcHash(token)===room.host_hash;
  const player=pid?await db.prepare('SELECT * FROM arcade_players WHERE room=? AND id=?').bind(code,pid).first():null;
  const mine=!!player&&!!token&&await arcHash(token)===player.token_hash;
  if(path==='ready'&&req.method==='POST'){
   if(!mine)arcFail('Join this room before marking yourself ready.',403);
   if(phase==='finished')arcFail('This game has finished.',409);
   const readyGame=JSON.parse(player.game);if(readyGame.practiceReady)return arcJson({ok:true});
   readyGame.practiceReady=true;
   const saved=await db.prepare("UPDATE arcade_players SET game=? WHERE id=? AND seq=? AND EXISTS (SELECT 1 FROM arcade_rooms WHERE code=? AND phase!='finished')").bind(JSON.stringify(readyGame),pid,player.seq,code).run();
   if((saved.meta?.changes??saved.changes)===0)arcFail('Your game changed while connecting. Try again.',409);
   return arcJson({ok:true});
  }
  if(path==='control'&&req.method==='POST'){
   if(!host)arcFail('Only the host can control the session.',403);
   const action=body.action;let next={phase:room.phase,deadline:room.deadline,remaining:room.remaining,target:room.target};
   if(action==='start'&&phase==='lobby'){
    const joined=(await db.prepare('SELECT game FROM arcade_players WHERE room=?').bind(code).all()).results,count=joined.length;if(!count)arcFail('Wait for at least one player to join.');
    const ready=joined.filter(p=>JSON.parse(p.game).practiceReady).length;
    if(ready<count&&!body.allowUnready)arcFail('Some players are still practising. Wait until everyone is ready, or choose Start anyway.',409);
    next={phase:'active',deadline:now+room.duration*1000,remaining:null,target:count*4};
   }else if(action==='pause'&&phase==='active')next={...next,phase:'paused',deadline:null,remaining:room.deadline-now};
   else if(action==='resume'&&phase==='paused')next={...next,phase:'active',deadline:now+room.remaining,remaining:null};
   else if(action==='finish'&&['active','paused'].includes(phase))next.phase='finished';
   else arcFail('That control is not available right now.');
   if(action==='start'||action==='resume')await db.prepare('UPDATE arcade_players SET credit=8,updated_at=? WHERE room=?').bind(now,code).run();
   await db.prepare('UPDATE arcade_rooms SET phase=?,deadline=?,remaining=?,target=?,revision=revision+1 WHERE code=? AND revision=?').bind(next.phase,next.deadline,next.remaining,next.target,code,room.revision).run();
   return arcJson({ok:true});
  }
  if(path==='input'&&req.method==='POST'){
   if(!mine)arcFail('Join this room before playing.',403);
   if(phase!=='active'||player.finished)arcFail(phase==='paused'?'The host has paused the game.':'The game is not running.',409);
   const ops=body.ops;if(!Array.isArray(ops)||!ops.length||ops.length>32)arcFail('Send between 1 and 32 game inputs.');
   for(const op of ops)if(!op||!Number.isInteger(op.n)||op.n<1||!(op.a===1&&!op.d||['up','down','left','right'].includes(op.d)&&!op.a))arcFail('Invalid game input.');
   const fresh=ops.filter(o=>o.n>player.seq),g=JSON.parse(player.game);
   if(!fresh.length)return arcJson({game:g,seq:player.seq,events:[],serverNow:now});
   for(let i=0;i<fresh.length;i++)if(fresh[i].n!==player.seq+i+1)arcFail('Your game needs to reconnect. Rejoining will keep your progress.',409);
   const credit=Math.min(32,player.credit+(now-player.updated_at)/ARCADE_TICK);
   if(fresh.length>Math.floor(credit))return arcJson({error:'Inputs arrived too quickly. Retrying shortly.',retry:true},429);
   const events=[];for(const op of fresh){const emitted=applyArcadeInput(g,op,now);g.seq=op.n;events.push(...emitted.map(e=>({...e,seq:op.n})));}
   const changed=await db.prepare('UPDATE arcade_players SET game=?,seq=?,updated_at=?,credit=? WHERE id=? AND seq=?').bind(JSON.stringify(g),g.seq,now,credit-fresh.length,pid,player.seq).run();
   if((changed.meta?.changes??changed.changes)===0)arcFail('Your game changed while syncing. Reconnecting.',409);
   for(const event of events.filter(e=>e.kind==='job'))await db.prepare('INSERT OR IGNORE INTO arcade_events(id,room,player,alias,character,type,detail,points,poster,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(pid+'_'+event.seq,code,pid,player.alias,player.character,event.type,event.detail,event.points,event.poster?JSON.stringify(event.poster):null,now).run();
   return arcJson({game:g,seq:g.seq,events,serverNow:now});
  }
  if(path==='finish'&&req.method==='POST'){
   if(!mine)arcFail('Join this room before finishing.',403);
   if(phase==='lobby')arcFail('Wait for the host to start the game.');
   await db.prepare('UPDATE arcade_players SET finished=1 WHERE id=?').bind(pid).run();return arcJson({ok:true});
  }
  if(path==='state'&&req.method==='GET'){
   const rows=(await db.prepare('SELECT id,alias,character,game,finished,joined_at FROM arcade_players WHERE room=? ORDER BY joined_at').bind(code).all()).results;
   const players=rows.map(p=>{const g=JSON.parse(p.game);return {alias:p.alias,character:p.character,game:publicArcadeGame(g),ready:!!g.practiceReady,score:g.score,completed:g.jobs.reduce((a,b)=>a+b,0),finished:!!p.finished,profile:phase==='finished'?arcadeProfile(g):undefined};});
   const events=(await db.prepare('SELECT alias,character,type,detail,points,poster,created_at,id FROM arcade_events WHERE room=? ORDER BY created_at DESC,id DESC LIMIT 20').bind(code).all()).results.map(e=>({...e,poster:e.poster?JSON.parse(e.poster):null}));
   const game=mine?JSON.parse(player.game):null,finished=mine&&!!player.finished;
   const jobs=players.reduce((a,p)=>a+p.completed,0),score=players.reduce((a,p)=>a+p.score,0);
   return arcJson({code,phase,deadline:room.deadline,remaining:room.remaining,duration:room.duration,revision:room.revision,serverNow:now,host,count:players.length,readyCount:players.filter(p=>p.ready).length,ready:!!game?.practiceReady,players,leaderboard:[...players].sort((a,b)=>b.score-a.score||b.completed-a.completed).slice(0,5),events,launch:{jobs,target:room.target,score,progress:Math.min(100,Math.round(jobs/room.target*100))},game,seq:mine?player.seq:null,finished,profile:game&&(phase==='finished'||finished)?arcadeProfile(game):null});
  }
  return arcJson({error:'Not found.'},404);
 }catch(e){if(e.status)return arcJson({error:e.message},e.status);console.error('Arcade room error:',e.message);return arcJson({error:'The room could not sync. Your local game will wait while reconnecting.'},500);}
}
