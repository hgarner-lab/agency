import {cast,missions,reaction} from './story.js';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function character(index,extra='',label=''){
 const i=Number.isInteger(index)&&index>=0&&index<=3?index:0;
 return `<div class="character character-${i} ${extra}" role="img" aria-label="${escape(label||cast[i].name)}" style="--character:${i};--character-color:${cast[i].color}"></div>`;
}
export function selector(selected){return `<div class="character-select" role="group" aria-label="Choose your playable character">${cast.slice(0,3).map((c,i)=>`<button type="button" class="character-pick ${selected===i?'selected':''}" data-action="character" data-value="${i}" aria-pressed="${selected===i}" aria-label="${['Lime','Purple','Teal'][i]} look">${character(i,'',['Lime','Purple','Teal'][i]+' look')}<span class="pick-name">${['LIME','PURPLE','TEAL'][i]}</span><span class="pick-check">${selected===i?'✓':'+'}</span></button>`).join('')}</div>`;}
export function worldHUD(world){if(!world)return '';return `<div class="world-hud" aria-label="Shared fictional launch status"><div class="world-status"><span class="dot"></span><span id="world-status">${escape(world.status)}</span><small>LAUNCH STATUS / GAME METERS</small></div>${[['heat','ONLINE BACKLASH','#ff985c'],['trust','SOL’S TRUST','#b7a1ff'],['momentum','LAUNCH PROGRESS','#c6ff40']].map(([key,label,color])=>`<div class="world-meter" style="--meter-color:${color}"><div><span>${label}<small class="meter-direction">${key==='heat'?'LOWER IS BETTER':'HIGHER IS BETTER'}</small></span><b><span id="world-${key}">${world[key]}</span><small class="meter-scale">/100</small></b></div><div class="world-meter-track"><span id="world-bar-${key}" style="width:${world[key]}%"></span></div></div>`).join('')}</div>`;}
export function updateWorld(world){if(!world)return;for(const key of ['heat','trust','momentum']){const n=document.getElementById('world-'+key),b=document.getElementById('world-bar-'+key);if(n)n.textContent=world[key];if(b)b.style.width=world[key]+'%'}const s=document.getElementById('world-status');if(s)s.textContent=world.status;}
export function storyScene(state,characterIndex,alias,stage=false){
 const m=missions[state.round];let own=state.ownAnswer;
 if(!own&&state.phase==='closed'&&state.responded){
  if(state.round===0||state.round===3){const max=Math.max(...state.tallies),winners=state.tallies.map((v,i)=>v===max?i:-1).filter(i=>i>=0);if(winners.length===1)own={choice:winners[0]};}
  else if(state.round===2)own={value:state.average};else own={text:'approved pitch'};
 }
 const beat=state.phase==='closed'||state.submitted?reaction(state.round,own):null;
 const speaker=beat?.speaker??m.speaker;let line=beat?.line??m.line;
 const first=state.campaign?.history?.find(h=>h.round===0)?.choice;
 if(!beat&&state.round===1&&first!==undefined&&first!==null)line=[
  'The comments say customers feel disrespected. What could we do at the launch to show we’ve listened?',
  'The Walking Wallet design is getting attention. Some customers are still angry. What campaign idea could win their trust back?',
  'Sol’s apology is out. Now we need a campaign idea that shows customers the brand will treat them better.',
  'The planned posts are paused. We’ve bought some time. What could the brand do to win customers back?'
 ][first];
 if(!beat&&state.round===2&&state.campaign?.trust>=60)line='You’ve earned my trust. I’ll back a surprise public event in London. How much of the £100k should go towards it?';
 const gamble=state.campaign?.history?.find(h=>h.round===2)?.choice;
 if(!beat&&state.round===3&&gamble>=75)line='You backed a big public event. Now the venue has cancelled and our social media creator is late. Which job will you take?';
 // The foreground character is always the player's selected identity. Other faces are the cast.
 const player=Number.isInteger(characterIndex)?characterIndex:0;
 const companion=speaker===player?(player===1?2:1):speaker;
 return `<section class="story-scene scene-${state.round} ${state.submitted?'mission-committed':''} ${state.phase==='closed'?'mission-resolved':''}" aria-label="${escape(m.location)}"><div class="scene-skyline" aria-hidden="true"></div><div class="scene-window" aria-hidden="true"></div><div class="scene-screen" aria-hidden="true">${state.round===0?'THE CLIP IS EVERYWHERE':state.round===1?'NOT ANOTHER APOLOGY VIDEO':state.round===2?'£100,000 / YOUR CALL':'DOORS OPEN IN SIX HOURS'}</div><div class="scene-floor" aria-hidden="true"></div><div class="scene-prop" aria-hidden="true">${['UNDERGROUND®','THE IDEA WALL','LDN / E1','UNDERGROUND®'][state.round]}</div><div class="scene-location mono"><span class="dot"></span>${escape(m.location)}<span>${m.clock}</span></div>
 <div class="scene-player">${character(player,'actor player-actor'+(state.submitted||state.phase==='closed'&&state.responded?' reacting':''))}<div class="actor-name"><b>${escape(stage?'YOUR TEAM':alias||'YOU')}</b><span>${stage?'PLAYING TOGETHER':cast[player].name+' / YOU'}</span></div></div>
 <div class="scene-companion">${character(companion,'actor companion-actor'+(beat&&companion!==3||state.phase==='closed'&&state.round===3?' reacting':''))}<div class="actor-name"><b>${cast[companion].name}</b><span>${companion===3?'YOUR CLIENT':'YOUR TEAM'}</span></div></div>
 <div class="dialogue-bubble" style="--speaker-color:${cast[speaker].color}"><span class="dialogue-name">${cast[speaker].name} <small>${speaker===3?'YOUR CLIENT':'TEAM CHAT'}</small></span><p>${escape(line)}</p></div>
 ${state.phase==='closed'?'<div class="scene-complete"><span>✓</span> MISSION CLOSED</div>':state.submitted?'<div class="scene-complete"><span>✓</span> DECISION SAVED</div>':''}
 <div class="scene-objective"><span>${state.phase==='closed'?'MISSION COMPLETE':'YOUR TASK'}</span><strong>${escape(m.objective)}</strong></div></section>`;
}
export function missionPath(round,phase){return `<div class="mission-path" aria-label="Story progression">${missions.map((m,i)=>`<div class="path-stop ${i===round?'current':''} ${i<round||(i===round&&phase==='closed')?'complete':''}"><span>${i<round||(i===round&&phase==='closed')?'✓':'0'+(i+1)}</span><b>${['AGENCY','CREATIVE FLOOR','ROOFTOP','LAUNCH SITE'][i]}</b></div>`).join('')}</div>`;}
export function kitUI(kit,compact=false){return `<div class="kit-panel ${compact?'compact':''}"><div class="eyebrow">YOUR MISSION ITEMS / ${kit?.length||0} OF 4 COLLECTED</div><p class="kit-help">Collect one keepsake each time you submit a decision.</p><div class="kit-items">${[0,1,2,3].map(i=>{const item=kit?.find(k=>k.round===i);return `<div class="kit-item ${item?'unlocked':'locked'}"><span>${item?item.icon:'?'}</span><b>${item?escape(item.name):'MISSION '+(i+1)}</b></div>`}).join('')}</div></div>`;}
