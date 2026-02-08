var API=Java.type("noppes.npcs.api.NpcAPI").Instance();
var GUI_ID=201,TICK=901;
var PLAYER=null,TELLER=null,SIM=null;
var ID={PREV:1,NEXT:2,PAGE:3,ENTITY:10,BG:11,TEXT:100};
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
function interact(e){PLAYER=e.player;TELLER=e.npc;startDialogue();}

function startDialogue(){
  var sd=TELLER.getStoreddata();
  var txt=load(sd,"dlg.text",DF.TEXT);
  var mode=load(sd,"dlg.mode",DF.MODE);
  var snd=load(sd,"dlg.sound",DF.SOUND);
  SIM={
    page:0,line:0,char:0,
    lines:[],
    dlg:txt.text.split("\n"),
    max:Math.max(1,txt.lines),
    type:mode.type,
    typing:false
  };
  if(snd.open&&snd.open.id) PLAYER.playSound(snd.open.id,toF(snd.open.vol,1),toF(snd.open.pitch,1));
  var g=API.createCustomGui(GUI_ID,256,256,false,PLAYER);
  draw(g);
  PLAYER.showCustomGui(g);
  startPage(0);
}
function startPage(p){
  SIM.page=p;SIM.lines=[];SIM.line=0;SIM.char=0;
  if(SIM.type==="page"){fullPage();return;}
  SIM.typing=true;
  TELLER.timers.forceStart(TICK,1,false);
  update();
}
function fullPage(){
  var out=[],base=SIM.page*SIM.max;
  for(var i=0;i<SIM.max;i++){var l=SIM.dlg[base+i];if(l==null) break;out.push(l);}
  SIM.lines=out;SIM.line=out.length;SIM.char=0;SIM.typing=false;
  update();
}
function timer(e){
  if(e.id!==TICK||!SIM||!SIM.typing) return;

  var sd=TELLER.getStoreddata();
  var mode=load(sd,"dlg.mode",DF.MODE);
  var snd=load(sd,"dlg.sound",DF.SOUND);

  var idx=SIM.page*SIM.max+SIM.line;
  var text=SIM.dlg[idx];
  if(text==null){SIM.typing=false;return;}
  if(SIM.type==="char"){
    var cps=Math.max(1,mode.char.charsPerStep||1);
    var cur=SIM.lines[SIM.line]||"";
    for(var i=0;i<cps&&SIM.char<text.length;i++){
      cur+=text.charAt(SIM.char++);
      if(snd.char&&snd.char.id) PLAYER.playSound(snd.char.id,snd.char.vol||1,snd.char.pitch||1);
    }
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

  update();
  TELLER.timers.forceStart(TICK,1,false);
}
function nextPage(){
  if(SIM.typing){fullPage();return;}
  var max=Math.ceil(SIM.dlg.length/SIM.max)-1;
  if(SIM.page>=max) return;
  startPage(SIM.page+1);
}
function prevPage(){
  if(SIM.typing){fullPage();return;}
  if(SIM.page<=0) return;
  startPage(SIM.page-1);
}
function update(){
  var g=PLAYER.getCustomGui();
  if(!g||g.getID()!==GUI_ID) return;
  clear(g);
  draw(g);
  g.update();
}
function draw(g){
  var sd=TELLER.getStoreddata();
  var asset=load(sd,"dlg.asset",DF.ASSET);
  var txt=load(sd,"dlg.text",DF.TEXT);
  var mode=load(sd,"dlg.mode",DF.MODE);
  var npc=load(sd,"dlg.npc",DF.NPC);

  if(asset.texture) g.addTexturedRect(ID.BG,asset.texture,asset.rect.x,asset.rect.y,asset.rect.w,asset.rect.h,asset.rect.tx,asset.rect.ty);

  if(npc.on==="true"){
    var ed=g.addEntityDisplay(ID.ENTITY,npc.pos.x,npc.pos.y,TELLER);
    ed.setRotation(npc.rot);ed.setScale(npc.scale);ed.setFollowingCursor(npc.follow==="true");
  }
  var lx=txt.ui.labelX+(asset.rect?asset.rect.x:0);
  var ly=txt.ui.labelY+(asset.rect?asset.rect.y:0);
  for(var i=0;i<SIM.lines.length;i++) g.addLabel(ID.TEXT+i,SIM.lines[i],lx,ly+i*txt.ui.lineGap,256,12);

  var total=Math.max(1,Math.ceil(SIM.dlg.length/SIM.max));
  g.addButton(ID.PREV,"<",mode.ui.prevBtn.x,mode.ui.prevBtn.y,20,20);
  g.addLabel(ID.PAGE,"§f"+(SIM.page+1)+"/"+total,mode.ui.pageLabel.x,mode.ui.pageLabel.y,80,16);
  g.addButton(ID.NEXT,">",mode.ui.nextBtn.x,mode.ui.nextBtn.y,20,20);
}
function clear(g){
  g.removeComponent(ID.PREV);g.removeComponent(ID.NEXT);g.removeComponent(ID.PAGE);
  g.removeComponent(ID.BG);g.removeComponent(ID.ENTITY);
  for(var i=0;i<200;i++) g.removeComponent(ID.TEXT+i);
}
function customGuiButton(e){
  if(e.gui.getID()!==GUI_ID) return;
  if(e.buttonId===ID.NEXT) nextPage();
  if(e.buttonId===ID.PREV) prevPage();
}
function customGuiClosed(e){
  if(e.gui.getID()!==GUI_ID) return;
  SIM=null;
  TELLER.timers.stop(TICK);
}
