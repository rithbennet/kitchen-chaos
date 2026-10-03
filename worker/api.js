import {database,publicPlayer} from './database.js';
const COOKIE='__Host-kitchen-player';
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...headers}});
async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function currentPlayer(request,db){
 const token=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 return db.prepare('SELECT * FROM players WHERE token_hash = ?').bind(await digest(token)).first();
}
async function bodyJSON(request){
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new Error('Send JSON data.');
 // Read with a byte cap, including chunked bodies.
 const reader=request.body?.getReader();if(!reader)throw new Error('Missing request data.');
 let size=0,chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();throw new Error('Request is too large.');}chunks.push(value);}
 const all=new Uint8Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}
 const data=JSON.parse(new TextDecoder().decode(all));if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid request data.');return data;
}
export async function handleAPI(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(!['/api/player','/api/leaderboard','/api/score'].includes(path))return json({error:'Not found.'},404);
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site'))return json({error:'Open the game to save a score.'},403);
 try{
  const db=database(env),player=await currentPlayer(request,db);
  if(path==='/api/player'&&request.method==='GET')return json({player:await publicPlayer(db,player)});
  if(path==='/api/leaderboard'&&request.method==='GET'){
   const {results}=await db.prepare('SELECT id, name, best AS score FROM players WHERE best > 0 ORDER BY best DESC, updated_at ASC, id ASC LIMIT 25').all();
   return json({entries:results.map((r,i)=>({...r,rank:i+1})),me:await publicPlayer(db,player)});
  }
  if(request.method!=='POST'||path==='/api/leaderboard')return json({error:'Method not allowed.'},405);
  let data;try{data=await bodyJSON(request);}catch{return json({error:'Invalid or oversized request.'},400);}
  if(path==='/api/player'){
   const name=typeof data.name==='string'?data.name.normalize('NFKC').trim().replace(/\s+/g,' '):'';
   if(!name||[...name].length>24||/[<>\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(name))return json({error:'Use a name of 1–24 characters without markup or control characters.'},400);
   if(player){await db.prepare('UPDATE players SET name = ? WHERE id = ?').bind(name,player.id).run();return json({player:await publicPlayer(db,{...player,name})});}
   const token=[...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join(''),id=crypto.randomUUID(),now=Date.now();
   await db.prepare('INSERT INTO players (id, token_hash, name, best, updated_at, created_at) VALUES (?, ?, ?, 0, ?, ?)').bind(id,await digest(token),name,now,now).run();
   return json({player:{id,name,best:0,rank:null}},201,{'Set-Cookie':`${COOKIE}=${token}; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Lax`});
  }
  if(!player)return json({error:'Add your player name before saving a score.'},401);
  if(!Number.isSafeInteger(data.score)||data.score<0||data.score>10000000)return json({error:'Score must be a whole number between 0 and 10,000,000.'},400);
  // Conditional update makes retries and concurrent, out-of-order saves safe.
  await db.prepare('UPDATE players SET best = ?, updated_at = ? WHERE id = ? AND best < ?').bind(data.score,Date.now(),player.id,data.score).run();
  const row=await db.prepare('SELECT * FROM players WHERE id = ?').bind(player.id).first();
  return json({player:await publicPlayer(db,row)});
 }catch(error){console.error('Leaderboard request failed:',error.message);return json({error:'Leaderboard temporarily unavailable. Your score has not been lost from this game. Please retry.'},503);}
}
