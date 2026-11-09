// Plain-English wording for the in-game decisions, written for 16-18 year olds.
// The task rules (which options work, budgets, outputs) stay in agency-tasks.js.
// Each task gets a short scenario and one plain question per part. Each option can
// carry a short line shown straight after the tap: why it works, or a nudge.
export const TASK_COPY={
 'strategy-insight':{
  scene:'Jamie’s trainers cost £160. Your research shows what’s stopping people buying their first pair.',
  ask:['What’s actually stopping people?','What do they need to feel before buying?','So what should the campaign do?'],
  good:['That’s it. It’s a trust problem.','Yes. They need proof it’s worth it.','Nailed it. Show the quality.']},
 'strategy-brief':{
  scene:'Creative need a brief before they can start. Tell them who it’s for, what the problem is and what should change.',
  ask:['Who is the campaign for?','What’s their problem?','What should the campaign change?'],
  good:['Specific. Creative can picture them.','Yes, that’s the gap UNDERGROUND fills.','Clear goal. Creative can run with that.']},
 'strategy-direction':{
  scene:'86 out of 100 people already know about the launch. Most still don’t trust a new brand.',
  ask:['What do you fix first?','What proof do you show?','How will you know it worked?'],
  good:['Right. They know it exists. Trust is the gap.','Real proof beats big claims.','Good. Measure trust, not just views.']},
 'creative-concept':{
  scene:'The brief: help students show their own style. Use local people and make one clear promise.',
  ask:['What’s the promise to students?','What’s the big idea?','Pick the headline.'],
  good:['On brief. It’s about their style.','Good idea. It shows the promise in action.','Strong headline.']},
 'creative-feedback':{
  scene:'Your draft ad just says “Something big. Soon.” Jamie says nobody will know what it is or where to get it.',
  ask:['What should the ad actually say?','What detail do people need?','Pick a clearer headline.'],
  good:['Clear. Now people know what it is.','Useful. They know when and where.','Better. Clear and short.']},
 'creative-experience':{
  scene:'Plan something fun at Saturday’s pop-up that lets people show their own style.',
  ask:['What’s the activity?','Why would people bother?','How do you make it better?'],
  good:['Fun, and on brief.','Yes. Start with what’s in it for them.','Good. Easier to join means more people.']},
 'account-scope':{
  scene:'Jamie wants six films and a poster today. You’ve got £2,000 and one editor. Work out a deal the team can actually deliver.',
  ask:['What can the team deliver today?','What about the other films?','How do you lock it in?'],
  good:['Realistic. The team can do that.','Fair. Jamie still gets them, just later.','Good. Everyone knows the deal.']},
 'account-change':{
  scene:'Thirty minutes before launch, Jamie wants a new logo on everything. The team needs a clear decision, fast.',
  ask:['What do you do first?','What do you suggest?','How do you finish it off?'],
  good:['Smart. Check the impact before saying yes.','Good. A clear priority the team can act on.','Sorted. Everyone’s on the same page.']},
 'account-handover':{
  scene:'Jamie says “make it more London”, and the price and launch date must stay clear. Turn that into instructions the team can use.',
  ask:['What must stay in?','How do you pin down “more London”?','How do you pass it on?'],
  good:['Right. Jamie asked for those.','Smart. Show examples instead of guessing.','Clear handover. No confusion.']},
 'production-budget':{
  scene:'Book a camera, sound and a place to film. You’ve got £900. The courtyard is free.',
  ask:['Which camera?','Which sound?','Where do you film?'],
  good:['Booked.','Booked.','Booked.']},
 'production-schedule':{
  scene:'The ad has to be ready tonight. Put the jobs in an order that actually works.',
  ask:['What happens first?','Then what?','And last?'],
  good:['Right. Sort people and place first.','Yes. Now you can film.','Done. Edit, check, send.']},
 'production-backup':{
  scene:'Rain has flooded the outdoor spot. Doors open in an hour. There’s a booked indoor room five minutes away.',
  ask:['Where does the launch go?','Who needs to know?','What do you check before doors open?'],
  good:['Quick thinking. Use the backup.','Yes. Nobody turns up at the wrong place.','Good. No nasty surprises.']},
 'strategy-audience':{
  scene:'Three groups liked the teaser post. You can only go after one first.',
  ask:['Who do you target first?','Why them?','Where do you reach them?'],
  good:['Smart. They already care about creators.','Yes. They’re more likely to buy.','Good. Meet them where they already are.']},
 'strategy-comments':{
  scene:'The teaser video got 400 comments. Work out what people are really saying.',
  ask:['What comes up most?','What does that tell you?','What do you tell the team?'],
  good:['That’s the one that matters.','Exactly. They like it but doubt the price.','Clear direction. Prove the value.']},
 'creative-social':{
  scene:'Make a short video for the launch. People scroll fast, so the first second matters.',
  ask:['How does it open?','Who’s in it?','Pick the caption.'],
  good:['Stops the scroll.','Real people, real trust.','Short and punchy.']},
 'creative-poster':{
  scene:'The poster goes up near colleges. It has to work for someone walking past.',
  ask:['What’s the picture?','What words go on it?','Pick the headline.'],
  good:['Bold and simple.','Short enough to read on the move.','Clear. People know when to come.']},
 'account-feedback':{
  scene:'Jamie hates the first ad: “It doesn’t feel like us.” Nova needs useful notes, not just “Jamie hates it”.',
  ask:['What do you ask Jamie?','How do you pass it on to Nova?','How do you keep it fair?'],
  good:['Good. Get the detail.','Useful notes Nova can work with.','Nice. Good news helps the bad news land.']},
 'account-budget':{
  scene:'Jamie has cut the budget from £10,000 to £7,000. The plan has to change.',
  ask:['What do you do first?','What do you suggest cutting?','How do you lock it in?'],
  good:['Smart. Protect what matters to the client.','Honest and realistic.','Sorted. Jamie approves the money.']},
 'production-popup':{
  scene:'The pop-up opens Saturday at 10am. Get the shop ready.',
  ask:['What sizes do you stock?','How do you handle the queue?','How do people pay?'],
  good:['Everyone can try a pair.','Safe and organised.','Sorted. Nobody gets turned away at the till.']},
 'production-crew':{
  scene:'Your camera operator is ill on shoot day. Filming starts in two hours.',
  ask:['What do you do first?','How do you get them ready?','Who else needs to know?'],
  good:['Quick thinking. Always have a backup.','Good. They know exactly what to film.','Right. No surprises for anyone.']}
};
// Short, friendly nudges for wrong picks. The full reason stays in agency-tasks.js.
export function nudge(why){return why?'Not quite. '+why+' Try again.':'';}
