const blocked = /\b(fuck\w*|fuk\w*|shit\w*|cunt\w*|bitch\w*|wank\w*|dick\w*|cock|pussy|porn\w*|nigg\w*|fagg\w*|retard\w*|nazi\w*|hitler|rape\w*|kill\s*(yourself|urself)|kys)\b/i;
export function isClean(value){
 const basic=String(value).normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase();
 const normalized=basic.replace(/[013457@$!]/g,c=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s','!':'i'}[c]));
 return !blocked.test(normalized) && !blocked.test(normalized.replace(/[^a-z\s]/g,'')) && !blocked.test(normalized.replace(/[^a-z]/g,''));
}

// Players get a random game name instead of typing one, so nothing rude can
// reach the big screen. The server only accepts names built from these lists.
export const NAME_WORDS=['Swift','Bold','Lucky','Rapid','Cosmic','Turbo','Mighty','Clever','Brave','Chill','Epic','Golden','Hyper','Ninja','Pixel','Silent','Sonic','Super','Neon','Iron','Prime','Rogue','Shadow','Laser'];
export const NAME_ANIMALS=['Fox','Wolf','Hawk','Shark','Tiger','Otter','Panda','Eagle','Lynx','Cobra','Falcon','Bison','Gecko','Moose','Raven','Rhino','Llama','Koala','Puma','Orca','Yak','Badger','Crab','Owl'];
const SKIPPED_NUMBERS=new Set([14,18,69,88]);
export function makeNickname(random=Math.random){
 const pick=list=>list[Math.floor(random()*list.length)];
 let n;do{n=10+Math.floor(random()*90)}while(SKIPPED_NUMBERS.has(n));
 return `${pick(NAME_WORDS)} ${pick(NAME_ANIMALS)} ${n}`;
}
export function isGameName(value){
 const m=/^([A-Za-z]+) ([A-Za-z]+) (\d\d)$/.exec(String(value));
 return !!m&&NAME_WORDS.includes(m[1])&&NAME_ANIMALS.includes(m[2])&&!SKIPPED_NUMBERS.has(Number(m[3]));
}
