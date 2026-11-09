// Fictional launch jobs. A player builds a useful piece of work from short
// tiles; several choices can work. Checks concern the brief, not personality.
const yes=(text,extra={})=>({text,...extra});
const no=(text,why)=>({text,why});
const slot=(label,options)=>({label,options});
export const TASK_POOLS=[
 [
  {id:'strategy-insight',title:'Find the real problem',output:'YOUR INSIGHT',action:'BUILD INSIGHT',resources:'research',kind:'insight',label:'INSIGHT',
   context:'UNDERGROUND costs £160. Use the research to explain what is stopping a first purchase.',
   sources:['Customer: “£160 feels risky for a brand I’ve never bought.”','Sales: first-time buyers often arrive through a friend.','Wear tests: the trainers hold up after six months.'],
   slots:[slot('THE BARRIER',[yes('Paying £160 for an unfamiliar brand feels risky.'),no('Nobody knows where the shop is.','The research says the problem is trust, not finding the shop.')]),slot('THE HUMAN NEED',[yes('Confidence that the trainers are worth it.'),no('Hyped up by lots of posts.','Hype won’t fix a worry about price. They need proof.')]),slot('DIRECTION FOR THE CAMPAIGN',[yes('Show real people testing the trainers.'),yes('Show how the materials and build quality hold up.'),no('Say they are exclusive. Leave out the proof.','Saying it’s exclusive doesn’t prove it’s worth £160.')])],
   result:'Help people trust a new brand with visible proof of quality.'},
  {id:'strategy-brief',title:'Build a creative brief',output:'YOUR CREATIVE BRIEF',action:'WRITE BRIEF',kind:'insight',label:'BRIEF',
   context:'Local students want a style of their own. UNDERGROUND is designed with young local creators. Give Creative a clear brief using Audience → Problem → Goal.',
   slots:[slot('AUDIENCE',[yes('Students looking for their own style.'),no('Everybody, of every age.','Too broad. The team needs a specific group to picture.')]),slot('PROBLEM TO SOLVE',[yes('They see the same big-label styles everywhere.'),no('The checkout is too slow.','Nothing in the brief says the checkout is a problem.')]),slot('WHAT THE CAMPAIGN SHOULD CHANGE',[yes('Get them to consider UNDERGROUND for their next pair.'),yes('Get them to try the trainers at the launch.'),no('List every product fact, with no clear goal.','Pick one thing you want people to do.')])],
   result:'Help students find their own style and consider UNDERGROUND.'},
  {id:'strategy-direction',title:'Choose what to solve first',output:'YOUR RECOMMENDATION',action:'SET DIRECTION',kind:'insight',label:'DIRECTION',
   context:'86 of 100 surveyed know about the launch. Most still cannot explain why they should trust the new brand. The shop and checkout work.',
   slots:[slot('PRIORITY',[yes('Build confidence in the product.'),no('Spend everything telling people the launch exists.','Most people already know about it. The problem is trust.')]),slot('EVIDENCE TO SHOW',[yes('A real wear test.'),yes('The creators explaining materials and construction.')]),slot('CHECK WHETHER IT WORKED',[yes('Ask whether people would consider buying after seeing it.'),no('Count views and assume the trust problem is solved.','Views only show how many saw it. Ask if they’d now buy.')])],
   result:'Focus on product trust, then check whether consideration improves.'},
  {id:'strategy-audience',title:'Pick who to target first',output:'YOUR TARGET AUDIENCE',action:'START',kind:'insight',label:'AUDIENCE',
   context:'Three groups liked the teaser post. You can only target one first.',
   slots:[slot('WHO FIRST',[yes('Students who already follow local creators.'),no('People who only buy whatever’s cheapest.','At £160, bargain hunters are the hardest sell.')]),slot('WHY THEM',[yes('They already care who made it.'),no('They’re the biggest group online.','Biggest doesn’t mean most likely to buy.')]),slot('WHERE TO REACH THEM',[yes('Through the creators they already follow.'),yes('At college and uni events.'),no('A TV ad at 3am.','Your audience isn’t watching TV at 3am.')])],
   result:'Target students who follow local creators, through those creators.'},
  {id:'strategy-comments',title:'Read the comments',output:'YOUR INSIGHT',action:'START',kind:'insight',label:'INSIGHT',
   context:'The teaser video got 400 comments. Work out what people are really saying.',
   slots:[slot('THE MOST COMMON COMMENT',[yes('“Looks sick, but are they worth £160?”'),no('“First!”','That tells you nothing about what people think.')]),slot('WHAT IT TELLS YOU',[yes('People like the look but doubt the price.'),no('Everyone hates them.','Most comments like the look. The worry is the price.')]),slot('WHAT YOU TELL THE TEAM',[yes('Show why they’re worth the money.'),no('Turn the comments off.','You’d lose the most useful feedback you’ve got.')])],
   result:'People like the look. Show them why it’s worth £160.'}
 ],
 [
  {id:'creative-concept',title:'Make a campaign idea',output:'YOUR CAMPAIGN CONCEPT',action:'MAKE AD',resources:'creative',kind:'ad',label:'CONCEPT',
   context:'The brief: help students express their own style. Use local people and make one clear promise.',
   slots:[slot('THE PROMISE',[yes('Wear it your way.'),no('The most expensive trainer wins.','The brief is about personal style, not who spent most.')]),slot('THE IDEA',[yes('Local creators style one pair three different ways.'),yes('A launch wall where people remix their own look.')]),slot('THE HEADLINE',[yes('YOUR WAY'),yes('MADE WITH YOU'),yes('ONE CREW')])],titleSlot:2,
   result:'A campaign about expressing your own style.'},
  {id:'creative-feedback',title:'Improve an ad after feedback',output:'YOUR REVISED AD',action:'UPDATE AD',kind:'ad',label:'REVISED AD',
   context:'The draft says “Something big. Soon.” The client wants people to understand the product and know they can try it at Saturday’s pop-up.',
   slots:[slot('THE MAIN MESSAGE',[yes('A new trainer, built with local creators.'),no('Something big is coming.','Jamie wants people to know what it actually is.')]),slot('USEFUL DETAIL',[yes('Try them at the pop-up this Saturday.'),no('Soon. Somewhere.','Give people a usable date and place.')]),slot('A CLEAR HEADLINE',[yes('BUILT WITH YOU'),yes('TRY YOUR WAY')])],titleSlot:2,
   result:'An ad with a clear product message and a useful invitation.'},
  {id:'creative-experience',title:'Plan a launch event',output:'YOUR LAUNCH IDEA',action:'BUILD IDEA',kind:'ad',label:'LAUNCH IDEA',
   context:'Make a launch experience that lets people show their own style. People should be able to take part easily.',
   slots:[slot('THE STARTING IDEA',[yes('Customise your own laces.',{headline:'MAKE YOUR MARK'}),yes('Style a pair with a local creator.',{headline:'YOUR WAY, LIVE'})]),slot('WHY PEOPLE WOULD CARE',[yes('They leave with a look they helped make.'),no('We get to collect lots of phone numbers.','Start with what’s in it for the person taking part.')]),slot('MAKE THE IDEA BETTER',[yes('Make taking part free and easy.'),no('Only let the biggest social accounts join.','That shuts out most of the students you’re trying to reach.')])],titleSlot:0,
   result:'An open launch experience people can make their own.'},
  {id:'creative-social',title:'Make a social video',output:'YOUR SOCIAL VIDEO',action:'START',kind:'ad',label:'SOCIAL VIDEO',
   context:'Make a short video for the launch. People scroll fast, so the first second matters.',
   slots:[slot('THE FIRST SECOND',[yes('Close-up of the trainer hitting the pavement.'),no('Our logo on a white screen for five seconds.','People scroll past before anything happens.')]),slot('WHO’S IN IT',[yes('Local creators wearing them their way.'),no('A celebrity who’s never worn them.','Fake fans undo the trust you’re trying to build.')]),slot('THE CAPTION',[yes('STEP IN'),yes('WEAR IT YOUR WAY')])],titleSlot:2,
   result:'A fast social video with real local creators.'},
  {id:'creative-poster',title:'Design the launch poster',output:'YOUR POSTER',action:'START',kind:'ad',label:'POSTER',
   context:'The poster goes up near colleges. It has to work for someone walking past.',
   slots:[slot('THE PICTURE',[yes('One big shot of the trainer.'),no('Twelve small photos of every detail.','Too busy to take in while walking past.')]),slot('THE WORDS',[yes('A short headline and the pop-up date.'),no('A full paragraph about the materials.','Nobody reads a paragraph on a wall.')]),slot('THE HEADLINE',[yes('TRY THEM SATURDAY'),yes('YOUR WAY. SATURDAY.')])],titleSlot:2,
   result:'A clear poster: one big shot, one headline, the date.'}
 ],
 [
  {id:'account-scope',title:'Agree what can be delivered',output:'YOUR CLIENT AGREEMENT',action:'AGREE SCOPE',kind:'approval',label:'SCOPE AGREED',to:1,
   context:'The client asks for six films and a poster today. There is £2,000 and one editor. Agree a useful plan the team can deliver.',
   slots:[slot('TODAY’S PRIORITY',[yes('One launch film and a poster.'),no('Promise six new films and a poster by lunch.','One editor can’t make six films by lunch.')]),slot('THE REST OF THE WORK',[yes('Agree dates for the remaining films.'),no('Quietly drop the remaining films.','Jamie has to agree to any change. Don’t drop things quietly.')]),slot('HOW YOU CONFIRM IT',[yes('Write down the scope, cost and dates. Get approval.'),no('Say “we’ll sort it” and start spending.','Get it agreed in writing before anyone spends time or money.')])],
   result:'Agreed: a launch film and poster today, with dates for the rest.'},
  {id:'account-change',title:'Handle a late client change',output:'YOUR CHANGE AGREEMENT',action:'AGREE CHANGE',kind:'approval',label:'CHANGE AGREED',to:3,
   context:'Thirty minutes before launch, the client wants a new logo on every asset. The crew needs a clear decision.',
   slots:[slot('FIRST RESPONSE',[yes('Check which posters and films it affects, and the deadlines.'),no('Say yes before checking with the crew.','Check what it affects before you say yes.')]),slot('A WORKABLE RECOMMENDATION',[yes('Update the main poster first. Agree a plan for the rest.'),no('Tell everyone to stop all work indefinitely.','Give the team one clear priority and a next step.')]),slot('THE AGREEMENT',[yes('Confirm the priority and revised timings in writing.'),no('Let everyone interpret the change differently.','Everyone needs to hear the same decision.')])],
   result:'Main poster first; the rest have agreed dates.'},
  {id:'account-handover',title:'Pass on Jamie’s request',output:'YOUR TEAM HANDOVER',action:'SEND HANDOVER',kind:'approval',label:'HANDOVER',to:0,
   context:'The client says “make it more London”. They also need the £160 price and Saturday launch date kept clear.',
   slots:[slot('KEEP THE REQUIREMENTS',[yes('Keep the price and launch date visible.'),no('Remove the price and date to make it look cleaner.','Jamie asked for those to stay.')]),slot('CLARIFY THE VAGUE PART',[yes('Show two visual examples and ask which feels right.'),no('Assume everyone means the same thing by “London”.','“More London” means different things to different people. Show examples.')]),slot('HAND OVER THE DECISION',[yes('Send one agreed summary with examples and timings.'),no('Forward ten messages without a summary.','Nobody will read ten messages. Send one clear summary.')])],
   result:'One clear handover: agreed look, visible price and launch date.'},
  {id:'account-feedback',title:'Pass on tough feedback',output:'YOUR NOTES FOR NOVA',action:'START',kind:'approval',label:'FEEDBACK SENT',to:1,
   context:'Jamie hates the first ad: “It doesn’t feel like us.” Nova needs useful notes, not just “Jamie hates it”.',
   slots:[slot('FIRST, ASK JAMIE',[yes('What exactly doesn’t feel like UNDERGROUND?'),no('Nothing. Just tell Nova to start again.','Nova needs to know what to change.')]),slot('HOW YOU PASS IT ON',[yes('Clear notes: keep the shoe shot, make the words less formal.'),no('Forward Jamie’s angry message as it is.','Turn feelings into notes the team can act on.')]),slot('KEEP IT FAIR',[yes('Tell Nova what Jamie liked too.'),no('Blame Nova in front of the client.','Back your team. Fix it together.')])],
   result:'Clear notes for Nova: keep the shoe shot, change the tone.'},
  {id:'account-budget',title:'Handle a budget cut',output:'YOUR NEW PLAN',action:'START',kind:'approval',label:'NEW BUDGET',to:3,
   context:'Jamie has cut the budget from £10,000 to £7,000. The plan has to change.',
   slots:[slot('FIRST',[yes('Ask Jamie what matters most to keep.'),no('Cut everything by the same amount.','Some parts matter more. Ask first.')]),slot('WHAT YOU SUGGEST',[yes('Keep the pop-up. Drop the second film.'),no('Keep everything and hope nobody notices.','The money isn’t there. Be honest.')]),slot('LOCK IT IN',[yes('Send the new plan and cost to Jamie to approve.'),no('Tell the team and skip Jamie.','The client approves the money.')])],
   result:'Pop-up kept, second film dropped, new plan approved.'}
 ],
 [
  {id:'production-budget',title:'Plan a shoot within budget',output:'YOUR SHOOT PLAN',action:'LOCK PLAN',resources:'production',kind:'live',label:'SHOOT BOOKED',budget:900,
   context:'Choose camera, sound and a location. Your total budget is £900. The courtyard is available and free.',
   slots:[slot('CAMERA',[yes('Basic camera package — £400',{cost:400}),yes('Premium camera package — £650',{cost:650})]),slot('SOUND',[yes('Sound recorder — £200',{cost:200}),yes('Sound operator — £350',{cost:350})]),slot('LOCATION',[yes('Courtyard — free',{cost:0}),yes('Hire a studio — £400',{cost:400})])],
   result:'Camera, sound and location booked within the shoot budget.'},
  {id:'production-schedule',title:'Put the shoot in order',output:'YOUR PRODUCTION SCHEDULE',action:'LOCK SCHEDULE',kind:'live',label:'SHOOT READY',
   context:'The ad must be ready tonight. Put the work in an order that makes it possible.',
   slots:[slot('FIRST',[yes('Confirm crew and location.'),no('Film the ad.','Confirm people and the location before you start filming.'),no('Edit and export.','You need footage before you can edit it.')]),slot('THEN',[yes('Film the ad.'),no('Send the finished film.','You haven’t filmed or edited it yet.')]),slot('FINALLY',[yes('Edit, check and export the film.'),no('Start looking for a location.','The location needs to be ready before the shoot.')])],
   result:'Crew and location confirmed → film → edit, check and export.'},
  {id:'production-backup',title:'Rescue a cancelled location',output:'YOUR BACKUP PLAN',action:'DEPLOY PLAN',kind:'live',label:'LAUNCH SAVED',
   context:'Rain has flooded the outdoor location. Doors open in an hour. A booked indoor room is five minutes away.',
   slots:[slot('THE SPACE',[yes('Move to the booked indoor room.'),no('Wait outside and hope it dries.','There is a usable indoor backup and only an hour left.')]),slot('THE PEOPLE',[yes('Send the new address and timings to the whole crew.'),no('Move the kit without telling anyone.','People need to know where to go and when.')]),slot('BEFORE DOORS OPEN',[yes('Test power and sound, then check the space is ready.'),no('Open the doors and test everything afterwards.','Check the basics before people arrive.')])],
   result:'Indoor backup ready; crew updated; power and sound tested.'},
  {id:'production-popup',title:'Set up the pop-up shop',output:'YOUR POP-UP PLAN',action:'START',kind:'live',label:'POP-UP READY',
   context:'The pop-up opens Saturday at 10am. Get the shop ready.',
   slots:[slot('STOCK',[yes('Every size from 3 to 12.'),no('Only size 9.','Most people aren’t a size 9.')]),slot('THE QUEUE',[yes('Barriers and someone on the door.'),no('Let everyone in at once.','A crush is a safety risk.')]),slot('PAYING',[yes('Card readers charged, plus a spare.'),no('Cash only.','Most students pay by card or phone.')])],
   result:'Every size stocked, queue sorted, payments ready.'},
  {id:'production-crew',title:'Cover a missing crew member',output:'YOUR CREW PLAN',action:'START',kind:'live',label:'CREW SORTED',
   context:'Your camera operator is ill on shoot day. Filming starts in two hours.',
   slots:[slot('FIRST',[yes('Call the backup camera operator on your list.'),no('Cancel the shoot.','Jamie’s deadline doesn’t move. Find cover.')]),slot('BRIEF THEM',[yes('Send the shot list and the location.'),no('Let them work it out on the day.','They need the plan to film the right shots.')]),slot('WHO ELSE NEEDS TO KNOW',[yes('Update Jamie and the team.'),no('Nobody. Hope it goes fine.','Nobody likes surprises on shoot day.')])],
   result:'Backup camera operator booked and briefed. Shoot on time.'}
 ]
];
export function taskFor(game,type){return TASK_POOLS[type][(game.jobs[type]||0)%TASK_POOLS[type].length];}
export function taskById(id){return TASK_POOLS.flat().find(task=>task.id===id);}
export function checkTask(task,picks){
 if(!Array.isArray(picks)||picks.length!==task.slots.length)return {ok:false,message:'Fill every part of the plan first.'};
 const chosen=task.slots.map((s,i)=>Number.isInteger(picks[i])?s.options[picks[i]]:null);
 if(chosen.some(v=>!v))return {ok:false,message:'Choose a tile for each part of the plan.'};
 const problem=chosen.find(v=>v.why);if(problem)return {ok:false,message:problem.why};
 const cost=chosen.reduce((n,v)=>n+(v.cost||0),0);
 if(task.budget&&cost>task.budget)return {ok:false,message:`This plan costs £${cost}. You have £${task.budget}. Try a cheaper combination.`};
 return {ok:true,chosen,cost};
}
export function taskArtifact(task,result,game){
 const chosen=result.chosen,lines=chosen.map(v=>v.text),base={kind:task.kind,label:task.label,text:task.result,taskTitle:task.title,lines};
 if(task.budget)base.text=`Shoot booked for £${result.cost}: camera, sound and location.`;
 if(task.kind==='ad'){const headline=chosen[task.titleSlot||0];return {...base,title:headline.headline||headline.text,colour:'#b69bf4',pattern:game.jobs[1]%3};}
 return base;
}
