var RANGE = 10;
var TARGET = "minecraft:air";
function damaged(e){e.damage = 0}
function interact(e){
  var n = e.npc,w=n.getWorld();
  var ents = w.getNearbyEntities(n.getPos(), RANGE, -1);
  var target = null;
    for (var i=0;i<ents.length;i++){
      var et = ents[i];
      if (et.getTypeName() != "minecraft:block_display") continue;
      var bs = et.getEntityNbt().getCompound("block_state");
      if (!bs) continue;
      if (bs.getString("Name") == TARGET){target = et;break;}
    }
    if (!target){return;}
    n.setMount(target); // NPC → block_display mounted
}