import {ugSymbol} from './underground-brand.js';
import {MAP_W,MAP_H,TILE,JOBS,FURNITURE,areaAt,wallAt,availablePickups,nearbyJob,PICKUPS,nextInstruction,guidancePath} from './arcade-world.js';
const PIXEL_FONT={A:'01110100011000111111100011000110001',B:'11110100011000111110100011000111110',C:'01111100001000010000100001000001111',D:'11110100011000110001100011000111110',E:'11111100001000011110100001000011111',F:'11111100001000011110100001000010000',G:'01111100001000010111100011000101111',H:'10001100011000111111100011000110001',I:'11111001000010000100001000010011111',J:'00111000100001000010000101001001100',K:'10001100101010011000101001001010001',L:'10000100001000010000100001000011111',M:'10001110111010110101100011000110001',N:'10001110011010110011100011000110001',O:'01110100011000110001100011000101110',P:'11110100011000111110100001000010000',Q:'01110100011000110001101011001001101',R:'11110100011000111110101001001010001',S:'01111100001000001110000010000111110',T:'11111001000010000100001000010000100',U:'10001100011000110001100011000101110',V:'10001100011000110001100010101000100',W:'10001100011000110101101011101110001',X:'10001100010101000100010101000110001',Y:'10001100010101000100001000010000100',Z:'11111000010001000100010001000011111','0':'01110100011001110101110011000101110','1':'00100011000010000100001000010001110','2':'01110100010000100010001000100011111','3':'11110000010000101110000010000111110','4':'00010001100101010010111110001000010','5':'11111100001000011110000010000111110','6':'01110100001000011110100011000101110','7':'11111000010001000100010000100001000','8':'01110100011000101110100011000101110','9':'01110100011000101111000010000101110','!':'00100001000010000100001000000000100','?':'01110100010000100010001000000000100','+':'00000001000010011111001000010000000','/':'00001000100001000100010000100010000','-':'00000000000000011111000000000000000','.':'00000000000000000000000000000000100',':':'00000001000010000000001000010000000',' ':'00000000000000000000000000000000000'};
export function pixelText(ctx,text,x,y,colour='#f5f0d9',size=1,align='left'){
 text=String(text).toUpperCase();const width=text.length*6*size;if(align==='center')x-=Math.floor(width/2);if(align==='right')x-=width;ctx.fillStyle=colour;
 for(let n=0;n<text.length;n++){const bits=PIXEL_FONT[text[n]]||PIXEL_FONT['?'];for(let i=0;i<35;i++)if(bits[i]==='1')ctx.fillRect(Math.floor(x+n*6*size+i%5*size),Math.floor(y+Math.floor(i/5)*size),size,size);}
}
export function drawPixelPerson(c,x,y,character=0,frame=0,face='down'){
 x=Math.round(x);y=Math.round(y);const colours=[['#9b5c35','#b7e56b','#263440','#303543'],['#bb774b','#aa84dc','#302d47','#9261bb'],['#efb27c','#69c8ca','#283640','#418e96'],['#d58e55','#ee984e','#252d32','#242b31']][character];
 const [skin,coat,trousers,hair]=colours;const r=(dx,dy,w,h,col)=>{c.fillStyle=col;c.fillRect(x+dx,y+dy,w,h)};
 r(3,18,11,2,'#14282b55');r(3,8,11,8,'#18252d');r(4,8,9,7,coat);r(2,9,2,6,skin);r(13,9,2,6,skin);r(5,15,3,4,trousers);r(10,15,3,4,trousers);
 const walk=frame%2;r(4,18-walk,4,2,'#eef0cf');r(10,17+walk,4,2,'#eef0cf');r(5,18-walk,2,1,coat);r(11,17+walk,2,1,coat);
 r(4,1,9,7,'#18252d');r(5,2,7,6,skin);r(4,0,9,3,hair);r(3,2,2,2,hair);
 if(character===0){r(4,1,9,2,'#383f4a');r(5,3,7,1,'#202936');r(6,12,2,2,'#2d4635');r(10,12,2,2,'#2d4635');r(8,8,1,6,'#26352c');}
 if(character===1){r(4,0,3,1,'#c5a0fa');r(3,3,3,4,hair);r(4,5,1,3,hair);r(6,10,6,2,'#66408a');r(9,8,3,1,'#d8b9f6');}
 if(character===2){r(4,0,9,3,'#4b9caa');r(2,2,5,1,'#77d6d4');r(5,10,2,3,'#276c78');r(10,10,2,3,'#276c78');r(8,8,1,7,'#18252d');}
 if(character===3){r(4,0,8,2,'#20252f');r(5,-1,3,1,'#20252f');r(7,9,3,5,'#252d32');r(7,9,3,1,'#e4d1b3');}
 if(face!=='up'){r(face==='left'?5:6,4,1,1,'#1f2830');r(face==='right'?11:10,4,1,1,'#1f2830');r(8,6,2,1,'#91502f');}else r(5,2,7,4,hair);
}
export function drawPickup(c,p,x,y,now){
 const bob=Math.round(Math.sin(now/230+p.x)*1.3),col=JOBS[p.type].colour;x=Math.round(x);y=Math.round(y+bob);
 c.fillStyle='#172b3555';c.fillRect(x+2,y+12-bob,12,3);
 if(p.icon==='clue'){c.fillStyle='#233b31';c.fillRect(x+3,y+1,10,12);c.fillStyle=col;c.fillRect(x+4,y+1,8,10);c.fillStyle='#eef8c7';c.fillRect(x+5,y+3,5,1);c.fillRect(x+5,y+6,5,1);c.fillRect(x+5,y+8,3,1);}
 else if(p.icon==='paint'){c.fillStyle='#2e3641';c.fillRect(x+3,y+3,10,10);c.fillStyle=p.value;c.fillRect(x+4,y+5,8,7);c.fillStyle='#eee6d7';c.fillRect(x+3,y+3,10,2);c.fillStyle='#7b8490';c.fillRect(x+2,y+5,1,5);c.fillRect(x+13,y+5,1,5);}
 else if(p.icon==='word'){c.fillStyle='#57486d';c.fillRect(x+1,y+2,14,11);c.fillStyle='#ecddff';c.fillRect(x+2,y+2,12,9);pixelText(c,p.id==='word-us'?'US':'U',x+8,y+3,'#68508f',1,'center');}
 else if(p.icon==='spanner'){c.fillStyle='#2b6170';c.fillRect(x+6,y+5,4,9);c.fillStyle='#bce9e9';c.fillRect(x+6,y+4,3,9);c.fillRect(x+3,y+2,3,4);c.fillRect(x+10,y+1,3,5);c.fillRect(x+4,y+5,7,3);}
 else if(p.icon==='battery'){c.fillStyle='#27363a';c.fillRect(x+2,y+3,12,9);c.fillRect(x+14,y+5,1,4);c.fillStyle='#e2ed85';c.fillRect(x+3,y+4,9,7);c.fillStyle='#68764c';c.fillRect(x+6,y+6,1,3);c.fillRect(x+5,y+7,3,1);}
}
// The help and bag use the exact same sprites as the map.
export function drawGameIcon(canvas,kind){
 const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,24,24);
 if(kind.startsWith('player-')){drawPixelPerson(c,3,2,Number(kind.slice(7)));return;}
 if(kind==='brief'){c.fillStyle='#ffb26e';c.fillRect(3,6,18,12);c.fillStyle='#724e36';for(let i=0;i<8;i++)c.fillRect(4+i,7+Math.min(i,7-i),1,1);return;}
 const item=PICKUPS.find(p=>p.icon===kind);if(item)drawPickup(c,item,4,5,0);
}
function arcadeFurniture(c,f){const [tx,ty,kind]=f,x=tx*TILE,y=ty*TILE;const r=(dx,dy,w,h,col)=>{c.fillStyle=col;c.fillRect(x+dx,y+dy,w,h)};
 if(kind==='plant'){r(3,10,10,5,'#a06e4c');r(4,14,8,2,'#735741');r(6,1,4,12,'#51946d');r(2,4,6,6,'#71ad77');r(9,2,5,7,'#8bbb7c');}
 if(kind==='desk'||kind==='screen'){r(1,3,15,12,'#5f574b');r(0,1,16,10,'#bda580');r(0,1,16,2,'#dfc8a4');r(2,11,2,5,'#5c544a');r(12,11,2,5,'#5c544a');if(kind==='screen'){r(3,-3,10,8,'#293946');r(4,-2,8,5,'#91c3be');r(5,-1,5,1,'#d0e6cb');r(7,5,2,2,'#33434b');r(3,8,9,1,'#e0d3bd');}else{r(5,4,8,4,'#f0e7d2');r(6,5,4,1,'#a19a87');}}
 if(kind==='shelf'){r(1,0,14,16,'#866e50');for(let i=0;i<3;i++){r(2,1+i*5,12,3,'#483e35');r(3,1+i*5,3,3,['#8faf96','#c29a74','#ac9fc5'][i]);r(8,1+i*5,4,3,'#c7baa0');}}
 if(kind==='sofa'){r(0,4,16,11,'#b2785b');r(1,1,14,10,'#cf9876');r(2,5,12,6,'#dbaa8b');r(7,5,1,6,'#b17f65');r(0,5,3,9,'#b27b60');r(13,5,3,9,'#b27b60');}
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function wrap(text,max){const out=[];let line='';for(const w of String(text).split(' ')){if(line&&(line+' '+w).length>max){out.push(line);line=w}else line=line?line+' '+w:w}if(line)out.push(line);return out;}
const lines=(list,x,y,size,gap,fill,anchor='middle',weight='bold')=>list.map((l,i)=>`<text x="${x}" y="${y+i*gap}" text-anchor="${anchor}" font-family="monospace" font-weight="${weight}" font-size="${size}" fill="${fill}">${esc(l)}</text>`).join('');
// Ads show the real UNDERGROUND trainer, in a colourway that stands out from the background.
// Round sticker the player can slap on their ad.
function adSticker(p,x,y){if(!p?.sticker)return '';const t=esc(p.sticker),small=t.length>4;return `<g transform="rotate(-12 ${x} ${y})"><circle cx="${x}" cy="${y}" r="15" fill="#ff5b5b" stroke="#233139" stroke-width="1.5"/><text x="${x}" y="${y+(small?2:3)}" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="${small?6.5:9}" fill="#fff">${t}</text></g>`;}
function adShoe(p,bg,place){if(Number.isInteger(p?.shoe)&&COLOURWAYS[p.shoe])return trainerSVG(COLOURWAYS[p.shoe],'UNDERGROUND trainer',place);const lime=/^#(b|c)[0-9a-f]ef/i.test(bg)||bg==='#bbef66',pick=lime?['lilac','sunset','teal']:['lime','teal','sunset'],n=(String(p?.title||'').length+(p?.pattern||0))%3;return trainerSVG(COLOURWAYS.find(c=>c.id===pick[n]),'UNDERGROUND trainer',place);}
// One square-ish tile for every campaign piece: ads, insights, approvals and go-lives.
export function posterSVG(p){
 const kind=p?.kind||'ad',ink='#233139';
 const frame=(bg,label,body)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 148" role="img" aria-label="${esc(label)}"><rect width="120" height="148" fill="${bg}"/>${body}</svg>`;
 if(p?.lines&&kind!=='ad'){
  const colours={insight:['#e4f2be','#496726'],approval:['#ffe0bf','#98552f'],live:['#c8ecec','#23555c']},[bg,accent]=colours[kind]||colours.insight;
  const copy=wrap(p.text,14).slice(0,7);
  return frame(bg,p.taskTitle+': '+p.text,`<rect x="7" y="7" width="106" height="134" fill="none" stroke="${accent}" stroke-width="2"/><text x="14" y="25" font-family="monospace" font-size="10" font-weight="bold" fill="${accent}">${esc(p.label)}</text><path d="M14 33h92" stroke="${accent}"/>${lines(copy,14,50,11,13.5,ink,'start')}<text x="14" y="132" font-family="monospace" font-size="6" fill="${accent}">UNDERGROUND / THE AGENCY</text>`);
 }
 if(kind==='insight'){const t=wrap(p.text,13);return frame('#d9f2a8','Customer insight: '+p.text,`<rect x="8" y="8" width="104" height="132" fill="#f7fbe9" stroke="${ink}" stroke-width="2"/><text x="16" y="24" font-family="monospace" font-size="8" font-weight="bold" fill="#5b7d2b">INSIGHT</text><text x="16" y="52" font-family="Georgia,serif" font-size="34" fill="#9cc65a">“</text>${lines(t,16,62,11,14,ink,'start')}<text x="16" y="132" font-family="monospace" font-size="6" fill="#5b7d2b">STRATEGY / UNDERGROUND</text>`);}
 if(kind==='approval'){const t=wrap(p.text,14);return frame('#ffd9b8','Client approved: '+p.text,`<rect x="8" y="8" width="104" height="132" fill="#fff6ec" stroke="${ink}" stroke-width="2"/><text x="16" y="24" font-family="monospace" font-size="8" font-weight="bold" fill="#b5532a">CLIENT SIGN-OFF</text>${lines(t,60,52,11,14,ink)}<g transform="rotate(-12 60 106)"><rect x="18" y="88" width="84" height="34" rx="4" fill="none" stroke="#e1572d" stroke-width="3"/><text x="60" y="111" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="15" fill="#e1572d">APPROVED</text></g>`);}
 if(kind==='live'){const t=wrap(p.text,14);return frame('#1d3a3e','Now live: '+p.text,`<circle cx="20" cy="22" r="5" fill="#ff5b5b"/><text x="30" y="26" font-family="monospace" font-weight="bold" font-size="11" fill="#ff8a8a">LIVE</text>${lines(t,60,62,12,15,'#e9fbfb')}<path d="M16 110h88" stroke="#79d8d8" stroke-width="2" stroke-dasharray="4 3"/><text x="60" y="130" text-anchor="middle" font-family="monospace" font-size="7" fill="#79d8d8">PRODUCTION / LAUNCH DAY</text>`);}
 const bg=p?.colour||'#bbef66',title=p?.title||'YOUR WAY',layout=(p?.pattern||0)%3;let t=wrap(title,9);if(t.length>2)t=wrap(title,12);const tag=esc(p?.tag||'');
 if(layout===1)return frame(ink,'Billboard ad: '+title,`${ugSymbol('x="6" y="4" width="23" height="13"')}<text x="34" y="13" font-family="monospace" font-size="6" font-weight="bold" fill="#f4efe1">UNDERGROUND</text><rect x="6" y="20" width="108" height="78" fill="${bg}"/>${lines(t,60,t.length>2?36:44,t.length>2?10:t.length>1?13:16,t.length>2?11:15,ink)}${adShoe(p,bg,'x="30" y="62" width="60" height="35"')}<path d="M30 98v34M90 98v34" stroke="#9aa7ab" stroke-width="4"/>${adSticker(p,98,84)}<text x="60" y="142" text-anchor="middle" font-family="monospace" font-size="6" fill="#cfd8da">${tag||'BILLBOARD / UNDERGROUND'}</text>`);
 if(layout===2)return frame('#f7f1d9','Social post ad: '+title,`<rect x="8" y="8" width="104" height="132" rx="8" fill="#fff" stroke="${ink}" stroke-width="2"/><rect x="13" y="12" width="16" height="16" rx="3" fill="${ink}"/>${ugSymbol('x="14" y="16" width="14" height="8"')}<text x="30" y="23" font-family="monospace" font-size="7" font-weight="bold" fill="${ink}">underground</text><rect x="14" y="32" width="92" height="74" fill="${bg}"/>${adShoe(p,bg,'x="22" y="58" width="76" height="44"')}${lines(t,60,t.length>2?42:48,t.length>2?8:t.length>1?10:12,t.length>2?8.5:11,ink)}<text x="16" y="120" font-family="monospace" font-size="9" fill="#e1572d">♥ 2.4k</text>${adSticker(p,94,94)}<text x="104" y="120" text-anchor="end" font-family="monospace" font-size="7" fill="#667">#stepin</text>${tag?`<text x="16" y="133" font-family="monospace" font-size="5.5" fill="${ink}">${tag}</text>`:''}`);
 return frame(bg,'Poster ad: '+title,`<rect width="120" height="18" fill="${ink}"/>${ugSymbol('x="8" y="2" width="25" height="14"')}<text x="40" y="12" font-family="monospace" font-size="7" font-weight="bold" fill="#f4efe1">UNDERGROUND</text><path d="M0 134h120" stroke="${ink}" stroke-width="2"/>${lines(t,60,t.length>2?28:t.length>1?32:38,t.length>2?11:t.length>1?14:17,t.length>2?12:16,ink)}${adShoe(p,bg,'x="6" y="58" width="108" height="62"')}${adSticker(p,100,108)}<text x="60" y="144" text-anchor="middle" font-family="monospace" font-size="6" fill="${ink}">${tag||'MADE BY THE CREW'}</text>`);
}
// The shared floor plan: rooms, walls, signs and the launch stand. Drawn once.
function buildBaseMap(){
 const map=document.createElement('canvas');map.width=MAP_W*TILE;map.height=MAP_H*TILE;const b=map.getContext('2d');b.imageSmoothingEnabled=false;
 for(let y=0;y<MAP_H;y++)for(let x=0;x<MAP_W;x++){
  const area=areaAt(x,y),colour=area>=0?['#c7c9a6','#c8bad0','#d0b99c','#afc4c1'][area]:'#b6bea7';
  b.fillStyle=colour;b.fillRect(x*TILE,y*TILE,TILE,TILE);b.fillStyle=area>=0?'#544c3e12':'#344f4215';b.fillRect(x*TILE,y*TILE,1,TILE);b.fillRect(x*TILE,y*TILE+15,TILE,1);
  if((x+y*3)%7===0){b.fillStyle='#f2ecd514';b.fillRect(x*TILE+5,y*TILE+5,4,1);}
  if(wallAt(x,y)){b.fillStyle='#243c3c';b.fillRect(x*TILE,y*TILE,TILE,TILE);b.fillStyle='#5a7166';b.fillRect(x*TILE,y*TILE,16,4);b.fillStyle='#3e5650';b.fillRect(x*TILE+1,y*TILE+5,14,9);b.fillStyle='#182d30';b.fillRect(x*TILE,y*TILE+14,16,2);}
 }
 for(const [i,x,y] of [[0,6,8],[1,26,9],[2,6,16],[3,26,16]]){const label=JOBS[i].name,w=label.length*6+10;b.fillStyle='#243b3c';b.fillRect(x*TILE-w/2,y*TILE,w,13);pixelText(b,label,x*TILE+1,y*TILE+3,JOBS[i].colour,1,'center');}
 // Corridor signs stay visible in the opening phone view.
 for(const [label,x,y,colour,up] of [[JOBS[0].name,11.5,11.25,JOBS[0].colour,true],[JOBS[1].name,22,11.25,JOBS[1].colour,true],[JOBS[2].name,11.5,14,JOBS[2].colour,false],[JOBS[3].name,22,14,JOBS[3].colour,false]]){
  const w=label.length*6+16,px=Math.round(x*TILE),py=Math.round(y*TILE);b.fillStyle='#334c48';b.fillRect(px-w/2,py,w,12);pixelText(b,label,px-3,py+3,colour,1,'center');b.fillStyle=colour;const ax=px+w/2-8;b.fillRect(ax,py+(up?3:7),1,1);b.fillRect(ax-1,py+(up?4:6),3,1);b.fillRect(ax-2,py+5,5,1);
 }
 // Public launch space in the centre of the floor.
 b.fillStyle='#445b53';b.fillRect(15*TILE+2,3*TILE,60,48);b.fillStyle='#e3d8b4';b.fillRect(15*TILE+5,3*TILE+3,54,41);pixelText(b,'UG',17*TILE,3*TILE+10,'#425849',2,'center');pixelText(b,'LAUNCH',17*TILE,3*TILE+30,'#425849',1,'center');
 return map;
}
export function createArcadeRenderer(canvas,fullMap=false){
 canvas.width=fullMap?MAP_W*TILE:288;canvas.height=fullMap?MAP_H*TILE:224;
 function resize(){const bounds=canvas.parentElement?.getBoundingClientRect?.();if(!fullMap&&bounds?.width>0&&bounds.height>0)canvas.height=Math.max(80,Math.min(MAP_H*TILE,Math.round(288*bounds.height/bounds.width)));}
 resize();
 const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;const map=buildBaseMap();
 const observer=!fullMap&&canvas.parentElement&&typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{resize();c.imageSmoothingEnabled=false;}):null;
 observer?.observe(canvas.parentElement);
 const reduceMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 let cx=0,cy=0,px=16*TILE,py=12*TILE,targetX=px,targetY=py,previousSteps=-1,previousCharacter=-1,particles=[],seenScore=0,seenInventory='',routeKey='',route=[];
 function draw(game,now,options={}){
  if(!game)return;const changedIdentity=previousCharacter!==game.character;if(changedIdentity){px=game.x*TILE;py=game.y*TILE;previousCharacter=game.character;}
  targetX=game.x*TILE;targetY=game.y*TILE;px+=(targetX-px)*.42;py+=(targetY-py)*.42;
  if(Math.abs(targetX-px)<.1)px=targetX;if(Math.abs(targetY-py)<.1)py=targetY;
  const desiredX=Math.max(0,Math.min(MAP_W*TILE-canvas.width,px-canvas.width/2+8)),desiredY=Math.max(0,Math.min(MAP_H*TILE-canvas.height,py-canvas.height/2+8));
  if(fullMap){cx=0;cy=0}else{cx+=(desiredX-cx)*.18;cy+=(desiredY-cy)*.18}
  const ox=Math.round(cx),oy=Math.round(cy);c.fillStyle='#243c3c';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(map,-ox,-oy);
  const step=!fullMap?nextInstruction(game,now):null,target=step?.target;
  if(target){
   const key=`${game.x},${game.y}/${target.x},${target.y}/${!!target.person}`;
   if(key!==routeKey){routeKey=key;route=guidancePath(game,target);}
   for(const p of route){const x=p.x*TILE-ox+7,y=p.y*TILE-oy+7;c.fillStyle='#19343b';c.fillRect(x-1,y-1,4,4);c.fillStyle='#fff3a5';c.fillRect(x,y,2,2);}
   const x=target.x*TILE-ox,y=target.y*TILE-oy-(target.person?7:0),height=target.person?25:20;
   c.fillStyle='#19343b';c.fillRect(x-4,y-4,24,2);c.fillRect(x-4,y+height,24,2);c.fillRect(x-4,y-4,2,height+6);c.fillRect(x+18,y-4,2,height+6);
   if(reduceMotion||Math.floor(now/400)%2===0){c.fillStyle='#fff3a5';for(const [dx,dy] of [[-3,-3],[14,-3],[-3,height-3],[14,height-3]]){c.fillRect(x+dx,y+dy,7,2);c.fillRect(x+dx,y+dy,2,5);}}
  }
  const visible=availablePickups(game,now);for(const item of visible)drawPickup(c,item,item.x*TILE-ox,item.y*TILE-oy,now);
  if(!fullMap){
   const item=target&&!target.person&&Math.abs(target.x-game.x)+Math.abs(target.y-game.y)<=5?target:visible.filter(p=>Math.abs(p.x-game.x)+Math.abs(p.y-game.y)<=3).sort((a,b)=>(Math.abs(a.x-game.x)+Math.abs(a.y-game.y))-(Math.abs(b.x-game.x)+Math.abs(b.y-game.y)))[0];
   if(item){const label=game.taskVersion&&item.icon==='clue'?(item.type===3?'DOCUMENT':'RESEARCH'):{clue:'CLUE',paint:'COLOUR',word:'WORD',spanner:'SPANNER',battery:'BATTERY'}[item.icon],w=label.length*6+8,x=Math.max(2,Math.min(canvas.width-w-2,item.x*TILE-ox+8-w/2)),y=Math.max(23,Math.min(canvas.height-14,item.y*TILE-oy+17));c.fillStyle='#19343bf0';c.fillRect(x,y,w,12);pixelText(c,label,x+w/2+1,y+3,'#f5edcf',1,'center');}
  }
  for(const f of FURNITURE)arcadeFurniture({set fillStyle(v){c.fillStyle=v},fillRect(x,y,w,h){c.fillRect(x-ox,y-oy,w,h)}},f);
  const actors=JOBS.map((j,i)=>({x:j.x*TILE,y:j.y*TILE,character:[0,1,3,2][i],name:j.person,npc:true,index:i}));actors.push({x:px,y:py,character:game.character,name:options.label||'YOU',npc:false});actors.sort((a,b)=>a.y-b.y);
  for(const a of actors){const ax=Math.round(a.x-ox),ay=Math.round(a.y-oy);drawPixelPerson(c,ax,ay-7,a.character,a.npc?0:game.steps, a.npc?'down':game.face);
   if(!a.npc){c.fillStyle='#f9f2d4';if(nearbyJob(game)<0){c.fillRect(ax+7,ay-15,3,3);c.fillRect(ax+8,ay-12,1,2);}const text=String(a.name).slice(0,16),w=text.length*6+6;c.fillStyle='#22373be0';c.fillRect(ax+8-w/2,ay+16,w,11);pixelText(c,text,ax+9,ay+18,'#f7edcf',1,'center');}
   else {const w=a.name.length*6+6;c.fillStyle='#263a3ccc';c.fillRect(ax+8-w/2,ay-17,w,10);pixelText(c,a.name,ax+9,ay-15,JOBS[a.index].colour,1,'center');if(nearbyJob(game)===a.index){c.fillStyle='#f6e49a';c.fillRect(ax+6,ay-26,5,6);pixelText(c,'!',ax+9,ay-26,'#263b3d',1,'center');}}
  }
  const inv=game.inventory.join(',');if(inv!==seenInventory&&game.score>seenScore){particles.push({x:px+8,y:py-12,text:'+'+(game.score-seenScore),until:now+850,colour:'#f7e195'});}seenInventory=inv;seenScore=game.score;
  particles=particles.filter(p=>p.until>now);for(const p of particles)pixelText(c,p.text,p.x-ox,p.y-oy-(850-(p.until-now))/65,p.colour,1,'center');
  if(!fullMap){const mx=canvas.width-59,my=7;c.fillStyle='#20353ee8';c.fillRect(mx-2,my-2,54,43);for(let i=0;i<4;i++){c.fillStyle=JOBS[i].colour;c.fillRect(mx+(i===1||i===3?29:2),my+(i>=2?23:2),18,13);}c.fillStyle='#eef3c9';c.fillRect(mx+game.x*1.42,my+game.y*1.42,3,3);c.fillStyle='#233941';c.fillRect(5,5,Math.max(72,(areaAt(game.x,game.y)>=0?JOBS[areaAt(game.x,game.y)].name.length*6+10:72)),13);pixelText(c,areaAt(game.x,game.y)>=0?JOBS[areaAt(game.x,game.y)].name:'MAIN HALL',10,8,'#eee7cc');}
  if(options.paused){c.fillStyle='#19343bb8';c.fillRect(0,0,canvas.width,canvas.height);pixelText(c,'PAUSED',canvas.width/2,canvas.height/2-8,'#f4e8c4',2,'center');}
 }
 return {draw,canvas,resize,destroy(){observer?.disconnect();}};
}
export function drawPractice(canvas,g,now){
 if(canvas.width!==224||canvas.height!==188){canvas.width=224;canvas.height=188;}
 const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
 c.fillStyle='#203c3f';c.fillRect(0,0,224,188);
 const px=x=>4+x*24,py=y=>18+y*24;
 for(let y=0;y<7;y++)for(let x=0;x<9;x++){c.fillStyle=x===0||x===8||y===0||y===6?'#4b6760':(x+y)%2?'#c2c4a1':'#b8bfa0';c.fillRect(px(x),py(y),24,24);}
 const tx=g.collected?6:5,ty=4;c.fillStyle='#f9edac';
 if(g.moved){for(let x=Math.min(g.x,tx);x<=Math.max(g.x,tx);x++)c.fillRect(px(x)+11,py(g.y)+11,3,3);for(let y=Math.min(g.y,ty);y<=Math.max(g.y,ty);y++)c.fillRect(px(tx)+11,py(y)+11,3,3);}
 if(!g.collected){const x=px(5)+8,y=py(4)+6;c.fillStyle='#203b3a';c.fillRect(x-3,y-3,16,19);c.fillStyle='#fff2a2';c.fillRect(x+3,y,4,13);c.fillRect(x-1,y+4,12,4);c.fillRect(x+1,y+2,8,8);}
 drawPixelPerson(c,px(7)+3,py(4),3);pixelText(c,'TEAMMATE',px(7)+11,py(4)-11,'#203b3a',1,'center');
 drawPixelPerson(c,px(g.x)+3,py(g.y),g.character,g.steps,g.face);pixelText(c,'YOU',px(g.x)+12,py(g.y)-9,'#203b3a',1,'center');
 pixelText(c,'PRACTICE / NO POINTS',112,5,'#edf0d7',1,'center');
}

// Big screen: every player on one shared floor plan. Each phone has its own
// copy of the map, but the layout is identical, so positions line up.
export function createRoomRenderer(canvas){
 const S=2,W=MAP_W*TILE,H=MAP_H*TILE;canvas.width=W*S;canvas.height=H*S;
 const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;const map=buildBaseMap();
 const reduceMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const spots=new Map(),seen=new Set();let bursts=[],primed=false;
 const label=(text,x,y,bg,fg)=>{c.font='600 17px WarMono, monospace';const w=Math.ceil(c.measureText(text).width)+12;c.fillStyle=bg;c.fillRect(Math.round(x-w/2),Math.round(y-12),w,22);c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.fillText(text,Math.round(x),Math.round(y));};
 function draw(players=[],events=[],now=Date.now(),options={}){
  // Job bursts: only for jobs finished after the screen opened.
  for(const e of events){const id=e.id||e.alias+e.created_at;if(seen.has(id))continue;seen.add(id);if(!primed)continue;const j=JOBS[e.type];if(j)bursts.push({x:j.x*TILE+8,y:j.y*TILE-6,text:'+'+e.points,name:e.alias,colour:j.colour,start:now});}
  primed=true;bursts=bursts.filter(b=>now-b.start<2600);
  c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;c.drawImage(map,0,0,W*S,H*S);
  c.setTransform(S,0,0,S,0,0);
  for(const f of FURNITURE)arcadeFurniture(c,f);
  // Gentle pulse under the crew member who just got help.
  for(const b of bursts){const t=(now-b.start)/2600;c.strokeStyle=b.colour;c.globalAlpha=1-t;c.lineWidth=2;c.beginPath();c.arc(b.x,b.y+14,10+t*26,0,Math.PI*2);c.stroke();c.globalAlpha=1;}
  // Players glide between the positions each poll reports.
  const tiles=new Map(),actors=[];
  for(const p of players){const g=p.game;if(!g)continue;let s=spots.get(p.alias);const tx=g.x*TILE,ty=g.y*TILE;if(!s){s={x:tx,y:ty};spots.set(p.alias,s);}s.x+=(tx-s.x)*.12;s.y+=(ty-s.y)*.12;
   const key=g.x+','+g.y,n=tiles.get(key)||0;tiles.set(key,n+1);actors.push({tile:key,first:n===0,x:s.x+(n%3-1)*5*(n>0),y:s.y+Math.floor(n/3)*3,character:g.character??p.character,steps:g.steps,face:g.face,name:p.alias,area:areaAt(g.x,g.y),moving:Math.abs(tx-s.x)+Math.abs(ty-s.y)>1});}
  for(const [i,j] of JOBS.entries())actors.push({x:j.x*TILE,y:j.y*TILE,character:[0,1,3,2][i],npc:true,name:j.person,colour:j.colour});
  actors.sort((a,b)=>a.y-b.y);
  for(const a of actors)drawPixelPerson(c,a.x,a.y-7,a.character,a.npc?0:(a.moving&&!reduceMotion?Math.floor(now/180):0),a.npc?'down':a.face);
  c.setTransform(1,0,0,1,0,0);
  for(const a of actors){const x=(a.x+8)*S,y=(a.y-13)*S;
   if(a.npc)label(a.name,x,y,'#1d3136',a.colour);
   else if(a.first){const more=tiles.get(a.tile)-1;label(a.name.toUpperCase()+(more?' +'+more:''),x,(a.y+20)*S,a.area>=0?JOBS[a.area].colour:'#f2ecd3','#13252a');}}
  for(const b of bursts){const t=(now-b.start)/2600,y=(b.y-12-t*30)*S;c.globalAlpha=t<.8?1:(1-t)*5;c.font='700 30px WarDisplay, sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=6;c.strokeStyle='#13252a';c.strokeText(b.text,(b.x)*S,y);c.fillStyle=b.colour;c.fillText(b.text,b.x*S,y);c.font='600 16px WarMono, monospace';c.strokeText(b.name.toUpperCase(),b.x*S,y+26);c.fillStyle='#f6f0d8';c.fillText(b.name.toUpperCase(),b.x*S,y+26);c.globalAlpha=1;}
  if(options.paused){c.fillStyle='#19343bb8';c.fillRect(0,0,canvas.width,canvas.height);c.font='700 64px WarDisplay, sans-serif';c.fillStyle='#f4e8c4';c.textAlign='center';c.fillText('PAUSED',canvas.width/2,canvas.height/2);}
 }
 return {draw,canvas,destroy(){}};
}


// Product renders match the four crew members' trainers. Shared by the brief
// and inline campaign SVGs; the browser caches each transparent WebP once.
export const COLOURWAYS=[
 {id:'lime',name:'Lime Rush',crew:'REM',image:'/assets/trainer-lime-v1.webp'},
 {id:'lilac',name:'Lilac Wave',crew:'NOVA',image:'/assets/trainer-lilac-v1.webp'},
 {id:'teal',name:'Steel Teal',crew:'PATCH',image:'/assets/trainer-teal-v1.webp'},
 {id:'sunset',name:'Sunset',crew:'SOL',image:'/assets/trainer-sunset-v1.webp'}
];
export function trainerSVG(cw=COLOURWAYS[0],label='',place=''){
 const product=COLOURWAYS.find(c=>c.id===cw?.id)||COLOURWAYS[0];
 return `<svg class="ug-trainer" ${place} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640" role="img" aria-label="${esc(label||'UNDERGROUND trainer in '+product.name)}"><image href="${product.image}" width="960" height="640" preserveAspectRatio="xMidYMid meet"/></svg>`;
}
