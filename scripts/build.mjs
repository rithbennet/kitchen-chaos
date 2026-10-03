import {readFile,writeFile,mkdir,readdir,cp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.cwd(),out=path.join(root,'dist');
await rm(out,{recursive:true,force:true});await mkdir(path.join(out,'server'),{recursive:true});await mkdir(path.join(out,'.openai'),{recursive:true});
const assets={};
async function collect(dir,relative=''){
 for(const file of await readdir(dir,{withFileTypes:true})){const rel=relative+'/'+file.name,absolute=path.join(dir,file.name);if(file.isDirectory()){await collect(absolute,rel);continue;}
 const body=await readFile(absolute,'utf8'),ext=path.extname(file.name),type={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.txt':'text/plain; charset=utf-8'}[ext]||'text/plain; charset=utf-8';
 assets[rel]={body,type,etag:'"'+createHash('sha256').update(body).digest('hex').slice(0,20)+'"'};
 }
}
await collect(path.join(root,'public'));
await cp(path.join(root,'worker'),path.join(out,'server'),{recursive:true});
await writeFile(path.join(out,'server/assets.generated.js'),'export const assets='+JSON.stringify(assets)+';\n');
await cp(path.join(root,'.openai/hosting.json'),path.join(out,'.openai/hosting.json'));
await cp(path.join(root,'drizzle'),path.join(out,'.openai/drizzle'),{recursive:true});
console.log('Built game and leaderboard Worker with '+Object.keys(assets).length+' game assets.');
