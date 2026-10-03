import {handleAPI} from './api.js';
import {assets} from './assets.generated.js';
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;
 if(path.startsWith('/api/'))return handleAPI(request,env);
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const asset=assets[path==='/'?'/index.html':path];if(!asset)return new Response('Not found',{status:404});
 const headers={'Content-Type':asset.type,'Cache-Control':'no-cache','ETag':asset.etag,'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'};
 if(request.headers.get('if-none-match')===asset.etag)return new Response(null,{status:304,headers});
 return new Response(request.method==='HEAD'?null:asset.body,{headers});
}};
