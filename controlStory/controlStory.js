var CFG={DIR:"west",PUSH_Y:0.2};
var DF={
  MODE:{
    type:"char",
    ui:{prevBtn:{x:328,y:185},nextBtn:{x:388,y:185},pageLabel:{x:360,y:190}},
    sentence:{gapTick:20},
    char:{gapTick:10,charsPerStep:2,typeTick:1}
  },
  TEXT:{
    text:[
      "§fYou cannot leave yet.",
      "§fVisit the Professor first."
    ],
    lines:5,
    ui:{labelX:20,labelY:12,lineGap:12}
  },
  NPC:{
    on:"true",
    follow:"false",
    rot:-45,
    scale:2,
    pos:{x:-152,y:290},
    skin:"customnpcs:textures/entity/humanmale/doctorsteve.png"
  },
  ASSET:{
    texture:"minecraft:textures/block/gray_concrete.png",
    rect:{x:-140,y:210,w:550,h:80,tx:0,ty:0}
  }
};
var API=Java.type("noppes.npcs.api.NpcAPI").Instance();
var Cobblemon=Java.type("com.cobblemon.mod.common.Cobblemon").INSTANCE;
var GUI_ID=950,TICK=951;
var PLAYER=null,SIM=null,GUI=null,currentNpc=null,BLOCK=null;
var dx=0,dz=0;
function init(e){setDir();e.block.setModel("minecraft:barrier");e.block.setIsPassible(true);}
function hasPokemon(p){var party=Cobblemon.storage.getParty(p.getMCEntity());if(!party) return false;return party.get(0)!=null;}
function collide(e){
  var p=e.entity;
  if(!p||p.getType()!=1) return;
  if(hasPokemon(p)) return;
  if(!e.block.timers.has(1)){
    BLOCK=e.block;
    e.block.timers.forceStart(1,20,false);
    p.setMotionX(dx);p.setMotionY(CFG.PUSH_Y);p.setMotionZ(dz);
    openDialogue(p,e.block.getWorld());
  }
}
function openDialogue(p,w){
  PLAYER=p;
  currentNpc=w.createEntity("customnpcs:customnpc");
  currentNpc.getDisplay().setSkinTexture(DF.NPC.skin);
  SIM={page:0,line:0,char:0,lines:[],dlg:DF.TEXT.text,max:Math.max(1,DF.TEXT.lines),typing:false};
  GUI=API.createCustomGui(GUI_ID,256,256,false,p);
  draw();
  p.showCustomGui(GUI);
  startPage(0);
}
function startPage(page){
  SIM.page=page;
  SIM.lines=[];
  SIM.line=0;
  SIM.char=0;
  if(DF.MODE.type==="page"){fullPage();return;}
  SIM.typing=true;
  if(BLOCK) BLOCK.timers.forceStart(TICK,DF.MODE.char.typeTick,false);
}
function fullPage(){
  var out=[],base=SIM.page*SIM.max;
  for(var i=0;i<SIM.max;i++){var l=SIM.dlg[base+i];if(l==null) break;out.push(l);}
  SIM.lines=out;
  SIM.typing=false;
  update();
}
function timer(e){
  if(e.id!==TICK||!SIM||!SIM.typing) return;

  var idx=SIM.page*SIM.max+SIM.line;
  var text=SIM.dlg[idx];
  if(text==null){SIM.typing=false;return;}

  if(DF.MODE.type==="char"){
    var cps=Math.max(1,DF.MODE.char.charsPerStep||1);
    var cur=SIM.lines[SIM.line]||"";
    for(var i=0;i<cps&&SIM.char<text.length;i++){cur+=text.charAt(SIM.char++);}
    SIM.lines[SIM.line]=cur;
    if(SIM.char>=text.length){
      SIM.char=0;
      SIM.line++;
      if(SIM.line>=SIM.max){SIM.typing=false;return;}
      if(DF.MODE.char.gapTick>0){BLOCK.timers.forceStart(TICK,DF.MODE.char.gapTick,false);update();return;}
    }
    update();
    BLOCK.timers.forceStart(TICK,DF.MODE.char.typeTick,false);
    return;
  }
  if(DF.MODE.type==="sentence"){
    SIM.lines.push(text);
    SIM.line++;
    if(SIM.line>=SIM.max){SIM.typing=false;update();return;}
    update();
    BLOCK.timers.forceStart(TICK,Math.max(1,DF.MODE.sentence.gapTick||1),false);
    return;
  }
  var cur=SIM.lines[SIM.line]||"";
  cur+=text.charAt(SIM.char++);
  SIM.lines[SIM.line]=cur;
  if(SIM.char>=text.length){
    SIM.char=0;
    SIM.line++;
    if(SIM.line>=SIM.max){SIM.typing=false;update();return;}
  }
  update();
  BLOCK.timers.forceStart(TICK,DF.MODE.char.typeTick,false);
}
function update(){if(!GUI) return;clear();draw();GUI.update();}
function draw(){
  if(DF.ASSET.texture) GUI.addTexturedRect(1,DF.ASSET.texture,DF.ASSET.rect.x,DF.ASSET.rect.y,DF.ASSET.rect.w,DF.ASSET.rect.h,DF.ASSET.rect.tx,DF.ASSET.rect.ty);
  if(DF.NPC.on==="true"){
    var ed=GUI.addEntityDisplay(10,DF.NPC.pos.x,DF.NPC.pos.y,currentNpc);
    ed.setRotation(DF.NPC.rot);ed.setScale(DF.NPC.scale);ed.setFollowingCursor(DF.NPC.follow==="true");
  }
  for(var i=0;i<SIM.lines.length;i++){GUI.addLabel(100+i,SIM.lines[i],DF.TEXT.ui.labelX+DF.ASSET.rect.x,DF.TEXT.ui.labelY+DF.ASSET.rect.y+i*DF.TEXT.ui.lineGap,256,12);}
  var total=Math.max(1,Math.ceil(SIM.dlg.length/SIM.max));
  GUI.addButton(2,"<",DF.MODE.ui.prevBtn.x,DF.MODE.ui.prevBtn.y,20,20);
  GUI.addLabel(3,"§f"+(SIM.page+1)+" / "+total,DF.MODE.ui.pageLabel.x,DF.MODE.ui.pageLabel.y,80,16);
  GUI.addButton(4,">",DF.MODE.ui.nextBtn.x,DF.MODE.ui.nextBtn.y,20,20);
}
function clear(){
  GUI.removeComponent(1);GUI.removeComponent(10);GUI.removeComponent(2);GUI.removeComponent(3);GUI.removeComponent(4);
  for(var i=0;i<200;i++) GUI.removeComponent(100+i);
}
function customGuiButton(e){
  if(e.buttonId===4) nextPage();
  if(e.buttonId===2) prevPage();
}
function nextPage(){
  if(SIM.typing){fullPage();return;}
  var maxPage=Math.ceil(SIM.dlg.length/SIM.max)-1;
  if(SIM.page>=maxPage) return;
  startPage(SIM.page+1);
}
function prevPage(){
  if(SIM.typing){fullPage();return;}
  if(SIM.page<=0) return;
  startPage(SIM.page-1);
}
function customGuiClosed(e){
  if(BLOCK) BLOCK.timers.stop(TICK);
  SIM=null;
}
function setDir(){
  if(CFG.DIR==="north"){dx=0;dz=-1;}
  else if(CFG.DIR==="south"){dx=0;dz=1;}
  else if(CFG.DIR==="east"){dx=1;dz=0;}
  else if(CFG.DIR==="west"){dx=-1;dz=0;}
  else{dx=0;dz=0;}
}