
var API = Java.type("noppes.npcs.api.NpcAPI").Instance();

var KEY = "leaderData";
var GID = 51;
var ADMINS = ["Great_dochi","jerry"];

function chat(e){
    var p = e.player;
    var msg = (""+e.message).trim();
    if(msg === "!leader"){
        e.setCanceled(true);
        if(!isAdmin(p)){
            p.message("§cYou don’t have permission to use this command.");
            return;
        }
        openMain(p);
    }
}

function isAdmin(p){
    var name = p.getName();
    for(var i=0;i<ADMINS.length;i++){
        if(ADMINS[i].equalsIgnoreCase(name)) return true;
    }
    return false;
}
function openMain(p){
    var w = p.getWorld();
    var gui = API.createCustomGui(GID, 240, 180, false, p);
    gui.addLabel(1, "§fLeader Data Manager", 8, 6, 150, 10);

    var players = w.getAllPlayers();
    var y = 24;
    for(var i=0;i<players.length;i++){
        var pl = players[i];
        var name = pl.getName();
        var hasData = pl.getStoreddata().has(KEY);
        var status = hasData ? "§aHAS" : "§7NONE";

        gui.addLabel(100+i, "§e"+name, 10, y, 80, 12);
        gui.addLabel(300+i, status, 95, y, 40, 12);
        gui.addButton(200+i, "Delete", 140, y-2, 80, 16);
        y += 18;
    }

    p.showCustomGui(gui);
}
function customGuiButton(e){
    var p = e.player;
    var id = e.buttonId;
    if(e.gui.getID() != GID) return;

    if(id >= 200){
        var index = id - 200;
        var w = p.getWorld();
        var players = w.getAllPlayers();
        if(index < 0 || index >= players.length) return;

        var tgt = players[index];
        var psd = tgt.getStoreddata();

        if(psd.has(KEY)){
            psd.remove(KEY);
            p.message("§a[✓] Deleted leader_data from §e" + tgt.getName());
            p.playSound("minecraft:entity.experience_orb.pickup", 1, 1);
        } else {
            p.message("§7[!] "+tgt.getName()+" has no leader_data.");
            p.playSound("minecraft:block.anvil.land", 0.6, 1);
        }
        openMain(p);
    }
}
