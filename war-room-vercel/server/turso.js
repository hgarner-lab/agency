// SQLite-compatible D1 surface over Turso's documented HTTP v2 pipeline.
// Database credentials are read only in the Vercel Function, never in the browser.
import {readFile} from 'node:fs/promises';
function encodeValue(value){
 if(value===null||value===undefined)return {type:'null'};
 if(typeof value==='boolean')return {type:'integer',value:value?'1':'0'};
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('A SQL number must be finite.');return Number.isInteger(value)?{type:'integer',value:String(value)}:{type:'float',value};}
 return {type:'text',value:String(value)};
}
function decodeValue(value){
 if(value.type==='null')return null;
 if(value.type==='integer'||value.type==='float')return Number(value.value);
 if(value.type==='blob')return Buffer.from(value.base64,'base64');
 return value.value;
}
export function createTursoDatabase({url,token,fetchImpl=fetch}){
 const origin=new URL(String(url).replace(/^libsql:/,'https:'));
 if(origin.protocol!=='https:'||origin.username||origin.password)throw Error('TURSO_DATABASE_URL must be the database HTTPS or libsql URL.');
 const endpoint=origin.origin+'/v2/pipeline';
 async function execute(sql,args=[],wantRows=true){
  const response=await fetchImpl(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({requests:[{type:'execute',stmt:{sql,args:args.map(encodeValue),want_rows:wantRows}},{type:'close'}]}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('Database request failed with HTTP '+response.status+'. Check the Turso URL and token.');
  const payload=await response.json(),entry=payload.results?.[0];
  if(entry?.type==='error')throw Error('Database query failed: '+(entry.error?.message||'unknown error'));
  const result=entry?.response?.result;if(!result)throw Error('The database returned an incomplete response.');
  const rows=(result.rows||[]).map(row=>Object.fromEntries((result.cols||[]).map((col,i)=>[col.name,decodeValue(row[i])])));
  return {rows,changes:Number(result.affected_row_count||0)};
 }
 return {
  prepare(sql){let args=[];return {bind(...values){args=values;return this},async first(){return (await execute(sql,args)).rows[0]||null},async all(){return {results:(await execute(sql,args)).rows}},async run(){return {meta:{changes:(await execute(sql,args,false)).changes}}}};
  },
  async initialize(){
   const schema=await readFile(new URL('../database/schema.sql',import.meta.url),'utf8');
   for(const statement of schema.replace(/--> statement-breakpoint/g,'').split(';').map(s=>s.trim()).filter(Boolean))await execute(statement,[],false);
  }
 };
}
let cached,initializing,configuration;
export async function getDatabase(){
 const url=process.env.TURSO_DATABASE_URL,token=process.env.TURSO_AUTH_TOKEN;
 if(!url||!token)return null;
 const key=url+'\n'+token;
 if(configuration!==key){configuration=key;cached=createTursoDatabase({url,token});initializing=null;}
 if(!initializing)initializing=cached.initialize().catch(error=>{initializing=null;throw error});
 await initializing;return cached;
}
