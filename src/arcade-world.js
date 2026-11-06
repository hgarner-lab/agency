// Deterministic tile game, shared by the phone and authoritative room server.
export const ARCADE_TICK=150;
export const MAP_W=34,MAP_H=26,TILE=16;
export const JOBS=[
 {id:'strategy',name:'RESEARCH',role:'Strategy',person:'REM',colour:'#b4df65',x:6,y:4,need:'Find 3 customer clues, then bring them to Rem.'},
 {id:'creative',name:'STUDIO',role:'Creative',person:'NOVA',colour:'#bba2fa',x:26,y:4,need:'Find a colour and a word tile, then make an ad with Nova.'},
 {id:'account',name:'CLIENT DESK',role:'Accounts',person:'SOL',colour:'#ffb26e',x:6,y:20,need:'Get a brief from Sol, then deliver it to the named teammate.'},
 {id:'production',name:'WORKSHOP',role:'Production',person:'PATCH',colour:'#79d8d8',x:26,y:20,need:'Find a spanner and a battery, then help Patch fix the launch.'}
];
export const PICKUPS=[
 {id:'clue-a',name:'CUSTOMER CLUE',kind:'clue',type:0,x:3,y:5,icon:'clue',text:'Customers want to feel included.'},
 {id:'clue-b',name:'CUSTOMER CLUE',kind:'clue',type:0,x:11,y:3,icon:'clue',text:'They care about the people behind the brand.'},
 {id:'clue-c',name:'CUSTOMER CLUE',kind:'clue',type:0,x:10,y:8,icon:'clue',text:'They want a say in the next design.'},
 {id:'ink-green',name:'LIME COLOUR',kind:'colour',type:1,x:22,y:3,icon:'paint',value:'#bbef66'},
 {id:'ink-purple',name:'PURPLE COLOUR',kind:'colour',type:1,x:30,y:6,icon:'paint',value:'#b69bf4'},
 {id:'word-us',name:'FOR EVERYONE',kind:'word',type:1,x:22,y:8,icon:'word',value:'FOR EVERYONE'},
 {id:'word-you',name:'YOUR WAY',kind:'word',type:1,x:29,y:8,icon:'word',value:'YOUR WAY'},
 {id:'spanner',name:'SPANNER',kind:'tool',type:3,x:22,y:17,icon:'spanner'},
 {id:'battery',name:'BATTERY',kind:'tool',type:3,x:30,y:22,icon:'battery'}
];
export const FURNITURE=[
 [4,2,'desk'],[5,2,'desk'],[6,2,'screen'],[7,2,'desk'],[11,6,'shelf'],[2,2,'plant'],
 [24,2,'desk'],[25,2,'screen'],[26,2,'desk'],[27,2,'desk'],[31,2,'plant'],[21,5,'shelf'],
 [4,22,'desk'],[5,22,'screen'],[6,22,'desk'],[7,22,'desk'],[2,23,'plant'],[11,18,'sofa'],
 [24,22,'desk'],[25,22,'desk'],[26,22,'screen'],[27,22,'desk'],[31,16,'shelf'],[20,23,'plant'],
 [15,2,'plant'],[18,23,'plant'],[2,12,'plant'],[31,12,'plant']
];
export function areaAt(x,y){if(y<=10&&x<15)return 0;if(y<=10&&x>18)return 1;if(y>=15&&x<15)return 2;if(y>=15&&x>18)return 3;return -1;}
export function wallAt(x,y){
 if(x<=0||x>=MAP_W-1||y<=0||y>=MAP_H-1)return true;
 if((x===14||x===19)&&y<11&&y!==6&&y!==7)return true;
 if((x===14||x===19)&&y>14&&y!==18&&y!==19)return true;
 if(y===10&&((x<14&&x!==7&&x!==8)||(x>19&&x!==24&&x!==25)))return true;
 if(y===15&&((x<14&&x!==7&&x!==8)||(x>19&&x!==24&&x!==25)))return true;
 return false;
}
export function canWalk(x,y){return !wallAt(x,y)&&!FURNITURE.some(f=>f[0]===x&&f[1]===y)&&!JOBS.some(j=>j.x===x&&j.y===y);}
export function newArcadeGame(character=0){return {x:16,y:12,face:'down',steps:0,character,score:0,inventory:[],delivery:null,jobs:[0,0,0,0],affinity:[0,0,0,0],readyAt:[0,0,0,0],firstType:null,lastType:null,lastJobAt:0,focus:null,posters:[],lastNote:'Walk into any room. Collect items and take them to the character there.',seq:0};}
export function nearbyJob(g){return JOBS.findIndex(j=>Math.abs(j.x-g.x)+Math.abs(j.y-g.y)<=1);}
export function hasItem(g,id){return g.inventory.includes(id);}
export function availablePickups(g,now){return PICKUPS.filter(p=>!hasItem(g,p.id)&&now>=g.readyAt[p.type]&&!(p.kind==='colour'&&g.inventory.some(id=>PICKUPS.find(p=>p.id===id)?.kind==='colour'))&&!(p.kind==='word'&&g.inventory.some(id=>PICKUPS.find(p=>p.id===id)?.kind==='word')));}
export function jobLabel(g){
 const near=nearbyJob(g);if(g.delivery&&near===g.delivery.to)return 'DELIVER';if(near===2)return g.delivery?'TALK':'GET BRIEF';
 if(near===0)return 'RESEARCH';if(near===1)return 'MAKE AD';if(near===3)return 'REPAIR';return 'TALK';
}
export function jobChecklist(g){
 if(g.delivery)return [{icon:'brief',label:'Client brief',have:true}];
 const area=areaAt(g.x,g.y),type=area>=0?area:g.focus;
 if(type===0){const n=g.inventory.filter(id=>id.startsWith('clue-')).length;return [{icon:'clue',label:`Clues ${n}/3`,have:n===3}];}
 if(type===1)return [{icon:'paint',label:'Colour',have:g.inventory.some(id=>id.startsWith('ink-'))},{icon:'word',label:'Word',have:g.inventory.some(id=>id.startsWith('word-'))}];
 if(type===3)return [{icon:'spanner',label:'Spanner',have:hasItem(g,'spanner')},{icon:'battery',label:'Battery',have:hasItem(g,'battery')}];
 return [];
}
export function gameHint(g,now=Date.now()){
 const near=nearbyJob(g),where=['top left','top right','bottom left','bottom right'];
 if(g.delivery){const j=JOBS[g.delivery.to];return near===g.delivery.to?`Press DELIVER to give the brief to ${j.person}.`:`Take Sol’s brief to ${j.person} in ${j.name} (${where[g.delivery.to]}). Stand beside them and press DELIVER.`;}
 const area=areaAt(g.x,g.y),type=near>=0?near:area>=0?area:g.focus;
 if(type===null||type<0)return 'Walk into any room to choose a job. Walk over the small floating objects to collect them.';
 if(now<g.readyAt[type])return 'Job done! New items appear in a few seconds. You can try another room.';
 if(type===2)return near===2?'Press GET BRIEF. Sol will tell you who to take it to.':'Walk to Sol in CLIENT DESK (bottom left). Stand beside him and press GET BRIEF.';
 const j=JOBS[type],items=jobChecklist({...g,focus:type,x:j.x,y:j.y}),ready=items.every(item=>item.have);
 if(ready){const action=['RESEARCH','MAKE AD','','REPAIR'][type];return near===type?`You have everything. Press ${action} to help ${j.person}.`:`You have everything. Stand next to ${j.person} in ${j.name} (${where[type]}) and press ${action}.`;}
 if(type===0){const n=g.inventory.filter(id=>id.startsWith('clue-')).length;return `Walk over the green clue cards in RESEARCH (top left). Collect all 3: ${n}/3 found. Then take them to Rem.`;}
 if(type===1){const c=g.inventory.some(id=>id.startsWith('ink-')),w=g.inventory.some(id=>id.startsWith('word-'));return `In STUDIO (top right), walk over ${!c&&!w?'one colour tin and one word tile':!c?'one colour tin':'one word tile'}. Then take them to Nova.`;}
 return `In WORKSHOP (bottom right), walk over ${!hasItem(g,'spanner')&&!hasItem(g,'battery')?'the spanner and the battery':!hasItem(g,'spanner')?'the spanner':'the battery'}. Then take them to Patch.`;
}
function arcadeNote(g,text,events){g.lastNote=text;events.push({kind:'note',text});}
function collectArcadeItem(g,p,now,events){
 g.inventory.push(p.id);g.focus=p.type;g.affinity[p.type]+=p.type===0?1/3:1/2;g.score+=p.type===0?10:15;g.firstType??=p.type;
 events.push({kind:'pickup',name:p.name,type:p.type,points:p.type===0?10:15,x:p.x,y:p.y});
 if(p.text)arcadeNote(g,`Clue ${g.inventory.filter(id=>id.startsWith('clue-')).length}/3 collected: ${p.text}`,events);
 else arcadeNote(g,p.kind==='word'?`Word tile collected: ${p.value}.`:`${p.name} collected. It’s in your bag.`,events);
}
function completeArcadeJob(g,type,now,events,detail,poster=null){
 const bonus=g.lastJobAt?Math.max(0,30-Math.floor((now-g.lastJobAt)/1000)):0;
 g.score+=150+bonus;g.jobs[type]++;g.affinity[type]+=3;g.lastType=type;g.lastJobAt=now;g.readyAt[type]=now+4000;g.focus=null;
 const used=PICKUPS.filter(p=>p.type===type).map(p=>p.id);g.inventory=g.inventory.filter(id=>!used.includes(id));
 events.push({kind:'job',type,points:150+bonus,total:g.score,detail,poster});
 arcadeNote(g,detail+' +'+(150+bonus)+' points. Choose your next job.',events);
}
export function applyArcadeInput(g,input,now){
 const events=[];
 if(input.d){
  const dir={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[input.d];if(!dir)return events;
  g.face=input.d;const x=g.x+dir[0],y=g.y+dir[1];if(canWalk(x,y)){g.x=x;g.y=y;g.steps++;}
  for(const p of availablePickups(g,now))if(p.x===g.x&&p.y===g.y)collectArcadeItem(g,p,now,events);
 }
 if(input.a){
  const n=nearbyJob(g);
  if(n<0){arcadeNote(g,'Stand next to Rem, Nova, Sol or Patch to do a job.',events);return events;}
  if(g.delivery&&g.delivery.to===n){
   const from=JOBS[n].person;g.delivery=null;g.inventory=g.inventory.filter(id=>id!=='brief');
   completeArcadeJob(g,2,now,events,`Brief delivered to ${from}. The client’s plan is agreed.`);return events;
  }
  g.focus=n;
  if(now<g.readyAt[n]){arcadeNote(g,'New supplies are arriving. Try another room for a moment.',events);return events;}
  if(n===0){
   if(!['clue-a','clue-b','clue-c'].every(id=>hasItem(g,id))){arcadeNote(g,'REM: Bring me all 3 customer clues. They’re the green cards in this room.',events);return events;}
   const texts=['You found what customers want: a say in the next trainer.','You found a customer insight: make the launch feel open to everyone.','You turned customer comments into a clear plan for the campaign.'];
   completeArcadeJob(g,0,now,events,texts[g.jobs[0]%3]);
  }else if(n===1){
   const ink=PICKUPS.find(p=>p.kind==='colour'&&hasItem(g,p.id)),word=PICKUPS.find(p=>p.kind==='word'&&hasItem(g,p.id));
   if(!ink||!word){arcadeNote(g,'NOVA: Pick a colour tin and a word tile in this room. Then we’ll make your ad.',events);return events;}
   const poster={title:word.value,colour:ink.value,pattern:g.jobs[1]%3};g.posters.push(poster);g.posters=g.posters.slice(-4);
   completeArcadeJob(g,1,now,events,'Ad made: UNDERGROUND / '+word.value,poster);
  }else if(n===2){
   if(g.delivery){arcadeNote(g,`SOL: ${JOBS[g.delivery.to].person} is waiting for my brief. Take it to them.`,events);return events;}
   const to=[1,0,3][g.jobs[2]%3];g.delivery={to};g.inventory.push('brief');g.affinity[2]+=1;g.firstType??=2;g.score+=30;
   events.push({kind:'pickup',name:'CLIENT BRIEF',type:2,points:30,x:g.x,y:g.y});
   arcadeNote(g,`SOL: Take this brief to ${JOBS[to].person} in ${JOBS[to].name}. They need it to start work.`,events);
  }else if(n===3){
   if(!hasItem(g,'spanner')||!hasItem(g,'battery')){arcadeNote(g,'PATCH: Bring me a spanner and a battery from this room. We need to fix the launch equipment.',events);return events;}
   completeArcadeJob(g,3,now,events,['Launch sign fixed. The brand’s name is back in lights.','Launch lights repaired. The set is ready.','Camera repaired. The crew can start filming.'][g.jobs[3]%3]);
  }
 }
 return events;
}
export function arcadeProfile(g){
 const high=Math.max(...g.affinity);if(high<.01)return null;
 const tied=g.affinity.map((v,i)=>Math.abs(v-high)<.001?i:-1).filter(i=>i>=0);
 const role=tied.includes(g.lastType)?g.lastType:tied.includes(g.firstType)?g.firstType:tied[0];
 return {role,score:g.score,jobs:[...g.jobs],collected:g.affinity.map((v,i)=>Math.max(0,Math.round((v-g.jobs[i]*3)*100)/100)),completed:g.jobs.reduce((a,b)=>a+b,0)};
}
export function publicArcadeGame(g){return {x:g.x,y:g.y,face:g.face,steps:g.steps,character:g.character,score:g.score,inventory:[...g.inventory],delivery:g.delivery,readyAt:g.readyAt,jobs:[...g.jobs],posters:g.posters,focus:g.focus};}
