'use strict';

const fs = require('fs');
//console.log(process.argv);
var myargs = process.argv.slice(2);
let filename = myargs[0]
let savepackets=false
let rawdata = fs.readFileSync(filename);
let xms1 = JSON.parse(rawdata);
let confregx = /conf:[0-9a-f\-]*/g
let controlregx = /createconference/g
let cidmap = new Map()
xms1.forEach( (packet)=> {
  //build the call listStyleType
  //console.log(packet["_source"]["layers"]["sip.Call-ID"][0])
  let cid = packet["_source"]["layers"]["sip.Call-ID"][0];
  let call = {}
  if(cidmap.has(cid)){
    
    call=cidmap.get(cid)
  } else {
    call.fromfile = filename
    call.cid=cid
    call.isControl = false
    call.isActive = true
    call.INVITECount = 0
    call.packetlist = []
    cidmap.set(cid,call)
    call.numconfs=0
    call.joincount=0
  }
  if ( savepackets){
    cidmap.get(cid).packetlist.push(packet)
  }
  //console.log(packet["_source"]["layers"]["sip.msg_hdr"])
  let matches=JSON.stringify(packet["_source"]["layers"]["sip.msg_hdr"]).match(confregx);
  if(matches){
    call.confid = matches[0].split(':')[1]
    //console.log(call.confid)
  }
  if(JSON.stringify(packet["_source"]["layers"]["sip.msg_hdr"]).includes("<join")){
    call.joincount++
  }
  matches=JSON.stringify(packet["_source"]["layers"]["sip.msg_hdr"]).match(controlregx);
  if(matches){
    call.isControl = true
    call.numconfs++
  }
  let method = JSON.stringify(packet["_source"]["layers"]["sip.Method"])
  if(method && method.includes("INVITE")){
    call.isActive = true
    call.INVITECount++
  }
  if(method && method.includes("BYE")){
    call.isActive = false
  }
});

cidmap.forEach( (call,cid) => {
  
  
 //console.log(JSON.stringify(call,null,2))
  if(call.INVITECount > 0){
    fs.writeFileSync('./sipcallflows/sip_'+cid+'.json', JSON.stringify(call,null,2));
  }
  
});
