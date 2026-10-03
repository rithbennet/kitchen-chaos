import * as C from './vendor/cannon-es.js';
export { C };
export const V=(x=0,y=0,z=0)=>new C.Vec3(x,y,z);
export class KitchenPhysics {
 constructor(){
  this.world=new C.World({gravity:V(0,-9.81,0),allowSleep:true});
  this.world.broadphase=new C.SAPBroadphase(this.world);this.world.solver.iterations=18;this.world.solver.tolerance=.001;
  Object.assign(this.world.defaultContactMaterial,{friction:.45,restitution:.25,contactEquationStiffness:1e7,contactEquationRelaxation:4});
  this.parts=[];this.joints=[];this.props=[];this.buddies=[];this.drag=null;this.clock=0;this.events=[];this.collisions=new Map();
 }
 get held(){return this.buddies.every(b=>b.held);}
 get named(){return this.buddies[0]?.named||{};}
 wall(pos,size){const b=new C.Body({mass:0,position:V(...pos),shape:new C.Box(V(...size.map(v=>v/2))),collisionFilterGroup:1});this.world.addBody(b);return b;}
 makeBody({pos,size,radius,mass=1,group=4}){
  const mask=group===2?29:group===8?23:group===16?15:31;
  const b=new C.Body({mass,position:V(...pos),shape:radius?new C.Sphere(radius):new C.Box(V(...size.map(v=>v/2))),linearDamping:.06,angularDamping:.18,collisionFilterGroup:group,collisionFilterMask:mask,sleepSpeedLimit:.12,sleepTimeLimit:1});
  this.world.addBody(b);b.active=true;
  b.addEventListener('collide',e=>{
   const speed=Math.abs(e.contact.getImpactVelocityAlongNormal());if(speed<1.6)return;
   const contact=e.contact;const offset=contact.bi===b?contact.ri:contact.rj;const point=b.position.vadd(offset);
   const previous=this.collisions.get(b.id);if(!previous||speed>previous.speed)this.collisions.set(b.id,{body:b,other:e.body,speed,point});
  });return b;
 }
 clearBuddies(){
  this.endDrag();for(const j of this.joints)this.world.removeConstraint(j);for(const b of this.parts){this.world.removeBody(b);b.active=false;}
  this.parts=[];this.joints=[];this.buddies=[];this.collisions.clear();this.events=[];
 }
 createBuddy(mode='man'){
  this.clearBuddies();const kinds=mode==='both'?['man','woman']:[mode];
  for(let index=0;index<kinds.length;index++){
   const offset=kinds.length===2?(index===0?-.88:.88):0;
   const record={kind:kinds[index],held:true,parts:[],named:{},offset};this.buddies.push(record);
   const specs=[
    ['head',[0,3.23,.4],[.78,.84,.68],4,.38],['chest',[0,2.51,.4],[.64,.83,.39],8],['hips',[0,1.94,.4],[.61,.33,.37],4],
    ['armL',[-.49,2.51,.4],[.22,.61,.25],1.3],['foreL',[-.55,1.98,.43],[.19,.48,.21],1],['handL',[-.57,1.64,.46],[.28,.3,.29],.8,.15],
    ['armR',[.49,2.51,.4],[.22,.61,.25],1.3],['foreR',[.55,1.98,.43],[.19,.48,.21],1],['handR',[.57,1.64,.46],[.28,.3,.29],.8,.15],
    ['thighL',[-.18,1.46,.4],[.26,.64,.28],2.5],['shinL',[-.18,.82,.4],[.23,.61,.25],1.8],['footL',[-.18,.39,.49],[.28,.24,.43],1],
    ['thighR',[.18,1.46,.4],[.26,.64,.28],2.5],['shinR',[.18,.82,.4],[.23,.61,.25],1.8],['footR',[.18,.39,.49],[.28,.24,.43],1]
   ];
   for(const [name,pos,size,mass,radius] of specs){pos[0]+=offset;pos[1]-=.265;const body=this.makeBody({pos,size,mass,radius,group:index===0?2:8});Object.assign(body,{name,buddy:record,initial:V(...pos),size,health:100,detached:false,lastDamage:-10});this.parts.push(body);record.parts.push(body);record.named[name]=body;}
   const joint=(a,b,p,angle=.7,twist=.25)=>{const ba=record.named[a],bb=record.named[b],point=V(p[0]+offset,p[1]-.265,p[2]);const c=new C.ConeTwistConstraint(ba,bb,{pivotA:ba.pointToLocalFrame(point),pivotB:bb.pointToLocalFrame(point),axisA:V(0,1,0),axisB:V(0,1,0),angle,twistAngle:twist,collideConnected:false,maxForce:2e4});c.child=bb;c.active=true;c.breakable=b!=='chest';bb.parentJoint=c;this.world.addConstraint(c);this.joints.push(c);};
   joint('chest','head',[0,2.94,.4],.55,.4);joint('hips','chest',[0,2.10,.4],.4,.2);
   for(const side of ['L','R']){const s=side==='L'?-1:1;joint('chest','arm'+side,[s*.39,2.76,.4],1.5,.8);joint('arm'+side,'fore'+side,[s*.53,2.22,.4],1.1,.1);joint('fore'+side,'hand'+side,[s*.57,1.73,.44],.65,.4);joint('hips','thigh'+side,[s*.18,1.79,.4],.9,.3);joint('thigh'+side,'shin'+side,[s*.18,1.14,.4],.75,.1);joint('shin'+side,'foot'+side,[s*.18,.51,.4],.45,.15);}
  }
  return this.parts;
 }
 release(body){for(const buddy of body?(body.buddy?[body.buddy]:[]):this.buddies){buddy.held=false;buddy.parts.filter(b=>b.active).forEach(b=>b.wakeUp());}}
 breakJoint(joint){
  if(!joint?.active||!joint.breakable)return false;
  this.release(joint.child);this.world.removeConstraint(joint);joint.active=false;this.joints=this.joints.filter(j=>j!==joint);
  joint.child.detached=true;joint.child.health=65;
  const loose=[joint.child];
  for(let i=0;i<loose.length;i++)for(const childJoint of this.joints)if(childJoint.active&&childJoint.bodyA===loose[i]&&!loose.includes(childJoint.bodyB))loose.push(childJoint.bodyB);
  for(const body of loose){body.collisionFilterGroup=4;body.collisionFilterMask=31;body.wakeUp();}
  this.events.push({type:'detach',body:joint.child,joint,point:joint.bodyB.pointToWorldFrame(joint.pivotB)});return true;
 }
 damage(body,amount){
  if(!body?.active||!body.buddy||['chest','hips'].includes(body.name)||amount<=0)return;
  body.health-=amount;this.events.push({type:'damage',body});
  if(body.health>0)return;
  if(body.detached||!body.parentJoint?.active){this.destroyPart(body);return;}
  this.breakJoint(body.parentJoint);
 }
 destroyPart(body){
  if(!body.active)return;this.release(body);const point=body.position.clone(),velocity=body.velocity.clone();
  for(const j of [...this.joints])if(j.bodyA===body||j.bodyB===body)this.breakJoint(j);
  if(this.drag?.body===body)this.endDrag();this.world.removeBody(body);body.active=false;
  this.parts=this.parts.filter(b=>b!==body);this.events.push({type:'destroy',body,point,velocity});
 }
 prop(type,pos,velocity){
  const configs={pan:{size:[.65,.15,.65],mass:2},bottle:{size:[.23,.72,.23],mass:.8},rolling:{size:[.78,.15,.15],mass:1.2},plate:{size:[.52,.06,.52],mass:.6},orange:{radius:.13,mass:.2},bomb:{radius:.22,mass:1.5},egg:{radius:.12,mass:.18},gelato:{radius:.20,mass:.35},shell:{radius:.035,mass:.015,group:16},shard:{radius:.045,mass:.035,group:16},debris:{size:[.09,.1,.09],mass:.07,group:16}};
  if(!configs[type])throw new Error('Unknown prop');const b=this.makeBody({pos,...configs[type]});b.kind=type;if(velocity)b.velocity.copy(velocity);this.props.push(b);return b;
 }
 removeProp(body){if(this.drag?.body===body)this.endDrag();this.world.removeBody(body);body.active=false;this.props=this.props.filter(b=>b!==body);}
 blast(point){
  let count=0;
  for(const b of [...this.parts,...this.props]){
   const dir=b.position.vsub(point),d=dir.length();if(d>5.5)continue;this.release(b);dir.y+=.7;dir.normalize();b.wakeUp();b.applyImpulse(dir.scale(Math.max(0,1-d/5.5)*14*b.mass));b.angularVelocity.vadd(V((Math.random()-.5)*5,(Math.random()-.5)*5,(Math.random()-.5)*5),b.angularVelocity);count++;
   if(b.buddy)this.damage(b,Math.max(0,1-d/4.5)*180);
   if(b.kind==='bottle'&&d<3.7&&!b.shatterQueued){b.shatterQueued=true;this.events.push({type:'shatter',body:b,point:b.position.clone()});}
   if(['egg','gelato'].includes(b.kind)&&d<3.7&&!b.splatQueued){b.splatQueued=true;this.events.push({type:'splat',body:b,point:b.position.clone()});}
  }
  return count;
 }
 punch(body,point,direction){if(!body?.active)return;this.release(body);body.applyImpulse(direction.scale(body.mass*5.7),point.vsub(body.position));this.damage(body,45);if(body.kind==='bottle'&&!body.shatterQueued){body.shatterQueued=true;this.events.push({type:'shatter',body,point:body.position.clone()});}}
 beginDrag(body,point){
  this.endDrag();if(!body?.active)return;this.release(body);body.wakeUp();const anchor=new C.Body({mass:0,type:C.Body.KINEMATIC,position:point.clone(),collisionFilterGroup:0,collisionFilterMask:0});this.world.addBody(anchor);
  const constraint=new C.PointToPointConstraint(body,body.pointToLocalFrame(point),anchor,V(),16000);this.world.addConstraint(constraint);this.drag={body,anchor,constraint};
 }
 moveDrag(p){if(!this.drag)return;this.drag.anchor.position.copy(p);this.drag.anchor.velocity.set(0,0,0);this.drag.body.wakeUp();}
 endDrag(velocity){if(!this.drag)return;const {anchor,constraint,body}=this.drag;if(velocity){const len=velocity.length();body.velocity.copy(len>16?velocity.scale(16/len):velocity);}this.world.removeConstraint(constraint);this.world.removeBody(anchor);this.drag=null;}
 step(dt){
  this.clock+=dt;
  for(const buddy of this.buddies)if(buddy.held)for(const b of buddy.parts){if(!b.active)continue;b.position.copy(b.initial);b.velocity.set(0,0,0);b.angularVelocity.set(0,0,0);b.quaternion.set(0,0,0,1);}
  this.world.step(1/120,Math.min(dt,.05),6);
  for(const hit of this.collisions.values()){
   const {body,other,speed,point}=hit;if(!body.active)continue;
   if(body.buddy){if(speed>2.8&&other.mass>0)this.release(body);if(!body.buddy.held&&speed>3.2)this.events.push({type:'impact',...hit});
    if(!body.buddy.held&&speed>5.2&&this.clock-body.lastDamage>.22){body.lastDamage=this.clock;this.damage(body,(speed-3)*(other.mass>0?4:2));}}
   if(body.kind==='bottle'&&speed>3.2&&!body.shatterQueued){body.shatterQueued=true;this.events.push({type:'shatter',...hit});}
   if(['egg','gelato'].includes(body.kind)&&speed>1.8&&!body.splatQueued){body.splatQueued=true;this.events.push({type:'splat',...hit});}
   if(body.kind==='shard'&&other.buddy&&other.active&&speed>1.8&&!body.embedQueued){body.embedQueued=true;this.events.push({type:'embed',body,target:other,point});this.release(other);this.damage(other,5);}
   if(body.kind&&body.kind!=='shard'&&body.kind!=='debris'&&speed>2.4)this.events.push({type:'clink',...hit});
  }
  this.collisions.clear();
  for(const b of [...this.parts,...this.props]){
   // Recover the rare high-speed contact that tunnels through the room shell.
   const margin=Math.min(.5,b.boundingRadius||.1);
   if(b.position.y<-.02){b.position.y=margin+.025;b.velocity.y=Math.abs(b.velocity.y)*.2;b.aabbNeedsUpdate=true;}
   for(const [axis,lo,hi] of [['x',-4.95,4.95],['z',-3.69,4.95]])if(b.position[axis]<lo||b.position[axis]>hi){b.position[axis]=Math.max(lo+margin,Math.min(hi-margin,b.position[axis]));b.velocity[axis]*=-.2;b.aabbNeedsUpdate=true;}
   const speed=b.velocity.length();if(speed>24)b.velocity.scale(24/speed,b.velocity);const a=b.angularVelocity.length();if(a>22)b.angularVelocity.scale(22/a,b.angularVelocity);
  }
 }
 drainEvents(){return this.events.splice(0);}
 resetProps(){this.endDrag();for(const b of [...this.props])this.removeProp(b);}
}
