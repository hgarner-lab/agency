export const cast = [
 {name:'REM',color:'#c6ff40',tag:'CALM UNDER PRESSURE.',detail:'Reads the group chat before replying. Good at understanding a problem and keeping the team calm.',idle:'First day? We’ll explain as we go. Sol’s already calling.',playable:true},
 {name:'NOVA',color:'#b7a1ff',tag:'ALWAYS HAS AN IDEA.',detail:'Comes up with campaign ideas, sketches them out and gets the team excited. Always has a marker.',idle:'We need an idea that wins people back. Please don’t say “founder dance”.',playable:true},
 {name:'PATCH',color:'#68dce9',tag:'GETS THINGS BUILT.',detail:'Sorts venues, equipment and the practical jobs. Usually knows someone with a van.',idle:'I’ll sort the equipment. You help us decide what we’re making.',playable:true},
 {name:'SOL',color:'#ff985c',tag:'KEEPS THE CLIENT HAPPY.',detail:'Looks after the trainer brand UNDERGROUND for the agency. Makes sure the team knows exactly what the client needs.',idle:'That video wasn’t meant to go public. How bad are the comments?',playable:false}
];
export const missions = [
 {location:'THE AGENCY',clock:'48 HRS TO LAUNCH',objective:'Choose how the team responds to the leaked video.',speaker:3,
  line:'That “walking wallets” clip is everywhere. People think I only care about their money. What should we do first?',
  context:'Sol runs trainer brand UNDERGROUND. His £160 trainers launch in 48 hours. A leaked video of him insulting customers is spreading online.',
  interrupt:'Someone’s turned the clip into a dance track. More people are seeing it now.',
  actions:['READ THE COMMENTS','USE IT IN A DESIGN','ASK SOL TO APOLOGISE','PAUSE PLANNED POSTS'],icons:['⌕','✳','↗','⊘'],
  previews:['“Let’s read the comments and find out what people want Sol to change.”','“Let’s put WALKING WALLET on a limited-edition trainer and see if people get behind it.”','“Sol, record an honest apology. Explain what you said and take responsibility.”','“Patch, stop the planned social posts until we agree what to say.”'],
  kit:['CUSTOMER COMMENTS','TRAINER DESIGN','APOLOGY VIDEO PLAN','PAUSED POST SCHEDULE'],
  reactions:[{speaker:0,line:'The comments are clear: customers want respect. Now we know what the campaign needs to address.'},{speaker:1,line:'The Walking Wallet design is getting attention. Some people love it. Others think we’ve made it worse.'},{speaker:3,line:'Okay. I’ll record the apology and explain what I got wrong. Stay on the call, yeah?'},{speaker:2,line:'Six posts paused. Including one saying “we love our fans”. Good timing.'}],
  next:'NEXT: CREATE YOUR COMEBACK IDEA'},
 {location:'THE CREATIVE FLOOR',clock:'36 HRS TO LAUNCH',objective:'Write one idea to win customers back.',speaker:1,
  line:'We’ve got £100k for the launch. What could we do to win customers back and make them want the trainers?',
  context:'Sol is staying with your agency. Your team needs one campaign idea that gives customers a reason to trust the brand again.',
  interrupt:'Sol’s suggested a video of himself dancing. Got a better idea? Now’s the time.',
  kit:['YOUR CAMPAIGN IDEA'],next:'NEXT: DECIDE THE LAUNCH BUDGET'},
 {location:'THE ROOFTOP',clock:'24 HRS TO LAUNCH',objective:'Choose how much to spend on a surprise public event.',speaker:3,
  line:'A surprise public event in London could get us noticed. It’s also more to organise. How much of the £100k should we put into it?',
  context:'Split £100k between a surprise public event and a smaller, planned launch. More money for the public event means less for the planned launch.',
  interrupt:'The social media creator wants the event details. We need to agree the budget before we book anything.',
  kit:['EVENT WRISTBAND'],next:'NEXT: GET THE LAUNCH READY'},
 {location:'THE LAUNCH SITE',clock:'6 HRS TO LAUNCH',objective:'Choose which launch problem you’ll tackle first.',speaker:2,
  line:'The venue’s cancelled. Our social media creator is late. Sol wants another change. Which job are you taking? The crew will handle the rest.',
  context:'There are six hours left. You can take on one job: focus the message, adapt the idea, agree the plan with Sol, or find a new venue.',
  interrupt:'Guests are starting to arrive. We need the team working on the final plan.',
  actions:['SIMPLIFY THE MESSAGE','ADAPT THE EVENT IDEA','AGREE A PLAN WITH SOL','FIND A NEW VENUE'],icons:['◎','✳','↗','⊞'],
  previews:['“Let’s agree the one message people should remember about this launch.”','“Let’s change the event idea so it works with the situation we’re in.”','“Sol, let’s agree the final plan. The team needs time to finish it.”','“I’ll find a new venue and get the crew and equipment there.”'],
  kit:['CAMPAIGN MESSAGE','UPDATED EVENT PLAN','CLIENT-APPROVED PLAN','NEW VENUE PASS'],
  reactions:[{speaker:0,line:'One clear message. Everyone knows what the launch needs to say. Let’s get the work finished.'},{speaker:1,line:'We’ve changed the idea to work with what we’ve got. I’m still calling it a creative decision.'},{speaker:3,line:'Agreed. That’s the final plan. No more changes from me. Let’s get it ready.'},{speaker:2,line:'New venue booked. Team and equipment on the way. We can open on time.'}],next:'SEE YOUR AGENCY ROLE'}
];
const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
export function campaignState(answers,round,phase){
 const world={heat:85,trust:30,momentum:10,completed:0,history:[]};
 const done=phase==='reveal'?4:round+(phase==='closed'?1:0);
 for(let n=0;n<done;n++){
  const rows=answers.filter(a=>a.round===n);if(!rows.length)continue;
  let changes=[0,0,0],choice=null;
  if(n===0||n===3){const counts=[0,0,0,0];rows.forEach(a=>counts[a.payload.choice]++);const max=Math.max(...counts);const winners=counts.map((v,i)=>v===max?i:-1).filter(i=>i>=0);
   const table=n===0?[[-18,12,12],[8,4,25],[-25,25,8],[-8,8,18]]:[[-12,14,12],[-3,3,25],[-8,20,10],[-5,10,24]];
   changes=table[0].map((_,i)=>winners.reduce((sum,w)=>sum+table[w][i],0)/winners.length);choice=winners.length===1?winners[0]:null;
  }else if(n===1)changes=[-4,8,18];
  else {const risk=rows.reduce((sum,a)=>sum+a.payload.value,0)/rows.length;changes=[risk*.2-10,(50-risk)/5,12+risk*.15];choice=Math.round(risk);}
  world.heat=clamp(world.heat+changes[0]);world.trust=clamp(world.trust+changes[1]);world.momentum=clamp(world.momentum+changes[2]);world.completed++;world.history.push({round:n,choice});
 }
 world.status=world.completed===4?'THE LAUNCH IS LIVE':world.heat>=75?'ONLINE BACKLASH IS HIGH':world.momentum>=65?'THE LAUNCH IS TAKING SHAPE':'THE TEAM IS MAKING PROGRESS';
 return world;
}
export function loadout(answers){return answers.sort((a,b)=>a.round-b.round).map(a=>({round:a.round,name:missions[a.round].kit[(a.round===0||a.round===3)?a.payload.choice:0],icon:['⌕','✳','◈','⊞'][a.round]}));}
export function reaction(round,payload){
 if(!payload)return null;
 if(round===0||round===3)return missions[round].reactions[payload.choice];
 if(round===1)return {speaker:1,line:'Your idea is saved. We’ve got something to work with. Next, let’s decide how to fund the launch.'};
 return payload.value<=25?{speaker:3,line:'Most of the budget goes to the planned launch. Less to organise, but we’ll have to work harder to reach people.'}:payload.value>=75?{speaker:2,line:'Most of the budget goes to the public event. Bigger crowd, more to organise. I’ll start booking the team.'}:{speaker:0,line:'We’re funding both events. Now we need a clear plan for what each one will do.'};
}
