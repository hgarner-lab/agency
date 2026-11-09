export const rounds = [
  { tag: '01 / THE LEAKED VIDEO', title: 'SOL’S VIDEO HAS LEAKED.', kind: 'choice', duration: 240,
    brief: 'Sol runs UNDERGROUND, a trainer brand. A leaked video shows him calling his customers “walking wallets”. People are angry, and his £160 trainers launch in 48 hours.',
    question: 'What should your team do first?',
    options: [
      {label:'Read the comments to understand why people are angry.',sub:'Find out what customers want Sol to change.',outcome:'You read the comments. Customers want Sol to respect them, so the team now has a clear problem to solve.'},
      {label:'Turn “walking wallets” into a limited-edition trainer design.',sub:'Use the insult to get people talking about the product.',outcome:'The Walking Wallet design gets people talking. Some love the joke; others think Sol is still laughing at his customers.'},
      {label:'Ask Sol to record an honest apology.',sub:'Get him to explain what happened and take responsibility.',outcome:'Sol apologises on camera. Some customers are ready to listen again. The launch now needs to show he means it.'},
      {label:'Pause the brand’s planned social posts.',sub:'Stop cheerful launch posts appearing during the backlash.',outcome:'You stop six planned posts, including “we love our fans”. The team has time to agree what to say next.'}
    ]},
  { tag: '02 / THE COMEBACK IDEA', title: 'WIN THE CUSTOMERS BACK.', kind: 'text', duration: 300,
    brief:'Sol is staying with your agency. There’s £100k left for the launch. Your team needs an idea that gives customers a reason to trust the brand and want the trainers again.',
    question:'What could the brand do to win customers back? Write one sentence.',
    lenses:['Find out what customers really want.','Create something that gets attention.','Let customers help shape the launch.','Build something simple and useful.'] },
  { tag: '03 / THE LAUNCH BUDGET', title: 'PLAN THE LAUNCH BUDGET.', kind: 'slider', duration: 300,
    brief:'The team is considering a surprise public event in London. It could reach more people, but it will be harder to organise. The safer option is a smaller, planned launch.',
    question:'What share of the £100k goes on the surprise public event?',
    low:'NO PUBLIC EVENT',high:'ALL ON THE EVENT',
    outcomes:['You put most of the budget into the smaller, planned launch. There’s less to organise, but fewer chances to reach a big crowd.','You split the budget between the surprise event and the planned launch. The team now has to make both parts work.','You put most of the budget into the surprise event. It could reach a big crowd, but the team has more to organise before launch.']},
  { tag: '04 / LAUNCH DAY', title: 'SIX HOURS. THREE PROBLEMS.', kind: 'choice', duration: 360,
    brief:'Six hours before launch, the venue cancels, your social media creator is late and Sol asks for another change to the campaign. The team needs you to take on one job.',
    question:'Which job will you take on first?',
    options:[
      {label:'Decide the one message the launch needs to communicate.',sub:'Help everyone focus on the same goal.',outcome:'You give the team one clear message to work towards. They stop debating the details and get back to preparing the launch.'},
      {label:'Change the event idea to work with the problems you have.',sub:'Turn the unexpected situation into part of the campaign.',outcome:'You adapt the idea to the new situation. The team has a campaign it can still deliver, even though the original plan has changed.'},
      {label:'Agree the final plan with Sol and stop further changes.',sub:'Get the client’s approval so the team can finish the work.',outcome:'Sol agrees to the final plan. With no more changes coming, the team can finish preparing the launch.'},
      {label:'Find a replacement venue and get the team there.',sub:'Sort the space, transport and equipment.',outcome:'You find a new venue and get the team and equipment there. The doors open on time.'}
    ]}
];
export const roles = [
 {key:'strategy',name:'THE MASTERMIND',job:'STRATEGY',symbol:'◎',color:'#c6ff40',line:'YOU FIND OUT WHAT PEOPLE NEED.',description:'Your choices focused on understanding people and deciding what matters. In an agency, strategists research customers and help the team choose a clear direction for the campaign.',skill:'Understanding people',partner:'The Instigator'},
 {key:'creative',name:'THE INSTIGATOR',job:'CREATIVE',symbol:'✳',color:'#b7a1ff',line:'YOU CREATE IDEAS PEOPLE NOTICE.',description:'Your choices focused on ideas that get people’s attention. In an agency, creatives turn the plan into words, designs, films and experiences that people remember.',skill:'Coming up with ideas',partner:'The Fixer'},
 {key:'account',name:'THE CONNECTOR',job:'ACCOUNT MANAGEMENT',symbol:'↗',color:'#ff8d69',line:'YOU BRING PEOPLE TOGETHER.',description:'Your choices focused on the client, the budget and getting people to agree. In an agency, account managers work with the client and the team to keep a campaign on track.',skill:'Working with people',partner:'The Mastermind'},
 {key:'production',name:'THE FIXER',job:'PRODUCTION',symbol:'⊞',color:'#68dce9',line:'YOU GET IDEAS MADE.',description:'Your choices focused on solving practical problems and getting things done. In an agency, producers organise the people, time, equipment and places needed to make a campaign happen.',skill:'Solving practical problems',partner:'The Connector'}
];

// How people get into agency jobs, shown under the deeper role slide.
export const waysIn='Ways in: apprenticeships, entry-level jobs and graduate schemes. Agencies hire people from lots of different backgrounds.';

// Shared by the phone reveal and the facilitator's closing screen.
export const roleLessons = {
 strategy: {
  voice:'I find out what people actually think. I read the comments, talk to real customers, then tell the team the one thing the ad needs to say.',loveIf:'you’re always asking “but why?” and you notice what people mean, not just what they say.',skills:['Curious', 'Good listener', 'Spots patterns'],startAs:'Junior strategist',
  title:'Strategy',crew:0,
  oneLiner:'Works out what people actually want, so the campaign lands.',
  day:['Digging through comments, data and trends.','Talking to real customers.','Writing the one-page plan the whole team follows.'],
  into:['You always ask “but why?”','You notice what people mean, not just what they say.','You like spotting patterns.'],
  titles:['Strategist','Planner','Insight executive'],
  does:'Find out what people want and help the team decide what the campaign should say.',
  example:'For a trainer launch: find out why people would choose these trainers, then give the team one clear direction.',
  habits:['Ask good questions and listen to the answers.','Use evidence to check your assumptions.','Turn what you learn into a clear plan.']
 },
 creative: {
  voice:'I come up with the idea and make it real. Some days it’s writing lines, some days it’s designing or editing a film. Most ideas get binned. That’s normal.',loveIf:'you’re always making stuff: edits, drawings, memes, playlists.',skills:['Imaginative', 'Takes feedback', 'Keeps going'],startAs:'Junior copywriter or designer',
  title:'Creative',crew:1,
  oneLiner:'Comes up with the idea, then makes it look and sound good.',
  day:['Throwing ideas around with a partner.','Writing lines, sketching or editing video.','Getting feedback and making it better.'],
  into:['You’re always making stuff: edits, drawings, memes.','You have loads of ideas, even the bad ones.','You can take feedback and keep going.'],
  titles:['Copywriter','Art director','Designer','Video editor'],
  does:'Turn the plan into ideas people notice: the words, designs, films and experiences.',
  example:'For a trainer launch: come up with the ad, the headline and the look of the campaign.',
  habits:['Explore several ideas before choosing one.','Make the idea easy to understand.','Use feedback to make the work better.']
 },
 account: {
  voice:'I’m the link between the client and the team. I make sure we know exactly what Jamie wants, what it costs and when it’s due, and I sort it when plans change.',loveIf:'you’re the one who sorts out the group plans and you can talk to anyone.',skills:['Calm', 'Organised', 'Good with people'],startAs:'Account executive',
  title:'Account management',crew:3,
  oneLiner:'Keeps the client happy and the team on track.',
  day:['Calls and meetings with the client.','Turning what the client wants into a clear brief.','Keeping an eye on money and deadlines.'],
  into:['You’re the one who sorts out the group plans.','You can talk to anyone.','You stay calm when things go wrong.'],
  titles:['Account executive','Account manager','Client services'],
  does:'Work with the client and the agency team so everyone knows what is needed, agreed and due.',
  example:'For a trainer launch: agree the work, budget and dates, then keep the client and team updated.',
  habits:['Listen carefully and ask when something is unclear.','Be clear about costs, decisions and deadlines.','Flag problems early and help agree a solution.']
 },
 production: {
  voice:'I make the idea actually happen. I book the crew, the kit and the location, keep it on budget, and fix whatever breaks on the day.',loveIf:'you like sorting out details and you stay cool when things go wrong.',skills:['Practical', 'Quick thinker', 'Gets it done'],startAs:'Production assistant',
  title:'Production',crew:2,
  oneLiner:'Makes it actually happen, on time and on budget.',
  day:['Booking shoots, crews and locations.','Building schedules and budgets.','Fixing problems on the day.'],
  into:['You like sorting out the details.','You’re good in a crisis.','You like seeing a real thing get made.'],
  titles:['Producer','Project manager','Production assistant'],
  does:'Organise the people, time, places and equipment that turn an idea into finished work.',
  example:'For a trainer launch: book the shoot, organise the crew and make sure the ad is ready on time.',
  habits:['Break a big job into clear steps.','Spot practical problems and make a backup plan.','Pay attention to details and follow through.']
 }
};
