var AD = {
  ADMINS: ["Great_dochi", "Admin2"],
  ITEM: "minecraft:blaze_rod"
};
var DF = {
  MODE: {
    type:"page",ui:{prevBtn:{x:328,y:185},nextBtn:{x:388,y:185},pageLabel:{x:360,y:190}},
    sentence:{gapTick:20},char:{gapTick:20,charsPerStep:2,typeTick:2}
  },
  TEXT: {text:"§fHello?",lines:5,ui:{labelX:20,labelY:12,lineGap:12}},
  NPC: {on:"true",follow:"false",rot:-45,scale:2,pos:{x:-152,y:290}},
  ASSET: {texture:"minecraft:textures/gui/options_background.png",rect:{x:-140,y:210,w:550,h:80,tx:0,ty:0}},
  SOUND: {open:{id:"minecraft:item.book.page_turn", vol:1, pitch:1.5},
          sentence:{ id:"minecraft:ui.button.click", vol:0.2, pitch:2.0 },
          char:{id:"minecraft:entity.experience_orb.pickup", vol:0.2, pitch:1.8}}
};
var SYS = {
  GUI_ID: 910,
  GUI: { W: 256, H: 256 },BASE: { x: -100, y: -30 },
  CAT: ["MODE","TEXT","NPC","ASSET","SOUND","SIMULATION"],
  ID: {
    CAT:10,MODE:{BASE:200,PREVIEW:247,SAVE:248,END:249,SENT_GAP:220,CHAR_CPS:221,CHAR_TICK:222,CHAR_GAP:223},
    TEXT:{BASE:250,END:299},NPC:{BASE:300,END:349},ASSET:{BASE:350,END:399},
    SOUND:{
      BASE:400,END:449,
      OPEN_ID:401,OPEN_VOL:402,OPEN_PITCH:403,OPEN_TEST:404,OPEN_OK:405,OPEN_STOP:406,
      SENT_ID:407,SENT_VOL:408,SENT_PITCH:409,SENT_TEST:410,SENT_OK:411,SENT_STOP:412,
      CHAR_ID:413,CHAR_VOL:414,CHAR_PITCH:415,CHAR_TEST:416,CHAR_OK:417,CHAR_STOP:418
    },
    SIM:{BASE:500,END:699,PAGE_PREV:500,PAGE_NEXT:501,PAGE_LABEL:502,ENTITY:510,BG_RECT:511,TEXT_BASE:520},
    PLAY:{BASE:899,END:1199,PAGE_PREV:900,PAGE_NEXT:901,PAGE_LABEL:902,STOP:903,STOP_YES:904,STOP_NO:905,STOP_LABEL:906,ENTITY:910,BG_RECT:911,TEXT_BASE:920}},
  LINE: {TOP: 18,BOTTOM: 250,LEFT: 72,RIGHT: 420,COLOR: 0xFFCC6A6A,THICK: 2}
};
var API = Java.type("noppes.npcs.api.NpcAPI").Instance();
var trainer=null;
var G_PLAYER=null;
function isAdmin(p){for(var i=0;i<AD.ADMINS.length;i++){if(AD.ADMINS[i] === p.getName()) return true;}return false;}
function hasItem(p){var it=p.getMainhandItem();return it && String(it.getName()) === AD.ITEM;}
function toInt(v,d){var n=parseInt(String(v),10);return isNaN(n) ? d : n;}
function readNumGui(g,id,def){var c = g.getComponent(id);if(!c) return def;return toInt(c.getText(), def);}
function load(sd,key,def){var base;try{base = JSON.parse(JSON.stringify(def));}catch(e){base = {};}var raw=null;try{raw = sd.get(key);}catch(e){}if(!raw) return base;try{var data = JSON.parse(raw);return merge(base,data);}catch(e){return base;}}
function merge(base,data){for(var k in data){if(data[k]!==null && typeof data[k]==="object" && !Array.isArray(data[k])){if(!base[k]) base[k]={};merge(base[k],data[k]);}else{base[k]=data[k];}}return base;}
function save(sd,key,obj){sd.put(key, JSON.stringify(obj));}
function resetGuiTemp(p){var td=p.getTempdata();var keys=["open_cat","mode_preview","text_preview","npc_preview","asset_preview","asset_candidate"];for(var i=0;i<keys.length;i++) td.remove(keys[i]);}
function interact(e){
  var p=e.player;
  if(e.type!==1) return;
  if(!e.target||e.target.getType()!==2) return;
  if(!isAdmin(p)||!hasItem(p)) return;
  trainer=e.target;
  G_PLAYER=p;
  resetGuiTemp(p)
  openGui(p);
}
function openGui(p){
  var g = API.createCustomGui(SYS.GUI_ID, SYS.GUI.W, SYS.GUI.H, false, p);
  GUI = g;
  var bx = SYS.BASE.x;
  var by = SYS.BASE.y;
  g.addColoredLine(1, bx, by+SYS.LINE.TOP, bx+SYS.LINE.RIGHT, by+SYS.LINE.TOP, SYS.LINE.COLOR, SYS.LINE.THICK);
  g.addColoredLine(2, bx, by+SYS.LINE.BOTTOM, bx+SYS.LINE.RIGHT, by+SYS.LINE.BOTTOM, SYS.LINE.COLOR, SYS.LINE.THICK);
  g.addColoredLine(3, bx+SYS.LINE.LEFT, by+SYS.LINE.TOP, bx+SYS.LINE.LEFT, by+SYS.LINE.BOTTOM, SYS.LINE.COLOR, SYS.LINE.THICK);
  var y = by + 28;
  for(var i=0;i<SYS.CAT.length;i++){g.addTexturedButton(SYS.ID.CAT + i,SYS.CAT[i],bx + 6,y,52,16,"customnpcs:textures/gui/invisible.png");y+=22;}
  p.showCustomGui(g);
}
function customGuiButton(e){
  var g=e.gui,id=e.buttonId;
  if(id>=SYS.ID.CAT && id<SYS.ID.CAT+SYS.CAT.length){drawCat(g,id-SYS.ID.CAT);g.update(); return;}
  if(id>=SYS.ID.MODE.BASE && id<SYS.ID.MODE.END) handleMode(g,id);
  if(id>=SYS.ID.TEXT.BASE && id<SYS.ID.TEXT.END) handleText(g,id);
  if(id>=SYS.ID.NPC.BASE && id<SYS.ID.NPC.END) handleNPC(g,id);
  if(id>=SYS.ID.ASSET.BASE && id<SYS.ID.ASSET.END) handleAsset(g,id);
  if(id >= SYS.ID.SOUND.BASE && id < SYS.ID.SOUND.END) handleSound(g,id);
  if(id>=SYS.ID.PLAY.BASE  && id<SYS.ID.PLAY.END)  handlePlay(g,id);
}
function drawCat(g,idx){
  var p=G_PLAYER;p.getTempdata().put("open_cat",idx);
  clearCat(g);
  if(idx===0) drawMode(g);
  if(idx===1) drawText(g);
  if(idx===2) drawNPC(g);
  if(idx===3) drawAsset(g);
  if(idx===4) drawSound(g);
  if(idx===5) drawPlay(g);
}
function clearCat(g){
  if(SIM) stopPlay();
  var groups=[SYS.ID.MODE,SYS.ID.TEXT,SYS.ID.NPC,SYS.ID.ASSET,SYS.ID.SOUND,SYS.ID.SIM,SYS.ID.PLAY];
  for(var i=0;i<groups.length;i++){var b=groups[i];for(var id=b.BASE;id<b.END;id++){g.removeComponent(id);}}
}
var MODE_LIST = ["page","sentence","char"];
function getModeLabel(t){
  if(t==="page") return "Page Render";
  if(t==="sentence") return "Sentence Render";
  if(t==="char") return "Character Render";
  return "Unknown";
}
function drawMode(g){
  var sd = trainer.getStoreddata();
  var cfg = load(sd,"dlg.mode",DF.MODE);
  var id = SYS.ID.MODE.BASE;
  var bx = SYS.BASE.x+82, by = SYS.BASE.y+28;
  var td = G_PLAYER.getTempdata();
  var previewOn = td.get("mode_preview")==="true";

  g.addButton(id++,"<",bx,by,20,18);
  g.addLabel(id++,"§f"+getModeLabel(cfg.type),bx+32,by+3,140,18).setCentered(true);
  g.addButton(id++,">",bx+170,by,20,18);

  var rx = bx+30, ry = by+26;

  g.addLabel(id++,"§fPrev Btn XY",rx-30,ry,70,16);
  g.addTextField(id++,rx+30,ry-2,40,18).setText(String(cfg.ui.prevBtn.x||0));
  g.addTextField(id++,rx+80,ry-2,40,18).setText(String(cfg.ui.prevBtn.y||0));
  ry+=20;
  g.addLabel(id++,"§fNext Btn XY",rx-30,ry,70,16);
  g.addTextField(id++,rx+30,ry-2,40,18).setText(String(cfg.ui.nextBtn.x||0));
  g.addTextField(id++,rx+80,ry-2,40,18).setText(String(cfg.ui.nextBtn.y||0));
  ry+=22;
  g.addLabel(id++,"§fPage Label XY",rx-30,ry,90,16);
  g.addTextField(id++,rx+30,ry-2,40,18).setText(String(cfg.ui.pageLabel.x||0));
  g.addTextField(id++,rx+80,ry-2,40,18).setText(String(cfg.ui.pageLabel.y||0));
  var y = by+110;
  if(cfg.type==="sentence"){
  g.addLabel(id++,"§fSentence Gap",bx,y,120,16);
  g.addTextField(SYS.ID.MODE.SENT_GAP,bx+130,y-2,40,18).setText(String(cfg.sentence.gapTick)).setHoverText("Pause (ticks) after finishing a sentence");
}

if(cfg.type==="char"){
  g.addLabel(id++,"§fChars / Step",bx,y,120,16);
  g.addTextField(SYS.ID.MODE.CHAR_CPS,bx+130,y-2,40,18).setText(String(cfg.char.charsPerStep)).setHoverText("How many characters are rendered per tick");
  y+=20;
  g.addLabel(id++,"§fTyping Tick",bx,y,120,16);
  g.addTextField(SYS.ID.MODE.CHAR_TICK,bx+130,y-2,40,18).setText(String(cfg.char.typeTick)).setHoverText("Ticks between typing updates");
  y+=20;
  g.addLabel(id++,"§fSentence Gap",bx,y,120,16);
  g.addTextField(SYS.ID.MODE.CHAR_GAP,bx+130,y-2,40,18).setText(String(cfg.char.gapTick)).setHoverText("Pause (ticks) after finishing a sentence");
}

g.addButton(SYS.ID.MODE.SAVE,"§a✓",bx,by+190,140,18);
g.addButton(SYS.ID.MODE.PREVIEW,(previewOn?"☑ ":"☐ ")+"Preview",bx+160,by+190,120,18);
if(td.get("mode_preview")==="true") simUpdate(g);

}
function handleMode(g,id){
  var sd = trainer.getStoreddata(),b=SYS.ID.MODE.BASE,td=G_PLAYER.getTempdata();
  var cfg = load(sd,"dlg.mode",DF.MODE);

  if(id===b){
    var i = MODE_LIST.indexOf(cfg.type);
    cfg.type = MODE_LIST[(i-1+MODE_LIST.length)%MODE_LIST.length];
    save(sd,"dlg.mode",cfg);drawCat(g,0); g.update();
    return;
  }
  if(id===b+2){
    var i = MODE_LIST.indexOf(cfg.type);
    cfg.type = MODE_LIST[(i+1)%MODE_LIST.length];
    save(sd,"dlg.mode",cfg);drawCat(g,0); g.update();
    return;
  }
  if(id===SYS.ID.MODE.SAVE){
    if(cfg.type==="sentence"){
      var c=g.getComponent(SYS.ID.MODE.SENT_GAP);
      if(c) cfg.sentence.gapTick = toInt(c.getText(),cfg.sentence.gapTick);
    }
    if(cfg.type==="char"){
      var c1=g.getComponent(SYS.ID.MODE.CHAR_CPS);
      var c2=g.getComponent(SYS.ID.MODE.CHAR_TICK);
      var c3=g.getComponent(SYS.ID.MODE.CHAR_GAP);
      if(c1) cfg.char.charsPerStep = toInt(c1.getText(),cfg.char.charsPerStep);
      if(c2) cfg.char.typeTick     = toInt(c2.getText(),cfg.char.typeTick);
      if(c3) cfg.char.gapTick      = toInt(c3.getText(),cfg.char.gapTick);
    }
    save(sd,"dlg.mode",cfg);
    if(td.get("mode_preview")==="true") simUpdate(g);
    return;
  }
  if(id===SYS.ID.MODE.PREVIEW){
    var btn=g.getComponent(id);
    var on=td.get("mode_preview")==="true";
    if(on){td.remove("mode_preview");btn.setLabel("☐ Preview");simClear(g);
    }else{td.put("mode_preview","true");btn.setLabel("☑ Preview");simUpdate(g);}
    g.update();
  }
}
function drawText(g){
  var sd=trainer.getStoreddata();
  var p=G_PLAYER, td=p.getTempdata();
  var tCfg=load(sd,"dlg.text",DF.TEXT);

  var id=SYS.ID.TEXT.BASE,bx=SYS.BASE.x+82,by=SYS.BASE.y+28;
  var taH=170;

  g.addLabel(id++,"§fDialogue Text",bx,by,160,16);
  g.addTextArea(id,bx,by+16,200,taH).setText(tCfg.text); id++;
  g.addButton(id++,"§a✓",bx+204,by+16,18,taH);

  var rx = bx + 230;
  var ry = by + 16;

  g.addLabel(id++,"§fLines / Page",rx,ry,100,16);
  g.addTextField(id++,rx,ry+16,40,18).setText(String(tCfg.lines)).setHoverText("Maximum lines shown per page");
  g.addButton(id++,"§a✓",rx+44,ry+16,18,18);
  ry += 40;

  g.addLabel(id++,"§fLabel X",rx,ry,80,16);
  g.addTextField(id++,rx,ry+16,40,18).setText(String(tCfg.ui.labelX)).setHoverText("Horizontal text offset");
  g.addButton(id++,"§a✓",rx+44,ry+16,18,18);
  ry += 40;

  g.addLabel(id++,"§fLabel Y",rx,ry,80,16);
  g.addTextField(id++,rx,ry+16,40,18).setText(String(tCfg.ui.labelY)).setHoverText("Vertical text offset");
  g.addButton(id++,"§a✓",rx+44,ry+16,18,18);
  ry += 40;

  g.addLabel(id++,"§fLine Gap",rx,ry,80,16);
  g.addTextField(id++,rx,ry+16,40,18).setText(String(tCfg.ui.lineGap)).setHoverText("Line Y spacing in pixels");
  g.addButton(id++,"§a✓",rx+44,ry+16,18,18);
  ry += 40;

  var previewOn = td.get("text_preview")==="true";
  g.addButton(id++,(previewOn?"☑ ":"☐ ")+"Preview",bx,by+taH+25,120,18);
}
function handleText(g,id){
  var sd=trainer.getStoreddata(),p=G_PLAYER,td=p.getTempdata(),b=SYS.ID.TEXT.BASE;
  var tCfg=load(sd,"dlg.text",DF.TEXT);

  if(id===b+2){
    tCfg.text=g.getComponent(b+1).getText();
    save(sd,"dlg.text",tCfg);if(td.get("text_preview")==="true") simUpdate(g);
    return;
  }
  if(id===b+5){
    tCfg.lines=toInt(g.getComponent(b+4).getText(),tCfg.lines);
    save(sd,"dlg.text",tCfg);if(td.get("text_preview")==="true") simUpdate(g);
    return;
  }
  if(id===b+8){
    tCfg.ui.labelX=toInt(g.getComponent(b+7).getText(),tCfg.ui.labelX);
    save(sd,"dlg.text",tCfg);if(td.get("text_preview")==="true") simUpdate(g);
    return;
  }
  if(id===b+11){
    tCfg.ui.labelY=toInt(g.getComponent(b+10).getText(),tCfg.ui.labelY);
    save(sd,"dlg.text",tCfg);if(td.get("text_preview")==="true") simUpdate(g);
    return;
  }
  if(id===b+14){
    tCfg.ui.lineGap=toInt(g.getComponent(b+13).getText(),tCfg.ui.lineGap);
    save(sd,"dlg.text",tCfg);if(td.get("text_preview")==="true") simUpdate(g);
    return;
  }
  if(id===b+15){
    var on=td.get("text_preview")==="true";
    var btn=g.getComponent(id);
    if(on){td.remove("text_preview");if(btn) btn.setLabel("☐ Preview");simClear(g);}
    else{td.put("text_preview","true");if(btn) btn.setLabel("☑ Preview");simUpdate(g);}
    g.update();
  }
}
function drawNPC(g){
  var p=G_PLAYER;if(!p) return;
  var td=p.getTempdata(),sd=trainer.getStoreddata();
  var cfg = load(sd,"dlg.npc",DF.NPC);
  var id=SYS.ID.NPC.BASE,bx=SYS.BASE.x+82,by=SYS.BASE.y+28;
  var preview=td.get("npc_preview")==="true";

  g.addButton(id++,(cfg.on==="true"?"☑ ":"☐ ")+"Render NPC",bx,by,120,18);
  g.addButton(id++,(cfg.follow==="true"?"☑ ":"☐ ")+"Follow Cursor",bx+130,by,120,18);

  g.addLabel(id++,"§fRotation",bx,by+26,80,16);
  g.addTextField(id++,bx+80,by+24,40,18).setText(String(cfg.rot));
  g.addButton(id++,"§a✓",bx+126,by+24,18,18);

  g.addLabel(id++,"§fScale",bx,by+50,80,16);
  g.addTextField(id++,bx+80,by+48,40,18).setText(String(cfg.scale));
  g.addButton(id++,"§a✓",bx+126,by+48,18,18);

  g.addLabel(id++,"§fPos X",bx,by+74,80,16);
  g.addTextField(id++,bx+80,by+72,40,18).setText(String(cfg.pos.x));
  g.addLabel(id++,"§fPos Y",bx,by+98,80,16);
  g.addTextField(id++,bx+80,by+96,40,18).setText(String(cfg.pos.y));
  g.addButton(id++,"§a✓",bx+126,by+75,18,36);

  g.addButton(id++,(preview?"☑ ":"☐ ")+"Preview",bx,by+124,120,18);
  if(preview && cfg.on==="true"){ simUpdate(g);}
}
function handleNPC(g,id){
  var sd=trainer.getStoreddata(),p=G_PLAYER,td=p.getTempdata(),base=SYS.ID.NPC.BASE;
  var cfg = load(sd,"dlg.npc",DF.NPC);

  if(id===base){
    cfg.on = (cfg.on==="true" ? "false" : "true");
    save(sd,"dlg.npc",cfg);
    var btn = g.getComponent(base);
    if(btn) btn.setLabel((cfg.on==="true"?"☑ ":"☐ ")+"Render NPC");
    if(td.get("npc_preview")==="true"){simUpdate(g);}
    return;
  }
  if(id===base+1){
    cfg.follow = (cfg.follow==="true" ? "false" : "true");
    save(sd,"dlg.npc",cfg);
    var btn = g.getComponent(id);
    if(btn) btn.setLabel((cfg.follow==="true"?"☑ ":"☐ ")+"Follow Cursor");
    if(td.get("npc_preview")==="true"){simUpdate(g)};g.update();return;
  }
  if(id===base+4){
    cfg.rot=toInt(g.getComponent(base+3).getText(),cfg.rot);
    save(sd,"dlg.npc",cfg);if(td.get("npc_preview")==="true") simUpdate(g);return;
  }
  if(id===base+7){
    cfg.scale=toInt(g.getComponent(base+6).getText(),cfg.scale);
    save(sd,"dlg.npc",cfg);if(td.get("npc_preview")==="true") simUpdate(g);return;
  }
  if(id===base+12){
    cfg.pos={x:toInt(g.getComponent(base+9).getText(),cfg.pos.x),y:toInt(g.getComponent(base+11).getText(),cfg.pos.y)};
    save(sd,"dlg.npc",cfg);if(td.get("npc_preview")==="true"){simUpdate(g)}return;
  }
  if(id===base+13){
    var btn=g.getComponent(id);
    var on=td.get("npc_preview")==="true";
    if(on){td.remove("npc_preview");btn.setLabel("☐ Preview");simClear(g);
    }else{td.put("npc_preview","true");btn.setLabel("☑ Preview");simUpdate(g);}
    g.update();return;
  }
}
function drawAsset(g){
  var sd=trainer.getStoreddata(),cfg=load(sd,"dlg.asset",DF.ASSET),p=G_PLAYER,td=p.getTempdata();
  var assetPreview=td.get("asset_preview")==="true";
  var id=SYS.ID.ASSET.BASE,bx=SYS.BASE.x+82,by=SYS.BASE.y+28;
  g.addLabel(id++,"§fBackground Texture Path",bx,by,220,16);
  g.addTextField(id++,bx,by+18,270,18).setText(cfg.texture||"").setHoverText("Texture path\nex) modid:gui/xxx.png");
  g.addButton(id++,"§a✓",bx+275,by+18,18,18).setHoverText("Save texture path to storage");;
  g.addButton(id++,"§a👁",bx+295,by+18,18,18).setHoverText("Apply this path to preview (no save)");;
  g.addButton(id++,"§a↻",bx+315,by+18,18,18).setHoverText("Revert to stored texture path");;
  var keys=["x","y","w","h","tx","ty"],rx=bx,ry=by+50;
  for(var i=0;i<keys.length;i++){
  g.addTextField(id++,rx+i*34,ry,32,18).setText(String(cfg.rect[keys[i]]))
    .setHoverText(
      keys[i]==="x"  ? "Rect X position\nLeft offset" :
      keys[i]==="y"  ? "Rect Y position\nTop offset" :
      keys[i]==="w"  ? "Rect width\nDisplayed width" :
      keys[i]==="h"  ? "Rect height\nDisplayed height" :
      keys[i]==="tx" ? "Texture X offset\nCrop start X" :
      keys[i]==="ty" ? "Texture Y offset\nCrop start Y" :
      ""
    );
}
  g.addButton(id++,"§a✓",rx+keys.length*34+6,ry,18,18);
  g.addButton(id++,(assetPreview?"☑ ":"☐ ")+"Preview",bx,ry+26,120,18);
  if(td.get("asset_preview")==="true") simUpdate(g);
}
function handleAsset(g,id){
  var sd=trainer.getStoreddata(),cfg=load(sd,"dlg.asset",DF.ASSET),p=G_PLAYER,td=p.getTempdata();
  var base=SYS.ID.ASSET.BASE;
  var TF_TEXTURE=base+1,BTN_SAVE=base+2,BTN_APPLY=base+3,BTN_RESET=base+4;
  var TF_RECT=base+5,BTN_RECT_SAVE=base+11,BTN_PREVIEW=base+12;
  if(id===BTN_SAVE){
    cfg.texture=g.getComponent(TF_TEXTURE).getText();
    save(sd,"dlg.asset",cfg);td.remove("asset_candidate");
    if(td.get("asset_preview")==="true") simUpdate(g);
    return;
  }
  if(id===BTN_APPLY){
    var path=g.getComponent(TF_TEXTURE).getText();
    if(!path) return;
    td.put("asset_candidate",path);
    if(td.get("asset_preview")!=="true"){td.put("asset_preview","true");var pb=g.getComponent(BTN_PREVIEW); if(pb) pb.setLabel("☑ Preview");}
    simUpdate(g); g.update(); return;
  }
  if(id===BTN_RESET){
    g.getComponent(TF_TEXTURE).setText(cfg.texture||"");td.remove("asset_candidate");
    if(td.get("asset_preview")==="true") simUpdate(g);
    g.update(); return;
  }
  if(id===BTN_RECT_SAVE){
    cfg.rect={
      x:toInt(g.getComponent(TF_RECT).getText(),cfg.rect.x),
      y:toInt(g.getComponent(TF_RECT+1).getText(),cfg.rect.y),
      w:toInt(g.getComponent(TF_RECT+2).getText(),cfg.rect.w),
      h:toInt(g.getComponent(TF_RECT+3).getText(),cfg.rect.h),
      tx:toInt(g.getComponent(TF_RECT+4).getText(),cfg.rect.tx),
      ty:toInt(g.getComponent(TF_RECT+5).getText(),cfg.rect.ty)
    };
    save(sd,"dlg.asset",cfg);
    if(td.get("asset_preview")==="true") simUpdate(g);
    return;
  }
  if(id===BTN_PREVIEW){
    var on=td.get("asset_preview")==="true";
    var btn=g.getComponent(BTN_PREVIEW);
    if(on){td.remove("asset_preview");if(btn) btn.setLabel("☐ Preview");simClear(g);
    }else{td.put("asset_preview","true");if(btn) btn.setLabel("☑ Preview");simUpdate(g);}
    g.update(); return;
  }
}
function drawSound(g){
  var sd  = trainer.getStoreddata();
  var cfg = load(sd,"dlg.sound",DF.SOUND);
  var bx  = SYS.BASE.x + 82;
  var by  = SYS.BASE.y + 28;
  var S   = SYS.ID.SOUND;

  if(!cfg.open)     cfg.open     = {id:"",vol:1,pitch:1};
  if(!cfg.sentence) cfg.sentence = {id:"",vol:1,pitch:1};
  if(!cfg.char)     cfg.char     = {id:"",vol:1,pitch:1};

  var id=420 
  g.addLabel(id++,"§fOPEN Sound",bx,by,160,16);
  g.addTextField(S.OPEN_ID,bx,by+16,220,18).setText(cfg.open.id)
  g.addButton(S.OPEN_TEST,"§a▶",bx+224,by+16,20,18).setHoverText("Test sound");
  g.addButton(S.OPEN_STOP,"§c■",bx+246,by+16,20,18).setHoverText("Stop sound");
  g.addLabel(id++,"§fVol",bx,by+40,30,16);
  g.addTextField(S.OPEN_VOL,bx+30,by+38,40,18).setText(String(cfg.open.vol));
  g.addLabel(id++,"§fPitch",bx+80,by+40,40,16);
  g.addTextField(S.OPEN_PITCH,bx+120,by+38,40,18).setText(String(cfg.open.pitch));
  g.addButton(S.OPEN_OK,"§a✓",bx+170,by+38,40,18).setHoverText("Save OPEN sound");

  by += 70;

  g.addLabel(id++,"§fSENTENCE Sound",bx,by,160,16);

  g.addTextField(S.SENT_ID,bx,by+16,220,18).setText(cfg.sentence.id);
  g.addButton(S.SENT_TEST,"§a▶",bx+224,by+16,20,18);
  g.addButton(S.SENT_STOP,"§c■",bx+246,by+16,20,18);

  g.addLabel(id++,"§fVol",bx,by+40,30,16);
  g.addTextField(S.SENT_VOL,bx+30,by+38,40,18).setText(String(cfg.sentence.vol));

  g.addLabel(id++,"§fPitch",bx+80,by+40,40,16);
  g.addTextField(S.SENT_PITCH,bx+120,by+38,40,18).setText(String(cfg.sentence.pitch));
  g.addButton(S.SENT_OK,"§a✓",bx+170,by+38,40,18);
  by += 70;
  g.addLabel(id++,"§fCHAR Sound",bx,by,160,16);
  g.addTextField(S.CHAR_ID,bx,by+16,220,18).setText(cfg.char.id);
  g.addButton(S.CHAR_TEST,"§a▶",bx+224,by+16,20,18);
  g.addButton(S.CHAR_STOP,"§c■",bx+246,by+16,20,18);

  g.addLabel(id++,"§fVol",bx,by+40,30,16);
  g.addTextField(S.CHAR_VOL,bx+30,by+38,40,18).setText(String(cfg.char.vol));
  g.addLabel(id++,"§fPitch",bx+80,by+40,40,16);
  g.addTextField(S.CHAR_PITCH,bx+120,by+38,40,18).setText(String(cfg.char.pitch));
  g.addButton(S.CHAR_OK,"§a✓",bx+170,by+38,40,18);
}
function handleSound(g,id){
  var p=G_PLAYER,S=SYS.ID.SOUND,sd=trainer.getStoreddata();
  var cfg=load(sd,"dlg.sound",DF.SOUND);

  if(id===S.OPEN_TEST){
    var tf=g.getComponent(S.OPEN_ID); if(!tf) return;
    var sid=(tf.getText()+"").trim(); if(!sid) return;
    var vf=g.getComponent(S.OPEN_VOL),pf=g.getComponent(S.OPEN_PITCH);
    p.playSound(sid, vf?(parseFloat(vf.getText())||1):1, pf?(parseFloat(pf.getText())||1):1);
    return;
  }
  if(id===S.OPEN_STOP){
    var tf=g.getComponent(S.OPEN_ID),sid=tf?(tf.getText()+"").trim():"";
    if(sid) trainer.executeCommand("stopsound "+p.getName()+" * "+sid);
    return;
  }
  if(id===S.OPEN_OK){
    var tf=g.getComponent(S.OPEN_ID),vf=g.getComponent(S.OPEN_VOL),pf=g.getComponent(S.OPEN_PITCH);
    cfg.open={id:tf?(tf.getText()+"").trim():"",vol:vf?(parseFloat(vf.getText())||1):1,pitch:pf?(parseFloat(pf.getText())||1):1};
    save(sd,"dlg.sound",cfg); return;
  }
  if(id===S.SENT_TEST){
    var tf=g.getComponent(S.SENT_ID); if(!tf) return;
    var sid=(tf.getText()+"").trim(); if(!sid) return;
    var vf=g.getComponent(S.SENT_VOL),pf=g.getComponent(S.SENT_PITCH);
    p.playSound(sid, vf?(parseFloat(vf.getText())||1):1, pf?(parseFloat(pf.getText())||1):1);
    return;
  }
  if(id===S.SENT_STOP){
    var tf=g.getComponent(S.SENT_ID),sid=tf?(tf.getText()+"").trim():"";
    if(sid) trainer.executeCommand("stopsound "+p.getName()+" * "+sid);
    return;
  }
  if(id===S.SENT_OK){
    var tf=g.getComponent(S.SENT_ID),vf=g.getComponent(S.SENT_VOL),pf=g.getComponent(S.SENT_PITCH);
    cfg.sentence={id:tf?(tf.getText()+"").trim():"",vol:vf?(parseFloat(vf.getText())||1):1,pitch:pf?(parseFloat(pf.getText())||1):1};
    save(sd,"dlg.sound",cfg); return;
  }
  if(id===S.CHAR_TEST){
    var tf=g.getComponent(S.CHAR_ID); if(!tf) return;
    var sid=(tf.getText()+"").trim(); if(!sid) return;
    var vf=g.getComponent(S.CHAR_VOL),pf=g.getComponent(S.CHAR_PITCH);
    p.playSound(sid, vf?(parseFloat(vf.getText())||1):1, pf?(parseFloat(pf.getText())||1):1);
    return;
  }
  if(id===S.CHAR_STOP){
    var tf=g.getComponent(S.CHAR_ID),sid=tf?(tf.getText()+"").trim():"";
    if(sid) trainer.executeCommand("stopsound "+p.getName()+" * "+sid);
    return;
  }
  if(id===S.CHAR_OK){
    var tf=g.getComponent(S.CHAR_ID),vf=g.getComponent(S.CHAR_VOL),pf=g.getComponent(S.CHAR_PITCH);
    cfg.char={id:tf?(tf.getText()+"").trim():"",vol:vf?(parseFloat(vf.getText())||1):1,pitch:pf?(parseFloat(pf.getText())||1):1};
    save(sd,"dlg.sound",cfg); return;
  }
}
function simUpdate(g){
  var p=G_PLAYER; if(!p) return;
  var sd=trainer.getStoreddata();
  simClear(g);

  var rCfg=load(sd,"dlg.npc",DF.NPC), rBase=SYS.ID.NPC.BASE;
  if(rCfg.on==="true"){
    var rot=readNumGui(g,rBase+3,rCfg.rot);
    var scale=readNumGui(g,rBase+6,rCfg.scale);
    var x=readNumGui(g,rBase+9,rCfg.pos.x);
    var y=readNumGui(g,rBase+11,rCfg.pos.y);
    var ed=g.addEntityDisplay(SYS.ID.SIM.ENTITY,x,y,trainer);
    ed.setRotation(rot);
    ed.setScale(scale);
    ed.setFollowingCursor(rCfg.follow==="true");
  }

  var aCfg=load(sd,"dlg.asset",DF.ASSET);
  var cand=p.getTempdata().get("asset_candidate");
  var aBase=SYS.ID.ASSET.BASE;
  var tex=cand||aCfg.texture;
  if(tex){
    var rx=readNumGui(g,aBase+5,aCfg.rect.x);
    var ry=readNumGui(g,aBase+6,aCfg.rect.y);
    var rw=readNumGui(g,aBase+7,aCfg.rect.w);
    var rh=readNumGui(g,aBase+8,aCfg.rect.h);
    var tx=readNumGui(g,aBase+9,aCfg.rect.tx);
    var ty=readNumGui(g,aBase+10,aCfg.rect.ty);
    g.addTexturedRect(SYS.ID.SIM.BG_RECT,tex,rx,ry,rw,rh,tx,ty);
  }

  var tCfg=load(sd,"dlg.text",DF.TEXT);
  var lx=tCfg.ui.labelX;
  var ly=tCfg.ui.labelY;
  var gap=tCfg.ui.lineGap;
  if(aCfg.rect){lx+=readNumGui(g,aBase+5,aCfg.rect.x);ly+=readNumGui(g,aBase+6,aCfg.rect.y);}
  var lines=tCfg.text.split("\n");
  var max=tCfg.lines||lines.length;
  for(var i=0;i<lines.length && i<max;i++){g.addLabel(SYS.ID.SIM.TEXT_BASE+i,lines[i],lx,ly+i*gap,256,12);}
  var mCfg=load(sd,"dlg.mode",DF.MODE);
  var px=readNumGui(g,SYS.ID.MODE.BASE+4,mCfg.ui.prevBtn.x);
  var py=readNumGui(g,SYS.ID.MODE.BASE+5,mCfg.ui.prevBtn.y);
  var nx=readNumGui(g,SYS.ID.MODE.BASE+7,mCfg.ui.nextBtn.x);
  var ny=readNumGui(g,SYS.ID.MODE.BASE+8,mCfg.ui.nextBtn.y);

  g.addButton(SYS.ID.SIM.PAGE_PREV,"<",px,py,20,20);
  g.addButton(SYS.ID.SIM.PAGE_NEXT,">",nx,ny,20,20);

  var lx2=readNumGui(g,SYS.ID.MODE.BASE+10,mCfg.ui.pageLabel.x),ly2=readNumGui(g,SYS.ID.MODE.BASE+11,mCfg.ui.pageLabel.y);
  g.addLabel(SYS.ID.SIM.PAGE_LABEL,"§f1/9",lx2,ly2,60,12);
  g.update();
}
function simClear(g){var S = SYS.ID.SIM;g.removeComponent(S.PAGE_LABEL);g.removeComponent(S.PAGE_PREV);g.removeComponent(S.PAGE_NEXT);g.removeComponent(S.ENTITY);g.removeComponent(S.BG_RECT);for(var i=0;i<100;i++){g.removeComponent(S.TEXT_BASE+i);}}

var SIM=null,GUI=null,TICK=900;
function startPlay(g){
  GUI=g;var sd=trainer.getStoreddata(),txt=load(sd,"dlg.text",DF.TEXT),mode=load(sd,"dlg.mode",DF.MODE);
  SIM={page:0,max:Math.max(1,txt.lines),dlg:txt.text.split("\n"),lines:[],line:0,char:0,typing:false,type:mode.type};
  startPage(0);
}
function stopPlay(){G_PLAYER.timers.stop(TICK);SIM=null;if(GUI){clear(GUI);drawPlay(GUI);GUI.update();}}
function startPage(page){
  if(!SIM) return;
  G_PLAYER.timers.stop(TICK);
  SIM.page=page;SIM.lines=[];SIM.line=0;SIM.char=0;
  if(SIM.type==="page"){fullPage(page);return;}
  SIM.typing=true;G_PLAYER.timers.forceStart(TICK,1,false);playUpdate();
}
function fullPage(page){
  if(!SIM) return;
  var out=[],base=page*SIM.max;
  for(var i=0;i<SIM.max;i++){var l=SIM.dlg[base+i];if(l==null) break;out.push(l);}
  SIM.page=page;SIM.lines=out;SIM.line=out.length;SIM.char=0;SIM.typing=false;
  G_PLAYER.timers.stop(TICK);
  playUpdate();
}
function timer(e){
  if(e.id!==TICK||!SIM||SIM.typing!==true) return;
  var p=e.player,sd=trainer.getStoreddata(),m=load(sd,"dlg.mode",DF.MODE),s=load(sd,"dlg.sound",DF.SOUND);
  if(SIM.type==="page") return;
  
  var idx=SIM.page*SIM.max+SIM.line;
  var text=SIM.dlg[idx];
  if(text==null){SIM.typing=false;return;}

  if(m.type==="char"){
    var cps=Math.max(1,m.char.charsPerStep||1),cur=SIM.lines[SIM.line]||"";
    for(var i=0;i<cps&&SIM.char<text.length;i++){
      cur+=text.charAt(SIM.char++);
      if(s.char&&s.char.id)p.playSound(s.char.id,s.char.vol||1,s.char.pitch||1);
    }
    SIM.lines[SIM.line]=cur;
    if(SIM.char>=text.length){
      SIM.char=0;
      if(s.sentence&&s.sentence.id)p.playSound(s.sentence.id,s.sentence.vol||1,s.sentence.pitch||1);
      SIM.line++; if(SIM.line>=SIM.max){SIM.typing=false;return;}
    }
  }else{
  SIM.lines.push(text);
  if(s.sentence&&s.sentence.id)p.playSound(s.sentence.id,s.sentence.vol||1,s.sentence.pitch||1);
  SIM.line++;
  if(SIM.line>SIM.max){
    SIM.typing=false;
    return;
  }
}
  p.timers.forceStart(TICK,1,false);
  playUpdate();
}
function nextPage(){
  if(!SIM) return;
  if(SIM.typing===true){fullPage(SIM.page);return;}
  var maxPage=Math.ceil(SIM.dlg.length/SIM.max)-1;
  if(SIM.page>=maxPage) return;
  startPage(SIM.page+1);
}
function prevPage(){
  if(!SIM) return;
  if(SIM.typing===true){fullPage(SIM.page);return;}
  if(SIM.page<=0) return;
  startPage(SIM.page-1);
}
function playUpdate(){if(!GUI) return;clear(GUI);drawPlay(GUI);GUI.update();}
function drawPlay(g){
  var P=SYS.ID.PLAY,sd=trainer.getStoreddata();
  var asset=load(sd,"dlg.asset",DF.ASSET),txt=load(sd,"dlg.text",DF.TEXT),mode=load(sd,"dlg.mode",DF.MODE),nCfg=load(sd,"dlg.npc",DF.NPC);
  if(!SIM){g.addButton(P.BASE,"▶ Play",320,160,80,20);return;}
  g.addButton(P.STOP,"■ Stop",320,160,80,20);
  if(asset.texture) g.addTexturedRect(P.BG_RECT,asset.texture,asset.rect.x,asset.rect.y,asset.rect.w,asset.rect.h,asset.rect.tx,asset.rect.ty);
  if(nCfg.on==="true"){
    var ed=g.addEntityDisplay(P.ENTITY,nCfg.pos.x,nCfg.pos.y,trainer);
    ed.setRotation(nCfg.rot);ed.setScale(nCfg.scale);ed.setFollowingCursor(nCfg.follow==="true");
  }
  var lx=txt.ui.labelX,ly=txt.ui.labelY,gap=txt.ui.lineGap;
  if(asset.rect){lx+=asset.rect.x;ly+=asset.rect.y;}
  for(var i=0;i<SIM.lines.length;i++) g.addLabel(P.TEXT_BASE+i,SIM.lines[i],lx,ly+i*gap,256,12);
  var total=Math.max(1,Math.ceil(SIM.dlg.length/SIM.max));
  var px=mode.ui.prevBtn.x,py=mode.ui.prevBtn.y,nx=mode.ui.nextBtn.x,ny=mode.ui.nextBtn.y,lx2=mode.ui.pageLabel.x,ly2=mode.ui.pageLabel.y;
  g.addButton(P.PAGE_PREV,"<",px,py,20,20);
  g.addButton(P.PAGE_NEXT,">",nx,ny,20,20);
  g.addLabel(P.PAGE_LABEL,"§f"+(SIM.page+1)+" / "+total,lx2,ly2,80,16);
}
function clear(g){
  var P=SYS.ID.PLAY;
  g.removeComponent(P.PAGE_PREV);g.removeComponent(P.PAGE_NEXT);g.removeComponent(P.PAGE_LABEL);
  g.removeComponent(P.BG_RECT);g.removeComponent(P.ENTITY);
  g.removeComponent(P.BASE);g.removeComponent(P.STOP);
  for(var i=0;i<260;i++) g.removeComponent(P.TEXT_BASE+i);
}
function handlePlay(g,id){
  var P=SYS.ID.PLAY;
  if(id===P.BASE){startPlay(g);return;}
  if(id===P.STOP){stopPlay();return;}
  if(!SIM) return;
  if(id===P.PAGE_NEXT){nextPage();return;}
  if(id===P.PAGE_PREV){prevPage();return;}
}
function customGuiClosed(e){
  if (e.gui.getID()!==SYS.GUI_ID) return
  resetGuiTemp(e.player)
  e.player.timers.stop(TICK)
}