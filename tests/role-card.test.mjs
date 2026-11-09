import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drawRoleCard} from '../src/role-card.js';
import {roles} from '../src/content.js';

test('all four exported roles draw the supplied McCann wordmark and retain the chosen character',()=>{
 for(const role of roles){
  const draws=[],texts=[],brandImage={width:800,height:200},characterImage={width:1536,height:1024};
  const c={fillRect(){},drawImage(...args){draws.push(args)},measureText(value){return {width:value.length*parseFloat(this.font)*.6}},fillText(value,x,y){texts.push({value,x,y,font:this.font,align:this.textAlign,width:this.measureText(value).width})}};
  const canvas={getContext(){return c}};
  drawRoleCard(canvas,{role,profile:{score:12540,completed:25},alias:'SilverDragon1234',characterIndex:2,characterImage,brandImage,year:2026});
  assert.equal(canvas.width,800);assert.equal(canvas.height,1100);
  assert.equal(draws[0][0],brandImage);assert.deepEqual(draws[0].slice(1),[0,0,800,200,40,30,420,105]);
  assert.equal(draws[1][0],characterImage);assert.equal(draws[1][1],768);
  assert.ok(texts.some(t=>t.value===role.name));assert.ok(texts.some(t=>t.value==='A McCann experience'));
  for(const text of texts){assert.ok(text.y<1100);assert.ok(text.align==='right'?text.x-text.width>=0:text.x+text.width<=800);}
 }
});
