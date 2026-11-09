// Deterministic tile game, shared by the phone and authoritative room server.
export const ARCADE_TICK=150;
export const MIN_ROLE_JOBS=2;
export const MAP_W=34,MAP_H=26,TILE=16;
export const JOBS=[
 {id:'strategy',name:'STRATEGY',role:'Strategy',person:'REM',colour:'#b4df65',x:6,y:4,need:'Find 3 customer clues, then bring them to Rem.',real:'Strategists do this for real: they learn what customers think, then turn it into a plan.'},
 {id:'creative',name:'CREATIVE',role:'Creative',person:'NOVA',colour:'#bba2fa',x:26,y:4,need:'Find a colour and a word tile, then make an ad with Nova.',real:'Creatives do this for real: they turn the plan into ads, words and designs people notice.'},
 {id:'account',name:'ACCOUNTS',role:'Account management',person:'SOL',colour:'#ffb26e',x:6,y:20,need:'Get the client’s message from Sol, then take it to the person he names.',real:'Account managers do this for real: they make sure the team knows what the client needs.'},
 {id:'production',name:'PRODUCTION',role:'Production',person:'PATCH',colour:'#79d8d8',x:26,y:20,need:'Find a spanner and a battery, then help Patch fix the launch.',real:'Producers do this for real: they sort the kit, people and places to get the work made.'}
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
export function newArcadeGame(character=0){return {x:16,y:12,face:'down',steps:0,character,score:0,inventory:[],delivery:null,jobs:[0,0,0,0],affinity:[0,0,0,0],readyAt:[0,0,0,0],firstType:null,lastType:null,lastJobAt:0,focus:null,posters:[],lastNote:'Move into a room to choose your first job.',guide:null,practiceReady:false,seq:0};}
export function nearbyJob(g){return JOBS.findIndex(j=>Math.abs(j.x-g.x)+Math.abs(j.y-g.y)<=1);}
export function hasItem(g,id){return g.inventory.includes(id);}
export function availablePickups(g,now){return PICKUPS.filter(p=>!hasItem(g,p.id)&&now>=g.readyAt[p.type]&&!(p.kind==='colour'&&g.inventory.some(id=>PICKUPS.find(p=>p.id===id)?.kind==='colour'))&&!(p.kind==='word'&&g.inventory.some(id=>PICKUPS.find(p=>p.id===id)?.kind==='word')));}
export function jobAction(g,now=Date.now()){
 const near=nearbyJob(g),talk={label:'TALK',enabled:near>=0,ready:false};
 if(near<0)return talk;
 if(g.delivery)return g.delivery.to===near?{label:'DELIVER',enabled:true,ready:true}:talk;
 if(now<g.readyAt[near])return talk;
 if(near===2)return {label:'GET MESSAGE',enabled:true,ready:true};
 const ready=near===0?['clue-a','clue-b','clue-c'].every(id=>hasItem(g,id)):near===1?g.inventory.some(id=>id.startsWith('ink-'))&&g.inventory.some(id=>id.startsWith('word-')):hasItem(g,'spanner')&&hasItem(g,'battery');
 return ready?{label:['MAKE PLAN','MAKE AD','','FIX KIT'][near],enabled:true,ready:true}:talk;
}
export function jobLabel(g,now=Date.now()){return jobAction(g,now).label;}

export function jobChecklist(g){
 if(g.delivery)return [{icon:'brief',label:'Client message',have:true}];
 const area=areaAt(g.x,g.y),type=area>=0?area:g.focus;
 if(type===0){const n=g.inventory.filter(id=>id.startsWith('clue-')).length;return [{icon:'clue',label:`Clues ${n}/3`,have:n===3}];}
 if(type===1)return [{icon:'paint',label:'Colour',have:g.inventory.some(id=>id.startsWith('ink-'))},{icon:'word',label:'Word',have:g.inventory.some(id=>id.startsWith('word-'))}];
 if(type===3)return [{icon:'spanner',label:'Spanner',have:hasItem(g,'spanner')},{icon:'battery',label:'Battery',have:hasItem(g,'battery')}];
 return [];
}
// A single small instruction, shared by solo and live play. Guidance never
// chooses a first job: players pick a room, then get help with that job.
export function nextInstruction(g,now=Date.now()){
 const near=nearbyJob(g),area=areaAt(g.x,g.y),type=g.delivery?g.delivery.to:near>=0?near:area>=0?area:g.focus;
 const personStep=(n,action,title)=>({type:n,kind:near===n?'act':'person',title:near===n?`Press ${action}.`:title,detail:near===n?'Press the round button, or Space.':`Follow the dots. Stand beside ${JOBS[n].person[0]+JOBS[n].person.slice(1).toLowerCase()}.`,icon:'player-'+[0,1,3,2][n],target:{x:JOBS[n].x,y:JOBS[n].y,person:true}});
 if(type===null||type===undefined||type<0)return {type:null,kind:'choose',title:'Choose your first job.',detail:'Hold an arrow. Move into any room.',icon:'player-'+g.character,target:null};
 if(g.delivery)return personStep(type,'DELIVER',`Take Sol’s message to ${JOBS[type].person[0]+JOBS[type].person.slice(1).toLowerCase()}.`);
 if(now<g.readyAt[type])return {type,kind:'wait',title:'Job done. Choose your next one.',detail:'Try another room, or wait for new items.',icon:'player-'+g.character,target:null};
 if(type===2)return personStep(2,'GET MESSAGE','Get the client’s message from Sol.');
 const missing=availablePickups(g,now).filter(p=>p.type===type).sort((a,b)=>(Math.abs(a.x-g.x)+Math.abs(a.y-g.y))-(Math.abs(b.x-g.x)+Math.abs(b.y-g.y)));
 const target=missing.find(p=>g.guide?.type===type&&g.guide.id===p.id)||missing[0];
 if(target){
  const n=g.inventory.filter(id=>id.startsWith('clue-')).length;
  const titles={clue:'Collect 3 clues.',paint:'Collect a colour tin.',word:'Collect a word tile.',spanner:'Collect the spanner.',battery:'Collect the battery.'};
  return {type,kind:'collect',title:titles[target.icon],detail:target.icon==='clue'?`Walk over the flashing card. ${n}/3 collected.`:`Walk over the flashing ${{paint:'tin',word:'word tile',spanner:'spanner',battery:'battery'}[target.icon]} to pick it up.`,icon:target.icon,target};
 }
 const names=['Rem','Nova','Sol','Patch'],actions=['MAKE PLAN','MAKE AD','GET MESSAGE','FIX KIT'];
 const titles=['Take 3 clues to Rem.','Take colour + word to Nova.','','Take the tools to Patch.'];
 return personStep(type,actions[type],titles[type]);
}
export function gameHint(g,now=Date.now()){const step=nextInstruction(g,now);return step.title+' '+step.detail;}
export function guidancePath(g,target){
 if(!target)return [];
 const queue=[{x:g.x,y:g.y,previous:-1}],seen=new Set([g.x+','+g.y]);
 for(let at=0;at<queue.length;at++){
  const p=queue[at],distance=Math.abs(p.x-target.x)+Math.abs(p.y-target.y);
  if(target.person?distance<=1:distance===0){const route=[];for(let i=at;queue[i].previous>=0;i=queue[i].previous)route.push({x:queue[i].x,y:queue[i].y});return route.reverse();}
  for(const [dx,dy] of [[0,-1],[-1,0],[1,0],[0,1]]){const x=p.x+dx,y=p.y+dy,key=x+','+y;if(!seen.has(key)&&canWalk(x,y)){seen.add(key);queue.push({x,y,previous:at});}}
 }
 return [];
}

// Every finished job adds one piece to the room's campaign wall.
export const PIECES={
 insight:['Customers want a say in the next design.','People want to feel included, not sold to.','They care about who is behind the brand.','They trust real people more than ads.','They want trainers that last.','They share what their mates are wearing.'],
 approval:['Budget signed off','Launch date locked in','Final ad approved','Influencer deal agreed','Shoot location approved','Press release approved'],
 live:['Billboard up in Shoreditch','Launch lights on','Camera rolling','Pop-up shop built','Trainers on the shelves','Projection on the station wall'],
 headlines:{'word-us':['FOR EVERYONE','MADE WITH YOU','ONE CREW','NO VIP LIST'],'word-you':['YOUR WAY','DESIGNED BY YOU','YOUR MOVE','STEP UP']}
};
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
function keepGuide(g,now){const step=nextInstruction(g,now);g.guide=step.kind==='collect'?{type:step.type,id:step.target.id}:null;}
export function applyArcadeInput(g,input,now){keepGuide(g,now);const events=applyArcadeStep(g,input,now);keepGuide(g,now);return events;}
function applyArcadeStep(g,input,now){
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
   const text=PIECES.approval[(g.jobs[2]+g.steps)%PIECES.approval.length];completeArcadeJob(g,2,now,events,`Message delivered to ${from}. ${text}.`,{kind:'approval',text});return events;
  }
  if(g.delivery){arcadeNote(g,`Take Sol’s message to ${JOBS[g.delivery.to].person} first.`,events);return events;}
  g.focus=n;
  if(now<g.readyAt[n]){arcadeNote(g,'New supplies are arriving. Try another room for a moment.',events);return events;}
  if(n===0){
   if(!['clue-a','clue-b','clue-c'].every(id=>hasItem(g,id))){arcadeNote(g,'REM: Bring me all 3 customer clues. They’re the green cards in this room.',events);return events;}
   const text=PIECES.insight[(g.jobs[0]+g.steps)%PIECES.insight.length];completeArcadeJob(g,0,now,events,'Insight found: '+text,{kind:'insight',text});
  }else if(n===1){
   const ink=PICKUPS.find(p=>p.kind==='colour'&&hasItem(g,p.id)),word=PICKUPS.find(p=>p.kind==='word'&&hasItem(g,p.id));
   if(!ink||!word){arcadeNote(g,'NOVA: Pick a colour tin and a word tile in this room. Then we’ll make your ad.',events);return events;}
   const lines=PIECES.headlines[word.id],poster={kind:'ad',title:lines[(g.jobs[1]+g.steps)%lines.length],colour:ink.value,pattern:(g.jobs[1]+Math.floor(g.steps/4))%3};g.posters.push(poster);g.posters=g.posters.slice(-6);
   completeArcadeJob(g,1,now,events,'Ad made: '+poster.title,poster);
  }else if(n===2){
   if(g.delivery){arcadeNote(g,`SOL: ${JOBS[g.delivery.to].person} is waiting for my message. Take it to them.`,events);return events;}
   const to=[1,0,3][g.jobs[2]%3];g.delivery={to};g.inventory.push('brief');g.affinity[2]+=1;g.firstType??=2;g.score+=30;
   events.push({kind:'pickup',name:'CLIENT MESSAGE',type:2,points:30,x:g.x,y:g.y});
   arcadeNote(g,`SOL: Take this message to ${JOBS[to].person} in ${JOBS[to].name}. They need it to start work.`,events);
  }else if(n===3){
   if(!hasItem(g,'spanner')||!hasItem(g,'battery')){arcadeNote(g,'PATCH: Bring me a spanner and a battery from this room. We need to fix the launch equipment.',events);return events;}
   const text=PIECES.live[(g.jobs[3]+g.steps)%PIECES.live.length];completeArcadeJob(g,3,now,events,'Kit fixed. '+text+'.',{kind:'live',text});
  }
 }
 return events;
}
export function arcadeProfile(g){
 const completed=g.jobs.reduce((a,b)=>a+b,0);
 const high=Math.max(...g.affinity);if(high<.01||completed<MIN_ROLE_JOBS)return null;
 const tied=g.affinity.map((v,i)=>Math.abs(v-high)<.001?i:-1).filter(i=>i>=0);
 const role=tied.includes(g.lastType)?g.lastType:tied.includes(g.firstType)?g.firstType:tied[0];
 return {role,score:g.score,jobs:[...g.jobs],collected:g.affinity.map((v,i)=>Math.max(0,Math.round((v-g.jobs[i]*3)*100)/100)),completed:g.jobs.reduce((a,b)=>a+b,0)};
}
export function publicArcadeGame(g){return {x:g.x,y:g.y,face:g.face,steps:g.steps,character:g.character,score:g.score,inventory:[...g.inventory],delivery:g.delivery,readyAt:g.readyAt,jobs:[...g.jobs],posters:g.posters,focus:g.focus};}

// Neutral practice has its own state; it never awards points or role scores.
export function newPracticeGame(character=0){return {x:2,y:4,face:'right',character,steps:0,moved:false,collected:false,complete:false};}
export function practiceInstruction(g){
 if(!g.moved)return {title:'Hold an arrow to move.',detail:'Try the arrow buttons below.',ready:false};
 if(!g.collected)return {title:'Walk over the star.',detail:'Move onto it to pick it up.',ready:false};
 const ready=Math.abs(g.x-7)+Math.abs(g.y-4)<=1;
 return {title:ready?'Press READY.':'Stand beside your teammate.',detail:ready?'Use the round button below.':'Move next to the person on the right.',ready};
}
export function applyPracticeInput(g,input){
 if(g.complete)return;
 if(input.d){const dir={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[input.d];if(!dir)return;const x=g.x+dir[0],y=g.y+dir[1];g.face=input.d;
  if(x>=1&&x<=7&&y>=1&&y<=5&&!(x===7&&y===4)){g.x=x;g.y=y;g.steps++;g.moved=true;}
  if(g.moved&&g.x===5&&g.y===4)g.collected=true;
 }
 if(input.a&&g.collected&&practiceInstruction(g).ready)g.complete=true;
}
