const blocked = /\b(fuck\w*|fuk\w*|shit\w*|cunt\w*|bitch\w*|wank\w*|dick\w*|cock|pussy|porn\w*|nigg\w*|fagg\w*|retard\w*|nazi\w*|hitler|rape\w*|kill\s*(yourself|urself)|kys)\b/i;
export function isClean(value){
 const basic=String(value).normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase();
 const normalized=basic.replace(/[013457@$!]/g,c=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s','!':'i'}[c]));
 return !blocked.test(normalized) && !blocked.test(normalized.replace(/[^a-z\s]/g,'')) && !blocked.test(normalized.replace(/[^a-z]/g,''));
}

// Players get a random game name instead of typing one, so nothing rude can
// reach the big screen. The server only accepts names built from these lists.
// Words were picked so no pairing reads as a double meaning.
export const NAME_WORDS=['Turbo','Cosmic','Chaotic','Sneaky','Crispy','Galactic','Mega','Hyper','Quantum','Glitchy','Electric','Feral','Frosty','Mystic','Funky','Wonky','Jazzy','Zesty','Retro','Pixel','Neon','Laser','Rocket','Atomic','Supreme','Iconic','Epic','Elite','Sonic','Ninja','Golden','Chill','Rogue','Stealth','Legit','Spooky','Royal','Midnight','Thunder','Lucky'];
export const NAME_ANIMALS=['Llama','Goblin','Wizard','Panda','Nugget','Waffle','Taco','Noodle','Penguin','Kraken','Yeti','Dragon','Pirate','Raccoon','Pigeon','Gecko','Hamster','Toaster','Burrito','Pretzel','Cactus','Donut','Moose','Otter','Badger','Falcon','Unicorn','Robot','Comet','Walrus','Lobster','Capybara','Narwhal','Ferret','Pancake','Sloth','Wombat','Gremlin','Potato','Meerkat'];
const MAX_NAME=16;
export function makeNickname(random=Math.random){
 const pick=list=>list[Math.floor(random()*list.length)];
 for(;;){const name=`${pick(NAME_WORDS)} ${pick(NAME_ANIMALS)}`;if(name.length<=MAX_NAME)return name;}
}
export function isGameName(value){
 const m=/^([A-Za-z]+) ([A-Za-z]+)$/.exec(String(value));
 return !!m&&String(value).length<=MAX_NAME&&NAME_WORDS.includes(m[1])&&NAME_ANIMALS.includes(m[2]);
}
