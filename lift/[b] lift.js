var CFG={
  range:30, playerRange:1.5,
  speed:0.15,
  floors:{down:35.1,up:46.1},

  liftName:"lift",
  prepDelay:5,
  model:"natures_spirit:joshua_mosaic",
  sound:{
    call:"minecraft:block.note_block.bell",
    start:"minecraft:block.piston.extend",
    stop:"minecraft:block.piston.contract"
  },
  box:{xPos:1.2,xNeg:2.0,yPos:20.0,yNeg:10.5,zPos:1.5,zNeg:1.5}
};

////////////////////////////////////////////////////////

var API=Java.type("noppes.npcs.api.NpcAPI").Instance();
var T_PREP=200,T_MAIN=201;
function init(e){var b=e.block;if(CFG.model) b.setModel(CFG.model);}
function redstone(e){
  if(e.power!==15) return;

  var b=e.block,w=b.getWorld(),td=b.getTempdata();
  if(td.get("active")) return;
  var lift=findNpc(w,b.getPos());
  if(!lift) return;
  w.playSoundAt(b.getPos(),CFG.sound.call,1,1);

  var ps=w.getNearbyEntities(lift.getPos(),CFG.playerRange,1);
  if(ps&&ps.length) td.put("player",ps[0]);
  else td.remove("player");
  td.put("list",findBlock(w,b.getPos()));
  td.put("lift",lift);td.put("active",true);
  var mid=(CFG.floors.up+CFG.floors.down)/2;
  td.put("dir",lift.y<mid?"up":"down");

  b.timers.forceStart(T_PREP,CFG.prepDelay,false);
}

function timer(e){
  var b=e.block,td=b.getTempdata(),list=td.get("list"),lift=td.get("lift"),p=td.get("player");
  if(!lift||!list){td.clear();return;}
  var sp=CFG.speed,dir=td.get("dir");

  var sp=CFG.speed,dir=td.get("dir");

  if(e.id==T_PREP){
    if(p)p.playSound(CFG.sound.start,1,0.9);
    b.timers.forceStart(T_MAIN,0,true);
    return;
  }
  if(e.id==T_MAIN) {
  if(p&&p.getPos().distanceTo(lift.getPos())<=CFG.playerRange){
    p.setGamemode(3);
    API.executeCommand(b.getWorld(),"/spectate "+lift.getUUID()+" "+p.getName());
  }
  if(dir=="up"){
    for(var i=0;i<list.length;i++) list[i].setPosition(list[i].x,list[i].y+sp,list[i].z);
    lift.setPosition(lift.x,lift.y+sp,lift.z);
    if(lift.y>=CFG.floors.up){
      var df=CFG.floors.up-lift.y;
      for(var i2=0;i2<list.length;i2++) list[i2].setPosition(list[i2].x,list[i2].y+df,list[i2].z);
      lift.setPosition(lift.x,CFG.floors.up,lift.z);
      if(p){p.setGamemode(2);p.playSound(CFG.sound.stop,1,0.2)};td.clear();b.timers.stop(T_MAIN);
    }
  }else{
    for(var k=0;k<list.length;k++) list[k].setPosition(list[k].x,list[k].y-sp,list[k].z);
    lift.setPosition(lift.x,lift.y-sp,lift.z);
    if(lift.y<=CFG.floors.down){
      var df2=CFG.floors.down-lift.y;
      for(var m=0;m<list.length;m++) list[m].setPosition(list[m].x,list[m].y+df2,list[m].z);
      lift.setPosition(lift.x,CFG.floors.down,lift.z);
      if(p){p.setGamemode(2);p.playSound(CFG.sound.stop,1,0.2)}
      td.clear();b.timers.stop(T_MAIN);
    }
  }}
}
function findNpc(w,pos){
  var ents=w.getNearbyEntities(pos,CFG.range,2);
  for(var i=0;i<ents.length;i++) if(ents[i].display.getName()==CFG.liftName) return ents[i];
  return null;
}
function findBlock(w,pos){
  var ents=w.getNearbyEntities(pos,CFG.range,-1),out=[];
  for(var i=0;i<ents.length;i++) if(ents[i].getTypeName()=="minecraft:block_display") out.push(ents[i]);
  return out;
}
function inBox(e,b,c){
  if(e.x>b.x+c.xPos) return false;
  if(e.x<b.x-c.xNeg) return false;
  if(e.y>b.y+c.yPos) return false;
  if(e.y<b.y-c.yNeg) return false;
  if(e.z>b.z+c.zPos) return false;
  if(e.z<b.z-c.zNeg) return false;
  return true;

}
