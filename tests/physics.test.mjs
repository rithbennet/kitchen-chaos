import test from 'node:test';
import assert from 'node:assert/strict';
import { KitchenPhysics, V } from '../public/physics.js';
function kitchen(mode='both'){
 const p=new KitchenPhysics();
 for(const [pos,size] of [[[0,-.19,0],[10,.35,10]],[[0,2.6,-3.8],[10,5.6,.22]],[[-5,2.6,0],[.2,5.6,10]],[[5,2.6,0],[.2,5.6,10]],[[0,2.7,5],[10,6,.2]],[[0,6,0],[10,.2,10]]])p.wall(pos,size);
 p.createBuddy(mode);return p;
}
function step(p,n=120){for(let i=0;i<n;i++)p.step(1/120);}
test('both buddies have separate bodies, joints and collision groups',()=>{
 const p=kitchen();assert.equal(p.parts.length,30);assert.equal(p.joints.length,28);assert.deepEqual(p.buddies.map(b=>b.kind),['man','woman']);
 const a=p.buddies[0].named.chest,b=p.buddies[1].named.chest;assert.ok(a.collisionFilterMask & b.collisionFilterGroup);assert.ok(b.collisionFilterMask & a.collisionFilterGroup);
 p.release(a);assert.equal(p.buddies[0].held,false);assert.equal(p.buddies[1].held,true);step(p,60);assert.ok(p.buddies[1].named.head.position.y>2.9);
});
test('three targeted punches detach a limb; more hits destroy it',()=>{
 const p=kitchen(),arm=p.named.armL;for(let i=0;i<3;i++)p.punch(arm,arm.position.clone(),V(0,.4,-1));assert.equal(arm.detached,true);assert.equal(p.joints.length,27);assert.ok(p.parts.includes(arm));assert.equal(arm.collisionFilterGroup,4);
 p.damage(arm,70);assert.equal(arm.active,false);assert.equal(p.parts.includes(arm),false);assert.equal(p.named.foreL.detached,true);assert.ok(!p.world.constraints.some(j=>j.bodyA===arm||j.bodyB===arm));
 const events=p.drainEvents();assert.ok(events.some(e=>e.type==='detach'));assert.ok(events.some(e=>e.type==='destroy'));
});
test('bomb blasts damage both buddies and move kitchen objects',()=>{
 const p=kitchen(),b=p.prop('pan',[0,1,1]);p.blast(V(0,1,.4));assert.ok(p.buddies.every(c=>!c.held));assert.ok(p.buddies.every(c=>c.parts.some(b=>b.detached)));assert.ok(b.velocity.length()>1);step(p,600);assert.ok([...p.parts,...p.props].every(b=>Number.isFinite(b.position.x)&&b.position.y>-.3));
});
test('detached limbs remain draggable, including after the joint breaks',()=>{
 const p=kitchen(),hand=p.named.handL;p.beginDrag(hand,hand.position.clone());p.damage(hand,110);assert.equal(p.drag.body,hand);assert.ok(hand.detached);p.moveDrag(V(-1,3,1));step(p,120);assert.ok(hand.position.distanceTo(V(-1,3,1))<.15);p.endDrag(V(4,2,0));assert.equal(p.drag,null);assert.ok(hand.velocity.x>3);
});
test('stationary kitchen bottles stay intact; thrown bottles shatter on impact',()=>{
 const p=kitchen('man'),bottle=p.prop('bottle',[2,2,1],V(0,-8,0));step(p,80);const events=p.drainEvents().filter(e=>e.type==='shatter');assert.equal(events.length,1);assert.equal(events[0].body,bottle);assert.ok(events[0].speed>3.2);
 const p2=kitchen('man'),rest=p2.prop('bottle',[2,.4,1]);step(p2,120);assert.equal(p2.drainEvents().filter(e=>e.type==='shatter').length,0);assert.equal(rest.active,true);
});
test('fast glass fragments hitting a buddy request attachment',()=>{
 const p=kitchen('man'),shard=p.prop('shard',[0,2.23,1.1],V(0,0,-12));step(p,12);const hit=p.drainEvents().find(e=>e.type==='embed');assert.ok(hit);assert.equal(hit.body,shard);assert.equal(hit.target.buddy.kind,'man');assert.ok(Number.isFinite(hit.point.z));
});
test('repair removes broken-body constraints and restores the selected pair',()=>{
 const p=kitchen();p.damage(p.named.armR,105);p.damage(p.named.armR,80);p.beginDrag(p.named.handL,p.named.handL.position.clone());p.createBuddy('both');assert.equal(p.drag,null);assert.equal(p.parts.length,30);assert.equal(p.joints.length,28);assert.equal(p.world.constraints.length,28);assert.equal(p.world.bodies.length,36);assert.ok(p.parts.every(b=>b.active&&!b.detached&&b.health===100));assert.equal(p.drainEvents().length,0);
});
test('switching and repeated repairs do not accumulate physics objects',()=>{
 const p=kitchen();for(const mode of ['man','woman','both','man','both']){p.createBuddy(mode);p.blast(V(0,.4,.5));step(p,40);p.createBuddy(mode);const count=mode==='both'?30:15;assert.equal(p.parts.length,count);assert.equal(p.world.bodies.length,count+6);assert.equal(p.world.constraints.length,mode==='both'?28:14);}
});
test('thrown eggs and gelato splat once at a real collision point',()=>{
 for(const kind of ['egg','gelato']){const p=kitchen('man'),b=p.prop(kind,[0,2.23,1.2],V(0,0,-12));step(p,24);const events=p.drainEvents().filter(e=>e.type==='splat');assert.equal(events.length,1);assert.equal(events[0].body,b);assert.equal(events[0].other.buddy?.kind,'man');assert.ok(events[0].point.z<1);}
});
test('explosions splat food and eggshell fragments have bounded physics',()=>{
 const p=kitchen('man');for(const kind of ['egg','gelato'])p.prop(kind,[0,1,1]);p.blast(V(0,1,0));assert.equal(p.drainEvents().filter(e=>e.type==='splat').length,2);const shell=p.prop('shell',[1,1,1],V(2,1,0));step(p,120);assert.ok(Number.isFinite(shell.position.x));assert.ok(shell.position.y>-.1);
});
