import * as T from './vendor/three.module.js';
import {KitchenPhysics,C,V} from './physics.js';
import {createLeaderboard} from './leaderboard.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const canvas=$('#scene');let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch(error){$('#loader').style.display='none';$('#error').hidden=false;throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
const scene=new T.Scene();scene.background=new T.Color('#82969a');scene.fog=new T.Fog('#82969a',22,44);
const camera=new T.PerspectiveCamera(40,1,.1,65);const physics=new KitchenPhysics();
const dynamic=new Map(),decor=new T.Group(),effects=[];scene.add(decor);
let buddy='both',tool='punch',score=0,hits=0,combo=0,lastHit=-10,time=0,slow=false,sound=false,audio=null,shake=0,lastFloorHit=0;
let pointer=null,calloutTimer,paused=false,bombs=[],gloves=[],lastShot=-10;
let embedded=[],holdTimer=null;
let splats=[];
const leaderboard=createLeaderboard({getScore:()=>score,onOpen:()=>{cancelPointer();paused=true;},onClose:()=>{paused=false;}});
const materials=new Map();
function mat(color,roughness=.62,metalness=0){const key=`${color}-${roughness}-${metalness}`;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness,metalness}));return materials.get(key);}
const skin=mat('#e8aa78',.72),hair=mat('#252126',.75),shirt=mat('#f0eee5',.85),blue=mat('#8abbd2',.78),red=mat('#dc4c35',.42),dark=mat('#20251e',.78),brown=mat('#695040',.85),silver=mat('#b9c6c7',.25,.78),brass=mat('#b19555',.3,.65);
const sphereGeo=new T.SphereGeometry(1,22,16),boxGeo=new T.BoxGeometry(1,1,1);
function mesh(geo,material,parent=decor){const m=new T.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(w,h,d,x,y,z,material,parent=decor){const m=mesh(boxGeo,material,parent);m.scale.set(w,h,d);m.position.set(x,y,z);return m;}
function ball(rx,ry,rz,x,y,z,material,parent=decor){const m=mesh(sphereGeo,material,parent);m.scale.set(rx,ry,rz);m.position.set(x,y,z);return m;}
function cyl(rt,rb,h,x,y,z,material,parent=decor,n=24){const m=mesh(new T.CylinderGeometry(rt,rb,h,n),material,parent);m.position.set(x,y,z);return m;}
function capsule(r,length,x,y,z,material,parent=decor){const m=mesh(new T.CapsuleGeometry(r,Math.max(.001,length-2*r),5,14),material,parent);m.position.set(x,y,z);return m;}
function ring(r,t,x,y,z,material,parent=decor){const m=mesh(new T.TorusGeometry(r,t,8,32),material,parent);m.position.set(x,y,z);return m;}
function fixed(w,h,d,x,y,z,material,parent=decor){const m=box(w,h,d,x,y,z,material,parent);physics.wall([x,y,z],[w,h,d]);return m;}
function tube(points,r,material,parent=decor){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(new T.TubeGeometry(curve,18,r,8,false),material,parent);}
scene.add(new T.HemisphereLight('#effaff','#72715d',2.3));
const sun=new T.DirectionalLight('#fff2d5',4);sun.position.set(-3,8,6);sun.castShadow=true;sun.shadow.mapSize.set(innerWidth<700?1024:1536,innerWidth<700?1024:1536);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-6;sun.shadow.normalBias=.035;sun.shadow.bias=-.0003;sun.shadow.camera.far=24;scene.add(sun);
const fill=new T.DirectionalLight('#bdedff',1.1);fill.position.set(4,4,-3);scene.add(fill);
const warmLight=new T.PointLight('#ffb873',14,8,2);warmLight.position.set(2,3.4,-1.9);scene.add(warmLight);
// A modeled room: every floor, countertop, appliance and wall has a matching collider.
const grout=mat('#8c9185'),tileA=mat('#c5c5ad'),tileB=mat('#a8b4a6'),wallMat=mat('#e3e0cb'),cabinet=mat('#477e7e'),cabinetFront=mat('#508e8b'),trim=mat('#345f61'),counter=mat('#e4d6bd',.4),black=mat('#24343a',.36),wood=mat('#ba8353',.73);
fixed(10,.35,10,0,-.19,0,grout);
for(let x=-5;x<5;x++)for(let z=-5;z<5;z++){const m=box(.986,.017,.986,x+.5,.005,z+.5,(x+z)%2?tileA:tileB);m.castShadow=false;}
fixed(10,5.6,.22,0,2.6,-3.8,wallMat);fixed(.2,5.6,7.5,-5,2.6,-.12,mat('#becdc3'));
physics.wall([5,2.7,0],[.2,6,10]);physics.wall([0,2.7,5],[10,6,.2]);physics.wall([0,6,0],[10,.2,10]);
// Subway tile backsplash.
for(let row=0;row<4;row++)for(let col=0;col<17;col++){const x=-4.9+col*.61+(row%2)*.3;if(x>4.8)continue;const m=box(.586,.286,.025,x,1.95+row*.3,-3.667,mat(row%3===0?'#dbdecd':'#e7e8d6'));m.castShadow=false;}
fixed(7.8,1.62,1.23,.72,.87,-3.02,cabinet);
fixed(7.94,.15,1.35,.72,1.76,-3.01,counter);
box(7.78,.12,.1,.72,.12,-2.35,trim);
for(const x of [-2.58,-1.5,-.42,.66,1.74,2.82,3.9]){
 box(1.01,1.31,.07,x,.89,-2.365,cabinetFront);box(.91,1.2,.035,x,.9,-2.318,cabinet);
 box(.35,.035,.065,x,1.39,-2.263,brass);
}
// Stove and oven.
box(1.12,1.42,.09,1.5,.89,-2.28,black);box(.94,.77,.06,1.5,.75,-2.20,mat('#17252b',.12,.3));box(.77,.5,.03,1.5,.75,-2.16,mat('#34454c',.16,.3));box(.84,.055,.1,1.5,1.27,-2.12,silver);
for(let i=0;i<4;i++){const k=cyl(.062,.062,.045,1.17+i*.22,1.49,-2.18,silver);k.rotation.x=Math.PI/2;}
box(1.25,.055,1.1,1.5,1.86,-3.0,black);
for(const x of [1.19,1.83])for(const z of [-3.28,-2.72]){const r=ring(.185,.018,x,1.9,z,black);r.rotation.x=-Math.PI/2;const r2=ring(.115,.013,x,1.91,z,silver);r2.rotation.x=-Math.PI/2;}
// Sink and arched faucet.
box(1.04,.028,.67,-1.49,1.85,-3.04,silver);box(.85,.031,.51,-1.49,1.872,-3.04,mat('#5c7476',.28,.6));tube([[-1.49,1.87,-3.47],[-1.49,2.30,-3.47],[-1.49,2.43,-3.24],[-1.49,2.22,-3.13]],.045,silver);
cyl(.065,.065,.18,-1.04,1.95,-3.43,silver);
// Upper cabinets and extractor.
for(const x of [2.68,3.76]){box(1.01,1.30,.62,x,3.75,-3.44,cabinet);box(.93,1.19,.04,x,3.75,-3.10,cabinetFront);box(.034,.28,.08,x-.29,3.52,-3.04,brass);}
box(1.25,.17,.9,1.49,3.25,-3.27,silver);box(.56,.74,.55,1.49,3.66,-3.42,silver);
// Daylight window.
box(2.47,1.62,.13,-1.19,3.68,-3.64,mat('#eae4d3'));box(2.24,1.4,.05,-1.19,3.68,-3.55,mat('#a6d2d9',.2));box(2.23,.37,.02,-1.19,3.18,-3.51,mat('#94b7ac'));box(.065,1.4,.07,-1.19,3.68,-3.48,wallMat);box(2.24,.065,.07,-1.19,3.69,-3.48,wallMat);box(2.65,.10,.39,-1.19,2.83,-3.49,wood);
// Fridge with separated doors, chrome handles, and a magnet.
fixed(1.49,3.48,1.38,-4.10,1.77,-2.97,mat('#ce7353',.4));box(1.39,2.01,.09,-4.10,1.21,-2.23,mat('#e38b66',.38));box(1.39,1.12,.09,-4.10,2.84,-2.23,mat('#e38b66',.38));capsule(.043,.66,-3.59,1.69,-2.14,silver);capsule(.043,.40,-3.59,2.87,-2.14,silver);box(.35,.39,.015,-4.25,2.81,-2.16,mat('#fff0bc'));ball(.043,.043,.022,-4.25,2.98,-2.12,red);
// Open shelf and a rail of cooking utensils.
box(1.63,.11,.55,-3.73,4.00,-3.47,wood);for(let i=0;i<3;i++)cyl(.115,.10,.26,-4.25+i*.39,4.18,-3.47,mat(['#dfba67','#bad4c6','#d98968'][i]));
const rail=cyl(.025,.025,1.40,3.24,2.77,-3.33,silver);rail.rotation.z=Math.PI/2;
for(let i=0;i<3;i++){capsule(.019,.35,2.76+i*.4,2.52,-3.30,silver);ball(.078,.095,.023,2.76+i*.4,2.29,-3.30,silver);}
// Chopping board, tea towel, a soap dispenser, and small potted plant.
box(.7,.043,.49,-.10,1.87,-2.81,wood);box(.37,.025,.6,-2.53,1.86,-2.43,mat('#db9a6c'));
cyl(.10,.11,.29,-2.2,2.02,-3.35,mat('#dcb967'));box(.16,.035,.05,-2.2,2.2,-3.35,black);
cyl(.17,.12,.25,-.31,2.0,-3.35,mat('#dc8765'));for(let i=0;i<9;i++){let a=i*2.4;const leaf=ball(.085,.25,.025,-.31+Math.sin(a)*.12,2.26+Math.cos(i)*.05,-3.35+Math.cos(a)*.12,mat('#49775b'));leaf.rotation.z=Math.sin(a)*.6;}
// Hanging pendant light, above the playable space.
cyl(.04,.04,.63,.1,5.05,-.5,black);cyl(.09,.39,.25,.1,4.61,-.5,mat('#29474e',.4));cyl(.34,.34,.025,.1,4.478,-.5,mat('#fff1cd'));

function bodyVisual(body){const g=new T.Group();scene.add(g);g.userData.body=body;dynamic.set(body,g);return g;}
function createCharacter(){
 cancelPointer();
 clearSplats(true);
 for(const [b,g] of [...dynamic])if(b.buddy){scene.remove(g);disposeUnique(g);dynamic.delete(b);}
 for(const b of [...physics.props])if(['shard','debris','shell'].includes(b.kind))removeProp(b);
 embedded=[];
 const parts=physics.createBuddy(buddy);
 for(const b of parts){const g=bodyVisual(b),n=b.name,female=b.buddy.kind==='woman';
  if(n==='head'){
   ball(.387,.436,.338,0,0,0,skin,g);ball(.08,.13,.10,-.383,-.028,.018,skin,g);ball(.08,.13,.10,.383,-.028,.018,skin,g);
   ball(.047,.08,.043,-.132,.015,.319,dark,g);ball(.047,.08,.043,.132,.015,.319,dark,g);
   ball(.012,.018,.008,-.144,.038,.358,mat('#fff8ea'),g);ball(.012,.018,.008,.12,.038,.358,mat('#fff8ea'),g);
   ball(.055,.087,.085,0,-.075,.343,skin,g);
   const mouth=capsule(.011,.105,0,-.218,.30,dark,g);mouth.rotation.z=Math.PI/2;
   for(const x of [-.14,.14]){const brow=capsule(.014,.13,x,.16,.307,hair,g);brow.rotation.z=Math.PI/2+(x<0?.09:-.09);}
   if(female){
    const cap=mesh(new T.SphereGeometry(.417,28,20,0,Math.PI*2,0,1.38),hair,g);cap.scale.set(1,1.08,.9);cap.position.y=.03;
    ball(.10,.39,.22,-.34,-.043,-.011,hair,g);ball(.10,.39,.22,.34,-.043,-.011,hair,g);ball(.35,.34,.12,0,-.035,-.23,hair,g);
    for(let i=0;i<6;i++){const fringe=capsule(.047,.27,-.245+i*.097,.27,.269,hair,g);fringe.rotation.z=(i-2.5)*.035;}
   }else{
    const cap=mesh(new T.SphereGeometry(.38,24,16,0,Math.PI*2,0,1.16),mat('#6d513b'),g);cap.position.y=.04;cap.scale.set(1,1.06,.89);
    for(let row=0;row<4;row++)for(let i=0;i<14;i++){const phi=.16+row*.23,a=i/14*Math.PI*2;const x=Math.sin(phi)*Math.cos(a)*.38,z=Math.sin(phi)*Math.sin(a)*.33,y=Math.cos(phi)*.43;const h=capsule(.017,.082,x,y+.025,z,hair,g);h.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(x,y,z).normalize());}
    ring(.132,.011,-.151,.025,.344,brass,g);ring(.132,.011,.151,.025,.344,brass,g);tube([[-.025,.04,.357],[0,.063,.38],[.025,.04,.357]],.009,brass,g);tube([[-.28,.05,.335],[-.37,.07,.18],[-.39,.0,0]],.009,brass,g);tube([[.28,.05,.335],[.37,.07,.18],[.39,.0,0]],.009,brass,g);
   }
   g.userData.eyes=[];
  }else if(n==='chest'){
   const shape=cyl(.29,.34,.8,0,0,0,female?blue:shirt,g);shape.scale.z=.68;
   cyl(.095,.11,.17,0,.47,0,skin,g);
   for(const s of [-1,1]){const c=box(.13,.14,.025,s*.09,.325,.201,female?mat('#96c8df'):mat('#fffaf1'),g);c.rotation.z=s*.36;}
   if(!female){box(.012,.64,.012,0,-.01,.21,mat('#ddd8c9'),g);for(let i=0;i<4;i++)ball(.018,.018,.013,0,.23-i*.15,.223,mat('#bcbeb3'),g);}
  }else if(n==='hips'){
   if(female){const skirt=cyl(.30,.43,.61,0,-.13,0,brown,g);skirt.scale.z=.69;}else{const h=cyl(.32,.30,.31,0,0,0,dark,g);h.scale.z=.66;box(.59,.048,.38,0,.15,0,mat('#262b22'),g);}
  }else if(n.startsWith('arm')){
   capsule(.126,.60,0,0,0,female?skin:shirt,g);if(female){const sl=cyl(.151,.143,.26,0,.18,0,blue,g);sl.scale.z=.93;}
  }else if(n.startsWith('fore')){
   capsule(.104,.49,0,0,0,skin,g);if(!female)cyl(.115,.115,.11,0,.20,0,shirt,g);
  }else if(n.startsWith('hand')){
   ball(.165,.177,.15,0,0,0,red,g);ball(.074,.10,.093,n.endsWith('L')?.12:-.12,.015,.057,red,g);cyl(.106,.11,.08,0,.14,0,mat('#bb402e'),g);
  }else if(n.startsWith('thigh')){capsule(.145,.65,0,0,0,female?skin:dark,g);}
  else if(n.startsWith('shin')){capsule(.128,.64,0,0,0,female?skin:dark,g);if(female)cyl(.131,.127,.35,0,-.15,0,dark,g);}
  else if(n.startsWith('foot')){ball(.145,.13,.239,0,-.005,.03,mat('#222720',.43),g);box(.26,.04,.4,0,-.102,.033,mat('#17221e'),g);}
  g.position.copy(b.position);g.quaternion.copy(b.quaternion);

 }
 updateDamageStats();
}
function disposeUnique(group){group.traverse(o=>{if(o.geometry&&o.geometry!==sphereGeo&&o.geometry!==boxGeo)o.geometry.dispose();});}
function createProp(type,pos,velocity){
 const body=physics.prop(type,pos,velocity),g=bodyVisual(body);
 if(type==='egg'){
  ball(.112,.154,.112,0,0,0,mat('#fff1d4',.65),g);
 }else if(type==='gelato'){
  const cream=mat('#ef9fb9',.8);ball(.21,.19,.21,0,0,0,cream,g);for(let i=0;i<5;i++){const a=i*1.257;ball(.09,.075,.09,Math.cos(a)*.14,-.095,Math.sin(a)*.14,cream,g);}
 }else if(type==='shell'){
  const piece=mesh(new T.SphereGeometry(.10,7,5,0,1.2,.5,1.2),mat('#fff3d8',.7),g);piece.material.side=T.DoubleSide;body.expires=time+12;
 }else if(type==='shard'){
  const shard=mesh(new T.TetrahedronGeometry(1,0),mat('#8cbb8d',.19,.26),g);shard.scale.set(.052,.10+Math.random()*.08,.026);body.expires=time+18;
 }else if(type==='debris'){
  const piece=mesh(new T.IcosahedronGeometry(.07,0),mat('#e4bd87'),g);piece.scale.set(1,1.4,.8);body.expires=time+12;
 }else if(type==='pan'){
  cyl(.325,.30,.09,0,0,0,black,g);cyl(.28,.28,.015,0,.057,0,mat('#56646a',.35,.6),g);const rim=ring(.306,.028,0,.05,0,silver,g);rim.rotation.x=Math.PI/2;box(.15,.09,.65,0,.00,.54,black,g);box(.105,.06,.11,0,0,.9,silver,g);body.addShape(new C.Box(V(.075,.045,.3)),V(0,0,.52));
 }else if(type==='bottle'){
  const glass=mat('#436c4a',.2,.18);cyl(.113,.117,.43,0,-.07,0,glass,g);cyl(.041,.11,.10,0,.195,0,glass,g);cyl(.041,.041,.16,0,.305,0,glass,g);cyl(.046,.046,.06,0,.40,0,mat('#d2b474'),g);cyl(.119,.119,.16,0,-.08,0,mat('#e9ddbc'),g);
 }else if(type==='rolling'){
  const barrel=cyl(.104,.104,.55,0,0,0,wood,g);barrel.rotation.z=Math.PI/2;const handle=cyl(.048,.048,.92,0,0,0,mat('#8e593a'),g);handle.rotation.z=Math.PI/2;
 }else if(type==='plate'){
  cyl(.26,.22,.035,0,0,0,mat('#ece8d8',.28),g);const edge=ring(.235,.021,0,.025,0,mat('#a9c4ba'),g);edge.rotation.x=Math.PI/2;
 }else if(type==='orange'){ball(.13,.125,.13,0,0,0,mat('#ee913e',.93),g);ball(.018,.013,.023,0,.122,0,mat('#578056'),g);}
 else if(type==='bomb'){
  ball(.22,.22,.22,0,0,0,mat('#303538',.32,.35),g);cyl(.069,.065,.07,0,.224,0,brass,g);tube([[0,.25,0],[.05,.33,0],[.15,.34,0],[.18,.28,0]],.014,wood,g);const ember=ball(.034,.034,.034,.18,.28,0,new T.MeshBasicMaterial({color:'#ffac35'}),g);bombs.push({body,g,end:time+1.45,ember});
 }
 g.position.copy(body.position);
 if(velocity){body.angularVelocity.set(3+Math.random()*4,Math.random()*5,Math.random()*5);}

 return body;
}
function removeProp(b){const g=dynamic.get(b);if(g){scene.remove(g);disposeUnique(g);dynamic.delete(b);}physics.removeProp(b);}
function stockKitchen(){createProp('pan',[1.50,2.01,-3.02]);createProp('bottle',[3.06,2.17,-2.98]);createProp('bottle',[3.39,2.17,-3.27]);createProp('rolling',[-.1,1.97,-2.8]);for(let i=0;i<3;i++)createProp('plate',[3.95,1.91+i*.067,-2.86]);for(let i=0;i<3;i++)createProp('orange',[.02+i*.28,1.98,-3.29]);}
function updateDamageStats(){
 const broken=physics.buddies.flatMap(b=>b.parts).filter(b=>b.detached||!b.active).length;
 $('#damage-stat').textContent=`${broken} broken · ${embedded.length} glass shards`;
}
function embedShard(body,target,point){
 if(!body.active)return;if(!target?.active||!dynamic.has(target)){body.embedQueued=false;return;}
 const g=dynamic.get(body);if(!g)return;
 const onPart=embedded.filter(s=>s.target===target);
 if(onPart.length>=5){const oldest=onPart[0];oldest.mesh.removeFromParent();disposeUnique(oldest.mesh);embedded=embedded.filter(e=>e!==oldest);}
 if(embedded.length>=60){const oldest=embedded.shift();oldest.mesh.removeFromParent();disposeUnique(oldest.mesh);}
 const local=target.pointToLocalFrame(V(point.x,point.y,point.z));
 scene.remove(g);dynamic.delete(body);physics.removeProp(body);
 g.position.copy(local);g.quaternion.copy(new T.Quaternion(target.quaternion.x,target.quaternion.y,target.quaternion.z,target.quaternion.w).invert().multiply(g.quaternion));
 g.userData.body=target;dynamic.get(target).add(g);embedded.push({mesh:g,target});updateDamageStats();
}
function shatterBottle(body,other,point){
 if(!body.active)return;const center=body.position.clone(),velocity=body.velocity.clone();removeProp(body);
 const glassTarget=other?.buddy&&other.active?other:null;
 for(let i=0;i<14;i++){
  const p=V(center.x+(Math.random()-.5)*.2,center.y+(Math.random()-.5)*.4,center.z+(Math.random()-.5)*.2);
  const v=V(velocity.x*.23+(Math.random()-.5)*5,Math.abs(velocity.y)*.12+1+Math.random()*3,velocity.z*.23+(Math.random()-.5)*5);
  const shard=createProp('shard',[p.x,p.y,p.z],v);
  if(glassTarget&&i<3){const at=point.clone();at.x+=(Math.random()-.5)*.10;at.y+=(Math.random()-.5)*.12;embedShard(shard,glassTarget,at);}
 }
 addScore(20,false);soundFX('clink',1);impactFX(center,12,'#bbdfb5');shout('GLASS SHATTER!');trimProps();
}
// Small, bounded surface decals follow the ragdoll; fluid droplets leave floor marks.
function removeSplat(s){s.m.removeFromParent();s.m.geometry.dispose();}
function clearSplats(onlyBodies=false){for(const s of [...splats])if(!onlyBodies||s.target){removeSplat(s);splats.splice(splats.indexOf(s),1);}}
function addSplat(point,color,size=.16,target=null){
 if(target&&!target.active)return;
 let parent=target?dynamic.get(target):scene;if(!parent)return;
 let pos=new T.Vector3(point.x,point.y,point.z),normal=new T.Vector3(0,1,0);
 if(target){
  parent.updateWorldMatrix(true,true);
  const center=new T.Vector3().copy(target.position),out=pos.clone().sub(center);if(out.length()<.04)out.set(0,0,1);out.normalize();
  const cast=new T.Raycaster(pos.clone().addScaledVector(out,1),out.clone().negate(),0,3);
  const hits=cast.intersectObject(parent,true).filter(h=>!h.object.userData.splat);
  if(hits.length){pos.copy(hits[0].point);normal.copy(hits[0].face.normal).transformDirection(hits[0].object.matrixWorld);}else{pos.copy(center).addScaledVector(out,.22);normal.copy(out);}
  pos.addScaledVector(normal,.009);parent.worldToLocal(pos);normal.applyQuaternion(parent.getWorldQuaternion(new T.Quaternion()).invert());
 }else{pos.y=.025;}
 const shape=new T.Shape();for(let i=0;i<=24;i++){const a=i/24*Math.PI*2,r=size*(i%3===0?1:.62+Math.random()*.22);const x=Math.cos(a)*r,y=Math.sin(a)*r;i?shape.lineTo(x,y):shape.moveTo(x,y);}
 const shapes=[shape];for(let i=0;i<4;i++){const a=Math.random()*Math.PI*2,r=size*(1.05+Math.random()*.4),d=new T.Shape();d.absarc(Math.cos(a)*r,Math.sin(a)*r,size*(.07+Math.random()*.09),0,Math.PI*2,false);shapes.push(d);}
 const m=new T.Mesh(new T.ShapeGeometry(shapes,4),mat(color,.42));m.userData.splat=true;m.position.copy(pos);m.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);m.rotateZ(Math.random()*Math.PI*2);m.receiveShadow=true;parent.add(m);splats.push({m,target,expires:time+55});
 while(splats.length>85)removeSplat(splats.shift());
}
function fluidFX(point,color,count=12,target=null,size=.15){
 if(target)addSplat(point,color,size,target);else if(point.y<.45)addSplat(point,color,size*1.5);
 for(let i=0;i<count;i++){const m=new T.Mesh(particleGeo,new T.MeshBasicMaterial({color}));m.scale.set(.024+Math.random()*.025,.04+Math.random()*.035,.024);m.position.copy(point);scene.add(m);effects.push({m,life:1+Math.random()*.5,max:1.5,v:new T.Vector3((Math.random()-.5)*4,1+Math.random()*3,(Math.random()-.5)*4),type:'fluid',color});}
 while(effects.length>240)disposeEffect(effects.shift());
}
function bloodFX(body,point,count=10){if(!body?.buddy)return;fluidFX(point,'#a80e21',count,body.active?body:null,.095+count*.003);}
function splatFood(body,target,point){
 if(!body.active)return;const kind=body.kind,p=point||body.position.clone(),velocity=body.velocity.clone();removeProp(body);
 fluidFX(p,kind==='egg'?'#ffbd16':'#ef9fb9',16,target?.buddy?target:null,kind==='egg'?.21:.28);
 if(kind==='egg')for(let i=0;i<7;i++)createProp('shell',[p.x,p.y+.03,p.z],V(velocity.x*.12+(Math.random()-.5)*3,1+Math.random()*2,velocity.z*.12+(Math.random()-.5)*3));
 addScore(target?.buddy?35:12,Boolean(target?.buddy));shout(kind==='egg'?'EGG SPLAT!':'GELATO SPLASH!');soundFX('bump',.4);trimProps();
}
function processPhysicsEvents(){
 for(const e of physics.drainEvents()){
  if(e.type==='splat'){splatFood(e.body,e.other,e.point);continue;}
  if(e.type==='shatter'){shatterBottle(e.body,e.other,e.point);continue;}
  if(e.type==='embed'){embedShard(e.body,e.target,e.point);bloodFX(e.target,e.point,5);continue;}
  if(e.type==='detach'){
   for(const [body,pivot] of [[e.joint.bodyA,e.joint.pivotA],[e.joint.bodyB,e.joint.pivotB]]){const g=dynamic.get(body);if(g)ball(.09,.047,.09,pivot.x,pivot.y,pivot.z,mat('#687b7c',.38,.35),g);}
   bloodFX(e.body,e.point,18);impactFX(e.point,9,'#efd7aa');addScore(30,false);shout('LIMB BROKEN!');updateDamageStats();
  }else if(e.type==='destroy'){
   bloodFX(e.body,e.point,20);for(const s of [...splats])if(s.target===e.body){removeSplat(s);splats.splice(splats.indexOf(s),1);}
   const g=dynamic.get(e.body);if(g){scene.remove(g);disposeUnique(g);dynamic.delete(e.body);}
   embedded=embedded.filter(s=>s.target!==e.body);
   for(let i=0;i<8;i++){const b=createProp('debris',e.point.toArray(),V(e.velocity.x*.25+(Math.random()-.5)*4,2+Math.random()*3,e.velocity.z*.25+(Math.random()-.5)*4));const m=dynamic.get(b).children[0];m.material=e.body.name.startsWith('hand')?red:e.body.name.startsWith('arm')?(e.body.buddy.kind==='woman'?blue:shirt):skin;}
   addScore(40,false);shout('SMASHED!');updateDamageStats();trimProps();
  }else if(e.type==='damage'){
   const g=dynamic.get(e.body);if(g&&!g.userData.cracked&&e.body.health<65&&!['chest','hips','head'].includes(e.body.name)){g.userData.cracked=true;const z=e.body.size[2]/2+.008;for(let i=0;i<3;i++){const crack=box(.06,.01,.012,(i-1)*.027,(i%2)*.025,z,mat('#726951'),g);crack.rotation.z=(i%2?-.65:.65);}}
  }else if(e.type==='impact'&&time-lastFloorHit>.22){lastFloorHit=time;if(e.speed>4)bloodFX(e.body,e.point,7);addScore(Math.round(e.speed*2),false);impactFX(e.point,5,'#ffd69a');soundFX('bump',Math.min(1,e.speed/10));}
  else if(e.type==='clink'&&time-(e.body.lastSound||0)>.18){e.body.lastSound=time;soundFX('clink',Math.min(.7,e.speed/12));}
 }
}
createCharacter();stockKitchen();
function addScore(points,action=true){score+=points;if(action){hits++;combo=time-lastHit<2?combo+1:1;lastHit=time;$('#hits').textContent=`${hits} hit${hits===1?'':'s'}`;$('#combo').textContent=combo>1?`${combo}× COMBO`:'NICE ONE';}
 $('#score').textContent=String(score).padStart(4,'0');$('#meter-fill').style.width=Math.min(100,score/10)+'%';leaderboard.scoreChanged(score);$('#status').textContent=score>600?'Absolute kitchen chaos':score>150?'Things are heating up':'A little less tidy';}
function shout(s){clearTimeout(calloutTimer);$('#callout').textContent=s;$('#callout').classList.add('visible');calloutTimer=setTimeout(()=>$('#callout').classList.remove('visible'),850);}
function soundFX(type,level=1){if(!sound||!audio)return;try{const gain=audio.createGain();gain.connect(audio.destination);gain.gain.setValueAtTime(.12*level,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+(type==='boom'?.65:.17));if(type==='boom'||type==='bump'){
 const duration=type==='boom'?.7:.15,buffer=audio.createBuffer(1,audio.sampleRate*duration,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*3);const src=audio.createBufferSource();src.buffer=buffer;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=type==='boom'?250:650;src.connect(filter);filter.connect(gain);src.start();
 }else{const osc=audio.createOscillator();osc.type='triangle';osc.frequency.setValueAtTime(type==='clink'?1100:350,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(type==='clink'?180:90,audio.currentTime+.13);osc.connect(gain);osc.start();osc.stop(audio.currentTime+.17);}}catch{}}
const particleGeo=new T.IcosahedronGeometry(1,0);
function impactFX(p,count=10,color='#ffd78d'){for(let i=0;i<count;i++){const m=new T.Mesh(particleGeo,new T.MeshBasicMaterial({color,transparent:true}));m.scale.setScalar(.025+Math.random()*.04);m.position.copy(p);scene.add(m);effects.push({m,life:.3+Math.random()*.3,max:.6,v:new T.Vector3((Math.random()-.5)*4,Math.random()*3,(Math.random()-.5)*4),type:'spark'});}}
function explosion(bomb){const point=bomb.body.position.clone();removeProp(bomb.body);physics.blast(point);for(const buddy of physics.buddies){const b=buddy.named.chest;if(b.active&&b.position.distanceTo(point)<4)bloodFX(b,b.position,20);}addScore(80);shout('BOOM!');shake=.27;soundFX('boom');navigator.vibrate?.([25,20,40]);
 for(let i=0;i<25;i++){const m=new T.Mesh(sphereGeo,new T.MeshBasicMaterial({color:i%3===0?'#ffedaf':i%3===1?'#ff913c':'#e85723',transparent:true,opacity:.9,depthWrite:false}));m.position.copy(point);const size=.14+Math.random()*.2;m.scale.setScalar(size);scene.add(m);effects.push({m,life:.45+Math.random()*.3,max:.75,v:new T.Vector3((Math.random()-.5)*7,Math.random()*5,(Math.random()-.5)*7),type:'fire',size});}
 const shock=new T.Mesh(new T.SphereGeometry(1,24,16),new T.MeshBasicMaterial({color:'#ffcd7c',transparent:true,opacity:.38,wireframe:true,depthWrite:false}));shock.position.copy(point);scene.add(shock);effects.push({m:shock,life:.4,max:.4,type:'shock'});impactFX(point,25,'#ffdb71');
 const light=new T.PointLight('#ffa335',80,9,2);light.position.copy(point);scene.add(light);effects.push({m:light,life:.24,max:.24,type:'light'});
}
function gloveFX(p,dir){const g=new T.Group();const m=ball(.23,.24,.23,0,0,0,red,g);ball(.11,.14,.14,-.17,0,.08,red,g);cyl(.16,.16,.19,0,-.24,0,mat('#f2d5bc'),g);g.position.copy(p);scene.add(g);gloves.push({g,life:.2,max:.2,dir:new T.Vector3(dir.x,dir.y,dir.z)});}
const raycaster=new T.Raycaster(),ndc=new T.Vector2(),floorPlane=new T.Plane(new T.Vector3(0,1,0),-.3),dragPlane=new T.Plane();
function ray(x,y){const r=canvas.getBoundingClientRect();ndc.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);raycaster.setFromCamera(ndc,camera);}
function hitObject(){const objects=[...dynamic.values()];const intersections=raycaster.intersectObjects(objects,true);for(const hit of intersections){let o=hit.object;while(o&&!o.userData.body)o=o.parent;if(o)return{body:o.userData.body,point:hit.point};}return null;}
function groundTarget(){const p=new T.Vector3();raycaster.ray.intersectPlane(floorPlane,p);if(!Number.isFinite(p.x)||p.length()>30)return new T.Vector3(0,.3,.6);p.x=T.MathUtils.clamp(p.x,-4.2,4.2);p.z=T.MathUtils.clamp(p.z,-2,4.2);return p;}
function doPunch(hit){const body=hit?.body||physics.named.chest;if(!body?.active)return;const p=hit?.point||new T.Vector3().copy(body.position);const dir=new T.Vector3().subVectors(p,camera.position).normalize();dir.y=.7;dir.normalize();physics.punch(body,V(p.x,p.y,p.z),V(dir.x,dir.y,dir.z));addScore(10);bloodFX(body,p,12);impactFX(p,12);gloveFX(p,dir);shake=.065;soundFX('bump');navigator.vibrate?.(12);if(combo>2)shout(combo>6?'UNSTOPPABLE!':`${combo} HIT COMBO!`);}
function fireTool(hit){if(time-lastShot<.12)return;lastShot=time;if(tool==='punch'){if(hit)doPunch(hit);else shout('AIM AT YOUR BUDDY');return;}
 const p=hit?.point?.clone()||groundTarget();if(tool==='bomb'){p.y+=.5;const b=createProp('bomb',[p.x,p.y,p.z]);b.velocity.set(0,1,0);soundFX('tick');return;}
 if(['pan','bottle','rolling','gelato','egg'].includes(tool)){
  const start=new T.Vector3().copy(camera.position).lerp(p,.52);start.x=T.MathUtils.clamp(start.x,-3.8,3.8);start.z=Math.min(4,start.z);start.y=T.MathUtils.clamp(start.y,1.2,3.6);const dir=p.clone().sub(start).normalize();const b=createProp(tool,start.toArray(),V(dir.x*17,dir.y*17+1,dir.z*17));addScore(5);soundFX('tick',.3);
  b.thrown=true;
 }
 trimProps();
}
function trimProps(){
 const fragments=physics.props.filter(b=>['shard','debris','shell'].includes(b.kind)&&physics.drag?.body!==b);
 while(fragments.length>64)removeProp(fragments.shift());
 const removable=physics.props.filter(b=>!['bomb','shard','debris','shell'].includes(b.kind)&&physics.drag?.body!==b);
 while(removable.length>35)removeProp(removable.shift());
}
function cancelPointer(){clearTimeout(holdTimer);holdTimer=null;physics.endDrag();pointer=null;canvas.style.cursor=tool==='grab'?'grab':'crosshair';}
function startPointerDrag(){
 if(!pointer?.hit?.body.active||pointer.dragging)return;
 clearTimeout(holdTimer);holdTimer=null;
 const point=pointer.hit.body.pointToWorldFrame(pointer.localPoint),p=new T.Vector3(point.x,point.y,point.z);
 const normal=new T.Vector3();camera.getWorldDirection(normal);dragPlane.setFromNormalAndCoplanarPoint(normal,p);
 physics.beginDrag(pointer.hit.body,point);pointer.dragging=true;pointer.last.copy(p);pointer.stamp=performance.now();canvas.style.cursor='grabbing';$('#hint').textContent='Keep holding to drag · Release to fling';
}
function onPointerDown(e){
 if(pointer||e.button>0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});audio?.resume();ray(e.clientX,e.clientY);scene.updateMatrixWorld(true);const hit=hitObject();
 pointer={id:e.pointerId,hit,localPoint:hit?hit.body.pointToLocalFrame(V(...hit.point.toArray())):null,startX:e.clientX,startY:e.clientY,last:new T.Vector3(),stamp:performance.now(),velocity:V(),dragging:false};
 if(tool==='grab'){if(hit)startPointerDrag();else shout('GRAB A BUDDY OR OBJECT');}
 else if(hit)holdTimer=setTimeout(startPointerDrag,240);
}
function onPointerMove(e){
 if(!pointer||pointer.id!==e.pointerId)return;e.preventDefault();
 if(!pointer.dragging&&pointer.hit&&Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)>7)startPointerDrag();
 if(!pointer.dragging)return;ray(e.clientX,e.clientY);const p=new T.Vector3();if(!raycaster.ray.intersectPlane(dragPlane,p))return;
 p.x=T.MathUtils.clamp(p.x,-4.3,4.3);p.y=T.MathUtils.clamp(p.y,.15,5);p.z=T.MathUtils.clamp(p.z,-2.2,4);
 const now=performance.now(),dt=Math.max(.016,(now-pointer.stamp)/1000),v=p.clone().sub(pointer.last).divideScalar(dt);
 pointer.velocity=V(v.x,v.y,v.z);pointer.last.copy(p);pointer.stamp=now;physics.moveDrag(V(...p.toArray()));
}
function releasePointer(e){
 if(!pointer||pointer.id!==e.pointerId)return;e.preventDefault();clearTimeout(holdTimer);holdTimer=null;
 if(pointer.dragging){const velocity=performance.now()-pointer.stamp<120?pointer.velocity:undefined;physics.endDrag(velocity);if(velocity&&velocity.length()>2){addScore(15);soundFX('tick',.2);}}
 else if(tool!=='grab'){ray(e.clientX,e.clientY);const hit=pointer.hit?.body.active?pointer.hit:hitObject();fireTool(hit);}
 pointer=null;canvas.style.cursor=tool==='grab'?'grab':'crosshair';updateHint();
}
canvas.addEventListener('pointerdown',onPointerDown);
canvas.addEventListener('pointermove',onPointerMove);
canvas.addEventListener('pointerup',releasePointer);
canvas.addEventListener('pointercancel',()=>{cancelPointer();updateHint();});
canvas.addEventListener('lostpointercapture',()=>{if(pointer){cancelPointer();updateHint();}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('blur',cancelPointer);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelPointer();});
const hints={grab:'Drag any part, even broken limbs',punch:'Tap to punch · Hold to drag',bomb:'Tap to bomb · Hold to drag',pan:'Tap to throw · Hold to drag',bottle:'Tap to shatter · Hold to drag',rolling:'Tap to throw · Hold to drag',gelato:'Tap to splat gelato · Hold to drag',egg:'Tap to crack an egg · Hold to drag'};
function updateHint(){$('#hint').textContent=hints[tool];}
function selectTool(next){if(!Object.hasOwn(hints,next))throw new Error('Unknown tool');cancelPointer();tool=next;$$('[data-tool]').forEach(b=>{const active=b.dataset.tool===tool;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});updateHint();canvas.style.cursor=tool==='grab'?'grab':'crosshair';}
function selectBuddy(next){if(!['man','woman','both'].includes(next))throw new Error('Unknown buddy');buddy=next;pointer=null;createCharacter();$$('[data-buddy]').forEach(b=>{const active=b.dataset.buddy===buddy;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});shout('READY FOR ROUND TWO');}
$$('[data-tool]').forEach(b=>b.onclick=()=>selectTool(b.dataset.tool));$$('[data-buddy]').forEach(b=>b.onclick=()=>selectBuddy(b.dataset.buddy));
function standUp(){createCharacter();shout('BUDDIES REPAIRED');}
function resetKitchen(){leaderboard.captureScore();clearSplats();for(const b of [...physics.props])removeProp(b);bombs=[];for(const fx of effects)disposeEffect(fx);effects.length=0;gloves.forEach(f=>{scene.remove(f.g);disposeUnique(f.g);});gloves=[];pointer=null;score=0;hits=0;combo=0;lastHit=-10;$('#score').textContent='0000';$('#hits').textContent='0 hits';$('#combo').textContent='LET IT FLY';$('#status').textContent='Kitchen is suspiciously tidy';$('#meter-fill').style.width='0';createCharacter();stockKitchen();shout('FRESH KITCHEN');}
$('#stand').onclick=standUp;$('#reset').onclick=resetKitchen;
$('#slow').onclick=()=>{slow=!slow;$('#slow').setAttribute('aria-pressed',String(slow));$('#slow span').textContent=slow?'0.25× speed':'Slow mo';};
$('#sound').onclick=()=>{sound=!sound;if(sound&&!audio){try{audio=new(window.AudioContext||window.webkitAudioContext)();}catch{sound=false;}}audio?.resume();$('#sound').setAttribute('aria-pressed',String(sound));$('#sound').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');$('#sound').innerHTML=sound?'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>':'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6m0-6-5 6"/></svg>';if(sound)soundFX('clink',.3);};
$('#help').onclick=()=>{cancelPointer();$('#help-dialog').showModal();paused=true;};function closeHelp(){$('#help-dialog').close();paused=false;}$('#close-help').onclick=closeHelp;$('#play').onclick=closeHelp;$('#help-dialog').addEventListener('close',()=>paused=false);
window.addEventListener('keydown',e=>{if($('#help-dialog').open||$('#leaderboard-dialog').open||e.target.closest?.('input,textarea,select'))return;if(e.target instanceof HTMLButtonElement&&e.code==='Space')return;const n=Number(e.key);if(n>=1&&n<=8)selectTool(Object.keys(hints)[n-1]);if(e.code==='Space'){e.preventDefault();doPunch();}if(e.key.toLowerCase()==='r')standUp();if(e.key.toLowerCase()==='b'){const p=physics.named.hips.position;createProp('bomb',[p.x,.5,p.z+.4]);}});
const baseCamera=new T.Vector3();
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;const mobile=w/h<.8;camera.fov=mobile?46:40;const dist=mobile?Math.max(10,6.2/(w/h)):11.2;baseCamera.set(mobile?3.1:6.1,mobile?5.2:5.6,dist);camera.position.copy(baseCamera);camera.lookAt(0,mobile?1.42:1.6,-.6);camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();
function disposeEffect(fx){scene.remove(fx.m);if(fx.m.material)fx.m.material.dispose();if(fx.type==='shock')fx.m.geometry.dispose();}
let last=performance.now();let frames=0,elapsed=0;
function animate(now){requestAnimationFrame(animate);const realDt=Math.min(.05,(now-last)/1000);last=now;if(document.hidden||paused)return;const dt=realDt*(slow?.25:1);time+=dt;
 for(const s of [...splats])if(time>s.expires||s.target&&!s.target.active){removeSplat(s);splats.splice(splats.indexOf(s),1);}
 physics.step(dt);processPhysicsEvents();for(const [b,g] of dynamic){g.position.copy(b.position);g.quaternion.copy(b.quaternion);}
 for(let i=bombs.length-1;i>=0;i--){const b=bombs[i];b.ember.scale.setScalar(.022+Math.abs(Math.sin(time*20))*.025);if(time>b.end){explosion(b);bombs.splice(i,1);}else if(Math.random()<dt*24){const p=b.body.position.clone();p.y+=.3;impactFX(p,1,'#ffb94c');}}
 for(let i=effects.length-1;i>=0;i--){const f=effects[i];f.life-=dt;if(f.life<=0){disposeEffect(f);effects.splice(i,1);continue;}const k=f.life/f.max;if(f.type==='light'){f.m.intensity=80*k;}else{f.m.material.opacity=k*(f.type==='shock'?.25:1);if(f.type==='shock'){f.m.scale.setScalar((1-k)*5+.1);}else{f.m.position.addScaledVector(f.v,dt);f.v.y-=dt*(f.type==='fluid'?9.8:f.type==='spark'?5:.8);if(f.type==='fluid'&&f.m.position.y<.028){addSplat(f.m.position,f.color,.035+Math.random()*.045);f.life=0;}if(f.type==='fire')f.m.scale.setScalar(f.size*(2-k));}}}
 for(let i=gloves.length-1;i>=0;i--){const f=gloves[i];f.life-=dt;f.g.position.addScaledVector(f.dir,-dt*3);f.g.scale.setScalar(Math.max(.001,f.life/f.max));if(f.life<=0){scene.remove(f.g);disposeUnique(f.g);gloves.splice(i,1);}}
 shake=Math.max(0,shake-realDt);camera.position.copy(baseCamera);if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&shake>0){camera.position.x+=(Math.random()-.5)*shake*.7;camera.position.y+=(Math.random()-.5)*shake*.5;}
 if(combo>0&&time-lastHit>2.5){combo=0;$('#combo').textContent=score?'KEEP IT GOING':'LET IT FLY';}
 for(const b of [...physics.props])if(b.position.y< -3||(b.expires&&time>b.expires&&physics.drag?.body!==b))removeProp(b);
 if(physics.parts.some(b=>!Number.isFinite(b.position.x)||b.position.y< -4)){createCharacter();}
 renderer.render(scene,camera);frames++;elapsed+=realDt;if(elapsed>5){if(frames/elapsed<32&&renderer.getPixelRatio()>1){renderer.setPixelRatio(1);resize();}elapsed=0;frames=0;}
}
requestAnimationFrame(animate);selectTool('punch');
requestAnimationFrame(()=>{$('#loader').style.opacity='0';setTimeout(()=>$('#loader').remove(),450);});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;$('#error').hidden=false;});
// Progressive enhancement: browser agents use the exact same UI actions.
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
 for(const spec of [{name:'configure_kitchen_game',title:'Choose buddy and tool',description:'Switch the active buddy or tool in the kitchen sandbox. Choose one buddy or both together. Changing selection repairs them.',inputSchema:{type:'object',properties:{buddy:{type:'string',enum:['man','woman','both']},tool:{type:'string',enum:Object.keys(hints)}},additionalProperties:false},execute(input){if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['buddy','tool'].includes(k))||(Object.hasOwn(input,'buddy')&&!['man','woman','both'].includes(input.buddy))||(Object.hasOwn(input,'tool')&&!Object.hasOwn(hints,input.tool)))throw new Error('Invalid game options');if(input.buddy)selectBuddy(input.buddy);if(input.tool)selectTool(input.tool);return{buddy,tool};}},{name:'reset_kitchen_game',title:'Reset kitchen',description:'Restore the kitchen and buddy and clear the current score.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute(input){if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected empty options');resetKitchen();return{score,hits,buddy};}}]){try{Promise.resolve(document.modelContext.registerTool({...spec,annotations:{readOnlyHint:false,untrustedContentHint:false}},{signal:lifecycle.signal})).catch(()=>{});}catch{}}
}
