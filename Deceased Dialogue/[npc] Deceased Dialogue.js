var API=Java.type("noppes.npcs.api.NpcAPI").Instance();
var JsonParser=Java.type("com.google.gson.JsonParser");
var Files=Java.type("java.nio.file.Files");
var Paths=Java.type("java.nio.file.Paths");
var StandardCharsets=Java.type("java.nio.charset.StandardCharsets");
var Component=Java.type("net.minecraft.network.chat.Component");
var Minecraft = Java.type("net.minecraft.client.Minecraft");
var ServerQuestFile = Java.type("dev.ftb.mods.ftbquests.quest.ServerQuestFile");
var QuestObjectBase = Java.type("dev.ftb.mods.ftbquests.quest.QuestObjectBase");

var GUI_CONST = {
  GUI_ID: 950,
  PATH: "customnpcs/gui_dialogs/dochi/dochi_config.json",
  ID: {bg: 1,ent: 10,labelBase: 100,btnBase: 500},
  KEY: {choice: "dlg_choice",npcFolder: "dlg_npcFolder"}
};
var CFG =null;
function interact(e){
  var p=e.player,n=e.npc,folder=n.getName();
  CFG = loadConfig();
  var key="lock_"+n.getUUID();
  if(p.tempdata.get(key)!==true){e.setCanceled(true);}
  p.tempdata.put(GUI_CONST.KEY.npcFolder,folder);
  p.tempdata.put("dlg_npc",n);
  openByFile(p,n,CFG.START_FILE);
}
function customGuiButton(e){
var p=e.player,n=p.tempdata.get("dlg_npc");
  if(e.buttonId==CFG.PAGE.PREV.ID){
    var pg=p.tempdata.get("dlg_page")||0;
    if(pg>0){
    p.tempdata.put("dlg_page",pg-1);
    openByFile(p,n,CFG.START_FILE);
  }
  return;
  }
  if(e.buttonId==CFG.PAGE.NEXT.ID){
    var pg=p.tempdata.get("dlg_page")||0;
    p.tempdata.put("dlg_page",pg+1);
    openByFile(p,n,CFG.START_FILE);
    return;
  }
  if(e.buttonId<GUI_CONST.ID.btnBase) return;
  var choice=p.tempdata.get(GUI_CONST.KEY.choice);
  if(!choice) return;

  var idx=e.buttonId-GUI_CONST.ID.btnBase;
  if(idx<0||idx>=choice.length) return;

  handleAction(p,n,choice[idx]);
}
function openById(p,n,id){openByFile(p,n,String(id)+".json");}
function openByFile(p,n,fileName){
  var folder=String(p.tempdata.get(GUI_CONST.KEY.npcFolder)||"");
  if(folder.length==0 && n) folder=n.getName();
  if(folder.length==0){p.message("no npc folder");return;}

  var path=CFG.DIALOG_ROOT+folder+"/"+String(fileName);
  var data=loadDialogue(path);
  if(!data){p.message("DLG missing: "+path);return;}

  var r=pickRoute(p,folder,data);
  if(r){
    var gto=String(r.goto||"");
    if(gto.length){
      if(gto.toLowerCase().endsWith(".json")) openByFile(p,n,gto);
      else openById(p,n,gto);
      return;
    }
  }
  var did=fileName.replace(/\.json$/i,"");
  markSeen(p,folder,did);
  runOnOpen(p,data);
  var textArr=data.text||[];
  var choice=data.choice||[];
  p.tempdata.put(GUI_CONST.KEY.choice,choice);
  var g=API.createCustomGui(GUI_CONST.GUI_ID,CFG.WIDTH,CFG.HEIGHT,false,p);
  drawGui(p,n,g,textArr,choice,data);
  p.showCustomGui(g);
  if(CFG.SOUND && CFG.SOUND.open) p.playSound(CFG.SOUND.open.id,CFG.SOUND.open.vol,CFG.SOUND.open.pitch);
}
function pickRoute(p,n,data){
  var routes=data.routes||[];
  for(var i=0;i<routes.length;i++){
    var rt=routes[i];
    if(!rt||!rt.cond) continue;
    if(checkCond(p,n,rt.cond)) return rt;
  }
  return null;
}
function seenKey(folder,id){return "dlg_seen."+String(folder)+"."+String(id);}
function hasSeen(p,folder,id){return Number(p.storeddata.get(seenKey(folder,id))||0)==1;}
function markSeen(p,folder,id){p.storeddata.put(seenKey(folder,id),1);}
function runOnOpen(p,data){
  var oo=data.onOpen;
  if(!oo||String(oo.type||"")!="command") return;
  var cmd=String(oo.value||"").trim();
  if(cmd.length==0) return;
  cmd=cmd.replace(/@player/g,p.getName());
  API.executeCommand(p.getWorld(),cmd);
}
function isCJK(text){return /[\u3400-\u9FBF]/.test(text);}
function wrapByPixel(key, maxWidth){
  var font = getFont();
  var fullComp = Component.m_237115_(key);
  var text = fullComp.getString();
  var lines=[];
  var current="";
  var useCharSplit = isCJK(text);
  var units = useCharSplit ? text.split("") : text.split(" ");
  for(var i=0;i<units.length;i++){
    var part = units[i];
    var test = useCharSplit ? current+part :(current.length==0 ? part : current+" "+part);
    var comp = Component.m_237113_(test);
    var width = font.m_92852_(comp);
    if(width > maxWidth){if(current.length>0) lines.push(current);current=part;
    }else{current=test;}
  }
  if(current.length>0) lines.push(current);
  return lines;
}
function getButtonWidth(key){
  var font=getFont();
  var comp=Component.m_237115_(key);
  var pixelWidth=font.m_92852_(comp);
  var padding=20;
  var minWidth=80,maxWidth=260;
  var w=pixelWidth+padding;
  if(w < minWidth) w=minWidth;
  if(w > maxWidth) w=maxWidth;
  return w;
}
function drawGui(p,n,g,textArr,choice,data){

  var bx=CFG.BASE.x,by=CFG.BASE.y,r=CFG.ASSET.rect;

  g.addTexturedRect(GUI_CONST.ID.bg,CFG.ASSET.texture,r.x+bx,r.y+by,r.w,r.h,r.tx,r.ty);
  if(data&&data.images){
    for(var i=0;i<data.images.length;i++){
      var img=data.images[i];
      g.addTexturedRect(GUI_CONST.ID.bg+50+i,String(img.texture||""),Number(img.x||0)+bx,Number(img.y||0)+by,Number(img.w||0),Number(img.h||0),Number(img.tx||0),Number(img.ty||0));
    }
  }
  if(data&&data.itemRenders){
    for(var i=0;i<data.itemRenders.length;i++){
      var it=data.itemRenders[i];
      var stack=p.getWorld().createItem(String(it.id||"minecraft:stone"),Number(it.count||1));
      var ir=g.addItemRenderer(GUI_CONST.ID.bg+80+i,Number(it.x||0)+bx,Number(it.y||0)+by,16,16,stack);
      ir.setScale(Number(it.scale||1));
    }
  }
  if(CFG.NPC.on&&n){
    var pos=CFG.NPC.pos;
    var ed=g.addEntityDisplay(GUI_CONST.ID.ent,pos.x+bx,pos.y+by,n);
    ed.setRotation(CFG.NPC.rot);
    ed.setScale(CFG.NPC.scale);
    ed.setFollowingCursor(CFG.NPC.follow);
  }

  var lx=r.x+CFG.TEXT.xOff+bx;
  var ly=r.y+CFG.TEXT.yOff+by;
  var allLines=[];

  for(var i=0;i<textArr.length;i++){
    var raw=String(textArr[i]||"");
    var wrapped=wrapByPixel(raw,CFG.TEXT.w);
    for(var j=0;j<wrapped.length;j++) allLines.push(wrapped[j]);
  }

  var page=p.tempdata.get("dlg_page")||0;
  var totalPages=Math.ceil(allLines.length/CFG.MAX_LINES);
  if(totalPages<=0) totalPages=1;
  if(page>=totalPages) page=totalPages-1;
  if(page<0) page=0;
  p.tempdata.put("dlg_page",page);

  var start=page*CFG.MAX_LINES;
  var end=start+CFG.MAX_LINES;

  for(var i=start;i<end&&i<allLines.length;i++) g.addLabel(GUI_CONST.ID.labelBase+(i-start),allLines[i],lx,ly+(i-start)*CFG.TEXT.lineH,CFG.TEXT.w,CFG.TEXT.h).setColor(CFG.TEXT.color);

  if(totalPages>1){
    if(page>0) g.addButton(CFG.PAGE.PREV.ID,CFG.PAGE.PREV.LABEL,bx+CFG.PAGE.PREV.OFFSET_X,by+CFG.PAGE.PREV.OFFSET_Y,CFG.PAGE.PREV.W,CFG.PAGE.PREV.H);
    if(page<totalPages-1) g.addButton(CFG.PAGE.NEXT.ID,CFG.PAGE.NEXT.LABEL,bx+CFG.PAGE.NEXT.OFFSET_X,by+CFG.PAGE.NEXT.OFFSET_Y,CFG.PAGE.NEXT.W,CFG.PAGE.NEXT.H);
  }
  var centerX=CFG.WIDTH/2;
  var baseY=r.y+r.h+by+10;
  var buttonsPerRow=3;
  var gapX=10;
  var gapY=8;

  var visible=[];
  for(var i=0;i<choice.length&&i<CFG.MAX_BTN;i++){
  var c=choice[i];
  if(!c||c.close===true) continue;
  visible.push(c);
}

  for(var i=0;i<visible.length;i++){
    var row=Math.floor(i/buttonsPerRow);
    var col=i%buttonsPerRow;
    var itemsInRow=Math.min(buttonsPerRow,visible.length-row*buttonsPerRow);
    var totalWidth=0;

    for(var j=0;j<itemsInRow;j++){
      var keyRow=String(visible[row*buttonsPerRow+j].label||"");
      totalWidth+=getButtonWidth(keyRow);
      if(j<itemsInRow-1) totalWidth+=gapX;
    }

    var startX=centerX-totalWidth/2;
    var offsetX=startX;

    for(var k=0;k<col;k++){
      var prevKey=String(visible[row*buttonsPerRow+k].label||"");
      offsetX+=getButtonWidth(prevKey)+gapX;
    }

    var key=String(visible[i].label||"");
    var width=getButtonWidth(key);
    var translated=Component.m_237115_(key).getString();
    var posY=baseY+row*(CFG.BTN.h+gapY);

    g.addButton(GUI_CONST.ID.btnBase+i,translated,offsetX,posY,width,CFG.BTN.h);
  }
}
function loadConfig(){var data = loadDialogue(GUI_CONST.PATH);if(!data) throw "GUI config missing: " + GUI_CONST.PATH;return data;}
function loadDialogue(path){
  try{
    var p=Paths.get(path);
    if(!Files.exists(p)) return null;
    var s=new java.lang.String(Files.readAllBytes(p),StandardCharsets.UTF_8);
    return gsonToJs(JsonParser.parseString(s));
  }catch(err){return null;}
}
function getFont(){var mc = Minecraft.m_91087_();return mc.f_91062_;}
function gsonToJs(el){
  if(el.isJsonPrimitive()){
    var prim=el.getAsJsonPrimitive();
    if(prim.isBoolean()) return prim.getAsBoolean();
    if(prim.isNumber()) return Number(prim.getAsNumber().toString());
    return prim.getAsString();
  }
  if(el.isJsonArray()){
    var arr=[],a=el.getAsJsonArray();
    for(var i=0;i<a.size();i++) arr.push(gsonToJs(a.get(i)));
    return arr;
  }
  var obj={},it=el.getAsJsonObject().entrySet().iterator();
  while(it.hasNext()){
    var e=it.next();
    obj[e.getKey()]=gsonToJs(e.getValue());
  }
  return obj;
}
function forceInteract(p,npc){
  var mcPlayer=p.getMCEntity();
  var role=npc.getRole();
  if(role) role.interact(mcPlayer);
}
function questTask(p, id, indexes){
    var file = ServerQuestFile.INSTANCE;
    if(!file) return;
    var questLong = QuestObjectBase.parseCodeString(String(id));
    var quest = file.getQuest(questLong);
    if(!quest) return;
    var data = file.getOrCreateTeamData(p.getMCEntity());
    var tasks = quest.getTasksAsList();
    for(var i = 0; i < indexes.length; i++){
        var idx = Number(indexes[i]);
        if(idx >= 0 && idx < tasks.size()){
            var task = tasks.get(idx);
            data.setProgress(task, task.getMaxProgress());
        }
    }
    data.markDirty();
}
function checkCond(p,n,cond){
  if(!cond) return false;
  if(cond.mode && cond.list && cond.list.length){

    var mode = String(cond.mode).toLowerCase();
    var list = cond.list;

    if(mode === "and"){
      for(var i=0;i<list.length;i++){if(!checkCond(p,n,list[i])) return false;}
      return true;
    }
    if(mode === "or"){
      for(var i=0;i<list.length;i++){if(checkCond(p,n,list[i])) return true;}
      return false;
    }
  }
  if(cond.dialog_seen){
    var d = cond.dialog_seen;
    var id = String(d.id||"");
    var want = Boolean(d.value);
    if(!id) return false;

    var seen = hasSeen(p,folder,id);
    return seen === want;
  }
  if(cond.ftb){
    var f = cond.ftb;
    var questId = String(f.quest||"");
    if(!questId) return false;

    var file = ServerQuestFile.INSTANCE;
    if(!file) return false;

    var questLong = QuestObjectBase.parseCodeString(questId);
    var quest = file.getQuest(questLong);
    if(!quest) return false;

    var data = file.getOrCreateTeamData(p.getMCEntity());
    if(f.task==null){
      var done = data.isCompleted(quest);
      if(f.type==="completed") return done===Boolean(f.value);
      if(f.type==="started") return data.isStarted(quest)===Boolean(f.value);
    }
    if(f.task!=null){
      var tasks = quest.getTasksAsList();
      var idx = Number(f.task);
      if(idx>=0 && idx<tasks.size()){
        var task = tasks.get(idx);
        var prog = data.getProgress(task);
        var max = task.getMaxProgress();
        var completed = prog>=max;
        if(f.type==="completed") return completed===Boolean(f.value);
      }
    }
    return false;
  }
  if(cond.advancement){
    var a = cond.advancement;
    if(a.type !== "has") return false;
    var has = p.hasAdvancement(a.id);
    if(has===true) return true;
    return false;
  }
  if(cond.stored){
    var s = cond.stored;
    var key = String(s.key||"");
    if(!key) return false;

    var cur = p.storeddata.get(key);
    var val = s.value;

    if(s.type==="equals")
      return (""+cur) === (""+val);

    if(s.type==="compare"){
      var op = String(s.operator||"==");
      var nv = parseFloat(cur);
      var nt = parseFloat(val);
      if(isNaN(nv)||isNaN(nt)) return false;

      if(op===">=") return nv>=nt;
      if(op===">")  return nv>nt;
      if(op==="<=") return nv<=nt;
      if(op==="<")  return nv<nt;
      if(op==="==") return nv==nt;
    }
  }
  return false;
}

function handleAction(p,n,c){
  if(!c||!c.actions) return;
  for(var i=0;i<c.actions.length;i++)
  runSingleAction(p,n,c.actions[i]);
}
function runSingleAction(p,n,c){
  var g=p.getCustomGui();
  if(c.goto){
    var to=String(c.goto);
    p.tempdata.put("dlg_page",0);
    if(to.toLowerCase().endsWith(".json")) openByFile(p,n,to);
    else openById(p,n,to);
    return;
  }
  if(c.role===true){
    var n=p.tempdata.get("dlg_npc");
    var key="lock_"+n.getUUID();
    p.tempdata.put(key,true);
    forceInteract(p,n);
    return;
  }
  if(c.command){
    var cmd=String(c.command).replace(/@player/g,p.getName());
    API.executeCommand(p.getWorld(),cmd);
    return;
  }
  if(c.store){
    var key=String(c.store.key||"");
    if(key.length) p.storeddata.put(key,String(c.store.value));
    return;
  }
  if(c.advancement){
    var id=String(c.advancement.id||"");
    if(id.length){
      if(c.advancement.grant===true)API.executeCommand(p.getWorld(),"advancement grant "+p.getName()+" only "+id);
      if(c.advancement.grant===false)API.executeCommand(p.getWorld(),"advancement revoke "+p.getName()+" only "+id);
    }
  return;
  }
  if(c.task){
    var quest=String(c.task.quest||"");
    var idx=c.task.index||[];
    if(quest.length) questTask(p,quest,idx);
    return;
  }
  if(c.close===true){
    if(g&&g.getID()==GUI_CONST.GUI_ID) g.close();
    return;
  }
  }
function customGuiClosed(e){
  var p=e.player,n=p.tempdata.get("dlg_npc");
  if(!n) return;
  var key="lock_"+n.getUUID();
  p.tempdata.remove(key);
}