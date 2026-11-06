const blocked = /\b(fuck\w*|fuk\w*|shit\w*|cunt\w*|bitch\w*|wank\w*|dick\w*|cock|pussy|porn\w*|nigg\w*|fagg\w*|retard\w*|nazi\w*|hitler|rape\w*|kill\s*(yourself|urself)|kys)\b/i;
export function isClean(value){
 const basic=String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const normalized=basic.replace(/[013457@$!]/g,c=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s','!':'i'}[c]));
 return !blocked.test(normalized) && !blocked.test(normalized.replace(/[^a-z\s]/g,'')) && !blocked.test(normalized.replace(/[^a-z]/g,''));
}
