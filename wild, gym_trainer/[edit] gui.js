// interact -> npc
function interact(e){
  openRevengeGui(e.player);
}

var API = Java.type("noppes.npcs.api.NpcAPI").Instance();
var GID = 32;

// ============ CONFIG ============
var CFG = {
  gui:{ w:500, h:260 },
  pageSize:8,

  // ----- LIST -----
  list:{
    x:10, y:50, step:18,
    noX:20, noY:5,
    chkX:0, chkY:0,
    chkTex:"customnpcs:textures/gui/invisible.png",
    itemOn:"cobblemon:poke_ball",
    itemOff:"cobblemon:slate_ball",
    itemX:1, itemY:1,
    nameBtnX:30, nameBtnY:0,
    nameBtnW:120, nameBtnH:15,
    nameBtnTex:"customnpcs:textures/gui/invisible.png",
    nameX:60,  nameY:5, nameW:110, nameH:15,
    stateX:180, stateY:5, stateW:60, stateH:15
  },

  // ----- NAV / DELETE -----
  page:{ prevX:10, nextX:40, y:210 },
  del:{ x:80, y:210 },

  // ----- DETAIL AREA -----
  detail:{
    anchorX:220,       // base X
    anchorY:40,        // bse Y
    lineH:18,

    // Label / value X offset
    labelXOff:0,
    valueXOff:110,

    // Entity display
    imgOffX:-80,
    imgOffY:0,
    imgW:64, imgH:96,
    imgScale: 1.5,

    // Copy 
    copyX:140, copyY:210, copyW:50, copyH:19,

    labels:{
      name:"Name:",
      pos:"Location:",
      last:"Last Battle:",
      next:"Next Battle:",
      count:"Battles:"
    }
  },

  // ----- SEARCH -----
  search:{ fieldX:10, fieldY:14, btnX:133, btnY:13, resetX:155, resetY:13 },

  // ----- COMPONENT IDS -----
  id:{
    searchField:900, searchBtn:901, resetBtn:902,
    pageLabel:998, pageData:999,

    noBase:700, chkBase:100, renderBase:2000,
    nameBtnBase:200, nameLabBase:300, stateBase:400,

    detailTitle:500,
    detailNameLabel:600, detailPosLabel:601, detailLastLabel:602,
    detailNextLabel:603, detailCountLabel:604,

    detailName:610, detailPos:611, detailLast:612,
    detailNext:613, detailCount:614,

    detailImg:620, copyBtn:630
  }
};

// =====================================================
// UTIL
// =====================================================
function jget(s){ try{ return s ? JSON.parse(s) : {} } catch(e){ return {} } }
function loadRev(p){ return jget(p.getStoreddata().get("trainerData")) }
function saveRev(p,o){ p.getStoreddata().put("trainerData", JSON.stringify(o)) }

function nowFmt(){
  var LDT=Java.type("java.time.LocalDateTime"),
      ZID=Java.type("java.time.ZoneId"),
      FMT=Java.type("java.time.format.DateTimeFormatter");
  return LDT.now(ZID.of("Asia/Seoul")).format(FMT.ofPattern("yyyy-MM-dd HH:mm"));
}
function pad3(n){ return ("000"+n).slice(-3) }
function fullIdx(n){ var a=[]; for(var i=0;i<n;i++) a.push(i); return a }


// =====================================================
// OPEN GUI
// =====================================================
function openRevengeGui(p){
  var g = API.createCustomGui(GID, CFG.gui.w, CFG.gui.h, false, p);

  // Search
  g.addTextField(CFG.id.searchField, CFG.search.fieldX, CFG.search.fieldY, 120, 15);
  g.addButton(CFG.id.searchBtn, "🔍", CFG.search.btnX, CFG.search.btnY, 20, 17);
  g.addButton(CFG.id.resetBtn,"↺", CFG.search.resetX, CFG.search.resetY, 20, 17);

  // Page + Delete
  g.addButton(10, "◀", CFG.page.prevX, CFG.page.y, 25, 20);
  g.addButton(11, "🗙", CFG.del.x, CFG.del.y, 20, 20);
  g.addButton(12, "▶", CFG.page.nextX, CFG.page.y, 25, 20);

  g.addLabel(CFG.id.pageLabel, "Revenge List", 10, 32, 260, 15);
  g.addLabel(CFG.id.pageData, "0", 999,999, 0,0);


  // ========== LIST UI ==========
  for(var i=0;i<CFG.pageSize;i++){
    var bx=CFG.list.x, by=CFG.list.y + i*CFG.list.step;

    g.addLabel(CFG.id.noBase+i, "", bx+CFG.list.noX, by+CFG.list.noY, 38,15);

    g.addTexturedButton(
      CFG.id.chkBase+i,"",
      bx+CFG.list.chkX, by+CFG.list.chkY,
      16,16, CFG.list.chkTex
    );

    g.addItemRenderer(
      CFG.id.renderBase+i,
      bx+CFG.list.itemX, by+CFG.list.itemY, 16,16,
      p.getWorld().createItem("minecraft:air",1)
    );

    g.addTexturedButton(
      CFG.id.nameBtnBase+i,"",
      bx+CFG.list.nameBtnX,by+CFG.list.nameBtnY,
      CFG.list.nameBtnW,CFG.list.nameBtnH, CFG.list.nameBtnTex
    );

    g.addLabel(
      CFG.id.nameLabBase+i,"",
      bx+CFG.list.nameX,by+CFG.list.nameY,
      CFG.list.nameW,CFG.list.nameH
    );

    g.addLabel(
      CFG.id.stateBase+i,"",
      bx+CFG.list.stateX,by+CFG.list.stateY,
      CFG.list.stateW,CFG.list.stateH
    );
  }

  // ========== DETAIL TITLE ==========
  g.addLabel(CFG.id.detailTitle, "§fDetail",
    CFG.detail.anchorX+67,
    CFG.detail.anchorY - 20,
    200, 15
  );

  buildDetailSlots(g);

  // Reset runtime variables
  var sd=p.getStoreddata();
  sd.remove("revSel");
  sd.remove("revSearchMode");
  sd.remove("revSearchResult");
  sd.remove("revFocusUuid");
  sd.put("revPage","0");

  p.showCustomGui(g);
  updatePage(p,g,0);
}
function isReady(d){
    if(!d.nextBattle) return true;
    try{
        var LDT = Java.type("java.time.LocalDateTime");
        var ZID = Java.type("java.time.ZoneId");
        var FMT = Java.type("java.time.format.DateTimeFormatter");
        var fmt = FMT.ofPattern("yyyy-MM-dd HH:mm");
        var now = LDT.now(ZID.of("Asia/Seoul"));
        var nxt = LDT.parse(d.nextBattle, fmt);
        return now.isAfter(nxt) || now.isEqual(nxt);
    }catch(e){
        return false;
    }
}
// ======================================================
// DETAIL (ENTITY + INFO LIST) — CENTERED STACK LAYOUT
// ======================================================
function buildDetailSlots(g){

    var ax = CFG.detail.anchorX;     
    var ay = CFG.detail.anchorY;     

    var lx = ax + CFG.detail.labelXOff; // label X
    var vx = ax + CFG.detail.valueXOff; 
    var lh = CFG.detail.lineH;          

    // ----------------------------------------
    // 1) Entity Display 
    // ----------------------------------------
    var imgY = ay + 20;   
    g.addEntityDisplay(
        CFG.id.detailImg,
        ax+80,  
        imgY+63,
        null
    ).setScale(CFG.detail.imgScale || 1.5);


    // ----------------------------------------
    // 2) Info Section — Entity 
    // ----------------------------------------
    var y = imgY + CFG.detail.imgW + 10; 

    // Name
    g.addLabel(CFG.id.detailNameLabel, "§eName:", lx, y, 120, 15);
    g.addLabel(CFG.id.detailName,       "",    vx, y, 200, 15);
    y += lh;

    // Location
    g.addLabel(CFG.id.detailPosLabel, "§eLocation:", lx, y, 120, 15);
    g.addLabel(CFG.id.detailPos,       "",    vx, y, 200, 15);
    y += lh;

    // Last Battle
    g.addLabel(CFG.id.detailLastLabel, "§eLast Battle:", lx, y, 120, 15);
    g.addLabel(CFG.id.detailLast,       "",    vx, y, 200, 15);
    y += lh;

    // Next Battle
    g.addLabel(CFG.id.detailNextLabel, "§eNext Battle:", lx, y, 120, 15);
    g.addLabel(CFG.id.detailNext,       "",    vx, y, 200, 15);
    y += lh;

    // Battles Count
    g.addLabel(CFG.id.detailCountLabel, "§eBattles:", lx, y, 120, 15);
    g.addLabel(CFG.id.detailCount,      "",    vx, y, 200, 15);

    g.addButton(
        CFG.id.copyBtn,
        "📋 Copy",
        CFG.detail.copyX,
        CFG.detail.copyY,
        CFG.detail.copyW,
        CFG.detail.copyH
    );
}


// =====================================================
// PAGE UPDATE
// =====================================================
function updatePage(p,g,pg){
  var sd=p.getStoreddata();
  var obj=loadRev(p);
  if(!obj) obj={};

  // --- Despawn cleanup ---
  var w=p.getWorld(), changed=false;
  for(var uid in obj){
    if(w.getEntity(uid)==null){
      delete obj[uid];
      changed=true;
    }
  }
  if(changed) saveRev(p,obj);

  var keys=Object.keys(obj).sort();
  var idxs = sd.get("revSearchMode") ? jget(sd.get("revSearchResult")) : fullIdx(keys.length);

  var total=idxs.length;
  var pages=Math.max(1, Math.ceil(total/CFG.pageSize));
  if(pg<0)pg=0;
  if(pg>=pages)pg=pages-1;

  sd.put("revPage",""+pg);

  g.getComponent(CFG.id.pageData).setText(""+pg);
  g.getComponent(CFG.id.pageLabel)
    .setText("§fRevenge List §e(Page "+(pg+1)+"/"+pages+")");

  // Map
  var mapAll={};
  for(var i=0;i<idxs.length;i++){
    mapAll[pad3(idxs[i]+1)] = keys[idxs[i]];
  }
  sd.put("revMap",JSON.stringify(mapAll));

  var start=pg*CFG.pageSize;
  var end = Math.min(start+CFG.pageSize,total);

  // ==== FILL LINES ====
  for(var line=0; line<CFG.pageSize; line++){
    var noLab=g.getComponent(CFG.id.noBase+line),
        chk=g.getComponent(CFG.id.chkBase+line),
        ir =g.getComponent(CFG.id.renderBase+line),
        nBtn=g.getComponent(CFG.id.nameBtnBase+line),
        nLab=g.getComponent(CFG.id.nameLabBase+line);

    // Reset
    noLab.setText("");
    chk.setEnabled(false);
    nBtn.setEnabled(false);
    nLab.setText("");
    ir.setStack(p.getWorld().createItem("minecraft:air",1));

    // Fill
    if(start+line >= end) continue;

    var localIdx = idxs[start+line];
    var uuid = keys[localIdx];
    var d = obj[uuid];

    var noStr = pad3(localIdx+1);
    noLab.setText("No."+noStr);

    sd.put("map_"+line, uuid);  // mapping for click

    chk.setEnabled(true);
    nBtn.setEnabled(true);

    // Ready = Name turns green
    var ready = isReady(d);
    nLab.setText( ready ? ("§a" + d.name) : ("§f" + d.name) );
    var sel=jget(sd.get("revSel"));
    ir.setStack(
      p.getWorld().createItem(sel[noStr] ? CFG.list.itemOn : CFG.list.itemOff,1)
    );
  }

  // Restore detail (if exists)
  var fUuid = sd.get("revFocusUuid");
  if(fUuid && obj[fUuid]){
    applyDetail(p,g,obj[fUuid], fUuid);
  } else {
    clearDetail(p,g);
  }
  g.update();
}
// =====================================================
// DETAIL APPLY
// =====================================================
function clearDetail(p,g){
  g.getComponent(CFG.id.detailName).setText("");
  g.getComponent(CFG.id.detailPos).setText("");
  g.getComponent(CFG.id.detailLast).setText("");
  g.getComponent(CFG.id.detailNext).setText("");
  g.getComponent(CFG.id.detailCount).setText("");
  g.getComponent(CFG.id.detailImg).setEntity(null);
}

function applyDetail(p,g,d,uuid){
  g.getComponent(CFG.id.detailName).setText("§f"+(d.name||"(unknown)"));

  var posLabel = g.getComponent(CFG.id.detailPos);
  var area = d.area || null;
  var pos = d.pos;

  if (area){
      // Area 표시 + 좌표도 보조로 넣고 싶을 때
      posLabel.setText("§f" + area + " (" + pos.x+" "+pos.y+" "+pos.z + ")");
  } else {
      // Area가 없으면 좌표만 표시
      posLabel.setText("§f" + pos.x+" "+pos.y+" "+pos.z);
  }

  g.getComponent(CFG.id.detailLast).setText("§f"+(d.lastBattle||""));
  g.getComponent(CFG.id.detailNext).setText("§f"+(d.nextBattle||""));
  g.getComponent(CFG.id.detailCount).setText("§f"+(d.battles||0));

  var ent=p.getWorld().getEntity(uuid);
  g.getComponent(CFG.id.detailImg).setEntity(ent||null);

  g.update();
}



// =====================================================
// BUTTON ACTIONS
// =====================================================
function customGuiButton(e){
  var p=e.player, g=e.gui, bid=e.buttonId;
  var sd=p.getStoreddata(), obj=loadRev(p);
  if(!obj) obj={};

  var keys=Object.keys(obj).sort();
  var pg=parseInt(sd.get("revPage")||"0");


  // PAGE
  if(bid==10){ updatePage(p,g,pg-1); return }
  if(bid==12){ updatePage(p,g,pg+1); return }

  // SEARCH
  if(bid==CFG.id.searchBtn){
    var q=g.getComponent(CFG.id.searchField).getText().toLowerCase();
    var res=[];
    for(var i=0;i<keys.length;i++){
      var nm=(obj[keys[i]].name||"").toLowerCase();
      if(nm.indexOf(q)!==-1) res.push(i);
    }
    sd.put("revSearchMode","1");
    sd.put("revSearchResult",JSON.stringify(res));
    sd.remove("revSel");
    sd.remove("revFocusUuid");
    clearDetail(p,g);
    updatePage(p,g,0);
    return;
  }

  if(bid==CFG.id.resetBtn){
    sd.remove("revSearchMode");
    sd.remove("revSearchResult");
    sd.remove("revSel");
    sd.remove("revFocusUuid");
    clearDetail(p,g);
    updatePage(p,g,0);
    return;
  }

  // DELETE SELECTED
  if(bid==11){
    var sel=jget(sd.get("revSel"));
    var map=jget(sd.get("revMap"));
    var del=0;
    if(!sel || Object.keys(sel).length === 0)return;   
    for(var k in sel){
      var uid=map[k];
      if(uid && obj[uid]){
        delete obj[uid];
        del++;
      }
    }
    if(del>0) saveRev(p,obj);

    sd.remove("revSel");
    sd.remove("revFocusUuid");
    clearDetail(p,g);
    updatePage(p,g,0);
    return;
  }

  // CHECKBOX TOGGLE
  if(bid>=CFG.id.chkBase && bid<CFG.id.chkBase+CFG.pageSize){
    var line=bid-CFG.id.chkBase;
    var uuid=sd.get("map_"+line);
    if(!uuid) return;

    var idxs = sd.get("revSearchMode") ? jget(sd.get("revSearchResult")) : fullIdx(keys.length);
    var start = pg*CFG.pageSize;
    var localIdx = idxs[start+line];

    var noStr = pad3(localIdx+1);
    var sel2=jget(sd.get("revSel"));

    if(sel2[noStr]) delete sel2[noStr];
    else sel2[noStr]=true;

    sd.put("revSel", JSON.stringify(sel2));
    updatePage(p,g,pg);
    return;
  }

  // NAME BUTTON → DETAIL VIEW UPDATE
  if(bid>=CFG.id.nameBtnBase && bid<CFG.id.nameBtnBase+CFG.pageSize){
    var line2=bid-CFG.id.nameBtnBase;
    var uuid2=sd.get("map_"+line2);
    if(!uuid2 || !obj[uuid2]){
      sd.remove("revFocusUuid");
      clearDetail(p,g);
      return;
    }
    sd.put("revFocusUuid", uuid2);
    applyDetail(p,g,obj[uuid2],uuid2);
    return;
  }

  // COPY BUTTON
  if(bid==CFG.id.copyBtn){
      var fUuid = sd.get("revFocusUuid");
      if(!fUuid || !obj[fUuid]) return;

      var d = obj[fUuid];

      var area = d.area || null;
      var displayTxt = area
          ? (area + " (" + d.pos.x+" "+d.pos.y+" "+d.pos.z + ")")
          : (d.pos.x+" "+d.pos.y+" "+d.pos.z);

      var copyTxt = d.pos.x+" "+d.pos.y+" "+d.pos.z;

      API.executeCommand(
        p.getWorld(),
        'tellraw '+p.getName()+
        ' [{"text":"Copied: '+displayTxt+'","color":"yellow","clickEvent":{"action":"copy_to_clipboard","value":"'+copyTxt+'"}}]'
      );
      return;
  }

}
// =====================================================
// GUI CLOSE
// =====================================================
function customGuiClosed(e){
  var sd=e.player.getStoreddata();
  sd.remove("revSel");
  sd.remove("revSearchMode");
  sd.remove("revSearchResult");
  sd.remove("revFocusUuid");
  sd.remove("revMap");
  sd.remove("revPage");
}
