var DATA=[
// ===== HEALING ITEMS =====
{id:"minecraft:potion",price:15,base:-1,stock:-1,cat:"heal",text:"§fHealing Potion.@@§fRestores health."},
{id:"minecraft:golden_apple",price:30,base:30,stock:30,cat:"heal",text:"§fGolden Apple.@@§fGrants regeneration."},
{id:"minecraft:enchanted_golden_apple",price:60,base:20,stock:20,cat:"heal",text:"§fEnchanted Golden Apple.@@§fPowerful healing item."},
{id:"minecraft:suspicious_stew",price:120,base:10,stock:10,cat:"heal",text:"§fSuspicious Stew.@@§fProvides special effects."},
// ===== TOOLS =====
{id:"minecraft:diamond_sword",price:80,base:25,stock:25,cat:"ball",text:"§fDiamond Sword.@@§fSharp and reliable."},
{id:"minecraft:bow",price:70,base:40,stock:40,cat:"ball",text:"§fBow.@@§fBest used at range."},
{id:"minecraft:crossbow",price:65,base:35,stock:35,cat:"ball",text:"§fCrossbow.@@§fHigh damage projectile weapon."},
{id:"minecraft:trident",price:55,base:30,stock:30,cat:"ball",text:"§fTrident.@@§fEffective underwater."},
{id:"minecraft:fishing_rod",price:55,base:30,stock:30,cat:"ball",text:"§fFishing Rod.@@§fUseful for fishing."},
{id:"minecraft:shield",price:50,base:50,stock:50,cat:"ball",text:"§fShield.@@§fBlocks incoming damage."}
];
// currency: item default
// stored data → {currency:{key:"money"}}
var CFG={
  currency:{id:"minecraft:emerald"},
  shopName:"§fGradion’s Shop",
  restock:{
    enabled:true,
    ticks:60 
  },
  sound:{
    buy:{id:"minecraft:entity.player.levelup",vol:1,pit:1.2},
    fail:{id:"minecraft:block.note_block.bass",vol:1,pit:1}
  }
};
////////////////////////////////////////////////////////////////////////////
var API=Java.type("noppes.npcs.api.NpcAPI").Instance();
var GUI_ID=1300,PAGE_SIZE=8;
var BASE={X:10,Y:80};
var STATE={sel:-1,qty:1,page:0};
var ID={ENTITY:5,DESC_LINES:[], BUY_SLOT:30,SELECT_STOCK:31,BTN_QTY_UP:32,TF_QTY:33,BTN_QTY_DOWN:34,TOTAL:35,MONEY:36,BTN_BUY:37,BTN_PAGE:[40,41],LIST_BTN:[],LIST_STOCK:[],LIST_PRICE:[]};
for(var i=0;i<PAGE_SIZE;i++){ID.LIST_BTN[i]=100+i;ID.LIST_STOCK[i]=200+i;ID.LIST_PRICE[i]=300+i;}

function interact(e){
var p=e.player,w=e.npc.getWorld(),g=API.createCustomGui(GUI_ID,400,400,false,p);
checkRestock(w);
g.addColoredLine(1,BASE.X+200,BASE.Y,BASE.X+200,BASE.Y+230,0xFF444444,2);
g.addColoredLine(2,BASE.X,BASE.Y+110,BASE.X+190,BASE.Y+110,0xFF444444,2);
g.addColoredLine(3,BASE.X,BASE.Y-20,BASE.X+390,BASE.Y-20,0xFF444444,2);

g.addLabel(4,CFG.shopName,BASE.X+150,BASE.Y-35,200,20);
g.addEntityDisplay(ID.ENTITY,BASE.X+160,BASE.Y+210,e.npc).setScale(1.6);

setDesc(g,"§fWelcome.");

g.addItemSlot(BASE.X+20,BASE.Y+120);
g.addTexturedButton(500,"",BASE.X+19,BASE.Y+119,20,20,"customnpcs:textures/gui/invisibe.png");

g.addLabel(ID.SELECT_STOCK,"",BASE.X+20,BASE.Y+140,120,16);

g.addButton(ID.BTN_QTY_UP,"▲",BASE.X+70,BASE.Y+120,20,12);
g.addTextField(ID.TF_QTY,BASE.X+70,BASE.Y+134,30,14).setText(String(STATE.qty));
g.addButton(ID.BTN_QTY_DOWN,"▼",BASE.X+70,BASE.Y+150,20,12);

g.addLabel(ID.TOTAL,"",BASE.X+20,BASE.Y+165,150,16);
g.addLabel(ID.MONEY,"§fMoney: "+getMoney(p),BASE.X+20,BASE.Y+180,150,16);

g.addButton(ID.BTN_BUY,"Buy",BASE.X+91,BASE.Y+150,36,12);

g.addButton(ID.BTN_PAGE[0],"◀",BASE.X+220,BASE.Y-10,20,18);
g.addButton(ID.BTN_PAGE[1],"▶",BASE.X+250,BASE.Y-10,20,18);

var y=BASE.Y+20;
for(var i=0;i<PAGE_SIZE;i++){
g.addItemSlot(BASE.X+220,y);
g.addTexturedButton(ID.LIST_BTN[i],"",BASE.X+219,y-1,20,20,"customnpcs:textures/gui/invisible.png");
g.addLabel(ID.LIST_STOCK[i],"",BASE.X+245,y+2,40,12);
g.addLabel(ID.LIST_PRICE[i],"",BASE.X+285,y+2,40,12);
y+=26;
}

renderPage(g,w);
updateInfo(g,p);
p.showCustomGui(g);
}

function setDesc(g,text){
  for(var i=0;i<ID.DESC_LINES.length;i++){g.removeComponent(ID.DESC_LINES[i]);}
    ID.DESC_LINES=[];
    var parts=text.split("@@");
    var lineHeight=15;

    var baseY=BASE.Y+80;

    var totalHeight=parts.length*lineHeight;
    var offset=Math.floor(totalHeight/2);
    var startY=baseY-offset;
    for(var i=0;i<parts.length;i++){
    var newId=1000+i;
    ID.DESC_LINES.push(newId);
    g.addLabel(newId,parts[i],BASE.X+20,startY+(i*lineHeight),180,16);
  }}

function renderPage(g,w){
  for(var i=0;i<PAGE_SIZE;i++){
    var idx=STATE.page*PAGE_SIZE+i;
    var slot=g.getSlots()[1+i];
    var stockLabel=g.getComponent(ID.LIST_STOCK[i]);
    var priceLabel=g.getComponent(ID.LIST_PRICE[i]);

  if(idx<DATA.length){
    slot.setStack(w.createItem(DATA[idx].id,1));
    stockLabel.setText(DATA[idx].stock<0?"§f∞":"§f"+DATA[idx].stock);
    priceLabel.setText("§f"+DATA[idx].price);
  }else{
    slot.setStack(w.createItem("minecraft:air",1));
    stockLabel.setText("");
    priceLabel.setText("");
  }
 }
}
// === stock
function getBaseStock(i){return DATA[i].base!=null?DATA[i].base:DATA[i].stock;}
function checkRestock(w){
if(!CFG.restock || !CFG.restock.enabled) return;
var sd=w.getStoreddata();
var now=w.getTotalTime();
var last=parseInt(sd.get("shop_last_restock")||0,10);
if(now-last>=CFG.restock.ticks){
for(var i=0;i<DATA.length;i++){
if(DATA[i].stock>=0){
DATA[i].stock=getBaseStock(i);}}
sd.put("shop_last_restock",String(now));}}
function restockAll(){for(var i=0;i<DATA.length;i++){if(DATA[i].base>=0){DATA[i].stock=DATA[i].base;}}}
// === cost
function getMoney(p){
if(CFG.currency.id)
return p.getInventory().count(p.getWorld().createItem(CFG.currency.id,1),true,true);
if(CFG.currency.key)
return parseInt(p.getStoreddata().get(CFG.currency.key)||0,10);
return 0;}

function playCfgSound(p,s){if(!s||!s.id) return;p.playSound(s.id,s.vol||1,s.pit||1);}
function updateInfo(g,p){
if(STATE.sel<0){
setDesc(g,"§fWelcome.");
g.getComponent(ID.TOTAL).setText("");
g.getComponent(ID.SELECT_STOCK).setText("");
return;
}
var item=DATA[STATE.sel];
var cost=item.price*STATE.qty;
var money=getMoney(p);
g.getComponent(ID.TOTAL).setText((money<cost?"§c":"§f")+"Total: "+cost);
var unit=getCurrencyName();
g.getComponent(ID.MONEY).setText("§fMoney: "+money+" (§7"+unit+"§f)");
g.getComponent(ID.SELECT_STOCK).setText(item.stock<0?"§fStock: ∞":"§fStock: "+item.stock);

if(item.stock===0){ setDesc(g,"§cOut of stock."); return; }
if(item.stock>=0&&STATE.qty>item.stock){ setDesc(g,"§cThat's all I have left."); return; }
if(money<cost){ setDesc(g,"§cYou don't have enough money."); return; }
setDesc(g,item.text);
}
function getCurrencyName(){
if(CFG.currency.id){
var parts=CFG.currency.id.split(":");
return parts.length>1?parts[1]:parts[0];}
if(CFG.currency.key){
return CFG.currency.key;}
return "";}
function pay(p,amount){
  var has=getMoney(p);
  if(has<amount) return false;
  if(CFG.currency.id){API.executeCommand(p.getWorld(),"clear " + p.getName() + " " + CFG.currency.id + " " + amount);}
  if(CFG.currency.key)p.getStoreddata().put(CFG.currency.key,String(has-amount));
  return true;
}
function customGuiButton(e){
if(e.gui.getID()!==GUI_ID) return;
var g=e.gui,p=e.player,w=p.getWorld();

if(e.buttonId>=ID.LIST_BTN[0]&&e.buttonId<ID.LIST_BTN[0]+PAGE_SIZE){
var idx=STATE.page*PAGE_SIZE+(e.buttonId-ID.LIST_BTN[0]);
if(idx<DATA.length){
STATE.sel=idx;
STATE.qty=1;
g.getSlots()[0].setStack(w.createItem(DATA[idx].id,1));
g.getComponent(ID.TF_QTY).setText("1");
}
updateInfo(g,p);
g.update();
return;
}

if(e.buttonId===ID.BTN_QTY_UP||e.buttonId===ID.BTN_QTY_DOWN){

if(STATE.sel<0) return;
var tf=g.getComponent(ID.TF_QTY);
var v=parseInt(tf.getText(),10);
if(isNaN(v)||v<1) v=1;

if(e.buttonId===ID.BTN_QTY_UP) v++;
else if(v>1) v--;

var item=DATA[STATE.sel];
if(item.stock>=0 && v>item.stock) v=item.stock;

STATE.qty=v;
tf.setText(String(v));
updateInfo(g,p);
g.update();
return;
}

if(e.buttonId===ID.BTN_PAGE[0]){
if(STATE.page>0) STATE.page--;
renderPage(g,w);
g.update();
return;
}
if(e.buttonId===ID.BTN_PAGE[1]){
if((STATE.page+1)*PAGE_SIZE<DATA.length) STATE.page++;
renderPage(g,w);
g.update();
return;
}

if(STATE.sel<0) return;
if(e.buttonId===ID.BTN_BUY){

var item=DATA[STATE.sel];
var cost=item.price*STATE.qty;
var money=getMoney(p);

if(money<cost){
if(CFG.sound) playCfgSound(p,CFG.sound.fail);
setDesc(g,"§cYou don't have enough money.");
g.update();
return;
}
if(item.stock===0){
if(CFG.sound) playCfgSound(p,CFG.sound.fail);
setDesc(g,"§cOut of stock.");
g.update();
return;
}
if(item.stock>=0 && STATE.qty>item.stock){
if(CFG.sound) playCfgSound(p,CFG.sound.fail);
setDesc(g,"§cThat's all I have left.");
g.update();
return;
}
if(pay(p,cost)===false){
if(CFG.sound) playCfgSound(p,CFG.sound.fail);
return;
}
if(item.stock>0) item.stock-=STATE.qty;
API.executeCommand(w,"give " + p.getName() + " " + item.id + " " + STATE.qty);
if(CFG.sound) playCfgSound(p,CFG.sound.buy);
updateInfo(g,p);
renderPage(g,w);
g.update();
}}
function customGuiClosed(e){if(e.gui.getID()!==GUI_ID) return;STATE.sel=-1;STATE.qty=1;STATE.page=0;}
function customGuiSlotClicked(e){e.setCanceled(true);}