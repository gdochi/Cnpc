const Minecraft = Java.loadClass("net.minecraft.client.Minecraft").getInstance()
const Component = Java.loadClass("net.minecraft.network.chat.Component")

NetworkEvents.dataReceived("bridge:dialogue_wrap", function(ev){

  var p = ev.player
  if(!p) return

  var d = ev.data ?? {}
  var raw = "" + d.requests

  var requests
  try{requests = JSON.parse(raw)
  }catch(err){return}
  if(!Array.isArray(requests)) return

  var result = {}

  for(var i=0;i<requests.length;i++){

    var req = requests[i]
    if(!req || !req.key || !req.storeKey) continue
    var translated = "" + Component.translatable(req.key).getString()
    if(req.kind == "button"){
      var pixel = Minecraft.font.width(translated)
      var w = pixel + 20
      if(w < 40) w = 40
      if(w > 260) w = 260
      result[req.storeKey] = {label: translated,width: w}
    } else {
      var maxWidth = Number(req.width || 0)
      var wrapped = (maxWidth > 0) ? wrapByPixel(translated, maxWidth) : [translated]
      var clean = []
      for(var j=0;j<wrapped.length;j++) clean.push("" + wrapped[j])
      result[req.storeKey] = clean
    }
  }
  p.sendData("bridge:dialogue_wrap_response", {
    map: JSON.stringify(result)
  })
})

function wrapByPixel(text, maxWidth){

    var lines = []
    var current = ""

    if(isCJK(text)){
        for(var i=0;i<text.length;i++){
            var char = text.charAt(i)
            var test = current + char
            if(Minecraft.font.width(test) <= maxWidth){
                current = test
            } else {
                if(current.length > 0)
                    lines.push(current)
                current = char
            }
        }
    } else {
        var words = text.split(" ")
        for(var i=0;i<words.length;i++){

            var test = current.length == 0
                ? words[i]
                : current + " " + words[i]
            if(Minecraft.font.width(test) <= maxWidth){
                current = test
            } else {
                if(current.length > 0)
                    lines.push(current)
                current = words[i]
            }
        }
    }

    if(current.length > 0)
        lines.push(current)
    return lines
}
function isCJK(text){return /[\u3400-\u9FFF]/.test(text)} //china check