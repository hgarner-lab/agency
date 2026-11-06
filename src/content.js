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
 {key:'account',name:'THE BOSS',job:'ACCOUNT MANAGEMENT',symbol:'↗',color:'#ff8d69',line:'YOU BRING PEOPLE TOGETHER.',description:'Your choices focused on the client, the budget and getting people to agree. In an agency, account managers work with the client and the team to keep a campaign on track.',skill:'Working with people',partner:'The Mastermind'},
 {key:'production',name:'THE FIXER',job:'PRODUCTION',symbol:'⊞',color:'#68dce9',line:'YOU GET IDEAS MADE.',description:'Your choices focused on solving practical problems and getting things done. In an agency, producers organise the people, time, equipment and places needed to make a campaign happen.',skill:'Solving practical problems',partner:'The Boss'}
];
