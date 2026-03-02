var API=Java.type("noppes.npcs.api.NpcAPI").Instance();
var JsonParser=Java.type("com.google.gson.JsonParser");
var Files=Java.type("java.nio.file.Files");
var Paths=Java.type("java.nio.file.Paths");
var StandardCharsets=Java.type("java.nio.charset.StandardCharsets");
var ServerQuestFile = Java.type("dev.ftb.mods.ftbquests.quest.ServerQuestFile");
var QuestObjectBase = Java.type("dev.ftb.mods.ftbquests.quest.QuestObjectBase");

var GUI_CONST = {
  GUI_ID: 950,
  PATH: "customnpcs/gui_dialogs/dochi/dochi_config.json",
  ID: {bg: 1,ent: 10,labelBase: 100,btnBase: 500},
  KEY: {choice: "dlg_choice",npcFolder: "dlg_npcFolder"}
};
var CFG =null;
var pl
function interact(e){
  pl=e.player
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

  var folder = String(p.tempdata.get(GUI_CONST.KEY.npcFolder) || "");
  if(folder.length==0 && n) folder = n.getName();
  if(folder.length==0){ p.message("no npc folder"); return; }

  var path = CFG.DIALOG_ROOT + folder + "/" + String(fileName);
  var data = loadDialogue(path);
  if(!data){ p.message("DLG missing: " + path); return; }

  var r = pickRoute(p,folder,data);
  if(r){
    var gto = String(r.goto || "");
    if(gto.length){
      if(gto.toLowerCase().endsWith(".json")) openByFile(p,n,gto);
      else openById(p,n,gto);
      return;
    }
  }

  var did = fileName.replace(/\.json$/i,"");
  markSeen(p,folder,did);
  runOnOpen(p,data);

  var textKeys = data.text || [];
  var choice   = data.choice || [];

  p.tempdata.put("dlg_raw_data", data);
  p.tempdata.put(GUI_CONST.KEY.choice, choice);

  sendDialogueWrap(n, p, textKeys, choice, CFG.TEXT.w);
  pl = p;

  var tid = Math.abs(p.getUUID().hashCode()) % 10000 + 1000;
  n.tempdata.put("dlg_tid_" + tid, p.getName());
  n.timers.forceStart(tid, 3, false);
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

function drawGui(p,n,g,textArr,choice,data){

  if(data&&data.images){
    for(var i=0;i<data.images.length;i++){
      var img=data.images[i];
      g.addTexturedRect(GUI_CONST.ID.bg+50+i,String(img.texture||""),Number(img.x||0)+bx,Number(img.y||0)+by,Number(img.w||0),Number(img.h||0),Number(img.tx||0),Number(img.ty||0));
    }
  }
  if(data&&data.itemRenders){
    for(var j=0;j<data.itemRenders.length;j++){
      var it=data.itemRenders[j];
      var stack=p.getWorld().createItem(String(it.id||"minecraft:stone"),Number(it.count||1));
      var ir=g.addItemRenderer(GUI_CONST.ID.bg+80+j,Number(it.x||0)+bx,Number(it.y||0)+by,16,16,stack);
      ir.setScale(Number(it.scale||1));
    }
  }
  if(!textArr || !Array.isArray(textArr)) textArr = [];
  if(!choice   || !Array.isArray(choice)) choice = [];

  var bx = CFG.BASE.x;
  var by = CFG.BASE.y;
  var r  = CFG.ASSET.rect;
  g.addTexturedRect(GUI_CONST.ID.bg,CFG.ASSET.texture,r.x+bx,r.y+by,r.w,r.h,r.tx,r.ty);
  var lx = r.x + CFG.TEXT.xOff + bx;
  var ly = r.y + CFG.TEXT.yOff + by;
  var maxLines = CFG.MAX_LINES || 4;
  var page = p.tempdata.get("dlg_page") || 0;
  var totalPages = Math.ceil(textArr.length / maxLines);
  if(totalPages <= 0) totalPages = 1;

  if(page >= totalPages) page = totalPages - 1;
  if(page < 0) page = 0;
  p.tempdata.put("dlg_page", page);
  var start=page*maxLines, end=start+maxLines;
  for(var i = start; i < end && i < textArr.length; i++){
    g.addLabel(GUI_CONST.ID.labelBase + (i - start),String(textArr[i] || ""),lx,ly+(i-start)*CFG.TEXT.lineH,CFG.TEXT.w,CFG.TEXT.h).setColor(CFG.TEXT.color);
  }

  var baseY = r.y + r.h + by + 10;
  var gapX=10,gapY=8;
  var startX = lx;                  
  var maxWidth = CFG.TEXT.w;         
  var currentX = startX,currentY = baseY;
  for(var i=0;i<choice.length && i<CFG.MAX_BTN;i++){
    var btn = choice[i];
    var width = Number(btn.width || 120);
    if((currentX - startX) + width > maxWidth){currentX = startX;currentY += CFG.BTN.h + gapY;}
    g.addButton(GUI_CONST.ID.btnBase + i,String(btn.label || ""),currentX,currentY,width,CFG.BTN.h);
    currentX += width + gapX;
  }
  if(CFG.NPC && CFG.NPC.on==true && n){
    var npcCfg = CFG.NPC;
    var posX = npcCfg.pos.x + bx;
    var posY = npcCfg.pos.y + by;
    var rot = npcCfg.rot || 0;
    var scale = npcCfg.scale || 1;
    var entId = GUI_CONST.ID.ent;
    var entity = g.addEntityDisplay(entId,posX,posY,n);
    entity.setScale(scale)
    entity.setRotation(rot);
    entity.setFollowingCursor(npcCfg.follow);
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
        if(idx >= 0 && idx < tasks.size()){var task = tasks.get(idx);data.setProgress(task, task.getMaxProgress());}
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
function sendDialogueWrap(n,p,textKeys,choice,width){
  var requests = [];
  for(var i=0;i<textKeys.length;i++){
    var key = String(textKeys[i]||"");
    if(!key.length) continue;
    requests.push({
      kind: "text",
      key: key,
      storeKey: "T_" + i,
      width: width
    });
  }
  for(var i=0;i<choice.length;i++){
    if(!choice[i] || !choice[i].label) continue;

    var key = String(choice[i].label||"");
    if(!key.length) continue;
    requests.push({
      kind: "button",
      key: key,
      storeKey: "B_" + i,
      width: 0
    });
  }
  var nbt = API.stringToNbt("{}");
  nbt.putString("requests", JSON.stringify(requests));
  p.getMCEntity().kjs$sendData(
    "bridge:dialogue_wrap",
    nbt.getMCNBT()
  );
}
function timer(e){
  var tid = e.id;
  if(tid> 10000) return;
  var n = e.npc;
  var name = n.tempdata.get("dlg_tid_" + tid);
  if(!name) return;
  var p = n.getWorld().getPlayer(name);
  if(!p){n.tempdata.remove("dlg_tid_" + tid);return;}
  var raw = p.tempdata.get("dlg_wrap_map");if(!raw) return;
  var map;
  try{map = JSON.parse(raw);
  }catch(err){return;}
  var textArr = [];
  var choiceArr = [];
  var tIndex = 0;
  while(true){
    var key = "T_" + tIndex;
    if(!(key in map)) break;
    var arr = map[key] || [];
    if(Array.isArray(arr)){
      for(var j=0;j<arr.length;j++)
        textArr.push(String(arr[j]));
    }
    tIndex++;
  }
  var bIndex = 0;
  while(true){
    var key = "B_" + bIndex;
    if(!(key in map)) break;

    var obj = map[key] || {};
    choiceArr.push({
      label: String(obj.label || ""),
      width: Number(obj.width || 120)
    });
    bIndex++;
  }
  var data   = p.tempdata.get("dlg_raw_data");
  var g = API.createCustomGui(GUI_CONST.GUI_ID,CFG.WIDTH,CFG.HEIGHT,false,p);
  drawGui(p, e.npc, g, textArr, choiceArr, data);
  p.showCustomGui(g);
  p.tempdata.remove("dlg_wrap_map");
  p.tempdata.remove("dlg_raw_data");
  n.tempdata.remove("dlg_tid_" + tid)
}

