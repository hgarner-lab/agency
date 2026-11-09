import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),source=new URL('src/',root),output=new URL('public/',root);
const client=['style.css','arcade.css','arcade-app.js','arcade-world.js','agency-tasks.js','task-copy.js','arcade-renderer.js','underground-brand.js','role-card.js','story.js','content.js','scenes.js','filter.js','qr.js','icon.svg'];
const originals=await Promise.all(client.map(name=>readFile(new URL(name,source),'utf8')));
const release=createHash('sha256').update(originals.join('\n')).digest('hex').slice(0,12);
await rm(output,{recursive:true,force:true});await mkdir(new URL('assets/',output),{recursive:true});
for(let i=0;i<client.length;i++){
 const code=originals[i].replace(/(from ['"])(\.\/[^'"]+\.js)(['"])/g,(_,a,b,c)=>a+b+'?v='+release+c);
 await writeFile(new URL('assets/'+client[i],output),code);
}
let html=await readFile(new URL('index.html',source),'utf8');
for(const name of ['arcade-app.js','style.css','arcade.css','icon.svg'])html=html.replaceAll('/assets/'+name,'/assets/'+name+'?v='+release);
await writeFile(new URL('index.html',output),html);
await cp(new URL('assets/',root),new URL('assets/',output),{recursive:true});
console.log('Built Vercel frontend in public/. Live rooms use api/arcade/[action].js.');

