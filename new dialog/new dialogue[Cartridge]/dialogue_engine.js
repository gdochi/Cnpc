///////////////////////////////////////////
var DEFAULT_FILE="dialogues/main.json";//// start dialogues file
///////////////////////////////////////////

var API=Java.type("noppes.npcs.api.NpcAPI").Instance();
var JsonParser=Java.type("com.google.gson.JsonParser");
var Files=Java.type("java.nio.file.Files");
var Paths=Java.type("java.nio.file.Paths");
var StandardCharsets=Java.type("java.nio.charset.StandardCharsets");
var GUI_ID=950,TIMER_ID=951;
var teller
function init(e){e.npc.timers.forceStart(TIMER_ID,1,true);}

function interact(e){
  var p=e.player,n=e.npc;teller=n
  var file=getStartFile(n);
  var data=loadDialogue(file);
  if(!data){p.message("§cDialogue file not found: "+file);return;}
  if(checkCond(p,data.con)===false){p.message("§cYou do not meet the requirements.");return;}
  openDialogue(p,n,data,file);
}

function getStartFile(n){
  var s=""+(n.getStoreddata().get("dlg_file")||"");
  if(s&&s.length>0) return s;
  return DEFAULT_FILE;
}
function kData(p){return "dlg_data_"+p.getUUID();}
function kState(p){return "dlg_state_"+p.getUUID();}
function openDialogue(p,n,data,file){
  n.tempdata.put(kData(p),data);
  n.tempdata.put(kState(p),makeState(data,file));
  var g=API.createCustomGui(GUI_ID,256,256,false,p);
  p.showCustomGui(g);
  if(getSound(data,"open")) p.playSound(getSound(data,"open").id,getSound(data,"open").vol||1,getSound(data,"open").pitch||1);
  startPage(p,n,0);
}
function makeState(data,file){
  var st={file:file,page:0,line:0,char:0,lines:[],typing:false,nextTick:0};
  st.maxLines=Math.max(1,parseInt(((data.text&&data.text.lines)!=null?data.text.lines:5),10)||5);
  st.typeTick=Math.max(1,parseInt((((data.mode&&data.mode.char)&&data.mode.char.typeTick)!=null?data.mode.char.typeTick:1),10)||1);
  st.charsPerStep=Math.max(1,parseInt((((data.mode&&data.mode.char)&&data.mode.char.charsPerStep)!=null?data.mode.char.charsPerStep:2),10)||2);
  st.modeType=""+(((data.mode&&data.mode.type)!=null?data.mode.type:"char"));
  return st;
}
function startPage(p,n,page){
  var st=n.tempdata.get(kState(p)),data=n.tempdata.get(kData(p));
  if(!st||!data) return;
  st.page=page;st.lines=[];st.line=0;st.char=0;
  if(st.modeType==="page"){fullPage(p,n);return;}
  st.typing=true;st.nextTick=0;
  n.tempdata.put(kState(p),st);
  updateGui(p,n);
}
function fullPage(p,n){
  var st=n.tempdata.get(kState(p)),data=n.tempdata.get(kData(p));
  if(!st||!data) return;
  var dlg=getTextList(data),out=[],base=st.page*st.maxLines;
  for(var i=0;i<st.maxLines;i++){
    var l=dlg[base+i];
    if(l==null) break;
    out.push(""+l);
  }
  st.lines=out;st.typing=false;
  n.tempdata.put(kState(p),st);
  updateGui(p,n);
  if(isLastPage(st,dlg)) createChoices(p,n);
}
function timer(e){
  if(e.id!==TIMER_ID) return;
  var n=e.npc;
  var keys=n.tempdata.getKeys();
  for(var i=0;i<keys.length;i++){
    var key=""+keys[i];
    if(key.indexOf("dlg_state_")!==0) continue;
    var st=n.tempdata.get(key);
    if(!st||st.typing!==true) continue;
    st.nextTick++;
    if(st.nextTick<st.typeTick){n.tempdata.put(key,st);continue;}
    st.nextTick=0;
    var uuid=key.substring("dlg_state_".length);
    var p=getPlayerByUUID(n,uuid);
    if(!p){cleanupByUUID(n,uuid);continue;}
    stepTyping(p,n,st);
  }
}
function stepTyping(p,n,st){
  var data=n.tempdata.get(kData(p));
  if(!data){cleanup(p,n);return;}
  var dlg=getTextList(data);
  var idx=st.page*st.maxLines+st.line;
  var text=dlg[idx];
  if(text==null){st.typing=false;n.tempdata.put(kState(p),st);return;}
  text=""+text;
  var cur=""+(st.lines[st.line]||"");
  var cps=st.charsPerStep;
  for(var i=0;i<cps&&st.char<text.length;i++){
    cur+=text.charAt(st.char++);
    if(st.char%2===0&&getSound(data,"char")) p.playSound(getSound(data,"char").id,getSound(data,"char").vol||1,getSound(data,"char").pitch||1);
  }
  st.lines[st.line]=cur;
  if(st.char>=text.length){
    st.char=0;st.line++;
    if(getSound(data,"sentence")) p.playSound(getSound(data,"sentence").id,getSound(data,"sentence").vol||1,getSound(data,"sentence").pitch||1);
    var base=st.page*st.maxLines;
    var remain=dlg.length-base;
    var pageLineCount=Math.min(st.maxLines,remain);
    if(st.line>=pageLineCount){
      st.typing=false;
      n.tempdata.put(kState(p),st);
      updateGui(p,n);
      if(isLastPage(st,dlg)) createChoices(p,n);
      return;
    }
  }
  n.tempdata.put(kState(p),st);
  updateGui(p,n);
}

function getPlayerByUUID(n,uuid){
  var w=n.getWorld();
  var pls=w.getAllPlayers();
  for(var i=0;i<pls.length;i++){
    var p=pls[i];
    if(""+p.getUUID()===""+uuid) return p;
  }
  return null;
}
function isLastPage(st,dlg){
  var maxPage=Math.ceil(dlg.length/st.maxLines)-1;
  return st.page===maxPage;
}
function updateGui(p,n){
  var g=p.getCustomGui();
  if(!g||g.getID()!==GUI_ID) return;
  clearGui(g);
  drawGui(p,n,g);
  g.update();
}
function drawGui(p,n,g){
  var st=n.tempdata.get(kState(p)),data=n.tempdata.get(kData(p));
  if(!st||!data) return;

  var base=(data.base||{}),mode=(data.mode||{}),text=(data.text||{}),npc=(data.npc||{}),asset=(data.asset||{}),sound=(data.sound||{}),choice=(data.choice||{});
  var bx=parseInt(base.x||0,10)||0,by=parseInt(base.y||0,10)||0;

  var rect=(asset.rect||{x:-140,y:210,w:550,h:80,tx:0,ty:0});
  var rx=(parseInt(rect.x||0,10)||0)+bx,ry=(parseInt(rect.y||0,10)||0)+by;
  var rw=parseInt(rect.w||0,10)||0,rh=parseInt(rect.h||0,10)||0;

  if(asset.texture) g.addTexturedRect(1,""+asset.texture,rx,ry,rw,rh,parseInt(rect.tx||0,10)||0,parseInt(rect.ty||0,10)||0);

  if(""+(npc.on||"false")==="true"){
    var pos=(npc.pos||{x:-152,y:290});
    var ed=g.addEntityDisplay(10,(parseInt(pos.x||0,10)||0)+bx,(parseInt(pos.y||0,10)||0)+by,n);
    ed.setRotation(parseInt(npc.rot||0,10)||0);
    ed.setScale(parseFloat(npc.scale||1)||1);
    ed.setFollowingCursor((""+(npc.follow||"false")==="true"));
  }
  var ui=(text.ui||{labelX:20,labelY:12,lineGap:12});
  for(var i=0;i<st.lines.length;i++) g.addLabel(100+i,""+st.lines[i],rx+(parseInt(ui.labelX||0,10)||0),ry+(parseInt(ui.labelY||0,10)||0)+i*(parseInt(ui.lineGap||0,10)||0),256,12);

  var mUi=(mode.ui||{prevBtn:{x:328,y:185},nextBtn:{x:388,y:185},pageLabel:{x:360,y:190}});
  var prev=mUi.prevBtn||{x:328,y:185},next=mUi.nextBtn||{x:388,y:185},pl=mUi.pageLabel||{x:360,y:190};
  var dlg=getTextList(data);
  var total=Math.max(1,Math.ceil(dlg.length/st.maxLines));
  g.addButton(2,"<",(parseInt(prev.x||0,10)||0)+bx,(parseInt(prev.y||0,10)||0)+by,20,20);
  g.addLabel(3,"§f"+(st.page+1)+" / "+total,(parseInt(pl.x||0,10)||0)+bx,(parseInt(pl.y||0,10)||0)+by,80,16);
  g.addButton(4,">",(parseInt(next.x||0,10)||0)+bx,(parseInt(next.y||0,10)||0)+by,20,20);
}
function createChoices(p,n){
  var st=n.tempdata.get(kState(p)),data=n.tempdata.get(kData(p));
  if(!st||!data) return;
  var g=p.getCustomGui();
  if(!g||g.getID()!==GUI_ID) return;

  var choice=(data.choice||{}),list=(choice.list||[]);
  if(!list.length) return;

  var base=(data.base||{}),asset=(data.asset||{}),rect=(asset.rect||{x:-140,y:210,w:550,h:80,tx:0,ty:0});
  var bx=parseInt(base.x||0,10)||0,by=parseInt(base.y||0,10)||0;
  var rx=(parseInt(rect.x||0,10)||0)+bx,ry=(parseInt(rect.y||0,10)||0)+by;
  var rw=parseInt(rect.w||0,10)||0,rh=parseInt(rect.h||0,10)||0;

  var totalWidth=0;
  for(var i=0;i<list.length;i++) totalWidth+=parseInt(list[i].w||80,10)||80;
  var startX=Math.floor((rx+(rw/2))-(totalWidth/2));
  var curX=startX,btnY=ry+rh+4;

  for(var j=0;j<list.length;j++){
    var bw=parseInt(list[j].w||80,10)||80,bh=parseInt(list[j].h||20,10)||20;
    g.addButton(500+j,""+(list[j].label||""),curX,btnY,bw,bh);
    curX+=bw;
  }
  g.update();
}
function clearGui(g){
  g.removeComponent(1);g.removeComponent(10);
  g.removeComponent(2);g.removeComponent(3);g.removeComponent(4);
  for(var i=0;i<250;i++) g.removeComponent(100+i);
  for(var j=0;j<80;j++) g.removeComponent(500+j);
}
function customGuiButton(e){
  var p=e.player,n=teller;
  if(e.buttonId===4){nextPage(p,n);return;}
  if(e.buttonId===2){prevPage(p,n);return;}
  if(e.buttonId>=500){choiceClick(p,n,e.buttonId-500);return;}
}

function nextPage(p,n){
  var st=n.tempdata.get(kState(p)),data=n.tempdata.get(kData(p));
  if(!st||!data) return;
  if(st.typing===true){fullPage(p,n);return;}
  var dlg=getTextList(data);
  var maxPage=Math.ceil(dlg.length/st.maxLines)-1;
  if(st.page>=maxPage) return;
  startPage(p,n,st.page+1);
}
function prevPage(p,n){
  var st=n.tempdata.get(kState(p)),data=n.tempdata.get(kData(p));
  if(!st||!data) return;
  if(st.typing===true){fullPage(p,n);return;}
  if(st.page<=0) return;
  startPage(p,n,st.page-1);
}

function choiceClick(p,n,idx){
  var data=n.tempdata.get(kData(p));
  if(!data||!data.choice||!data.choice.list||!data.choice.list[idx]) return;
  handleAction(p,n,data.choice.list[idx].action);
}
function handleAction(p,n,act){
  if(!act||!act.type) return;
  if(act.type==="close"){p.closeGui();cleanup(p,n);return;}
  if(act.type==="message"){p.message(""+(act.value||""));p.closeGui();cleanup(p,n);return;}
  if(act.type==="command"){
    var cmd=(""+(act.value||"")).replace(/@player/g,p.getName()).replace(/@npc@name/g,n.getDisplay().getName()).replace(/@npc/g,n.getUUID());
    n.executeCommand(cmd);
    p.closeGui();
    cleanup(p,n);
    return;
  }
  if(act.type==="goto"){
    var file=""+(act.file||act.value||"");
    if(!file||file.length===0){p.closeGui();cleanup(p,n);return;}
    var data2=loadDialogue(file);
    if(!data2){p.message("§cDialogue file not found: "+file);p.closeGui();cleanup(p,n);return;}
    if(checkCond(p,data2.con)===false){p.message("§cYou do not meet the requirements.");p.closeGui();cleanup(p,n);return;}
    openDialogue(p,n,data2,file);
    return;
  }
}
function customGuiClosed(e){cleanup(e.player,e.npc);}
function cleanup(p,n){
  if(!p||!n) return;
  n.tempdata.remove(kData(p));
  n.tempdata.remove(kState(p));
  n.timers.clear()
}
function cleanupByUUID(n,uuid){
  n.tempdata.remove("dlg_data_"+uuid);
  n.tempdata.remove("dlg_state_"+uuid);
}
function getTextList(data){
  if(data&&data.text&&data.text.text&&data.text.text.length) return data.text.text;
  return [];
}
function getSound(data,name){
  if(!data||!data.sound||!data.sound[name]||!data.sound[name].id) return null;
  return data.sound[name];
}
function loadDialogue(relPath){
  try{
    var p=Paths.get(relPath);
    if(!Files.exists(p)) return null;
    var s=new java.lang.String(Files.readAllBytes(p),StandardCharsets.UTF_8);
    var obj=JsonParser.parseString(s).getAsJsonObject();
    return gsonToJs(obj);
  }catch(err){return null;}
}
function gsonToJs(el){
  if(el==null) return null;
  if(el.isJsonNull()) return null;
  if(el.isJsonPrimitive()){
    var prim=el.getAsJsonPrimitive();
    if(prim.isBoolean()) return prim.getAsBoolean();
    if(prim.isNumber()){var num=prim.getAsNumber();return Number(num.toString());}
    return prim.getAsString();
  }
  if(el.isJsonArray()){
    var arr=[],a=el.getAsJsonArray();
    for(var i=0;i<a.size();i++) arr.push(gsonToJs(a.get(i)));
    return arr;
  }
  var o={},it=el.getAsJsonObject().entrySet().iterator();
  while(it.hasNext()){
    var e=it.next();
    o[""+e.getKey()]=gsonToJs(e.getValue());
  }
  return o;
}
function checkCond(p,con){
  if(!con||!con.rules||!con.rules.length) return true;
  var mode=(con.mode===1?1:0);
  for(var i=0;i<con.rules.length;i++){
    var r=con.rules[i];
    var ok=condOne(p,r.type,r.op,r.key,r.val);
    if(mode===1){if(ok) return true;} else{if(!ok) return false;}
  }
  if(mode===1) return false;
  return true;
}
function condOne(p,type,op,key,val){
  if(type==="item"){
    var has=0;
    try{has=p.getInventory().count(p.getWorld().createItem(key,1),true,true);}catch(e){return false;}
    if(op==="has") return has>0;
    if(op==="not") return has===0;
    var need=parseInt(val,10);
    if(isNaN(need)) return false;
    if(op==="==") return has===need;
    if(op===">=") return has>=need;
    if(op==="<=") return has<=need;
    return false;
  }
  if(type==="stored"){
    var cur=p.getStoreddata().get(key);
    if(op==="==") return String(cur)===String(val);
    var nv=parseFloat(cur),nt=parseFloat(val);
    if(isNaN(nv)||isNaN(nt)) return false;
    if(op===">=") return nv>=nt;
    if(op==="<=") return nv<=nt;
    return false;
  }
  if(type==="tag"){
    var ok=false;
    try{ok=p.hasTag(key);}catch(e){}
    if(op==="has") return ok;
    if(op==="not") return !ok;
    return false;
  }
  if(type==="faction"){
    var pts=0;
    try{pts=p.getFactionPoints(key);}catch(e){}
    var t=parseInt(val,10)||0;
    if(op==="==") return pts===t;
    if(op===">=") return pts>=t;
    if(op==="<=") return pts<=t;
    return false;
  }
  if(type==="adv"){
    var done=false;
    try{done=p.hasAdvancement(key);}catch(e){}
    if(op==="done") return done;
    if(op==="not") return !done;
    return false;
  }
  return false;

}
