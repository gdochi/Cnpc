
// === CONFIG ===
var state = {
    returnsHome: true,   // NPC returns to home when idle
    walkSpeed: 0,        // base walk speed
    moveType: 0,         // 0 still / 1 wander / 2 fixed
    maxHealth: 20        // NPC max HP
};

var CFG = {
    time: {zone: "Asia/Seoul"},
    displayArea:"Persimmon City",  //example
    ball: "cobblemon:poke_ball",   // NPC holds this during battle
    // === detection ===
    detect: {
        type: 2,                   // 1 interact / 2 fixed / 3 round
        interval: 20,              // detect tick interval
        fixed: { angle: 90, range: 8, width: 1 },  // fixed-cone
        round: { range: 10 }       // circular detection
    },
    // === start mode ===
    start: {
        type: 3,                   // 1 instant / 2 auto-delay / 3 ask
        delay: 20,                 // when type=2
        denyMs: 3000               // deny time after rejection
    },
    // === first battle ===
    first: {
        battle: {
            type: 1,               // 1 single / 2 double / 3 multi
            spec: "new",           // trainer spec file
            maxItemUses: 1
        },
        message: "A wild foe appears...",  // pre-battle message
        conditions: [
          //{ type:"item", id:"minecraft:diamond", count:2 },
          //{ type:"stored", key:"gym1", value:"clear" },
          //{ type:"advancement", id:"minecraft:adventure/adventuring_time" },
          //{ type:"tag", tag:"elite_member" },
          //{ type:"faction", id:3, score:100 }
        ],                    // start requirements
        reward: [
            { type:"xp", amount:80 },                                   // give XP
            { type:"item", id:"minecraft:emerald", count:3 },           // give item
            { type:"pokemon", species:"magikarp" },                     // give Pokémon
            { type:"command", cmd:"execute as @player at @s run tp ~ ~2 ~" },// run command
            { type:"faction", id:3, score:10 },                 // add faction points
            { type:"advancement", id:"cobblemon:any_plant" },    // grant advancement
            { type:"tag", tag:"wild_trainer_clear" }                    // add player tag
        ],
        gimmick: [] //command, function(cnpc)
    },
    // === revenge battle ===
    revenge: {
        enabled: true,             // allow revenge mode?
        cooldown: {                        // cooldown config
            h: 0,                          // hours
            m: 0,                         // minutes
            s: 10                           // seconds
        },
        stages: [
            {
              battle:{ type:1, spec:"tester", maxItemUses:1 },
              message: "It returns stronger...",
              conditions: [],
              reward:[ { type:"xp", amount:150 } ],
              gimmick:[]
          },
          {
              battle:{ type:1, spec:"new", maxItemUses:2 },
              message:"Its power surges violently...",
              conditions:[],
              reward:[ { type:"xp", amount:230 } ],
              gimmick:[]
            }
        ]
    },
    // === teleport positions (optional) ===
    pos: {
        enable: false,
        tpNpc: [0,0,0],
        tpPlayer: [0,0,0]
    },
    // === phone exchange ===
    after: {
        suggest: true,  // ask phone exchange after first win
        message: "It seems interested in you… Exchange numbers?",
        notify: "§aYou exchanged numbers with §e@npc§a!"
    },
    // === trainer attach system ===
    fe: {
        apiId: "tbcs",
        externalDir: "./yourloc_trainers",
        storeKey: "trainer_attached_id"
    },
    // === sounds ===
    sound: {
        pre:   { name:"minecraft:entity.player.levelup", vol:1, pitch:1 },
        start: { name:"minecraft:battle",     vol:1, pitch:1 }
    }
};


//////////////////////////////////////////////////////////////////////////////////////////////
// === IMPORTS ===
var API = Java.type("noppes.npcs.api.NpcAPI").Instance();
var File = Java.type("java.io.File"), Files = Java.type("java.nio.file.Files"), StandardCharsets = Java.type("java.nio.charset.StandardCharsets");
var RCTApi = Java.type("com.gitlab.srcmc.rctapi.api.RCTApi"), TrainerModel = Java.type("com.gitlab.srcmc.rctapi.api.models.TrainerModel");
var BR = Java.type("com.cobblemon.mod.common.battles.BattleRegistry"), TBA = Java.type("com.cobblemon.mod.common.battles.actor.TrainerBattleActor"), PBA = Java.type("com.cobblemon.mod.common.battles.actor.PokemonBattleActor");
// === CONST ===
var TID = { DETECT:100, AUTO:300, UNLOCK_P:999 };
var GID = { PRED:40, FAIL:41, AFTER:42 };
var Trainer;

// === INIT ===
function init(e){
  var n = e.npc;
  n.getStoreddata().put("denyList","{}");
  Trainer = n;
  reset(n,"end");
  if(CFG.detect.type !== 1) n.timers.forceStart(TID.DETECT, CFG.detect.interval, true);
}

// === DENY ===
function addDeny(n,p,ms){
  var sd=n.getStoreddata(),raw=sd.get("denyList"),obj=raw?JSON.parse(raw):{};
  obj[p.getUUID()] = Date.now()+ms;
  sd.put("denyList", JSON.stringify(obj));
}
function isDenied(n,p){
  var raw=n.getStoreddata().get("denyList"); if(!raw) return false;
  var ts = JSON.parse(raw)[p.getUUID()]; if(!ts) return false;
  return Date.now() < ts;
}
// === TIMERS ===
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
// === PHONE ===
function hasWildPhone(p,n){
  var raw=p.getStoreddata().get("wildPhone"); if(!raw) return false;
  return JSON.parse(raw)[n.getUUID()] === true;
}
function setWildPhone(p,n){
  var sd=p.getStoreddata(),raw=sd.get("wildPhone"),obj=raw?JSON.parse(raw):{};
  obj[n.getUUID()] = true;
  sd.put("wildPhone",JSON.stringify(obj));
}
// === INTERACT ===
function interact(e){
    var n = e.npc;
    var p = e.player;
    var rec = getRec(p,n);
    var first = !(rec && rec.firstClear === true);
    if(rec.stage >= CFG.revenge.stages.length){
        p.message("§cIt shows no more interest in battling you.");
        return;
    }
    // Phone exchange for already cleared trainers
    if(!first && !hasWildPhone(p,n)){
        offerGui(p, GID.AFTER, CFG.after.message, "Yes", "No");
        return;
    }
    // Deny timer
    if(isDenied(n,p))return;
    // Check battle availability
    if(!isBattleReady(p,n,rec)) return;
    // Select pack
    var stage = (rec && typeof rec.stage === "number") ? rec.stage : 0;
    var pack = first ? CFG.first : CFG.revenge.stages[stage];
    // Condition check
    if(!allConds(p, pack.conditions)){
        p.message("§cYou cannot battle now.");
        return;
    }
    // If detect mode is NOT interact type, only allow interact when revenge stage exists
    if (CFG.detect.type !== 1) {
      if (!rec || rec.firstClear !== true) return;
    }
    // All good → propose battle
    startBattleProposal(n,p,pack);
}
// === BATTLE PROPOSAL ===
function startBattleProposal(n,p,pack){
    // 1) Mark busy state
    var td = n.getTempdata();
    td.put("target", p);
    td.put("busy", true);
    var psd = p.getStoreddata();
    psd.put("battle_busy_by", n.getUUID());
    psd.put("battle_busy_ts", ""+Date.now());
    // 2) Pre-sound
    if(CFG.sound.pre) p.playSound(CFG.sound.pre.name, CFG.sound.pre.vol, CFG.sound.pre.pitch);
    // 3) Handle start mode
    if(CFG.start.type === 1){
        n.timers.forceStart(TID.AUTO,1,false);
    }
    else if(CFG.start.type === 2){
        offerGui(p,GID.PRED,pack.message,null,null);
        n.timers.forceStart(TID.AUTO, CFG.start.delay, false);
    }
    else if(CFG.start.type === 3){
        offerGui(p,GID.PRED,pack.message,"Yes","No");
    }
}
// === DETECT ===
function detectRun(e){
    var n = e.npc;
    var p = getT(n);
    if(!p) return;

    if(n.canSeeEntity(p) !== true) return;
    if(isDenied(n,p)) return;

    var rec = getRec(p,n);
    if(!isBattleReady(p,n,rec)) return;
    var first = !(rec && rec.firstClear === true);
    if (!first) return;
    var pack = CFG.first; 
    if(!allConds(p, pack.conditions)) return;
    startFlow(n,p,pack);
}
// START FLOW
function startFlow(n,p,pack){
    if(isDenied(n,p)) return;
    // 1) Dash BEFORE marking busy
    dash(n,p);
    n.addMark(2)
    if(CFG.sound.pre) p.playSound(CFG.sound.pre.name, CFG.sound.pre.vol, CFG.sound.pre.pitch);
    // 2) After dash, verify conditions ONCE more (rare but safe)
    if(!allConds(p, pack.conditions)){
        addDeny(n,p,CFG.start.denyMs);
        return;
    }
    // 3) Set busy state AFTER all validation
    var td = n.getTempdata();
    td.put("target", p);
    td.put("busy", true);

    var psd = p.getStoreddata();
    psd.put("battle_busy_by", n.getUUID());
    psd.put("battle_busy_ts", ""+Date.now());

    // 4) Handle start modes (proposal, delay, instant)
    if(CFG.start.type === 1){
        n.timers.forceStart(TID.AUTO,1,false);
    }
    else if(CFG.start.type === 2){
        offerGui(p,GID.PRED,pack.message,null,null);
        n.timers.forceStart(TID.AUTO, CFG.start.delay, false);
    }
    else if(CFG.start.type === 3){
        offerGui(p,GID.PRED,pack.message,"Yes","No");
    }
}

// === BATTLE START ===
function doBattleStart(n){
  var td=n.getTempdata(), p=td.get("target");
  if(!p){ reset(n,"cancel"); return; }

  cleanupBattleBusy(n,p);
  reset(n,"start");

  var rec=getRec(p,n), first=!(rec && rec.firstClear===true), stage=(rec && typeof rec.stage==="number")?rec.stage:0;
  var pack = first===true ? CFG.first : CFG.revenge.stages[stage];
  var bat = pack.battle;

  applyTrainerRuntime(n,bat.spec);
  n.setMainhandItem(n.getWorld().createItem(CFG.ball,1));
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
// === TRIGGER (RESULT) ===
function trigger(e){
    var n = e.entity;
    var p = n.getWorld().getPlayer(e.arguments[0]);
    if(!p) return;

    n.executeCommand("stopsound "+p.getName()+" * "+CFG.sound.start.name);

    var rec = getRec(p,n); 
    var first = !(rec && rec.firstClear === true);
    var stage = (rec && typeof rec.stage === "number") ? rec.stage : 0;

    if(e.id === 1){  // WIN
        var pack = first ? CFG.first : CFG.revenge.stages[stage];

        giveRewards(n,p,pack.reward);
        runGimmick(n,p,pack.gimmick);
        // base save
        saveWildContact(p,n);
        // === stage ++, cool ===
        var cd = CFG.revenge.cooldown; // {h,m,s}
        var next = addTimeKST(cd.h, cd.m, cd.s);
        if(first){
            updateTrainerRec(p,n,{
                firstClear: true,
                stage: 0,
                lastBattle: nowKST(),
                nextBattle: next
            });
        } else {
            updateTrainerRec(p,n,{
                stage: stage + 1,
                lastBattle: nowKST(),
                nextBattle: next
            });
        }
        // === battleCount++ ===
        var bc = rec && rec.battles ? rec.battles : 0;
        updateTrainerRec(p,n,{ battles: bc + 1 });
        reset(n,"end");
        if(CFG.after.suggest === true && hasWildPhone(p,n) === false) offerGui(p,GID.AFTER,CFG.after.message,"Yes","No");
        return;
    }
    if(e.id === 2){  // LOSE
        if(CFG.detect.type !== 1) addDeny(n,p,CFG.start.denyMs);
        reset(n,"cancel");
        return;
    }

    reset(n,"end");
}
// === GUI ===
function offerGui(p,id,msg,yes,no){
  var g=API.createCustomGui(id,256,128,false,p);
  g.addLabel(1,"§f"+msg,16,30,224,20).setCentered(true);
  if(yes) g.addButton(2,yes,50,70,60,20);
  if(no)  g.addButton(3,no,130,70,60,20);
  p.showCustomGui(g);
}
function customGuiButton(e){
  var p=e.player,n=Trainer,gid=e.gui.getID(),bid=e.buttonId,td=n.getTempdata();

  if(gid===GID.AFTER){
    if(bid===2){ setWildPhone(p,n); p.closeGui();         
        if(CFG.after.notify){        
            p.message(CFG.after.notify
                .replace("@npc", n.getDisplay().getName())
                .replace("@player", p.getName()));
        }return; }

    if(bid===3){ p.closeGui(); return; }
  }

  if(gid===GID.PRED){
    if(bid===2){
      td.put("guiResult","yes");
      p.closeGui();
      n.timers.forceStart(TID.AUTO,1,false);
      return;
    }
    if(bid===3){
      td.put("guiResult","no");
      if(CFG.detect.type !== 1) addDeny(n,p,CFG.start.denyMs);
      p.closeGui();
      reset(n,"cancel");
      return;
    }
  }
}
function customGuiClosed(e){
  var p=e.player,n=Trainer,gid=e.gui.getID();
  if(gid !== GID.PRED) return;
  var td=n.getTempdata(), res=td.get("guiResult");

  if(res==="yes"){
    td.remove("guiResult");
    return;
  }

  if(CFG.detect.type !== 1) addDeny(n,p,CFG.start.denyMs);
  reset(n,"cancel");
  td.remove("guiResult");
}

// === DETECT / DASH ===
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
  var L=w.getNearbyEntities(n.getPos(),r,1); if(!L || L.length===0) return null;
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

// === READY / RESET ===
function getBattle(p){
    var b=BR.getBattleByParticipatingPlayer(p.getMCEntity());
    if(!b) return true;
    for each(var a in b.getActors()) if(a instanceof TBA) return false;
    for each(var a in b.getActors()){
        if(a instanceof PBA){
            var o=a.getPokemon().getOriginalPokemon().getOwnerPlayer();
            if(o==null) return false;
        }
    }
    return false;
}
function isBattleReady(p,n,rec){
    var td=n.getTempdata();
    if(td.get("busy")===true) return false;

    var psd=p.getStoreddata(), by=psd.get("battle_busy_by"), ts=psd.get("battle_busy_ts");
    if(by && by !== n.getUUID()){
        if(ts && (Date.now() - parseInt(ts)) <= 20000) return false;
    }
    if(getBattle(p)===false) return false;
    if(!rec) return true;
    if(rec.nextBattle){
        if(nowKST() < rec.nextBattle) return false;
    }

    return true;
}
function cleanupBattleBusy(n,p){
  var psd=p.getStoreddata();
  psd.remove("battle_busy_by");
  psd.remove("battle_busy_ts");
}
// === RESET NPC ===
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
// === APPLY STATE ===
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
// === TRAINER API ===
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
// === WILD RECORD ===
function getRec(p,n){
    var raw = p.getStoreddata().get("trainerData");
    if(!raw) return null;
    var obj = JSON.parse(raw);
    return obj[n.getUUID()] || null;
}
// === CONDITIONS & REWARDS ===
function okCond(p,c){
  if(c.type==="item") return hasItem(p,c.id,c.count||1);
  if(c.type==="stored") return (""+p.getStoreddata().get(c.key)) === (""+c.value);
  if(c.type==="advancement") return p.hasAdvancement(c.id)
  if(c.type==="tag") return p.hasTag(c.tag)
  if(c.type==="faction") return p.getFactionPoints(c.id) >= (c.score||0);
  return false;
}
function hasItem(p,id,count){
  var inv=p.getInventory(), tot=0;
  for(var i=0; i<inv.getSize(); i++){
    var st=inv.getSlot(i);
    if(st && st.getName().equals(id)) tot += st.getStackSize();
    if(tot >= count) return true;
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
// === CONTACT SAVE ===
function saveWildContact(p, n){
    var sd = p.getStoreddata();
    var raw = sd.get("trainerData");
    var obj = raw ? JSON.parse(raw) : {};

    var key = n.getUUID();
    var cd = CFG.revenge.cooldown;

    // 기존 데이터 유지
    var base = obj[key] || {};

    obj[key] = {
        uuid: key,
        name: n.getDisplay().getName(),
        area: CFG.displayArea || null, 
        pos: {
            x: Math.floor(n.getX()),
            y: Math.floor(n.getY()),
            z: Math.floor(n.getZ())
        },

        lastBattle: nowKST(),
        nextBattle: addTimeKST(cd.h, cd.m, cd.s),

        battles: base.battles || 0,
        stage: base.stage || 0,
        firstClear: base.firstClear || false
    };

    sd.put("trainerData", JSON.stringify(obj));
}

function updateTrainerRec(p, n, patch){
    var sd = p.getStoreddata();
    var raw = sd.get("trainerData");
    var obj = raw ? JSON.parse(raw) : {};
    var key = n.getUUID();

    if(!obj[key]) obj[key] = {};

    obj[key].uuid = key;
    obj[key].name = n.getDisplay().getName();
    obj[key].area = obj[key].area || CFG.displayArea || null;
    obj[key].pos = obj[key].pos || {
        x: Math.floor(n.getX()),
        y: Math.floor(n.getY()),
        z: Math.floor(n.getZ())
    };
    obj[key].firstClear = obj[key].firstClear || false;
    for(var k in patch){
        obj[key][k] = patch[k];
    }

    sd.put("trainerData", JSON.stringify(obj));
}


// === TIME ===
function nowKST(){
  var LDT=Java.type("java.time.LocalDateTime"),
      ZID=Java.type("java.time.ZoneId"),
      FMT=Java.type("java.time.format.DateTimeFormatter");

  return LDT.now(ZID.of(CFG.time.zone || "Asia/Seoul"))
            .format(FMT.ofPattern("yyyy-MM-dd HH:mm:ss"));
}

function getCooldownMs(cfg){return (cfg.h * 3600 + cfg.m * 60 + cfg.s) * 1000;}
function addTimeKST(h, m, s){
    var LDT = Java.type("java.time.LocalDateTime");
    var ZID = Java.type("java.time.ZoneId");
    var FMT = Java.type("java.time.format.DateTimeFormatter");

    return LDT.now(ZID.of(CFG.time.zone || "Asia/Seoul"))
              .plusHours(h || 0)
              .plusMinutes(m || 0)
              .plusSeconds(s || 0)
              .format(FMT.ofPattern("yyyy-MM-dd HH:mm:ss"));
}


// === BATTLE TYPE ===
function getBattleType(t){
    if(t===1) return "GEN_9_SINGLES";
    if(t===2) return "GEN_9_DOUBLES";
    if(t===3) return "GEN_9_MULTI";
    return "GEN_9_SINGLES";
}