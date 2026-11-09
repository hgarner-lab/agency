import {arcadeApi} from '../../src/arcade-server.js';
import {getDatabase} from '../../server/turso.js';

export default {
 async fetch(request){
  const path=new URL(request.url).pathname;
  if(path.endsWith('/health'))return Response.json({ok:true,groupPlayConfigured:!!(process.env.TURSO_DATABASE_URL&&process.env.TURSO_AUTH_TOKEN)});
  try{
   const DB=await getDatabase();
   if(!DB)return Response.json({error:'Group play needs a database. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel, then redeploy. Solo play works without them.'},{status:503,headers:{'cache-control':'no-store'}});
   return await arcadeApi(request,{DB});
  }catch(error){
   console.error('The Agency database connection failed:',error.message);
   return Response.json({error:'The game database could not connect. The host should check the Turso settings in Vercel.'},{status:503,headers:{'cache-control':'no-store'}});
  }
 }
};
