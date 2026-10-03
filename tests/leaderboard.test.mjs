import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {handleAPI} from '../worker/api.js';

function database(){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 return{prepare(sql){const stmt=sqlite.prepare(sql);let params=[];return{bind(...p){params=p;return this;},async first(){return stmt.get(...params)||null;},async all(){return{results:stmt.all(...params)};},async run(){return stmt.run(...params);}};}};
}
const origin='https://kitchen.test';
async function call(db,path,{body,cookie,originHeader=origin,method}={}){
 const headers={origin:originHeader};if(cookie)headers.cookie=cookie;if(body!==undefined)headers['Content-Type']='application/json';
 const response=await handleAPI(new Request(origin+path,{method:method||(body!==undefined?'POST':'GET'),headers,body:body!==undefined?JSON.stringify(body):undefined}),{DB:db});
 return{status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
test('guest names, durable personal best, shared ordering and rank',async()=>{
 const db=database(),a=await call(db,'/api/player',{body:{name:'Harith'}}),b=await call(db,'/api/player',{body:{name:'Egg champion'}});
 assert.equal(a.status,201);assert.ok(a.cookie.startsWith('__Host-kitchen-player='));
 assert.equal((await call(db,'/api/score',{body:{score:140},cookie:a.cookie})).data.player.best,140);
 await call(db,'/api/score',{body:{score:220},cookie:b.cookie});
 const board=await call(db,'/api/leaderboard',{cookie:a.cookie});assert.deepEqual(board.data.entries.map(e=>e.score),[220,140]);assert.equal(board.data.me.rank,2);
 assert.equal((await call(db,'/api/player',{cookie:a.cookie})).data.player.best,140);
 await call(db,'/api/score',{body:{score:20},cookie:a.cookie});await call(db,'/api/score',{body:{score:140},cookie:a.cookie});
 assert.equal((await call(db,'/api/player',{cookie:a.cookie})).data.player.best,140);
 const renamed=await call(db,'/api/player',{body:{name:'Chef Harith'},cookie:a.cookie});assert.equal(renamed.data.player.id,a.data.player.id);assert.equal(renamed.data.player.best,140);
});
test('scores require a valid guest session; names cannot impersonate an existing record',async()=>{
 const db=database(),a=await call(db,'/api/player',{body:{name:'Harith'}}),b=await call(db,'/api/player',{body:{name:'Harith'}});assert.notEqual(a.data.player.id,b.data.player.id);
 assert.equal((await call(db,'/api/score',{body:{score:100}})).status,401);
 assert.equal((await call(db,'/api/score',{body:{score:100},cookie:'__Host-kitchen-player='+ 'a'.repeat(64)})).status,401);
 assert.equal((await call(db,'/api/score',{body:{score:100},cookie:a.cookie,originHeader:'https://evil.test'})).status,403);
 for(const score of [-1,1.5,'100',10000001])assert.equal((await call(db,'/api/score',{body:{score},cookie:a.cookie})).status,400);
 for(const name of ['', '<script>alert(1)</script>','a'.repeat(25)])assert.equal((await call(db,'/api/player',{body:{name},cookie:a.cookie})).status,400);
 const board=(await call(db,'/api/leaderboard')).data;assert.ok(!JSON.stringify(board).includes('token_hash'));
});
test('concurrent lower scores cannot replace a higher best; top list is capped',async()=>{
 const db=database();let first;
 for(let i=0;i<28;i++){const a=await call(db,'/api/player',{body:{name:'Player '+i}});if(!first)first=a;await call(db,'/api/score',{body:{score:100+i},cookie:a.cookie});}
 await Promise.all([300,150,200].map(score=>call(db,'/api/score',{body:{score},cookie:first.cookie})));
 const board=(await call(db,'/api/leaderboard',{cookie:first.cookie})).data;assert.equal(board.entries.length,25);assert.equal(board.me.best,300);assert.equal(board.me.rank,1);
});
