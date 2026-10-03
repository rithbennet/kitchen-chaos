import {handleAPI} from './api.js';
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;
 if(path.startsWith('/api/'))return handleAPI(request,env);
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 return env.ASSETS.fetch(request);
}};
