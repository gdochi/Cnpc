const $NpcApi = Java.loadClass('noppes.npcs.api.NpcAPI').Instance()

NetworkEvents.dataReceived("bridge:dialogue_wrap_response", function(ev){

  var p = ev.player
  if(!p) return

  var iPlayer = $NpcApi.getIEntity(p)
  if(!iPlayer) return

  var mapJson = "" + (ev.data?.map ?? "")
  if(!mapJson.length) return

  iPlayer.tempdata.put("dlg_wrap_map", mapJson)
})