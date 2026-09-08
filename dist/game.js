(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,damp=(a,b,k,dt)=>lerp(a,b,1-Math.exp(-k*dt));
const rand=(a=0,b=1)=>a+Math.random()*(b-a),fmt=n=>Math.round(n).toLocaleString('sv-SE');
let vw=1280,vh=720,scale=1,ox=0,oy=0,dpr=1;
// The world box the camera sees. resize() fixes the base size for the screen; zoom widens it
// with altitude so the valley floor stays in frame instead of sliding off the bottom edge.
let baseVw=1280,baseVh=720,baseScale=1,zoom=1;
const art={day:new Image(),night:new Image(),jungle:new Image()};art.day.src='alpine-day.webp';art.night.src='alpine-night.webp';art.jungle.src='jungle.webp';
const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
const coarse=window.matchMedia?.('(pointer: coarse)').matches||false;
const levels=[
 {name:'FIRST LIGHT',region:'Björkdalen',brief:'Tre vandrare är strandsatta i dalen. Flyg in, vinscha upp dem och landa vid basen.',objective:'Rädda 3 personer och återvänd.',length:4600,seed:17,theme:'day',people:[1250,2370,3650],guns:[{x:3070,type:'gun'}],par:165,wind:0},
 {name:'COPPER RIDGE',region:'Kopparpasset',brief:'Luftvärnet blockerar passet. Slå ut tre ställningar och hämta två piloter.',objective:'Slå ut 3 luftvärn. Rädda 2 piloter.',length:5400,seed:62,theme:'sunset',people:[2080,4510],guns:[{x:1450,type:'gun'},{x:3170,type:'gun'},{x:4070,type:'missile'}],clear:true,par:220,wind:6},
 {name:'STORMLINE',region:'Västra utposten',brief:'Utposten behöver en generator. Vinscha upp lådan vid depån, sätt ner den på den markerade plattan och hämta två tekniker.',objective:'Leverera generatorn och rädda 2 tekniker.',length:5700,seed:32,theme:'storm',people:[2470,4690],guns:[{x:3220,type:'gun'},{x:5010,type:'missile'}],cargo:{x:1020,to:3970},par:250,wind:17},
 {name:'WHITEOUT',region:'Frostfjorden',brief:'Fyra personer saknas längs fjorden. Sikten är begränsad. Följ nödsignalerna och ge vinschen tid att stabiliseras.',objective:'Rädda 4 personer i snöstormen.',length:6300,seed:91,theme:'snow',people:[1490,2850,4130,5380],guns:[{x:2220,type:'gun'},{x:4690,type:'missile'}],par:245,wind:13},
 {name:'NIGHTFALL',region:'Svarta dalen',brief:'Säkra korridoren före gryningen. Fem luftvärn bevakar dalen och två besättningsmän väntar på räddning.',objective:'Slå ut 5 luftvärn. Rädda 2 personer.',length:6500,seed:83,theme:'night',people:[2520,5430],guns:[{x:1440,type:'gun'},{x:2240,type:'missile'},{x:3370,type:'gun'},{x:4270,type:'gun'},{x:5810,type:'missile'}],clear:true,par:290,wind:9},
 {name:'BLACK SKY',region:'Sista korridoren',brief:'En tung stridshelikopter bevakar utvägen. Besegra den, rädda den sista gruppen och för hem besättningen.',objective:'Besegra Heavy Gunship och rädda 3.',length:6700,seed:116,theme:'night',people:[1880,3610,5570],guns:[{x:2830,type:'gun'},{x:4590,type:'missile'}],boss:true,par:300,wind:11}
 ,{name:'EMERALD PASSAGE',region:'Smaragddjungeln',brief:'Tre forskare väntar i ravinen. Följ de turkosa lamporna ner under klippvalvet och rädda forskaren i grottan. Håll rotorn fri från tak och pelare. Klippor med ljus kant är fasta hinder; träd och lianer är bakgrund. Återvänd till basen med alla tre.',objective:'Rädda 3 forskare, en inne i grottan.',length:5000,seed:203,theme:'jungle',people:[1470,2420,4080],guns:[{x:3710,type:'gun'}],par:310,wind:7}
 ,{name:'THE LOST VALLEY',region:'The Lost Valley',brief:'Nå fyren, rädda besättningen och flyg hela vägen hem.',objective:'Rädda 2 vid fyren och återvänd till Eagle Base.',length:26000,beacon:25200,seed:317,theme:'day',people:[25030,25320],guns:[],par:1500,wind:0,lost:true}
];
let save={unlocked:0,results:{},best:0,muted:false,sensitivity:1,depthMode:false};try{const s=JSON.parse(localStorage.getItem('rotorBlackSkyV2')||'null');if(s&&typeof s==='object'){save.unlocked=clamp(Number(s.unlocked)||0,0,levels.length-1);save.results=s.results||{};save.best=Number(s.best)||0;save.muted=!!s.muted;save.sensitivity=clamp(Number(s.sensitivity)||1,.5,1.6);save.depthMode=false;save.schoolComplete=!!s.schoolComplete;save.trainingResults=s.trainingResults||{}}}catch{}
const TEST_FLIGHT=true;
save.depthMode=false;
function persist(){try{localStorage.setItem('rotorBlackSkyV2',JSON.stringify(save))}catch{}}
let mode='menu',level=0,L=levels[0],time=0,visualTime=0,score=0,camera=0,cameraY=0,shake=0,damageFlash=0,wind=0,heli,terrain=[],scenery=[],people=[],enemies=[],cargo=null,boss=null;
let bullets=[],rockets=[],missiles=[],particles=[],smokes=[],bursts=[],decoys=[],texts=[],debris=[],clouds=[],obstacles=[];
let gunCd=0,rocketCd=0,flareCd=0,muzzle=0,unload=0,service=0,radioTimer=0,warningTimer=0,comboTimer=0,combo=0,hudTimer=0,saveScore=0,missionKills=0,landings=0,crashHits=0,perfectPickups=0,hoverMode=false,tutorial=0,checkpoint=0;
let school={active:false,stage:0,hold:0},precision={hold:0,approach:0,fast:false,targets:new Set(),landings:new Set()};
const keys={},edges={};let joy={x:0,y:0,id:null};
const gyro={enabled:false,raw:null,zero:null,filtered:0,last:0,invert:false,status:'Gyro av. Touch och tangentbord är alltid tillgängliga.'};
function gyroStatus(text){gyro.status=text;const el=$('gyroStatus');if(el)el.textContent=text;}
function calibrateGyro(){gyro.zero=gyro.raw;gyro.filtered=0;gyroStatus(gyro.raw===null?'Väntar på rörelsesensorn. Håll enheten stilla i liggande läge.':'Mittläge sparat. Luta försiktigt vänster och höger.');}
async function enableGyro(){if(gyro.enabled){gyro.enabled=false;gyro.filtered=0;gyroStatus('Gyro av.');$('gyroEnable').textContent='AKTIVERA GYRO';return;}const D=window.DeviceOrientationEvent;if(!D){gyroStatus('Rörelsesensor saknas här. Använd spak eller tangentbord.');return;}try{if(typeof D.requestPermission==='function'&&await D.requestPermission()!=='granted'){gyroStatus('Rörelseåtkomst nekades. Spak och knappar fungerar fortfarande.');return;}gyro.enabled=true;gyro.raw=gyro.zero=null;gyro.filtered=0;gyro.last=performance.now();gyroStatus('Håll enheten stilla i liggande läge. Mittläget sparas vid första mätningen.');$('gyroEnable').textContent='STÄNG AV GYRO';setTimeout(()=>{if(gyro.enabled&&gyro.raw===null)gyroStatus('Ingen sensordata ännu. Öppna spelets länk i Safari och aktivera gyro där.');},3500);}catch{gyroStatus('Gyro kunde inte aktiveras. Öppna spelets länk i Safari och försök igen.');}}
function orientationSample(e){if(!gyro.enabled||!Number.isFinite(e.beta)||!Number.isFinite(e.gamma))return;if(innerWidth<innerHeight){gyro.raw=gyro.zero=null;gyro.filtered=0;gyroStatus('Vrid enheten till liggande läge.');return;}const angle=(window.screen?.orientation?.angle??window.orientation??90)*Math.PI/180,b=e.beta*Math.PI/180,g=e.gamma*Math.PI/180;
 const sideways=Math.cos(b)*Math.sin(g)*Math.cos(angle)-Math.sin(b)*Math.sin(angle);
 gyro.raw=Math.asin(clamp(sideways,-1,1))*180/Math.PI;gyro.last=performance.now();if(gyro.zero===null){gyro.zero=gyro.raw;gyroStatus('Gyro aktivt. Mittläge sparat.');}}
function gyroInput(dt){if(!gyro.enabled||gyro.zero===null||innerWidth<innerHeight||performance.now()-gyro.last>700){gyro.filtered=damp(gyro.filtered,0,12,dt);return gyro.filtered;}const delta=(gyro.raw-gyro.zero)*(gyro.invert?-1:1),u=clamp((Math.abs(delta)-2.3)/23,0,1),target=Math.sign(delta)*Math.pow(u,1.55);gyro.filtered=damp(gyro.filtered,target,8,dt);return gyro.filtered;}
addEventListener('deviceorientation',orientationSample);addEventListener('orientationchange',()=>{gyro.raw=gyro.zero=null;gyro.filtered=0;});
const flightTouches=new Map();let touchFlight=false;
function touchAxes(){let left=false,right=false;for(const p of flightTouches.values()){if(p.side<0)left=true;else right=true;}return{x:(right?1:0)-(left?1:0),y:left&&right?.72:left||right?0:-.38,left,right};}
function requestFacing(dir){if(mode!=='playing'||heli.turn>0||heli.dir===dir)return;heli.yawStart=heli.yaw;heli.dir=dir;heli.yawTarget=heli.yaw+Math.PI;heli.turn=1.65;AudioState.sfx('switch');}
function clearInput(){flightTouches.clear();for(const id of ['flightLeft','flightRight'])$(id).classList.remove('pressed');gyro.filtered=0;for(const k in keys)keys[k]=false;for(const k in edges)delete edges[k];joy.x=joy.y=0;joy.id=null;}
// Zooming scales the world box and the draw scale by the same factor, so the on-screen
// rectangle never moves: only how much world fits inside it changes.
function applyView(){vw=baseVw*zoom;vh=baseVh*zoom;scale=baseScale/zoom;}
const screenGrads={key:'',map:{}};
function screenGrad(name,make){const key=Math.round(vw)+'x'+Math.round(vh);
 if(screenGrads.key!==key){screenGrads.key=key;screenGrads.map={}}
 return screenGrads.map[name]??=make();}
function resize(){dpr=Math.min(2,window.devicePixelRatio||1);const compact=innerWidth<=620||innerHeight<=520,top=compact?12:54,bottom=12,available=Math.max(120,innerHeight-top-bottom);
 // Landscape keeps the tuned 400-unit world height. Taller-than-wide screens grow the
 // world box instead of shrinking the picture, so portrait fills the screen too.
 baseVw=Math.max(500,innerWidth*400/available);baseVh=clamp(available*baseVw/innerWidth,400,1100);
 baseScale=Math.min(innerWidth/baseVw,available/baseVh);
 ox=(innerWidth-baseVw*baseScale)/2;oy=top+(available-baseVh*baseScale)/2;applyView();canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);}
addEventListener('resize',resize);if(window.visualViewport)visualViewport.addEventListener('resize',resize);
function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
function ground(x){x=clamp(x,0,L.length);const i=Math.min(terrain.length-2,Math.floor(x/40));return lerp(terrain[i],terrain[i+1],(x-i*40)/40)}
function makeWorld(){const rng=seeded(L.seed);obstacles=[];if(L.lost)obstacles=[
  {x:1940,w:280,h:90,type:'bridge',gap:190},{x:3420,y:245,w:880,h:275,type:'roof'},
  {x:3680,y:715,w:100,h:75,type:'rock'},{x:4090,y:520,w:90,h:70,type:'rock'},
  {x:4530,y:340,w:110,h:270,type:'pillar'},{x:5490,y:170,w:140,h:250,type:'rock'},
  {x:5780,y:475,w:100,h:165,type:'rock'},
  // KOPPARRYGGEN -> pad 9100. A picket of pillars: wide gaps, the gentle re-introduction.
  {x:7300,w:70,h:250,type:'pillar'},{x:7760,w:70,h:190,type:'pillar'},
  {x:8180,w:80,h:290,type:'pillar'},{x:8620,w:70,h:220,type:'pillar'},
  // FLODDALEN -> pad 11300. Low arches. Under is quick, over costs height and time.
  {x:9800,w:240,h:80,type:'bridge',gap:180},{x:10360,w:260,h:90,type:'bridge',gap:178},
  {x:10820,w:200,h:80,type:'bridge',gap:180},
  // FJALLSTATIONEN -> pad 13600. A slot: something above and something below, hold the line.
  {x:12100,w:90,h:230,type:'pillar'},{x:12420,w:420,h:150,type:'roof',gap:195},
  {x:12960,w:90,h:190,type:'pillar'},{x:13060,w:260,h:110,type:'bridge',gap:178},
  // LANGA PASSET -> pad 15800. The signature corridor: a long ceiling with teeth under it.
  {x:14300,w:600,h:200,type:'roof',gap:230},{x:14520,w:80,h:55,type:'pillar'},
  {x:14780,w:80,h:50,type:'pillar'},{x:15080,w:440,h:170,type:'roof',gap:225},
  {x:15300,w:80,h:52,type:'pillar'},
  // NORRA DALEN -> pad 18100. Open sky, tall pillars, and the wind decides when you may pass.
  {x:16600,w:80,h:330,type:'pillar'},{x:17140,w:80,h:270,type:'pillar'},
  {x:17660,w:80,h:360,type:'pillar'},
  // DEN OVERGIVNA BASEN -> pad 20400. Hangars and a mast; the gaps are square and unforgiving.
  {x:18900,w:340,h:130,type:'bridge',gap:180},{x:19420,w:100,h:330,type:'pillar'},
  {x:19760,w:280,h:140,type:'roof',gap:185},{x:20080,w:90,h:240,type:'pillar'},
  // FYRLEDEN -> pad 22800. Everything at once, but still fair.
  {x:21300,w:80,h:290,type:'pillar'},{x:21580,w:400,h:150,type:'roof',gap:182},
  {x:22020,w:80,h:250,type:'pillar'},{x:22260,w:260,h:110,type:'bridge',gap:180},
  // SISTA ANFLYGNINGEN -> the beacon. The narrowest gate on the route, with the most to lose.
  {x:23600,w:90,h:310,type:'pillar'},{x:23920,w:380,h:190,type:'roof',gap:176},
  {x:24380,w:90,h:270,type:'pillar'},{x:24500,w:260,h:100,type:'bridge',gap:178}
 ];if(L.theme==='jungle')obstacles=[{x:1810,y:425,w:1180,h:165,type:'roof'},{x:3230,y:405,w:110,h:205,type:'pillar'},{x:4420,y:360,w:140,h:250,type:'pillar'}];terrain=[];for(let x=0;x<=L.length+80;x+=40){let y=570+Math.sin(x*.002+L.seed)*58+Math.sin(x*.0062)*25+Math.sin(x*.015)*7;if(x<660)y=610;else if(x<850)y=lerp(610,y,(x-660)/190);if(L.cargo){const d=Math.abs(x-L.cargo.x),e=Math.abs(x-L.cargo.to);if(d<120)y=600;if(e<180)y=578}if(L.theme==='jungle'&&x>=1000&&x<=3580){if(x<1600)y=lerp(610,885,(x-1000)/600);else if(x<3020)y=885;else y=lerp(885,610,(x-3020)/560);}if(L.lost)y=lostTerrain(x,y);terrain.push(y)}for(const o of obstacles){
  if(o.type==='pillar'){
   o.y=ground(o.x+o.w*.5)-o.h;
   o.topW=o.w*(.5+hash(o.x)*.22);
   o.tx=o.x+(o.w-o.topW)*.5+(hash(o.x+7)-.5)*o.w*.3;
   continue;
  }
  // Stalactites hang into the passage, so they are part of the ceiling, not decoration below
  // it. The authored clearance is measured to their tips.
  if(o.type==='roof')o.drip=20;
  if(o.gap===undefined)continue;
  let highest=Infinity;
  for(let x=o.x;x<=o.x+o.w;x+=40)highest=Math.min(highest,ground(x));
  o.y=highest-o.gap-o.h-(o.drip||0);
 }scenery=[];for(let x=690;x<L.length-120;x+=40+rng()*95){scenery.push({x,y:ground(x),s:.7+rng()*1.1,type:rng()>.26?'tree':'rock',variant:rng(),depth:rng()})}if(L.theme==='jungle')for(const t of scenery)if(t.x>1810&&t.x<2990){t.type='rock';t.s*=.65;}clouds=Array.from({length:12},()=>({x:rng()*5000,y:45+rng()*240,w:130+rng()*190,a:.04+rng()*.07}));}
function newHeli(){return{x:390,z:0,vz:0,y:ground(390)-30.8,vx:0,vy:0,angle:0,av:0,collective:0,dir:1,hp:100,fuel:100,rockets:8,flares:4,heat:0,overheated:false,landed:true,airborne:false,rotor:0,spool:.25,turn:0,yaw:0,yawTarget:0,cyclic:0,bank:0,hitCd:0,rope:0,ropeAngle:0,ropeV:0,ropeNodes:[],ropeMount:null,ropeTension:0,ropeSupport:1,ropeTarget:null,carrying:0,delivered:0,hookX:390,hookY:ground(390)-4,dents:[],hoverY:0,brake:false,nearGround:0,compression:0};}
function loadLevel(i,play=true){lost.active=false;$('lostStatus').hidden=true;document.body?.classList.remove('lostMode');$('skipSchool').hidden=true;$('retrySchool').hidden=true;school={active:false,stage:0,hold:0};precision={hold:0,approach:0,fast:false,targets:new Set(),landings:new Set()};level=i;L={...levels[i],guns:[],boss:false,clear:false};if(!L.lost){L.brief='Flyg varsamt, hjälp besättningen och återvänd till basen.';L.objective=L.cargo?'Leverera lasten och rädda alla till basen.':'Rädda alla och återvänd till basen.';}makeWorld();
 stars=L.lost?lostShafts.map(x=>({x,y:ground(x)-60,taken:false})):[];
 heli=newHeli();time=0;score=0;zoom=1;applyView();for(const k in hudCache)delete hudCache[k];buildValleyRail();camera=0;cameraY=heli.y-vh*.5;shake=damageFlash=0;gunCd=rocketCd=flareCd=muzzle=0;unload=service=0;wind=0;missionKills=landings=crashHits=perfectPickups=0;hoverMode=false;tutorial=0;radioTimer=0;warningTimer=0;combo=0;comboTimer=0;hudTimer=0;
 people=L.people.map((x,j)=>({x,y:ground(x)-8,homeX:x,status:'waiting',phase:j*1.7}));enemies=L.guns.map((e,j)=>({...e,y:ground(e.x)-15,hp:e.type==='missile'?55:42,max:e.type==='missile'?55:42,cd:2+j*.7,aim:-Math.PI/2,flash:0,warn:0}));
 cargo=L.cargo?{x:L.cargo.x,y:ground(L.cargo.x)-14,status:'waiting',to:L.cargo.to}:null;
 boss=L.boss?{x:L.length-1100,y:210,hp:270,max:270,cd:1.8,missileCd:7,t:0,active:false,flash:0}:null;
 bullets=[];rockets=[];missiles=[];particles=[];smokes=[];bursts=[];decoys=[];texts=[];debris=[];clearInput();mode=play?'brief':'menu';$('menu').hidden=play;$('hud').hidden=!play;$('mobile').hidden=true;$('pauseBtn').hidden=!play;AudioState.sync();updateHUD();if(play)briefing();}
function radio(text,duration=5){$('radioText').textContent=text;radioTimer=duration;}
function popup(x,y,text,color='#e7c788'){texts.push({x,y,text,color,life:1.7});}
function addParticle(x,y,vx,vy,color,size=3,life=.7,kind='spark',z=0){if(particles.length>340)particles.shift();particles.push({x,y,z,vx,vy,color,size,life,max:life,kind,angle:rand(0,TAU)});}
function smoke(x,y,size=8,life=.7,color='#273643',z=0){if(smokes.length>120)smokes.shift();smokes.push({x,y,z,size,life,max:life,color,vx:rand(-12,12)});}
function explode(x,y,power=1,z=0){for(let i=0;i<28*power;i++){const a=rand(0,TAU),v=rand(40,240)*power;addParticle(x,y,Math.cos(a)*v,Math.sin(a)*v,i%3?'#eea155':'#fff0b5',rand(2,6)*power,rand(.35,1.1),'spark',z);}for(let i=0;i<7;i++)smoke(x+rand(-15,15),y+rand(-15,10),rand(10,25)*power,rand(1,2),'#293039',z);bursts.push({x,y,z,r:7,life:.45,max:.45,power});shake=Math.max(shake,7*power);AudioState.sfx('boom');}
function rotateLocal(x,y){const c=Math.cos(heli.angle),s=Math.sin(heli.angle);return{x:heli.x+x*c-y*s,y:heli.y+x*s+y*c};}
function projectHeliPoint(x,y,z,yaw,bank=0){const by=y*Math.cos(bank)-z*Math.sin(bank),bz=y*Math.sin(bank)+z*Math.cos(bank);y=by;z=bz;const c=Math.cos(yaw),sn=Math.sin(yaw),rx=x*c+z*sn,rz=-x*sn+z*c;return{x:rx+rz*.34,y:y-rz*.40,depth:rz-y*.40};}
function gearPoint(x,y,z,yaw,bank=0){const p=projectHeliPoint(x,y,z,yaw,bank),rz=-x*Math.sin(yaw)+(y*Math.sin(bank)+z*Math.cos(bank))*Math.cos(yaw);p.y+=rz*.40*clamp((y-14)/8,0,1);return p;}
function gearSupport(){const yaw=heli.turn>0?heli.yaw:(heli.dir===1?0:Math.PI),c=Math.cos(heli.angle),sn=Math.sin(heli.angle);let support=Infinity;for(const x of [-37,38])for(const z of [-25,25]){const p=gearPoint(x,30.8-heli.compression,z,yaw,heli.bank),px=p.x*c-p.y*sn,py=p.x*sn+p.y*c;support=Math.min(support,ground(heli.x+px)-py);}return support;}
function segmentBox(ax,ay,bx,by,o,pad=0){let lo=0,hi=1;for(const [a,b,mn,mx] of [[ax,bx,o.x-pad,o.x+o.w+pad],[ay,by,o.y-pad,o.y+o.h+pad]]){const d=b-a;if(Math.abs(d)<1e-8){if(a<mn||a>mx)return false;}else{const t=(mn-a)/d,u=(mx-a)/d;lo=Math.max(lo,Math.min(t,u));hi=Math.min(hi,Math.max(t,u));if(lo>hi)return false;}}return true;}
function blocked(ax,ay,bx,by){return obstacles.some(o=>segmentBox(ax,ay,bx,by,o));}
// Measured against the rendered sprite: cabin, skids, tail boom, fin, tail rotor, and the main
// rotor as a line of small circles, because a spinning disc is exactly as solid as it looks.
const HULL=[
 [ 47,-14,15],[ 26,-10,23],[ -3,-10,26],[-30,-13,21],   // nose, cabin, rear cabin
 [  0, 20,11],[-30, 21,10],[ 30, 21,10],                // skids
 [ 30,-37,11],[  0,-37,12],[-24,-37,11],                // cabin roof
 [-52,-22,13],[-72,-24,12],[-92,-25,11],[-105,-24,7],   // tail boom and tail rotor
 [-50,-60,12],                                          // vertical fin
 [-88,-47,6],[-59,-47,6],[-30,-47,6],[0,-47,6],[30,-47,6],[59,-47,6],[88,-47,6]];
function collideObstacles(dt){for(const o of obstacles){
  // Skip anything the craft cannot reach this tick before testing nineteen points against it.
  if(o.x-125>heli.x||o.x+o.w+125<heli.x)continue;for(const [lx,ly,r] of HULL){const p=rotateLocal(lx*(heli.dir===1?1:-1),ly);
   let ax=o.x,bx=o.x+o.w;
   if(o.type==='pillar'){const t=clamp((p.y-o.y)/o.h,0,1);ax=lerp(o.tx,o.x,t);bx=lerp(o.tx+o.topW,o.x+o.w,t);}
   const nx=clamp(p.x,ax,bx),ny=clamp(p.y,o.y,o.y+o.h+(o.drip||0));let dx=p.x-nx,dy=p.y-ny,d=Math.hypot(dx,dy);if(d>=r)continue;if(d<.001){const gaps=[p.x-o.x,o.x+o.w-p.x,p.y-o.y,o.y+o.h-p.y],m=Math.min(...gaps),j=gaps.indexOf(m);dx=j===0?-1:j===1?1:0;dy=j===2?-1:j===3?1:0;d=-m;}else{dx/=d;dy/=d;}const impact=Math.max(0,-heli.vx*dx-heli.vy*dy);heli.x+=dx*(r-d+.1);heli.y+=dy*(r-d+.1);if(impact>0){heli.vx+=dx*impact*1.15;heli.vy+=dy*impact*1.15;}heli.av*=.6;if(impact>18){if(L.lost)lost.reason='Rotorn eller skrovet slog i klippan. Bromsa tidigare och håll mer avstånd.';hitHeli(Math.min(42,6+impact*.16));addDent(lx,ly,clamp(impact/95,.2,1));smoke(p.x,p.y,6,.3,'#aeae89');}break;}}}
function weapon(){const yaw=heli.turn>0?heli.yaw:(heli.dir===1?0:Math.PI),p=projectHeliPoint(54,13,18,yaw,heli.bank),tip=projectHeliPoint(80,13,18,yaw,heli.bank),c=Math.cos(heli.angle),sn=Math.sin(heli.angle),dx=(tip.x-p.x)*c-(tip.y-p.y)*sn,dy=(tip.x-p.x)*sn+(tip.y-p.y)*c,n=Math.hypot(dx,dy)||1;return{x:heli.x+p.x*c-p.y*sn,y:heli.y+p.x*sn+p.y*c,dx:dx/n,dy:dy/n};}
function segmentDist(ax,ay,bx,by,x,y){let dx=bx-ax,dy=by-ay;const t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(ax+dx*t-x,ay+dy*t-y)}
// Record where the airframe was struck. Nearby hits deepen an existing dent instead of
// stacking decals, the way a panel keeps taking the same beating.
function addDent(lx,ly,severity){
 const d=heli.dents;
 if(Math.abs(lx)>58&&ly<-38){heli.rotorHurt=Math.min(1,(heli.rotorHurt||0)+severity*.8);lx=rand(-16,16);ly=-31;}
 lx=clamp(lx,-62,50);ly=clamp(ly,-33,24);
 for(const k of d)if(Math.hypot(k.x-lx,k.y-ly)<13){k.s=Math.min(1,k.s+severity*.55);return}
 if(d.length>13)d.shift();
 d.push({x:lx,y:ly,s:clamp(severity,.18,1),seed:Math.abs(lx*7.3+ly*3.1)%97});
}
function repairDents(amount){
 heli.rotorHurt=Math.max(0,(heli.rotorHurt||0)-amount);
 for(const k of heli.dents)k.s-=amount;
 heli.dents=heli.dents.filter(k=>k.s>.08);
}
function hitHeli(amount){if(heli.hitCd>0||mode!=='playing')return;heli.hp=clamp(heli.hp-amount,0,100);heli.hitCd=.18;damageFlash=.18;shake=Math.max(shake,5);for(let i=0;i<7;i++)addParticle(heli.x,heli.y,rand(-100,100),rand(-90,90),'#ffd09a',3,.5);AudioState.sfx('hit');if(heli.hp<=0)failMission();}
function damageEnemy(e,dmg){if(e.hp<=0)return;e.hp-=dmg;e.flash=.12;if(e.hp<=0){e.hp=0;missionKills++;combo=comboTimer>0?combo+1:1;comboTimer=8;const gain=250+Math.min(3,combo-1)*50;score+=gain;popup(e.x,e.y-35,'+'+gain);explode(e.x,e.y,1.15);debris.push({x:e.x,y:e.y,s:1,type:'tank'});if(enemies.every(v=>v.hp<=0)&&L.clear)radio('Korridoren är säkrad. Hämta besättningen och kom hem.');}else{for(let i=0;i<4;i++)addParticle(e.x+rand(-14,14),e.y-10,rand(-60,60),rand(-100,-20),'#efba7c',2,.4)}}
function updateCamera(dt){
 // Pull back as the craft climbs: enough world height for the floor to stay just inside the
 // bottom edge while the rotor keeps its clearance below the instrument rail. A little extra
 // at speed so fast passes see the next obstacle in time.
 const agl=Math.max(0,ground(heli.x)-heli.y-30.8),climbLead=Math.max(0,-heli.vy)*.9;
 const fit=(agl+climbLead+160)/(baseVh*.92)+clamp(Math.abs(heli.vx)/900,0,.18),want=clamp(fit,1,2);
 // Pull back fast enough to stay ahead of a hard climb, settle back in slowly so level
 // flight never breathes. Beyond the limit the floor is allowed to leave the frame.
 zoom=damp(zoom,want,want>zoom?3.4:1,dt);applyView();
 // Horizontal lead scales with the viewport so wide screens actually see further ahead.
 const look=clamp(heli.vx,-vw*.22,vw*.22);const targetCam=clamp(heli.x-vw*.43+look,0,Math.max(0,L.length-vw));camera=damp(camera,targetCam,1.85,dt);
 // Sit the craft just below centre for more sky, and lead the climb so altitude reads as motion.
 const rise=clamp(heli.vy*.55,-vh*.18,vh*.18);
 // Hold the valley floor near the bottom edge until the craft is genuinely far above it.
 // Keep the room below the craft roughly constant on screen, so a tall portrait box shows
 // more sky rather than more underground rock.
 const anchor=vh-Math.min(vh*.45,230*zoom);
 const targetY=Math.max(heli.y-anchor+rise,ground(heli.x)-vh*.92);
 camera=clamp(camera,heli.x-vw+130,heli.x-130);cameraY=damp(cameraY,targetY,2.5,dt);cameraY=clamp(cameraY,heli.y-vh+100,heli.y-120);
}
function fixedUpdate(dt){visualTime+=dt;updateEffects(dt);
 if(mode==='wreck'&&wreck){updateWreck(dt);return;}
 if(mode!=='playing'){if(mode==='menu'){heli.rotor+=dt*35;heli.y=290+Math.sin(visualTime*.7)*7;heli.x=vw*.72;heli.angle=Math.sin(visualTime*.5)*.025;}return;}time+=dt;radioTimer=Math.max(0,radioTimer-dt);warningTimer-=dt;comboTimer-=dt;gunCd-=dt;rocketCd-=dt;flareCd-=dt;muzzle=Math.max(0,muzzle-dt);heli.hitCd=Math.max(0,heli.hitCd-dt);heli.turn=Math.max(0,heli.turn-dt);if(heli.turn>0){const u=clamp(1-heli.turn/1.65,0,1),ease=u*u*u*(u*(u*6-15)+10);heli.yaw=lerp(heli.yawStart,heli.yawTarget,ease);}else heli.yaw=heli.yawTarget;wind=damp(wind,L.lost?lostWind().x:L.wind*(.5+Math.sin(time*.61)*.32+Math.sin(time*1.71)*.18),1.1,dt);
 const hands=touchAxes(),handsOn=coarse||touchFlight;let inputX=clamp((keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+hands.x+gyroInput(dt),-1,1),inputY=clamp((keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)+(keys.KeyW||keys.ArrowUp||keys.KeyS||keys.ArrowDown?0:handsOn?(hoverMode&&!hands.left&&!hands.right?0:hands.y):0),-1,1);
 inputX=clamp(inputX*save.sensitivity,-1,1);inputY=clamp(inputY*save.sensitivity,-1,1);
 heli.z=heli.vz=0;

 if(edges.KeyQ)requestFacing(-heli.dir);if(edges.KeyH){hoverMode=!hoverMode;heli.hoverY=heli.y;radio(hoverMode?'Stabilisering aktiv. Motluta för att stoppa sidledsdriften.':'Manuell flygning.',3)}
 if(Math.abs(inputY)>.12&&!edges.KeyH)hoverMode=false;
 const mass=1+heli.carrying*.028+(heli.ropeTarget?.kind==='cargo'?.28*heli.ropeSupport:heli.ropeTarget?.kind==='person'?.028*heli.ropeSupport:0);heli.cyclic=damp(heli.cyclic,inputX,5.4*save.sensitivity,dt);
 // Restore the first successful 2.5D flight spring and rotor response (00d64ca).
 const clearance=ground(heli.x)-heli.y-30.8,air=heli.landed?0:clamp(clearance/18,0,1),groundWash=clamp(1-clearance/115,0,1);
 const targetAngle=heli.cyclic*(hoverMode?.34:.84);
 const angularAccel=(targetAngle-heli.angle)*10.7-heli.av*5.7;
 heli.av+=angularAccel*dt;heli.angle=clamp(heli.angle+heli.av*dt,-.96,.96);
 heli.bank=damp(heli.bank,heli.landed?0:clamp(-heli.angle*.45-heli.av*.08,-.26,.26),2.7,dt);
 heli.compression=damp(heli.compression,0,5.5,dt);
 const gravity=315;let targetLift=gravity+inputY*215;if(heli.landed&&inputY<=.05)targetLift=0;
 if(hoverMode)targetLift=clamp(gravity+(heli.y-heli.hoverY)*2.7+heli.vy*3.2,80,520);
 if(!heli.fuel)targetLift=0;heli.collective=damp(heli.collective,targetLift,2.65,dt);
 let ax=Math.sin(heli.angle)*heli.collective/mass+wind-heli.vx*.23;
 let ay=gravity+(L.lost?lostWind().y:0)-Math.cos(heli.angle)*heli.collective/mass-heli.vy*.50;
 heli.vx=clamp(heli.vx+ax*dt,-310,310);heli.vy=clamp(heli.vy+ay*dt,-205,245);heli.x+=heli.vx*dt;heli.y+=heli.vy*dt;
 if(heli.x<90||heli.x>L.length-70){heli.x=clamp(heli.x,90,L.length-70);heli.vx*=-.2;}// Open sky: altitude is not limited by an invisible ceiling.

 let gy=gearSupport();const wasLanded=heli.landed;heli.landed=false;
 if(heli.y>=gy){const impact=Math.hypot(heli.vx*.55,heli.vy);if(!wasLanded&&heli.airborne){landings++;if(school.active&&school.stage===2){school.cleanLanding=impact<55&&Math.abs(heli.angle)<.2;if(!school.cleanLanding)radio('Lite för hårt. Lyft igen och sänk dig långsammare mot plattan.',5);}if(impact>87||Math.abs(heli.angle)>.34){const dmg=Math.min(65,(Math.max(0,impact-62)*.42)+Math.abs(heli.angle)*28);if(L.lost)lost.reason='För hög fart eller för stor lutning vid markkontakten.';hitHeli(dmg);addDent(rand(-30,34),22,clamp(impact/110,.2,.9));crashHits++;radio('Hård landning. Bromsa tidigt och räta upp före markkontakt.',4);smoke(heli.x,gy,25,1,'#6b6759');}else if(impact<38&&Math.abs(heli.angle)<.13){const landingKey=Math.round(heli.x/150);if(!precision.landings.has(landingKey)){precision.landings.add(landingKey);score+=75;popup(heli.x,heli.y-58,'MJUK LANDNING +75');}else popup(heli.x,heli.y-58,'MJUK LANDNING');}}if(!wasLanded)heli.compression=clamp(impact*.045,0,5.5);
 const slope=Math.atan2(ground(heli.x+38)-ground(heli.x-37),75);
 // The gear only takes up so much hill. Lying flat along a steep slope pointed the rotor at
 // the hillside instead of the sky, and since lift is cos(angle) of thrust, anything past
 // 53 degrees could not be powered out of at all: full collective is 530 against gravity 315.
 // Past the limit the craft rests on its downhill skid, nose or tail up, and can still fly.
 const rest=clamp(slope,-.42,.42);
 heli.angle=damp(heli.angle,rest,Math.abs(inputX)>.05?3:11,dt);heli.bank=damp(heli.bank,0,12,dt);
 gy=gearSupport();heli.y=gy;heli.vy=Math.min(heli.vy,0);heli.vx*=Math.exp(-3.5*dt);heli.av*=Math.exp(-3*dt);heli.landed=true;heli.airborne=false;
 }else if(gy-heli.y>12)heli.airborne=true;
 collideObstacles(dt);if(mode!=='playing')return;
 heli.spool=damp(heli.spool,heli.fuel?clamp(.45+heli.collective/700,.4,1):.1,2,dt);heli.rotor+=dt*(22+heli.spool*58);
 if(!heli.landed)heli.fuel=Math.max(0,heli.fuel-dt*(.105+heli.collective*.00032+(mass-1)*.18));
 heli.nearGround=ground(heli.x)-heli.y;
 if(heli.nearGround<155&&Math.random()<dt*32*heli.spool){const x=heli.x+rand(-70,70);addParticle(x,ground(x)-3,(x-heli.x)*2+heli.vx*.25,rand(-45,-12),L.theme==='snow'?'#d7e3e2a0':'#b6a27990',rand(3,8),rand(.3,.8),'dust');}
 if(heli.hp<35&&Math.random()<dt*11){
  const worst=heli.dents.reduce((a,b)=>!a||b.s>a.s?b:a,null);
  const p=worst?rotateLocal(worst.x*heli.dir,worst.y):{x:heli.x-heli.dir*13,y:heli.y-10};
  smoke(p.x,p.y,7,1.1,'#303539');
 }
 updateWinch(dt);updateBase(dt);if(mode!=='playing')return;
 updateProjectiles(dt);if(mode!=='playing')return;
 updateCamera(dt);
 if(heli.fuel===0&&heli.landed&&heli.x>620)failMission('Bränslet är slut. Återvänd till basen för påfyllning under längre uppdrag.');
 updateTraining(dt);updatePrecision(dt);updateTutorial();updateLost(dt);AudioState.update(dt);hudTimer-=dt;if(hudTimer<=0){updateHUD();hudTimer=.08;}for(const k in edges)delete edges[k];}
function winchMount(){const yaw=heli.turn>0?heli.yaw:(heli.dir===1?0:Math.PI),p=projectHeliPoint(-6,21,17,yaw,heli.bank);return rotateLocal(p.x,p.y);}
// A chain of point masses, integrated at the fixed 120 Hz game timestep.
// Unilateral distance constraints resist tension but allow slack; the hook and payload carry more mass.
function simulateRope(dt,mount){
 const h=heli,count=18,clearance=h.ropeTarget?.kind==='cargo'?48:h.ropeTarget?.kind==='person'?34:14;
 if(!h.ropeNodes.length){for(let i=0;i<=count;i++)h.ropeNodes.push({x:mount.x,y:mount.y+i*h.rope/count,px:mount.x,py:mount.y+i*h.rope/count});}
 const nodes=h.ropeNodes;
 if(h.rope<1.5&&!h.ropeTarget){for(const n of nodes){n.x=n.px=mount.x;n.y=n.py=mount.y;}h.hookX=mount.x;h.hookY=mount.y;h.ropeMount={...mount};h.ropeAngle=0;return;}
 // Resets are only needed for a discontinuous level/debug relocation, never for ordinary flight.
 if(h.ropeMount&&Math.hypot(mount.x-h.ropeMount.x,mount.y-h.ropeMount.y)>350){const dx=mount.x-h.ropeMount.x,dy=mount.y-h.ropeMount.y;for(const n of nodes){n.x+=dx;n.px+=dx;n.y+=dy;n.py+=dy;}}
 h.ropeMount={...mount};const seg=h.rope/count,last=nodes[count],load=h.ropeTarget?.kind,tipWeight=load==='cargo'?.045:load==='person'?.10:.36;
 for(let i=1;i<=count;i++){const n=nodes[i],vx=(n.x-n.px)*Math.exp(-.65*dt),vy=(n.y-n.py)*Math.exp(-.38*dt);n.px=n.x;n.py=n.y;const breeze=wind*(i===count?.3:2.8)+Math.sin(time*1.1+i*.61)*.4;n.x+=vx+breeze*dt*dt;n.y+=vy+315*dt*dt;}
 const pin=()=>{nodes[0].x=nodes[0].px=mount.x;nodes[0].y=nodes[0].py=mount.y;};
 const terrainContact=()=>{for(let i=1;i<=count;i++){const n=nodes[i];for(const o of obstacles){if(n.x>o.x&&n.x<o.x+o.w&&n.y>o.y&&n.y<o.y+o.h){const ds=[n.x-o.x,o.x+o.w-n.x,n.y-o.y,o.y+o.h-n.y],k=ds.indexOf(Math.min(...ds));if(k===0)n.x=o.x-1;if(k===1)n.x=o.x+o.w+1;if(k===2)n.y=o.y-1;if(k===3)n.y=o.y+o.h+1;n.px=n.x;n.py=n.y;}}const floor=ground(n.x)-(i===count?clearance:1);if(n.y>floor){const dx=n.x-n.px;n.y=floor;n.py=Math.min(n.py,n.y);n.px=n.x-dx*.80;}}};
 const constrain=i=>{const a=nodes[i],b=nodes[i+1],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<=seg||len<1e-8)return;const wa=i===0?0:1,wb=i+1===count?tipWeight:1,total=wa+wb,c=(len-seg)/len;a.x+=dx*c*wa/total;a.y+=dy*c*wa/total;b.x-=dx*c*wb/total;b.y-=dy*c*wb/total;};
 pin();let reach=Math.hypot(last.x-mount.x,last.y-mount.y);h.ropeTension=clamp((reach-h.rope+1)/4,0,1);
 // Long-range tether prevents accumulated numerical stretch with a heavy endpoint.
 if(reach>h.rope){last.x=mount.x+(last.x-mount.x)*h.rope/reach;last.y=mount.y+(last.y-mount.y)*h.rope/reach;}
 for(let pass=0;pass<32;pass++){pin();for(let i=0;i<count;i++)constrain(i);for(let i=count-1;i>=0;i--)constrain(i);terrainContact();}
 pin();const resting=last.y>=ground(last.x)-clearance-.6;h.ropeSupport=resting?clamp((Math.hypot(last.x-mount.x,last.y-mount.y)-h.rope*.97)/(Math.max(1,h.rope)*.03),0,1):1;h.hookX=last.x;h.hookY=last.y;const before=nodes[count-1];h.ropeAngle=Math.atan2(last.x-before.x,last.y-before.y);
 // Horizontal load reaction: the hanging mass tugs the aircraft toward the hook.
 if(load&&h.rope>12&&Math.hypot(last.x-mount.x,last.y-mount.y)>h.rope*.94){const pull=(last.x-mount.x)/Math.max(1,h.rope);h.vx+=pull*(load==='cargo'?34:9)*dt;}
}
function updateWinch(dt){const held=!!keys.KeyE,mount=winchMount(),h=heli;const minLength=h.ropeTarget?.kind==='cargo'?49:0;
 const target=held?185:minLength,speed=held?95:h.ropeTarget?.kind==='cargo'?62:112;
 h.rope+=clamp(target-h.rope,-speed*dt,speed*dt);h.rope=clamp(h.rope,0,185);simulateRope(dt,mount);
 if(held&&Math.abs(heli.z)<14&&!heli.ropeTarget&&heli.rope>20&&Math.abs(heli.vx)<72&&Math.abs(heli.vy)<72){const p=people.find(p=>p.status==='waiting'&&Math.hypot(p.x-heli.hookX,p.y-20-heli.hookY)<25);if(p){p.status='attached';heli.ropeTarget={kind:'person',ref:p};AudioState.sfx('attach');radio('Kontakt! Släpp vinschen för att hissa upp.',3)}else if(cargo&&cargo.status==='waiting'&&Math.hypot(cargo.x-heli.hookX,cargo.y-34-heli.hookY)<28){cargo.status='attached';heli.ropeTarget={kind:'cargo',ref:cargo};AudioState.sfx('attach');radio('Generator säkrad. Lasten gör oss tyngre. Håll extra lyftkraft.',5)}}
 if(heli.ropeTarget){const t=heli.ropeTarget.ref;t.x=heli.hookX;t.y=heli.hookY+(heli.ropeTarget.kind==='cargo'?35:24);if(heli.ropeTarget.kind==='person'&&!held&&heli.rope<14){t.status='aboard';heli.carrying++;heli.ropeTarget=null;score+=400;if(precision.hold>=1.2){perfectPickups++;score+=100;popup(heli.x,heli.y-62,'PRECISIONSRÄDDNING +500')}else popup(heli.x,heli.y-62,'OMBORD +400');AudioState.sfx('rescue');radio('Person ombord. '+(people.length-heli.carrying-heli.delivered)+' kvar att hämta.',4)}else if(heli.ropeTarget.kind==='cargo'){heli.rope=Math.max(49,heli.rope);if(held&&Math.abs(heli.z)<14&&Math.abs(t.x-t.to)<100&&Math.abs(heli.vx)<45&&Math.abs(heli.vy)<40&&t.y>=ground(t.to)-27){t.status='delivered';t.x=t.to;t.y=ground(t.to)-15;heli.ropeTarget=null;score+=1000;popup(t.x,t.y-42,'LEVERERAD +1 000');radio('Utposten har ström. Snygg leverans!',5);AudioState.sfx('rescue');}}}
 // A slow landing also allows boarding. No instant pickup while flying through survivors.
 if(heli.landed&&Math.abs(heli.z)<14&&Math.abs(heli.vx)<15){for(const p of people){if(p.status==='waiting'&&Math.abs(p.x-heli.x)<68){p.x=damp(p.x,heli.x,1.5,dt);if(Math.abs(p.x-heli.x)<16){p.status='aboard';heli.carrying++;score+=400;AudioState.sfx('rescue');radio('Person ombord. Lyft när du är redo.',3)}}}}
}
function ready(){return people.every(p=>p.status==='delivered')&&(!L.clear||enemies.every(e=>e.hp<=0))&&(!cargo||cargo.status==='delivered')&&(!boss||boss.hp<=0)}
function updateBase(dt){if(heli.landed&&Math.abs(heli.z)<14&&heli.x<610&&Math.abs(heli.vx)<20){service+=dt;heli.hp=Math.min(100,heli.hp+dt*11);heli.fuel=Math.min(100,heli.fuel+dt*17);if(service>1){heli.rockets=8;heli.flares=4;heli.heat=Math.max(0,heli.heat-dt*2);}if(heli.carrying>0){unload+=dt;if(unload>1.2){const n=heli.carrying;heli.delivered+=n;heli.carrying=0;people.forEach(p=>{if(p.status==='aboard')p.status='delivered'});score+=n*200;popup(heli.x,heli.y-60,'HEMMA +'+n*200);AudioState.sfx('rescue');radio('Besättningen är i säkerhet. Välkommen hem.',4)}}if(!school.active&&ready()&&service>1.5){if(L.lost)completeLost();else finishMission();};}else{service=0;unload=0;}}
function updateWeapons(dt){return;heli.heat=Math.max(0,heli.heat-dt*.19);if(heli.overheated&&heli.heat<.3)heli.overheated=false;const g=weapon();
 if(keys.Space&&gunCd<=0&&!heli.overheated&&heli.turn<.08){gunCd=.095;heli.heat=Math.min(1,heli.heat+.025);bullets.push({x:g.x,y:g.y,px:g.x,py:g.y,vx:g.dx*930,vy:g.dy*930,life:1.25,enemy:false,z:heli.z,vz:0});heli.vx-=g.dx*.43;heli.vy-=g.dy*.43;muzzle=.07;shake=Math.max(shake,.6);AudioState.sfx('gun');if(heli.heat>=1){heli.overheated=true;radio('Kanonen svalnar. Korta salvor håller temperaturen nere.',3)}}
 if(edges.KeyR&&rocketCd<=0&&heli.rockets>=1&&heli.turn<.08){rocketCd=.65;heli.rockets--;rockets.push({x:g.x,y:g.y+3,px:g.x,py:g.y+3,dx:g.dx,dy:g.dy,speed:260,z:heli.z,life:3.3,trail:0});heli.vx-=g.dx*6;heli.vy-=g.dy*6;heli.av-=heli.dir*.02;shake=Math.max(shake,2);AudioState.sfx('rocket');}
 if(edges.KeyF&&flareCd<=0&&heli.flares>=1){flareCd=2.7;heli.flares--;for(let i=0;i<7;i++){decoys.push({x:heli.x,y:heli.y+10,vx:heli.vx*.4+rand(-100,100),vy:rand(30,100),z:heli.z,life:3.1});}AudioState.sfx('flare');radio('Flares ute.',2);}}
function updateEnemies(dt){for(const e of enemies){if(e.hp<=0||e.training)continue;e.cd-=dt;e.flash=Math.max(0,e.flash-dt);const dx=heli.x-e.x,dy=heli.y-e.y;e.aim=Math.atan2(dy,dx);const distance=Math.hypot(dx,dy);e.warn=e.cd<.6&&distance<760?1:0;if(e.cd<=0&&distance<760&&heli.x>680&&!blocked(e.x,e.y-25,heli.x,heli.y)){if(e.type==='missile'){missiles.push({x:e.x,y:e.y-32,px:e.x,py:e.y-32,vx:0,vy:-100,life:7,trail:0,decoy:null});e.cd=5.5;radio('Missil i luften. Använd flares eller bryt undan.',3);}else{const speed=235;const lead=.35;const a=Math.atan2(dy+heli.vy*lead,dx+heli.vx*lead);bullets.push({x:e.x,y:e.y-22,px:e.x,py:e.y-22,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:4,enemy:true});e.cd=1.8+Math.random()*.5;e.flash=.12;}}}
 if(boss&&boss.hp>0){const b=boss;b.active=Math.abs(heli.x-b.x)<1150;if(b.active){b.t+=dt;b.x=damp(b.x,clamp(heli.x+heli.dir*420,L.length-2300,L.length-350),.42,dt);b.y=damp(b.y,clamp(heli.y-55+Math.sin(b.t*.8)*100,130,430),.5,dt);b.cd-=dt;b.missileCd-=dt;b.flash=Math.max(0,b.flash-dt);if(b.cd<=0){b.cd=b.hp<b.max*.4?1.2:1.9;let a=Math.atan2(heli.y-b.y,heli.x-b.x);for(let i=-1;i<=1;i++)bullets.push({x:b.x,y:b.y+12,px:b.x,py:b.y+12,vx:Math.cos(a+i*.13)*260,vy:Math.sin(a+i*.13)*260,life:4,enemy:true});b.flash=.14;}if(b.missileCd<=0){b.missileCd=7;missiles.push({x:b.x,y:b.y+25,px:b.x,py:b.y+25,vx:0,vy:70,life:7,trail:0,decoy:null});}}}}
function updateProjectiles(dt){for(const b of bullets){if(b.life<=0)continue;if(b.z===undefined){b.z=0;b.vz=b.enemy?(heli.z/Math.max(.1,Math.hypot(heli.x-b.x,heli.y-b.y)/Math.hypot(b.vx,b.vy))):0;}b.z+=(b.vz||0)*dt;b.px=b.x;b.py=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(blocked(b.px,b.py,b.x,b.y)){b.life=0;continue;}if(b.enemy){if(Math.abs(b.z-heli.z)<20&&segmentDist(b.px,b.py,b.x,b.y,heli.x,heli.y)<25){b.life=0;hitHeli(7)}}else{for(const e of enemies){if(e.hp>0&&Math.abs(b.z)<20&&segmentDist(b.px,b.py,b.x,b.y,e.x,e.y)<28){if(e.trainingWeapon!=='rocket')damageEnemy(e,7);else if(warningTimer<0){radio('Det bepansrade målet kräver en raket. Tryck R / RAKET.',3);warningTimer=4;}b.life=0;break}}if(b.life>0&&boss&&boss.hp>0&&Math.abs(b.z)<28&&segmentDist(b.px,b.py,b.x,b.y,boss.x,boss.y)<57){boss.hp=Math.max(0,boss.hp-4);boss.flash=.07;b.life=0;if(boss.hp<=0)killBoss();}}
 if(b.life>0&&b.y>ground(b.x)){b.life=0;for(let j=0;j<2;j++)addParticle(b.x,ground(b.x)-2,rand(-25,25),rand(-45,-10),'#a59679',2,.25)} }
 for(const r of rockets){if(r.life<=0)continue;r.px=r.x;r.py=r.y;r.speed=Math.min(820,r.speed+390*dt);r.x+=r.dx*r.speed*dt;r.y+=r.dy*r.speed*dt;r.life-=dt;r.trail-=dt;if(r.trail<=0){smoke(r.x-r.dx*9,r.y-r.dy*9,3,.45,'#bec4bb',r.z||0);r.trail=.045;}let impact=blocked(r.px,r.py,r.x,r.y)||r.y>=ground(r.x)||r.x<0||r.x>L.length;for(const e of enemies){if(e.hp>0&&Math.abs(r.z||0)<25&&segmentDist(r.px,r.py,r.x,r.y,e.x,e.y)<32)impact=true}if(boss&&boss.hp>0&&Math.abs(r.z||0)<35&&segmentDist(r.px,r.py,r.x,r.y,boss.x,boss.y)<62)impact=true;if(impact){r.life=0;explode(r.x,r.y,1,r.z||0);for(const e of enemies){const d=Math.hypot(e.x-r.x,e.y-r.y,r.z||0);if(e.hp>0&&d<105&&e.trainingWeapon!=='gun')damageEnemy(e,80*(1-d/150))}if(boss&&boss.hp>0&&Math.hypot(boss.x-r.x,boss.y-r.y,r.z||0)<115){boss.hp=Math.max(0,boss.hp-48);boss.flash=.2;if(boss.hp<=0)killBoss();}}}
 for(const m of missiles){if(m.life<=0)continue;m.life-=dt;m.z=m.z||0;m.vz=m.vz||0;if(!m.decoy){const f=decoys.find(f=>f.life>0&&Math.hypot(f.x-m.x,f.y-m.y,(f.z||0)-m.z)<420);if(f)m.decoy=f}const target=m.decoy||heli;let dx=target.x-m.x,dy=target.y-m.y,dz=(target.z||0)-m.z,len=Math.hypot(dx,dy,dz)||1;m.vz=damp(m.vz,dz/len*225,1.8,dt);m.z+=m.vz*dt;m.vx=damp(m.vx,dx/len*225,1.8,dt);m.vy=damp(m.vy,dy/len*225,1.8,dt);m.px=m.x;m.py=m.y;m.x+=m.vx*dt;m.y+=m.vy*dt;m.trail-=dt;if(m.trail<0){smoke(m.x,m.y,3,.45,'#b6beb8',m.z);m.trail=.05;}if(m.decoy&&len<22){m.life=0;explode(m.x,m.y,.45,m.z);score+=40;}else if(!m.decoy&&Math.abs(m.z-heli.z)<20&&segmentDist(m.px,m.py,m.x,m.y,heli.x,heli.y)<26){m.life=0;hitHeli(22);explode(m.x,m.y,.65,m.z)}if(blocked(m.px,m.py,m.x,m.y)||m.y>ground(m.x)){m.life=0;explode(m.x,m.y,.55,m.z)}}
 bullets=bullets.filter(b=>b.life>0&&b.y>-100);rockets=rockets.filter(r=>r.life>0&&r.y>-150);missiles=missiles.filter(m=>m.life>0);}
function killBoss(){explode(boss.x,boss.y,2.1);score+=2200;popup(boss.x,boss.y-55,'HEAVY GUNSHIP +2 200');radio('Gunship utslagen! Hämta de sista och kom hem.',6);for(let i=0;i<6;i++)debris.push({x:boss.x+rand(-50,50),y:boss.y,vx:rand(-100,100),vy:rand(-80,0),s:rand(.3,.7),type:'falling'});}
function updateEffects(dt){shake*=Math.exp(-6*dt);damageFlash=Math.max(0,damageFlash-dt);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.kind==='dust'?8:180)*dt;p.vx*=Math.exp(-.5*dt);p.life-=dt;p.angle+=dt*2;}particles=particles.filter(p=>p.life>0);for(const s of smokes){s.x+=(s.vx+wind*.4)*dt;s.y-=dt*18;s.size+=dt*16;s.life-=dt;}smokes=smokes.filter(s=>s.life>0);for(const b of bursts){b.r+=dt*100*b.power;b.life-=dt;}bursts=bursts.filter(b=>b.life>0);for(const f of decoys){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=55*dt;f.life-=dt;if(Math.random()<dt*25)addParticle(f.x,f.y,rand(-10,10),rand(-20,10),'#fff0b4',2,.35,'spark',f.z||0)}decoys=decoys.filter(f=>f.life>0);if(mode!=='playing'||school.active)for(const t of texts){t.y-=dt*25;t.life-=dt}texts=texts.filter(t=>t.life>0);for(const d of debris){
  if(d.type==='falling'){d.x+=d.vx*dt;d.y+=d.vy*dt;d.vy+=250*dt;if(d.y>ground(d.x)){d.y=ground(d.x);d.type='wreck';smoke(d.x,d.y,15,1.4);}}
  else if(d.type==='rotor'||d.type==='panel'){
   d.x+=d.vx*dt;d.y+=d.vy*dt;d.vy+=250*dt;d.vx-=d.vx*.35*dt;d.rot+=d.spin*dt;
   const g=ground(d.x);
   if(d.y>g){d.y=g;
    if(Math.abs(d.vy)>40){d.vy=-d.vy*.3;d.vx*=.6;d.spin*=.5;
     addParticle(d.x,g,rand(-60,60),rand(-50,-10),'#d8c79a',2,.35,'dust');}
    else{d.vy=0;d.vx*=Math.exp(-7*dt);d.spin*=Math.exp(-6*dt);d.type='rotorRest'===d.type?d.type:d.type;}
   }
  }
 }}
// Canvas world renderer: shared geometry is used for the helicopter, muzzle and flight reticle.
function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);ctx.fill()}
function label(text,x,y,color='#d7e5df',size=11,align='center'){
 if(mode==='playing'&&!school.active)return;
 ctx.save();const px=size*1.92/scale;ctx.font=`${size<12?'600':'500'} ${px}px ui-monospace,monospace`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(text,x,y);ctx.restore();ctx.textAlign='left'}
function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
function palette(){const night=L.theme==='night',snow=L.theme==='snow',sun=L.theme==='sunset';return{top:snow?'#b7cace':night?'#244251':sun?'#776345':'#57726c',edge:snow?'#e4eddf':night?'#547683':sun?'#b19361':'#9ea88a',front:snow?'#506776':night?'#142b3b':sun?'#433f36':'#304955',facet:snow?'#657e87':night?'#1c3543':sun?'#585044':'#3f5961',tree:snow?'#547879':night?'#1d3f4b':'#35645e',treeLight:snow?'#acc8c5':night?'#335666':'#577e6a',night,snow};}
// Keep the original 720-unit backdrop composition while the flight camera zooms in.
function drawBackdrop(){const flightHeight=vh;ctx.save();ctx.scale(1,flightHeight/720);try{vh=720;drawSky();drawAtmosphere();}finally{vh=flightHeight;ctx.restore();}}
function drawSky(){const p=palette(),g=ctx.createLinearGradient(0,0,0,vh);g.addColorStop(0,p.night?'#081426':L.theme==='storm'?'#263e50':'#718f9d');g.addColorStop(1,p.night?'#35516a':'#d2c1a0');ctx.fillStyle=g;ctx.fillRect(0,0,vw,vh);
 const image=L.theme==='jungle'?art.jungle:p.night||p.snow?art.night:art.day;if(image.complete&&image.naturalWidth){const iw=Math.max(vw+220,980*image.width/image.height),ih=iw*image.height/image.width;ctx.drawImage(image,-110-(camera/L.length)*70,-Math.max(0,ih-vh)*.29+clamp((heli.y-340)*.035,-12,12),iw,ih);}
 if(L.theme==='sunset'){ctx.fillStyle='#a05a2026';ctx.fillRect(0,0,vw,vh)}if(L.theme==='storm'){ctx.fillStyle='#18354e61';ctx.fillRect(0,0,vw,vh)}
 // Independent near ridges create parallax while the painted peaks remain far away.
 for(let layer=0;layer<2;layer++){const speed=.13+layer*.16,base=470+layer*65+clamp((heli.y-340)*.02,-6,6),pts=[[-50,vh+60]];for(let x=-50;x<vw+100;x+=85){const wx=x+camera*speed;pts.push([x,base+Math.sin(wx*.003+L.seed)*38+Math.sin(wx*.008)*22])}pts.push([vw+100,vh+60]);poly(pts,layer?(p.night?'#1c3846':'#42676599'):(p.night?'#324b6059':'#99b8b24f'));}
 const fog=ctx.createLinearGradient(0,370,0,620);fog.addColorStop(0,'#9dbfcb00');fog.addColorStop(.7,p.night?'#90bdd014':'#d2e0cd36');fog.addColorStop(1,'#a1b6b300');ctx.fillStyle=fog;ctx.fillRect(0,370,vw,250);
 for(const c of clouds){const x=((c.x-camera*.07+visualTime*3)%(vw+700)+vw+700)%(vw+700)-350;ellipse(x,c.y,c.w,16,p.night?'#bed9e006':'#d8e5e60b');}
}
function drawAtmosphere(){const p=palette(),sun=L.theme==='sunset',storm=L.theme==='storm';
 if(p.night){for(let i=0;i<48;i++){const x=((i*173.3-camera*.018)%vw+vw)%vw,y=30+(i*71.7)%230;ellipse(x,y,.7,.7,`rgba(205,225,235,${.15+.16*(1+Math.sin(visualTime*.5+i))})`);}}
 else if(!storm&&!p.snow){const x=vw*.76-camera*.025,y=sun?210:100;glow(x,y,180,sun?'#ffb95b26':'#fff3bc1c');ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<5;i++){const shift=Math.sin(visualTime*.13+i)*22;const g=ctx.createLinearGradient(x,y,x-220,600);g.addColorStop(0,'#fff2b60d');g.addColorStop(1,'#fff2b600');poly([[x+i*12,y],[x+i*12+14,y],[x-220+i*65+shift,610],[x-300+i*65+shift,610]],g);}ctx.restore();}
 for(let i=0;i<8;i++){const width=260+i%3*100,x=((i*487-camera*.11+visualTime*(4+i%3))%(vw+800)+vw+800)%(vw+800)-400,y=75+(i*47)%210;const g=ctx.createRadialGradient(x,y,1,x,y,width);g.addColorStop(0,p.night?'#8ab5d010':storm?'#142b425a':'#e7eff126');g.addColorStop(1,'#dae8ee00');ctx.save();ctx.translate(x,y);ctx.scale(1,.18);ctx.translate(-x,-y);ctx.fillStyle=g;ctx.fillRect(x-width,y-width,width*2,width*2);ctx.restore();}
 for(const band of [{speed:.30,base:548,scale:.72,tint:p.night?'#1f3d4766':'#3a625d5c',step:31},
                    {speed:.42,base:534,scale:1,tint:p.night?'#25495386':'#42696280',step:39}]){
  const first=Math.floor((camera*band.speed-60)/band.step);
  for(let i=first;i<first+Math.ceil(vw/band.step)+4;i++){
   const wx=i*band.step,seed=hash(wx*.37+L.seed);
   if(seed<.16)continue;                                   // clearings, so the row is not a fence
   const jitter=(hash(wx*.11)-.5)*band.step*.8;
   const x=wx-camera*band.speed+jitter;
   if(x<-40||x>vw+40)continue;
   const y=band.base+Math.sin(wx*.003+L.seed)*33+Math.sin(wx*.0009)*22;
   const h=(17+seed*34)*band.scale,w=(5.5+hash(wx*.71)*5)*band.scale;
   const sway=Math.sin(visualTime*.35+wx*.02)*band.scale*(band.speed>.35?1.1:.5);
   poly([[x-w,y],[x+w,y],[x+sway,y-h]],band.tint);
   poly([[x-w*.72,y-h*.34],[x+w*.72,y-h*.34],[x+sway*.7,y-h*1.18]],band.tint);
  }
 }
 for(let i=0;i<4;i++){const y=440+i*24+Math.sin(visualTime*.19+i)*9,x=vw*.5+Math.sin(visualTime*.07+i)*vw*.35;const g=ctx.createRadialGradient(x,y,0,x,y,vw*.6);g.addColorStop(0,p.night?'#badce90c':'#d7e5da17');g.addColorStop(1,'#cadfda00');ctx.save();ctx.translate(x,y);ctx.scale(1,.075);ctx.translate(-x,-y);ctx.fillStyle=g;ctx.fillRect(x-vw,y-vw,vw*2,vw*2);ctx.restore();}
}
function drawGroundDetail(){const p=palette();for(let x=Math.floor((camera-40)/16)*16;x<camera+vw+40;x+=16){if(x<680)continue;const y=ground(x),n=Math.sin(x*43.7),gust=Math.sin(visualTime*2+x*.03)*2+wind*.08,rotorWash=clamp(1-Math.abs(x-heli.x)/100,0,1)*clamp(1-(ground(heli.x)-heli.y)/150,0,1)*heli.spool*13*Math.sign(x-heli.x);for(let j=0;j<3;j++)line(x+j*3,y+1,x+j*3+gust+rotorWash,y-3-Math.abs(n)*7,p.snow?'#e2eddf77':'#a5b08a66',1);if(n>.5)ellipse(x+4,y+5,3,1.5,p.edge);}}
function drawTerrain(){const p=palette();const a=Math.max(0,Math.floor((camera-100)/40)),b=Math.min(terrain.length-1,Math.ceil((camera+vw+100)/40));const pts=[[a*40,1250]];for(let i=a;i<=b;i++)pts.push([i*40,terrain[i]]);pts.push([b*40,1250]);poly(pts,p.front);
 for(let i=a;i<b;i++){const x=i*40,y=terrain[i],ny=terrain[i+1],depth=50+Math.sin(i*2.75)*25;poly([[x,y+13],[x+40,ny+13],[x+30,ny+depth+50],[x-8,y+depth+70]],i%3===0?p.facet:p.front);if(i%2===0)poly([[x,y+22],[x+40,ny+14],[x+14,y+38]],p.facet);poly([[x,y],[x+40,ny],[x+40,ny+10],[x+27,ny+15],[x,y+11]],p.top);line(x,y,x+40,ny,p.edge,2);if(i%4===0){line(x+7,y+65,x+18,y+95,'#0a1e292a',2);line(x+18,y+95,x+44,y+108,'#0a1e292a',1)}}
 const g=ctx.createLinearGradient(0,900,0,1300);g.addColorStop(0,'#06192200');g.addColorStop(1,'#061922a0');ctx.fillStyle=g;ctx.fillRect(camera-20,900,vw+40,400);
}
function drawJungleTree(t){ctx.save();ctx.translate(t.x,t.y);ctx.scale(t.s,t.s);const sway=Math.sin(visualTime*1.2+t.x*.007)*3;poly([[-6,0],[5,0],[sway+7,-65],[sway+1,-94],[-2,-65]],'#4a6851');line(-1,0,sway+3,-77,'#a4ac6a',2);for(let j=0;j<7;j++){const a=j*TAU/7,xx=Math.cos(a)*27+sway,yy=-82+Math.sin(a)*16;ellipse(xx,yy,24,14,j%2?'#356e56':'#42896a');poly([[sway,-78],[xx-17,yy+3],[xx,yy-11],[xx+18,yy+4]],j%2?'#43866a':'#599975');line(sway,-76,xx+10,yy,'#a0b77855',1);}for(let j=0;j<3;j++){const x=sway-18+j*16;ctx.beginPath();ctx.moveTo(x,-76);ctx.quadraticCurveTo(x+12+Math.sin(visualTime+j)*3,-42,x-2,-14);ctx.strokeStyle='#6e935e';ctx.lineWidth=1.5;ctx.stroke();}ctx.restore();}
// --- Obstacle art -------------------------------------------------------------------------
// Every obstacle used to be the same tinted box with a green hat, whatever it was. Each type is
// now drawn as the thing it is: spires taper and catch the sunrise down one edge, spans have a
// deck and a truss you pass under, overhangs hang with weight and drip stalactites. Shapes are
// hashed off the world position, so they vary along the valley but never flicker between frames.
const hash=n=>{const s=Math.sin(n*127.1)*43758.5453;return s-Math.floor(s)};
const ROCK={lit:'#7d9384',mid:'#4c6a63',dark:'#28464b',deep:'#16303a',rim:'#c8b98a',
 moss:'#6d8f58',mossLit:'#8fae63',snow:'#dfeae4',shadow:'#0a1f2a3d'};

function groundShadow(o){const g=ground(o.x+o.w*.5);ellipse(o.x+o.w*.5,g+2,o.w*.62,7,ROCK.shadow);}

// All solid paint stays inside the existing collision footprint. Texture is deterministic:
// rendering must never consume simulation randomness or change the authored clearances.
function stoneFace(o,points,ceiling=false){
 const {x,y,w,h}=o,bottom=y+h+(o.drip||0);
 ctx.save();ctx.beginPath();points.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.clip();
 const shade=ctx.createLinearGradient(x,y,x+w,bottom);
 shade.addColorStop(0,ceiling?'#476561':'#819184');shade.addColorStop(.34,'#45615f');shade.addColorStop(1,'#172f3c');
 ctx.fillStyle=shade;ctx.fillRect(x,y,w,bottom-y);
 // Interlocking mineral planes vary in scale and direction, rather than repeating tiles.
 for(let j=0;j<Math.ceil((bottom-y)/65);j++){
  const sy=y+j*65;
  for(let i=0;i<Math.ceil(w/87)+1;i++){
   const seed=x+i*113+j*47,px=x+i*87-30+(j%2)*39;
   const peak=sy-14+hash(seed)*30,edge=px+48+hash(seed+4)*42;
   poly([[px,sy+10],[px+29,peak],[edge,sy+4],[edge+12,sy+51],[px+42,sy+77]],['#aec0a526','#061e3930','#90aa991c'][Math.floor(hash(seed+9)*3)]);
   line(px+3,sy+12,px+29,peak,'#cbd0aa2a',1);
   line(px+29,peak,edge,sy+4,'#0b243543',1.3);
   if(hash(seed+21)>.46){line(edge,sy+4,edge-13,sy+34,'#0b223555',1.4);line(edge-13,sy+34,edge-4,sy+48,'#0b223555',1);}
   for(let n=0;n<3;n++){const sx=px+hash(seed+n*19)*70,yy=sy+hash(seed+n*31)*62;ellipse(sx,yy,.7+hash(seed+n)*1.4,.65,'#c5cba527');}
  }
 }
 // Weathered upper ledge and a readable contact edge, all on the solid side.
 poly([[x,y],[x+w,y],[x+w,y+5],[x+w*.68,y+9],[x+w*.29,y+5],[x,y+11]],h>260&&L.theme!=='jungle'?ROCK.snow:ROCK.moss);
 ctx.strokeStyle='#d8d7b56b';ctx.lineWidth=3;ctx.beginPath();points.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.stroke();
 if(ceiling){
  ctx.fillStyle='#0b233a70';ctx.fillRect(x,bottom-12,w,12);
  for(let px=x;px<x+w;px+=31){const d=6+hash(px)*12;poly([[px,bottom-20],[px+23,bottom-20],[px+13,bottom-d]],'#75968b55');}
  line(x,bottom-1,x+w,bottom-1,'#acc3aa',2);
 }
 ctx.restore();
}
function drawPillar(o){
 groundShadow(o);
 stoneFace(o,[[o.tx,o.y],[o.tx+o.topW,o.y],[o.x+o.w,o.y+o.h],[o.x,o.y+o.h]]);
}
// A closed, riveted box girder: inset panels are solid metal, never apparent fly-through gaps.
function drawSpan(o){
 const {x,y,w,h}=o;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
 const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'#85918a');g.addColorStop(.12,'#44585b');g.addColorStop(.8,'#283e49');g.addColorStop(1,'#112a37');
 ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
 for(let px=x+5;px<x+w;px+=45){
  ctx.fillStyle='#152d384f';ctx.fillRect(px+4,y+12,33,h-24);
  line(px,y+8,px,y+h-7,'#8c9b8975',3);
  line(px+3,y+12,px+39,y+h-12,'#a5ac8b55',3);
  line(px+4,y+15,px+39,y+h-9,'#071e3b66',1);
  for(const yy of [y+6,y+h-6]){ellipse(px,yy,2.3,2.3,'#132c3a');ellipse(px-.5,yy-.6,1.2,1.2,'#c6c8ac');}
 }
 ctx.fillStyle='#a0a68c';ctx.fillRect(x,y,w,3);ctx.fillStyle='#91a59a';ctx.fillRect(x,y+h-3,w,2);
 for(const px of [x,x+w-10]){ctx.fillStyle='#253d46';ctx.fillRect(px,y,10,h);for(let yy=y+8;yy<y+h;yy+=17)poly([[px,yy],[px+10,yy-5],[px+10,yy+1],[px,yy+6]],'#c3a265');}
 ctx.restore();
}
function drawOverhang(o){stoneFace(o,[[o.x,o.y],[o.x+o.w,o.y],[o.x+o.w,o.y+o.h+(o.drip||0)],[o.x,o.y+o.h+(o.drip||0)]],true);}
// These authored obstacles collide as rectangular blocks: exposed cut stone makes that honest.
function drawBoulder(o){groundShadow(o);stoneFace(o,[[o.x,o.y],[o.x+o.w,o.y],[o.x+o.w,o.y+o.h],[o.x,o.y+o.h]]);}

function drawObstacles(){if(L.lost){const g=ctx.createLinearGradient(0,520,0,790);g.addColorStop(0,'#183039e8');g.addColorStop(1,'#34545188');ctx.fillStyle=g;ctx.fillRect(3420,520,880,270);}if(L.theme==='jungle'){const cave=ctx.createLinearGradient(0,590,0,885);cave.addColorStop(0,'#0c242cef');cave.addColorStop(1,'#224441b0');ctx.fillStyle=cave;ctx.fillRect(1810,590,1180,295);for(let x=1830;x<2990;x+=120){poly([[x,595],[x+50,640],[x+90,800],[x+30,875],[x-15,720]],'#50746724');}}for(const o of obstacles){
  if(o.x+o.w<camera-100||o.x>camera+vw+100)continue;
  if(o.type==='pillar')drawPillar(o);
  else if(o.type==='bridge')drawSpan(o);
  else if(o.type==='roof')drawOverhang(o);
  else drawBoulder(o);
  if(o.type==='roof'){
   // Lantern line under the lip: the passage should invite you in, then feel narrow.
   for(let x=o.x+40;x<o.x+o.w-20;x+=110){glow(x,o.y+o.h+9,20,'#7fe8d31e');ellipse(x,o.y+o.h+4,2,2,'#a6f0dc');}
   label('GROTTPASSAGE',o.x-85,o.y+o.h+60,'#a7ead8',12);label('→',o.x-70,o.y+o.h+88,'#a7ead8',24);
  }
 }if(L.theme==='jungle'){for(let x=1650;x<3050;x+=140){glow(x,ground(x)-4,30,'#68cfa914');ellipse(x,ground(x)-3,2,2,'#9decd0');}if(heli.x>1750&&heli.x<3050&&heli.y>590){glow(heli.x,heli.y,170,'#c5e2b60c');}}}
function drawTree(t){if(L.theme==='jungle'){drawJungleTree(t);return;}const p=palette();ctx.save();ctx.translate(t.x,t.y+2);ctx.scale(t.s,t.s);ctx.transform(1,0,Math.sin(visualTime*1.4+t.x*.03)*.014+wind*.001,1,0,0);ellipse(4,1,24,4,'#09273335');poly([[-4,0],[4,0],[2,-70],[-2,-70]],'#4b5c4e');line(-1,-5,-1,-57,'#8e987055',1);for(let j=0;j<5;j++){const y=-24-j*13,w=28-j*4.5,tip=y-28;const pts=[[-w,y+10],[-w*.66,y+2],[-w*.8,y+1],[-w*.42,y-10],[0,tip],[w*.43,y-9],[w*.77,y],[w*.62,y+2],[w,y+10],[w*.35,y+7],[0,y+13],[-w*.4,y+8]];poly(pts,p.tree);poly([[0,tip],[w*.43,y-9],[w*.77,y],[w*.62,y+2],[w,y+10],[w*.35,y+7],[0,y+13]],p.treeLight);line(0,tip+8,-w*.55,y+1,'#acc5992c',1);if(p.snow)poly([[-w*.6,y],[0,tip],[w*.48,y-1],[w*.2,y-4],[0,y+1],[-w*.18,y-5]],'#d6e4d8');}ctx.restore();}

function drawRock(t){const p=palette();ctx.save();ctx.translate(t.x,t.y);ctx.scale(t.s,t.s);ellipse(4,1,26,5,'#071e274a');poly([[-22,0],[-17,-18],[3,-29],[24,-12],[29,2]],p.facet);poly([[-17,-18],[3,-29],[6,-6],[-22,0]],p.edge);poly([[3,-29],[24,-12],[6,-6]],p.top);line(-11,-15,3,-12,'#c5c9a84a',1);line(3,-12,6,-6,'#122d3d66',1);poly([[-18,-5],[-9,-11],[4,-7],[-1,-3]],p.snow?'#dce8dd':'#6c8e6c');ctx.restore()}
function building(x,y,w,h,color='#425963'){ellipse(x+w*.55,y+4,w*.65,9,'#0a20265c');poly([[x,y-h],[x+15,y-h-12],[x+w+15,y-h-12],[x+w,y-h]],'#81918a');const wall=ctx.createLinearGradient(x,y-h,x,y);wall.addColorStop(0,color);wall.addColorStop(1,'#314d56');poly([[x,y-h],[x+w,y-h],[x+w,y],[x,y]],wall);poly([[x+w,y-h],[x+w+15,y-h-12],[x+w+15,y-12],[x+w,y]],'#263f4b');for(let u=x+10;u<x+w-7;u+=12){line(u,y-h+3,u,y-3,'#c5d6c528');line(u+1,y-h+3,u+1,y-3,'#0c263a33');ellipse(u,y-h+6,.8,.8,'#b7c8b5');}line(x,y-h,x+w,y-h,'#cfceb180',2);line(x,y-2,x+w,y-2,'#182f3f',3);poly([[x+w*.25,y-h-1],[x+w*.25+7,y-h-8],[x+w*.65+7,y-h-8],[x+w*.65,y-h-1]],'#294451');for(let j=0;j<4;j++)line(x+w*.29+j*9,y-h-1,x+w*.29+j*9+6,y-h-7,'#83a5b3',1);ctx.fillStyle='#d5c08a';ctx.fillRect(x+8,y-h+12,18,9);label('SAR',x+17,y-h+19,'#334749',6);}

function landingPad(x,width=140,active=true){const y=ground(x);poly([[x-width/2-10,y+12],[x-width/2+10,y-16],[x+width/2+10,y-16],[x+width/2-10,y+12]],'#8ba4a1');poly([[x-width/2-10,y+12],[x+width/2-10,y+12],[x+width/2-10,y+17],[x-width/2-10,y+17]],'#345561');line(x-13,y-3,x-10,y-10,'#e5e7cb',2);line(x+13,y-3,x+16,y-10,'#e5e7cb',2);line(x-11,y-7,x+15,y-7,'#e5e7cb',2);for(let xx=x-width/2;xx<=x+width/2;xx+=width/4){ellipse(xx,y-3,2.2,2,active?'#d7f9ce':'#edbf70');if(palette().night)glow(xx,y-3,14,'#a0e0c24f');}}
function drawBase(){const y=ground(300);building(100,y,132,68,'#526d70');poly([[100,y-68],[129,y-100],[228,y-100],[232,y-68]],'#708781');poly([[232,y-68],[228,y-100],[246,y-86],[246,y-10],[232,y]],'#314d58');ctx.fillStyle='#112b39';ctx.fillRect(147,y-48,70,48);line(149,y-46,215,y-46,'#d8be83',3);for(let x=103;x<136;x+=13){ctx.fillStyle='#a5c5c2';ctx.fillRect(x,y-45,8,15)}landingPad(390,174);landingPad(553,100);line(72,y,72,y-142,'#708c8d',3);line(72,y-142,88,y-130,'#839b91',2);const direction=wind>=0?1:-1;poly([[72,y-139],[72+direction*40,y-133+Math.sin(visualTime*3)*3],[72+direction*37,y-124+Math.sin(visualTime*3)*4],[72,y-128]],'#d99455');line(117,y-100,117,y-150,'#90a5a1',2);line(104,y-142,129,y-142,'#90a5a1',2);ellipse(117,y-151,2,2,Math.sin(visualTime*2)>0?'#efba7c':'#6a7063');label(L.lost?'EAGLE BASE':'FORWARD BASE',170,y-115,'#b8d5ce',10);label('SERVICE',390,y+28,'#a2c9bd',10);label('LANDNING',553,y+26,'#a2c9bd',9);
 if(heli.x<620&&heli.landed&&mode==='playing'){if(Math.abs(heli.x-400)<520)label(heli.carrying?'EVAKUERAR BESÄTTNING':'BRÄNSLE · REPARATION · AMMUNITION',400,y-90,'#d8e7bd',10);}}
function drawOutpost(){if(!cargo)return;const y=ground(cargo.to);building(cargo.to+140,y,100,63,'#4e636b');landingPad(cargo.to,170,cargo.status==='delivered');label(cargo.status==='delivered'?'GENERATOR LEVERERAD':'SÄTT NER GENERATORN',cargo.to,y-50,cargo.status==='delivered'?'#c5f0d0':'#edc888',11);if(cargo.status!=='delivered'){ctx.setLineDash([4,6]);line(cargo.to-65,y-33,cargo.to+65,y-33,'#efc8869a');ctx.setLineDash([])}}
function drawPerson(p){if(p.status==='aboard'||p.status==='delivered')return;const x=p.x,y=p.y;ctx.save();ctx.translate(x,y);const wave=Math.sin(visualTime*5+p.phase)*5;poly([[-8,-12],[-4,-15],[-4,1],[-9,-1]],'#465e52');ellipse(2,9,10,3,'#06151b50');poly([[-4,2],[0,2],[-1,10],[-5,10]],'#283c4b');poly([[2,2],[5,2],[7,10],[3,10]],'#1c303f');poly([[-6,-15],[5,-15],[7,3],[-5,3]],'#cc9e56');poly([[0,-15],[5,-15],[7,3],[0,3]],'#a5753e');ctx.fillStyle='#d2b496';ctx.fillRect(-3,-24,8,9);poly([[-4,-24],[1,-28],[6,-24],[6,-21],[-4,-21]],'#d7d1aa');line(-5,-12,-11,-21+wave,'#d6b284',3);line(6,-11,12,-21-wave,'#d6b284',3);line(-4,-8,5,-8,'#f5d080',2);line(0,-14,0,1,'#4f5b4c',1);ellipse(4,-20,1,1,'#293a39');line(-5,10,-1,10,'#122735',2);line(3,10,8,10,'#122735',2);ctx.restore();if(p.status==='waiting'){const pulse=.5+Math.sin(visualTime*2.5+p.phase)*.5;ctx.strokeStyle='#c9efd496';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,ground(x)+2,25+pulse*7,6,0,0,TAU);ctx.stroke();poly([[x-5,y-57],[x,y-51],[x+5,y-57]],'#c9efd4');label('SOS',x,y-66,'#d9f5d5',11);}}
function drawCargo(){if(!cargo)return;const c=cargo;ctx.save();ctx.translate(c.x,c.y);line(-7,-20,0,-26,'#d3c494',2);line(0,-26,8,-20,'#d3c494',2);if(c.status==='attached')ctx.rotate(heli.ropeAngle*.4);poly([[-18,-13],[-9,-21],[24,-21],[18,-13]],'#ddc487');poly([[-18,-13],[18,-13],[18,13],[-18,13]],'#b58e4d');poly([[18,-13],[24,-21],[24,7],[18,13]],'#705c3b');ctx.fillStyle='#4c594f';ctx.fillRect(-13,-7,9,14);line(-15,-11,-15,10,'#f6df9855',1);line(15,-11,15,10,'#54442b',1);for(let y=-5;y<6;y+=3)line(-12,y,-5,y,'#151f26',1);ctx.fillStyle='#ddd3aa';ctx.fillRect(4,-5,8,8);line(-15,8,14,8,'#e4cc86',2);for(const x of [-12,11]){ellipse(x,-10,1,1,'#f3d79b');ellipse(x,10,1,1,'#463e30');}label('PWR',7,5,'#443e2c',5);ctx.restore();if(c.status==='waiting'){label('GENERATOR',c.x,c.y-48,'#edcc8d',11);poly([[c.x-4,c.y-38],[c.x,c.y-33],[c.x+4,c.y-38]],'#edcc8d')}}
function drawEnemy(e){const dead=e.hp<=0;ctx.save();ctx.translate(e.x,e.y);ellipse(6,17,43,8,'#06131b66');poly([[-34,3],[-26,-7],[28,-7],[39,4],[33,16],[-31,16]],dead?'#263b43':'#263844');for(let i=-23;i<=25;i+=12){ellipse(i,9,5,5,dead?'#344852':'#57605a');ellipse(i,9,2,2,'#1e303b')}for(let i=-27;i<30;i+=6)line(i,16,i+3,17,'#879486',1);const col=dead?'#415057':e.flash>0?'#e5b886':'#817b60';poly([[-30,-8],[-20,-17],[26,-17],[33,-6],[30,4],[-29,4]],col);poly([[-20,-17],[26,-17],[19,-25],[-13,-25]],dead?'#3d4d55':'#a4a084');poly([[26,-17],[33,-6],[30,4],[23,-2]],'#4b5551');if(!dead){if(e.type==='missile'){ctx.save();ctx.translate(1,-23);ctx.rotate(-.7);ctx.fillStyle='#d0c7a0';ctx.fillRect(-17,-6,37,12);ctx.fillStyle='#384d53';ctx.fillRect(13,-7,9,14);ctx.restore()}else{ellipse(0,-20,15,8,'#727c68');ctx.save();ctx.translate(0,-23);ctx.rotate(e.aim);ctx.fillStyle='#293c45';ctx.fillRect(0,-3,35,6);ctx.fillStyle='#a2aa89';ctx.fillRect(6,-4,13,8);if(e.flash>0)poly([[34,-6],[48,0],[34,6],[38,0]],'#ffe7aa');ctx.restore();}ctx.fillStyle='#cc8b65';ctx.fillRect(-23,-10,8,3);for(const x of [-18,-7,4,15])line(x,-13,x+5,-13,'#d0c59c',1);line(-22,-5,24,-5,'#252f30',1);ellipse(22,-2,2,2,'#f3d69c');line(-20,-17,-22,-49,'#64746c',1);ellipse(-22,-49,1,1,'#ddba79');if(e.warn)glow(0,-29,22,'#ef916a5a');}ctx.restore();if(!dead){const y=e.y-62;line(e.x-23,y,e.x+23,y,'#263c4899',3);line(e.x-23,y,e.x-23+46*e.hp/e.max,y,'#e4a17b',3);}}
// Impact damage, car-game style: a crumpled shadow where the panel took it, torn metal on the
// struck side, scratches raked along the airframe, and soot once it is deep enough to matter.
function drawDents(dir){
 if(!heli.dents||!heli.dents.length)return;
 ctx.save();
 for(const k of heli.dents){
  const x=k.x*dir,y=k.y,r=2.4+k.s*4.4,shade=hash(k.seed);
  ctx.save();ctx.translate(x,y);
  const pts=[];
  for(let i=0;i<7;i++){const ang=i/7*TAU,rr=r*(.5+hash(k.seed+i*3)*.8);
   pts.push([Math.cos(ang)*rr,Math.sin(ang)*rr*.72]);}
  poly(pts,'rgba(19,31,38,'+(.26+k.s*.4).toFixed(2)+')');
  // A bright torn lip on one side reads as bent metal rather than a smudge.
  poly([pts[0],pts[1],pts[2],[0,0]],'rgba(198,208,203,'+(.16+k.s*.3).toFixed(2)+')');
  for(let i=0;i<2+Math.round(k.s*3);i++){
   const ang=(hash(k.seed+i*5)-.5)*1.5,len=r*(.5+hash(k.seed+i*2)*.8);
   line(0,0,Math.cos(ang)*len*dir,Math.sin(ang)*len*.5,'rgba(26,38,45,.42)',1);
  }
  if(k.s>.62){
   poly(pts.slice(2,6),'rgba(38,30,26,'+(.3+shade*.2).toFixed(2)+')');
   ellipse(0,0,r*.34,r*.26,'rgba(12,16,18,.6)');
  }
  ctx.restore();
 }
 ctx.restore();
}
function heliBody(x,y,a,dir,t=0,isBoss=false){
 ctx.save();ctx.translate(x,y);ctx.rotate(a);if(isBoss)ctx.scale(1.55,1.4);
 const yaw=isBoss?(dir===1?0:Math.PI):heli.turn>0?heli.yaw:(dir===1?0:Math.PI),faces=[];
 let drawingGear=false;
 const crush=p=>{
  if(isBoss||!heli.dents||!heli.dents.length)return p;
  let ox=0,oy=0;
  for(const k of heli.dents){
   const kx=k.x*dir,ky=k.y,d=Math.hypot(p.x-kx,p.y-ky),R=11+k.s*16;
   if(d>R||d<.01)continue;
   const pull=k.s*4.6*(1-d/R);
   ox+=(kx-p.x)/d*pull;oy+=(ky-p.y)/d*pull;
  }
  p.x+=ox;p.y+=oy;return p;
 };
 const point=v=>crush((drawingGear?gearPoint:projectHeliPoint)(v[0],v[1],v[2],yaw,isBoss?Math.sin(boss.t*.7)*.1:heli.bank));
 function face(v,color,shine=0){const pp=v.map(point);faces.push({pp,z:pp.reduce((sum,p)=>sum+p.depth,0)/pp.length,color,shine});}
 function box(x1,y1,z1,x2,y2,z2,color,top,side){
  face([[x1,y1,z1],[x2,y1,z1],[x2,y2,z1],[x1,y2,z1]],side||color);
  face([[x1,y1,z2],[x2,y1,z2],[x2,y2,z2],[x1,y2,z2]],color);
  face([[x1,y1,z1],[x2,y1,z1],[x2,y1,z2],[x1,y1,z2]],top||color);
  face([[x1,y2,z1],[x2,y2,z1],[x2,y2,z2],[x1,y2,z2]],'#253c46');
  face([[x1,y1,z1],[x1,y1,z2],[x1,y2,z2],[x1,y2,z1]],side||color);
  face([[x2,y1,z1],[x2,y1,z2],[x2,y2,z2],[x2,y2,z1]],top||color);
 }
 function tube(a,b,r=1.8){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz)||1,d=[dx/len,dy/len,dz/len],ref=Math.abs(d[1])<.9?[0,1,0]:[0,0,1],u=[d[1]*ref[2]-d[2]*ref[1],d[2]*ref[0]-d[0]*ref[2],d[0]*ref[1]-d[1]*ref[0]],ul=Math.hypot(...u)||1;for(let j=0;j<3;j++)u[j]/=ul;const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]],ra=[],rb=[];for(let j=0;j<8;j++){const ang=j*TAU/8,off=u.map((q,k)=>r*(q*Math.cos(ang)+v[k]*Math.sin(ang)));ra.push(a.map((q,k)=>q+off[k]));rb.push(b.map((q,k)=>q+off[k]));}for(let j=0;j<8;j++)face([ra[j],rb[j],rb[(j+1)%8],ra[(j+1)%8]],['#d1dad0','#a1b7b4','#6b898e','#385c6b','#244554','#365968','#64868d','#b7c9c0'][j]);face(ra,'#5c7f87');face(rb,'#6a8c91');}
 const hit=isBoss?boss?.flash>0:heli.hitCd>0,cream=hit?'#efe2bd':isBoss?'#637780':'#c3cfba',dark=isBoss?'#3c515d':'#647f7b',top=isBoss?'#87989d':'#e1dfbf',stripe=isBoss?'#8d795f':'#dba04f';
 // Faceted cross-sections form a true volume, with cabin, rounded nose and a tapered tail.
 const rings=[[-42,-12,9,9],[-29,-22,18,19],[10,-24,19,21],[31,-15,17,18],[48,-2,11,11],[54,6,9,5]];
 function ring(r){const [xx,yt,yb,w]=r;return[[xx,yt,-w*.55],[xx,yt,w*.55],[xx,yt+6,w],[xx,yb-5,w],[xx,yb,w*.6],[xx,yb,-w*.6],[xx,yb-5,-w],[xx,yt+6,-w]];}
 for(let i=0;i<rings.length-1;i++){const r=ring(rings[i]),n=ring(rings[i+1]);for(let j=0;j<8;j++){const k=(j+1)%8;face([r[j],n[j],n[k],r[k]],[top,cream,cream,dark,'#354e58','#3f5b63',dark,top][j]);}}
 face(ring(rings[0]),dark);face(ring(rings[rings.length-1]),dark);
 // Both side doors and glass exist in the model, so a turn reveals the far side naturally.
 for(const sign of [-1,1]){
  const z=20*sign;
  face([[-27,-16,z],[-2,-19,z+sign],[0,-2,z+sign],[-27,-1,z]],'#244b5d');
  face([[-26,-15,z+.1*sign],[-3,-18,z+1.1*sign],[-2,-12,z+1.1*sign],[-26,-8,z+.1*sign]],'#86b5bc');
  face([[3,-19,21*sign],[20,-17,20*sign],[27,-4,19*sign],[4,-3,21*sign]],'#234d62');
  face([[5,-18,21.1*sign],[19,-16,20.1*sign],[23,-9,19.8*sign],[5,-11,21.1*sign]],'#82b5bc');
  face([[24,-15,18.2*sign],[38,-8,16*sign],[47,0,11.5*sign],[29,-2,18.7*sign]],'#1a425a');
  face([[25,-14,18.3*sign],[36,-8,16.2*sign],[40,-4,15*sign],[29,-7,18.5*sign]],'#b0d2cd');
  face([[-32,2,18.1*sign],[11,1,21.2*sign],[31,3,17.8*sign],[44,7,12*sign],[36,13,16*sign],[-30,11,18*sign]],stripe);
  box(-30,-18,z,-28,14,z+sign*.8,dark,top,dark);box(-1,-21,z,1,15,z+sign*.8,dark,top,dark);
  box(-9,1,21*sign,-3,2.5,22*sign,'#edf0d0');
  drawingGear=true;const compression=isBoss?0:heli.compression;
  const gearTube=(a,b,r)=>tube([a[0],a[1]-(a[1]>20?compression:0),a[2]],[b[0],b[1]-(b[1]>20?compression:0),b[2]],r);
  const gearBox=(x1,y1,z1,x2,y2,z2,...colors)=>box(x1,y1-compression,z1,x2,y2-compression,z2,...colors);
  // Landing gear has real separation across depth, rather than coincident screen lines.
  gearTube([-22,14,sign*13],[-26,28.7,sign*25],1.9);
  gearTube([22,14,sign*13],[28,28.7,sign*25],1.9);
  const rail=[[-43,25,sign*25],[-37,29,sign*25],[38,29,sign*25],[47,25,sign*25],[51,20,sign*25]];
  for(let k=0;k<rail.length-1;k++)gearTube(rail[k],rail[k+1],1.8);
  gearBox(-27,26.3,sign*23.5,-24,29.4,sign*26.5,'#476977','#aabeb7');
  gearBox(26,26.3,sign*23.5,29,29.4,sign*26.5,'#476977','#aabeb7');drawingGear=false;

 }
 for(const sign of [-1,1]){for(const xx of [-24,-16,-8,6,14]){const yy=8,zz=21.3*sign;face([[xx,yy,zz],[xx+1,yy,zz],[xx+1,yy+1,zz],[xx,yy+1,zz]],'#e6e4be');}box(-34,-10,18*sign,-32,6,18.5*sign,'#476772','#75998f');}
 // Tapered tail boom, stabilizers, engine housing and exhaust.
 face([[-39,-11,-7],[-101,-17,-3],[-101,-10,3],[-39,7,8]],dark);
 face([[-39,-11,7],[-101,-17,3],[-101,-10,3],[-39,7,8]],'#799389');
 face([[-39,-11,-7],[-101,-17,-3],[-101,-17,3],[-39,-11,7]],top);
 box(-101,-18,-22,-86,-15,22,dark,top);box(-103,-44,-2,-96,-10,2,'#a4b8a8',top,dark);
 box(-22,-29,-12,12,-23,12,'#728e85',top);box(-19,-35,-8,5,-29,8,'#91a294','#d7d8b9');
 box(-26,-30,-6,-18,-25,6,'#263f4b','#596f70');box(-3,-47,-2,1,-34,2,'#6d8586','#d0d5b5');
 // Barrel shares its exact origin with weapon().
 
 const rotor=isBoss?visualTime*55:heli.rotor;
 for(let blade=0;blade<2;blade++){const ang=rotor+blade*Math.PI,c=Math.cos(ang),sn=Math.sin(ang),r1=5,r2=91,w=2.4;face([[c*r1-sn*w,-47,sn*r1+c*w],[c*r2-sn*w,-47,sn*r2+c*w],[c*r2+sn*w,-47,sn*r2-c*w],[c*r1+sn*w,-47,sn*r1-c*w]],'#314d59d9');}
 // Painter sorting keeps roof, skids, windows and blades in the correct depth order.
 faces.sort((a,b)=>a.z-b.z);for(const f of faces){const pts=f.pp.map(p=>[p.x,p.y]);poly(pts,f.color);if(f.color.length===7){const ys=f.pp.map(p=>p.y),topY=Math.min(...ys),bottomY=Math.max(...ys);if(bottomY-topY>4){const light=ctx.createLinearGradient(-30,topY,45,bottomY);light.addColorStop(0,'#fff2c51c');light.addColorStop(.5,'#fff2c500');light.addColorStop(1,'#041b2927');poly(pts,light);}}}
 if(!isBoss)drawDents(dir);
 const bent=isBoss?0:(heli.rotorHurt||0);
 const disk=[];for(let j=0;j<=40;j++){const ang=j/40*TAU,wob=1-bent*.09*Math.abs(Math.sin(ang*2+rotor*.3));
  const p=point([Math.cos(ang)*92*wob,-47+bent*Math.sin(ang*2+rotor*.3)*3.5,Math.sin(ang)*92*wob]);disk.push([p.x,p.y]);}
 poly(disk,bent>.25?'#e1efdf07':'#e1efdf0b');if(!reduceMotion){for(let j=0;j<3;j++){ctx.beginPath();for(let k=0;k<14;k++){const ang=rotor*.3+j*TAU/3+k*.042,p=point([Math.cos(ang)*88,-47,Math.sin(ang)*88]);k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)}ctx.strokeStyle='#dce9ce25';ctx.lineWidth=1.2;ctx.stroke();}}
 const hub=point([-1,-48,0]);ellipse(hub.x,hub.y,5,2.6,'#c9d4b8');
 const tail=point([-100,-22,4]);ctx.save();ctx.translate(tail.x,tail.y);ctx.rotate(rotor*1.9);line(-12,0,12,0,'#173947',2);line(0,-12,0,12,'#173947',2);ctx.restore();ellipse(tail.x,tail.y,13,13,'#c7ded00d');
 const lamp=point([-26,-24,16]);ellipse(lamp.x,lamp.y,2.2,2.2,Math.sin(visualTime*4)>0?'#ed9b79':'#815e53');
 const side=point([-20,9,Math.cos(yaw)>=0?21:-21]);if(Math.abs(Math.cos(yaw))>.65){ctx.save();ctx.translate(side.x,side.y);ctx.textAlign=dir===1?'left':'right';ctx.font='bold 5px monospace';ctx.fillStyle='#f6e6be';ctx.fillText(isBoss?'MK–IV':'SAR–07',0,0);ctx.restore();}
 ctx.restore();
}
function drawHeli(){if(mode==='failed')return;const h=heli,alt=ground(h.x)-h.y;ellipse(h.x,ground(h.x)+5,clamp(72-alt*.08,24,72),clamp(10-alt*.01,4,10),'#061b2550');
 if(h.rope>1.5&&h.ropeNodes.length){
  const nodes=h.ropeNodes;ctx.lineCap='round';ctx.lineJoin='round';
  for(const [color,width] of [['#071b28b0',3.7],['#b5c5ba',1.8],['#ecedcf88',.65]]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(nodes[0].x,nodes[0].y);for(let i=1;i<nodes.length;i++)ctx.lineTo(nodes[i].x,nodes[i].y);ctx.stroke();}
  ctx.save();ctx.translate(h.hookX,h.hookY);ctx.rotate(-h.ropeAngle);
  const hookPath=()=>{ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(0,7);ctx.bezierCurveTo(0,16,13,15,10,7);ctx.lineTo(8,9);};
  ctx.strokeStyle='#071b26';ctx.lineWidth=4.5;hookPath();ctx.stroke();ctx.strokeStyle='#d2c6a1';ctx.lineWidth=2.3;hookPath();ctx.stroke();
  ellipse(0,0,3.4,3.4,'#8ba19a');ellipse(0,0,1.5,1.5,'#173340');line(-2,3,2,3,'#e4bf73',2.5);
  if(h.ropeTarget)line(1,3,10,7,'#c4d4c4',1.2);ctx.restore();ctx.lineCap='butt';ctx.lineJoin='miter';
 }

 if((palette().night||hoverMode||keys.KeyE)&&alt>50){const mount=rotateLocal(20,13),g=ctx.createLinearGradient(0,mount.y,0,ground(h.x));g.addColorStop(0,'#fff4b910');g.addColorStop(1,'#fff4b92b');poly([[mount.x,mount.y],[h.x+80,ground(h.x+80)],[h.x-60,ground(h.x-60)]],g);ellipse(h.x+10,ground(h.x)+2,72,6,'#efdb9933');}
 if(h.landed){const yaw=h.turn>0?h.yaw:(h.dir===1?0:Math.PI);for(const z of [-25,25]){const a=gearPoint(-37,30.8-h.compression,z,yaw,h.bank),b=gearPoint(38,30.8-h.compression,z,yaw,h.bank),aa=rotateLocal(a.x,a.y),bb=rotateLocal(b.x,b.y);line(aa.x,aa.y+1,bb.x,bb.y+1,'#061b28b0',3);}}heliBody(h.x,h.y,h.angle,h.dir);if(mode==='playing'){const g=weapon();if(muzzle>0){ctx.save();ctx.translate(g.x,g.y);ctx.rotate(Math.atan2(g.dy,g.dx));poly([[0,-3],[17,-8],[10,-1],[31,0],[10,3],[18,8],[0,4]],'#ffe3a0');ctx.restore();glow(g.x,g.y,27,'#ffe2ac55');}
 // Manual reticle follows exactly the same transformed vector as bullets and rockets.
 if(hoverMode)label('STAB',h.x,h.y-65,'#c3e9d2',9);}}
// Working guide for the winch, drawn at the hook where the pilot is already looking:
// how much rope is out, whether a survivor is inside the pickup ring, and whether the
// craft is steady enough for the hook to take.
function drawWinchGuides(){
 if(mode!=='playing'||heli.rope<6)return;
 const hx=heli.hookX,hy=heli.hookY,steady=Math.abs(heli.vx)<72&&Math.abs(heli.vy)<72;
 let reach=null,best=Infinity;
 for(const p of people){if(p.status!=='waiting')continue;const d=Math.hypot(p.x-hx,p.y-20-hy);if(d<95&&d<best){best=d;reach={x:p.x,y:p.y-20,r:25,d}}}
 if(!reach&&cargo?.status==='waiting'){const d=Math.hypot(cargo.x-hx,cargo.y-34-hy);if(d<105)reach={x:cargo.x,y:cargo.y-34,r:28,d}}
 if(reach&&!heli.ropeTarget){
  const close=reach.d<reach.r;
  ctx.save();ctx.setLineDash(close?[]:[5,6]);
  ctx.strokeStyle=close?(steady?'#b9e1cbe0':'#f4bf79e0'):'#c8dfd970';ctx.lineWidth=close?2:1;
  ctx.beginPath();ctx.arc(reach.x,reach.y,reach.r,0,TAU);ctx.stroke();ctx.restore();
  if(close){glow(reach.x,reach.y,34,steady?'#9fe0bd26':'#f4bf7926');
   if(!steady)hookNote('HÅLL STILLA',reach.x,reach.y-reach.r-11,'#f6cd93','center');}
  else hookNote(Math.round(reach.d*.45)+' m',reach.x,reach.y-reach.r-11,'#c8dfd9aa','center');
 }
 const held=heli.ropeTarget?.kind;
 hookNote(held==='cargo'?'LAST · SÄNK VID MÅLET':held?'SLÄPP VINSCHEN · HISSA':Math.round(heli.rope*.45)+' m',
  hx+15,hy+4,held?'#bfe6cf':'#cfe2ddcc','left');
}
function hookNote(text,x,y,color,align){ctx.font='600 11px ui-monospace,monospace';ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();ctx.textAlign='center';}

// Screen-space flight instruments: an altitude ladder pinned to the right edge, reading the
// same height above ground as the rail, plus a warm wash when the skids get close.
function drawFlightInstruments(){
 if(mode!=='playing')return;
 const gy=ground(heli.x),agl=gy-heli.y-30.8;
 if(!heli.landed&&agl<70&&agl>-12){const band=vh*.22;
  // One full-strength gradient, faded by alpha, so proximity costs no gradient rebuild.
  ctx.save();ctx.globalAlpha=clamp(1-agl/70,0,1);
  ctx.fillStyle=screenGrad('groundWash',()=>{const g=ctx.createLinearGradient(0,vh,0,vh-vh*.22);
   g.addColorStop(0,'rgba(233,192,124,.22)');g.addColorStop(1,'rgba(233,192,124,0)');return g});
  ctx.fillRect(0,vh-band,vw,band);ctx.restore();}
 const x=vw-Math.max(20,vw*.028),top=vh*.10,bottom=vh*.88,zero=gy-30.8-cameraY,step=50/.45;
 ctx.save();
 // A faint backing strip so the scale reads against bright sky as well as dark rock.
 ctx.fillStyle=screenGrad('ladderStrip',()=>{const g=ctx.createLinearGradient(x-vw*.055,0,x+vw*.014,0);
  g.addColorStop(0,'rgba(8,26,35,0)');g.addColorStop(1,'rgba(8,26,35,.34)');return g});ctx.fillRect(x-vw*.055,top-vh*.03,vw*.069,bottom-top+vh*.06);
 line(x,top,x,bottom,'#c6dcdc55',Math.max(1,vh*.003));
 ctx.font='600 '+Math.round(clamp(vh*.026,9,13))+'px ui-monospace,monospace';ctx.textAlign='right';
 for(let i=Math.max(0,Math.ceil((zero-bottom)/step));i<=Math.floor((zero-top)/step);i++){
  const y=zero-i*step;if(y<top||y>bottom)continue;
  const major=i%2===0,w=major?vw*.020:vw*.011;
  line(x-w,y,x,y,major?'#dbebe8b0':'#dbebe855',Math.max(1,vh*.0028));
  if(major&&i>0){ctx.fillStyle='#dbebe8b8';ctx.fillText(String(i*50),x-w-Math.max(4,vw*.007),y+4);}
 }
 line(x-vw*.026,clamp(zero,top,bottom),x+vw*.006,clamp(zero,top,bottom),'#a9d3bce8',Math.max(1.5,vh*.006));
 const my=clamp(heli.y-cameraY,top,bottom);
 poly([[x+vw*.006,my],[x-vw*.015,my-vh*.017],[x-vw*.015,my+vh*.017]],!heli.landed&&agl<45?'#ffb69a':'#e9c07c');
 ctx.restore();ctx.textAlign='center';
}
function drawEffects(){ctx.save();ctx.globalCompositeOperation='screen';for(const b of bursts){const r=110*b.power;glow(b.x,ground(b.x),r,'#ffb45024');}for(const e of enemies){if(e.hp<=0&&Math.abs(e.x-camera-vw/2)<vw){const flicker=.5+.5*Math.sin(visualTime*8+e.x);glow(e.x,e.y-12,35+flicker*12,'#e8a14c15');}}ctx.restore();for(const s of smokes)atDepth(s.z||0,()=>{
  const age=1-clamp(s.life/s.max,0,1),r=s.size*(.55+age*1.9);
  const g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,r);
  g.addColorStop(0,s.color);g.addColorStop(.55,s.color);g.addColorStop(1,s.color.slice(0,7)+'00');
  ctx.globalAlpha=Math.max(0,Math.sin(clamp(s.life/s.max,0,1)*Math.PI*.85))*.30;
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(s.x,s.y,r,r*.8,0,0,TAU);ctx.fill();
 });ctx.globalAlpha=1;for(const b of bursts)atDepth(b.z||0,()=>{const a=b.life/b.max;glow(b.x,b.y,b.r*2,'#ffc77766');ellipse(b.x,b.y,b.r*a,b.r*a*.85,a>.55?'#fff1b8':'#eaa057');ctx.strokeStyle=`rgba(241,202,132,${a*.6})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,b.r*1.7,0,TAU);ctx.stroke();});for(const p of particles)atDepth(p.z||0,()=>{ctx.globalAlpha=clamp(p.life/p.max,0,1);if(p.kind==='dust')ellipse(p.x,p.y,p.size*1.6,p.size,p.color);else{ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);ctx.restore()}});ctx.globalAlpha=1;
 for(const b of bullets)atDepth(b.z||0,()=>line(b.x-b.vx*.019,b.y-b.vy*.019,b.x,b.y,b.enemy?'#f0a17d':'#ffdfa0',b.enemy?2:2.5));for(const r of rockets)atDepth(r.z||0,()=>{ctx.save();ctx.translate(r.x,r.y);ctx.rotate(Math.atan2(r.dy,r.dx));ctx.fillStyle='#d6d9bc';ctx.fillRect(-8,-2,15,4);poly([[7,-3],[12,0],[7,3]],'#526774');poly([[-8,-3],[-22,0],[-8,3]],'#f0b967');ctx.restore()});for(const m of missiles)atDepth(m.z||0,()=>{ctx.save();ctx.translate(m.x,m.y);ctx.rotate(Math.atan2(m.vy,m.vx));ctx.fillStyle='#d8b993';ctx.fillRect(-7,-2,14,4);poly([[-8,-3],[-17,0],[-8,3]],'#ff9c61');ctx.restore()});for(const f of decoys)atDepth(f.z||0,()=>{glow(f.x,f.y,18,'#ffd59477');ellipse(f.x,f.y,2.5,2.5,'#fff1b9')});if(mode!=='playing'||school.active)for(const t of texts){ctx.globalAlpha=clamp(t.life,.01,1);label(t.text,t.x,t.y,t.color,11);}ctx.globalAlpha=1;}
function drawWeather(){if(['storm','snow'].includes(L.theme)){const snowing=L.theme==='snow';ctx.strokeStyle='#cce0e04a';ctx.lineWidth=1;for(let i=0;i<(coarse?55:100);i++){const seed=i*93.71,x=((seed*13-visualTime*(snowing?26:95)-camera*.4)%(vw+100)+vw+100)%(vw+100)-50,y=(seed*7+visualTime*(snowing?42:500))%(vh+80)-40;if(snowing)ellipse(x,y,i%3*.55+.6,i%3*.55+.6,'#dce7e179');else line(x,y,x-7,y+22,'#b7d3e138',1)}if(L.theme==='storm'&&Math.sin(visualTime*.18)>.9997&&!reduceMotion){ctx.fillStyle='#cbdde521';ctx.fillRect(0,0,vw,vh)}}}
function atDepth(z,draw){if(!z){draw();return;}const k=1-z*.0017,c=camera+vw*.5;ctx.save();ctx.translate(c,230-z*.28);ctx.scale(k,k);ctx.translate(-c,-230);draw();ctx.restore();}
function drawDepthFloor(){if(!save.depthMode)return;for(const z of [100,0,-100])atDepth(z,()=>{ctx.setLineDash([9,15]);ctx.strokeStyle=z===0?'#d9d9a947':'#b4d3d323';ctx.lineWidth=1;ctx.beginPath();for(let x=camera-100;x<camera+vw+200;x+=20){const y=ground(x);x===camera-100?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke();ctx.setLineDash([])});}
function drawPlayer(){atDepth(heli.z,()=>{for(const p of people)if(p.status==='attached')drawPerson(p);if(cargo?.status==='attached')drawCargo();drawHeli();});}
function render(){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#06151f';ctx.fillRect(0,0,innerWidth,innerHeight);ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.save();ctx.beginPath();ctx.rect(0,0,vw,vh);ctx.clip();if(!reduceMotion){ctx.translate(Math.sin(visualTime*53)*shake*.25,Math.cos(visualTime*47)*shake*.20)}drawBackdrop();ctx.save();ctx.translate(-camera,-cameraY);drawTerrain();drawGroundDetail();if(heli.z>14)drawPlayer();for(const s of scenery){if(s.x<camera-100||s.x>camera+vw+100)continue;s.type==='tree'?drawTree(s):drawRock(s)}drawBase();drawOutpost();drawObstacles();drawLost();drawHazardGuides();drawFlightGuides();for(const e of enemies)if(e.x>camera-100&&e.x<camera+vw+100)drawEnemy(e);for(const d of debris){
   if(d.type==='falling'||d.type==='wreck'){poly([[d.x-13*d.s,d.y],[d.x-20*d.s,d.y-15*d.s],[d.x+16*d.s,d.y-20*d.s],[d.x+23*d.s,d.y]],'#3b4c55')}
   else if(d.type==='rotor'){
    ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.rot);
    for(let b=0;b<3;b++){ctx.save();ctx.rotate(b*TAU/3);
     poly([[0,-2.5],[86,-1.6],[86,1.6],[0,2.5]],'#5d6b6d');ctx.restore();}
    ellipse(0,0,6,4,'#c9d4b8');ctx.restore();
   }
   else if(d.type==='panel'){
    ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.rot);const w=13*d.s,h=8*d.s;
    poly([[-w,-h],[w,-h*.7],[w*.8,h],[-w*.9,h*.8]],'#8d9a95');
    line(-w,-h,w,-h*.7,'#c3ccc6',1);ctx.restore();
   }
  }for(const p of people)if(p.status!=='attached')drawPerson(p);if(cargo?.status!=='attached')drawCargo();if(boss&&boss.hp>0&&boss.x>camera-170&&boss.x<camera+vw+170){ellipse(boss.x,ground(boss.x),70,11,'#071b284d');heliBody(boss.x,boss.y,Math.sin(boss.t*.8)*.07,heli.x<boss.x?-1:1,0,true);}if(heli.z<=14)drawPlayer();drawWinchGuides();drawEffects();ctx.restore();drawWeather();ctx.fillStyle=screenGrad('vignette',()=>{const g=ctx.createRadialGradient(vw*.5,vh*.45,Math.min(vw,vh)*.3,vw*.5,vh*.5,Math.max(vw,vh)*.7);g.addColorStop(0,'#00000000');g.addColorStop(1,'#05152066');return g});ctx.fillRect(0,0,vw,vh);if(damageFlash>0&&!reduceMotion){ctx.fillStyle=`rgba(206,91,57,${damageFlash})`;ctx.fillRect(0,0,vw,vh)}drawFlightInstruments();ctx.restore();}
const AudioState={ac:null,master:null,rotor:null,rotorGain:null,music:null,nextNote:0,note:0,noise:null,
 init(){if(this.ac){this.ac.resume().catch(()=>{});return;}const Constructor=window.AudioContext||window.webkitAudioContext;if(!Constructor)return;try{this.ac=new Constructor();const a=this.ac;this.master=a.createGain();this.master.gain.value=0;this.master.connect(a.destination);this.music=a.createGain();this.music.gain.value=.65;this.music.connect(this.master);this.rotorGain=a.createGain();this.rotorGain.gain.value=.045;this.rotor=a.createOscillator();this.rotor.type='sawtooth';this.rotor.frequency.value=44;const low=a.createBiquadFilter();low.type='lowpass';low.frequency.value=175;this.rotor.connect(low);low.connect(this.rotorGain);this.rotorGain.connect(this.master);this.rotor.start();const lfo=a.createOscillator(),depth=a.createGain();lfo.frequency.value=17;depth.gain.value=.02;lfo.connect(depth);depth.connect(this.rotorGain.gain);lfo.start();this.noise=a.createBuffer(1,a.sampleRate*.7,a.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;this.nextNote=a.currentTime+.25;a.resume().catch(()=>{});this.sync();}catch{this.ac=null;}}
 ,sync(){if(!this.ac)return;const running=mode==='playing';this.master.gain.setTargetAtTime(save.muted||!running?0:.42,this.ac.currentTime,.16);if(running)this.nextNote=Math.max(this.ac.currentTime+.08,this.nextNote);}
 ,tone(freq,duration,volume,type='sine',endFreq=0,delay=0,output=null){if(!this.ac)return;const a=this.ac,t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(12,endFreq),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(output||this.master);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect()};}
 ,noiseHit(duration,volume,cutoff){if(!this.ac||!this.noise)return;const a=this.ac,t=a.currentTime,b=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();b.buffer=this.noise;f.type='lowpass';f.frequency.value=cutoff;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);b.connect(f);f.connect(g);g.connect(this.master);b.start();b.stop(t+duration+.01);b.onended=()=>{b.disconnect();f.disconnect();g.disconnect()};}
 ,sfx(type){if(!this.ac||save.muted)return;if(type==='gun'){this.noiseHit(.065,.10,1450);this.tone(130,.07,.07,'triangle',48)}if(type==='rocket'){this.noiseHit(.35,.22,780);this.tone(170,.32,.12,'sawtooth',36)}if(type==='boom'){this.noiseHit(.65,.46,700);this.tone(82,.58,.24,'sine',22)}if(type==='hit'){this.noiseHit(.12,.11,2100)}if(type==='attach'){this.tone(560,.12,.08,'sine');this.tone(750,.16,.06,'sine',0,.1)}if(type==='rescue'){[440,554.37,659.25].forEach((f,i)=>this.tone(f,.34,.09,'sine',0,i*.09))}if(type==='flare')this.noiseHit(.25,.16,1900);if(type==='switch')this.tone(310,.09,.04,'triangle',240);}
 ,update(dt){if(!this.ac)return;this.rotor.frequency.setTargetAtTime(34+heli.spool*28,this.ac.currentTime,.1);this.rotorGain.gain.setTargetAtTime(.025+heli.spool*.055,this.ac.currentTime,.1);if(save.muted)return;const now=this.ac.currentTime;if(now>this.nextNote){const notes=[220,0,261.63,329.63,293.66,0,196,261.63,174.61,220,261.63,0,196,246.94,293.66,0];const n=this.note++%notes.length;this.nextNote=now+.65;if(notes[n])this.tone(notes[n],1.35,.023,'triangle',0,0,this.music);if(n%4===0){const bass=[55,65.41,43.65,49][Math.floor(n/4)];this.tone(bass,2.5,.05,'sine',0,0,this.music);this.tone(bass*3,2.1,.013,'sine',0,.02,this.music)}if(n%2===0)this.tone(75,.2,.032,'sine',32,0,this.music);}}
};
function showModal(tag,title,body,actions){clearInput();$('settingsBtn').disabled=!['menu','playing','paused'].includes(mode);$('modalTag').textContent=tag;$('modalTitle').textContent=title;$('modalBody').innerHTML=body;const wrap=$('modalActions');wrap.replaceChildren();for(const action of actions){const b=document.createElement('button');b.textContent=action.text;b.className=action.primary?'primary':'quiet';b.onclick=action.run;wrap.append(b);}$('modal').hidden=false;$('mobile').hidden=true;AudioState.sync();wrap.querySelector('button')?.focus({preventScroll:true});}
function dismiss(){clearInput();$('settingsBtn').disabled=false;$('modal').hidden=true;}
function begin(){dismiss();mode='playing';$('hud').hidden=false;$('mobile').hidden=!coarse;$('pauseBtn').hidden=false;radio(level===0?'SAR–07, du är klar för start. Öka lyftkraften mjukt.':L.region+'. Flyg säkert, besättningen väntar.',5);AudioState.init();AudioState.sync();updateHUD();}
function briefing(){const extra=level===0?'<p><b>A / D:</b> luta för att flyga. Motluta för att bromsa.<br><b>W / S:</b> öka eller minska lyftkraften.<br><b>Motluta tidigt.</b> Helikoptern behåller farten.</p>':cargo?'<p>Tryck VINSCH för att sänka kroken, tryck igen för att hissa. På tangentbord: håll och släpp E. Sänk ner generatorn på utpostens markerade platta.</p>':'<p>Stabilisera med H inför vinschning. Återvänd till basen när du behöver bränsle, reparation eller raketer.</p>';showModal(`${String(level+1).padStart(2,'0')} / ${L.region.toUpperCase()}`,L.name,`<p>${L.brief}</p>${extra}<p class="missionhint">${coarse?'Håll vänster/höger skärmhalva för att luta. Håll båda för lyft, släpp för att sjunka. Svep för att vända. VINSCH växlar mellan sänkning och upphissning.':'Håll E för att sänka vinschen. Släpp E för att hissa upp. Q vänder nosen.'}</p>`,[{text:'STARTA FLYGNING',primary:true,run:begin},{text:'UPPDRAG',run:selectMissions}]);}
function toMenu(){if(L.lost)saveLost();document.body?.classList.remove('lostMode');$('lostStatus').hidden=true;dismiss();loadLevel(0,false);$('menu').hidden=false;$('hud').hidden=true;$('pauseBtn').hidden=true;$('mobile').hidden=true;AudioState.sync();}
function pause(){if(mode==='paused'){dismiss();mode='playing';$('mobile').hidden=!coarse;AudioState.sync();return;}if(mode!=='playing')return;mode='paused';showModal('FLYGNING PAUSAD','Ta ett andetag.',`<p>Skrov: ${Math.ceil(heli.hp)} % · Bränsle: ${Math.ceil(heli.fuel)} % · Ombord: ${heli.carrying}/${people.length}</p><p>${L.lost?'Checkpoint: '+lostPads[lost.cp].name+' · Bästa: '+Math.round(lost.best/L.beacon*100)+' % · Krascher: '+lost.crashes:L.objective}</p><p><b>Motluta för att bromsa.</b> Helikoptern behåller farten när du släpper styrningen. Lite extra lyftkraft hjälper när du lutar kraftigt.</p><p>${coarse?'Håll vänster/höger för lutning. Båda lyfter, släpp för att sjunka. Svep för att vända. Tryck VINSCH för att sänka eller hissa.':'WASD / pilar: flyg · Q: vänd<br>E: vinsch · H: stabilisera'}</p><p>Landning vid basen reparerar och fyller på.</p>`,[{text:'FORTSÄTT FLYGA',primary:true,run:pause},{text:'INSTÄLLNINGAR',run:settings},{text:save.muted?'LJUD PÅ':'LJUD AV',run:()=>{save.muted=!save.muted;persist();AudioState.sync();mode='playing';pause();}},{text:school.active?'VÄLJ ÖVNING':'STABILISERING '+(hoverMode?'AV':'PÅ'),run:()=>{if(school.active)selectTraining();else{hoverMode=!hoverMode;heli.hoverY=heli.y;pause();}}},{text:'BÖRJA OM UPPDRAG',run:()=>L.lost?retryLost():school.active?startDrill(school.kind):loadLevel(level)},{text:'HUVUDMENY',run:toMenu}]);}
function finishMission(){if(mode!=='playing')return;mode='debrief';const timeBonus=Math.max(0,Math.round((L.par-time)*7)),conditionBonus=Math.round(heli.hp*6),total=score+timeBonus+conditionBonus;score=total;const stars=1+(time<=L.par?1:0)+(crashHits===0&&heli.hp>=65?1:0);const previous=save.results[level]||{};save.results[level]={score:Math.max(total,previous.score||0),stars:Math.max(stars,previous.stars||0),time:Math.min(time,previous.time||Infinity)};save.unlocked=Math.max(save.unlocked,Math.min(level+1,levels.length-1));save.best=Math.max(save.best,total);persist();updateHUD();const final=level===levels.length-1;const starline='★'.repeat(stars)+'☆'.repeat(3-stars);showModal(final?'KAMPANJ SLUTFÖRD':'BESÄTTNINGEN ÄR HEMMA',final?'Ingen lämnades kvar.':'Snyggt flugit.',`<div class="medals">${starline}</div><div class="results"><div><b>${fmt(total)}</b><span>POÄNG</span></div><div><b>${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')}</b><span>FLYGTID</span></div><div><b>${heli.delivered}</b><span>RÄDDADE</span></div></div><p>Tidsbonus +${fmt(timeBonus)} · Skrovbonus +${fmt(conditionBonus)}<br>${perfectPickups} precisionsräddningar · ${crashHits} hårda landningar</p><p>★ Uppdraget klart · ★ Under ${Math.round(L.par/60*10)/10} min<br>★ Inga hårda landningar och minst 65 % skrov</p>`,[{text:final?'VÄLJ UPPDRAG':'NÄSTA UPPDRAG',primary:true,run:final?selectMissions:()=>levels[level+1]?.lost?startLost():loadLevel(level+1)},{text:'FLYG IGEN',run:()=>loadLevel(level)},{text:'HUVUDMENY',run:toMenu}]);}
let wreck=null;
// A crash you watch. Lift dies, the disc departs, panels shed, and the hull tumbles until it
// comes to rest. Only then does the game tell you what happened.
function beginWreck(reason,finish){
 if(mode!=='playing')return;
 mode='wreck';clearInput();$('mobile').hidden=true;
 const speed=Math.hypot(heli.vx,heli.vy);
 wreck={t:0,reason,finish,rest:0,bounces:0};
 heli.collective=0;heli.rope=0;heli.ropeTarget=null;heli.landed=false;
 // Whatever it was doing, it is now spinning: impact torque scaled by how fast it arrived.
 heli.av+=(heli.vx>0?-1:1)*(1.4+clamp(speed/120,0,2.6))*(.6+Math.random());
 heli.vy-=rand(20,70);
 // The disc leaves first, and keeps its rotation.
 debris.push({x:heli.x,y:heli.y-47,vx:heli.vx*.55+rand(-90,90),vy:-rand(90,220),
  s:1,type:'rotor',rot:heli.angle,spin:rand(6,13)*(Math.random()<.5?-1:1)});
 for(let i=0;i<4+Math.round(clamp(speed/70,0,4));i++)
  debris.push({x:heli.x+rand(-26,26),y:heli.y+rand(-18,14),vx:heli.vx*.4+rand(-130,130),
   vy:-rand(40,170),s:rand(.35,.85),type:'panel',rot:rand(0,6.28),spin:rand(-9,9)});
 explode(heli.x,heli.y,.55);
 for(let i=0;i<7;i++)addDent(rand(-58,46),rand(-30,20),rand(.4,1));
 AudioState.sfx('hit');
 shake=Math.max(shake,11);damageFlash=.3;
}
// The hull is now just a heavy object. Gravity, air, and a ground that takes something out of
// it every time they meet.
function updateWreck(dt){
 wreck.t+=dt;
 heli.vy+=315*dt;
 heli.vx-=heli.vx*.55*dt;heli.vy-=heli.vy*.22*dt;
 heli.angle+=heli.av*dt;heli.av-=heli.av*.35*dt;
 heli.x=clamp(heli.x+heli.vx*dt,90,L.length-70);heli.y+=heli.vy*dt;
 heli.rotor+=dt*heli.spool*20;heli.spool=Math.max(0,heli.spool-dt*.9);
 const gy=gearSupport();
 if(heli.y>=gy){
  heli.y=gy;
  const hit=Math.hypot(heli.vx,heli.vy);
  if(heli.vy>28&&wreck.bounces<4){
   wreck.bounces++;
   heli.vy=-heli.vy*.34;heli.vx*=.55;heli.av=(heli.av+rand(-3,3))*.7;
   addDent(rand(-55,45),rand(0,22),clamp(hit/150,.3,1));
   explode(heli.x,heli.y,.22);shake=Math.max(shake,6);
   for(let i=0;i<4;i++)addParticle(heli.x+rand(-20,20),gy,rand(-90,90),rand(-70,-10),'#e8c98e',3,.4,'dust');
   AudioState.sfx('hit');
  } else {heli.vy=0;heli.vx*=Math.exp(-6*dt);heli.av*=Math.exp(-5*dt);}
 }
 if(Math.random()<dt*22)smoke(heli.x+rand(-16,16),heli.y+rand(-12,8),rand(7,14),1.5,'#2c3033');
 collideObstacles(dt);
 updateCamera(dt);
 const still=Math.abs(heli.vx)<26&&Math.abs(heli.vy)<26;
 wreck.rest=still?wreck.rest+dt:0;
 // Long enough to see it break, short enough to want to go again.
 if((wreck.rest>.45&&wreck.t>1.1)||wreck.t>2.9){const done=wreck.finish,why=wreck.reason;wreck=null;done(why);}
}
function failMission(reason){if(mode!=='playing')return;beginWreck(reason,L.lost?crashLost:failNow);}
function failNow(reason){mode='failed';explode(heli.x,heli.y,1.2);for(let i=0;i<5;i++)debris.push({x:heli.x+rand(-20,20),y:heli.y,vx:rand(-80,80),vy:rand(-80,-20),s:rand(.5,1),type:'falling'});showModal('SAR–07 / NÖDSIGNAL','Tillbaka i luften.',`<p>${reason||'Helikoptern klarade inte skadorna. Ditt senaste uppdrag kan startas om direkt.'}</p><p>Tips: börja bromsa innan du når målet. Motluta, räta upp och sänk dig långsamt. H stabiliserar höjden vid räddning.</p>`,[{text:'FÖRSÖK IGEN',primary:true,run:()=>school.active?startDrill(school.kind||'basic'):loadLevel(level)},{text:'VÄLJ UPPDRAG',run:selectMissions}]);}
function settings(){if(!['menu','playing','paused'].includes(mode))return;const previous=mode;clearInput();mode='settings';showModal('FLIGHT CONTROLS','Ställ in flygningen.',`<label class="settingLabel" for="sensitivity">Styrkänslighet <b id="sensitivityValue">${Math.round(save.sensitivity*100)} %</b></label><input id="sensitivity" type="range" min="50" max="160" step="5" value="${Math.round(save.sensitivity*100)}"><p>Små utslag för precision. Stora utslag ger upp till 70° lutning. Motluta för att bromsa; öka lyftet i branta svängar.</p><button id="gyroEnable">${gyro.enabled?'STÄNG AV GYRO':'AKTIVERA GYRO'}</button> <button id="gyroCalibrate">KALIBRERA MITTLÄGE</button><p id="gyroStatus" role="status">${gyro.status}</p><label><input id="gyroInvert" type="checkbox" ${gyro.invert?'checked':''}> Omvänd gyroriktning</label><p>Håll iPhone/iPad bekvämt i liggande läge och kalibrera. Luta sedan vänster/höger. Skärmhalvor och gyro fungerar samtidigt. H / STABILISERA hjälper vid vinschning.</p>`,[{text:'FORTSÄTT',primary:true,run:()=>{save.sensitivity=clamp(Number($('sensitivity').value)/100,.5,1.6);persist();dismiss();mode=previous;$('mobile').hidden=mode!=='playing'||!coarse;updateHUD();AudioState.sync();if(previous==='paused'){mode='playing';pause()}}}]);$('sensitivity').oninput=()=>{$('sensitivityValue').textContent=$('sensitivity').value+' %';};$('gyroEnable').onclick=enableGyro;$('gyroCalibrate').onclick=calibrateGyro;$('gyroInvert').onchange=e=>{gyro.invert=e.target.checked;gyro.filtered=0;};}

function selectMissions(){mode='select';$('menu').hidden=true;showModal('FLIGHT OPERATIONS','Välj uppdrag.','<div class="missionlist" id="missionList"></div><p>TESTFLYGNING: alla uppdrag är upplåsta. Stjärnor och poäng sparas på den här enheten.</p>',[{text:'TILLBAKA',run:toMenu}]);const list=$('missionList');levels.forEach((l,i)=>{const b=document.createElement('button'),r=save.results[i],locked=!TEST_FLIGHT&&i>save.unlocked;b.disabled=locked;b.innerHTML=`<b>${String(i+1).padStart(2,'0')} / ${l.region.toUpperCase()}</b>${l.name}<span>${locked?'LÅST — KLARA FÖREGÅENDE':r?'★'.repeat(r.stars)+'☆'.repeat(3-r.stars)+' · '+fmt(r.score)+' poäng':'REDO FÖR START'}</span>`;b.onclick=()=>l.lost?startLost():loadLevel(i);list.append(b);});}
// THE LOST VALLEY: additive challenge mode; campaign physics remains shared.
// Where the valley blows, and how hard. Ramps toward the beacon so the last stretch is the
// one that punishes a sloppy line.
// Placed where the width fits between the obstacles and the pads, checked when the world builds.
const SHAFT_HALF=300,SHAFT_DEPTH=330;
const lostShafts=[11750,16250,18550,20850];
let stars=[];
// Steep walls with a floor wide enough to turn around in: depth falls off as the fourth power
// of the distance to the rim, which keeps the bottom flat rather than pinching to a point.
function shaftDepth(x){
 let cut=0;
 for(const sx of lostShafts){
  const t=Math.abs(x-sx)/SHAFT_HALF;
  if(t<1)cut=Math.max(cut,SHAFT_DEPTH*(1-t*t*t*t));
 }
 return cut;
}
const windZones=[[2300,3200,1],[5250,6000,.65],[14300,15650,.55],[16400,18000,.85],[21200,22650,.6],[23500,25100,1]];
const lostPads=[{x:390,name:'Eagle Base',w:174},{x:1480,name:'Old Ranger Platform',w:132},{x:3160,name:'Mine Relay',w:124},{x:4880,name:'Storm Shelter',w:160},{x:6900,name:'Tallskogen',w:180},{x:9100,name:'Kopparryggen',w:180},{x:11300,name:'Floddalen',w:180},{x:13600,name:'Fjällstationen',w:180},{x:15800,name:'Långa passet',w:180},{x:18100,name:'Norra dalen',w:180},{x:20400,name:'Sista utposten',w:180},{x:22800,name:'Fyrleden',w:180}];
let lost={active:false,cp:0,hold:0,best:0,crashes:0,total:0,secret:false,returning:false,returnService:new Set(),snapshot:null,lastSave:0,reason:'',recordShown:0};
function lostTerrain(x,y){if(x<680)return 610;let out=610+Math.sin(x*.002)*65+Math.sin(x*.006)*30;if(x>3300&&x<4450)out=790;for(const p of lostPads){const d=Math.abs(x-p.x);if(d<140)out=610;else if(d<260)out=lerp(610,out,(d-140)/120);}if(x>5700&&x<6100)out=lerp(out,640,(x-5700)/400);if(x>=6100){out=620+Math.sin((x-6100)*.0008)*95+Math.sin((x-6100)*.0024)*35;for(const p of lostPads){const d=Math.abs(x-p.x);if(d<150)out=610;else if(d<300)out=lerp(610,out,(d-150)/150);}}if(x>L.beacon-400)out=640;return out+shaftDepth(x);}
function lostWind(){const u=time%14;let x=0,y=0,label='LUGNT';if(u>=3&&u<6){x=Math.sin((u-3)/3*Math.PI)*31;label='VIND →';}else if(u>=7&&u<10){x=-Math.sin((u-7)/3*Math.PI)*35;label='← VIND';}else if(u>=10&&u<12){y=-Math.sin((u-10)/2*Math.PI)*24;label='UPPVIND ↑';}let strength=.10;
 for(const [from,to,power] of windZones)if(heli.x>from&&heli.x<to){strength=power;break}
 return{x:x*strength,y:y*strength,label:strength>.5?label:'SVAG VIND',strength,phase:u/14};}
function readLost(){try{const data=JSON.parse(localStorage.getItem('flyinLongValleyV1')||'null');return data&&data.version===1?data:null;}catch{return null;}}
function saveLost(){if(!lost.active)return;try{localStorage.setItem('flyinLongValleyV1',JSON.stringify({version:1,snapshot:lost.snapshot,best:lost.best,crashes:lost.crashes,total:lost.total,completed:lost.completed||false}));}catch{}}
function lostSnapshot(){return{cp:lost.cp,secret:lost.secret,hp:heli.hp,fuel:heli.fuel};}
function startLost(fresh=false){const previous=readLost(),saved=fresh?null:previous;loadLevel(7);lost={active:true,cp:clamp(saved?.snapshot?.cp||0,0,lostPads.length-1),hold:0,best:previous?.best||0,crashes:saved?.crashes||0,total:saved?.total||0,secret:!!saved?.snapshot?.secret,returning:false,returnService:new Set(),snapshot:saved?.snapshot||null,lastSave:0,reason:'',recordShown:saved?.best||0};restoreLostPosition();if(!lost.snapshot)lost.snapshot=lostSnapshot();saveLost();$('modalTag').textContent='THE LOST VALLEY · LÅNGFÄRD';$('modalTitle').textContent=saved?.snapshot?'En gång till.':'Varje meter räknas.';$('modalBody').innerHTML='<p>Flyg till Rescue Beacon, vinscha upp två personer och ta er hela vägen hem till Eagle Base.</p><p>Landa lugnt på markerade reläplattor för att spara en checkpoint. Klippkanter är fasta. Träd och dimma är bakgrund. Gruvan är en kortare, trängre väg; flyg över berget om du vill ha mer utrymme.</p><p>Vinden går i samma 14-sekundersmönster varje försök. En krasch tar dig till senaste sparade checkpoint. Efter räddningen måste du fortfarande flyga hem.</p><p>En fyra gånger längre dal med elva landningsstationer längs vägen. Ta pauser, fyll på bränsle och fortsätt från din senaste checkpoint.</p>';document.body?.classList.add('lostMode');updateHUD();}
function restoreLostPosition(){const p=lostPads[lost.cp];heli.x=p.x;heli.y=ground(p.x)-30.8;heli.vx=heli.vy=heli.angle=heli.av=heli.bank=0;heli.hp=clamp(lost.snapshot?.hp||100,45,100);heli.fuel=clamp(lost.snapshot?.fuel||100,55,100);heli.rockets=8;heli.flares=4;heli.landed=true;heli.airborne=false;zoom=1;applyView();camera=clamp(heli.x-vw*.43,0,L.length-vw);cameraY=heli.y-vh*.5;}
function retryLost(){const old={...lost};loadLevel(7,false);lost={...old,active:true,hold:0,returning:false,returnService:new Set(),secret:!!old.snapshot?.secret,lastSave:0};time=0;restoreLostPosition();document.body?.classList.add('lostMode');$('menu').hidden=true;begin();radio('Tyngdkraften vann den här ronden. Vi försöker igen.',4);}
function crashLost(reason){lost.crashes++;lost.reason=reason||lost.reason||'Hård kontakt med terrängen.';saveLost();mode='failed';clearInput();$('mobile').hidden=true;const jokes=['Helikoptern har upptäckt tyngdkraften.','Det där var nästan en landning. Känslomässigt.',
  'Mycket nära. Berget höll inte med.','Du har låst upp: ett nytt försök.',
  'Utmärkt flygning. Fruktansvärt resmål.','Träden är fortfarande obesegrade.',
  'Nytt rekord: snabbaste vägen tillbaka till checkpointen.','Åtminstone såg ingen det där.',
  'Räddningsuppdraget räddar tillfälligt sig självt.','Den landningen var mer ett förslag.',
  'Marken var där hela tiden. Den sa bara ingenting.','Rotorn hade en idé. Berget hade en annan.',
  'Tekniskt sett flög du. En kort stund.','Fysiken noterade det där.',
  'Du är officiellt för långt in för att sluta nu.'];showModal('KRASCH · '+lostPads[lost.cp].name,jokes[(lost.crashes-1)%jokes.length],'<p>'+lost.reason+'</p><p>Bästa framsteg: '+Math.round(lost.best/L.beacon*100)+' % till fyren · '+lost.crashes+' krascher.</p>',[{text:'FÖRSÖK IGEN',primary:true,run:retryLost},{text:'HUVUDMENY',run:toMenu}]);}
function completeLost(){
 lost.completed=true;saveLost();mode='lostDone';clearInput();$('mobile').hidden=true;AudioState.sfx('rescue');
 const mins=Math.floor(lost.total/60),secs=String(Math.floor(lost.total%60)).padStart(2,'0');
 const stats='<div class="results"><div><b>'+mins+':'+secs+'</b><span>TOTAL TID</span></div>'+
  '<div><b>'+lost.crashes+'</b><span>KRASCHER</span></div>'+
  '<div><b>'+heli.delivered+'</b><span>RÄDDADE</span></div></div>';
 showModal('THE LOST VALLEY · HEMMA','Du klarade det.',
  '<p>Skidorna är på betong. Rotorn varvar ner. Elva rastplatser, '+lost.crashes+
  ' krascher och hela vägen tillbaka.</p>'+stats+
  '<p>Lådor ur schakten: '+stars.filter(s=>s.taken).length+' / '+stars.length+
  ' · Hemligheter: '+(lost.secret?'1 / 1':'0 / 1')+'</p>'+
  '<p>Ops vill säga en sak innan du kliver ur.</p>',
  [{text:'LYSSNA',primary:true,run:lostEpilogue}]);
}
// The turn: everything you just did was real, and none of it was necessary.
function lostEpilogue(){
 const mins=Math.floor(lost.total/60),secs=String(Math.floor(lost.total%60)).padStart(2,'0');
 showModal('OPS / EFTERSNACK','Om fyren.',
  '<p>Nödsignalen du flög elva kilometer för var en schemalagd testsändning. Väderstationen '+
  'skickar en varannan tisdag. Vi glömde nämna det.</p>'+
  '<p>De två du vinschade upp heter Ann-Sofie och Pelle. De är tekniker. De var där för att '+
  'serva stationen.</p><p>De hade bil.</p>'+
  '<p>De följde med för att du såg ut att ha ansträngt dig.</p>'+
  '<p><b>'+mins+':'+secs+'</b> i luften. <b>'+lost.crashes+'</b> krascher. '+
  (lost.secret?'En hemlighet hittad. ':'')+'Noll liv i fara.</p>'+
  (stars.filter(s=>s.taken).length?'<p>Lådorna du hämtade ur schakten var reservdelar till '+
   'stationen. De hade beställt dem i mars.</p>':'')+
  '<p>Ann-Sofie undrar förresten om du kan flyga tillbaka.</p>'+
  '<p>De glömde verktygslådan.</p>',
  [{text:'EN GÅNG TILL',primary:true,run:()=>startLost(true)},{text:'HUVUDMENY',run:toMenu}]);
}
function updateStars(){
 for(const st of stars){
  if(st.taken)continue;
  if(Math.hypot(st.x-heli.x,st.y-heli.y)<48){
   st.taken=true;AudioState.sfx('rescue');
   const left=stars.filter(v=>!v.taken).length;
   radio(left?'Låda säkrad. '+left+' kvar i schakten.':'Alla lådor ombord. Fortsätt mot fyren.',4);
  }
 }
}
function updateLost(dt){if(!L.lost||!lost.active)return;updateStars();lost.total+=dt;lost.lastSave+=dt;const best=Math.min(L.beacon,heli.x);if(best>lost.best){lost.best=best;if(best>lost.recordShown+350){lost.recordShown=best;popup(heli.x,heli.y-105,'NYTT BÄSTA · '+Math.round(best/L.beacon*100)+' %','#bcebd7');}}
 if(!lost.secret&&Math.hypot(heli.x-3940,heli.y-685)<70){lost.secret=true;popup(heli.x,heli.y-80,'GRUVANS HEMLIGHET');radio('Dålig idé. Utmärkt resultat.',4);}
 if(heli.carrying===people.length&&!lost.returning){lost.returning=true;radio('Alla ombord. Helikoptern räknas också som alla. Ta er hem.',6);}
 const pad=lostPads.findIndex(p=>Math.abs(heli.x-p.x)<p.w*.38);const safe=pad>=0&&heli.landed&&Math.abs(heli.vx)<12&&Math.abs(heli.angle)<.16;
 lost.hold=safe?lost.hold+dt:0;if(safe&&lost.hold>1.1){if(!lost.returning&&pad>lost.cp){lost.cp=pad;heli.hp=Math.min(100,heli.hp+35);repairDents(.45);heli.fuel=100;heli.rockets=8;lost.snapshot=lostSnapshot();saveLost();popup(heli.x,heli.y-80,'CHECKPOINT SPARAD');
   const praise=['Nu får du misslyckas från en lite bättre plats.','Sparat. Berget vet att du var här.',
    'Snyggt. Det såg nästan avsiktligt ut.','Checkpoint. Andas. Sedan fortsätter det.',
    'Du är officiellt bättre än den förra piloten.','Sparat. Ingen behöver få veta hur det gick till.',
    'Bra landning. Dalen är fortfarande längre än du tror.'];
   radio(praise[pad%praise.length],5);AudioState.sfx('rescue');}if(lost.returning&&pad>0&&!lost.returnService.has(pad)){lost.returnService.add(pad);heli.hp=Math.min(100,heli.hp+20);repairDents(.3);heli.fuel=100;radio('Snabb service. Hemresan återstår.',3);}}
 if(lost.lastSave>4){saveLost();lost.lastSave=0;}
 $('lostStatus').hidden=false;const progress=Math.round(lost.best/L.beacon*100);$('lostStatus').textContent=(lost.returning?'← HEM TILL EAGLE BASE':'→ RESCUE BEACON')+' · '+lostPads[lost.cp].name+' · BÄSTA '+progress+' % · '+lost.crashes+' KRASCHER';$('tip').textContent=heli.x>3350&&heli.x<4350?(heli.y>510?'GRUVAN · HÅLL CENTRUM · AKTA TAK OCH VÄGGAR':'SÄKRA VÄGEN · FLYG ÖVER BERGET'):lostWind().label+' · LÄR DIG RYTMEN · LANDA VID RELÄPLATTORNA';
}
function drawLost(){if(!L.lost)return;
 for(const st of stars){
  if(st.taken||st.x<camera-200||st.x>camera+vw+200)continue;
  const bob=Math.sin(visualTime*1.7+st.x)*5,y=st.y+bob;
  glow(st.x,y,52,'#ffd88a2e');
  const pts=[];
  for(let i=0;i<10;i++){const a=i/10*TAU-Math.PI/2,r=i%2?7:17;
   pts.push([st.x+Math.cos(a)*r,y+Math.sin(a)*r]);}
  poly(pts,'#f6d99a','#fff0c8');
  ellipse(st.x,y,4,4,'#fffbef');
 }
for(let i=1;i<lostPads.length;i++){const p=lostPads[i];landingPad(p.x,p.w,i<=lost.cp);label(p.name,p.x,ground(p.x)-83,'#c6ead8',13);if(Math.abs(heli.x-p.x)<340)label(i<=lost.cp?'CHECKPOINT SPARAD':'LANDA LUGNT · SPARA CHECKPOINT',p.x,ground(p.x)+34,'#c6ead8',10);if(Math.abs(heli.x-p.x)<p.w&&lost.hold>0)line(p.x-45,ground(p.x)-62,p.x-45+90*clamp(lost.hold/1.1,0,1),ground(p.x)-62,'#c6efd5',3);}
 const areas=[[780,'DEN ÖPPNA DALEN'],[2100,'FLODPASSAGEN'],[2670,'VINDPASSET'],[3300,'DEN GAMLA GRUVAN'],[4740,'BERGSBRON'],[5450,'STORMTOPPEN'],
  [7900,'KOPPARRYGGEN'],[10300,'FLODDALEN'],[12600,'FJÄLLSTATIONEN'],[14800,'LÅNGA PASSET'],
  [17100,'NORRA DALEN'],[19500,'DEN ÖVERGIVNA BASEN'],[21800,'FYRLEDEN'],[24200,'SISTA ANFLYGNINGEN']];for(const [x,name]of areas)if(Math.abs(x-camera-vw/2)<vw)label(name,x,150,'#d1e3d577',18);
 if(!lost.secret){glow(3940,685,35,'#f2d38d35');poly([[3940,671],[3952,685],[3940,699],[3928,685]],'#e7c67e');label('?',3940,690,'#344c54',14);}
 label('GRUVA →',3300,700,'#aee4d7',13);label('↑ VÄGEN ÖVER BERGET',3300,210,'#bde4da',13);
 const bx=L.beacon,by=ground(bx);line(bx,by,bx,by-110,'#728f8b',5);glow(bx,by-110,45,'#d9efb633');ellipse(bx,by-110,6,6,'#e0f4c7');label('RESCUE BEACON',bx,by-150,'#dceccd',15);
 {const w=lostWind();if(w.strength>.35){for(let i=0;i<10;i++){const x=camera+(i*137+time*w.x*2+vw*10)%vw,y=180+i*36;line(x,y,x+w.x*.6,y+w.y*.6,'#d9e7de44',1);}label(w.label+' · '+Math.floor(time%14)+' / 14 S',heli.x,heli.y-205,'#d6e9df',11);}}
}

const drillNames={basic:'Grunder · lyft, motstyr och landa',turn:'Mjuk vändning i luften',rescue:'Rädda en människa',cargo:'Fånga och leverera en låda'};
function selectTraining(){clearInput();mode='select';school.active=false;$('skipSchool').hidden=$('retrySchool').hidden=true;$('mobile').hidden=true;$('menu').hidden=true;showModal('FLYGSKOLA','Träna i din egen takt.','<p>Välj valfri övning. Samma flygfysik som i uppdragen, utan fiendeeld. Du kan starta om varje övning.</p><div class="missionlist" id="trainingList"></div>',[{text:'HUVUDMENY',run:toMenu}]);for(const [kind,name] of Object.entries(drillNames)){const b=document.createElement('button'),done=kind==='basic'?save.schoolComplete:save.trainingResults?.[kind];b.innerHTML='<b>'+name+'</b><span>'+(done?'✓ GENOMFÖRD · TRÄNA IGEN':'STARTA ÖVNING')+'</span>';b.onclick=()=>startDrill(kind);$('trainingList').append(b);}AudioState.sync();}
function startDrill(kind){if(!drillNames[kind])return;if(kind==='basic'){startTraining();return;}loadLevel(0);L={...levels[0],name:'FLYGSKOLA',region:drillNames[kind],length:2600,wind:0,people:[],guns:[],clear:false,cargo:kind==='cargo'?{x:1040,to:1740}:null};makeWorld();
 stars=L.lost?lostShafts.map(x=>({x,y:ground(x)-60,taken:false})):[];
 heli=newHeli();people=kind==='rescue'?[{x:1110,y:ground(1110)-8,homeX:1110,status:'waiting',phase:0}]:[];cargo=kind==='cargo'?{x:1040,y:ground(1040)-14,status:'waiting',to:1740}:null;enemies=['gun','rocket'].includes(kind)?[1120,1700].map(x=>({x,y:ground(x)-15,hp:kind==='gun'?28:55,max:kind==='gun'?28:55,type:kind==='gun'?'gun':'missile',cd:999,aim:-Math.PI/2,flash:0,warn:0,training:true,trainingWeapon:kind})):[];school={active:true,kind,stage:0,hold:0,turnedLeft:false,refill:0};$('modalTitle').textContent=drillNames[kind];$('modalTag').textContent='FLYGSKOLA · FRI ÖVNING';$('modalBody').innerHTML='<p>'+drillHint()+'</p><p>'+({turn:'Lyft först. Q / SVEP tar nu ungefär 1,7 sekunder. Vänd åt vänster, håll lugn flygning och vänd sedan tillbaka. Helikoptern behåller sin rörelse under vändningen.',rescue:'Flyg över forskaren. H / STABILISERA hjälper dig hålla höjden. Håll E / VINSCH för att sänka kroken. Släpp när personen fastnat, och landa sedan vid basen.',cargo:'Håll E / VINSCH tills kroken fångar lådan. Släpp för att lyfta lasten. Flyg till leveransplattan, håll vinschen för att sänka och sätt ner lådan långsamt.',gun:'Luta helikoptern för att sikta. Space / ELD skjuter längs pipan. Träffa båda övningsmålen med kanonen. Korta salvor förhindrar överhettning.',rocket:'Luta för att sikta och tryck R / RAKET. Träffa båda bepansrade målen. Kanonen biter inte på dessa mål. Övningsraketer fylls på om de tar slut.'}[kind])+'</p>';if(coarse)$('modalBody').innerHTML='<p>'+drillNames[kind]+'</p><p>Håll en skärmhalva för lutning, båda för lyft. Släpp för att sjunka. Svep vågrätt för att vända nosen åt det hållet.</p><p>VINSCH: tryck för att sänka, tryck igen för att hissa. Stabilisera inför fångst och landa lugnt.</p>';updateHUD();}
function drillHint(){if(coarse||touchFlight)return school.kind==='turn'?'LYFT MED BÅDA · SVEP VÄNSTER · BALANSERA · SVEP HÖGER':school.kind==='rescue'?'VINSCH: TRYCK FÖR ATT SÄNKA · TRYCK IGEN FÖR ATT HISSA · LANDA HEMMA':'FÅNGA LÅDAN · VINSCH VÄXLAR SÄNKNING / HISSNING';if(school.kind==='turn')return school.turnedLeft?'Q / SVEP TILLBAKA ÅT HÖGER · HÅLL LUGN FLYGNING':'LYFT · Q / SVEP ÅT VÄNSTER · HÅLL LUGN FLYGNING';if(school.kind==='rescue')return heli.carrying?'← ÅTERVÄND TILL BASEN OCH LANDA':heli.ropeTarget?'SLÄPP E / VINSCH FÖR ATT HISSA UPP':'→ FORSKARE VID 1110 · HÅLL E / VINSCH FÖR ATT FÅNGA';if(school.kind==='cargo')return cargo?.status==='attached'?'→ LEVERANSPLATTA · HÅLL VINSCH OCH SÄNK LÅDAN VARSAMT':'→ FÅNGA LÅDAN MED E / VINSCH';return (school.kind==='gun'?'SPACE / ELD':'R / RAKET')+' · TRÄFFA BÅDA MÅLEN · '+enemies.filter(e=>e.hp<=0).length+'/2';}
function updateDrill(dt){let passed=false;if(school.kind==='turn'){const calm=!heli.landed&&heli.turn===0&&Math.abs(heli.angle)<.3&&Math.abs(heli.vx)<50&&Math.abs(heli.vy)<40,dir=school.turnedLeft?1:-1;school.hold=calm&&heli.dir===dir?school.hold+dt:0;if(school.hold>1){if(!school.turnedLeft){school.turnedLeft=true;school.hold=0;radio('Bra! Vänd tillbaka åt höger och balansera flygningen.',4);}else passed=true;}}if(school.kind==='rescue')passed=people.length>0&&people.every(p=>p.status==='delivered');if(school.kind==='cargo')passed=cargo?.status==='delivered';if(['gun','rocket'].includes(school.kind))passed=enemies.length>0&&enemies.every(e=>e.hp<=0);if(school.kind==='rocket'&&heli.rockets===0&&rockets.length===0){school.refill+=dt;if(school.refill>2){heli.rockets=4;school.refill=0;radio('Fyra nya övningsraketer. Sikta med nosen och försök igen.',4);}}if(passed){const kind=school.kind;save.trainingResults=save.trainingResults||{};save.trainingResults[kind]=true;persist();school.active=false;mode='trainingDone';clearInput();$('mobile').hidden=true;$('skipSchool').hidden=$('retrySchool').hidden=true;AudioState.sfx('rescue');showModal('ÖVNING GENOMFÖRD','Snyggt jobbat.', '<p>'+drillNames[kind]+' är genomförd. Övningen sparas separat från kampanjens poäng.</p>',[{text:'NÄSTA ÖVNING',primary:true,run:()=>{const kinds=Object.keys(drillNames),next=kinds[kinds.indexOf(kind)+1];next?startDrill(next):selectTraining()}},{text:'TRÄNA IGEN',run:()=>startDrill(kind)},{text:'ALLA ÖVNINGAR',run:selectTraining}]);}}
function drawDrillGuide(){let x=heli.x,y=heli.y-100,text=drillHint();if(school.kind==='rescue'){x=heli.carrying?390:1110;y=ground(x)-85;text=heli.carrying?'LANDA HEMMA':'VINSCHA UPP FORSKAREN';}if(school.kind==='cargo'){x=cargo?.status==='attached'?1740:1040;y=ground(x)-85;text=cargo?.status==='attached'?'SÄTT NER LÅDAN':'FÅNGA LÅDAN';}if(['gun','rocket'].includes(school.kind)){for(const e of enemies)if(e.hp>0){ctx.strokeStyle='#edcb8f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,40,0,TAU);ctx.stroke();label('ÖVNINGSMÅL · '+(school.kind==='gun'?'KANON':'RAKET'),e.x,e.y-78,'#f5dda6',11);}return;}label(text,x,y,'#cbf1d8',12);}
function startTraining(){loadLevel(0);school={active:true,kind:'basic',stage:0,hold:0};$('modalBody').innerHTML='<p>Tre korta övningar: lyft, motstyr och landa. Följ den turkosa markeringen. Flygningen har samma fysik som uppdragen.</p><p>Båda skärmhalvorna / W: lyft. En skärmhalva / A eller D: luta. Motluta för att bromsa. Släpp båda / S: sjunk. Du kan hoppa över övningen när som helst.</p>';}
function updateTraining(dt){$('retrySchool').hidden=!school.active;$('skipSchool').hidden=!school.active;if(school.active&&school.kind&&school.kind!=='basic'){updateDrill(dt);return;}if(!school.active)return;const h=heli;let inside=false;if(school.stage===0)inside=Math.abs(h.x-390)<90&&h.y<490&&!h.landed;else if(school.stage===1)inside=Math.abs(h.x-553)<60&&Math.abs(h.y-455)<48&&Math.abs(h.vx)<22&&Math.abs(h.vy)<20;else inside=school.cleanLanding&&h.landed&&Math.abs(h.x-553)<55&&Math.abs(h.vx)<12&&Math.abs(h.angle)<.15;school.hold=inside?school.hold+dt:Math.max(0,school.hold-dt*2);if(school.hold>=(school.stage===1?2:.7)){school.stage++;school.hold=0;AudioState.sfx('rescue');if(school.stage===3){school.active=false;time=0;$('retrySchool').hidden=true;save.schoolComplete=true;persist();$('skipSchool').hidden=true;radio('Grundflygningen klar! Fler övningar finns under FLYGSKOLA i menyn. Du kan också fortsätta räddningsuppdraget här.',7);popup(h.x,h.y-75,'GRUNDFLYGNING KLAR');}else radio(school.stage===1?'Bra lyft. Flyg till nästa ruta. Motluta tidigt för att stanna.':'Fin kontroll. Sänk dig långsamt över landningsplattan.',5);}}
function updatePrecision(dt){const h=heli,steady=!h.landed&&Math.abs(h.vx)<22&&Math.abs(h.vy)<18&&Math.abs(h.angle)<.16;precision.hold=steady?Math.min(4,precision.hold+dt):0;if(Math.abs(h.vx)>100)precision.fast=true;const target=people.find(p=>p.status==='waiting'&&Math.abs(p.x-h.x)<85&&p.y-h.y>60&&p.y-h.y<240);if(target&&steady&&precision.fast){precision.approach+=dt;if(precision.approach>=1.5&&!precision.targets.has(target.homeX)){precision.targets.add(target.homeX);score+=100;popup(h.x,h.y-80,'KONTROLLERAD INFLYGNING +100');AudioState.sfx('attach');precision.fast=false;}}else precision.approach=0;}
function drawFlightGuides(){if(school.active&&school.kind&&school.kind!=='basic'){drawDrillGuide();}if(school.active&&(!school.kind||school.kind==='basic')){const x=school.stage===0?390:553,y=school.stage===2?ground(x)-31:455,w=school.stage===0?150:110,h=school.stage===2?44:85;ctx.fillStyle='#8ceac810';ctx.fillRect(x-w/2,y-h/2,w,h);ctx.strokeStyle='#a5efcf';ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.strokeRect(x-w/2,y-h/2,w,h);ctx.setLineDash([]);label(['LYFT HIT','MOTLUTA · HÅLL POSITION','LANDA HÄR'][school.stage],x,y-h/2-15,'#caf5de',12);line(x-w/2,y+h/2+9,x-w/2+w*clamp(school.hold/(school.stage===1?2:.7),0,1),y+h/2+9,'#bdf6d7',4);}if(mode==='playing'&&!heli.landed&&(keys.KeyE||heli.ropeTarget)){const progress=clamp(precision.hold/1.2,0,1);line(heli.x-32,heli.y-80,heli.x+32,heli.y-80,'#183848',4);line(heli.x-32,heli.y-80,heli.x-32+64*progress,heli.y-80,'#b8ead0',4);label(progress===1?'LUGN VINSCHNING':'STABILISERA FÖR PRECISION',heli.x,heli.y-90,'#d0eadb',10);}}
function drawHazardGuides(){let nearest=Infinity;for(const o of obstacles){const dx=heli.x-clamp(heli.x,o.x,o.x+o.w),dy=heli.y-clamp(heli.y,o.y,o.y+o.h),distance=Math.hypot(dx,dy);nearest=Math.min(nearest,distance);if(o.x>camera+vw+100||o.x+o.w<camera-100)continue;if(distance<145){const x=clamp(heli.x,o.x,o.x+o.w),y=clamp(heli.y,o.y,o.y+o.h);glow(x,y,24,'#ffc57935');}}if(nearest<130&&mode==='playing'){label('KLIPPA NÄRA · AKTA ROTORN',heli.x,heli.y-155,'#ffd198',12);}}
function updateTutorial(){if(coarse||touchFlight){$('tip').textContent='EN SIDA: LUTA · BÅDA: LYFT · SLÄPP: SJUNK · SVEP: VÄND · VINSCH: TRYCK AV/PÅ';return;}if(school.active&&school.kind&&school.kind!=='basic'){$('tip').textContent=drillHint();return;}if(school.active){$('tip').textContent=[coarse?'1/3 · HÅLL BÅDA SKÄRMHALVORNA · LYFT TILL RUTAN':'1/3 · HÅLL W · LYFT TILL DEN TURKOSA RUTAN','2/3 · FLYG ÅT HÖGER · MOTLUTA OCH STANNA I RUTAN I 2 SEKUNDER','3/3 · SÄNK LYFTKRAFTEN · LANDA MJUKT PÅ DEN MARKERADE PLATTAN'][school.stage];return;}if(L.theme==='jungle'){$('tip').textContent=heli.x>1600&&heli.x<3050?'GROTTPASSAGE · TURKOSA LAMPOR VISAR VÄGEN · HJÄLP MED H / STABILISERA':'FÖLJ RAVINEN NERÅT · HÅLL ROTORN FRI FRÅN KLIPPORNA';return;}if(level!==0){$('tip').textContent=cargo&&cargo.status==='attached'?'Tung last: håll extra lyftkraft. Sänk varsamt över leveransplattan.':'';return;}if(time<12&&heli.x<650)$('tip').textContent=coarse?'För spaken uppåt för att lyfta. Luta åt sidan för att få fart.':'Håll W för att lyfta. A / D lutar helikoptern och bygger upp fart.';else if(time<32)$('tip').textContent='Släpp spaken: du glider vidare. Motluta för att bromsa.';else if(people.some(p=>p.status==='waiting'&&Math.abs(p.x-heli.x)<220))$('tip').textContent=coarse?'Stabilisera. Håll VINSCH för att sänka. Släpp när personen har fäst.':'H stabiliserar höjden. Håll E för att sänka vinschen, släpp för att hissa.';else if(save.depthMode&&Math.abs(heli.z)>14)$('tip').textContent='Återgå till uppdragsdjupet med J / CENTRERA för att rädda och landa vid basen.';else if(time<70)$('tip').textContent='Motluta för att bromsa. Q byter riktning. Flyg varsamt med last.';else $('tip').textContent='';}
function objectiveTarget(){if(heli.ropeTarget?.kind==='person')return{x:heli.x,text:'SLÄPP VINSCHEN · HISSA UPP'};if(cargo?.status==='attached')return{x:cargo.to,text:'LEVERERA GENERATORN'};if(cargo?.status==='waiting')return{x:cargo.x,text:'HÄMTA GENERATORN'};const waiting=people.filter(p=>p.status==='waiting').sort((a,b)=>Math.abs(a.x-heli.x)-Math.abs(b.x-heli.x));if(waiting.length)return{x:waiting[0].x,text:'NÖDSIGNAL'};if(L.clear){const e=enemies.filter(e=>e.hp>0).sort((a,b)=>Math.abs(a.x-heli.x)-Math.abs(b.x-heli.x))[0];if(e)return{x:e.x,text:'LUFTVÄRN'}}if(boss?.hp>0)return{x:boss.x,text:'HEAVY GUNSHIP'};return{x:390,text:'HEM TILL BASEN'};}
// A one-line map of the whole valley: every relay pad, the beacon at the far end, and where
// the craft is between them. Built once per mission, then only the marker moves.
let valleyMark=null,valleyPads=[];
function buildValleyRail(){
 const rail=$('valleyRail');valleyPads=[];valleyMark=null;
 if(!L.lost){rail.hidden=true;return;}
 rail.replaceChildren();
 const span=L.beacon||L.length;
 for(const pad of lostPads){
  const tick=document.createElement('b');tick.className='pad';
  tick.style.left=clamp(pad.x/span*100,0,100)+'%';rail.append(tick);valleyPads.push(tick);
 }
 const beacon=document.createElement('u');beacon.className='beacon';beacon.style.left='100%';rail.append(beacon);
 valleyMark=document.createElement('i');valleyMark.className='mark';rail.append(valleyMark);
 rail.hidden=false;
}
function updateValleyRail(){
 if(!valleyMark)return;
 valleyMark.style.left=clamp(heli.x/(L.beacon||L.length)*100,0,100)+'%';
 for(let i=0;i<valleyPads.length;i++)valleyPads[i].classList.toggle('reached',i<=lost.cp);
}

// One compact instrument rail: hull, fuel, height above ground, souls aboard, and the
// bearing plus distance to whatever the mission wants next. Everything else is drawn in
// the world or surfaces as radio, tip and warning text over the flight picture.
const hudCache={};
function put(id,html,asText){const el=$(id),key=id+(asText?'t':'h');if(hudCache[key]===html)return;hudCache[key]=html;if(asText)el.textContent=html;else el.innerHTML=html;}
function flag(id,name,on){const key=id+'.'+name;if(hudCache[key]===on)return;hudCache[key]=on;$(id).classList.toggle(name,on);}
function updateHUD(){
 const agl=ground(heli.x)-heli.y-30.8,target=objectiveTarget(),distance=Math.abs(target.x-heli.x),arrow=target.x<heli.x?'←':'→';
 const gauge=(id,name,value,alert)=>{put(id,'<small>'+name+'</small><b>'+Math.ceil(value)+'<em>%</em></b><i><u style="width:'+clamp(value,0,100)+'%"></u></i>');flag(id,'alert',alert);};
 gauge('compactHealth','SKROV',heli.hp,heli.hp<30);
 gauge('compactFuel','BRÄNSLE',heli.fuel,heli.fuel<20);
 put('compactAlt','<small>HÖJD</small><b>'+Math.max(0,Math.round(agl*.45))+'<em> m</em></b>');
 flag('compactAlt','alert',!heli.landed&&agl<45);
 const gathered=stars.filter(s=>s.taken).length;
 put('compactStars','<small>LÅDOR</small><b>'+gathered+'<em> / '+stars.length+'</em></b>');
 $('compactStars').hidden=!stars.length;
 flag('compactStars','done',stars.length>0&&gathered===stars.length);
 put('compactPeople','<small>OMBORD</small><b>'+heli.carrying+'<em> / '+people.length+'</em></b>');
 $('compactPeople').hidden=!people.length;
 put('compactGoal',school.active?'FLYGSKOLA':arrow+' '+target.text+(distance>60?' · '+Math.round(distance*.45)+' m':''),true);
 flag('hoverBtn','active',hoverMode);flag('winchBtn','active',!!keys.KeyE);
 put('soundBtn',save.muted?'LJUD AV':'LJUD PÅ',true);$('soundBtn').setAttribute('aria-pressed',String(!save.muted));
 $('radio').style.opacity=radioTimer>0?1:0;
 updateValleyRail();
 // Contextual coaching only; the plain distance already lives in the instrument rail.
 put('targetGuide',school.active?'FLYGSKOLA · '+(school.kind&&school.kind!=='basic'?drillHint():['LYFT','MOTSTYR OCH STANNA','MJUK LANDNING'][school.stage]):heli.landed&&heli.x<610?'BASSERVICE · '+heli.delivered+'/'+people.length+' HEMMA':distance<70&&target.text==='NÖDSIGNAL'?'HÅLL POSITION · SÄNK VINSCHEN':'',true);
 const warn=heli.hp<25?'SKROV KRITISKT · ÅTERVÄND':heli.fuel<18?'LÅGT BRÄNSLE · ÅTERVÄND':!heli.landed&&agl<45&&heli.vy>60?'MARKNÄRA · MINSKA SJUNKET':'';
 put('warning',warn,true);flag('tip','hushed',!!warn);
}
// Pointer capture supports multi-touch without sticky weapons when fingers slide away.
addEventListener('keydown',e=>{if(e.code==='Escape'&&!e.repeat){pause();return;}if(e.code==='Enter'&&mode==='brief'){begin();return;}if(mode!=='playing')return;if(!keys[e.code]&&!e.repeat)edges[e.code]=true;keys[e.code]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();});addEventListener('keyup',e=>{keys[e.code]=false});

for(const [id,side]of [['flightLeft',-1],['flightRight',1]]){
 const el=$(id);
 el.addEventListener('pointerdown',e=>{if(mode!=='playing')return;e.preventDefault();touchFlight=true;hoverMode=false;flightTouches.set(e.pointerId,{side,x:e.clientX,y:e.clientY,swiped:false});el.setPointerCapture(e.pointerId);el.classList.add('pressed');});
 el.addEventListener('pointermove',e=>{const p=flightTouches.get(e.pointerId);if(!p)return;e.preventDefault();const dx=e.clientX-p.x,dy=e.clientY-p.y;if(!p.swiped&&Math.abs(dx)>Math.max(48,innerWidth*.065)&&Math.abs(dx)>Math.abs(dy)*1.5){p.swiped=true;requestFacing(dx>0?1:-1);}});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,e=>{flightTouches.delete(e.pointerId);el.classList.toggle('pressed',[...flightTouches.values()].some(p=>p.side===side));});
}
$('winchBtn').addEventListener('pointerdown',e=>{e.preventDefault();if(mode==='playing')keys.KeyE=!keys.KeyE;});
$('hoverBtn').addEventListener('pointerdown',e=>{e.preventDefault();if(mode==='playing')edges.KeyH=true;});
$('menuSettings').onclick=settings;$('lostBtn').onclick=()=>startLost();$('freshLostBtn').onclick=()=>{showModal('NYTT FÖRSÖK','Börja från Eagle Base?','<p>Det sparade försöket ersätts när du startar.</p>',[{text:'STARTA NYTT',primary:true,run:()=>startLost(true)},{text:'TILLBAKA',run:toMenu}]);};$('startBtn').onclick=()=>{AudioState.init();if(!save.schoolComplete&&save.unlocked===0)startTraining();else if(levels[save.unlocked]?.lost)startLost();else loadLevel(save.unlocked)};$('schoolBtn').onclick=selectTraining;$('skipSchool').onclick=selectTraining;$('retrySchool').onclick=()=>{const kind=school.kind||'basic';startDrill(kind)};$('selectBtn').onclick=selectMissions;$('jungleBtn').onclick=()=>{AudioState.init();loadLevel(6)};$('pauseBtn').onclick=pause;$('settingsBtn').onclick=settings;$('soundBtn').onclick=()=>{save.muted=!save.muted;persist();AudioState.init();AudioState.sync();updateHUD()};$('fullBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();}catch{}};if(!document.documentElement.requestFullscreen)$('fullBtn').hidden=true;
addEventListener('keydown',e=>{if(e.code!=='Tab'||$('modal').hidden)return;const list=[...$('modal').querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')];if(!list.length)return;const first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}});
addEventListener('blur',()=>{if(lost.active)saveLost();clearInput();if(mode==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden){if(lost.active)saveLost();clearInput();if(mode==='playing')pause()}});
let previous=0,accumulator=0;function frame(now){const dt=Math.min(.08,(now-previous)/1000||0);previous=now;accumulator+=dt;while(accumulator>=1/120){fixedUpdate(1/120);accumulator-=1/120;}render();requestAnimationFrame(frame);}
resize();loadLevel(0,false);if(save.unlocked>0)$('startBtn').innerHTML='FORTSÄTT KAMPANJ <span>→</span>';requestAnimationFrame(frame);
})();

