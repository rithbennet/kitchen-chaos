import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleAPI} from './worker/api.js';
export default {root:'public',server:{host:'0.0.0.0',allowedHosts:['terminal.local']},plugins:[{
 name:'local-leaderboard',
 configureServer(server){
  mkdirSync('.sites-runtime',{recursive:true});const sqlite=new DatabaseSync('.sites-runtime/leaderboard.sqlite');
  sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
  for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())if(!sqlite.prepare('SELECT name FROM local_migrations WHERE name = ?').get(file)){
   sqlite.exec(readFileSync('drizzle/'+file,'utf8'));sqlite.prepare('INSERT INTO local_migrations (name) VALUES (?)').run(file);
  }
  const DB={prepare(sql){const stmt=sqlite.prepare(sql);let args=[];return{bind(...p){args=p;return this;},async first(){return stmt.get(...args)||null;},async all(){return{results:stmt.all(...args)};},async run(){return stmt.run(...args);}};}};
  server.middlewares.use(async(req,res,next)=>{
   if(!req.url?.startsWith('/api/'))return next();
   try{
    const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
    if(headers.has('cookie'))headers.set('cookie',headers.get('cookie').replaceAll('kitchen-player-preview=','__Host-kitchen-player='));
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2048){res.writeHead(413);res.end();return;}chunks.push(chunk);}
    const response=await handleAPI(new Request('http://'+req.headers.host+req.url,{method:req.method,headers,body:chunks.length?Buffer.concat(chunks):undefined}),{DB});
    res.statusCode=response.status;for(const [key,value] of response.headers)res.setHeader(key,key==='set-cookie'?value.replace('__Host-kitchen-player=','kitchen-player-preview=').replace('; Secure',''):value);
    res.end(await response.text());
   }catch(error){server.config.logger.error(error.message);res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Local leaderboard unavailable.'}));}
  });
 }
}]};
