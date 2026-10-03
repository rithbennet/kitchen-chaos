export function createLeaderboard({getScore,onOpen,onClose}){
 const $=s=>document.querySelector(s),dialog=$('#leaderboard-dialog');
 let player=null,pending=0,saving=false,refreshing=false;
 const message=(text,error=false)=>{$('#board-status').textContent=text;$('#board-status').classList.toggle('is-error',error);};
 async function api(path,body){
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,method:body?'POST':'GET',body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not reach the leaderboard. Please try again.');return data;
 }
 function stats(){
  $('#your-score').textContent=getScore().toLocaleString();$('#your-best').textContent=player?player.best.toLocaleString():'—';$('#your-rank').textContent=player?.rank?`#${player.rank}`:'—';
  $('#player-label').textContent=player?player.name:'Add your name to save your score';
  $('#save-score').disabled=!player||saving;$('#save-score').textContent=saving?'Saving…':'Save score';
 }
 function render(entries){
  const list=$('#board-list');list.replaceChildren();
  if(!entries.length){const empty=document.createElement('li');empty.className='board-empty';empty.textContent='No scores yet. Make the first mess.';list.append(empty);return;}
  for(const entry of entries){const li=document.createElement('li');if(entry.id===player?.id)li.className='is-you';const rank=document.createElement('span'),name=document.createElement('span'),points=document.createElement('strong');rank.className='rank';rank.textContent=String(entry.rank).padStart(2,'0');name.className='player-name';name.textContent=entry.name+(entry.id===player?.id?' (you)':'');points.textContent=entry.score.toLocaleString();li.append(rank,name,points);list.append(li);}
 }
 async function refresh(){
  if(refreshing)return;refreshing=true;$('#refresh-board').disabled=true;
  try{const data=await api('/api/leaderboard');if(data.me){player={...player,...data.me};if(!$('#player-name').value)$('#player-name').value=player.name;stats();}render(data.entries);if(!pending)message('Best scores across all players.');}
  catch{message('Leaderboard unavailable. Your current score is still here. Tap Refresh to retry.',true);}
  finally{refreshing=false;$('#refresh-board').disabled=false;}
 }
 async function save(){
  pending=Math.max(pending,getScore());if(!player||saving||pending<=player.best){stats();return;}
  saving=true;stats();const score=pending;
  try{const data=await api('/api/score',{score});player=data.player;pending=pending<=player.best?0:pending;message(`Saved! Your best is ${player.best.toLocaleString()}.`);if(dialog.open)await refresh();}
  catch(error){message(error.name==='TimeoutError'?'Saving timed out. Tap Save score to retry.':error.message,true);}
  finally{saving=false;stats();}
 }
 $('#leaderboard').onclick=()=>{onOpen();dialog.showModal();stats();refresh();};
 $('#close-board').onclick=()=>dialog.close();dialog.addEventListener('close',onClose);
 $('#refresh-board').onclick=refresh;$('#save-score').onclick=save;
 $('#player-form').onsubmit=async e=>{
  e.preventDefault();const button=$('#save-player'),name=$('#player-name').value.trim();if(!name)return;button.disabled=true;message('Saving your name…');
  try{const data=await api('/api/player',{name});player=data.player;$('#player-name').value=player.name;stats();message('Name saved. Your best score saves while you play.');await save();await refresh();}
  catch(error){message(error.message,true);}finally{button.disabled=false;}
 };
 api('/api/player').then(data=>{player=data.player;if(player)$('#player-name').value=player.name;stats();}).catch(()=>message('Score saving is unavailable. Open the leaderboard to retry.',true));
 const timer=setInterval(()=>{if(player&&pending>player.best)save();},10000);
 window.addEventListener('pagehide',()=>{clearInterval(timer);if(player&&pending>player.best)fetch('/api/score',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({score:pending})}).catch(()=>{});});
 stats();return{scoreChanged(value){pending=Math.max(pending,value);if(dialog.open)stats();},captureScore(){pending=Math.max(pending,getScore());save();}};
}
