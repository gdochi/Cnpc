var CFG = {
  guiText: {
      tradeTitle: '§fTrade §a"{want}" §ffor §7"{give}"§f?'   // GUI title message with colors
  },
  // -------------------------------------------------------
  // Required species in player's party (always checked)
  // -------------------------------------------------------
  species: {
    want: "Bellsprout",      // Pokémon player must have
    wantLoc: "Bellsprout",   // local lang
    give: "Onix",        // Pokémon rewarded
    giveLoc: "Onix",     // local lang
    message: "§cHmm… it seems you don't have §e{want} §cwith you."
  },
  // -------------------------------------------------------
  // Faction reputation requirement
  // -------------------------------------------------------
  faction: {
    enabled: true,       // Enable/disable faction check
    name: 3,     // Faction ID(Int)
    min: 1500,            // Required reputation
    message: "§cHmm… your reputation with §6{faction} §cisn't quite enough yet."
  },
  // -------------------------------------------------------
  // Required item in inventory (qualification requirement)
  // -------------------------------------------------------
  item: {
    enabled: true,             
    id: "minecraft:emerald",   // Required item ID
    count: 8,                  // Required amount
    message: "§cIt seems you don't have enough §e{item} §cwith you to qualify for this trade."
  },
  // -------------------------------------------------------
  // Time-of-day restriction(minecraft time)
  // allowedTime codes:
  //    0 = any time
  //    1 = morning (0–5999)
  //    2 = noon    (6000–11999)
  //    3 = night (12000–17999)
  //    4 = midnight   (18000–23999)
  // -------------------------------------------------------
  time: {
    enabled: true,
    allowedTime: 3,
    message: "§eNot right now… §fI only trade during §b{time}§f."
  },
    // -----------------------------------------------------
    // NPC-wide total trade limit
    // -----------------------------------------------------
  limits: {  
    npc: {
      enabled: true,
      key: "trade_global",          // Unique key
      max: 2,                       // Max trades
      onExceed: 0,                  // 0=block, 1=despawn
      message: "§cI'm afraid I can't trade any more today.",

    reset: {
        enabled: true,              // Real-time reset system ON/OFF
        zone: "Asia/Seoul",         // Timezone
        every: 5,                   // Number amount
        unit: "seconds",               // "seconds" | "minutes" | "hours" | "days"
        keyDate: "trade_global_dt", // Last reset timestamp
      }
    }
  },
  // -------------------------------------------------------
  // Reward Command
  // -------------------------------------------------------
  rewardCmd: 'pokegiveother <player> <offer>',
  // -------------------------------------------------------
  // Sounds
  // -------------------------------------------------------
  guiOpen:  { name:"minecraft:entity.item.pickup", vol:1, pit:0.5 },
  tradeDone:{ name:"minecraft:entity.experience_orb.pickup", vol:1, pit:1 },


///////////////////////////////////////////////////////////////////////////////////////////

  guiId:771,
  tex:{path:"customnpcs:textures/gui/invisible.png",u:0,v:0,w:20,h:20},
  w:256,h:256,left:80,top:15,lineH:20,gapY:6,
  cSel:"§a",cDef:"§f",

  itemDef:"cobblemon:slate_ball",     
  itemSel:"cobblemon:poke_ball", 
     
};

var API = Java.type("noppes.npcs.api.NpcAPI").Instance();
var Cobblemon = Java.type("com.cobblemon.mod.common.Cobblemon").INSTANCE;
var LocalDate = Java.type("java.time.LocalDate");
var LocalDateTime = Java.type("java.time.LocalDateTime");
var ZoneId = Java.type("java.time.ZoneId");
var ChronoUnit = Java.type("java.time.temporal.ChronoUnit");

var ID={
  TITLE:1,
  CONFIRM:20,
  CONFIRM_RENDER:40
};

var Trader;
function getParty(p){return Cobblemon.storage.getParty(p.getMCEntity());}
function isWanted(m){ return m!=null && m.getSpecies().getName().equalsIgnoreCase(CFG.species.want);}
function matchingSlots(p){
    var out = [];
    var pt = getParty(p);
    for (var i = 0; i < 6; i++){if (isWanted(pt.get(i))) out.push(i);}
    return out;
}
function headItemByName(w, name){
    return w.createItemFromNbt(API.stringToNbt('{"id":"minecraft:player_head","count":1,"components":{"minecraft:profile":{"name":"'+name+'"}}'));
}
function monInfo(p, sl){
    var m = getParty(p).get(sl);
    if(!m) return "Unknown";
    var name = m.getSpecies().getName();
    var gender = m.getGender().name().toLowerCase(); // male / female / none
    var lvl = m.getLevel();
    var gText = "";      // gender color
    if(gender === "male") gText = " §9♂";       // blue
    else if(gender === "female") gText = " §c♀"; // red
    var levelText = " §aLv." + lvl;  // level (light green)
    return name + gText + levelText;
}
function monNameOnly(p, sl){
    var m = getParty(p).get(sl);
    if(!m) return "Unknown";
    return m.getSpecies().getName();
}
function fmt(msg, map){
    for (var k in map) msg = msg.replace("{"+k+"}", map[k]);
    return msg;
}
function durationInSeconds(unit, amount){
    switch(unit){
        case "seconds": return amount;
        case "minutes": return amount * 60;
        case "hours":   return amount * 3600;
        case "days":    return amount * 86400;
        default: return amount * 86400; // fallback: days
    }
}
function dateUtil(mode, zoneStr, days, dateStr){
    var zone = ZoneId.of(zoneStr);
    var today = LocalDate.now(zone);
    if (mode === "next"){return today.plusDays(days).toString();}
    if (mode === "passed"){
      var target = LocalDate.parse(dateStr);
      return !today.isBefore(target);
    }
    return null;
}
function parseDateOnly(str){
    if(!str) return null;
    try{
      if (str.indexOf('T') > 0){return LocalDateTime.parse(str).toLocalDate();}
      return LocalDate.parse(str); 
    }
    catch(err){return LocalDate.parse(str.substring(0, 10));}
}
function getRemain(zoneStr, lastStr, every, unit){
    var zone = ZoneId.of(zoneStr);
    var now = LocalDateTime.now(zone);
    var last = LocalDateTime.parse(lastStr);

    var needSec = durationInSeconds(unit, every);
    var passedSec = ChronoUnit.SECONDS.between(last, now);

    var left = needSec - passedSec;
    if(left < 0) left = 0;
    var days = Math.floor(left / 86400); left %= 86400;
    var hours = Math.floor(left / 3600); left %= 3600;
    var minutes = Math.floor(left / 60);
    var seconds = left % 60;
    return {
        days: days,
        hours: hours,
        minutes: minutes,
        seconds: seconds
    };
}

function interact(e){
    var p=e.player; 
    Trader = e.npc;

    if(!checkTradeEligible(p, Trader)) return;
    p.getTempdata().put("trade_sel",-1);
    p.playSound(CFG.guiOpen.name, CFG.guiOpen.vol, CFG.guiOpen.pit);
    openTradeGUI(p);
}
function openTradeGUI(p){
  var w = p.getWorld();
  var gui=API.createCustomGui(CFG.guiId,CFG.w,CFG.h,false,p);
  var y=CFG.top+6;

  gui.addEntityDisplay(333, CFG.left-50, 130, Trader).setScale(1.5);

  var titleText = CFG.guiText.tradeTitle
      .replace("{want}", CFG.species.want)
      .replace("{give}", CFG.species.give);
  gui.addLabel(ID.TITLE,'§f' + titleText,CFG.left - 20, y,CFG.w - 20, 18
);
  y+=CFG.lineH+CFG.gapY;

  var sls=matchingSlots(p);
  for(var i=0;i<sls.length;i++){
    var s=sls[i];

    gui.addTexturedButton(60+s,"",CFG.left,y,CFG.tex.w,CFG.tex.h,CFG.tex.path,CFG.tex.u,CFG.tex.v);
    gui.addLabel(80+s,"§f"+CFG.cDef+(s+1)+": "+monInfo(p,s),CFG.left+CFG.tex.w+6,y+2,150,20);
    gui.addItemRenderer(100+s, CFG.left, y-2,20,20, w.createItem(CFG.itemDef,1));

    y+=CFG.tex.h+CFG.gapY;
  }

  p.showCustomGui(gui);
}

var sel
function updateTradeGUI(gui,p){
  var w = p.getWorld(); 
  var sls=matchingSlots(p);

  for(var i=0;i<sls.length;i++){
    var s=sls[i];
    var lab = gui.getComponent(80+s);
    lab.setText((s===sel?CFG.cSel:CFG.cDef)+(s+1)+": "+monInfo(p,s));
    var ir = gui.getComponent(100+s);
    ir.setStack(s===sel? w.createItem(CFG.itemSel,1): w.createItem(CFG.itemDef,1));
  }
  var btn = gui.getComponent(ID.CONFIRM);
  var rnd = gui.getComponent(ID.CONFIRM_RENDER);

  if(sel >= 0){

      var slotBtn = gui.getComponent(60+sel);
      var by = slotBtn.getPosY()-2;
      var bx = CFG.left - 20;

      if(!btn){
          gui.addTexturedButton(ID.CONFIRM,"",bx,by,15,15,CFG.tex.path).setHoverText("Confirm Trade");
          gui.addItemRenderer(ID.CONFIRM_RENDER, bx,by,10,10, headItemByName(w, p.getName()));

      } else {
          btn.setPos(bx,by);
          btn.setEnabled(true);
          rnd.setPos(bx,by);
          rnd.setEnabled(true);
      }
  } else {
      if(btn) btn.setEnabled(false);
      if(rnd) rnd.setEnabled(false);
  }
  gui.update();
}

function doTrade(p){
  p.sendNotification("§fBye §c" + CFG.species.wantLoc,"Welcome §a" + CFG.species.giveLoc + "!",0)
  API.executeCommand(p.getWorld(),'takepokemon "'+p.getName()+'" '+(sel+1));
  var cmd = CFG.rewardCmd;
  if(cmd && cmd !== ""){
      cmd = cmd.replace("<player>", p.getName());
      cmd = cmd.replace("<offer>", CFG.species.give.toLowerCase());
      API.executeCommand(p.getWorld(), cmd);
      addNpcTradeCount(Trader)
  }
  p.playSound(CFG.tradeDone.name, CFG.tradeDone.vol, CFG.tradeDone.pit);
  p.closeGui();
}

function customGuiButton(e){
  var p=e.player,id=e.buttonId;
  if(id===ID.CONFIRM){
    if(sel>=0) doTrade(p);
    return;
  }
  if(id>=60 && id<66){
    sel=id-60;
    updateTradeGUI(e.gui,p);
  }
}
// ------------------------------------------------------------
// Time-of-day → label
// ------------------------------------------------------------
function timeLabel(code){
    switch(code){
        case 1: return "morning";
        case 2: return "noon";
        case 3: return "evening";
        case 4: return "night";
        default: return "now";
    }
}
// ------------------------------------------------------------
// Check if current time is allowed
// ------------------------------------------------------------
function checkTimeAllowed(w){
    var t = w.getTime() % 24000;

    switch(CFG.time.allowedTime){
        case 1: return (t >= 0     && t < 6000);    // morning
        case 2: return (t >= 6000  && t <12000);    // noon
        case 3: return (t >=12000  && t <18000);    // evening
        case 4: return (t >=18000  && t <24000);    // night
        default: return true;
    }
}
// ------------------------------------------------------------
// Player/item check
// ------------------------------------------------------------
function hasEnoughItem(p, id, count){
    var inv = p.getInventory();
    var total = 0;
    for(var i=0;i<inv.getSize();i++){
        var st = inv.getSlot(i);
        if(st && st.getName().equals(id)) total += st.getStackSize();
        if(total >= count) return true;
    }
    return false;
}
// ------------------------------------------------------------
// NPC limit check(count)
// ------------------------------------------------------------
function checkNpcLimit(n){
    if(CFG.limits.npc.enabled !==true) return true;
    var td = n.getStoreddata();
    var key = CFG.limits.npc.key;
    var count = td.get(key) || 0;
    return count < CFG.limits.npc.max;
}
function addNpcTradeCount(n){
    var td = n.getStoreddata();
    var key = CFG.limits.npc.key;
    var count = td.get(key) || 0;
    count++;
    td.put(key, count);
    if(count >= CFG.limits.npc.max){
        var cfg = CFG.limits.npc.reset;
        var now = LocalDateTime.now(ZoneId.of(cfg.zone));
        td.put(cfg.keyDate, now.toString());
    }
    if(count >= CFG.limits.npc.max && CFG.limits.npc.onExceed === 1){
        n.getWorld().spawnParticle("cloud",
            n.x, n.y + 0.5, n.z,
            0.1, 0.3, 0.1, 0.05, 20);
        n.despawn();
    }
}
// ------------------------------------------------------------
// Returns: true = eligible, false = blocked
// ------------------------------------------------------------
function checkTradeEligible(p, n){

    // === NPC limit check ===
    if (CFG.limits.npc.enabled == true && !checkNpcLimit(n)) {
        // Real-time reset path
        if (CFG.limits.npc.reset.enabled == true) {
            var cfg = CFG.limits.npc.reset;
            var sd  = n.getStoreddata();
            var last = sd.get(cfg.keyDate);
            if (last) {
                var r = getRemain(cfg.zone, last, cfg.every, cfg.unit);
                if (r.days===0 && r.hours===0 && r.minutes===0 && r.seconds===0){
                    sd.put(CFG.limits.npc.key, 0);
                } else {

                    p.message(CFG.limits.npc.message);
                    p.message("§eNext reset in: §f" +
                        r.days + "d " + r.hours + "h " + r.minutes + "m " + r.seconds + "s");
                    return false;
                }
            } else {
                sd.put(cfg.keyDate, java.time.LocalDateTime.now(java.time.ZoneId.of(cfg.zone)).toString());
                p.message(CFG.limits.npc.message);
                return false;
            }
        } else {
            p.message(CFG.limits.npc.message);
            return false;
        }
    }
    // 1) Species
    var sls = matchingSlots(p);
    if (sls.length === 0){
        p.message(fmt(CFG.species.message, {want:CFG.species.want}));
        return false;
    }
    // 2) Faction
    if (CFG.faction.enabled==true){
        var fac = p.getFactionPoints(CFG.faction.name);
        if (fac < CFG.faction.min){
            var name = n.getFaction().getName();
            p.message(fmt(CFG.faction.message, {faction:name}));
            return false;
        }
    }
    // 3) Item
    if (CFG.item.enabled==true){
        if (!hasEnoughItem(p, CFG.item.id, CFG.item.count)){
            var iname = CFG.item.id.replace("minecraft:","");
            p.message(fmt(CFG.item.message, {item:iname}));
            return false;
        }
    }
    // 4) Time-of-day
    if (CFG.time.enabled == true){
        if (!checkTimeAllowed(p.getWorld())){
            var label = timeLabel(CFG.time.allowedTime);
            p.message(fmt(CFG.time.message, {time:label}));
            return false;
        }
    }
    return true;
}
