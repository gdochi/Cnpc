var API=Java.type("noppes.npcs.api.NpcAPI").Instance();
var File=Java.type("java.io.File"),Files=Java.type("java.nio.file.Files"),StandardCharsets=Java.type("java.nio.charset.StandardCharsets");
var RCTApi=Java.type("com.gitlab.srcmc.rctapi.api.RCTApi"),TrainerModel=Java.type("com.gitlab.srcmc.rctapi.api.models.TrainerModel");
var BR=Java.type("com.cobblemon.mod.common.battles.BattleRegistry"),TBA=Java.type("com.cobblemon.mod.common.battles.actor.TrainerBattleActor"),PBA=Java.type("com.cobblemon.mod.common.battles.actor.PokemonBattleActor");

var TID={DETECT:100,AUTO:300,SYN:400,DLG:500,UNLOCK_P:999},GID={DLG:39,PRED:40,FAIL:41};
var trainer,w,CFG;

var PLAYER=null,TELLER=null,SIM=null,DLG_NEXT=null;
var DID={PREV:1,NEXT:2,PAGE:3,ENTITY:10,BG:11,TEXT:100};

var DF={
  MODE:{type:"page",ui:{prevBtn:{x:328,y:185},nextBtn:{x:388,y:185},pageLabel:{x:360,y:190}},sentence:{gapTick:20},char:{gapTick:20,charsPerStep:2,typeTick:2}},
  TEXT:{text:"",lines:5,ui:{labelX:20,labelY:12,lineGap:12}},
  NPC:{on:"true",follow:"false",rot:-45,scale:2,pos:{x:-152,y:290}},
  ASSET:{texture:"",rect:{x:0,y:0,w:0,h:0,tx:0,ty:0}},
  SOUND:{open:{},sentence:{},char:{}}
};
function toInt(v,d){var n=parseInt(String(v),10);return isNaN(n)?d:n;}
function toF(v,d){var n=parseFloat(String(v));return isNaN(n)?d:n;}
function merge(b,d){for(var k in d){if(d[k]!==null&&typeof d[k]==="object"&&!Array.isArray(d[k])){if(!b[k]) b[k]={};merge(b[k],d[k]);}else b[k]=d[k];}return b;}
function load(sd,k,def){var b=JSON.parse(JSON.stringify(def)),r=sd.get(k);if(!r) return b;try{return merge(b,JSON.parse(r));}catch(e){return b;}}
function init(e){
  var n=e.npc;trainer=n;w=n.getWorld();CFG=callCFG(n);
  n.getStoreddata().put("denyList","{}");reset(n,"end");
  n.timers.clear();
  var d=CFG.DETECTION||{};if(d.detectType!==0) n.timers.forceStart(TID.DETECT,d.detectTick||20,true);
}
function interact(e){
  var n=e.npc,p=e.player,td=n.getTempdata();
  CFG=callCFG(n);
  var b=CFG.DETECTION||{};
  if(parseInt(b.detectType)!==0) return;
  if(doCheck(n,p)===false) return;
  td.put("target",p);
  td.put("busy","busy");
  startFlow(n,p);
}
function timer(e){
  var n=e.npc,td=n.tempdata 
  if(e.id===TID.DETECT) doDetect(trainer);
  if(e.id===TID.AUTO) battleStart(trainer);
  if(e.id===TID.DLG) dlgTick();
  if(e.id===TID.SYN&&td.get("target")){synAngle(n,td.get("target"));n.timers.forceStart(TID.SYN,10,false)}
}
function doDetect(n){
  var d=CFG.DETECTION||{},type=parseInt(d.detectType,10),p=null;
  var td=n.tempdata
  if(type==0) return;
  if(type==1) p=fixT(n,d);
  else if(type===2) p=radT(n,d);
  if(!p) return;
  if(n.canSeeEntity(p)!== true) return;
  if(doCheck(n,p)===false) return;
  td.put("target",p);
  td.put("busy","busy");
  startFlow(n,p);
}
function doCheck(n,p){
  if(!p) return false;
  var gm=p.getGamemode();var td=n.tempdata
  if(gm===1||gm===3) return false;
  if(td.get("busy")=="busy") return false;
  if(isDenied(n,p)) return false;
  if(isBattle(p)===false) return false;

  var CFG=callCFG(n);
  var raw=p.getStoreddata().get("trainerData");
  var data=raw?JSON.parse(raw):null;
  var rec=data?data[n.getUUID()]:null;

  if(rec&&rec.firstClear===true){if((CFG.BATTLE||{}).rematchEnable==false){return false;}}
  var r=isCondSat(p,n,false);if(!r.ok) return false;
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
  if(!n) return; var w = n.getWorld() 
  var r=d.radiusRange||10,L=w.getNearbyEntities(n.getPos(),r+1,1),best=null,m=9e9,ny=n.y,rr=r*r;
  for(var i=0;i<L.length;i++){var p=L[i],dx=p.x-n.x,dz=p.z-n.z,d2=dx*dx+dz*dz;if(d2<=rr&&Math.abs(p.y-ny)<=2&&d2<m){m=d2;best=p;}}
  return best;
}
function fw(n){var r=n.getRotation()*Math.PI/180;return{x:-Math.sin(r),z:Math.cos(r)};}
function isDenied(n){
  var until=n.getStoreddata().get("deny_until");
  if(!until) return false;
  return Date.now() < parseInt(until,10);
}
function isBattle(p){
  var b=BR.getBattleByParticipatingPlayer(p.getMCEntity());
  if(!b) return true;
  for each(var a in b.getActors()) if(a instanceof TBA) return false;
  for each(var a in b.getActors()) if(a instanceof PBA){var o=a.getPokemon().getOriginalPokemon().getOwnerPlayer();if(o==null) return false;}
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
    if(mode===1){if(res.pass) return debug?{ok:true,key:key,mode:mode,log:log}:{ok:true,key:key,mode:mode};}
    else{if(!res.pass) return debug?{ok:false,key:key,mode:mode,log:log}:{ok:false,key:key,mode:mode};}
  }
  return mode===1 ? (debug?{ok:false,key:key,mode:mode,log:log}:{ok:false,key:key,mode:mode}) : (debug?{ok:true,key:key,mode:mode,log:log}:{ok:true,key:key,mode:mode});
}
function condOne(p,n,type,op,key,val){
  if(type==="item"){
    if(!key) return{pass:false,msg:"✖ ITEM key missing"};
    if(op!=="has"&&op!=="not"&&op!==">=") op="has";
    var has=0;
    try{has=p.getInventory().count(p.getWorld().createItem(key,1),true,true);}catch(e){return{pass:false,msg:"✖ ITEM invalid id "+key};}
    if(op==="has") return has>0?{pass:true,msg:"✔ ITEM has "+key+" ("+has+")"}:{pass:false,msg:"✖ ITEM has "+key+" (0)"};
    if(op==="not") return has===0?{pass:true,msg:"✔ ITEM not "+key}:{pass:false,msg:"✖ ITEM not "+key+" ("+has+")"};
    var need=parseInt(val,10);
    if(isNaN(need)||need<1) return{pass:false,msg:"✖ ITEM >= invalid value"};
    return has>=need?{pass:true,msg:"✔ ITEM "+key+" ("+has+"/"+need+")"}:{pass:false,msg:"✖ ITEM "+key+" ("+has+"/"+need+")"};
  }
  if(type==="stored"){
    if(!key) return{pass:false,msg:"✖ STORED key missing"};
    if(op!=="=="&&op!==">="&&op!=="<=") op="==";
    var cur=p.getStoreddata().get(key),tgt=val!=null?""+val:"";
    if(op==="==") return(""+cur)===tgt?{pass:true,msg:"✔ STORED "+key+" == "+tgt}:{pass:false,msg:"✖ STORED "+key+" == "+tgt};
    var nv=parseFloat(cur),nt=parseFloat(tgt);
    if(isNaN(nv)||isNaN(nt)) return{pass:false,msg:"✖ STORED "+key+" invalid"};
    if(op===">="&&nv<nt) return{pass:false,msg:"✖ STORED "+key+" >= "+nt};
    if(op==="<="&&nv>nt) return{pass:false,msg:"✖ STORED "+key+" <= "+nt};
    return{pass:true,msg:"✔ STORED "+key+" "+op+" "+tgt};
  }
  if(type==="tag"){
    if(!key) return{pass:false,msg:"✖ TAG key missing"};
    if(op!=="has"&&op!=="not") op="has";
    var ok=false;try{ok=p.hasTag(key);}catch(e){}
    if(op==="has"&&!ok) return{pass:false,msg:"✖ TAG has "+key};
    if(op==="not"&&ok) return{pass:false,msg:"✖ TAG not "+key};
    return{pass:true,msg:"✔ TAG "+op+" "+key};
  }
  if(type==="faction"){
    if(!key) return{pass:false,msg:"✖ FACTION key missing"};
    if(op!=="=="&&op!==">="&&op!=="<=") op="==";
    var pts=0;try{pts=p.getFactionPoints(key);}catch(e){}
    var t=parseInt(val!=null?val:"0",10);if(isNaN(t)) t=0;
    if(op==="=="&&pts!==t) return{pass:false,msg:"✖ FACTION "+key+" == "+t};
    if(op===">="&&pts<t) return{pass:false,msg:"✖ FACTION "+key+" >= "+t};
    if(op==="<="&&pts>t) return{pass:false,msg:"✖ FACTION "+key+" <= "+t};
    return{pass:true,msg:"✔ FACTION "+key+" "+op+" "+t+" ("+pts+")"};
  }
  if(type==="adv"){
    if(!key) return{pass:false,msg:"✖ ADV key missing"};
    if(op!=="done"&&op!=="not") return{pass:false,msg:"✖ ADV invalid op "+op};
    var has=false;try{has=p.hasAdvancement(key);}catch(e){}
    if(op==="done"&&!has) return{pass:false,msg:"✖ ADV done "+key};
    if(op==="not"&&has) return{pass:false,msg:"✖ ADV not "+key};
    return{pass:true,msg:"✔ ADV "+op+" "+key};
  }
  return{pass:false,msg:"✖ UNKNOWN type "+type};
}
function condRound(p,n,CFG){
  var raw=p.getStoreddata().get("trainerData"),data=raw?JSON.parse(raw):null,rec=data?data[n.getUUID()]:null;
  if(!(rec&&rec.firstClear===true)) return 0;
  var cleared=1;if(rec&&rec.clearCount!=null){var cc=parseInt(rec.clearCount,10);if(!isNaN(cc)&&cc>=1)cleared=cc;}
  var b=CFG.BATTLE||{};if(b.rematchEnable==false) return 1;
  var m=parseInt(b.rematchMax,10);if(isNaN(m)||m<0) m=0;
  var maxIdx=1+m;if(cleared>maxIdx) cleared=maxIdx;if(cleared<1) cleared=1;
  return cleared;
}
function startFlow(n,p){
  PLAYER=p;TELLER=n;
  var raw=n.getStoreddata().get("dlg.text");
  var b=CFG.BATTLE||{},mode=parseInt(b.startType)||0;
  n.storeddata.put("speed",n.ai.getWalkingSpeed())
  n.addMark(2);svAngle(n,"save");synAngle(n,p);
  if(mode==1)doDash(n,p,CFG.POSITION||{});
  if(raw && String(raw).length>0){startDialogue(function(){battleStart(n);});return;}
  battleStart(n);
}
function startFlowBattle(n,p){
  var CFG=callCFG(n);
  var rIdx=condRound(p,n,CFG);
  var b=CFG.BATTLE||{},mode=parseInt(b.startType)||0;
  if(mode==0){n.timers.forceStart(TID.AUTO,1,false);return;}
  if(mode==1){
    sayBattleGui(p,n,rIdx);
    n.timers.forceStart(TID.AUTO,b.startDelay||20,false);
    return;
  }
  n.timers.forceStart(TID.AUTO,1,false);
}
function startDialogue(nextFn){
  DLG_NEXT=nextFn||null;
  var sd=TELLER.getStoreddata();
  var txt=load(sd,"dlg.text",DF.TEXT);
  var mode=load(sd,"dlg.mode",DF.MODE);
  var snd=load(sd,"dlg.sound",DF.SOUND);
  SIM={page:0,line:0,char:0,lines:[],dlg:txt.text.split("\n"),max:Math.max(1,txt.lines),type:mode.type,typing:false};
  if(snd.open&&snd.open.id) PLAYER.playSound(snd.open.id,toF(snd.open.vol,1),toF(snd.open.pitch,1));
  var g=API.createCustomGui(GID.DLG,256,256,false,PLAYER);
  dlgDraw(g);
  PLAYER.showCustomGui(g);
  dlgStartPage(0);
}
function dlgStartPage(p){
  SIM.page=p;SIM.lines=[];SIM.line=0;SIM.char=0;
  if(SIM.type==="page"){dlgFullPage();return;}
  SIM.typing=true;
  TELLER.timers.forceStart(TID.DLG,1,false);
  dlgUpdate();
}
function dlgFullPage(){
  var out=[],base=SIM.page*SIM.max;
  for(var i=0;i<SIM.max;i++){var l=SIM.dlg[base+i];if(l==null) break;out.push(l);}
  SIM.lines=out;SIM.line=out.length;SIM.char=0;SIM.typing=false;
  dlgUpdate();
}
function dlgTick(){
  if(!SIM||!SIM.typing) return;
  var sd=TELLER.getStoreddata();
  var mode=load(sd,"dlg.mode",DF.MODE);
  var snd=load(sd,"dlg.sound",DF.SOUND);
  var idx=SIM.page*SIM.max+SIM.line;
  var text=SIM.dlg[idx];
  if(text==null){SIM.typing=false;return;}
  if(SIM.type==="char"){
    var cps=Math.max(1,mode.char.charsPerStep||1);
    var cur=SIM.lines[SIM.line]||"";
    for(var i=0;i<cps&&SIM.char<text.length;i++){cur+=text.charAt(SIM.char++);if(snd.char&&snd.char.id) PLAYER.playSound(snd.char.id,snd.char.vol||1,snd.char.pitch||1);}
    SIM.lines[SIM.line]=cur;
    if(SIM.char>=text.length){
      SIM.char=0;
      if(snd.sentence&&snd.sentence.id) PLAYER.playSound(snd.sentence.id,snd.sentence.vol||1,snd.sentence.pitch||1);
      SIM.line++;
      if(SIM.line>=SIM.max){SIM.typing=false;return;}
    }
  }else{
    SIM.lines.push(text);
    if(snd.sentence&&snd.sentence.id) PLAYER.playSound(snd.sentence.id,snd.sentence.vol||1,snd.sentence.pitch||1);
    SIM.line++;
    if(SIM.line>=SIM.max){SIM.typing=false;return;}
  }
  dlgUpdate();
  TELLER.timers.forceStart(TID.DLG,1,false);
}
function dlgNextPage(){
  if(!SIM) return;
  if(SIM.typing){dlgFullPage();return;}
  var max=Math.ceil(SIM.dlg.length/SIM.max)-1;
  if(SIM.page>=max){
    TELLER.timers.stop(TID.DLG);
    PLAYER.closeGui();
    return;
  }
  dlgStartPage(SIM.page+1);
}
function dlgPrevPage(){
  if(SIM.typing){dlgFullPage();return;}
  if(SIM.page<=0) return;
  dlgStartPage(SIM.page-1);
}
function dlgUpdate(){
  var g=PLAYER.getCustomGui();
  if(!g||g.getID()!==GID.DLG) return;
  dlgClear(g);
  dlgDraw(g);
  g.update();
}
function dlgDraw(g){
  var sd=TELLER.getStoreddata();
  var asset=load(sd,"dlg.asset",DF.ASSET);
  var txt=load(sd,"dlg.text",DF.TEXT);
  var mode=load(sd,"dlg.mode",DF.MODE);
  var npc=load(sd,"dlg.npc",DF.NPC);

  if(asset.texture) g.addTexturedRect(DID.BG,asset.texture,asset.rect.x,asset.rect.y,asset.rect.w,asset.rect.h,asset.rect.tx,asset.rect.ty);
  if(npc.on==="true"){
    var ed=g.addEntityDisplay(DID.ENTITY,npc.pos.x,npc.pos.y,TELLER);
    ed.setRotation(npc.rot);ed.setScale(npc.scale);ed.setFollowingCursor(npc.follow==="true");
  }
  var lx=txt.ui.labelX+(asset.rect?asset.rect.x:0);
  var ly=txt.ui.labelY+(asset.rect?asset.rect.y:0);
  for(var i=0;i<SIM.lines.length;i++) g.addLabel(DID.TEXT+i,SIM.lines[i],lx,ly+i*txt.ui.lineGap,256,12);
  var total=Math.max(1,Math.ceil(SIM.dlg.length/SIM.max));
  g.addButton(DID.PREV,"<",mode.ui.prevBtn.x,mode.ui.prevBtn.y,20,20);
  g.addLabel(DID.PAGE,"§f"+(SIM.page+1)+"/"+total,mode.ui.pageLabel.x,mode.ui.pageLabel.y,80,16);
  g.addButton(DID.NEXT,">",mode.ui.nextBtn.x,mode.ui.nextBtn.y,20,20);
}
function dlgClear(g){
  g.removeComponent(DID.PREV);g.removeComponent(DID.NEXT);g.removeComponent(DID.PAGE);
  g.removeComponent(DID.BG);g.removeComponent(DID.ENTITY);
  for(var i=0;i<200;i++) g.removeComponent(DID.TEXT+i);
}
function customGuiButton(e){
  if(e.gui.getID()===GID.DLG){
    if(e.buttonId===DID.NEXT) dlgNextPage();
    if(e.buttonId===DID.PREV) dlgPrevPage();
    return;
  }
}
function customGuiClosed(e){
  if(e.gui.getID()!==GID.DLG) return;
  TELLER.timers.stop(TID.DLG);
  SIM=null;
  var fn=DLG_NEXT;DLG_NEXT=null;
  if(fn) fn();
}
function specDetach(n){
  var sd=n.getStoreddata(),old=sd.get("trainer_attached_id");
  if(!old) return;
  try{RCTApi.getInstance("tbcs").getTrainerRegistry().unregisterById(old);}catch(e){}
  sd.remove("trainer_attached_id");
}
function specId(){return "trainer_"+Math.floor(Math.random()*900000+100000);}
function specDir(){
  var raw=CFG.EXTERNAL.folderPath||"";if(!raw) return null;
  var f=(raw.indexOf(":")!==-1||raw.startsWith("/")||raw.startsWith("\\"))?new File(raw):new File(new File("."),raw);
  if(!f.exists()) f.mkdirs();
  return f;
}
function specLoad(f){return new java.lang.String(Files.readAllBytes(f.toPath()),StandardCharsets.UTF_8);}
function specTemp(spec,id,name){
  var src=new File(specDir(),spec+".json");if(!src.exists()) return null;
  var tmp=new File(specDir(),id+".json"),raw=specLoad(src),mod=raw.replace(/"name"\s*:\s*"([^"]*)"/,'"name": "'+name+'"');
  Files.write(tmp.toPath(),mod.getBytes(StandardCharsets.UTF_8));
  return tmp;
}
function specRegister(n,id,json){
  var raw=specLoad(json),api=RCTApi.getInstance("tbcs"),reg=api.getTrainerRegistry(),g=api.gsonBuilder().disableHtmlEscaping().create(),m=g.fromJson(raw,TrainerModel.class);
  try{reg.unregisterById(id);}catch(e){}
  var t=reg.registerNPC(id,m);if(!t) return null;
  t.setEntity(n.getMCEntity());
  return t;
}
function specApply(n,spec){
  if(!spec) return false;
  specDetach(n);
  var id=specId(),tmp=specTemp(spec,id,n.getDisplay().getName());if(!tmp) return false;
  var t=specRegister(n,id,tmp);if(!t) return false;
  n.getStoreddata().put("trainer_attached_id",id);
  try{tmp.delete();}catch(e){}
  return true;
}
function battleStart(n){
  var CFG=callCFG(n);
  var td=n.getTempdata(),p=td.get("target");if(!p){reset(n,"cancel");return;}
  var rIdx=condRound(p,n,CFG),dt=CFG.DETAIL||{},spec=dt["trainerSpec_"+rIdx];
  n.executeCommand("stopsound "+p.getName())
  var maxItemUses=parseInt(dt["itemLimit_"+rIdx],10);if(isNaN(maxItemUses)||maxItemUses<0) maxItemUses=0;
  if(!spec||!specApply(n,spec)){reset(n,"cancel");return;}
  p.getStoreddata().put("battle_busy_by",n.getUUID());p.getStoreddata().put("battle_busy_ts",Date.now());
  var pos=CFG.POSITION||{};if(pos.useReposition===true) battleForwardTP(n,p,pos);
  n.setPosition((n.getHomeX()+0.5),(n.getHomeY()+1),(n.getHomeZ()+0.5));
  var basic=CFG.BASIC||{};if(basic.handItem){var it=n.getWorld().createItem(basic.handItem,1);if(it) n.setMainhandItem(it);}

  var s=(CFG.SOUND&&CFG.SOUND.start)?CFG.SOUND.start:{};if(s.id) p.playSound(s.id,(s.vol!=null?s.vol:1),(s.pitch!=null?s.pitch:1));
  var bt="GEN_9_SINGLES",rules="{maxItemUses:"+maxItemUses+"}";
  var hook="onwin {1:['@2 noppes script trigger 1 "+p.getName()+"'],2:['@1 noppes script trigger 2 "+p.getName()+"']}";
  n.executeCommand("/tbcs battle "+bt+" "+p.getName()+" vs "+n.getUUID()+" "+hook+" rules "+rules);
  n.timers.forceStart(TID.SYN,10,false);
  reset(n,"start")
}
function battleForwardTP(n,p,pos){
  var r=n.getRotation()*Math.PI/180;
  var dist=(pos.playerDistance!=null?pos.playerDistance:0);
  var yoff=(pos.playerHeight!=null?pos.playerHeight:0.5);
  var fx=-Math.sin(r)*dist;
  var fz=Math.cos(r)*dist;
  p.setPosition((n.getHomeX()+fx),(n.getHomeY()+yoff),(n.getHomeZ()+fz));
}
function reset(n,flag){
  var td=n.tempdata,sd=n.storeddata,t=n.timers,p=td.get("target"),d=CFG.DETECTION||{};
  var speed=sd.get("speed")
  var m=n.getMarks()[0];if(m) n.removeMark(m);

  if(flag==="cancel"){
    svAngle(n,"restore")
    n.setMainhandItem(n.getWorld().createItem("minecraft:air",1));
    n.setPosition(n.getHomeX()+0.5,n.getHomeY()+1,n.getHomeZ()+0.5);
    if (speed) n.ai.setWalkingSpeed(speed); n.updateClient();
    if(d.detectType!==0) n.timers.forceStart(TID.DETECT,d.detectTick||20,true);
    td.clear();
    return;
  }
  if(flag==="start"){setState(n); return;}
  if(flag==="end"){
    svAngle(n,"restore")
    n.setMainhandItem(n.getWorld().createItem("minecraft:air",1));
    n.setPosition(n.getHomeX()+0.5,n.getHomeY()+1,n.getHomeZ()+0.5);
    if(speed) n.ai.setWalkingSpeed(speed);n.updateClient(); td.clear();
    if(d.detectType!==0) n.timers.forceStart(TID.DETECT,d.detectTick||20,true);
    return;
  }
}
function setState(n){
  var b=CFG.BASIC||{},mh=parseInt(b.maxHealth,10)||20;
  n.getStats().setMaxHealth(mh); n.setHealth(mh);
  n.ai.setStandingType(1)
  n.ai.setWalkingSpeed(0)
  n.updateClient();
}
function addDeny(n,p,ms){
  if(ms<=0||!n) return;
  n.getStoreddata().put("deny_until",Date.now()+ms);
}
function callCFG(n){
  var sd=n.getStoreddata();
  function j(k,d){var raw=sd.get(k);return raw?JSON.parse(raw):d;}
  return{BASIC:j("cfg.BASIC",{}),DETECTION:j("cfg.DETECTION",{}),BATTLE:j("cfg.BATTLE",{}),DETAIL:j("cfg.DETAIL",{}),CONDITION:j("cfg.CONDITION",{}),REWARD:j("cfg.REWARD",{}),POSITION:j("cfg.POSITION",{}),SOUND:j("cfg.SOUND",{}),EXTERNAL:j("cfg.EXTERNAL",{})};
}
function trigger(e){
  var n=e.entity,p=n.getWorld().getPlayer(e.arguments[0]);if(!p) return;
  CFG=callCFG(n);
  var rIdx=condRound(p,n,CFG);
  if(CFG.SOUND&&CFG.SOUND.start) n.executeCommand("stopsound "+p.getName());
  if(e.id===1){
    var s=CFG.BATTLE||{},t=parseInt(s.denyCooldown,10)||100;
    if(t>0) addDeny(n,p,t*50);
    afterReward(n,p,rIdx);
    afterClear(p,n);
    reset(n,"end");
    return;
  }
  if(e.id===2){
    var s2=CFG.BATTLE||{},t2=parseInt(s2.denyCooldown,10)||100;
    if(t2>0) addDeny(n,p,t2*50);
    reset(n,"cancel");
    return;
  }
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
  if(!raw){p.message("§c[Reward] No reward config found.");return;}
  var cfg=JSON.parse(raw);
  var data=cfg["round_"+round];
  if(!data||!data.rewards||!data.rewards.length){p.message("§e[Reward] No rewards for this round.");return;}
  var list=data.rewards,pick=list;
  var mode=parseInt(data.mode,10)||0;
  if(mode===1) pick=[list[Math.floor(Math.random()*list.length)]];
  var log=["§6[Reward] Granted rewards:"];
  for(var i=0;i<pick.length;i++){
    var r=pick[i];if(!r) continue;
    if(r.type==="faction"){var pts=parseInt(r.val,10)||0;p.addFactionPoints(r.key,pts);log.push(" §b- Faction §f"+r.key+" §a+"+pts);}
    else if(r.type==="item"){var cnt=parseInt(r.val,10)||1;p.giveItem(p.getWorld().createItem(r.key,cnt));log.push(" §a- Item §f"+r.key+" §7x"+cnt);}
    else if(r.type==="command"){var cmd=r.key.replace("@player",p.getName()).replace("@npc",n.getUUID());n.executeCommand(cmd);}
    else if(r.type==="adv"){n.executeCommand("advancement grant "+p.getName()+" only "+r.key);log.push(" §d- Advancement §f"+r.key);}
  }
  p.updatePlayerInventory();
  for(var j=0;j<log.length;j++) p.message(log[j]);
}

function sayBattleGui(p,n,rIdx){
  function rc(){return 0xFF000000|(Math.random()*0xFFFFFF)|0;}
  var d=CFG.DETAIL||{},msg=d["startMessage_"+rIdx]||"§fBattle?",list=String(msg).split("@@"),W=256,H=256,Y=50,G=15,LINE_MAIN=rc(),LINE_SUB=rc(),THICK=2.0,THIN=1.0,g=API.createCustomGui(GID.PRED,W,H,false,p);
  g.addColoredLine(10,-1000,Y-20,1000,Y-20,LINE_MAIN,THICK);
  g.addColoredLine(11,-1000,Y-18,1000,Y-18,LINE_SUB,THIN);
  for(var i=0;i<list.length;i++) g.addLabel(20+i,list[i],0,(Y-10)+i*G,W,16).setCentered(true);
  var by=Y+list.length*G+4;
  g.addColoredLine(12,-1000,by,1000,by,LINE_SUB,THIN);
  g.addColoredLine(13,-1000,by+2,1000,by+2,LINE_MAIN,THICK);
  p.showCustomGui(g);
}
function synAngle(n,p){
  if(!n || !p) return;
  var dx=p.x-n.x,dz=p.z-n.z;
  var yaw = Math.atan2(-dx, dz) * 180 / Math.PI;
  n.setRotation(yaw);n.updateClient();
}
function svAngle(n,flag){
   var sd=n.storeddata
   if (flag=="save"){
   sd.put("standing",n.ai.getStandingType())
   sd.put("angle",n.getRotation());return;}
   if (flag=="restore"){
    var st=parseInt(sd.get("standing"), 10),an=parseFloat(sd.get("angle"))
    if(!isNaN(st)) n.ai.setStandingType(st);if(!isNaN(an)) n.setRotation(an)
   }
   n.updateClient();
}
