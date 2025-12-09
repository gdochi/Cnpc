//key press
function keyPressed(e){
    if(e.openGui) return;
    var key = e.key; 
    //e.player.message(key);
    //Key IDs are numeric values mapped to actual keyboard keys.
    //If you enable this option (by removing ‘//’), the player will see which key ID they pressed.
    //If you want to change the key, press the desired key to check its ID, then replace the value accordingly.
    //After that, add ‘//’ again to disable the display.
    //Note that these key settings cannot be viewed in the vanilla keybind menu.
    if(key == 67){   // c key
        openRevengeGui(e.player);
    }
}
//chat
function chat(e){
    var msg = e.message.trim().toLowerCase();
    if(msg === "rev"){
        e.setCanceled(true);   
        openRevengeGui(e.player);
    }
}
//interact
function interact(e){
  openRevengeGui(e.player);
}