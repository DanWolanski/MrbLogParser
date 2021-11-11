//requiring path and fs modules
const path = require('path');
const fs = require('fs');

stuffwecareabout = ["MessageLogger",
  

]
timestampRegx = /^\d{4}-\d{2}-\d{2}.\d{2}:\d{2}:\d{2},\d{3}/
///////////////////////////////////////////////////////////////////
// Proceess Command Line Arguments
///////////////////////////////////////////////////////////////////

var argv = require('yargs')
	.usage('Usage: $0 -d filedirectory -l [loglevel] -s [consoleloglevel]')
	//.default('f','empty.csv')
  .option('filedirectory',{
    alias: 'd',
    describe: 'Directory containing the log files to parse',
    default: './',
  })
  .option('loglevel',{
    alias: 'l',
    describe: 'Sets the logging level for the logfile',
    default: 'debug',
  })
  .option('consoleloglevel',{
    alias: 's',
    describe: 'Sets the logging level for the console output',
    default: 'http',
  })
	.argv;
  
  
mrbLogs=[];
SIPLogs=[];
idLogs=[];

GUIDMap = new Map();

var lineReader = require('line-reader');
firstlineparsed = ''
lastlineparsed = ''
function ParseLogEntry(line) {
  if(firstlineparsed.length == 0){
    //console.log("Setting first line");
    firstlineparsed=line;
  }
  
  for(let i=0 ; i < stuffwecareabout.length ; i++){
    if(line.includes(stuffwecareabout[i])){
        //console.log('Found stuff we care about');
        gotit=false;
        GUIDMap.forEach((value,key,map)=>{
          if(!gotit){
            if(line.includes(value.gid) || line.includes(value.call1) || line.includes(value.call2)){
             // console.log('Ah push it')
              map.get(key).msglist.push(line)
            }
          }
        });
        //console.log(line);
    }
  }
  lastlineparsed = line;
  //console.log(entry);
}
function OutputGids(printeventlist,printmsglist){
  console.log(GUIDMap.size + " unique calls detected");
  //console.log(JSON.stringify(GUIDMap,null,2));
  GUIDMap.forEach((value, key, map) => {
    printval=value;
    if(!printeventlist){
      delete printval['eventlist']
    }
    if(!printmsglist){
      delete printval['eventlist']
    }
   // console.log(JSON.stringify(value,null,2));    
    console.log(JSON.stringify(value));    
  });
}
function ParseEntry(entry){

    if(GUIDMap.has(entry.gid)){
      GUIDMap.get(entry.gid).eventlist.push(entry)
      newEntry.hasMoved = true;
      //console.log('Updated '+entry.gid);
    } else {
    
      newEntry = {};
     
      newEntry.gid = entry.gid;
      newEntry.call1 = entry.call1;
      newEntry.hasMoved = false;
      newList = [];
      msglist=[];
      newEntry.msglist = msglist;
      newList.push(entry);
      newEntry.eventlist=newList;
      GUIDMap.set(entry.gid,newEntry);
      //console.log('Added '+entry.gid);
      //console.log(GUIDMap.size + ' calls');
    }
    
  
}

function DoneRecurseParse(){
   console.log('First Line Parsed:');
   console.log(firstlineparsed);
   console.log('Last Line Parsed:');
   console.log(lastlineparsed);
   OutputGids(false,true);
}
function RecurseParseLogs(filelist,index) {
  if(index < 0){
    DoneRecurseParse();
    return;
  }
  
  console.log('   Parsing '+filelist[index]);
  lastline=''
  multiline=false
  lineReader.eachLine(argv.filedirectory+filelist[index], function(line, last) {
    if(lastline.length == 0) {
      lastline=line;
    }
    matchlist = line.match(timestampRegx)
    if(matchlist){
        
        ParseLogEntry(lastline);
        lastline=line;
    } else{
      multiline=true;
      lastline = lastline + '\n' + line;
     // console.log('Multiline')
     //console.log(lastline);
    }
    
      // do whatever you want with line...
      if(last){
        // or check if it's the last one
          RecurseParseLogs(filelist,index - 1);
      }
  });
      
  
}
function ParseMRBLogs(filelist) {
   console.log('Starting parsing of MRB Log files:');
   first = filelist.length - 1;
   RecurseParseLogs(filelist,first);
      

}
           
    
  

  

const ParseIDFile = async (filelist) => {
  
  var gidparse = new Promise((gidresolve, reject) => {
    index=filelist.length
    console.log('Starting parsing of Global ID files:');
    filelist.reverse().forEach((file,index,array)=>{
      console.log('   Parsing '+filelist[index]);
      lrpromise = new Promise((resolve,reject) => {
      lineReader.eachLine(argv.filedirectory+filelist[index], function(line, last) {
        //console.log(line);
        parts=line.split(' ');
        entry={};
        entry.timestamp=parts[0];
        entry.gid=parts[1].split('=')[1].split('@')[0];
        entry.mrb=parts[1].split('=')[1].split('@')[1];
        entry.call1=parts[2].split('=')[1];
        entry.call2=parts[3].split('=')[1];
        entry.ms=parts[4].split('=')[1];
        //console.log(entry)
        ParseEntry(entry);
        // do whatever you want with line...
        if(last){
          // or check if it's the last one
          resolve()
        }
      });
      });
      lrpromise.then(() => {
        //console.log(index)
        if (index === 0) {
         //console.log('All Done');
          gidresolve();
         }
        
      });
      
    });
  });
  gidparse.then(() => {
   // OutputGids(true,true);
    ParseMRBLogs(mrbLogs);
  });
}
//passsing directoryPath and callback function
fs.readdir(argv.filedirectory, function (err, files) {
    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    } 
    console.log("Checking for required files");

    //listing all files using forEach
    files.forEach(function (file) {
        // Do whatever you want to do with the file
        // console.log(file); 
        if(file.includes('global-call-ids.log')){

          filebits=file.split('.');
          index=filebits[filebits.length - 1];
          if(index == 'log') index=0;
          else index=parseInt(index)
          idLogs[index]=file;

        }
        else if(file.includes('nst-mrb.log')){
          filebits=file.split('.');
          index=filebits[filebits.length - 1];
          if(index == 'log') index=0;
          else index=parseInt(index)
          mrbLogs[index]=file;
          
        }
        else if(file.includes('SIP.log')){
          haveMRBFiles=true;
          filebits=file.split('.');
          index=filebits[filebits.length - 1];
          if(index == 'log') index=0;
          else index=parseInt(index)
          SIPLogs[index]=file;
        }
    });
    console.log((idLogs.length?"  +":"  -")+'global-call-ids.log');
    console.log((mrbLogs.length?"  +":"  -")+'nst-mrb.log');
    console.log((SIPLogs.length?"  +":"  -")+'SIP.log');
    
    if( !idLogs.length || !mrbLogs.length || !SIPLogs.length){
      process.exit();
    }
     
  ParseIDFile(idLogs);

      
});

  



