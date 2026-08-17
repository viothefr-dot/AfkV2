const express=require('express');
const http=require('http');
const path=require('path');
const {Server}=require('socket.io');
const mineflayer=require('mineflayer');
const {mineflayer: viewer}=require('prismarine-viewer');

const app=express();
const server=http.createServer(app);
const io=new Server(server);
const PORT=process.env.PORT||3000;

app.use(express.json());
app.use(express.static(path.join(__dirname,'web')));

let bot=null, config=null, spinTimer=null, autoHitTimer=null, autoEatTimer=null;
let viewerStarted=false;

function log(message){console.log(message);io.emit('log',{message})}
function status(s,online=false){
  io.emit('status',{status:s,online,username:config?.username||'',host:config?.host||''});
}
function clearTimers(){
  for(const t of [spinTimer,autoHitTimer,autoEatTimer]) if(t) clearInterval(t);
  spinTimer=autoHitTimer=autoEatTimer=null;
}
function stop(){
  clearTimers();
  if(bot){try{bot.quit('Stopped from dashboard')}catch{}}
  bot=null;viewerStarted=false;status('Offline',false);log('Bot stopped');
}
function readable(reason){
  try{
    if(typeof reason==='string') return reason;
    if(reason && typeof reason==='object'){
      if(typeof reason.text==='string') return reason.text;
      return JSON.stringify(reason);
    }
  }catch{}
  return String(reason);
}
function start(c){
  stop(); config=c;
  const opts={host:c.host,port:Number(c.port)||25565,username:c.username};
  if(c.version) opts.version=c.version;
  bot=mineflayer.createBot(opts);
  status('Connecting…',false);
  log(`Connecting to ${c.host}:${opts.port}${c.version?' ('+c.version+')':''}`);

  bot.once('spawn',()=>{
    status('Online',true); log(`Spawned as ${bot.username}`);
    // Start a read-only 3D browser viewer for the connected bot.
    try{
      viewer(bot,{port:3001,firstPerson:false});
      viewerStarted=true;
      log('3D viewer started on the dashboard viewer port.');
    }catch(e){log(`Viewer error: ${e.message}`)}

    const mins=Math.max(0,Number(c.spin)||0);
    if(mins>0) spinTimer=setInterval(()=>{try{bot.look(bot.entity.yaw+0.35,bot.entity.pitch,true)}catch{}},mins*60000);

    // Optional automation is intentionally disabled by default and only runs
    // when explicitly enabled in the dashboard.
    if(c.autoHit==='true'){
      autoHitTimer=setInterval(()=>{
        try{
          const target=bot.nearestEntity(e=>e.type==='player' && e!==bot.entity && e.position.distanceTo(bot.entity.position)<4);
          if(target) bot.attack(target);
        }catch(e){log(`Auto-hit error: ${e.message}`)}
      },7000);
    }
    if(c.autoEat==='true'){
      autoEatTimer=setInterval(async()=>{
        try{
          if(bot.food>=18) return;
          const item=bot.inventory.items().find(i=>/food|apple|bread|beef|pork|chicken|carrot|potato|melon|cookie|steak/i.test(i.name));
          if(item){await bot.equip(item,'hand');await bot.consume();log('Auto-eat used available food.')}
        }catch(e){log(`Auto-eat: ${e.message}`)}
      },3000);
    }
  });
  bot.on('chat',(u,m)=>{const x=`<${u}> ${m}`;io.emit('serverchat',{message:x});log(x)});
  bot.on('messagestr',m=>io.emit('serverchat',{message:String(m)}));
  bot.on('kicked',r=>{const x=readable(r);log(`Kicked: ${x}`);io.emit('serverchat',{message:`[KICK] ${x}`});status('Kicked',false)});
  bot.on('error',e=>{log(`Bot error: ${e?.message||String(e)}`);status('Error',false)});
  bot.on('end',()=>{log('Connection ended');clearTimers();status('Offline',false);bot=null});
}
app.post('/api/start',(req,res)=>{
  const c=req.body||{};
  if(!c.host||!c.username) return res.status(400).json({ok:false,error:'Server address and username are required.'});
  try{start(c);res.json({ok:true})}catch(e){res.status(500).json({ok:false,error:e.message})}
});
app.post('/api/stop',(req,res)=>{stop();res.json({ok:true})});
app.post('/api/chat',(req,res)=>{
  const m=String(req.body?.message||'').trim();
  if(!bot?.entity)return res.status(409).json({ok:false,error:'Bot is not connected.'});
  if(!m)return res.status(400).json({ok:false,error:'Message is empty.'});
  try{bot.chat(m);io.emit('serverchat',{message:`<${bot.username}> ${m}`});res.json({ok:true})}catch(e){res.status(500).json({ok:false,error:e.message})}
});
app.post('/api/control',(req,res)=>{
  if(!bot?.entity)return res.status(409).json({ok:false,error:'Bot is not connected.'});
  const action=String(req.body?.action||'');
  const allowed=['forward','back','left','right','jump','sprint','sneak'];
  if(!allowed.includes(action))return res.status(400).json({ok:false,error:'Invalid control.'});
  try{
    if(['forward','back','left','right','sprint','sneak'].includes(action)) bot.setControlState(action,!!req.body?.down);
    if(action==='jump' && req.body?.down) bot.setControlState('jump',true),setTimeout(()=>bot?.setControlState('jump',false),250);
    res.json({ok:true});
  }catch(e){res.status(500).json({ok:false,error:e.message})}
});
app.get('/api/status',(req,res)=>res.json({online:!!bot?.entity,username:bot?.username||'',health:bot?.health||0,food:bot?.food||0}));
io.on('connection',s=>s.emit('status',{status:bot?.entity?'Online':'Offline',online:!!bot?.entity,username:bot?.username||'',host:config?.host||''}));
server.listen(PORT,'0.0.0.0',()=>console.log(`AFKCloud listening on ${PORT}`));
