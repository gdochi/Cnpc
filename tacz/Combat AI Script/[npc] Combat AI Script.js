var SPEC={
  range:{cat:"tacz:modern_kinetic_gun",model:"tacz:glock_17",bullet:"minecraft:stone_button"},
  fire:{delay:5,accuracy:[10,90],count:1,damage:3},
  melee:{model:"minecraft:wooden_sword",damage:1},
  grenade:{fuse:100,power:1.1,angle:65,range:[5,20],search:5,hpratio:0.5,cooldown:200,throwableId:"lrtactical:m67",itemId:"lrtactical:throwable"},
  speed:{default:3,close:3,range:0}
}
var DIST={range:50,melee:3,yLimit:2}
//////////////////////////////////////////////////////////////////////////////////////////
var TID={AI:1,SHOOT:2};
var GUN=null,MELEE=null,BULLET=null;
var API=Java.type("noppes.npcs.api.NpcAPI").Instance();
var GrenadeEntity      = Java.type("me.xjqsh.lrtactical.entity.GrenadeEntity");
var SmokeGrenadeEntity = Java.type("me.xjqsh.lrtactical.entity.SmokeGrenadeEntity");
var StunGrenadeEntity  = Java.type("me.xjqsh.lrtactical.entity.StunGrenadeEntity");
function init(e){
var n=e.npc,w=n.getWorld(),inv=n.getInventory();
var gunNbt=API.stringToNbt('{id:"'+SPEC.range.cat+'",Count:1b,tag:{GunId:"'+SPEC.range.model+'"}}');
GUN=w.createItemFromNbt(gunNbt);MELEE=w.createItem(SPEC.melee.model,1);BULLET=w.createItem(SPEC.range.bullet,1);
inv.setLeftHand(MELEE);inv.setRightHand(GUN);
n.stats.getMelee().setStrength(SPEC.melee.damage)
n.stats.getRanged().setStrength(SPEC.fire.damage)
n.ai.setWalkingSpeed(SPEC.speed.default)
n.updateClient();
n.timers.forceStart(TID.AI,10,true);
}
function timer(e){
var n=e.npc,target=n.getAttackTarget();
if(e.id==TID.AI){
if(!target){switchWeapon(n,"range");return;}
var d=getCombatData(n,target);
if(d.dist<=DIST.melee){
if(d.dy>=DIST.yLimit){switchWeapon(n,"range");n.getAi().setWalkingSpeed(SPEC.speed.range);if(!n.timers.has(TID.SHOOT))n.timers.forceStart(TID.SHOOT,1,false);return;}
switchWeapon(n,"melee");n.getAi().setWalkingSpeed(SPEC.speed.close);return;}
if(d.dist>DIST.melee&&d.dist<=DIST.range){
switchWeapon(n,"range");
if(shouldThrowGrenade(n)){throwGrenade(n);n.tempdata.put("lastThrowTick",n.getWorld().getTotalTime());}
n.getAi().setWalkingSpeed(SPEC.speed.range);
if(!n.timers.has(TID.SHOOT))n.timers.forceStart(TID.SHOOT,1,false);}}
if(e.id==TID.SHOOT){
if(!target||!n.canSeeEntity(target))return;
var d=getCombatData(n,target);
if(d.dist>DIST.range)return;
if(d.dist<=DIST.melee&&d.dy<DIST.yLimit)return;
for(var i=0;i<SPEC.fire.count;i++){var acc=getRandomAccuracy();var p=n.shootItem(target,BULLET,acc);if(p)p.enableEvents();}
n.timers.forceStart(TID.SHOOT,SPEC.fire.delay,false);}}

function getRandomAccuracy(){var min=SPEC.fire.accuracy[0],max=SPEC.fire.accuracy[1];return Math.floor(Math.random()*(max-min+1))+min;}
function getCombatData(n,t){var np=n.getPos(),tp=t.getPos();return {dist:np.distanceTo(tp),dy:Math.abs(n.y-t.y)};}
function meleeAttack(e){var n=e.npc,inv=n.getInventory(),right=inv.getRightHand();if(!right||right.isEmpty()||right.getName()!==SPEC.melee.model){e.setCanceled(true);e.damage=0;}}
function switchWeapon(n, mode){
var inv = n.getInventory(),right = inv.getRightHand();
if(mode === "melee"){if(!right || right.getName() !== SPEC.melee.model){inv.setLeftHand(GUN);inv.setRightHand(MELEE)}}
if(mode === "range"){if(!right || right.getName() !== SPEC.range.cat){inv.setLeftHand(MELEE);inv.setRightHand(GUN);}}
n.updateClient();
}
function throwGrenade(n){
var target=n.getAttackTarget();
if(!target)return;

var d=getCombatData(n,target);
if(d.dist<SPEC.grenade.range[0]||d.dist>SPEC.grenade.range[1])return;

var nbt=API.stringToNbt('{id:"'+SPEC.grenade.itemId+'",Count:1b}');
var tag=nbt.has("tag")?nbt.getCompound("tag"):API.stringToNbt("{}");
nbt.setCompound("tag",tag);
tag.putString("ThrowableId",SPEC.grenade.throwableId);

var stack=n.getWorld().createItemFromNbt(nbt);
var level=n.getWorld().getMCLevel();
var grenade =
SPEC.grenade.throwableId.indexOf("smoke") != -1
  ? new SmokeGrenadeEntity(n.getMCEntity(), level, SPEC.grenade.fuse)
  : (SPEC.grenade.throwableId.indexOf("flash") != -1
      ? new StunGrenadeEntity(n.getMCEntity(), level, SPEC.grenade.fuse)
      : new GrenadeEntity(n.getMCEntity(), level, SPEC.grenade.fuse));
grenade.setItem(stack.getMCItemStack());

var dx=target.x-n.x;
var dz=target.z-n.z;
var dy=target.y-n.y;

var dist=Math.sqrt(dx*dx+dz*dz);
if(dist==0)return;
var base = SPEC.grenade.power;
var scale = dist / SPEC.grenade.range[1];
if(scale > 1) scale = 1;
var speed = base * (0.6 + scale * 0.6);
var maxPower = 1.2;
if(speed > maxPower) speed = maxPower;
var angle = SPEC.grenade.angle * Math.PI / 180;
var horizontal = Math.cos(angle) * speed;
var vertical   = Math.sin(angle) * speed;

var vx = (dx/dist) * horizontal;
var vz = (dz/dist) * horizontal;
var vy = vertical + dy * 0.05;
level.m_143334_(grenade);
grenade.m_6001_(vx,vy,vz);
}
function shouldThrowGrenade(n){
var target=n.getAttackTarget();if(!target)return false;
var right=n.getInventory().getRightHand();
if(!right||right.getName()!==SPEC.range.cat)return false;

var w=n.getWorld(),now=w.getTotalTime();
var last=n.tempdata.has("lastThrowTick")?n.tempdata.get("lastThrowTick"):0;
if(now-last<SPEC.grenade.cooldown)return false;

var d=getCombatData(n,target);
if(d.dist<SPEC.grenade.range[0]||d.dist>SPEC.grenade.range[1])return false;

var list=w.getNearbyEntities(target.getPos(),SPEC.grenade.search,5);
for(var i=0;i<list.length;i++){if(list[i]!==target&&list[i]!==n)return true;}
var can=n.canSeeEntity(target);
var lastSeen=n.tempdata.has("lastSeen")?n.tempdata.get("lastSeen"):true;
n.tempdata.put("lastSeen",can);
if(lastSeen&&!can)return true;

if((n.getHealth()/n.getMaxHealth())<=SPEC.grenade.hpratio)return true;

return false;
}
function died(e){e.npc.timers.clear();e.npc.tempdata.clear()}