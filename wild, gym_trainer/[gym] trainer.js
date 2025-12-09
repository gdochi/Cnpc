// === CONFIG ===
var state = {
  returnsHome: true,   // NPC returns to home when idle
  walkSpeed: 0,        // base walk speed
  moveType: 0,         // 0 still / 1 wander / 2 fixed
  maxHealth: 20        // NPC max HP
};

var CFG = {
  time: { zone: "Asia/Seoul" },                  // time zone for logs/timestamps
  ball: "cobblemon:poke_ball",                   // NPC holds this during battle

  // --- detection ---
  detect: {
    type: 1,                                      // 1 interact / 2 fixed / 3 round
    interval: 20,                                 // detect tick interval
    fixed: { angle: 90, range: 8, width: 1 },     // fixed-cone
    round: { range: 10 }                          // circular detection
  },

  // --- start mode ---
  start: {
    type: 2,             // 1 instant / 2 auto-delay / 3 ask
    delay: 30,           // used only when type=2
    denyMs: 3000         // deny time after rejection/cancel
  },

  // --- single gym battle (no revenge) ---
  gym: {
    battle: { 
    type: 1,              // battle format: 1 = Singles / 2 = Doubles / 3 = Multi
    spec: "new",          // trainer JSON spec name (loaded from external trainer folder)
    maxItemUses: 1        // limit for items during battle (TBCS rule)
    },  // trainer spec + battle rules for this Gym trainer

    message: "You’ll have to get through me before facing the Gym Leader!",                            
    conditions: [
      // { type:"item", id:"minecraft:diamond", count:1 },      // require items
      // { type:"stored", key:"key1", value:"ok" },             // storeddata equals
      // { type:"advancement", id:"minecraft:adventure/root" }, // advancement owned
      // { type:"tag", tag:"ready_for_gym1" },                  // player tag
      // { type:"faction", id:3, score:100 }                    // faction threshold
    ],
    reward: [
      { type:"xp", amount: 500 }      // XP only (your request)
    ],
    gimmick: [],
    afterClearMsg: "You've already defeated me."  // shown on interact after clear
  },

  // --- optional teleport just before battle ---
  pos: {
    enable: false,                    // enable TP?
    tpNpc: [0,0,0],                   // npc TP pos
    tpPlayer: [0,0,0]                 // player TP pos
  },

  // --- TBCS trainer attach system ---
  fe: {
    apiId: "tbcs",                              // RCT api id
    externalDir: "./yourloc_trainers",       // external json dir
    storeKey: "trainer_attached_id"             // per-NPC stored key
  },

  // --- sounds ---
  sound: {
    pre:   { name:"minecraft:entity.ender_dragon_growl", vol:1, pitch:1 },   // before start
    start: { name:"minecraft:entity.player.levelup",     vol:1, pitch:1 }    // at start
  }
};


// ================================================
// IMPORTS / CONST
// ================================================
var API = Java.type("noppes.npcs.api.NpcAPI").Instance();
var File = Java.type("java.io.File"), Files = Java.type("java.nio.file.Files"), StandardCharsets = Java.type("java.nio.charset.StandardCharsets");

var RCTApi = Java.type("com.gitlab.srcmc.rctapi.api.RCTApi");
var TrainerModel = Java.type("com.gitlab.srcmc.rctapi.api.models.TrainerModel");

var BR  = Java.type("com.cobblemon.mod.common.battles.BattleRegistry");
var TBA = Java.type("com.cobblemon.mod.common.battles.actor.TrainerBattleActor");
var PBA = Java.type("com.cobblemon.mod.common.battles.actor.PokemonBattleActor");

var TID = { DETECT:100, AUTO:300, UNLOCK_P:999 };   // timers
var Trainer;                                        // global NPC ref


// ================================================
// INIT
// ================================================
function init(e){
  var n = e.npc;
  n.getStoreddata().put("denyList","{}");          // reset deny table
  Trainer = n;
  reset(n,"end");                                  // apply base state
  if(CFG.detect.type !== 1) n.timers.forceStart(TID.DETECT, CFG.detect.interval, true);  // start detect loop
}
// ================================================
// DENY LIST
// ================================================
function addDeny(n,p,ms){
  var sd=n.getStoreddata(), raw=sd.get("denyList"), obj=raw?JSON.parse(raw):{};
  obj[p.getUUID()] = Date.now()+ms;
  sd.put("denyList", JSON.stringify(obj));
}
function isDenied(n,p){
  var raw=n.getStoreddata().get("denyList"); if(!raw) return false;
  var ts = JSON.parse(raw)[p.getUUID()]; if(!ts) return false;
  return Date.now() < ts;
}
// ================================================
// TIMERS
// ================================================
function timer(e){
  var n=e.npc;
  if(e.id===TID.DETECT) detectRun(e);
  if(e.id===TID.AUTO)   doBattleStart(n);
  if(e.id===TID.UNLOCK_P){
    var p=n.getTempdata().get("target");
    if(p){
      var psd=p.getStoreddata();
      psd.remove("battle_busy_by");
      psd.remove("battle_busy_ts");
    }
    n.getTempdata().clear();
  }
}
// ================================================
// INTERACT 
// ================================================
function interact(e){
  var n=e.npc, p=e.player;
  var rec=getRec(p,n);

  if(isDenied(n,p)) return;                                        // deny window
  if(rec && rec.gymClear===true){                                  // already cleared
    p.message("§7"+CFG.gym.afterClearMsg);
    return;
  }
  if(!isBattleReady(p,n,rec)) return;                              // busy or battle/wild/other lock
  if(!allConds(p, CFG.gym.conditions)){                            // unmet conditions
    p.message("§cYou cannot battle now.");
    return;
  }
  // If detect mode is interact-only
  if(CFG.detect.type===1){
    startFlow(n,p);                                                // dash → auto (instant)
  } else {
    // In fixed/round modes, interact won't force start (approach to trigger detect)
    p.message("§7Step into my sight to begin the battle.");
  }
}
// ================================================
// DETECT → DASH → START 
// ================================================
function detectRun(e){
  var n=e.npc, p=getT(n);
  if(!p) return;

  if(n.canSeeEntity(p)!==true) return;             // must see player
  if(isDenied(n,p)) return;

  var rec=getRec(p,n);
  if(rec && rec.gymClear===true) return;           // block after clear
  if(!isBattleReady(p,n,rec)) return;              // busy/battle checks

  if(!allConds(p, CFG.gym.conditions)) return;     // hard block, no dash

  startFlow(n,p);                                   // dash and prepare start
}

function startFlow(n,p){
  if(isDenied(n,p)) return;
  // 1) dash first (gym wants that “approach” feel)
  n.addMark(2)
  if(CFG.detect.type!==1) dash(n,p);
  if(CFG.sound.pre) p.playSound(CFG.sound.pre.name, CFG.sound.pre.vol, CFG.sound.pre.pitch);
  // 2) validate again (rare race cases)
  if(!allConds(p, CFG.gym.conditions)){
    addDeny(n,p,CFG.start.denyMs);
    return;
  }
  // 3) mark busy
  var td=n.getTempdata();
  td.put("target",p);
  td.put("busy",true);
  var psd=p.getStoreddata();
  psd.put("battle_busy_by", n.getUUID());
  psd.put("battle_busy_ts", ""+Date.now());
  // 4) start mode (instant)
  if(CFG.start.type===1){
    n.timers.forceStart(TID.AUTO,1,false);
  } else if(CFG.start.type===2){
    offerMsg(p,CFG.gym.message)
    n.timers.forceStart(TID.AUTO, CFG.start.delay, false);
  } else {
    // no-ask gym, but keep fallback (not used in this config)
    n.timers.forceStart(TID.AUTO,1,false);
  }
}
// ================================================
// START BATTLE
// ================================================
function doBattleStart(n){
  var td=n.getTempdata(), p=td.get("target");
  if(!p){ reset(n,"cancel"); return; }

  cleanupBattleBusy(n,p);
  reset(n,"start");
  
  var bat = CFG.gym.battle;

  applyTrainerRuntime(n,bat.spec);                              // attach TBCS spec
  n.setMainhandItem(n.getWorld().createItem(CFG.ball,1));       // show ball in hand
  n.updateClient()
  if(CFG.pos.enable===true){
    var T=CFG.pos.tpNpc, P=CFG.pos.tpPlayer;
    n.setPosition(T[0]+0.5, T[1]+1, T[2]+0.5);
    p.setPosition(P[0]+0.5, P[1]+1, P[2]+0.5);
  }
  faceEach(n,p);
  p.playSound(CFG.sound.start.name,CFG.sound.start.vol,CFG.sound.start.pitch);

  var hook="onwin {1:['execute as @2 run noppes script trigger 1 "+p.getName()+"'], 2:['execute as @1 run noppes script trigger 2 "+p.getName()+"']}";
  var rules="{maxItemUses:"+bat.maxItemUses+"}";
  n.executeCommand("/tbcs battle "+getBattleType(bat.type)+" "+p.getName()+" vs @s "+hook+" rules "+rules);
}
// ================================================
// TRIGGER RESULT (1=win, 2=lose)
// ================================================
function trigger(e){
  var n=e.entity, p=n.getWorld().getPlayer(e.arguments[0]);
  if(!p) return;

  n.executeCommand("stopsound "+p.getName()+" * "+CFG.sound.start.name);

  if(e.id===1){     // WIN → reward + mark clear
    giveRewards(n,p,CFG.gym.reward);
    runGimmick(n,p,CFG.gym.gimmick);
    saveGymClear(p,n);   // mark gymClear=true per-player

    reset(n,"end");
    return;
  }
  if(e.id===2){     // LOSE → deny a bit, back home
    addDeny(n,p,CFG.start.denyMs);
    reset(n,"cancel");
    return;
  }
  reset(n,"end");
}
function runGimmick(n,p,list){
  if(!list) return;
  for(var i=0;i<list.length;i++){
    var g=list[i];
    if(g.type=="command"){
      var cmd=g.cmd.replace("@player",p.getName()).replace("@npc",n.getUUID());
      n.executeCommand(cmd);
    }
    else if(g.type=="function"){

    }
  }
}
// ================================================
// GUI (not used for start=1, but kept minimal)
// ================================================
function offerMsg(p,msg){
  var g=API.createCustomGui(41,240,90,false,p);   // tiny info window
  g.addLabel(1,"§f"+msg,12,30,216,16).setCentered(true);
  p.showCustomGui(g);
}
// ================================================
// DETECT / DASH / FACE
// ================================================
function fw(n){
  var r=n.getRotation()*Math.PI/180;
  return { x:-Math.sin(r), z:Math.cos(r) };
}
function getT(n){
  if(CFG.detect.type===2) return getFix(n);
  if(CFG.detect.type===3) return getRnd(n);
  return null;
}
function getFix(n){
  var w=n.getWorld(), r=(CFG.detect.fixed.range||8)+1;
  var L=w.getNearbyEntities(n.getPos(),r,1); if(!L||L.length===0) return null;
  var f=fw(n), nx=n.x, ny=n.y, best=null, m=9e9, width=CFG.detect.fixed.width||1;

  for(var i=0;i<L.length;i++){
    var p=L[i],gm=p.getGamemode(); if(gm===1||gm===3) continue;
    if(Math.abs(p.y-ny)>2) continue;
    var dx=p.x-nx, dz=p.z-n.z, dot=dx*f.x + dz*f.z; if(dot<=0) continue;
    if(Math.abs(dx*f.z - dz*f.x)>width) continue;
    if(dot<m){ m=dot; best=p; }
  }
  return best;
}
function getRnd(n){
  var w=n.getWorld(), r=CFG.detect.round.range||10;
  var L=w.getNearbyEntities(n.getPos(),r+1,1); if(!L||L.length===0) return null;
  var nx=n.x, ny=n.y, best=null, m=9e9, rr=r*r;

  for(var i=0;i<L.length;i++){
    var p=L[i],gm=p.getGamemode(); if(gm===1||gm===3) continue;
    if(Math.abs(p.y-ny)>2) continue;
    var dx=p.x-nx, dz=p.z-n.z, d2=dx*dx+dz*dz;
    if(d2<=rr && d2<m){ m=d2; best=p; }
  }
  return best;
}
function dash(n,p){
  var dx=p.x-n.x, dz=p.z-n.z, d=Math.sqrt(dx*dx+dz*dz); if(d===0) return;
  dx/=d; dz/=d;
  n.ai.setReturnsHome(false);
  n.setMotionX(dx*1.2);
  n.setMotionZ(dz*1.2);
}
function faceEach(n,p){
  n.executeCommand("execute as "+p.getName()+" at @s run tp "+p.getName()+" ~ ~ ~ facing entity "+n.getUUID()+" feet");
  n.executeCommand("execute as "+n.getUUID()+" at @s run tp "+n.getUUID()+" ~ ~ ~ facing entity "+p.getName()+" feet");
}
// ================================================
// READY / RESET
// ================================================
function getBattle(p){
  var b=BR.getBattleByParticipatingPlayer(p.getMCEntity());
  if(!b) return true;
  for each(var a in b.getActors()) if(a instanceof TBA) return false;  // already trainer battle
  for each(var a in b.getActors()){
    if(a instanceof PBA){
      var o=a.getPokemon().getOriginalPokemon().getOwnerPlayer();
      if(o==null) return false;                                        // wild battle
    }
  }
  return false;
}
function isBattleReady(p,n,rec){
  var td=n.getTempdata();
  if(td.get("busy")===true) return false;

  var psd=p.getStoreddata(), by=psd.get("battle_busy_by"), ts=psd.get("battle_busy_ts");
  if(by && by !== n.getUUID()){
    if(ts && (Date.now() - parseInt(ts)) <= 20000) return false;       // busy by other NPC
  }

  if(getBattle(p)===false) return false;
  if(rec && rec.gymClear===true) return false;                          // gym already cleared
  return true;
}
function cleanupBattleBusy(n,p){
  var psd=p.getStoreddata();
  psd.remove("battle_busy_by");
  psd.remove("battle_busy_ts");
}

function reset(n,flag){
  var td=n.getTempdata(), t=n.timers, p=td.get("target");
  var m=n.getMarks()[0]; if(m) n.removeMark(m);
  t.clear();

  if(flag==="cancel"){
    n.setMainhandItem(n.getWorld().createItem("minecraft:air",1));
    n.setPosition(n.getHomeX()+0.5, n.getHomeY()+1, n.getHomeZ()+0.5);
    setState(n);

    if(CFG.detect.type !== 1)
      n.timers.forceStart(TID.DETECT, CFG.detect.interval, true);

    if(p) n.timers.forceStart(TID.UNLOCK_P,1,false);
    else  td.clear();
    return;
  }

  if(flag==="start"){
    if(CFG.pos.enable === false){
      n.setPosition(n.getHomeX()+0.5, n.getHomeY()+1, n.getHomeZ()+0.5);
    }
    n.ai.setReturnsHome(false);
    n.ai.setWalkingSpeed(0);
    n.ai.setMovingType(0);
    return;
  }

  if(flag==="end"){
    n.setMainhandItem(n.getWorld().createItem("minecraft:air",1));
    n.setPosition(n.getHomeX()+0.5, n.getHomeY()+1, n.getHomeZ()+0.5);
    setState(n);
    td.clear();

    if(CFG.detect.type !== 1)
      n.timers.forceStart(TID.DETECT, CFG.detect.interval, true);

    return;
  }
}

function setState(n){
  var ai=n.ai, st=n.getStats();
  ai.setReturnsHome(state.returnsHome);
  ai.setWalkingSpeed(state.walkSpeed);
  ai.setMovingType(state.moveType);

  st.setMaxHealth(state.maxHealth);
  n.setHealth(state.maxHealth);

  if(CFG.detect.type===2){
    ai.setStandingType(1);
    n.setRotation(CFG.detect.fixed.angle || 90);
  }
  else if(CFG.detect.type===3){
    ai.setStandingType(2);
  }

  n.updateClient();
}
// ================================================
// TRAINER API (TBCS attach)
// ================================================
function detachOldTrainer(n){
  var sd=n.getStoreddata(), old=sd.get(CFG.fe.storeKey);
  if(!old) return;
  try{ RCTApi.getInstance(CFG.fe.apiId).getTrainerRegistry().unregisterById(old); }catch(e){}
  sd.remove(CFG.fe.storeKey);
}
function randomId(){ return "trainer_"+Math.floor(Math.random()*900000+100000); }
function getExternalDir(){ var f=new File(CFG.fe.externalDir); if(!f.exists()) f.mkdirs(); return f; }
function loadText(f){ return new java.lang.String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8); }
function createTempJson(spec,id,name){
  var src=new File(getExternalDir(),spec+".json"); if(!src.exists()) return null;
  var tmp=new File(getExternalDir(),id+".json"), raw=loadText(src),
      mod=raw.replace(/"name"\s*:\s*"([^"]*)"/,'"name": "'+name+'"');
  Files.write(tmp.toPath(), mod.getBytes(StandardCharsets.UTF_8));
  return tmp;
}
function registerTrainer(n,tid,api,json){
  var raw=loadText(json), apii=RCTApi.getInstance(api), reg=apii.getTrainerRegistry();
  var g=apii.gsonBuilder().setPrettyPrinting().disableHtmlEscaping().create();
  var m=g.fromJson(raw,TrainerModel.class);
  try{ reg.unregisterById(tid); }catch(e){}
  var t=reg.registerNPC(tid,m); if(!t) return null;
  t.setEntity(n.getMCEntity());
  return t;
}
function applyTrainerRuntime(n,spec){
  detachOldTrainer(n);
  var id=randomId(), tmp=createTempJson(spec,id,n.getDisplay().getName());
  if(!tmp) return false;
  var t=registerTrainer(n,id,CFG.fe.apiId,tmp);
  if(!t) return false;
  n.getStoreddata().put(CFG.fe.storeKey,id);
  try{ tmp.delete(); }catch(e){}
  return true;
}
// ================================================
// PLAYER RECORD (per-NPC, no revenge)
// ================================================
function getRec(p,n){
  var raw=p.getStoreddata().get("trainerData");
  if(!raw) return null;
  var obj=JSON.parse(raw);
  return obj[n.getUUID()] || null;
}

function saveGymClear(p,n){
  var sd=p.getStoreddata(), raw=sd.get("trainerData");
  var obj=raw?JSON.parse(raw):{}, key=n.getUUID();
  var base=obj[key]||{};
  obj[key] = {
    uuid: key,                                // NPC uuid
    name: n.getDisplay().getName(),          // NPC display name
    pos: {                                   // last known NPC pos
      x: Math.floor(n.getX()),
      y: Math.floor(n.getY()),
      z: Math.floor(n.getZ())
    },
    gymClear: true,                          // flag: cleared
    lastBattle: nowStr(),                    // log time
    battles: (base.battles||0)+1             // total tries vs this NPC
  };
  sd.put("trainerData", JSON.stringify(obj));
}

// ================================================
// CONDITIONS & REWARDS
// ================================================
function okCond(p,c){
  if(c.type==="item")       return hasItem(p,c.id,c.count||1);
  if(c.type==="stored")     return (""+p.getStoreddata().get(c.key)) === (""+c.value);
  if(c.type==="advancement")return p.hasAdvancement(c.id);
  if(c.type==="tag")        return p.hasTag(c.tag);
  if(c.type==="faction")    return p.getFactionPoints(c.id) >= (c.score||0);
  return false;
}
function hasItem(p,id,count){
  var inv=p.getInventory(), tot=0;
  for(var i=0;i<inv.getSize();i++){
    var st=inv.getSlot(i);
    if(st && st.getName().equals(id)) tot+=st.getStackSize();
    if(tot>=count) return true;
  }
  return false;
}
function allConds(p,arr){
  if(!arr || arr.length===0) return true;
  for(var i=0;i<arr.length;i++) if(okCond(p,arr[i])===false) return false;
  return true;
}
function giveRewards(n,p,list){
  if(!list) return;
  var w=p.getWorld();
  for(var i=0;i<list.length;i++){
    var r=list[i];
    if(r.type==="item") p.giveItem(w.createItem(r.id,r.count||1));
    else if(r.type==="xp") n.executeCommand("xp add "+p.getName()+" "+(r.amount||1));
    else if(r.type==="pokemon") n.executeCommand('pokegiveother "'+p.getName()+'" '+r.species);
    else if(r.type==="command"){
      var cmd=r.cmd.replace("@player",p.getName()).replace("@npc",n.getUUID())
      n.executeCommand(cmd);
    }
    else if(r.type==="faction") p.addFactionPoints(r.id,r.score||0);
    else if(r.type==="advancement") n.executeCommand("advancement grant "+p.getName()+" only "+r.id);
    else if(r.type==="tag") p.addTag(r.tag);
  }
  p.updatePlayerInventory()
}
// ================================================
// TIME / UTIL
// ================================================
function nowStr(){
  var LDT=Java.type("java.time.LocalDateTime"),
      ZID=Java.type("java.time.ZoneId"),
      FMT=Java.type("java.time.format.DateTimeFormatter");
  return LDT.now(ZID.of(CFG.time.zone||"Asia/Seoul"))
            .format(FMT.ofPattern("yyyy-MM-dd HH:mm:ss"));
}
function getBattleType(t){
  if(t===1) return "GEN_9_SINGLES";
  if(t===2) return "GEN_9_DOUBLES";
  if(t===3) return "GEN_9_MULTI";
  return "GEN_9_SINGLES";
}
