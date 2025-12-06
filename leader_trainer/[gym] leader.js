// === Trainer Attach/Detach Config ===
var FE = {
    apiId:"tbcs",                        // Trainer API ID
    externalDir:"./you_trainers", // External trainer JSON directory
    debug:false,                         // Debug toggle
    storeKey:"trainer_attached_id"       // Storeddata key for attached trainerId
};
// === Leader Config ===
var CFG = {
  state:{ 
    returnsHome:true,   // NPC returns home after battle
    walkSpeed:0,        // Movement speed
    moveType:0,         // 0 = standing
    maxHealth:20        
  },
  sound:{ 
    start:{ name:"minecraft:yoursound", vol:1, pitch:1 } 
  },
  battle:{
    type:1,                      // 1=SINGLE, 2=DOUBLE, 3=MULTI
    maxItemUses:1,              
    ball:"cobblemon:poke_ball"
  },
  // === First Battle ===
  firstbattle:{
    spec:"yourspec1", // Trainer JSON file name (new.json)
    message:"§fPower means nothing without control. Let’s test yours.",
    delay:40,   // Time before battle starts
    maxItemUses:1,

    // conditions required to start the first battle
    conditions:[
      //{ type:"item", id:"minecraft:diamond", count:3 },              // requires 3 diamonds
      //{ type:"stored", key:"story_progress", value:2 },              // storeddata story_progress == 2
      //{ type:"advancement", id:"minecraft:adventure/adventuring_time" },
      //{ type:"tag", tag:"fire_gym_ready" },                          // player must have this tag
      //{ type:"faction", id:3, score:50 }                             // faction points >= 50, id = int
    ],

    // fail message shown if conditions are not met
    fail:{ silent:false, msg:"You cannot start the first battle yet." },

    // rewards granted after winning the first battle
    reward:[
      { type:"item", id:"minecraft:emerald", count:5 },
      { type:"xp", amount:250 },
      { type:"advancement", id:"minecraft:adventure/adventuring_time" },
      { type:"item", id:"cobbleversebadges:johto_rising_badge", count:1 },
      { type:"faction", id:3, score:50 },
      { type:"tag", tag:"leader_fire_rematch1" }
    ],

    // gimmicks run when the player wins
    // @player = player name
    // @leader = NPC UUID
    // type:"function" calls the NPC script function block (CustomNPCs)
    gimmick:[
      { type:"command", cmd:"effect give @player speed 10 1" },
      { type:"function" }
    ]
  },

  // === Rematch System ===
  rematch:{
    enabled:true,

    rounds:[
      {
        spec:"yourspec2",                 // trainer JSON for round 1
        message:"Rematch – Round 1",
        delay:40,
        maxItemUses:1,
        conditions:[ 
          { type:"item", id:"minecraft:emerald", count:5 } 
        ],
        fail:{ silent:false, msg:"Conditions not met for Round 1." },
        reward:[],
        gimmick:[
          { type:"command", cmd:"effect give @player speed 10 1" },
          { type:"function" }
        ]
      },

      {
        spec:"yourspec3",                // trainer JSON for round 2
        message:"Rematch – Round 2",
        delay:40,
        maxItemUses:1,
        conditions:[
          { type:"item", id:"minecraft:diamond", count:150 }
        ],
        fail:{ silent:false, msg:"Conditions not met for Round 2." },
        reward:[],
        gimmick:[]
      }
    ]
  },

  // === Battle Positioning ===
  pos:{
    enable:false,
    tpTrainer:[423.5,-20.5,1518.5], // NPC teleport position
    tpPlayer:[423.5,-20.5,1510.5]   // Player teleport position
  }
};


/////////////////////////////////////////////////////////////////////////////////////////

var API = Java.type("noppes.npcs.api.NpcAPI").Instance();

var File = Java.type("java.io.File");
var Files = Java.type("java.nio.file.Files");
var StandardCharsets = Java.type("java.nio.charset.StandardCharsets");
var RCTApi = Java.type("com.gitlab.srcmc.rctapi.api.RCTApi");
var TrainerModel = Java.type("com.gitlab.srcmc.rctapi.api.models.TrainerModel");

var TID = { AUTO:310 };
var GID = { PRED:72, FAIL:73 };

// ===   UTILITIES   ===
function dbg(n,msg){ if(FE.debug) n.say(msg); }
function nowKST(){
  var L=Java.type("java.time.LocalDateTime"),
      Z=Java.type("java.time.ZoneId"),
      F=Java.type("java.time.format.DateTimeFormatter");
  return L.now(Z.of("Asia/Seoul")).format(F.ofPattern("yyyy-MM-dd HH:mm:ss"));
}
function bType(t){
  if(t===2)return"GEN_9_DOUBLES";
  if(t===3)return"GEN_9_MULTI";
  return"GEN_9_SINGLES";
}
// === BATTLE CONDITIONS / REWARD ====
function okCond(p,c){
  if(c.type=="item") return hasItem(p, c.id, c.count||1);
  if(c.type=="stored") return (p.getStoreddata().get(c.key)+"")===(c.value+"");
  if(c.type=="advancement") return p.hasAdvancement(c.id);
  if(c.type=="tag") return p.hasTag(c.tag);
  if(c.type=="faction"){return p.getFactionPoints(c.id) >= (c.score||0);}
  return false;
}
function hasItem(p, id, count){
    var inv = p.getInventory();
    var need = count || 1, total = 0;
    for(var i=0;i<inv.getSize();i++){
        var st = inv.getSlot(i);
        if(st && st.getName().equals(id)) total += st.getStackSize();
        if(total >= need) return true;
    }
    return false;
}
function allConds(p,arr){
  if(!arr || arr.length==0) return true;
  for(var i=0;i<arr.length;i++)
    if(!okCond(p,arr[i])) return false;
  return true;
}
function giveRewards(n,p,list){
  if(!list) return;
  var w=p.getWorld();
  for(var i=0;i<list.length;i++){
    var r=list[i];
    if(r.type=="item") p.giveItem(w.createItem(r.id,r.count||1));
    else if(r.type=="xp") n.executeCommand("xp add "+p.getName()+" "+(r.amount||1));
    else if(r.type=="pokemon") n.executeCommand('pokegiveother "'+p.getName()+'" '+r.species);
    else if(r.type=="faction") p.addFactionPoints(r.id, r.score||0);
    else if(r.type=="command"){
      var cmd=r.cmd.replace("@player",p.getName()).replace("@leader",n.getName());
      n.executeCommand(cmd);
    }
    else if(r.type=="advancement") n.executeCommand("advancement grant "+p.getName()+" only "+r.id)
    else if(r.type=="tag") p.addTag(r.tag);
  }
}
function runGimmick(n,p,list){
  if(!list) return;
  for(var i=0;i<list.length;i++){
    var g=list[i];
    if(g.type=="command"){
      var cmd=g.cmd.replace("@player",p.getName()).replace("@leader",n.getUUID());
      n.executeCommand(cmd);
    }
    else if(g.type=="function"){
      n.getWorld().getTempdata().put("rise_triggered",true);
    }
  }
}
// === PLAYER RECORD ===
function getRec(p,n){
  var raw=p.getStoreddata().get("leaderData");
  if(!raw) return null;
  var o=JSON.parse(raw);
  return o[n.getUUID()]||null;
}
function setRec(p,n,patch){
  var sd=p.getStoreddata();
  var raw=sd.get("leaderData");
  var obj=raw?JSON.parse(raw):{};
  var id=n.getUUID();
  if(!obj[id])
    obj[id]={firstClear:false, rematchIdx:0, ts:nowKST()};
  for(var k in patch) obj[id][k]=patch[k];
  sd.put("leaderData", JSON.stringify(obj));
}
// === GUI / FACE / NPC STATE ===
function openMsgGui(p,id,msg){
  var g=API.createCustomGui(id,256,128,false,p);
  g.addLabel(1,"§f"+msg,16,56,224,16).setCentered(true);
  p.showCustomGui(g);
}
function faceEach(n,p){
  n.executeCommand("execute as "+p.getName()+" at @s run tp "+p.getName()+" ~ ~ ~ facing entity "+n.getUUID()+" feet");
  n.executeCommand("execute as "+n.getUUID()+" at @s run tp "+n.getUUID()+" ~ ~ ~ facing entity "+p.getName()+" feet");
}
function init(e){ setState(e.npc); }
function setState(n){
  var ai=n.ai, st=n.getStats();
  ai.setReturnsHome(CFG.state.returnsHome);
  ai.setWalkingSpeed(CFG.state.walkSpeed);
  ai.setMovingType(CFG.state.moveType);
  st.setMaxHealth(CFG.state.maxHealth);
  n.setHealth(CFG.state.maxHealth);
  ai.setStandingType(1);
}
// === TRAINER ATTACH/DETACH ===
function detachOldTrainer(n){
    var sd=n.getStoreddata();
    var oldId = sd.get(FE.storeKey);
    if(!oldId) return;
    try{
        var reg = RCTApi.getInstance(FE.apiId).getTrainerRegistry();
        reg.unregisterById(oldId);
        dbg(n, "§7[detach] removed old trainer: "+oldId);
    }catch(e){
        dbg(n, "§c[detach error] "+e);
    }
    sd.remove(FE.storeKey);
}
function randomId(){ return "trainer_" + Math.floor(Math.random()*900000 + 100000);}
function getExternalDir(){var f = new File(FE.externalDir);if(!f.exists()) f.mkdirs();return f;}
function loadText(file){return new java.lang.String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);}
function createTempJson(spec, runtimeId, npcName){
    var src = new File(getExternalDir(), spec + ".json");
    if(!src.exists()) return null;
    var tmp = new File(getExternalDir(), runtimeId + ".json");
    var raw = loadText(src);
    var modified = raw.replace(
        /"name"\s*:\s*"([^"]*)"/,
        "\"name\": \"" + npcName + "\""
    );
    Files.write(tmp.toPath(), modified.getBytes(StandardCharsets.UTF_8));
    return tmp;
}
function registerTrainer(npc, trainerId, apiId, jsonFile){
  var raw = loadText(jsonFile);
  var api = RCTApi.getInstance(apiId);
  var reg = api.getTrainerRegistry();
  var gson = api.gsonBuilder().setPrettyPrinting().disableHtmlEscaping().create();
  var model = gson.fromJson(raw, TrainerModel.class);
  try { reg.unregisterById(trainerId); } catch(e){}
  var t = reg.registerNPC(trainerId, model);
  if(!t) return null;

  t.setEntity(npc.getMCEntity());
  return t;
}
function applyTrainerRuntime(n, spec){
  detachOldTrainer(n);  
  var runtimeId = randomId();
  var npcName = n.getDisplay().getName();
  var temp = createTempJson(spec, runtimeId, npcName);
  if(!temp){ dbg(n, "§cSpec not found: "+spec); return false; }
  dbg(n, "§7[attach] spec="+spec+" runtimeId="+runtimeId);
  var t = registerTrainer(n, runtimeId, FE.apiId, temp);
  if(!t){ dbg(n, "§cAttach failed: "+runtimeId); try{temp.delete();}catch(e){} return false; }

  n.getStoreddata().put(FE.storeKey, runtimeId);
  dbg(n, "§aTrainer attached: "+runtimeId);
  try{ temp.delete(); dbg(n, "§7Temp deleted"); }catch(e){}
  return true;
}

// === Interact ===
function interact(e){
  var n=e.npc, p=e.player;
  var by=p.getStoreddata().get("battle_busy_by"),
      ts=p.getStoreddata().get("battle_busy_ts");
  if(by && by!=n.getUUID()){
    if(ts && Date.now()-parseInt(ts)>20000){
      p.getStoreddata().remove("battle_busy_by");
      p.getStoreddata().remove("battle_busy_ts");
    } else return;
  }
  var rec=getRec(p,n);
  var isFirst=!(rec && rec.firstClear);
  var round=null;
  // FIRST
  if(isFirst){
    if(allConds(p, CFG.firstbattle.conditions) === false){
      var F=CFG.firstbattle.fail;
      if(F.silent!==true) openMsgGui(p,GID.FAIL,F.msg);
      return;
    }
  }
  // REMATCH
  else{
    if(CFG.rematch.enabled !== true){
      openMsgGui(p,GID.FAIL,"No rematches available.");
      return;
    }
    var idx=rec?rec.rematchIdx:0;
    if(idx>=CFG.rematch.rounds.length){
      openMsgGui(p,GID.FAIL,"All rematches cleared.");
      return;
    }
    round=CFG.rematch.rounds[idx];
    if(allConds(p, round.conditions) === false){
      if(!round.fail.silent) openMsgGui(p,GID.FAIL,round.fail.msg);
      return;
    }
  }
  p.getStoreddata().put("battle_busy_by", n.getUUID());
  p.getStoreddata().put("battle_busy_ts",""+Date.now());
  n.getTempdata().put("leader_target", p.getName());
  n.getTempdata().put("leader_first", isFirst?"1":"0");
  n.getTempdata().put("leader_idx", round?(""+(rec?rec.rematchIdx:0)):"-1");

  openMsgGui(p, GID.PRED, isFirst?CFG.firstbattle.message:round.message);
  n.timers.forceStart(TID.AUTO, isFirst?CFG.firstbattle.delay:round.delay, false);
}

function timer(e){
  if(e.id!=TID.AUTO) return;

  var n=e.npc, td=n.getTempdata(), w=n.getWorld();
  var p=w.getPlayer(td.get("leader_target"));
  if(!p){ td.clear(); return; }

  var isFirst = td.get("leader_first")==="1";
  var idx=parseInt(td.get("leader_idx"));

  n.ai.setStandingType(2);
  n.setMainhandItem(n.getWorld().createItem(CFG.battle.ball,1));

  if(CFG.pos.enable){
    var t=CFG.pos.tpTrainer, pl=CFG.pos.tpPlayer;
    n.setPosition(t[0],t[1],t[2]);
    p.setPosition(pl[0],pl[1],pl[2]);
  }

  faceEach(n,p);

  var spec = isFirst ? CFG.firstbattle.spec : CFG.rematch.rounds[idx].spec;
  applyTrainerRuntime(n, spec);

  p.playSound(CFG.sound.start.name, CFG.sound.start.vol, CFG.sound.start.pitch);

  var mx = isFirst 
          ? (CFG.firstbattle.maxItemUses || CFG.battle.maxItemUses)
          : (CFG.rematch.rounds[idx].maxItemUses || CFG.battle.maxItemUses);

  var rule = "{maxItemUses:"+mx+"}";
  var hook="onwin {1:['execute as @2 run noppes script trigger 1 "+p.getName()+"'], 2:['execute as @1 run noppes script trigger 2 "+p.getName()+"']}";

  var cmd = "/tbcs battle "+bType(CFG.battle.type)+" "+p.getName()+" vs @s "+hook+" rules "+rule;
  n.executeCommand(cmd);
}

function trigger(e){
  var n=e.entity;
  var p=n.getWorld().getPlayer(e.arguments[0]);
  if(!p) return;

  n.executeCommand("/stopsound "+p.getName()+" * "+CFG.sound.start.name);

  var rec=getRec(p,n);
  var first = !(rec && rec.firstClear);

  if(e.id==1){
    if(first){
      giveRewards(n,p,CFG.firstbattle.reward);
      runGimmick(n,p,CFG.firstbattle.gimmick);
      setRec(p,n,{ firstClear:true, ts:nowKST() });
    }else{
      var idx=rec?rec.rematchIdx:0;
      if(idx < CFG.rematch.rounds.length){
        var R=CFG.rematch.rounds[idx];
        giveRewards(n,p,R.reward);
        runGimmick(n,p,R.gimmick);
        setRec(p,n,{ rematchIdx:idx+1, ts:nowKST() });
      }
    }
  }

  p.getStoreddata().remove("battle_busy_by");
  p.getStoreddata().remove("battle_busy_ts");

  setState(n);
  n.timers.clear();
  n.getTempdata().clear();
  n.setMainhandItem(n.getWorld().createItem("minecraft:air",1));
  n.updateClient();
}
