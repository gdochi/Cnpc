var API=Java.type("noppes.npcs.api.NpcAPI").Instance();
var File=Java.type("java.io.File"),Files=Java.type("java.nio.file.Files"),StandardCharsets=Java.type("java.nio.charset.StandardCharsets");
var RCTApi=Java.type("com.gitlab.srcmc.rctapi.api.RCTApi"),TrainerModel=Java.type("com.gitlab.srcmc.rctapi.api.models.TrainerModel");
var BR=Java.type("com.cobblemon.mod.common.battles.BattleRegistry"),TBA=Java.type("com.cobblemon.mod.common.battles.actor.TrainerBattleActor"),PBA=Java.type("com.cobblemon.mod.common.battles.actor.PokemonBattleActor");

var TID={DETECT:100,AUTO:300,UNLOCK_P:999},GID={PRED:40,FAIL:41};
var trainer,w,CFG;

function init(e){
  var n=e.npc;trainer=n;w=n.getWorld();CFG=callCFG(n);
  n.getStoreddata().put("denyList","{}"); reset(n,"end");
  n.timers.clear()
  var d=CFG.DETECTION||{}; if(d.detectType!==0) n.timers.forceStart(TID.DETECT,d.detectTick||20,true)
}
function interact(e){
  var n=e.npc,p=e.player,td=n.getTempdata();
  CFG=callCFG(n);
  var b=CFG.DETECTION||{};
  if(parseInt(b.detectType)!==0) return;
  if(doCheck(n,td,p)===false) return;
  td.put("target",p);
  td.put("busy","busy");
  startFlow(n,p);
}
function timer(e){
  if(e.id===TID.DETECT) doDetect(trainer,trainer.getTempdata());
  if(e.id===TID.AUTO) battleStart(trainer);
}
function doDetect(n,td){
  var d=CFG.DETECTION||{},type=parseInt(d.detectType,10),p=null;
  if(type==0) return;
  if(type==1) p=fixT(n,d);
  else if(type===2) p=radT(n,d);
  if(!p) return;
  if(doCheck(n,td,p)===false) return;
  td.put("target",p); td.put("busy","busy");
  startFlow(n,p);
}
function doCheck(n,td,p){
  if(!p) return false;
  var gm=p.getGamemode();
  if(gm===1||gm===3) return false;
  if(td.get("busy")==="busy") return false;
  if(isDenied(n,p)) return false;
  if(isBattle(p)===false) return false;
  var r=isCondSat(p,n,false); if(!r.ok) return false;
  return true;
}
function doDash(n,p,pos){
  if(!pos||pos.dashEnable!==true||!p) return;
  var dx=p.x-n.x,dz=p.z-n.z;
  var len=Math.sqrt(dx*dx+dz*dz); if(len<=0) return;
  dx/=len; dz/=len;
  var pow=parseFloat(pos.dashPower)||1.2;
  n.setMotionX(dx*pow); n.setMotionY(0.1); n.setMotionZ(dz*pow);
}
function fixT(n,d){
  var r=(d.visionDistance||8)+1,L=w.getNearbyEntities(n.getPos(),r,1),f=fw(n),best=null,m=9e9,ny=n.y,wd=d.visionWidth||1;
  for(var i=0;i<L.length;i++){var p=L[i],dx=p.x-n.x,dz=p.z-n.z,dot=dx*f.x+dz*f.z;if(dot>0&&Math.abs(dx*f.z-dz*f.x)<=wd&&Math.abs(p.y-ny)<=2&&dot<m){m=dot;best=p;}}
  return best;
}
function radT(n,d){
  var r=d.radiusRange||10,L=w.getNearbyEntities(n.getPos(),r+1,1),best=null,m=9e9,ny=n.y,rr=r*r;
  for(var i=0;i<L.length;i++){var p=L[i],dx=p.x-n.x,dz=p.z-n.z,d2=dx*dx+dz*dz;if(d2<=rr&&Math.abs(p.y-ny)<=2&&d2<m){m=d2;best=p;}}
  return best;
}
function fw(n){var r=n.getRotation()*Math.PI/180;return{x:-Math.sin(r),z:Math.cos(r)};}
function isDenied(n,p){
  var raw=n.getStoreddata().get("denyList"); if(!raw) return false;
  var ts=JSON.parse(raw)[p.getUUID()]; if(!ts) return false;
  return Date.now()<ts;
}
function isBattle(p){
  var b=BR.getBattleByParticipatingPlayer(p.getMCEntity());
  if(!b) return true;
  for each(var a in b.getActors()) if(a instanceof TBA) return false;
  for each(var a in b.getActors()) if(a instanceof PBA){var o=a.getPokemon().getOriginalPokemon().getOwnerPlayer(); if(o==null) return false;}
  return false;
}
function isCondSat(p,n,debug){
  var log=[],CFG=callCFG(n),condAll=CFG.CONDITION||{};
  if(debug) log.push("RAW "+JSON.stringify(condAll));
  var rIdx=condRound(p,n,CFG),key="round_"+rIdx,pack=condAll[key],mode=(pack&&pack.mode!=null)?pack.mode:0,rules=(pack&&pack.rules)?pack.rules:[];
  if(debug) log.push("ROUND "+key+" mode="+(mode===1?"OR":"AND")+" rules="+rules.length);
  if(!rules.length) return debug?{ok:true,key:key,mode:mode,log:log}:{ok:true,key:key,mode:mode};
  for(var i=0;i<rules.length;i++){
    var c=rules[i]||{},type=""+(c.type||""),op=c.op!=null?""+c.op:"",k=c.key!=null?""+c.key:"",v=c.val!=null?""+c.val:null;
    if(debug) log.push("idx="+i+" type="+type+" op="+op+" key="+k+" val="+v);
    var res=condOne(p,n,type,op,k,v);
    if(debug&&res.msg) log.push(res.msg);
    if(mode===1){ if(res.pass) return debug?{ok:true,key:key,mode:mode,log:log}:{ok:true,key:key,mode:mode}; }
    else{ if(!res.pass) return debug?{ok:false,key:key,mode:mode,log:log}:{ok:false,key:key,mode:mode}; }
  }
  return mode===1 ? (debug?{ok:false,key:key,mode:mode,log:log}:{ok:false,key:key,mode:mode}) : (debug?{ok:true,key:key,mode:mode,log:log}:{ok:true,key:key,mode:mode});
}
function condOne(p,n,type,op,key,val){
if(type==="item"){
  if(!key) return{pass:false,msg:"✖ ITEM key missing"};
  if(op!=="has"&&op!=="not"&&op!==">=") op="has";
  var has=0;
  try{has=p.getInventory().count(p.getWorld().createItem(key,1),true,true);}
  catch(e){return{pass:false,msg:"✖ ITEM invalid id "+key};}
  if(op==="has"){
    return has>0
      ?{pass:true,msg:"✔ ITEM has "+key+" ("+has+")"}
      :{pass:false,msg:"✖ ITEM has "+key+" (0)"};
  }
  if(op==="not"){
    return has===0
      ?{pass:true,msg:"✔ ITEM not "+key}
      :{pass:false,msg:"✖ ITEM not "+key+" ("+has+")"};
  }
  var need=parseInt(val,10);
  if(isNaN(need)||need<1) return{pass:false,msg:"✖ ITEM >= invalid value"};
  return has>=need
    ?{pass:true,msg:"✔ ITEM "+key+" ("+has+"/"+need+")"}
    :{pass:false,msg:"✖ ITEM "+key+" ("+has+"/"+need+")"};
}
if(type==="stored"){
  if(!key) return{pass:false,msg:"✖ STORED key missing"};
  if(op!=="=="&&op!==">="&&op!=="<=") op="==";
  var cur=p.getStoreddata().get(key),tgt=val!=null?""+val:"";

  if(op==="==")
    return(""+cur)===tgt
      ?{pass:true,msg:"✔ STORED "+key+" == "+tgt}
      :{pass:false,msg:"✖ STORED "+key+" == "+tgt};

  var nv=parseFloat(cur),nt=parseFloat(tgt);
  if(isNaN(nv)||isNaN(nt))
    return{pass:false,msg:"✖ STORED "+key+" invalid"};

  if(op===">="&&nv<nt) return{pass:false,msg:"✖ STORED "+key+" >= "+nt};
  if(op==="<="&&nv>nt) return{pass:false,msg:"✖ STORED "+key+" <= "+nt};
  return{pass:true,msg:"✔ STORED "+key+" "+op+" "+tgt};
}
  if(type==="tag"){
    if(!key) return{pass:false,msg:"✖ TAG key missing"};
    if(op!=="has"&&op!=="not") op="has";
    var ok=false; try{ok=p.hasTag(key);}catch(e){}
    if(op==="has"&&!ok) return{pass:false,msg:"✖ TAG has "+key};
    if(op==="not"&&ok) return{pass:false,msg:"✖ TAG not "+key};
    return{pass:true,msg:"✔ TAG "+op+" "+key};
  }
  if(type==="faction"){
    if(!key) return{pass:false,msg:"✖ FACTION key missing"};
    if(op!=="=="&&op!==">="&&op!=="<=") op="==";
    var pts=0; try{pts=p.getFactionPoints(key);}catch(e){}
    var t=parseInt(val!=null?val:"0",10); if(isNaN(t)) t=0;
    if(op==="=="&&pts!==t) return{pass:false,msg:"✖ FACTION "+key+" == "+t};
    if(op===">="&&pts<t) return{pass:false,msg:"✖ FACTION "+key+" >= "+t};
    if(op==="<="&&pts>t) return{pass:false,msg:"✖ FACTION "+key+" <= "+t};
    return{pass:true,msg:"✔ FACTION "+key+" "+op+" "+t+" ("+pts+")"};
  }
  if(type==="adv"){
    if(!key) return{pass:false,msg:"✖ ADV key missing"};
    if(op!=="done"&&op!=="not") return{pass:false,msg:"✖ ADV invalid op "+op};
    var has=false; try{has=p.hasAdvancement(key);}catch(e){}
    if(op==="done"&&!has) return{pass:false,msg:"✖ ADV done "+key};
    if(op==="not"&&has) return{pass:false,msg:"✖ ADV not "+key};
    return{pass:true,msg:"✔ ADV "+op+" "+key};
  }
  return{pass:false,msg:"✖ UNKNOWN type "+type};
}
function condRound(p,n,CFG){
  var raw=p.getStoreddata().get("trainerData"),data=raw?JSON.parse(raw):null,rec=data?data[n.getUUID()]:null;
  if(!(rec&&rec.firstClear===true)) return 0;
  var cleared=1; if(rec&&rec.clearCount!=null){var cc=parseInt(rec.clearCount,10);if(!isNaN(cc)&&cc>=1)cleared=cc;}
  var b=CFG.BATTLE||{}; if(!b.rematchEnable) return 1;
  var m=parseInt(b.rematchMax,10); if(isNaN(m)||m<0) m=0;
  var maxIdx=1+m; if(cleared>maxIdx) cleared=maxIdx; if(cleared<1) cleared=1;
  return cleared;
}
function startFlow(n,p){
  CFG=callCFG(n);
  var rIdx=condRound(p,n,CFG);
  var b=CFG.BATTLE||{},mode=parseInt(b.startType)||0;
  if(mode==0){ n.timers.forceStart(TID.AUTO,1,false); return; }
  if(mode==1){
    doDash(n,p,CFG.POSITION||{});
    sayBattleGui(p,n,rIdx);
    n.timers.forceStart(TID.AUTO,b.startDelay||20,false);
    return;
  }
}
function specDetach(n){
  var sd=n.getStoreddata(), old=sd.get("trainer_attached_id");
  if(!old) return;
  try{ RCTApi.getInstance("tbcs").getTrainerRegistry().unregisterById(old); }catch(e){}
  sd.remove("trainer_attached_id");
}
function specId(){ return "trainer_"+Math.floor(Math.random()*900000+100000); }
function specDir(){
  var raw=CFG.EXTERNAL.folderPath||""; if(!raw) return null;
  var f=(raw.indexOf(":")!==-1||raw.startsWith("/")||raw.startsWith("\\"))?new File(raw):new File(new File("."),raw);
  if(!f.exists()) f.mkdirs();
  return f;
}
function specLoad(f){ return new java.lang.String(Files.readAllBytes(f.toPath()),StandardCharsets.UTF_8); }
function specTemp(spec,id,name){
  var src=new File(specDir(),spec+".json"); if(!src.exists()) return null;
  var tmp=new File(specDir(),id+".json"),raw=specLoad(src),mod=raw.replace(/"name"\s*:\s*"([^"]*)"/,'"name": "'+name+'"');
  Files.write(tmp.toPath(),mod.getBytes(StandardCharsets.UTF_8));
  return tmp;
}
function specRegister(n,id,json){
  var raw=specLoad(json),api=RCTApi.getInstance("tbcs"),reg=api.getTrainerRegistry(),g=api.gsonBuilder().disableHtmlEscaping().create(),m=g.fromJson(raw,TrainerModel.class);
  try{ reg.unregisterById(id); }catch(e){}
  var t=reg.registerNPC(id,m); if(!t) return null;
  t.setEntity(n.getMCEntity());
  return t;
}
function specApply(n,spec){
  if(!spec) return false;
  specDetach(n);
  var id=specId(),tmp=specTemp(spec,id,n.getDisplay().getName()); if(!tmp) return false;
  var t=specRegister(n,id,tmp); if(!t) return false;
  n.getStoreddata().put("trainer_attached_id",id);
  try{ tmp.delete(); }catch(e){}
  return true;
}
function battleStart(n){
  CFG=callCFG(n);

  var td=n.getTempdata(),p=td.get("target"); if(!p){;reset(n,"cancel");return;}
  var rIdx=condRound(p,n,CFG),dt=CFG.DETAIL||{},spec=dt["trainerSpec_"+rIdx];

  var maxItemUses=parseInt(dt["itemLimit_"+rIdx],10); if(isNaN(maxItemUses)||maxItemUses<0) maxItemUses=0;
  if(!spec||!specApply(n,spec)){reset(n,"cancel");return;}
  p.getStoreddata().put("battle_busy_by",n.getUUID()); p.getStoreddata().put("battle_busy_ts",Date.now());
  var pos=CFG.POSITION||{};if(pos.useReposition===true) battleForwardTP(n,p,pos);
  n.setPosition((n.getHomeX()+0.5),(n.getHomeY()+1),(n.getHomeZ()+0.5))
  var basic=CFG.BASIC||{};if(basic.handItem) {var it=n.getWorld().createItem(basic.handItem,1);if(it) n.setMainhandItem(it);}

  var s=(CFG.SOUND&&CFG.SOUND.start)?CFG.SOUND.start:{}; if(s.id) p.playSound(s.id,(s.vol!=null?s.vol:1),(s.pitch!=null?s.pitch:1));
  var bt="GEN_9_SINGLES",rules="{maxItemUses:"+maxItemUses+"}";
  var hook="onwin {1:['@2 noppes script trigger 1 "+p.getName()+"'],2:['@1 noppes script trigger 2 "+p.getName()+"']}";
  n.executeCommand("/tbcs battle "+bt+" "+p.getName()+" vs "+n.getUUID()+" "+hook+" rules "+rules);
}
function battleForwardTP(n,p,pos){
  var r=n.getRotation()*Math.PI/180;
  var dist = (pos.playerDistance!=null?pos.playerDistance:0);
  var yoff = (pos.playerHeight!=null?pos.playerHeight:0.5);
  var fx=-Math.sin(r)*dist;
  var fz= Math.cos(r)*dist;
  p.setPosition((n.getHomeX()+fx), (n.getHomeY()+yoff), (n.getHomeZ()+fz));
}
function battleType(t){
  if(t===1) return "GEN_9_SINGLES";
  if(t===2) return "GEN_9_DOUBLES";
  if(t===3) return "GEN_9_MULTI";
  return "GEN_9_SINGLES";
}
function reset(n,flag){
  var td=n.getTempdata(),t=n.timers,p=td.get("target"),d=CFG.DETECTION||{};
  var m=n.getMarks()[0]; if(m) n.removeMark(m);
  td.remove("busy"); 
  if(flag==="cancel"){
    n.setMainhandItem(n.getWorld().createItem("minecraft:air",1));
    n.setPosition(n.getHomeX()+0.5,n.getHomeY()+1,n.getHomeZ()+0.5);
    setState(n);
    if(d.detectType!==0) n.timers.forceStart(TID.DETECT,d.detectTick||20,true);
    if(p) n.timers.forceStart(TID.UNLOCK_P,1,false); else td.clear();
    return;
  }
  if(flag==="start"){ n.ai.setReturnsHome(false); n.ai.setWalkingSpeed(0); n.ai.setMovingType(0); return; }
  if(flag==="end"){
    n.setMainhandItem(n.getWorld().createItem("minecraft:air",1));
    n.setPosition(n.getHomeX()+0.5,n.getHomeY()+1,n.getHomeZ()+0.5);
    setState(n); td.clear();
    if(d.detectType!==0) n.timers.forceStart(TID.DETECT,d.detectTick||20,true);
    return;
  }
}
function setState(n){
  var ai=n.ai,b=CFG.BASIC||{},d=CFG.DETECTION||{},mh=parseInt(b.maxHealth,10)||20;
  ai.setWalkingSpeed(parseFloat(b.walkSpeed)||0);
  n.getStats().setMaxHealth(mh); n.setHealth(mh);
  if(d.detectType===1) ai.setStandingType(1);
  else if(d.detectType===2) ai.setStandingType(2);
  else ai.setStandingType(0);
  n.updateClient();
}
function addDeny(n,p,ms){
  var sd=n.getStoreddata(),raw=sd.get("denyList"),obj=raw?JSON.parse(raw):{};
  obj[p.getUUID()] = Date.now()+ms;
  sd.put("denyList", JSON.stringify(obj));
}
function callCFG(n){
  var sd=n.getStoreddata();
  function j(k,d){var raw=sd.get(k);return raw?JSON.parse(raw):d;}
  return{BASIC:j("cfg.BASIC",{}),DETECTION:j("cfg.DETECTION",{}),BATTLE:j("cfg.BATTLE",{}),DETAIL:j("cfg.DETAIL",{}),CONDITION:j("cfg.CONDITION",{}),REWARD:j("cfg.REWARD",{}),POSITION:j("cfg.POSITION",{}),SOUND:j("cfg.SOUND",{}),EXTERNAL:j("cfg.EXTERNAL",{})};
}
function trigger(e){
  var n=e.entity,p=n.getWorld().getPlayer(e.arguments[0]);if(!p) return;
  CFG=callCFG(n);
  var rIdx=condRound(p,n,CFG)
  if(CFG.SOUND&&CFG.SOUND.start) n.executeCommand("stopsound "+p.getName());
  if(e.id===1){
    var s=CFG.BATTLE||{},t=parseInt(s.denyCooldown,10)||0;
    if(t>0) addDeny(n,p,t*50);
    afterReward(n,p,rIdx);
    afterClear(p,n);
    reset(n,"end"); 
    return;
  }
  if(e.id===2){var s=CFG.BATTLE||{},t=parseInt(s.denyCooldown,10)||0; if(t>0) addDeny(n,p,t*50);reset(n,"cancel"); return;}
  reset(n,"end");
}
function afterClear(p,n){
  var sd=p.getStoreddata(),raw=sd.get("trainerData"),obj=raw?JSON.parse(raw):{},k=n.getUUID(),r=obj[k]||{};
  r.firstClear=true;
  r.clearCount=(r.clearCount||0)+1;
  obj[k]=r;
  sd.put("trainerData",JSON.stringify(obj));
}
function afterReward(n,p,round){
  var raw=n.getStoreddata().get("cfg.REWARD");
  if(!raw){ p.message("§c[Reward] No reward config found."); return; }

  var cfg=JSON.parse(raw);
  var data=cfg["round_"+round];
  if(!data||!data.rewards||!data.rewards.length){
    p.message("§e[Reward] No rewards for this round.");
    return;
  }
  var list=data.rewards,pick=list;
  var mode=parseInt(data.mode,10)||0;
  if(mode===1) pick=[list[Math.floor(Math.random()*list.length)]];
  var log=["§6[Reward] Granted rewards:"];
  for(var i=0;i<pick.length;i++){
    var r=pick[i]; if(!r) continue;

    if(r.type==="faction"){
      var pts=parseInt(r.val,10)||0;
      p.addFactionPoints(r.key,pts);
      log.push(" §b- Faction §f"+r.key+" §a+"+pts);
    }
    else if(r.type==="item"){
      var cnt=parseInt(r.val,10)||1;
      p.giveItem(p.getWorld().createItem(r.key,cnt));
      log.push(" §a- Item §f"+r.key+" §7x"+cnt);
    }
    else if(r.type==="command"){var cmd=r.key.replace("@player",p.getName()).replace("@npc",n.getUUID());n.executeCommand(cmd);}
    else if(r.type==="adv"){n.executeCommand("advancement grant "+p.getName()+" only "+r.key);log.push(" §d- Advancement §f"+r.key);}
  }
  p.updatePlayerInventory();
  for(var i=0;i<log.length;i++) p.message(log[i]);
}
function sayBattleGui(p,n,rIdx){
  function rc(){return 0xFF000000|(Math.random()*0xFFFFFF)|0;}
  var d=CFG.DETAIL||{},msg=d["startMessage_"+rIdx]||"§fBattle?",
      list=String(msg).split("@@"),
      W=256,H=256,Y=50,G=15,
      LINE_MAIN=rc(),LINE_SUB=rc(),THICK=2.0,THIN=1.0,
      g=API.createCustomGui(GID.PRED,W,H,false,p);

  g.addColoredLine(10,-1000,Y-20,1000,Y-20,LINE_MAIN,THICK);
  g.addColoredLine(11,-1000,Y-18,1000,Y-18,LINE_SUB,THIN);
  for(var i=0;i<list.length;i++)
    g.addLabel(20+i,list[i],0,(Y-10)+i*G,W,16).setCentered(true);
  var by=Y+list.length*G+4;
  g.addColoredLine(12,-1000,by,1000,by,LINE_SUB,THIN);
  g.addColoredLine(13,-1000,by+2,1000,by+2,LINE_MAIN,THICK);
  p.showCustomGui(g);
}


