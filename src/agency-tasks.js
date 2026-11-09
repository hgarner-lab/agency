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
   slots:[slot('THE BARRIER',[yes('Paying £160 for an unfamiliar brand feels risky.'),no('Nobody knows where the shop is.','The research points to trust, not a missing shop address.')]),slot('THE HUMAN NEED',[yes('Confidence that the trainers are worth it.'),no('More posts, whatever they say.','More posts will not help unless they answer the concern.')]),slot('DIRECTION FOR THE CAMPAIGN',[yes('Show real people testing the trainers.'),yes('Show how the materials and build quality hold up.'),no('Say they are exclusive. Leave out the proof.','Exclusivity does not answer the worry about value.')])],
   result:'Help people trust a new brand with visible proof of quality.'},
  {id:'strategy-brief',title:'Build a creative brief',output:'YOUR CREATIVE BRIEF',action:'WRITE BRIEF',kind:'insight',label:'BRIEF',
   context:'Local students want a style of their own. UNDERGROUND is designed with young local creators. Give Creative a clear brief using Audience → Problem → Goal.',
   slots:[slot('AUDIENCE',[yes('Students looking for their own style.'),no('Everybody, of every age.','A useful brief gives the team a specific audience.')]),slot('PROBLEM TO SOLVE',[yes('They see the same big-label styles everywhere.'),no('The checkout is too slow.','There is no evidence of a checkout problem in this brief.')]),slot('WHAT THE CAMPAIGN SHOULD CHANGE',[yes('Get them to consider UNDERGROUND for their next pair.'),yes('Get them to try the trainers at the launch.'),no('List every product fact, with no clear goal.','Choose what you want people to do or think differently.')])],
   result:'Help students find their own style and consider UNDERGROUND.'},
  {id:'strategy-direction',title:'Choose what to solve first',output:'YOUR RECOMMENDATION',action:'SET DIRECTION',kind:'insight',label:'DIRECTION',
   context:'86 of 100 surveyed know about the launch. Most still cannot explain why they should trust the new brand. The shop and checkout work.',
   slots:[slot('PRIORITY',[yes('Build confidence in the product.'),no('Spend everything telling people the launch exists.','Most people already know about it. The gap is trust.')]),slot('EVIDENCE TO SHOW',[yes('A real wear test.'),yes('The creators explaining materials and construction.')]),slot('CHECK WHETHER IT WORKED',[yes('Ask whether people would consider buying after seeing it.'),no('Count views and assume the trust problem is solved.','Views show reach. Check whether confidence or consideration changed.')])],
   result:'Focus on product trust, then check whether consideration improves.'}
 ],
 [
  {id:'creative-concept',title:'Make a campaign idea',output:'YOUR CAMPAIGN CONCEPT',action:'MAKE AD',resources:'creative',kind:'ad',label:'CONCEPT',
   context:'The brief: help students express their own style. Use local people and make one clear promise.',
   slots:[slot('THE PROMISE',[yes('Wear it your way.'),no('The most expensive trainer wins.','The brief is about personal style, not proving who spent most.')]),slot('THE IDEA',[yes('Local creators style one pair three different ways.'),yes('A launch wall where people remix their own look.')]),slot('THE HEADLINE',[yes('YOUR WAY'),yes('MADE WITH YOU'),yes('ONE CREW')])],titleSlot:2,
   result:'A campaign about expressing your own style.'},
  {id:'creative-feedback',title:'Improve an ad after feedback',output:'YOUR REVISED AD',action:'UPDATE AD',kind:'ad',label:'REVISED AD',
   context:'The draft says “Something big. Soon.” The client wants people to understand the product and know they can try it at Saturday’s pop-up.',
   slots:[slot('THE MAIN MESSAGE',[yes('A new trainer, built with local creators.'),no('Something big is coming.','The feedback asks you to say what the product actually is.')]),slot('USEFUL DETAIL',[yes('Try them at the pop-up this Saturday.'),no('Soon. Somewhere.','Give people a usable date and place.')]),slot('A CLEAR HEADLINE',[yes('BUILT WITH YOU'),yes('TRY YOUR WAY')])],titleSlot:2,
   result:'An ad with a clear product message and a useful invitation.'},
  {id:'creative-experience',title:'Develop a launch experience',output:'YOUR LAUNCH IDEA',action:'BUILD IDEA',kind:'ad',label:'LAUNCH IDEA',
   context:'Make a launch experience that lets people show their own style. People should be able to take part easily.',
   slots:[slot('THE STARTING IDEA',[yes('Customise your own laces.',{headline:'MAKE YOUR MARK'}),yes('Style a pair with a local creator.',{headline:'YOUR WAY, LIVE'})]),slot('WHY PEOPLE WOULD CARE',[yes('They leave with a look they helped make.'),no('We get to collect lots of phone numbers.','Start with a benefit for the person taking part.')]),slot('MAKE THE IDEA BETTER',[yes('Make taking part free and easy.'),no('Only let the biggest social accounts join.','That excludes most of the audience the brief asks you to include.')])],titleSlot:0,
   result:'An open launch experience people can make their own.'}
 ],
 [
  {id:'account-scope',title:'Agree what can be delivered',output:'YOUR CLIENT AGREEMENT',action:'AGREE SCOPE',kind:'approval',label:'SCOPE AGREED',to:1,
   context:'The client asks for six films and a poster today. There is £2,000 and one editor. Agree a useful plan the team can deliver.',
   slots:[slot('TODAY’S PRIORITY',[yes('One launch film and a poster.'),no('Promise six new films and a poster by lunch.','One editor cannot deliver that scope today.')]),slot('THE REST OF THE WORK',[yes('Agree dates for the remaining films.'),no('Quietly drop the remaining films.','The client needs to agree any change to the work.')]),slot('HOW YOU CONFIRM IT',[yes('Write down the scope, cost and dates. Get approval.'),no('Say “we’ll sort it” and start spending.','Get a shared agreement before the team commits time and budget.')])],
   result:'Agreed: a launch film and poster today, with dates for the rest.'},
  {id:'account-change',title:'Handle a late client change',output:'YOUR CHANGE AGREEMENT',action:'AGREE CHANGE',kind:'approval',label:'CHANGE AGREED',to:3,
   context:'Thirty minutes before launch, the client wants a new logo on every asset. The crew needs a clear decision.',
   slots:[slot('FIRST RESPONSE',[yes('Explain which assets and deadlines the change affects.'),no('Say yes before checking with the crew.','Check the impact before promising a change.')]),slot('A WORKABLE RECOMMENDATION',[yes('Update the hero poster first. Agree a plan for the rest.'),no('Tell everyone to stop all work indefinitely.','Give the team a specific priority and a workable next step.')]),slot('THE AGREEMENT',[yes('Confirm the priority and revised timings in writing.'),no('Let everyone interpret the change differently.','The client and team need the same version of the decision.')])],
   result:'Hero poster first; remaining updates have agreed timings.'},
  {id:'account-handover',title:'Turn a request into a clear handover',output:'YOUR TEAM HANDOVER',action:'SEND HANDOVER',kind:'approval',label:'HANDOVER',to:0,
   context:'The client says “make it more London”. They also need the £160 price and Saturday launch date kept clear.',
   slots:[slot('KEEP THE REQUIREMENTS',[yes('Keep the price and launch date visible.'),no('Remove the price and date to make it look cleaner.','Those are explicit requirements from the client.')]),slot('CLARIFY THE VAGUE PART',[yes('Show two visual examples and ask which feels right.'),no('Assume everyone means the same thing by “London”.','Get a concrete example before the team makes changes.')]),slot('HAND OVER THE DECISION',[yes('Send one agreed summary with examples and timings.'),no('Forward ten messages without a summary.','Make the approved request easy for the team to act on.')])],
   result:'One clear handover: agreed look, visible price and launch date.'}
 ],
 [
  {id:'production-budget',title:'Plan a shoot within budget',output:'YOUR SHOOT PLAN',action:'LOCK PLAN',resources:'production',kind:'live',label:'SHOOT BOOKED',budget:900,
   context:'Choose camera, sound and a location. Your total budget is £900. The courtyard is available and free.',
   slots:[slot('CAMERA',[yes('Basic camera package — £400',{cost:400}),yes('Premium camera package — £650',{cost:650})]),slot('SOUND',[yes('Sound recorder — £200',{cost:200}),yes('Sound operator — £350',{cost:350})]),slot('LOCATION',[yes('Courtyard — free',{cost:0}),yes('Hire a studio — £400',{cost:400})])],
   result:'Camera, sound and location booked within the shoot budget.'},
  {id:'production-schedule',title:'Put the shoot in order',output:'YOUR PRODUCTION SCHEDULE',action:'LOCK SCHEDULE',kind:'live',label:'SHOOT READY',
   context:'The ad must be ready tonight. Put the work in an order that makes it possible.',
   slots:[slot('FIRST',[yes('Confirm crew and location.'),no('Film the ad.','Confirm people and the location before you start filming.'),no('Edit and export.','You need footage before you can edit it.')]),slot('THEN',[yes('Film the ad.'),no('Send the finished film.','You have not filmed and edited it yet.')]),slot('FINALLY',[yes('Edit, check and export the film.'),no('Start looking for a location.','The location needs to be ready before the shoot.')])],
   result:'Crew and location confirmed → film → edit, check and export.'},
  {id:'production-backup',title:'Rescue a cancelled location',output:'YOUR BACKUP PLAN',action:'DEPLOY PLAN',kind:'live',label:'LAUNCH SAVED',
   context:'Rain has flooded the outdoor location. Doors open in an hour. A booked indoor room is five minutes away.',
   slots:[slot('THE SPACE',[yes('Move to the booked indoor room.'),no('Wait outside and hope it dries.','There is a usable indoor backup and only an hour left.')]),slot('THE PEOPLE',[yes('Send the new address and timings to the whole crew.'),no('Move the kit without telling anyone.','People need to know where and when they are needed.')]),slot('BEFORE DOORS OPEN',[yes('Test power and sound, then check the space is ready.'),no('Open the doors and test everything afterwards.','Check the practical essentials before people arrive.')])],
   result:'Indoor backup ready; crew updated; power and sound tested.'}
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
