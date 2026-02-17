var KIT={
  QUEST:{DATA:"start",DONE_TEXT:"Are you enjoying your journey?"},
  GUI:{ID:940,W:256,H:256},GUI_JOURNEY:{ID:941,W:256,H:256},
  LINE:{TOP_Y:170,BOT_Y:206,MAIN:0xFFB36B9E,SUB:0xFF8A4F15,THICK:2.0,THIN:1.0},
  BASE:{x:0,y:0},
  TYPE:{Grass:0xFF5DBB63,Fire:0xFFE5533D,Water:0xFF4A90E2},
  BALL:{R_BASE:40,B_BASE:50,STEP:85,OFF:{x:20,y:100},ITEM:"cobblemon:poke_ball",BTN_TEX:"customnpcs:textures/gui/invisible.png",SCALE:2.0},
  MODEL:{RID:80,OFF:{x:-30,y:-44},W:32,H:32,SCALE:6.0},
  NAME:{ID:31,y:186},
GEN:{
  IDX_KEY:"gen_idx",
  LABEL:{ID:32,y:58},
  BTN:{L:210,R:211},
  LVL:10,
  LIST:[
    {name:"Kanto Region", color:0xFF6BC6FF, list:[
      {name:"Bulbasaur",type:"Grass"},
      {name:"Charmander",type:"Fire"},
      {name:"Squirtle",type:"Water"}
    ]},
    {name:"Johto Region", color:0xFFC9A24D, list:[
      {name:"Chikorita",type:"Grass"},
      {name:"Cyndaquil",type:"Fire"},
      {name:"Totodile",type:"Water"}
    ]},
    {name:"Hoenn Region", color:0xFF4FB36A, list:[
      {name:"Treecko",type:"Grass"},
      {name:"Torchic",type:"Fire"},
      {name:"Mudkip",type:"Water"}
    ]},
    {name:"Sinnoh Region", color:0xFF7FA7FF, list:[
      {name:"Turtwig",type:"Grass"},
      {name:"Chimchar",type:"Fire"},
      {name:"Piplup",type:"Water"}
    ]},
    {name:"Unova Region", color:0xFF444444, list:[
      {name:"Snivy",type:"Grass"},
      {name:"Tepig",type:"Fire"},
      {name:"Oshawott",type:"Water"}
    ]},
    {name:"Kalos Region", color:0xFFB87CFF, list:[
      {name:"Chespin",type:"Grass"},
      {name:"Fennekin",type:"Fire"},
      {name:"Froakie",type:"Water"}
    ]},
    {name:"Alola Region", color:0xFFFFB347, list:[
      {name:"Rowlet",type:"Grass"},
      {name:"Litten",type:"Fire"},
      {name:"Popplio",type:"Water"}
    ]},
    {name:"Galar Region", color:0xFFFF6F91, list:[
      {name:"Grookey",type:"Grass"},
      {name:"Scorbunny",type:"Fire"},
      {name:"Sobble",type:"Water"}
    ]},
    {name:"Paldea Region", color:0xFF8F5BFF, list:[
      {name:"Sprigatito",type:"Grass"},
      {name:"Fuecoco",type:"Fire"},
      {name:"Quaxly",type:"Water"}
    ]}
  ]
},
  BTN:{YES:200,NO:201},
  TEXT:{INIT:"Oh, I’ve been waiting. Go ahead and choose your Pokémon!"},
  SFX:{OPEN:{id:"cobblemon:gui.click",vol:1.0,pit:0.2},SELECT:{id:"minecraft:entity.player.levelup",vol:1.0,pit:1.0}}
};
var API=Java.type("noppes.npcs.api.NpcAPI").Instance();
var p;
// ===== INTERACT
function interact(e){
  p=e.player;p.tempdata.put("poke_idx",-1);p.tempdata.put(KIT.GEN.IDX_KEY,0);
  if(Checker(p,KIT.QUEST.DATA)==true){
    var g=API.createCustomGui(KIT.GUI_JOURNEY.ID,KIT.GUI_JOURNEY.W,KIT.GUI_JOURNEY.H,false,p);
    g.addColoredLine(10,-1000,KIT.LINE.TOP_Y,1000,KIT.LINE.TOP_Y,KIT.LINE.SUB,KIT.LINE.THIN);
    g.addColoredLine(11,-1000,KIT.LINE.TOP_Y+2,1000,KIT.LINE.TOP_Y+2,KIT.LINE.MAIN,KIT.LINE.THICK);
    g.addColoredLine(12,-1000,KIT.LINE.BOT_Y,1000,KIT.LINE.BOT_Y,KIT.LINE.SUB,KIT.LINE.THIN);
    g.addColoredLine(13,-1000,KIT.LINE.BOT_Y+2,1000,KIT.LINE.BOT_Y+2,KIT.LINE.MAIN,KIT.LINE.THICK);
    g.addLabel(KIT.NAME.ID,KIT.QUEST.DONE_TEXT,0,KIT.NAME.y,256,20).setCentered(true).setColor(0xFFFFFFFF);
    p.showCustomGui(g);return;
  }
  var w=p.world,g=API.createCustomGui(KIT.GUI.ID,KIT.GUI.W,KIT.GUI.H,false,p),gen=KIT.GEN.LIST[0],bs=KIT.BALL.SCALE*15;
  p.playSound(KIT.SFX.OPEN.id,KIT.SFX.OPEN.vol,KIT.SFX.OPEN.pit);
  g.addColoredLine(10,-1000,KIT.LINE.TOP_Y,1000,KIT.LINE.TOP_Y,KIT.LINE.SUB,KIT.LINE.THIN);
  g.addColoredLine(11,-1000,KIT.LINE.TOP_Y+2,1000,KIT.LINE.TOP_Y+2,KIT.LINE.MAIN,KIT.LINE.THICK);
  g.addColoredLine(12,-1000,KIT.LINE.BOT_Y,1000,KIT.LINE.BOT_Y,KIT.LINE.SUB,KIT.LINE.THIN);
  g.addColoredLine(13,-1000,KIT.LINE.BOT_Y+2,1000,KIT.LINE.BOT_Y+2,KIT.LINE.MAIN,KIT.LINE.THICK);
  g.addLabel(KIT.GEN.LABEL.ID,gen.name,0,KIT.GEN.LABEL.y,256,20).setCentered(true).setColor(gen.color);
  g.addButton(KIT.GEN.BTN.L,"<",40,KIT.GEN.LABEL.y,20,20);g.addButton(KIT.GEN.BTN.R,">",196,KIT.GEN.LABEL.y,20,20);
  for(var i=0;i<gen.list.length;i++){
    var x=KIT.BASE.x+KIT.BALL.OFF.x+i*KIT.BALL.STEP,y=KIT.BASE.y+KIT.BALL.OFF.y;
    g.addItemRenderer(KIT.BALL.R_BASE+i,x,y,16,16,w.createItem(KIT.BALL.ITEM,1)).setScale(KIT.BALL.SCALE).setHoverText(gen.list[i].name);
    g.addButton(KIT.BALL.B_BASE+i,"",x,y,bs,bs).setTexture(KIT.BALL.BTN_TEX);
  }
  g.addLabel(KIT.NAME.ID,KIT.TEXT.INIT,0,KIT.NAME.y,256,20).setCentered(true).setColor(0xFFFFFFFF);
  p.showCustomGui(g);
}

// ===== BUTTON
function customGuiButton(e){
  var g=e.gui,w=p.world,id=e.buttonId,genIdx=p.tempdata.get(KIT.GEN.IDX_KEY)||0,gen=KIT.GEN.LIST[genIdx];

  if(id===KIT.GEN.BTN.L||id===KIT.GEN.BTN.R){
    genIdx+=(id===KIT.GEN.BTN.L?-1:1);if(genIdx<0)genIdx=KIT.GEN.LIST.length-1;if(genIdx>=KIT.GEN.LIST.length)genIdx=0;
    p.tempdata.put(KIT.GEN.IDX_KEY,genIdx);gen=KIT.GEN.LIST[genIdx];
    g.getComponent(KIT.GEN.LABEL.ID).setText(gen.name).setColor(gen.color);
    resetSel(g,w,gen);g.update();return;
  }

  if(id===KIT.BTN.YES){
    var sel=p.tempdata.get("poke_idx");if(sel>=0){
      p.playSound(KIT.SFX.SELECT.id,KIT.SFX.SELECT.vol,KIT.SFX.SELECT.pit);
      API.executeCommand(w,"givepokemonother "+p.getName()+" "+gen.list[sel].name.toLowerCase()+" lvl="+KIT.GEN.LVL);
      p.storeddata.put(KIT.QUEST.DATA,"done")
      p.closeGui();
    }return;
  }

  if(id===KIT.BTN.NO){resetSel(g,w,gen);g.update();return;}
  if(id<KIT.BALL.B_BASE||id>=KIT.BALL.B_BASE+gen.list.length) return;
  selectSel(g,w,gen,id-KIT.BALL.B_BASE);
}

// ===== SELECT
function selectSel(g,w,gen,sel){
  p.tempdata.put("poke_idx",sel);
  for(var i=0;i<gen.list.length;i++) g.getComponent(KIT.BALL.R_BASE+i).setStack(w.createItem(KIT.BALL.ITEM,1));
  g.getComponent(KIT.BALL.R_BASE+sel).setStack(w.createItem("minecraft:air",1));
  var mx=KIT.BASE.x+KIT.BALL.OFF.x+sel*KIT.BALL.STEP+KIT.MODEL.OFF.x,my=KIT.BASE.y+KIT.BALL.OFF.y+KIT.MODEL.OFF.y;
  var m=g.getComponent(KIT.MODEL.RID);
  if(!m) (m=g.addItemRenderer(KIT.MODEL.RID,mx,my,KIT.MODEL.W,KIT.MODEL.H,pokeModel(w,gen.list[sel].name.toLowerCase()))).setScale(KIT.MODEL.SCALE);
  else {m.setPos(mx,my);m.setStack(pokeModel(w,gen.list[sel].name.toLowerCase()));}
  g.getComponent(KIT.NAME.ID).setText("Will you choose "+gen.list[sel].name+"?").setColor(KIT.TYPE[gen.list[sel].type]);
  p.playSound("cobblemon:pokemon."+gen.list[sel].name.toLowerCase()+".cry",1.0,1.0);
  if(!g.getComponent(KIT.BTN.YES)){
    g.addButton(KIT.BTN.YES,"YES",60,KIT.LINE.BOT_Y+6,60,20);
    g.addButton(KIT.BTN.NO,"NO",136,KIT.LINE.BOT_Y+6,60,20);
  }
  g.update();
}

// ===== RESET
function resetSel(g,w,gen){
  p.tempdata.put("poke_idx",-1);
  for(var i=0;i<gen.list.length;i++) g.getComponent(KIT.BALL.R_BASE+i).setStack(w.createItem(KIT.BALL.ITEM,1)).setHoverText(gen.list[i].name);
  var m=g.getComponent(KIT.MODEL.RID);if(m)m.setStack(w.createItem("minecraft:air",1));
  g.getComponent(KIT.NAME.ID).setText(KIT.TEXT.INIT).setColor(0xFFFFFFFF);
  if(g.getComponent(KIT.BTN.YES))g.removeComponent(KIT.BTN.YES);
  if(g.getComponent(KIT.BTN.NO))g.removeComponent(KIT.BTN.NO);
}

// ===== MODEL
function pokeModel(w,name){
  return w.createItemFromNbt(API.stringToNbt('{id:"cobblemon:pokemon_model",count:1,components:{"cobblemon:pokemon_item":{species:"cobblemon:'+name+'",aspects:[]}}}'));
}

// ===== FLAG CHECKER
function Checker(p,d){
  if (p.getStoreddata().get(d)=="done") return true;
  else return false;
}
