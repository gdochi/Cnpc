///////////////////////////////////////////////////
var AD={
  LIST:["Great_dochi","Admin2"], // List of admin player names allowed to access admin-only features
  ITEM:"minecraft:stick"        // Item required to open or interact with the admin GUI
};
////////////////////////////////////////////////////
var SYS={
  GUI_ID:900,GUI:{W:256,H:256},BASE:{x:-100,y:0},
  CAT:["BASIC","DETECTION","BATTLE","DETAIL","CONDITION","REWARD","POSITION","EXTERNAL","SOUND"],
  ID:{CAT:10,IR:100,BASIC:{BASE:200,END:250},DETECTION:{BASE:300,END:350},BATTLE:{BASE:400,END:450},
  DETAIL:{BASE:500,END:580,RND_L:500,RND_B:501,TF_S:520,OK_S:521,TF_I:523,OK_I:524,TA_M:526,OK_M:527,SP_L:550,SP_B:551,PG_P:560,PG_N:561},
CONDITION:{
  BASE:640, END:799,RND_L:640,
  RND_B:641,MODE_L:660,MODE_B:661,RULE_L:662,RULE_LB:663,RULE_B:683,RULE_ADD:698,RULE_DEL:699,
  TYPE_L:700,TYPE_PREV:701,TYPE_TXT:702,TYPE_NEXT:703,
  KEY_L:710,KEY_PREV:711,KEY_TXT:712,KEY_NEXT:713,KEY_TF:714,
  OP_L:720,OP_PREV:721,OP_TXT:722,OP_NEXT:723,
  VAL_L:730,VAL_TF:731,OK:738
},
REWARD:{
  BASE:800,END:999,
  RND_L:800,RND_B:810,
  MODE_L:840,MODE_B:841,
  LIST_L:850,LIST_LB:860,LIST_B:880,
  ADD:900,DEL:901,
  TYPE_L:910,TYPE_PREV:911,TYPE_TXT:912,TYPE_NEXT:913,
  KEY_L:920,KEY_PREV:921,KEY_TF:922,KEY_TXT:923,KEY_NEXT:924,
  VAL_L:930,VAL_TF:931,
  OK:949
},
POSITION:{BASE:1000,END:1050},
EXTERNAL:{
  BASE:1080,END:1300,

  SPEC_LABEL:1081,FOLDER_TF:1082,FOLDER_OK:1090,SPEC_INFO:1091,
  EXPORT_LABEL:1092,EXPORT_TF:1095,EXPORT_OK:1100,EXPORT_INFO:1101,
  EXPORT_BTN:1150,

  IMPORT_LABEL:1160,
  IMPORT_LIST_BASE:1170,
  IMPORT_PREV:1190,IMPORT_NEXT:1191,
  IMPORT_TF:1193,IMPORT_OK:1194,IMPORT_LIST_LABEL_BASE:1130
},
SOUND:{
  BASE:2000,END:2099,
  PRE_L:2001,PRE_ID:2002,PRE_VOL:2003,PRE_PITCH:2004,
  PRE_VOL_L:2005,PRE_PITCH_L:2006,
  TEST_PRE:2020,STOP_PRE:2024,PRE_OK:2022,

  START_L:2010,START_ID:2011,START_VOL:2012,START_PITCH:2013,
  START_VOL_L:2014,START_PITCH_L:2015,
  TEST_START:2021,STOP_START:2025,START_OK:2023
}
},  
  BTN:{X:6,Y:26,W:40,H:16,GAP:22,TEX:"customnpcs:textures/gui/invisible.png"},
  LINE:{COLOR:0xFFCC6A6A,THICK:2,TOP:16,BOTTOM:256,LEFT:72,RIGHT:400},
  BALL:{ITEM:"cobblemon:poke_ball",X:-20,Y:26,W:16,H:16},
};
var trainer;
var API=Java.type("noppes.npcs.api.NpcAPI").Instance();
var File=Java.type("java.io.File");
var Files=Java.type("java.nio.file.Files");
var StandardCharsets=Java.type("java.nio.charset.StandardCharsets");

var BASIC_FIELD={
  0:{k:"displayArea",type:"string",df:""},
  1:{k:"walkSpeed",type:"int",min:0,df:2},
  2:{k:"maxHealth",type:"int",min:1,df:10},
  3:{k:"returnHome",type:"bool",df:true},
  4:{k:"handItem",type:"string",df:"cobblemon:poke_ball"}
};
var DETECTION_FIELD={
  0:{k:"detectType",type:"int",min:0,max:2,df:1},
  1:{k:"detectTick",type:"int",min:1,df:20},
  2:{k:"visionDistance",type:"float",min:0,df:8},
  3:{k:"visionWidth",type:"float",min:0,df:1},
  4:{k:"radiusRange",type:"float",min:0,df:6}
};
var BATTLE_FIELD={
  0:{k:"startType",type:"int",min:0,max:1,df:0},
  1:{k:"startDelay",type:"int",min:0,df:40},
  2:{k:"denyCooldown",type:"int",min:0,df:100},
  3:{k:"rematchEnable",type:"bool",df:false},
  4:{k:"rematchMax",type:"int",min:0,max:8,df:0}
};
var POSITION_FIELD={
  0:{k:"useReposition",type:"bool",df:false},
  1:{k:"playerDistance",type:"float",min:0,df:4},
  2:{k:"playerHeight",type:"float",df:1.0},
  3:{k:"dashEnable",type:"bool",df:false},
  4:{k:"dashPower",type:"float",min:0,df:1.2},
};
var EXTERNAL_FIELD={
  0:{k:"folderPath",type:"string",df:"your_trainers"},
  1:{k:"exportPath",type:"string",df:""}
};
var DETAIL_FIELD={
  trainerSpec:{df:""},
  itemLimit:{df:""},
  startMessage:{df:""}
};
var COND_META = [
  { name:"stored",  key:"text",    op:["==",">=","<="],   val:"text" },
  { name:"item",    key:"text",    op:["has","not",">="], val:"int"  },
  { name:"tag",     key:"text",    op:["has","not"],      val:null   },
  { name:"faction", key:"faction", op:["==",">=","<="],   val:"int"  },
  { name:"adv",     key:"text",    op:["done","not"],     val:null   }
];
var REWARD_META=[
  {name:"faction", key:"text", val:"int"},     
  {name:"command", key:"text", val:null},      
  {name:"item",    key:"text", val:"int"},    
  {name:"adv",     key:"text", val:null}       
]
function interact(e){
  var p=e.player;
  if(e.type!==1||!e.target||e.target.getType()!==2)return;
  trainer=e.target;
  if(AD.LIST.indexOf(p.getName())===-1) return;
  var it=p.getMainhandItem();
  if(it&&it.getName()==AD.ITEM) {openGui(p);}
}
function openGui(p){
  var g=API.createCustomGui(SYS.GUI_ID,SYS.GUI.W,SYS.GUI.H,false,p),bx=SYS.BASE.x,by=SYS.BASE.y,L=SYS.LINE;
  g.addColoredLine(SYS.ID.CAT+0,bx,by+L.TOP,bx+L.RIGHT,by+L.TOP,L.COLOR,L.THICK);
  g.addColoredLine(SYS.ID.CAT+1,bx,by+L.BOTTOM,bx+L.RIGHT,by+L.BOTTOM,L.COLOR,L.THICK);
  g.addColoredLine(SYS.ID.CAT+2,bx+L.LEFT,by+L.TOP,bx+L.LEFT,by+L.BOTTOM,L.COLOR,L.THICK);
  var y=by+SYS.BTN.Y;
  for(var i=0;i<SYS.CAT.length;i++){ g.addTexturedButton(SYS.ID.CAT+10+i,SYS.CAT[i],bx+SYS.BTN.X,y,SYS.BTN.W,SYS.BTN.H,SYS.BTN.TEX); y+=SYS.BTN.GAP; }
  p.showCustomGui(g);
}
function customGuiButton(e){
  var g=e.gui,id=e.buttonId,p=e.player;
  var EX=SYS.ID.EXTERNAL;
  if(id>=EX.BASE && id<EX.END){if(handleEx(p,g,id)) return;}
  var B=SYS.ID.BATTLE;
  if(id>=B.BASE && id<B.END){onField(g,id,B.BASE,BATTLE_FIELD,"BATTLE");g.update();return;}
  var DT=SYS.ID.DETAIL;
  if(id>=DT.BASE && id<DT.END){if(handleDetail(p,g,id)) return;g.update();return;}
  var C=SYS.ID.CONDITION;
  if(id>=C.BASE && id<C.END){if(handleCon(p,g,id)) return;g.update(); return;}
  var BA=SYS.ID.BASIC;
  if(id>=BA.BASE && id<BA.END){onField(g,id,BA.BASE,BASIC_FIELD,"BASIC");g.update();return;}
  var D=SYS.ID.DETECTION;
  if(id>=D.BASE && id<D.END){onField(g,id,D.BASE,DETECTION_FIELD,"DETECTION");g.update();return;}
  var P=SYS.ID.POSITION;
  if(id>=P.BASE && id<P.END){onField(g,id,P.BASE,POSITION_FIELD,"POSITION");g.update();return;}
  var S=SYS.ID.SOUND;
  if(id>=S.BASE && id<S.END){if(handleSound(p,g,id)) return;g.update();return;}
  var R = SYS.ID.REWARD;
  if(id>=R.BASE && id<R.END){if(handleReward(p,g,id)) return;g.update();return;}
  if(id>=SYS.ID.CAT+10 && id<SYS.ID.CAT+10+SYS.CAT.length){onCategory(p,g,id);return;}
}
function onCategory(p,g,id){
  var idx=id-(SYS.ID.CAT+10),bx=SYS.BASE.x,by=SYS.BASE.y;
  g.removeComponent(SYS.ID.IR);
  for(var i=0;i<SYS.CAT.length;i++){clearCat(g, SYS.CAT[i]);}
  g.addItemRenderer(SYS.ID.IR,bx+SYS.BALL.X,by+SYS.BALL.Y+idx*SYS.BTN.GAP,SYS.BALL.W,SYS.BALL.H,p.getWorld().createItem(SYS.BALL.ITEM,1));
  if(idx===0){ drawBasic(g);     applySave(g,trainer,"BASIC",SYS.ID.BASIC.BASE,BASIC_FIELD); }
  if(idx===1){ drawDetection(g); applySave(g,trainer,"DETECTION",SYS.ID.DETECTION.BASE,DETECTION_FIELD); }
  if(idx===2){ drawBattle(g);  applySave(g,trainer,"BATTLE",SYS.ID.BATTLE.BASE,BATTLE_FIELD); }
  if(idx===3){ drawDetail(g);  applyDetail(g,trainer); }  
  if(idx===4){ drawCon(g); applyPreview(g,"CONDITION") }
  if(idx===5){ drawReward(g); applyPreview(g,"REWARD"); }
  if(idx===6){ drawPosition(g); applySave(g,trainer,"POSITION",SYS.ID.POSITION.BASE,POSITION_FIELD); }
  if(idx===7){ drawExternal(g);}
  if(idx===8){ drawSound(g);     applySound(g,trainer); }
  g.update();
}
function drawBasic(g){
  var bx=SYS.BASE.x,by=SYS.BASE.y,
      ox=SYS.LINE.LEFT+10,lx=0,fx=90,
      y=by+SYS.LINE.TOP+12,
      fy=-2,gy=30,lw=120,fw=100,fh=16,
      bx2=fx+fw+4,id=SYS.ID.BASIC.BASE;

  g.addLabel(id++,fieldLabel(BASIC_FIELD[0].k),bx+ox+lx,y,lw,fh);
  g.addTextField(id++,bx+ox+fx,y+fy,fw,fh)
  g.addButton(id++,"§a✓",bx+ox+bx2,y+fy,16,fh).setHoverText("NPC display area name"+dfHover(BASIC_FIELD[0].df));
  y+=gy;

  g.addLabel(id++,fieldLabel(BASIC_FIELD[1].k),bx+ox+lx,y,lw,fh);
  g.addTextField(id++,bx+ox+fx,y+fy,fw,fh)
  g.addButton(id++,"§a✓",bx+ox+bx2,y+fy,16,fh).setHoverText("NPC walking speed"+dfHover(BASIC_FIELD[1].df));
  y+=gy;

  g.addLabel(id++,fieldLabel(BASIC_FIELD[2].k),bx+ox+lx,y,lw,fh);
  g.addTextField(id++,bx+ox+fx,y+fy,fw,fh)
  g.addButton(id++,"§a✓",bx+ox+bx2,y+fy,16,fh).setHoverText("NPC max health"+dfHover(BASIC_FIELD[2].df));
  y+=gy;

  g.addLabel(id++,fieldLabel(BASIC_FIELD[3].k),bx+ox+lx,y,lw,fh);
  g.addButton(id++,"§atrue",bx+ox+fx,y+fy,48,fh).setHoverText("Toggle NPC return to home"+dfHover(BASIC_FIELD[3].df))
  g.addLabel(id++,"",bx+ox+lx,y,lw,fh);
  y+=gy;

  g.addLabel(id++,fieldLabel(BASIC_FIELD[4].k),bx+ox+lx,y,lw,fh);
  g.addTextField(id++,bx+ox+fx,y+fy,fw,fh)
  g.addButton(id++,"§a✓",bx+ox+bx2,y+fy,16,fh).setHoverText("Item held in main hand"+dfHover(BASIC_FIELD[4].df));
}
function drawDetection(g){
  var bx=SYS.BASE.x,by=SYS.BASE.y,
      ox=SYS.LINE.LEFT+10,lx=0,fx=90,
      y=by+SYS.LINE.TOP+12,
      fy=-2,gy=30,lw=120,fw=100,fh=16,
      bx2=fx+fw+4,id=SYS.ID.DETECTION.BASE;

  g.addLabel(id++,fieldLabel(DETECTION_FIELD[0].k),bx+ox+lx,y,lw,fh);
  g.addTextField(id++,bx+ox+fx,y+fy,fw,fh);
  g.addButton(id++,"§a✓",bx+ox+bx2,y+fy,16,fh).setHoverText("0 interact / 1 fixed / 2 radius"+dfHover(DETECTION_FIELD[0].df));
  y+=gy;

  g.addLabel(id++,fieldLabel(fieldLabel(DETECTION_FIELD[1].k)),bx+ox+lx,y,lw,fh);
  g.addTextField(id++,bx+ox+fx,y+fy,fw,fh);
  g.addButton(id++,"§a✓",bx+ox+bx2,y+fy,16,fh).setHoverText("Detection interval (tick)"+dfHover(DETECTION_FIELD[1].df));
  y+=gy;

  g.addLabel(id++,fieldLabel(fieldLabel(DETECTION_FIELD[2].k)),bx+ox+lx,y,lw,fh);
  g.addTextField(id++,bx+ox+fx,y+fy,fw,fh);
  g.addButton(id++,"§a✓",bx+ox+bx2,y+fy,16,fh).setHoverText("Fixed vision distance"+dfHover(DETECTION_FIELD[2].df));
  y+=gy;

  g.addLabel(id++,fieldLabel(fieldLabel(DETECTION_FIELD[3].k)),bx+ox+lx,y,lw,fh);
  g.addTextField(id++,bx+ox+fx,y+fy,fw,fh);
  g.addButton(id++,"§a✓",bx+ox+bx2,y+fy,16,fh).setHoverText("Vision width"+dfHover(DETECTION_FIELD[3].df));
  y+=gy;

  g.addLabel(id++,fieldLabel(fieldLabel(DETECTION_FIELD[4].k)),bx+ox+lx,y,lw,fh);
  g.addTextField(id++,bx+ox+fx,y+fy,fw,fh);
  g.addButton(id++,"§a✓",bx+ox+bx2,y+fy,16,fh).setHoverText("Radial detection range"+dfHover(DETECTION_FIELD[4].df));
}
function drawBattle(g){
  var bx=SYS.BASE.x,by=SYS.BASE.y,
      ox=SYS.LINE.LEFT+10,lx=0,fx=90,
      y=by+SYS.LINE.TOP+12,
      fy=-2,gy=30,lw=120,fw=100,fh=16,
      bx2=fx+fw+4,id=SYS.ID.BATTLE.BASE;
  g.addLabel(id++,fieldLabel(BATTLE_FIELD[0].k),bx+ox+lx,y,lw,fh);
  g.addTextField(id++,bx+ox+fx,y+fy,fw,fh);
  g.addButton(id++,"§a✓",bx+ox+bx2,y+fy,16,fh).setHoverText("0 instant / 1 delay(message)"+dfHover(BATTLE_FIELD[0].df));
  y+=gy;
  g.addLabel(id++,fieldLabel(BATTLE_FIELD[1].k),bx+ox+lx,y,lw,fh);
  g.addTextField(id++,bx+ox+fx,y+fy,fw,fh);
  g.addButton(id++,"§a✓",bx+ox+bx2,y+fy,16,fh).setHoverText("Auto start delay (tick)"+dfHover(BATTLE_FIELD[1].df));
  y+=gy;
  g.addLabel(id++,fieldLabel(BATTLE_FIELD[2].k),bx+ox+lx,y,lw,fh);
  g.addTextField(id++,bx+ox+fx,y+fy,fw,fh);
  g.addButton(id++,"§a✓",bx+ox+bx2,y+fy,16,fh).setHoverText("Cooldown after deny (tick)"+dfHover(BATTLE_FIELD[2].df));
  y+=gy;
  g.addLabel(id++,fieldLabel(BATTLE_FIELD[3].k),bx+ox+lx,y,lw,fh);
  g.addButton(id++,"§cfalse",bx+ox+fx,y+fy,48,fh).setHoverText("Enable rematch"+dfHover(BATTLE_FIELD[3].df));
  g.addLabel(id++,"",0,0,0,0); 
  y+=gy;
  g.addLabel(id++,fieldLabel(BATTLE_FIELD[4].k),bx+ox+lx,y,lw,fh);
  g.addTextField(id++,bx+ox+fx,y+fy,fw,fh);
  g.addButton(id++,"§a✓",bx+ox+bx2,y+fy,16,fh).setHoverText("Max rematch count (0–"+BATTLE_FIELD[4].max+")"+dfHover(BATTLE_FIELD[4].df));
}
function drawPosition(g){
  var bx=SYS.BASE.x,by=SYS.BASE.y,
      ox=SYS.LINE.LEFT+10,lx=0,fx=90,
      y=by+SYS.LINE.TOP+12,
      fy=-2,gy=30,lw=120,fw=100,fh=16,
      bx2=fx+fw+4,id=SYS.ID.POSITION.BASE;

  g.addLabel(id++,fieldLabel(POSITION_FIELD[0].k),bx+ox+lx,y,lw,fh);
  g.addButton(id++,"§cfalse",bx+ox+fx,y+fy,48,fh).setHoverText("Reposition player before battle"+dfHover(POSITION_FIELD[0].df));
  g.addLabel(id++,"",0,0,0,0);
  y+=gy;

  g.addLabel(id++,fieldLabel(POSITION_FIELD[1].k),bx+ox+lx,y,lw,fh);
  g.addTextField(id++,bx+ox+fx,y+fy,fw,fh);
  g.addButton(id++,"§a✓",bx+ox+bx2,y+fy,16,fh).setHoverText("Distance in front of NPC"+dfHover(POSITION_FIELD[1].df));
  y+=gy;

  g.addLabel(id++,fieldLabel(POSITION_FIELD[2].k),bx+ox+lx,y,lw,fh);
  g.addTextField(id++,bx+ox+fx,y+fy,fw,fh);
  g.addButton(id++,"§a✓",bx+ox+bx2,y+fy,16,fh).setHoverText("Vertical offset (Y)"+dfHover(POSITION_FIELD[2].df));
  y+=gy;

  g.addLabel(id++,fieldLabel(POSITION_FIELD[3].k),bx+ox+lx,y,lw,fh);
  g.addButton(id++,"§cfalse",bx+ox+fx,y+fy,48,fh).setHoverText("Enable dash"+dfHover(POSITION_FIELD[3].df));
  g.addLabel(id++,"",0,0,0,0);
  y+=gy;

  g.addLabel(id++,fieldLabel(POSITION_FIELD[4].k),bx+ox+lx,y,lw,fh);
  g.addTextField(id++,bx+ox+fx,y+fy,fw,fh);
  g.addButton(id++,"§a✓",bx+ox+bx2,y+fy,16,fh).setHoverText("Dash power"+dfHover(POSITION_FIELD[4].df));
}
var EX_STATE={page:0,sel:""};
function drawExternal(g){
  var bx=SYS.BASE.x,by=SYS.BASE.y,ox=SYS.LINE.LEFT+10,fx=90,
      y=by+SYS.LINE.TOP+12,lw=120,fw=140,fh=16,
      ex=SYS.ID.EXTERNAL,cfg=loadCfg("cfg.EXTERNAL"),
      p1=setPath(cfg.folderPath||""),p2=setPath(cfg.exportPath||""),
      abs1=p1.indexOf(":")!==-1||p1.startsWith("/")||p1.startsWith("\\"),
      abs2=p2.indexOf(":")!==-1||p2.startsWith("/")||p2.startsWith("\\");

  g.addLabel(ex.SPEC_LABEL,"§fSpec Path",bx+ox,y,lw,fh);
  g.addTextField(ex.FOLDER_TF,bx+ox+fx,y,fw,fh).setText(p1);
  g.addButton(ex.FOLDER_OK,"§a✓",bx+ox+fx+fw+4,y,16,fh);
  y+=fh+4;
  g.addLabel(ex.SPEC_INFO,p1?(abs1?"§7→ §a"+p1:"§7→ §a.minecraft/"+p1):"§8(none)",bx+ox+fx,y,220,fh);

  y+=fh+8;
  g.addLabel(ex.EXPORT_LABEL,"§fExport Path",bx+ox,y,lw,fh);
  g.addTextField(ex.EXPORT_TF,bx+ox+fx,y,fw,fh).setText(p2);
  g.addButton(ex.EXPORT_OK,"§a✓",bx+ox+fx+fw+4,y,16,fh);
  y+=fh+4;
  g.addLabel(ex.EXPORT_INFO,p2?(abs2?"§7→ §b"+p2:"§7→ §b.minecraft/"+p2):"§8(none)",bx+ox+fx,y,220,fh);

  y+=fh+6;
  g.addButton(ex.EXPORT_BTN,"§bExport",bx+ox+fx,y,60,fh);

  y+=fh+10;
  g.addLabel(ex.IMPORT_LABEL,"§fImport Setting",bx+ox,y,lw,fh);

  var list=[],path=p2;
  if(path) list=scanNpcCfgFiles(path);
  var per=4,start=EX_STATE.page*per,listY=y+fh+12;

  for(var i=0;i<per;i++){
    var idx=start+i,n=list[idx];
    if(!n) break;
    g.addButton(ex.IMPORT_LIST_BASE+i,"",bx+ox-10,listY,fw-25,fh).setTexture(SYS.BTN.TEX);
    g.addLabel(ex.IMPORT_LIST_LABEL_BASE+i,(EX_STATE.sel===n?"§a> ":"§7- ")+n,bx+ox,listY+2,fw-40,fh);
    listY+=fh+2;
  }
  g.addButton(ex.IMPORT_PREV,"§7◀",bx+ox,y+10,20,fh);
  g.addButton(ex.IMPORT_NEXT,"§7▶",bx+ox+30,y+10,20,fh);
  g.addTextField(ex.IMPORT_TF,bx+ox+fx,y,fw,fh).setText(EX_STATE.sel||"");
  g.addButton(ex.IMPORT_OK,"§a✓",bx+ox+fx+fw+4,y,16,fh);
}
function exportNpcCfg(n){
  var cfg=callCFG(n),ext=cfg.EXTERNAL||{},p=setPath(ext.exportPath||"");
  if(!p) return;
  var dir=(p.indexOf(":")!==-1||p.startsWith("/")||p.startsWith("\\"))?new File(p):new File(new File("."),p);
  if(!dir.exists()) dir.mkdirs();
  var name=n.getDisplay().getName().replace(/[^\w\-]/g,"_");
  var out=new File(dir,name+".json");
  Files.write(out.toPath(),JSON.stringify(cfg,null,2).getBytes(StandardCharsets.UTF_8));
}
function importNpcCfg(n,path,name){
  var f=new File(path,name+".json");
  if(!f.exists()) return;
  var raw=new java.lang.String(Files.readAllBytes(f.toPath()),StandardCharsets.UTF_8);
  var j=JSON.parse(raw);
  for(var k in j){n.getStoreddata().put("cfg."+k,JSON.stringify(j[k]));}
  n.getStoreddata().put("cfg._import_ts",Date.now());
}
function handleEx(p,g,id){
  var ex=SYS.ID.EXTERNAL,cfg=callCFG(trainer).EXTERNAL||{}
  var path=setPath(cfg.exportPath||""),
      list=scanNpcCfgFiles(path),
      per=4;

  if(id===ex.FOLDER_OK){
    var tf=g.getComponent(ex.FOLDER_TF);
    saveField(trainer,"EXTERNAL","folderPath",setPath(tf?tf.getText():""));
    EX_STATE.page=0;EX_STATE.sel="";
    redraw(g,"EXTERNAL");return true;
  }
  if(id===ex.EXPORT_OK){
    var tf2=g.getComponent(ex.EXPORT_TF);
    saveField(trainer,"EXTERNAL","exportPath",setPath(tf2?tf2.getText():""));
    redraw(g,"EXTERNAL");return true;
  }
  if(id===ex.EXPORT_BTN){
    if(!cfg.exportPath) return true;
    exportNpcCfg(trainer);
    p.message("§a[Export] NPC config exported.");
    return true;
  }
  if(id>=ex.IMPORT_LIST_BASE&&id<ex.IMPORT_LIST_BASE+per){
    var idx=EX_STATE.page*per+(id-ex.IMPORT_LIST_BASE);
    if(list[idx]) EX_STATE.sel=list[idx];
    redraw(g,"EXTERNAL");return true;
  }
  if(id===ex.IMPORT_PREV){
    if(EX_STATE.page>0) EX_STATE.page--;
    redraw(g,"EXTERNAL");return true;
  }
  if(id===ex.IMPORT_NEXT){
    if((EX_STATE.page+1)*per<list.length) EX_STATE.page++;
    redraw(g,"EXTERNAL");return true;
  }
  if(id===ex.IMPORT_OK){
    if(!EX_STATE.sel||!path) return true;
    importNpcCfg(trainer,path,EX_STATE.sel);
    EX_STATE.sel="";
    p.message("§a[Import] applied.");
    redraw(g,"EXTERNAL");
    return true;
  }
  return false;
}
function scanNpcCfgFiles(path){
  var out=[];
  if(!path) return out;
  var dir=(path.indexOf(":")!==-1||path.startsWith("/")||path.startsWith("\\"))?new File(path):new File(new File("."),path);
  if(!dir.exists()||!dir.isDirectory()) return out;
  var files=dir.listFiles();
  if(!files) return out;

  for(var i=0;i<files.length;i++){
    var f=files[i];
    if(!f.isFile()) continue;
    var n=f.getName();
    if(!n.endsWith(".json")) continue;
    try{
      var raw=new java.lang.String(Files.readAllBytes(f.toPath()),StandardCharsets.UTF_8);
      var j=JSON.parse(raw);
      if(!j||typeof j!=="object") continue;
      if(j.BASIC||j.DETECTION||j.BATTLE||j.CONDITION||j.REWARD) out.push(n.substring(0,n.length-5));
    }catch(e){}
  }
  return out;
}
function redraw(g,key){
  var id=SYS.ID[key];
  if(!id) return;
  for(var i=id.BASE;i<id.END;i++) g.removeComponent(i);
  if(key==="EXTERNAL") drawExternal(g);
  g.update();
}
var D_R=0;var D_P=0;var D_SZ=3; 
function drawDetail(g){
  var D=SYS.ID.DETAIL;var bx=SYS.BASE.x, by=SYS.BASE.y;
  var ox=SYS.LINE.LEFT+10, fx=90;var y=by+SYS.LINE.TOP+12;
  var fy=-2, gy=30;var lw=120, fw=100, fh=16;
  var list=getEXList(loadCfg("cfg.EXTERNAL").folderPath||"");
  var rMax=getMaxRound();

  g.addLabel(D.RND_L,"§fBattle Round",bx+ox,y,lw,fh);
  for(var i=0;i<rMax;i++){g.addButton(D.RND_B+i,D_R===i?"§a["+i+"]":"§f["+i+"]",bx+ox+fx+(i*26),y,24,fh);}
  y+=gy;

  g.addLabel(D.TF_S-1,fieldLabel("trainerSpec"),bx+ox,y,lw,fh);
  g.addTextField(D.TF_S,bx+ox+fx,y+fy,fw,fh);
  g.addButton(D.OK_S,"§a✓",bx+ox+fx+fw+4,y+fy,16,fh);
  y+=fh+4;

  var start=D_P*D_SZ;
  var end=Math.min(start+D_SZ,list.length);
  var lb=D.SP_L;var bt=D.SP_B;

  for(var i=start;i<end;i++){
    g.addLabel(lb,"§f"+list[i],bx+ox+fx,y,fw,fh);
    g.addTexturedButton(bt,"",bx+ox+fx,y,fw,fh,SYS.BTN.TEX);lb+=2;bt+=2;y+=fh;
  }

  if(list.length>D_SZ){
    g.addButton(D.PG_P,"§7<",bx+ox+fx,y,20,fh);
    g.addButton(D.PG_N,"§7>",bx+ox+fx+fw-20,y,20,fh);
    y+=gy;
  }else{y+=8;}
  g.addLabel(D.TF_I-1,fieldLabel("itemLimit"),bx+ox,y,lw,fh);
  g.addTextField(D.TF_I,bx+ox+fx,y+fy,fw,fh);
  g.addButton(D.OK_I,"§a✓",bx+ox+fx+fw+4,y+fy,16,fh);
  y+=gy;

  g.addLabel(D.TA_M-1,fieldLabel("startMessage"),bx+ox,y,lw,60);
  g.addTextArea(D.TA_M,bx+ox+fx,y+fy,150,60);
  g.addButton(D.OK_M,"§a✓",bx+ox+fx+154,y+fy,16,60).setHoverText("Use @@ for line break");;

  applyDetail(g,trainer);
  g.update();
}
function handleDetail(p,g,id){
  var D=SYS.ID.DETAIL;
  var list=getEXList(loadCfg("cfg.EXTERNAL").folderPath||"");
  var R_MAX=getMaxRound();

  if(id>=D.RND_B && id<D.RND_B+R_MAX){
    D_R=id-D.RND_B;D_P=0;

    var cfg=loadCfg("cfg.DETAIL");
    var made = cfg["trainerSpec_"+D_R]==null;
    if(made){
      ensureDetail(cfg,D_R);
      trainer.getStoreddata().put("cfg.DETAIL",JSON.stringify(cfg));
    }

    for(var i=0;i<R_MAX;i++){
      var b=g.getComponent(D.RND_B+i);
      if(b) b.setLabel(D_R===i?"§a["+i+"]":"§f["+i+"]");
    }
    applyDetail(g,trainer);
    g.update();
    return true;
  }

  if(id===D.OK_S){
    var tf=g.getComponent(D.TF_S);
    saveDetail(g,trainer,"trainerSpec",tf?stripColor(tf.getText()+"").trim():"");
    g.update();return true;
  }

  var s=D_P*D_SZ,e=Math.min(s+D_SZ,list.length);
  for(var i=0;i<e-s;i++){
    if(id===D.SP_B+i*2){
      var tf=g.getComponent(D.TF_S);
      if(tf) tf.setText(list[s+i]);
      for(var j=0;j<e-s;j++){
        var lb=g.getComponent(D.SP_L+j*2);
        if(lb) lb.setText(j===i?"§a"+list[s+j]:"§f"+list[s+j]);
      }
      g.update();return true;
    }
  }

  if(id===D.OK_I){
    var tf=g.getComponent(D.TF_I);
    saveDetail(g,trainer,"itemLimit",tf?stripColor(tf.getText()+"").trim():"");
    g.update();return true;
  }

  if(id===D.PG_P){D_P=Math.max(0,D_P-1);redrawDetail(g);return true;}
  if(id===D.PG_N){D_P=Math.min(Math.floor((list.length-1)/D_SZ),D_P+1);redrawDetail(g);return true;}

  if(id===D.OK_M){
    var ta=g.getComponent(D.TA_M);
    saveDetail(g,trainer,"startMessage",ta?ta.getText()+"":"");
    g.update();return true;
  }
  return true;
}
function redrawDetail(g){
  var D=SYS.ID.DETAIL;
  var list=getEXList(loadCfg("cfg.EXTERNAL").folderPath||"");

  for(var i=0;i<D_SZ;i++){ g.removeComponent(D.SP_L+i*2); g.removeComponent(D.SP_B+i*2); }
  g.removeComponent(D.PG_P); g.removeComponent(D.PG_N);

  var bx=SYS.BASE.x,by=SYS.BASE.y,ox=SYS.LINE.LEFT+10,fx=90,fw=100,fh=16;
  var y=by+SYS.LINE.TOP+12; y+=30; y+=16+4;

  var start=D_P*D_SZ,end=Math.min(start+D_SZ,list.length);
  var cfg=loadCfg("cfg.DETAIL"),curSpec=cfg["trainerSpec_"+D_R]||"";

  var lb=D.SP_L,bt=D.SP_B;
  for(var i=start;i<end;i++){
    var sel=(list[i]===curSpec);
    g.addLabel(lb,sel?"§a"+list[i]:"§f"+list[i],bx+ox+fx,y,fw,fh);
    g.addTexturedButton(bt,"",bx+ox+fx,y,fw,fh,SYS.BTN.TEX);
    lb+=2; bt+=2; y+=fh;
  }

  if(list.length>D_SZ){ g.addButton(D.PG_P,"§7<",bx+ox+fx,y,20,fh); g.addButton(D.PG_N,"§7>",bx+ox+fx+fw-20,y,20,fh); }
  g.update();
}
function saveDetail(g,n,k,v){
  var r = D_R; 
  var keyMap={trainerSpec:"trainerSpec_"+r,itemLimit:"itemLimit_"+r,startMessage:"startMessage_"+r};
  var realKey = keyMap[k] || (k+"_"+r);
  saveField(n,"DETAIL",realKey,v);
}
function ensureDetail(cfg,r){for(var k in DETAIL_FIELD){var key=k+"_"+r;if(cfg[key]==null) cfg[key]=DETAIL_FIELD[k].df;}}
function applyDetail(g,n){
  var D = SYS.ID.DETAIL;
  var cfg = loadCfg("cfg.DETAIL");
  var r = D_R;

  var spec = cfg["trainerSpec_"+r];
  var item = cfg["itemLimit_"+r];
  var msg  = cfg["startMessage_"+r];

  var tfSpec = g.getComponent(D.TF_S);
  if(tfSpec && tfSpec.setText){tfSpec.setText(spec!=null ? String(spec) : "");}
  var tfItem = g.getComponent(D.TF_I);
  if(tfItem && tfItem.setText){tfItem.setText(item!=null ? String(item) : "");}
  var taMsg = g.getComponent(D.TA_M);
  if(taMsg && taMsg.setText){taMsg.setText(msg!=null ? String(msg) : "");}
}
var C_MODE=0,C_TYPE=0,C_OP=0,C_RULE=-1,C_KEYI=0,COND_RULE_SLOTS=8,COND_EDIT=null;
var COND_LAYOUT={RX:110,RULE_X:40,ROUND_X: 90,GROUP_X: 42,TXT_OFF:-4,BTN_W:20,TXT_W:80,};
function loadCondCfg(){
  var raw=loadCfg("cfg.CONDITION");
  var out={};
  for(var rk in raw){
    var r=raw[rk];
    out[rk]={mode:r.mode||0,rules:[]};
    for(var i=0;i<(r.rules||[]).length;i++){
      var o=r.rules[i];
      var ti=0,oi=0;
      for(var t=0;t<COND_META.length;t++)if(COND_META[t].name===o.type){ti=t;break;}
      var ops=COND_META[ti].op||[];
      oi=Math.max(0,ops.indexOf(o.op));
      var key=o.key;
      if(key&&key.kind==="tag") key="#"+key.value;
      else if(key&&key.value) key=key.value;
      out[rk].rules.push({type:ti,op:oi,key:key||"",val:o.val!=null?String(o.val):null});
    }
  }
  return out;
}
function setCondDetail(g,o){
  if(!o)return;var C=SYS.ID.CONDITION,m=COND_META[o.type],ops=m.op||["?"];
  C_TYPE=o.type;C_OP=o.op;if(C_OP<0||C_OP>=ops.length)C_OP=0;var op=ops[C_OP];
  var ot=g.getComponent(C.OP_TXT);if(ot)ot.setText("§f"+op);
  if(m.key==="faction"){
    var fs=getFactionList(),idx=fs.indexOf(String(o.key||""));C_KEYI=idx>=0?idx:0;
    var kt=g.getComponent(C.KEY_TXT);if(kt&&fs.length)kt.setText("§f"+fs[C_KEYI]);
  }else{var tf=g.getComponent(C.KEY_TF);if(tf)tf.setText(o.key||"");}
  var vf=g.getComponent(C.VAL_TF);
  if(vf){
    if(m.name==="faction"&&op==="not"){vf.setVisible(false);vf.setText("");}
    else condHasVal(o.type,op)?(vf.setVisible(true),vf.setText(o.val!=null?String(o.val):"")):(vf.setVisible(false),vf.setText(""));
  }
}
function ensureRound(cfg,r){
  var k=getRoundKey(r);
  if(!cfg[k]) cfg[k]={ mode:0, rules:[] };
  if(!cfg[k].rules) cfg[k].rules=[];
  if(cfg[k].mode==null) cfg[k].mode=0;
  return cfg[k];
}
function rm(g,id){ try{ g.removeComponent(id); }catch(e){} }
function getFactionList(){
  var list=[];
  try{
    var fh=API.getFactions();
    if(!fh) return list;
    var fs=fh.list();
    if(!fs||!fs.length) return list;
    for(var i=0;i<fs.length;i++) list.push(String(fs[i].getName()));
  }catch(e){}
  return list;
}
function reCondEdit(g){
  var C=SYS.ID.CONDITION,bx=SYS.BASE.x,by=SYS.BASE.y,ox=SYS.LINE.LEFT+10,fh=16;
  var RX=bx+ox+COND_LAYOUT.RX,y=by+SYS.LINE.TOP+12+90;
  var BW=COND_LAYOUT.BTN_W,TW=COND_LAYOUT.TXT_W,GW=BW+TW+BW,GX=RX+COND_LAYOUT.GROUP_X;

  rm(g,C.KEY_L);rm(g,C.KEY_PREV);rm(g,C.KEY_TXT);rm(g,C.KEY_NEXT);rm(g,C.KEY_TF);
  rm(g,C.OP_L);rm(g,C.OP_PREV);rm(g,C.OP_TXT);rm(g,C.OP_NEXT);
  rm(g,C.VAL_L);rm(g,C.VAL_TF);rm(g,C.OK);
  rm(g,C.TYPE_L);rm(g,C.TYPE_PREV);rm(g,C.TYPE_TXT);rm(g,C.TYPE_NEXT);

  var meta=COND_META[C_TYPE],ops=meta.op||["?"];
  if(C_OP<0||C_OP>=ops.length)C_OP=0;var op=ops[C_OP];

  var TY=by+SYS.LINE.TOP+12+60;
  g.addLabel(C.TYPE_L,"§fType",RX,TY,40,fh);
  g.addButton(C.TYPE_PREV,"§7◀",GX,TY,BW,fh);
  g.addLabel(C.TYPE_TXT,"§f"+meta.name,GX+BW+COND_LAYOUT.TXT_OFF,TY,TW,fh).setCentered(true);
  g.addButton(C.TYPE_NEXT,"§7▶",GX+BW+TW,TY,BW,fh);

  if(meta.key){
    g.addLabel(C.KEY_L,"§fKey",RX,y,40,fh);
    if(meta.key==="faction"){
      var fs=getFactionList();
      if(!fs||!fs.length) g.addTextField(C.KEY_TF,GX,y-2,GW,fh);
      else{
        if(C_KEYI<0||C_KEYI>=fs.length)C_KEYI=0;
        g.addButton(C.KEY_PREV,"§7◀",GX,y,BW,fh);
        g.addLabel(C.KEY_TXT,"§f"+fs[C_KEYI],GX+BW+COND_LAYOUT.TXT_OFF,y,TW,fh).setCentered(true);
        g.addButton(C.KEY_NEXT,"§7▶",GX+BW+TW,y,BW,fh);
      }
    }else g.addTextField(C.KEY_TF,GX,y-2,GW,fh);
    y+=30;
  }
  var opY = y;
  g.addLabel(C.OP_L,"§fOp",RX,opY,40,fh);
  g.addButton(C.OP_PREV,"§7◀",GX,opY,BW,fh);
  g.addLabel(C.OP_TXT,"§f"+op,GX+BW+COND_LAYOUT.TXT_OFF,opY,TW,fh).setCentered(true);
  g.addButton(C.OP_NEXT,"§7▶",GX+BW+TW,opY,BW,fh);
  g.addButton(C.OK,"§a✓",GX+GW+6,opY,16,fh);
  y+=30;

  if(condHasVal(C_TYPE,op)){
    g.addLabel(C.VAL_L,"§fVal",RX,y,40,fh);
    g.addTextField(C.VAL_TF,GX,y-2,GW,fh);
    y+=30;
  }
  g.update();
}
function drawCon(g){
  var C=SYS.ID.CONDITION;
  var bx=SYS.BASE.x,by=SYS.BASE.y;
  var ox=SYS.LINE.LEFT+10;
  var fh=16,lw=120;

  var LX=bx+ox;
  var RX=bx+ox+COND_LAYOUT.RX;
  var RULE_X=LX+COND_LAYOUT.RULE_X,RULE_W=40,RULE_GAP=fh;
  var ROUND_X=LX+COND_LAYOUT.ROUND_X,ROUND_GAP=26;
  var MODE_X=ROUND_X;

  var y=by+SYS.LINE.TOP+12;
  var rMax=getMaxRound();

  g.addLabel(C.RND_L,"§fBattle Round",LX,y,lw,fh);
  for(var i=0;i<rMax;i++)g.addButton(C.RND_B+i,D_R===i?"§a["+i+"]":"§f["+i+"]",ROUND_X+i*ROUND_GAP,y,24,fh);
  y+=30;

  g.addLabel(C.MODE_L,"§fCondition Mode",LX,y,lw,fh);
  g.addButton(C.MODE_B,C_MODE===0?"§aAND":"§bOR",MODE_X,y,48,fh);
  y+=30;

  g.addLabel(C.RULE_L,"§fRules",LX,y,lw,fh);
  y+=fh;

  for(var s=0;s<COND_RULE_SLOTS;s++){
    g.addLabel(C.RULE_LB+s*2,"§7<empty>",RULE_X,y,RULE_W,fh);
    g.addTexturedButton(C.RULE_B+s*2,"",RULE_X,y,RULE_W,fh,SYS.BTN.TEX);
    y+=RULE_GAP;
  }
  y+=8;
  g.addButton(C.RULE_ADD,"§a+",RULE_X,y,24,fh);
  g.addButton(C.RULE_DEL,"§c-",RULE_X+26,y,24,fh);

  g.update();
}
function handleCon(p,g,id){
  var C=SYS.ID.CONDITION,cfg=loadCondCfg(),rMax=getMaxRound();
  if(id>=C.RND_B&&id<C.RND_B+rMax){
    D_R=id-C.RND_B;C_RULE=-1;COND_EDIT=null;
    var k=getRoundKey(D_R),made=!cfg[k];ensureRound(cfg,D_R);if(made) saveCondCfg(cfg);
    for(var i=0;i<rMax;i++){var b=g.getComponent(C.RND_B+i);if(b)b.setLabel(D_R===i?"§a["+i+"]":"§f["+i+"]");}
    applyPreview(g,"CONDITION");//reCondEdit(g);
    g.update();return true;
  }
  var data=ensureRound(cfg,D_R),rules=data.rules;
  for(var s=0;s<COND_RULE_SLOTS;s++){
    if(id===C.RULE_B+s*2){
      C_RULE=s;
      var r=rules[s];
      COND_EDIT=r?{type:r.type,op:r.op,key:r.key,val:r.val}:{type:C_TYPE,op:0,key:"",val:null};
      C_TYPE=COND_EDIT.type;C_OP=COND_EDIT.op;
      var m=COND_META[C_TYPE];if(m&&m.key==="faction"){var fs=getFactionList(),idx=fs.indexOf(String(COND_EDIT.key||""));C_KEYI=idx>=0?idx:0;}else C_KEYI=0;
      reCondEdit(g);setCondDetail(g,COND_EDIT);applyPreview(g,"CONDITION");g.update();return true;
    }
  }
  if(id===C.RULE_ADD){
    rules.push({type:0,op:0,key:"",val:null});
    C_RULE=Math.min(COND_RULE_SLOTS-1,rules.length-1);
    COND_EDIT={type:0,op:0,key:"",val:null};
    C_TYPE=0;C_OP=0;C_KEYI=0;
    saveCondCfg(cfg);applyPreview(g,"CONDITION");reCondEdit(g);setCondDetail(g,COND_EDIT);g.update();return true;
  }
  if(id===C.RULE_DEL){
    if(C_RULE>=0&&C_RULE<rules.length) rules.splice(C_RULE,1);
    else if(rules.length>0) rules.pop();
    C_RULE=-1;COND_EDIT=null;
    saveCondCfg(cfg);applyPreview(g,"CONDITION");reCondEdit(g);g.update();return true;
  }
  if(id===C.TYPE_PREV||id===C.TYPE_NEXT){
    if(!COND_EDIT) return true;
    COND_EDIT.type=(COND_EDIT.type+(id===C.TYPE_NEXT?1:-1)+COND_META.length)%COND_META.length;
    COND_EDIT.op=0;COND_EDIT.key="";COND_EDIT.val=null;
    C_TYPE=COND_EDIT.type;C_OP=0;C_KEYI=0;
    reCondEdit(g);setCondDetail(g,COND_EDIT);applyPreview(g,"CONDITION");g.update();return true;
  }
  if(id===C.KEY_PREV||id===C.KEY_NEXT){
    if(!COND_EDIT) return true;
    var m=COND_META[COND_EDIT.type];if(!m||m.key!=="faction") return true;
    var fs=getFactionList();if(!fs||!fs.length) return true;
    var idx=fs.indexOf(String(COND_EDIT.key||""));if(idx<0) idx=0;
    idx=(idx+(id===C.KEY_NEXT?1:-1)+fs.length)%fs.length;
    COND_EDIT.key=fs[idx];C_KEYI=idx;
    var kt=g.getComponent(C.KEY_TXT);if(kt) kt.setText("§f"+fs[idx]);
    g.update();return true;
  }
if(id===C.OP_PREV||id===C.OP_NEXT){
  if(!COND_EDIT) return true;
  var ops=COND_META[COND_EDIT.type].op||["?"];
  COND_EDIT.op=(COND_EDIT.op+(id===C.OP_NEXT?1:-1)+ops.length)%ops.length;
  C_OP=COND_EDIT.op;C_TYPE=COND_EDIT.type;
  reCondEdit(g);setCondDetail(g,COND_EDIT);g.update();return true;
}
if(id===C.OK){
  if(C_RULE<0||!COND_EDIT) return true;
  while(rules.length<=C_RULE) rules.push({type:0,op:0,key:"",val:null});
  var m=COND_META[COND_EDIT.type],r=rules[C_RULE],op=m.op[COND_EDIT.op];
  if(m.key==="faction"){var fs=getFactionList();COND_EDIT.key=(fs&&fs.length)?fs[C_KEYI]:"";}
  else if(m.key){var tf=g.getComponent(C.KEY_TF);COND_EDIT.key=tf?stripColor(tf.getText()+"").trim():"";}
  else COND_EDIT.key="";
  if(condHasVal(COND_EDIT.type,op)){
    var vf=g.getComponent(C.VAL_TF),raw=vf?stripColor(vf.getText()+"").trim():"";
    if(raw==="") COND_EDIT.val=null;
    else if(condValNum(COND_EDIT.type,op)){
      if(!/^-?\d+$/.test(raw)){setCondDetail(g,r);g.update();return true;}
      COND_EDIT.val=parseInt(raw,10);
    }else COND_EDIT.val=raw;
  }else COND_EDIT.val=null;
  r.type=COND_EDIT.type;r.op=COND_EDIT.op;r.key=COND_EDIT.key;r.val=COND_EDIT.val;
  saveCondCfg(cfg);applyPreview(g,"CONDITION");reCondEdit(g);setCondDetail(g,COND_EDIT);g.update();return true;
}

  if(id===C.MODE_B){
    data.mode=(data.mode===0?1:0);C_MODE=data.mode;
    var b=g.getComponent(C.MODE_B);if(b)b.setLabel(C_MODE===0?"§aAND":"§bOR");
    saveCondCfg(cfg);
    applyPreview(g,"CONDITION");
    g.update();return true;
  }
  return true;
}
function condHasVal(t,o){var n=COND_META[t].name;return n==="stored"||n==="faction"||(n==="item"&&o===">=");}
function condValNum(t,o){var n=COND_META[t].name;return n==="faction"||(n==="stored"&&(o===">="||o==="<="))||(n==="item"&&o===">=");}
function opStr(t,oi){var ops=COND_META[t].op||[];return ops[oi]||"";}
function saveCondCfg(cfg){
  var out={};
  for(var rk in cfg){
    var round=cfg[rk];
    if(!round) continue;
    var o={ mode: round.mode||0, rules: [] };
    var arr = round.rules || [];
    for(var i=0;i<arr.length;i++){
      var r=arr[i]; 
      if(!r) continue;
      var m=COND_META[r.type];
      if(!m) continue;
      var it={type: m.name,op: m.op && m.op[r.op] ? m.op[r.op] : r.op };
      if(m.key) it.key = r.key || "";
      if(m.val) it.val = r.val!=null ? r.val : null;
      o.rules.push(it);
    }
    out[rk]=o;
  }
  trainer.getStoreddata().put("cfg.CONDITION", JSON.stringify(out));
}
var REWARD_LAYOUT = {RX:110,LIST_X:40,ROUND_X:90,GROUP_X:42,BTN_W:20,TXT_W:80,TXT_OFF:-4,GAP_Y:30};
var R_TYPE=0,R_RULE=-1,R_MODE=0,R_KEYI=0,REWARD_SLOTS=8,REWARD_EDIT = null;
function drawReward(g){
  var R = SYS.ID.REWARD;var bx=SYS.BASE.x, by=SYS.BASE.y;
  var ox=SYS.LINE.LEFT+10;var fh=16, lw=120;
  var LX=bx+ox;var LIST_X=LX+REWARD_LAYOUT.LIST_X;
  var ROUND_X = LX+REWARD_LAYOUT.ROUND_X;var ROUND_GAP = 26;
  var y=by+SYS.LINE.TOP+12;var rMax=getMaxRound();

  g.addLabel(R.RND_L,"§fBattle Round",LX,y,lw,fh);
  for(var i=0;i<rMax;i++) g.addButton(R.RND_B+i,D_R===i?"§a["+i+"]":"§f["+i+"]",ROUND_X+i*ROUND_GAP,y,24,fh);
  y+=30;
  g.addLabel(R.MODE_L,"§fReward Mode",LX,y,lw,fh);
  g.addButton(R.MODE_B,R_MODE===0?"§aALL":"§bRANDOM",LIST_X+50,y,48,fh);
  y+=30;

  g.addLabel(R.LIST_L,"§fRewards",LX,y,lw,fh);
  y+=fh;
  for(var s=0;s<REWARD_SLOTS;s++){
    g.addLabel(R.LIST_LB+s*2,"§7<empty>",LIST_X,y,120,fh);
    g.addTexturedButton(R.LIST_B+s*2,"",LIST_X,y,40,fh,SYS.BTN.TEX);
    y+=fh;
  }
  y+=8;
  g.addButton(R.ADD,"§a+",LIST_X,y,24,fh);
  g.addButton(R.DEL,"§c-",LIST_X+26,y,24,fh);
  g.update()

}
function reRewEdit(g){
  var R=SYS.ID.REWARD,bx=SYS.BASE.x,by=SYS.BASE.y,ox=SYS.LINE.LEFT+10,fh=16;
  var RX=bx+ox+REWARD_LAYOUT.RX,GX=RX+REWARD_LAYOUT.GROUP_X;
  var BTN_W=REWARD_LAYOUT.BTN_W,TXT_W=REWARD_LAYOUT.TXT_W,GROUP_W=BTN_W+TXT_W+BTN_W;
  var y=by+SYS.LINE.TOP+12+60;

  rm(g,R.TYPE_L);rm(g,R.TYPE_PREV);rm(g,R.TYPE_TXT);rm(g,R.TYPE_NEXT);
  rm(g,R.KEY_L);rm(g,R.KEY_PREV);rm(g,R.KEY_TXT);rm(g,R.KEY_NEXT);rm(g,R.KEY_TF);
  rm(g,R.VAL_L);rm(g,R.VAL_TF);rm(g,R.OK)

  if(R_TYPE<0)R_TYPE=0;if(R_TYPE>=REWARD_META.length)R_TYPE=0;
  var meta=REWARD_META[R_TYPE];

  g.addLabel(R.TYPE_L,"§fType",RX,y,40,fh);
  g.addButton(R.TYPE_PREV,"§7◀",GX,y,BTN_W,fh);
  g.addLabel(R.TYPE_TXT,"§f"+meta.name,GX+BTN_W+REWARD_LAYOUT.TXT_OFF,y,TXT_W,fh).setCentered(true);
  g.addButton(R.TYPE_NEXT,"§7▶",GX+BTN_W+TXT_W,y,BTN_W,fh);
  y+=REWARD_LAYOUT.GAP_Y;

  if(meta.key){
    g.addLabel(R.KEY_L,"§fKey",RX,y,40,fh);
    if(meta.name==="faction"){
      var list=getFactionList();
      if(!list||!list.length){g.addTextField(R.KEY_TF,GX,y-2,GROUP_W,fh);}
      else{
        if(R_KEYI<0)R_KEYI=0;if(R_KEYI>=list.length)R_KEYI=0;
        g.addButton(R.KEY_PREV,"§7◀",GX,y,BTN_W,fh);
        g.addLabel(R.KEY_TXT,"§f"+list[R_KEYI],GX+BTN_W+REWARD_LAYOUT.TXT_OFF,y,TXT_W,fh).setCentered(true);
        g.addButton(R.KEY_NEXT,"§7▶",GX+BTN_W+TXT_W,y,BTN_W,fh);
      }
    }else g.addTextField(R.KEY_TF,GX,y-2,GROUP_W,fh);
    y+=REWARD_LAYOUT.GAP_Y;
  }

  if(meta.val){
    g.addLabel(R.VAL_L,"§fVal",RX,y,40,fh);
    g.addTextField(R.VAL_TF,GX,y-2,GROUP_W,fh);
    y+=REWARD_LAYOUT.GAP_Y;
  }
  g.addButton(R.OK,"§a✓",GX+GROUP_W+6,y-REWARD_LAYOUT.GAP_Y-2,16,fh);
}
function handleReward(p,g,id){
  var R=SYS.ID.REWARD,cfg=loadRewardCfg(),key="round_"+D_R;
  if(!cfg[key]) cfg[key]={mode:0,rewards:[]};
  var data=cfg[key],list=data.rewards,rMax=getMaxRound();

  if(id>=R.RND_B&&id<R.RND_B+rMax){
    D_R=id-R.RND_B;R_RULE=-1;REWARD_EDIT=null;
    for(var i=0;i<rMax;i++){var b=g.getComponent(R.RND_B+i);if(b)b.setLabel(D_R===i?"§a["+i+"]":"§f["+i+"]");}
    applyPreview(g,"REWARD");
    g.update();return true;
  }
  for(var s=0;s<REWARD_SLOTS;s++){
    if(id===R.LIST_B+s*2){
      R_RULE=s;
      var r=list[s];
      REWARD_EDIT=r?{type:r.type,key:r.key,val:r.val}:{type:0,key:"",val:null};
      R_TYPE=REWARD_EDIT.type;R_KEYI=0;
      reRewEdit(g);
      addreDetail(g,REWARD_EDIT);
      applyPreview(g,"REWARD");
      g.update();return true;
    }
  }
  if(id===R.ADD){
    list.push({type:0,key:"",val:null});
    R_RULE=list.length-1;
    REWARD_EDIT={type:0,key:"",val:null};
    saveRewardCfg(cfg);
    applyPreview(g,"REWARD");
    reRewEdit(g);
    g.update();return true;
  }
  if(id===R.DEL){
    if(R_RULE>=0&&R_RULE<list.length) list.splice(R_RULE,1);
    else if(list.length>0) list.pop();
    R_RULE=-1;REWARD_EDIT=null;
    saveRewardCfg(cfg);
    applyPreview(g,"REWARD");
    reRewEdit(g);
    g.update();return true;
  }
  if(id===R.TYPE_PREV||id===R.TYPE_NEXT){
    if(!REWARD_EDIT) return true;
    REWARD_EDIT.type=(REWARD_EDIT.type+(id===R.TYPE_NEXT?1:-1)+REWARD_META.length)%REWARD_META.length;
    REWARD_EDIT.key="";REWARD_EDIT.val=null;R_TYPE=REWARD_EDIT.type;
    var tl=g.getComponent(R.TYPE_TXT);if(tl) tl.setText("§f"+REWARD_META[R_TYPE].name);
    reRewEdit(g);
    addreDetail(g,REWARD_EDIT);
    g.update();return true;
  }
  if(id===R.KEY_PREV||id===R.KEY_NEXT){
    if(!REWARD_EDIT) return true;
    var meta=REWARD_META[REWARD_EDIT.type];
    if(meta.name!=="faction") return true;
    var fs=getFactionList();if(!fs||!fs.length) return true;
    var idx=fs.indexOf(String(REWARD_EDIT.key||""));if(idx<0) idx=0;
    idx=(idx+(id===R.KEY_NEXT?1:-1)+fs.length)%fs.length;
    REWARD_EDIT.key=fs[idx];R_KEYI=idx;
    var lab=g.getComponent(R.KEY_TXT);if(lab) lab.setText("§f"+fs[idx]);
    g.update();return true;
  }
  if(id===R.OK){
    if(R_RULE<0||!REWARD_EDIT) return true;
    var meta=REWARD_META[REWARD_EDIT.type],R2=SYS.ID.REWARD;

    if(meta.key){
      if(meta.name==="faction"){
        var fs=getFactionList();
        if(fs&&fs.length) REWARD_EDIT.key=fs[R_KEYI]||"";
      }else{
        var tf=g.getComponent(R2.KEY_TF);
        REWARD_EDIT.key=tf?stripColor(tf.getText()+"").trim():"";
      }
    }else REWARD_EDIT.key="";

    if(meta.val){
      var vf=g.getComponent(R2.VAL_TF),raw=vf?stripColor(vf.getText()+"").trim():"";
      if(meta.val==="int"){
        if(!/^-?\d+$/.test(raw)){ if(vf)vf.setText(""); addreDetail(g,r); g.update(); return true; }
        var num=parseInt(raw,10);
        REWARD_EDIT.val=num;
      }else REWARD_EDIT.val=(raw===""?null:raw);
    }else REWARD_EDIT.val=null;

    while(list.length<=R_RULE) list.push({type:0,key:"",val:null});
    var r=list[R_RULE]; r.type=REWARD_EDIT.type; r.key=REWARD_EDIT.key; r.val=REWARD_EDIT.val;
    saveRewardCfg(cfg); applyPreview(g,"REWARD"); reRewEdit(g); addreDetail(g,r); g.update(); return true;
  }
  if(id===R.MODE_B){
    data.mode=(data.mode===0?1:0);R_MODE=data.mode;
    var b=g.getComponent(R.MODE_B);if(b)b.setLabel(R_MODE===0?"§aALL":"§bRANDOM");
    saveRewardCfg(cfg);
    applyPreview(g,"REWARD");
    g.update();return true;
  }
  return true;
}
function addreDetail(g,r){
  if(!r) return; R_TYPE=r.type!=null?r.type:0;
  var meta=REWARD_META[R_TYPE],R=SYS.ID.REWARD;
  if(meta.key){
    if(meta.name==="faction"){
      var fs=getFactionList();
      if(fs&&fs.length){
        var kk=normRewardKey(r.key),idx=fs.indexOf(kk); if(idx<0) idx=0; R_KEYI=idx;
        var lab=g.getComponent(R.KEY_TXT); if(lab) lab.setText("§f"+fs[idx]);
      }
    }else{ var tf=g.getComponent(R.KEY_TF); if(tf) tf.setText(normRewardKey(r.key)); }
  }
  var vf=g.getComponent(R.VAL_TF); if(vf) vf.setText(r.val!=null?String(r.val):"");
}
function saveRewardCfg(cfg){
  var out={};

  for(var rk in cfg){
    var round=cfg[rk];
    if(!round) continue;
    var o={ mode: round.mode||0, rewards: [] };
    var arr = round.rewards || [];
    for(var i=0;i<arr.length;i++){
      var r=arr[i];
      if(!r) continue;
      var m=REWARD_META[r.type];
      if(!m) continue;
      var it={type: m.name,op: m.op && m.op[r.op] ? m.op[r.op] : r.op  };
      if(m.key) it.key = r.key || "";
      if(m.val) it.val = r.val!=null ? r.val : null;
      o.rewards.push(it);
    }
    out[rk]=o;
  }
  trainer.getStoreddata().put("cfg.REWARD", JSON.stringify(out));
}
function loadRewardCfg(){
  var raw=trainer.getStoreddata().get("cfg.REWARD"); if(!raw) return {};
  var src=JSON.parse(raw),out={};
  for(var rk in src){
    var rr=src[rk]; if(!rr||!rr.rewards) continue;
    out[rk]={mode:rr.mode||0,rewards:[]};
    for(var i=0;i<rr.rewards.length;i++){
      var e=rr.rewards[i]; if(!e) continue;
      var ti=-1; for(var j=0;j<REWARD_META.length;j++) if(REWARD_META[j].name===e.type){ti=j;break;}
      if(ti<0) continue;
      out[rk].rewards.push({type:ti,key:normRewardKey(e.key),val:e.val!=null?e.val:null});
    }
  }
  return out;
}
function drawSound(g){
  var bx=SYS.BASE.x,by=SYS.BASE.y;
  var ox=SYS.LINE.LEFT+10,fx=90;
  var y=by+SYS.LINE.TOP+12;
  var fy=-2,gy=30,lw=120,fw=100,fh=16;
  var bx2=fx+fw+4;
  var bx3=bx2+18;

  var S=SYS.ID.SOUND;
  g.addLabel(S.PRE_L,"§fPre Sound",bx+ox,y,lw,fh);
  g.addTextField(S.PRE_ID,bx+ox+fx,y+fy,fw,fh);
  g.addButton(S.TEST_PRE,"§b▶",bx+ox+bx2,y+fy,16,fh);
  g.addButton(S.STOP_PRE,"§c■",bx+ox+bx2+18,y+fy,16,fh);
  g.addButton(S.PRE_OK,"§a✓",bx+ox+bx3+18,y+fy,16,fh);
  y+=gy;
  g.addLabel(S.PRE_VOL_L,"§fVolume",bx+ox,y,lw,fh);
  g.addTextField(S.PRE_VOL,bx+ox+fx,y+fy,fw,fh);
  y+=gy;
  g.addLabel(S.PRE_PITCH_L,"§fPitch",bx+ox,y,lw,fh);
  g.addTextField(S.PRE_PITCH,bx+ox+fx,y+fy,fw,fh);
  y+=gy+6;
  g.addLabel(S.START_L,"§fStart Sound",bx+ox,y,lw,fh);
  g.addTextField(S.START_ID,bx+ox+fx,y+fy,fw,fh);
  g.addButton(S.TEST_START,"§b▶",bx+ox+bx2,y+fy,16,fh);
  g.addButton(S.STOP_START,"§c■",bx+ox+bx2+18,y+fy,16,fh);
  g.addButton(S.START_OK,"§a✓",bx+ox+bx3+18,y+fy,16,fh);
  y+=gy;
  g.addLabel(S.START_VOL_L,"§fVolume",bx+ox,y,lw,fh);
  g.addTextField(S.START_VOL,bx+ox+fx,y+fy,fw,fh);
  y+=gy;
  g.addLabel(S.START_PITCH_L,"§fPitch",bx+ox,y,lw,fh);
  g.addTextField(S.START_PITCH,bx+ox+fx,y+fy,fw,fh);
}
function applySound(g,n){
  var S=SYS.ID.SOUND,cfg=loadCfg("cfg.SOUND")||{};
  var p=cfg.pre||{},s=cfg.start||{};

  if(g.getComponent(S.PRE_ID))g.getComponent(S.PRE_ID).setText(p.id||"");
  if(g.getComponent(S.PRE_VOL))g.getComponent(S.PRE_VOL).setText(String(p.vol!=null?p.vol:1));
  if(g.getComponent(S.PRE_PITCH))g.getComponent(S.PRE_PITCH).setText(String(p.pitch!=null?p.pitch:1));

  if(g.getComponent(S.START_ID))g.getComponent(S.START_ID).setText(s.id||"");
  if(g.getComponent(S.START_VOL))g.getComponent(S.START_VOL).setText(String(s.vol!=null?s.vol:1));
  if(g.getComponent(S.START_PITCH))g.getComponent(S.START_PITCH).setText(String(s.pitch!=null?s.pitch:1));

  g.update();
}
function handleSound(p,g,id){
  var S=SYS.ID.SOUND;
  var cfg=loadCfg("cfg.SOUND")||{};
  if(!cfg.pre)cfg.pre={id:"",vol:1,pitch:1};
  if(!cfg.start)cfg.start={id:"",vol:1,pitch:1};

  if(id===S.TEST_PRE){
    var tf=g.getComponent(S.PRE_ID);
    var tv=g.getComponent(S.PRE_VOL);
    var tp=g.getComponent(S.PRE_PITCH);

    var sid=tf?stripColor(tf.getText()+"").trim():"";
    var vol=tv?(parseFloat(tv.getText())||1):1;
    var pit=tp?(parseFloat(tp.getText())||1):1;

    if(sid) p.playSound(sid,vol,pit);
    return true;
  }
  if(id===S.TEST_START){
    var tf=g.getComponent(S.START_ID);
    var tv=g.getComponent(S.START_VOL);
    var tp=g.getComponent(S.START_PITCH);

    var sid=tf?stripColor(tf.getText()+"").trim():"";
    var vol=tv?(parseFloat(tv.getText())||1):1;
    var pit=tp?(parseFloat(tp.getText())||1):1;

    if(sid) p.playSound(sid,vol,pit);
    return true;
  }
  if(id===S.PRE_OK){
    var idf=g.getComponent(S.PRE_ID);
    var vf=g.getComponent(S.PRE_VOL);
    var pf=g.getComponent(S.PRE_PITCH);

    cfg.pre.id=idf?stripColor(idf.getText()+"").trim():"";
    cfg.pre.vol=vf?(parseFloat(stripColor(vf.getText()+""))||1):1;
    cfg.pre.pitch=pf?(parseFloat(stripColor(pf.getText()+""))||1):1;

    trainer.getStoreddata().put("cfg.SOUND",JSON.stringify(cfg));
    return true;
  }

  if(id===S.START_OK){
    var idf=g.getComponent(S.START_ID);
    var vf=g.getComponent(S.START_VOL);
    var pf=g.getComponent(S.START_PITCH);

    cfg.start.id=idf?stripColor(idf.getText()+"").trim():"";
    cfg.start.vol=vf?(parseFloat(stripColor(vf.getText()+""))||1):1;
    cfg.start.pitch=pf?(parseFloat(stripColor(pf.getText()+""))||1):1;

    trainer.getStoreddata().put("cfg.SOUND",JSON.stringify(cfg));
    return true;
  }
  if(id===S.STOP_PRE){
    var tf=g.getComponent(S.PRE_ID),sid=tf?stripColor(tf.getText()+"").trim():"";
    if(sid) trainer.executeCommand("stopsound "+p.getName()+" * "+sid);
    return true;
  }
  if(id===S.STOP_START){
    var tf=g.getComponent(S.START_ID),sid=tf?stripColor(tf.getText()+"").trim():"";
    if(sid) trainer.executeCommand("stopsound "+p.getName()+" * "+sid);
    return true;
  }
  return true;
}
function clearCat(g,key){var id=SYS.ID[key];if(!id) return;for(var i=id.BASE;i<id.END;i++) g.removeComponent(i);}
function onField(g,id,base,FIELD,cat){
  var d=id-base; 
  if(d<0) return;
  var row=Math.floor(d/3),type=d%3,def=FIELD[row];
  if(!def) return;
  if(def.type==="bool"){
    if(type===2) return;
    var b=g.getComponent(id);
    if(!b) return;
    var nv=b.getLabel().indexOf("true")===-1;
    b.setLabel(nv?"§atrue":"§cfalse");
    if(cat==="DETAIL"){saveDetail(g,trainer,def.k,nv);}
    else{saveField(trainer,cat,def.k,nv);}
    return;
  }
  if(type!==2) return;
  var tf=g.getComponent(id-1);
  if(!tf) return;
  var v=filterValue(def.type,tf.getText(),def);
  if(v===null) { applySave(g,trainer,cat,base,FIELD);return;}
  if(cat==="DETAIL"){saveDetail(g,trainer,def.k,v);}
  else{saveField(trainer,cat,def.k,v);}
}
function filterValue(type,raw,opt){
  if(raw==null) return null;
  raw=stripColor(raw+"");
  if(type==="bool") return raw.indexOf("true")!==-1;
  if(type==="int"){
    var v=parseInt(raw,10);
    if(isNaN(v)) return null;
    if(opt&&opt.min!=null&&v<opt.min) return null;
    if(opt&&opt.max!=null&&v>opt.max) return null;
    return v;
  }
  if(type==="float"){
    var v=parseFloat(raw);
    if(isNaN(v)) return null;
    if(opt&&opt.min!=null&&v<opt.min) return null;
    if(opt&&opt.max!=null&&v>opt.max) return null;
    return v;
  }
  return raw;
}
function loadCfg(key){var raw=trainer.getStoreddata().get(key);return raw?JSON.parse(raw):{};}
function fieldLabel(k){return "§f"+k.replace(/([A-Z])/g," $1").replace(/^./,function(c){return c.toUpperCase();});}
function stripColor(s){return s?s.replace(/§./g,""):s;}
function setPath(p){if(!p) return "";return stripColor(String(p)).replace(/\\/g,"/").trim();}
function getEXList(path){
  if(!path) return [];
  var dir=new File(String(path));
  if(!dir.exists()) dir.mkdirs();
  if(!dir.isDirectory()) return [];
  var files=dir.listFiles(),list=[];
  if(files){for(var i=0;i<files.length;i++){var f=files[i],n=f.getName();if(f.isFile()&&n.endsWith(".json")) list.push(n.replace(".json",""));}}
  return list;
}
function saveField(n,cat,k,v){var key="cfg."+cat,o=loadCfg(key);o[k]=v;n.getStoreddata().put(key,JSON.stringify(o));}
function applySave(g,n,cat,base,FIELD){
  var cfg=loadCfg("cfg."+cat);
  for(var i in FIELD){
    var def=FIELD[i],row=parseInt(i,10),v=(cfg[def.k]!=null ? cfg[def.k] : def.df);
    if(v==null) continue;
    if(def.type==="bool"){var b=g.getComponent(base + row*3 + 1);if(b && b.setLabel) b.setLabel(v?"§atrue":"§cfalse");
    }else{var tf=g.getComponent(base + row*3 + 1);if(tf && tf.setText) tf.setText(String(v));}
  }
}
function getMaxRound(){
  var cfg=loadCfg("cfg.BATTLE");
  if(!cfg.rematchEnable) return 1;        
  var m=parseInt(cfg.rematchMax,10);
  if(isNaN(m) || m<0) m=0;
  return 1 + m; 
}
function applyPreview(g, kind){
  if(kind==="REWARD"){
    var R=SYS.ID.REWARD,cfg=loadRewardCfg(),data=cfg["round_"+D_R]||{rewards:[]},list=data.rewards||[];
    for(var s=0;s<REWARD_SLOTS;s++){
      var lb=g.getComponent(R.LIST_LB+s*2);
      if(!lb) continue;
      lb.setText(!list[s]? (s===R_RULE?"§a<empty>":"§7<empty>"): ((s===R_RULE?"§a":"§f")+"SET ["+(s+1)+"]"));
    }
    g.update()
    return;
  }
  if(kind==="CONDITION"){
    var C=SYS.ID.CONDITION,cfg=loadCondCfg(),data=cfg["round_"+D_R]||{rules:[]},rules=data.rules||[];
    for(var s=0;s<COND_RULE_SLOTS;s++){
      var lb=g.getComponent(C.RULE_LB+s*2);
      if(!lb) continue;
      lb.setText(!rules[s]? (s===C_RULE?"§a<empty>":"§7<empty>"): ((s===C_RULE?"§a":"§f")+"SET ["+(s+1)+"]"));
    }
    g.update()
  }
}
function normRewardKey(k){
  if(k==null) return "";
  if(typeof k==="object"){
    var v=(k.value!=null?String(k.value):"");
    var kind=(k.kind!=null?String(k.kind):"");
    return (kind==="tag" && v && v.charAt(0)!=="#") ? "#"+v : v;
  }
  return String(k);
}
function getRoundKey(r){ return "round_"+r; }
function dfHover(v){if(v==null) return "";return " §8◦ §7Default: "+v;}
function customGuiClosed(e){
  var p=e.player,gid=e.gui.getID();
  if(gid==SYS.GUI_ID) trainer.reset()}
function callCFG(n){
  var sd=n.getStoreddata();
  function j(k,d){var raw=sd.get(k);return raw?JSON.parse(raw):d;}
  return{BASIC:j("cfg.BASIC",{}),DETECTION:j("cfg.DETECTION",{}),BATTLE:j("cfg.BATTLE",{}),DETAIL:j("cfg.DETAIL",{}),CONDITION:j("cfg.CONDITION",{}),REWARD:j("cfg.REWARD",{}),POSITION:j("cfg.POSITION",{}),SOUND:j("cfg.SOUND",{}),EXTERNAL:j("cfg.EXTERNAL",{})};
}
