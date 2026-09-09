(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,damp=(a,b,k,dt)=>lerp(a,b,1-Math.exp(-k*dt));
const rand=(a=0,b=1)=>a+Math.random()*(b-a),fmt=n=>Math.round(n).toLocaleString('en-GB');
let vw=1280,vh=720,scale=1,ox=0,oy=0,dpr=1;
// The world box the camera sees. resize() fixes the base size for the screen; zoom widens it
// with altitude so the valley floor stays in frame instead of sliding off the bottom edge.
let baseVw=1280,baseVh=720,baseScale=1,zoom=1;
const art={range:new Image(),tropical:new Image(),pine:new Image()};art.range.src='assets/backgrounds/alpine-range.webp';art.tropical.src='assets/backgrounds/tropical-range.webp';art.pine.src='assets/nature/pine-mature.webp';
const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
const coarse=window.matchMedia?.('(pointer: coarse)').matches||false;
const levels=[
 {name:'FIRST LIGHT',region:'Birch Valley',brief:'Three hikers are stranded in the valley. Winch them aboard and land at the base.',objective:'Rescue 3 people and return.',length:4600,seed:17,theme:'day',people:[1250,2370,3650],guns:[{x:3070,type:'gun'}],par:165,wind:0},
 {name:'COPPER RIDGE',region:'Copper Pass',brief:'Clear the pass and rescue two pilots.',objective:'Disable 3 air defences. Rescue 2 pilots.',length:5400,seed:62,theme:'sunset',people:[2080,4510],guns:[{x:1450,type:'gun'},{x:3170,type:'gun'},{x:4070,type:'missile'}],clear:true,par:220,wind:6},
 {name:'STORMLINE',region:'Western Outpost',brief:'The outpost needs a generator. Collect it at the depot, lower it onto the marked pad and rescue two technicians.',objective:'Deliver the generator and rescue 2 technicians.',length:5700,seed:32,theme:'storm',people:[2470,4690],guns:[{x:3220,type:'gun'},{x:5010,type:'missile'}],cargo:{x:1020,to:3970},par:250,wind:17},
 {name:'WHITEOUT',region:'Frost Fjord',brief:'Four people are missing along the fjord. Visibility is limited. Follow distress signals and let the winch settle.',objective:'Rescue 4 people in the snowstorm.',length:6300,seed:91,theme:'snow',people:[1490,2850,4130,5380],guns:[{x:2220,type:'gun'},{x:4690,type:'missile'}],par:245,wind:13},
 {name:'NIGHTFALL',region:'Black valley',brief:'Secure the corridor before dawn and rescue the waiting crew.',objective:'Disable 5 air defences. Rescue 2 people.',length:6500,seed:83,theme:'night',people:[2520,5430],guns:[{x:1440,type:'gun'},{x:2240,type:'missile'},{x:3370,type:'gun'},{x:4270,type:'gun'},{x:5810,type:'missile'}],clear:true,par:290,wind:9},
 {name:'BLACK SKY',region:'Final corridor',brief:'Clear the exit and bring the final group home.',objective:'Defeat Heavy Gunship and rescue 3.',length:6700,seed:116,theme:'night',people:[1880,3610,5570],guns:[{x:2830,type:'gun'},{x:4590,type:'missile'}],boss:true,par:300,wind:11}
 ,{name:'EMERALD PASSAGE',region:'Emerald Jungle',brief:'Three researchers await rescue in the canyon. Follow the turquoise lamps under the arch. Keep the rotor clear of the roof and pillars. Highlighted rocks are solid; trees and vines are scenery. Return with all three.',objective:'Rescue 3 researchers, one inside the cave.',length:5000,seed:203,theme:'jungle',people:[1470,2420,4080],guns:[{x:3710,type:'gun'}],par:310,wind:7}
 ,{name:'THE LOST VALLEY',region:'The Lost Valley',brief:'Reach the beacon, rescue the crew and fly all the way home.',objective:'Rescue 2 at the beacon and return to Eagle Base.',length:26000,beacon:25200,seed:317,theme:'day',people:[25030,25320],guns:[],par:1500,wind:0,lost:true}
];
// Self-contained operations. Earlier prototypes remain archived for regression coverage only.
const LOST_LEVEL=levels.findIndex(l=>l.lost);
const OP_START=levels.length;
const operations=[
 {name:'FIRST CALL',region:'Birch Lake',environment:'alpine-lake',tag:'RESCUE · CLEAR DAY',brief:'Two hikers need help on opposite sides of the ridge. Choose the open high route or a careful approach around the rock. Winch both aboard and land at home base.',objective:'Rescue two hikers and return home.',length:2400,seed:417,theme:'day',people:[1120,1980],wind:0,par:230,obstacles:[{x:1520,w:95,h:160,type:'pillar'}]},
 {name:'FOREST FIRE',region:'Copper Lake',tag:'WATER · PRECISION',brief:'Two fires threaten the forest. Lower the bucket into the turquoise lake to fill it. Fly over a fire and select DROP WATER. Water carries your momentum: slow down or lead the drop. Extinguish both fires and return home.',objective:'Extinguish two fires and return.',length:3400,seed:462,theme:'sunset',people:[],wind:4,par:330,lakes:[{x:860,w:480,y:620}],fires:[{x:2110,water:60},{x:2840,water:70}],obstacles:[{x:1590,w:90,h:145,type:'pillar'}]},
 {name:'LIGHTHOUSE BLACKOUT',region:'Night Point',tag:'HEAVY LIFT · NIGHT RESCUE',brief:'The lighthouse is dark. Collect the generator at the depot and lower it onto the lighthouse pad. Restoring power lets two keepers leave their shelter. Rescue them and return home. The field pad offers fuel and repairs.',objective:'Restore power, rescue two and return.',length:4400,seed:483,theme:'night',people:[3460,3850],cargo:{x:1000,to:3110},gate:'cargo',wind:6,par:440,fieldPads:[2240],obstacles:[{x:1570,w:80,h:195,type:'pillar'},{x:2640,w:230,h:70,type:'bridge',gap:260}]},
 {name:'EMERALD PASS',region:'Orchid Expedition',tag:'CANYON · CAVE · WINCH',brief:'Three researchers are scattered along the canyon. One waits beneath the rock arch. Turquoise lamps mark the entrance; the high route offers more room elsewhere. Use the camp pad when needed. Rescue all three and return.',objective:'Rescue three researchers, one beneath the arch.',length:5400,seed:503,theme:'jungle',people:[1470,2420,4630],wind:7,par:510,fieldPads:[3730],obstacles:[{x:1810,y:425,w:1180,h:165,type:'roof'},{x:3260,w:90,h:170,type:'pillar'},{x:4230,w:85,h:150,type:'pillar'}]},
 {name:'FIRELINE',region:'Evacuation Zone',tag:'FIREFIGHTING → EVACUATION',brief:'Three fires block the evacuation. Collect water from either lake and extinguish every fire. Your bucket then switches to the rescue hook. Collect the three residents and fly home. The field pad provides a break between operations.',objective:'Extinguish three fires and evacuate three people.',length:6600,seed:547,theme:'sunset',people:[3820,4910,5840],gate:'fire',wind:11,par:660,lakes:[{x:950,w:500,y:625},{x:4270,w:420,y:625}],fires:[{x:3720,water:70},{x:5040,water:80},{x:5830,water:75}],fieldPads:[2810],obstacles:[{x:2080,w:110,h:230,type:'pillar'},{x:3220,w:240,h:80,type:'bridge',gap:255},{x:5370,w:85,h:180,type:'pillar'}]},
 {name:'LAST LIGHT',region:'Frost Range',tag:'WINTER · CARGO → RESCUE',brief:'The winter station has lost its heating. Deliver the generator through the mountain pass, then rescue four people from their emergency shelters. Two field pads offer fuel and repairs. Take the open high routes when cargo sway needs more room. Bring everyone home.',objective:'Restore heating and rescue four people.',length:8000,seed:591,theme:'snow',people:[4050,5240,6340,7250],cargo:{x:1070,to:3620},gate:'cargo',wind:13,par:800,fieldPads:[2560,5870],obstacles:[{x:1760,w:100,h:220,type:'pillar'},{x:3040,w:240,h:85,type:'bridge',gap:275},{x:4640,w:110,h:240,type:'pillar'},{x:6710,w:320,h:110,type:'roof',gap:250}]},
 {name:'SKYWARD',region:'Crown Summit',tag:'HIGH ALTITUDE · SUMMIT DELIVERY',brief:'A summit observatory needs power. Pick up the generator at the valley depot, then carry it 2,165 metres above the base to Crown Summit. Climb before each ridge and leave room beneath the load. Three wide mountain camps offer fuel and repairs: lower the generator onto the ground before landing beside it. Deliver onto the summit pad, retract the winch, then descend all the way home. The sky is open; there is no roof and no hard time limit.',objective:'Collect the generator → climb to Crown Summit → deliver → return to the valley base.',length:8800,seed:631,theme:'snow',summit:true,people:[],cargo:{x:1000,to:7800},wind:7,par:1100,fieldPads:[2500,4500,6400],profile:[[0,610],[1250,610],[2100,-460],[2320,-590],[2700,-590],[3450,-1480],[4120,-1790],[4740,-1790],[5500,-2860],[6100,-3040],[6700,-3040],[7450,-4200],[8300,-4200],[8800,-3820]],obstacles:[{x:1760,w:90,h:150,type:'pillar'},{x:3350,w:100,h:180,type:'pillar'},{x:5590,w:100,h:190,type:'pillar'},{x:7100,w:85,h:160,type:'pillar'}]},
 {name:'STORMBREAK',region:'Grey Ridge',environment:'storm-mountains',tag:'STORM · FOUR CASUALTIES',brief:'The front came in faster than the forecast. Four climbers are strung out along the ridge with no shelter between them. The wind is the mission: it pushes hardest over the open saddles, so cross them with speed in hand and countersteer early. Two field camps sit between the pickups.',objective:'Rescue four climbers in the storm and return home.',length:9200,seed:673,theme:'storm',people:[2600,4400,6180,8060],wind:16,par:900,fieldPads:[3480,6880],obstacles:[{x:1820,w:95,h:210,type:'pillar'},{x:5140,w:260,h:80,type:'bridge',gap:270},{x:7420,w:105,h:225,type:'pillar'}]},
 {name:'ASHFALL RIDGE',region:'Cinder Valley',tag:'FOUR FIRES → EVACUATION',brief:'The valley is burning from both ends and the smoke is closing the middle. Two lakes, four fires, two families waiting. Fill the bucket, lead your drops, and remember the water keeps your speed when you release it. The hook only comes back once the last fire is out.',objective:'Extinguish four fires, then evacuate two residents.',length:9700,seed:701,theme:'sunset',people:[8420,9060],gate:'fire',wind:9,par:940,lakes:[{x:1020,w:520,y:625},{x:5240,w:460,y:625}],fires:[{x:2980,water:70},{x:4180,water:75},{x:6420,water:80},{x:7380,water:85}],fieldPads:[3620,6960],obstacles:[{x:2320,w:100,h:200,type:'pillar'},{x:5760,w:250,h:80,type:'bridge',gap:265}]},
 {name:'DEAD CHANNEL',region:'Old Locks',tag:'ROBOT PATROL · CARGO · NIGHT',brief:'The lock keepers went quiet three days ago and the automated harbour defence has been shooting at anything with a rotor since. Disable all three machines, carry the pump unit to the lock house, and take the two keepers home. Space fires the machine gun, R launches a rocket, F drops flares. Field camps reload.',objective:'Disable three machines, deliver the pump and rescue two.',length:10300,seed:733,theme:'night',people:[8640,9280],cargo:{x:1080,to:6240},gate:'cargo',combat:true,clear:true,guns:[{x:2440,type:'gun'},{x:4620,type:'drone'},{x:7480,type:'gun'}],wind:8,par:1020,fieldPads:[3560,7960],obstacles:[{x:1940,w:90,h:190,type:'pillar'},{x:5480,w:270,h:85,type:'bridge',gap:275},{x:8920,w:100,h:205,type:'pillar'}]},
 {name:'GLACIER MOUTH',region:'Blue Ice',tag:'WINTER · CARGO → FOUR RESCUES',brief:'The ice research station has lost its heater and the shelters will not hold overnight. Bring the generator up the glacier first; the crews stay inside until the heat is back. Then collect all four. The bridge over the crevasse is the short way and the tight way.',objective:'Restore the heater, then rescue four researchers.',length:10900,seed:761,theme:'snow',people:[5240,6880,8460,9820],cargo:{x:1060,to:3980},gate:'cargo',wind:14,par:1080,fieldPads:[2680,7540],obstacles:[{x:1880,w:100,h:225,type:'pillar'},{x:4740,w:280,h:90,type:'bridge',gap:280},{x:7080,w:340,h:115,type:'roof',gap:255},{x:9340,w:95,h:200,type:'pillar'}]},
 {name:'THE DROWNED MILL',region:'Fog Basin',environment:'misty-valley',tag:'FOG · WATER · THREE RESCUES',brief:'Fog to the treetops and a mill fire nobody can see from the road. Three fires, three people, and visibility that will not help you. Fly low enough to read the ground and slow enough to stop. The lake is wide; the fires are not.',objective:'Extinguish three fires in the fog, then rescue three.',length:11500,seed:797,theme:'day',people:[8920,9740,10620],gate:'fire',wind:6,par:1140,lakes:[{x:1140,w:620,y:625},{x:6180,w:480,y:625}],fires:[{x:3320,water:80},{x:4980,water:85},{x:7460,water:80}],fieldPads:[2560,8140],obstacles:[{x:2180,w:95,h:195,type:'pillar'},{x:5680,w:300,h:100,type:'roof',gap:250},{x:9980,w:100,h:210,type:'pillar'}]},
 {name:'SCRAPYARD SKY',region:'Rust Flats',environment:'storm-mountains',tag:'HEAVY DEFENCE · RAIN',brief:'Somebody armed a salvage yard and then left. Four machines are still running the patrol they were given, one of them with missiles. The amber sensor flashes before it fires; flares break the lock. Three salvage crews are pinned behind the line and cannot move until it is quiet.',objective:'Disable four machines, then rescue three trapped crew.',length:12200,seed:823,theme:'storm',people:[9240,10380,11460],combat:true,clear:true,guns:[{x:2680,type:'gun'},{x:4840,type:'drone'},{x:6720,type:'missile'},{x:8260,type:'gun'}],wind:12,par:1200,fieldPads:[3720,7480],obstacles:[{x:2060,w:105,h:215,type:'pillar'},{x:5620,w:260,h:85,type:'bridge',gap:270},{x:9880,w:95,h:190,type:'pillar'}]},
 {name:'GREENFIRE',region:'Orchid Canyon',tag:'CANYON · FIRE · THREE RESCUES',brief:'A dry season in a wet place. The canopy is alight under the arch and the canyon walls leave you no room to be casual with a full bucket. Three fires, three botanists. The high route is open the whole way if the arch feels too tight with water swinging beneath you.',objective:'Extinguish three canopy fires, then rescue three botanists.',length:12900,seed:859,theme:'jungle',people:[9680,10940,12040],gate:'fire',wind:8,par:1260,lakes:[{x:1180,w:560,y:625},{x:6420,w:500,y:625}],fires:[{x:3480,water:80},{x:5160,water:85},{x:7840,water:90}],fieldPads:[3080,8520],obstacles:[{x:1960,w:900,h:150,type:'roof',gap:265},{x:4560,w:95,h:180,type:'pillar'},{x:7020,w:90,h:170,type:'pillar'},{x:11220,w:100,h:195,type:'pillar'}]},
 {name:'THE LONG NIGHT',region:'Hollow County',tag:'CARGO · FIRE · FOUR RESCUES',brief:'Everything at once, and all of it in the dark. Power to the pumping station first, because the fire crews cannot draw water without it. Then the three fires. Then the four people who have been waiting through all of it. Three field camps; use them, this one is long.',objective:'Deliver power, extinguish three fires and rescue four.',length:13600,seed:887,theme:'night',people:[9840,10920,12060,13060],cargo:{x:1080,to:4260},gate:'cargo',wind:10,par:1320,lakes:[{x:1560,w:540,y:625},{x:7240,w:520,y:625}],fires:[{x:5480,water:80},{x:6620,water:85},{x:8480,water:90}],fieldPads:[2960,7960,11400],obstacles:[{x:2260,w:100,h:205,type:'pillar'},{x:5980,w:280,h:90,type:'bridge',gap:275},{x:9260,w:340,h:110,type:'roof',gap:260},{x:12480,w:95,h:185,type:'pillar'}]},
 {name:'NORTH WALL',region:'Vantage Peak',tag:'HIGH ALTITUDE · 2,400 m',brief:'A weather mast for the ridge that kills people every winter. The parts are in the valley and the mast goes on top, 2,400 metres up. Climb before every wall, not after it, and keep the load clear of the rock. Four camps on the way for fuel and repairs. No time limit; the mountain does not care how fast you are.',objective:'Carry the mast to Vantage Peak, then descend to the valley base.',length:14400,seed:919,theme:'snow',summit:true,people:[],cargo:{x:1020,to:13200},wind:9,par:1700,fieldPads:[3200,6100,9200,11800],profile:[[0,610],[1400,610],[2300,-380],[2600,-520],[3600,-520],[4400,-1360],[5100,-1620],[6500,-1620],[7300,-2560],[7900,-2780],[9600,-2780],[10400,-3720],[11000,-3940],[12200,-3940],[12900,-4720],[13800,-4720],[14400,-4380]],obstacles:[{x:1900,w:90,h:150,type:'pillar'},{x:4900,w:95,h:175,type:'pillar'},{x:8400,w:100,h:185,type:'pillar'},{x:11200,w:85,h:160,type:'pillar'}]},
 {name:'THE LAST MACHINE',region:'Terminus',environment:'storm-mountains',tag:'FINALE · EVERYTHING AT ONCE',brief:'The last of the automated network is here, and it kept the biggest thing for itself. Four sentries, three fires it started, a relay that needs power, and four people who have been waiting for somebody to come this far. WARDEN II holds the final sector; its sensor flashes amber before it fires. Everything you have learned, in one flight.',objective:'Clear the sector, deliver power, extinguish three fires and bring four people home.',length:15200,seed:953,theme:'storm',people:[10240,11380,12420,13480],cargo:{x:1100,to:4820},gate:'cargo',combat:true,clear:true,boss:true,guns:[{x:2480,type:'gun'},{x:5620,type:'drone'},{x:7480,type:'missile'},{x:9060,type:'gun'}],wind:15,par:1560,lakes:[{x:1620,w:560,y:625},{x:8020,w:520,y:625}],fires:[{x:6280,water:85},{x:7360,water:90},{x:9880,water:95}],fieldPads:[3340,8640,12800],obstacles:[{x:2020,w:105,h:220,type:'pillar'},{x:6720,w:280,h:90,type:'bridge',gap:280},{x:10680,w:340,h:115,type:'roof',gap:260}]}
];
// Only these operations contain hostile, unmanned machines. Rescue/fire/summit flights stay peaceful.
Object.assign(operations[2],{combat:true,clear:true,guns:[{x:1550,type:'drone'},{x:2800,type:'gun'}]});
operations[2].objective='Disable two robots, restore power, rescue two and return.';operations[2].tag='ROBOT PATROL · CARGO · RESCUE';operations[2].brief+=' An abandoned security network has gone rogue. Disable its unmanned drone and crawler before returning. Space fires the machine gun; R launches a rocket; F deploys flares. Touch: tap FIRE to toggle bursts, ROCKET to launch. Base and field camps reload supplies.';
Object.assign(operations[5],{combat:true,clear:true,boss:true,guns:[{x:1950,type:'gun'},{x:4250,type:'drone'},{x:6250,type:'missile'}]});
operations[5].objective='Deliver power, disable the robot network and WARDEN, rescue four and return.';operations[5].tag='ROBOT NETWORK · COMMAND DRONE';operations[5].brief+=' Rogue robot sentries patrol the route. Disable all three and the unmanned WARDEN command aircraft guarding the final sector. Its amber sensor flashes before firing. Space / FIRE toggles machine-gun fire on touch, R / ROCKET launches, F / FLARES diverts missiles. Field camps replenish ammunition. People cannot be hurt by weapons.';
operations.forEach((l,i)=>levels.push({...l,ops:true,opsIndex:i,guns:l.guns||[]}));
let save={unlocked:0,results:{},best:0,muted:false,sensitivity:1,depthMode:false,musicVolume:.55};try{const s=JSON.parse(localStorage.getItem('rotorBlackSkyV2')||'null');if(s&&typeof s==='object'){save.unlocked=clamp(Number(s.unlocked)||0,0,levels.length-1);save.results=s.results||{};save.lastOperation=Number(s.lastOperation);save.best=Number(s.best)||0;save.muted=!!s.muted;save.musicVolume=clamp(Number(s.musicVolume??.55),0,1);save.sensitivity=clamp(Number(s.sensitivity)||1,.5,1.6);save.depthMode=false;save.schoolComplete=!!s.schoolComplete;save.trainingResults=s.trainingResults||{}}}catch{}
const TEST_FLIGHT=true;
save.depthMode=false;
function persist(){try{localStorage.setItem('rotorBlackSkyV2',JSON.stringify(save))}catch{}}
let mode='menu',level=0,L=levels[0],time=0,visualTime=0,score=0,camera=0,cameraY=0,shake=0,damageFlash=0,wind=0,heli,terrain=[],scenery=[],people=[],enemies=[],cargo=null,boss=null;
let bullets=[],rockets=[],missiles=[],particles=[],smokes=[],bursts=[],decoys=[],texts=[],debris=[],clouds=[],obstacles=[];
let gunCd=0,rocketCd=0,flareCd=0,muzzle=0,unload=0,service=0,radioTimer=0,warningTimer=0,comboTimer=0,combo=0,hudTimer=0,saveScore=0,missionKills=0,landings=0,crashHits=0,perfectPickups=0,hoverMode=false,tutorial=0,checkpoint=0;
let ops=null;
let school={active:false,stage:0,hold:0},precision={hold:0,approach:0,fast:false,targets:new Set(),landings:new Set()};
const keys={},edges={};let joy={x:0,y:0,id:null};
const gyro={enabled:false,raw:null,zero:null,filtered:0,last:0,invert:false,status:'Gyro off. Touch and keyboard controls remain available.'};
function gyroStatus(text){gyro.status=text;const el=$('gyroStatus');if(el)el.textContent=text;}
function calibrateGyro(){gyro.zero=gyro.raw;gyro.filtered=0;gyroStatus(gyro.raw===null?'Waiting for the motion sensor. Hold the device still in landscape.':'Centre saved. Tilt gently left and right.');}
async function enableGyro(){if(gyro.enabled){gyro.enabled=false;gyro.filtered=0;gyroStatus('Gyro off.');$('gyroEnable').textContent='ENABLE GYRO';return;}const D=window.DeviceOrientationEvent;if(!D){gyroStatus('No motion sensor available. Use touch or keyboard.');return;}try{if(typeof D.requestPermission==='function'&&await D.requestPermission()!=='granted'){gyroStatus('Motion access denied. Touch and keyboard still work.');return;}gyro.enabled=true;gyro.raw=gyro.zero=null;gyro.filtered=0;gyro.last=performance.now();gyroStatus('Hold your device still in landscape. The first sensor reading sets the centre.');$('gyroEnable').textContent='DISABLE GYRO';setTimeout(()=>{if(gyro.enabled&&gyro.raw===null)gyroStatus('No sensor data yet. Open the game in Safari and enable gyro there.');},3500);}catch{gyroStatus('Gyro could not start. Open the game in Safari and try again.');}}
function orientationSample(e){if(!gyro.enabled||!Number.isFinite(e.beta)||!Number.isFinite(e.gamma))return;if(innerWidth<innerHeight){gyro.raw=gyro.zero=null;gyro.filtered=0;gyroStatus('Rotate your device to landscape.');return;}const angle=(window.screen?.orientation?.angle??window.orientation??90)*Math.PI/180,b=e.beta*Math.PI/180,g=e.gamma*Math.PI/180;
 const sideways=Math.cos(b)*Math.sin(g)*Math.cos(angle)-Math.sin(b)*Math.sin(angle);
 gyro.raw=Math.asin(clamp(sideways,-1,1))*180/Math.PI;gyro.last=performance.now();if(gyro.zero===null){gyro.zero=gyro.raw;gyroStatus('Gyro active. Centre saved.');}}
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
function resize(){dpr=Math.min(coarse?1.5:2,window.devicePixelRatio||1);const compact=innerWidth<=620||innerHeight<=520,top=compact?12:54,bottom=12,available=Math.max(120,innerHeight-top-bottom);
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
  // COPPER RIDGE -> pad 9100. A picket of pillars: wide gaps, the gentle re-introduction.
  {x:7300,w:70,h:250,type:'pillar'},{x:7760,w:70,h:190,type:'pillar'},
  {x:8180,w:80,h:290,type:'pillar'},{x:8620,w:70,h:220,type:'pillar'},
  // RIVER VALLEY -> pad 11300. Low arches. Under is quick, over costs height and time.
  {x:9800,w:240,h:80,type:'bridge',gap:180},{x:10360,w:260,h:90,type:'bridge',gap:178},
  {x:10820,w:200,h:80,type:'bridge',gap:180},
  // FJALLSTATIONEN -> pad 13600. A slot: something above and something below, hold the line.
  {x:12100,w:90,h:230,type:'pillar'},{x:12420,w:420,h:150,type:'roof',gap:195},
  {x:12960,w:90,h:190,type:'pillar'},{x:13060,w:260,h:110,type:'bridge',gap:178},
  // LANGA PASSET -> pad 15800. The signature corridor: a long ceiling with teeth under it.
  {x:14300,w:600,h:200,type:'roof',gap:230},{x:14520,w:80,h:55,type:'pillar'},
  {x:14780,w:80,h:50,type:'pillar'},{x:15080,w:440,h:170,type:'roof',gap:225},
  {x:15300,w:80,h:52,type:'pillar'},
  // NORTH VALLEY -> pad 18100. Open sky, tall pillars, and the wind decides when you may pass.
  {x:16600,w:80,h:330,type:'pillar'},{x:17140,w:80,h:270,type:'pillar'},
  {x:17660,w:80,h:360,type:'pillar'},
  // DEN OVERGIVNA BASEN -> pad 20400. Hangars and a mast; the gaps are square and unforgiving.
  {x:18900,w:340,h:130,type:'bridge',gap:180},{x:19420,w:100,h:330,type:'pillar'},
  {x:19760,w:280,h:140,type:'roof',gap:185},{x:20080,w:90,h:240,type:'pillar'},
  // BEACON TRAIL -> pad 22800. Everything at once, but still fair.
  {x:21300,w:80,h:290,type:'pillar'},{x:21580,w:400,h:150,type:'roof',gap:182},
  {x:22020,w:80,h:250,type:'pillar'},{x:22260,w:260,h:110,type:'bridge',gap:180},
  // FINAL APPROACH -> the beacon. The narrowest gate on the route, with the most to lose.
  {x:23600,w:90,h:310,type:'pillar'},{x:23920,w:380,h:190,type:'roof',gap:176},
  {x:24380,w:90,h:270,type:'pillar'},{x:24500,w:260,h:100,type:'bridge',gap:178}
 ];if(L.theme==='jungle')obstacles=[{x:1810,y:425,w:1180,h:165,type:'roof'},{x:3230,y:405,w:110,h:205,type:'pillar'},{x:4420,y:360,w:140,h:250,type:'pillar'}];if(L.ops)obstacles=(L.obstacles||[]).map(o=>({...o}));terrain=[];for(let x=0;x<=L.length+80;x+=40){let y=570+Math.sin(x*.002+L.seed)*58+Math.sin(x*.0062)*25+Math.sin(x*.015)*7;if(x<660)y=610;else if(x<850)y=lerp(610,y,(x-660)/190);if(L.cargo){const d=Math.abs(x-L.cargo.x),e=Math.abs(x-L.cargo.to);if(d<120)y=600;if(e<180)y=578}if(L.theme==='jungle'&&x>=1000&&x<=3580){if(x<1600)y=lerp(610,885,(x-1000)/600);else if(x<3020)y=885;else y=lerp(885,610,(x-3020)/560);}if(L.lost)y=lostTerrain(x,y);if(L.ops)y=operationTerrain(x,y);terrain.push(y)}for(const o of obstacles){
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
 }scenery=[];for(let x=690;x<L.length-120;x+=40+rng()*95){scenery.push({x,y:ground(x),s:.7+rng()*1.1,type:rng()>.26?'tree':'rock',variant:rng(),depth:rng()})}if(L.theme==='jungle')for(const t of scenery)if(t.x>1810&&t.x<2990){t.type='rock';t.s*=.65;}if(L.summit)scenery=scenery.filter(t=>Math.abs(t.x-L.cargo.x)>150&&Math.abs(t.x-L.cargo.to)>330).map(t=>t.y<-1400?{...t,type:'rock'}:t);if(L.ops)scenery=scenery.filter(t=>!(L.lakes||[]).some(l=>t.x>l.x-25&&t.x<l.x+l.w+25)&&!(L.fieldPads||[]).some(x=>Math.abs(x-t.x)<100)&&!(L.fires||[]).some(f=>Math.abs(f.x-t.x)<75));clouds=Array.from({length:12},()=>({x:rng()*5000,y:45+rng()*240,w:130+rng()*190,a:.04+rng()*.07}));}
function newHeli(){return{x:390,z:0,vz:0,y:ground(390)-30.8,vx:0,vy:0,angle:0,av:0,collective:0,dir:1,hp:100,fuel:100,rockets:8,flares:4,heat:0,overheated:false,landed:true,airborne:false,rotor:0,spool:.25,turn:0,yaw:0,yawTarget:0,cyclic:0,bank:0,hitCd:0,rope:0,ropeAngle:0,ropeV:0,ropeNodes:[],ropeMount:null,ropeTension:0,ropeSupport:1,ropeTarget:null,carrying:0,delivered:0,hookX:390,hookY:ground(390)-4,dents:[],hoverY:0,brake:false,nearGround:0,compression:0};}
function loadLevel(i,play=true){if(play&&levels[i]?.ops){save.lastOperation=i;persist();}lost.active=false;$('lostStatus').hidden=true;document.body?.classList.remove('lostMode');$('skipSchool').hidden=true;$('retrySchool').hidden=true;school={active:false,stage:0,hold:0};precision={hold:0,approach:0,fast:false,targets:new Set(),landings:new Set()};level=i;L={...levels[i],guns:levels[i].combat?(levels[i].guns||[]):[],boss:!!levels[i].combat&&!!levels[i].boss,clear:!!levels[i].combat&&!!levels[i].clear};if(!L.lost&&!L.ops){L.brief='Fly carefully, rescue the crew and return to base.';L.objective=L.cargo?'Deliver the cargo and bring everyone home.':'Rescue everyone and return to base.';}makeWorld();
 stars=L.lost?lostShafts.map(x=>({x,y:ground(x)-60,taken:false})):[];
 heli=newHeli();time=0;score=0;zoom=1;applyView();for(const k in hudCache)delete hudCache[k];buildValleyRail();camera=0;cameraY=heli.y-vh*.5;shake=damageFlash=0;gunCd=rocketCd=flareCd=muzzle=0;unload=service=0;wind=0;missionKills=landings=crashHits=perfectPickups=0;hoverMode=false;tutorial=0;radioTimer=0;warningTimer=0;combo=0;comboTimer=0;hudTimer=0;
 people=L.people.map((x,j)=>({x,y:ground(x)-8,homeX:x,status:'waiting',phase:j*1.7}));enemies=L.guns.map((e,j)=>({...e,homeX:e.x,y:ground(e.x)-(e.type==='drone'?200:15),hp:e.type==='missile'?55:42,max:e.type==='missile'?55:42,cd:2+j*.7,aim:-Math.PI/2,flash:0,warn:0}));
 cargo=L.cargo?{x:L.cargo.x,y:ground(L.cargo.x)-14,status:'waiting',to:L.cargo.to}:null;
 boss=L.boss?{x:L.length-1100,y:210,hp:270,max:270,cd:1.8,missileCd:7,t:0,active:false,flash:0}:null;
 bullets=[];rockets=[];missiles=[];particles=[];smokes=[];bursts=[];decoys=[];texts=[];debris=[];initOperation();clearInput();mode=play?'brief':'menu';$('menu').hidden=play;$('hud').hidden=!play;$('mobile').hidden=true;$('pauseBtn').hidden=!play;AudioState.sync();updateHUD();if(play)briefing();}
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
// The narrow phase uses the actual painted polygon, including the roof's solid lip.
function obstaclePolygon(o){return o.type==='pillar'?[[o.tx,o.y],[o.tx+o.topW,o.y],[o.x+o.w,o.y+o.h],[o.x,o.y+o.h]]:[[o.x,o.y],[o.x+o.w,o.y],[o.x+o.w,o.y+o.h+(o.drip||0)],[o.x,o.y+o.h+(o.drip||0)]];}
function circleContact(x,y,r,poly){
 let inside=true,best=null;
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],ex=b[0]-a[0],ey=b[1]-a[1],len=Math.hypot(ex,ey)||1;
  if(ex*(y-a[1])-ey*(x-a[0])<0)inside=false;
  const t=clamp(((x-a[0])*ex+(y-a[1])*ey)/(len*len),0,1),qx=a[0]+ex*t,qy=a[1]+ey*t,d=Math.hypot(x-qx,y-qy);
  if(!best||d<best.d)best={d,qx,qy,nx:ey/len,ny:-ex/len};
 }
 if(!inside&&best.d>=r)return null;
 if(!inside&&best.d>1e-7){best.nx=(x-best.qx)/best.d;best.ny=(y-best.qy)/best.d;}
 return {...best,depth:inside?r+best.d:r-best.d};
}
function terrainContact(x,y,r){
 if(y+r<Math.min(ground(x-r),ground(x),ground(x+r)))return null;
 let best=null;const start=Math.floor(x/40)*40-40;
 for(let xx=start;xx<start+120;xx+=40){
  const ay=ground(xx),by=ground(xx+40),ex=40,ey=by-ay,len=Math.hypot(ex,ey);
  const t=clamp(((x-xx)*ex+(y-ay)*ey)/(len*len),0,1),qx=xx+t*ex,qy=ay+t*ey,d=Math.hypot(x-qx,y-qy);
  if(!best||d<best.d)best={d,qx,qy,nx:ey/len,ny:-ex/len};
 }
 const inside=y>=ground(x);if(!inside&&best.d>=r)return null;
 if(!inside&&best.d>1e-7){best.nx=(x-best.qx)/best.d;best.ny=(y-best.qy)/best.d;}
 return {...best,depth:inside?r+best.d:r-best.d};
}
function collisionSamples(){
 const yaw=heli.turn>0?heli.yaw:(heli.dir===1?0:Math.PI),out=[];
 for(let i=0;i<15;i++){
  let [lx,ly,r]=HULL[i];if(i===14){lx=-100;ly=-39;r=9;}
  const q=projectHeliPoint(lx,ly,0,yaw,heli.bank);
  out.push({x:q.x,y:q.y,r,lx,ly,part:i>=10?'tail':i>=4&&i<=6?'gear':'hull'});
 }
 // A rotating disc has a projected ellipse, not an instantaneous left/right line.
 if(mode!=='wreck')for(let i=0;i<32;i++){
  const ang=i*TAU/32,q=projectHeliPoint(Math.cos(ang)*90,-47,Math.sin(ang)*90,yaw,heli.bank);
  out.push({x:q.x,y:q.y,r:3,lx:Math.cos(ang)*90,ly:-47,part:'rotor'});
 }
 return out;
}
function collideObstacles(dt){
 const samples=collisionSamples(),c=Math.cos(heli.angle),sn=Math.sin(heli.angle);let strongest=null;
 // Several shallow corrections resolve corners without taking damage once per sample.
 for(let pass=0;pass<4;pass++){
  let deepest=null;
  for(const o of obstacles){
   if(o.x-145>heli.x||o.x+o.w+145<heli.x)continue;const shape=obstaclePolygon(o);
   for(const q of samples){
    const px=heli.x+q.x*c-q.y*sn,py=heli.y+q.x*sn+q.y*c,k=circleContact(px,py,q.r,shape);
    if(k&&(!deepest||k.depth>deepest.depth))deepest={...k,q,px,py};
   }
  }
  // Skid landings retain their existing suspension. Nose, tail and rotor cannot pass through slopes.
  for(const q of samples){if(q.part==='gear')continue;
   const px=heli.x+q.x*c-q.y*sn,py=heli.y+q.x*sn+q.y*c,k=terrainContact(px,py,q.r);
   if(k&&(!deepest||k.depth>deepest.depth))deepest={...k,q,px,py};
  }
  if(!deepest)break;
  const k=deepest,impact=Math.max(0,-heli.vx*k.nx-heli.vy*k.ny);
  heli.x+=k.nx*(k.depth+.02);heli.y+=k.ny*(k.depth+.02);
  if(impact>0){heli.vx+=k.nx*impact*1.15;heli.vy+=k.ny*impact*1.15;heli.av*=.6;}
  if(!strongest||impact>strongest.impact)strongest={...k,impact};
 }
 if(strongest&&strongest.impact>18&&heli.hitCd<=0&&mode==='playing'){
  const k=strongest;
  if(L.lost)lost.reason=k.q.part==='rotor'?'Rotor strike. Leave more room above and to the sides.':'Rock impact. Brake earlier before the passage.';
  // Mark first: a fatal strike should be visible during the ensuing wreck animation.
  addDent(k.q.lx,k.q.ly,clamp(k.impact/95,.2,1),k.q.part);
  hitHeli(Math.min(42,6+k.impact*.16),k.qx,k.qy);smoke(k.qx,k.qy,6,.3,'#aeae89');
 }
}
function weapon(){const yaw=heli.turn>0?heli.yaw:(heli.dir===1?0:Math.PI),p=projectHeliPoint(54,13,18,yaw,heli.bank),tip=projectHeliPoint(80,13,18,yaw,heli.bank),c=Math.cos(heli.angle),sn=Math.sin(heli.angle),dx=(tip.x-p.x)*c-(tip.y-p.y)*sn,dy=(tip.x-p.x)*sn+(tip.y-p.y)*c,n=Math.hypot(dx,dy)||1;return{x:heli.x+p.x*c-p.y*sn,y:heli.y+p.x*sn+p.y*c,dx:dx/n,dy:dy/n};}
function segmentDist(ax,ay,bx,by,x,y){let dx=bx-ax,dy=by-ay;const t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(ax+dx*t-x,ay+dy*t-y)}
// Record where the airframe was struck. Nearby hits deepen an existing dent instead of
// stacking decals, the way a panel keeps taking the same beating.
function addDent(lx,ly,severity,part=null){
 const d=heli.dents;
 if(part==='rotor'||(!part&&Math.abs(lx)>58&&ly<-38)){
  heli.rotorHurt=Math.min(1,(heli.rotorHurt||0)+severity*.8);return;
 }
 part=part||(ly>18?'gear':lx<-42?'tail':'hull');
 if(part==='tail'){if(ly<-32){lx=clamp(lx,-103,-96);ly=clamp(ly,-41,-22);}else{lx=clamp(lx,-103,-43);const mid=-13+(lx+101)*.18,half=1.5+(lx+103)*.055;ly=clamp(ly,mid-half,mid+half);}}
 else if(part==='gear'){lx=clamp(lx,-42,46);ly=28;}
 else{lx=clamp(lx,-40,50);ly=clamp(ly,-30,16);if(lx>30){const mid=lerp(-3,5,(lx-30)/20);ly=clamp(ly,mid-2,mid+3);}}
 for(const k of d)if(k.part===part&&Math.hypot(k.x-lx,k.y-ly)<13){k.s=Math.min(1,k.s+severity*.55);return;}
 if(d.length>=14)d.shift();
 d.push({x:lx,y:ly,part,s:clamp(severity,.18,1),seed:Math.abs(lx*7.3+ly*3.1)%97});
}
function repairDents(amount){
 heli.rotorHurt=Math.max(0,(heli.rotorHurt||0)-amount);
 for(const k of heli.dents)k.s-=amount;
 heli.dents=heli.dents.filter(k=>k.s>.08);
}
function hitHeli(amount,impactX=heli.x,impactY=heli.y){if(heli.hitCd>0||mode!=='playing')return;heli.hp=clamp(heli.hp-amount,0,100);heli.hitCd=.18;damageFlash=.18;shake=Math.max(shake,5);for(let i=0;i<7;i++)addParticle(impactX,impactY,rand(-100,100),rand(-90,90),'#ffd09a',3,.5);AudioState.sfx('hit');if(heli.hp<=0)failMission();}
function damageEnemy(e,dmg){if(e.hp<=0)return;e.hp-=dmg;e.flash=.12;if(e.hp<=0){e.hp=0;missionKills++;combo=comboTimer>0?combo+1:1;comboTimer=8;const gain=250+Math.min(3,combo-1)*50;score+=gain;popup(e.x,e.y-35,'+'+gain);explode(e.x,e.y,1.15);debris.push({x:e.x,y:e.y,s:1,type:'tank'});if(enemies.every(v=>v.hp<=0)&&L.clear)radio('Corridor secured. Pick up the crew and come home.');}else{for(let i=0;i<4;i++)addParticle(e.x+rand(-14,14),e.y-10,rand(-60,60),rand(-100,-20),'#efba7c',2,.4)}}
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
 if(mode!=='playing'){if(mode==='menu'){heli.rotor+=dt*35;heli.y=cameraY+vh*.31+Math.sin(visualTime*.7)*4;heli.x=camera+vw*.74;heli.landed=false;heli.spool=.62;heli.angle=Math.sin(visualTime*.5)*.025;}return;}time+=dt;radioTimer=Math.max(0,radioTimer-dt);warningTimer-=dt;comboTimer-=dt;gunCd-=dt;rocketCd-=dt;flareCd-=dt;muzzle=Math.max(0,muzzle-dt);heli.hitCd=Math.max(0,heli.hitCd-dt);heli.turn=Math.max(0,heli.turn-dt);if(heli.turn>0){const u=clamp(1-heli.turn/1.65,0,1),ease=u*u*u*(u*(u*6-15)+10);heli.yaw=lerp(heli.yawStart,heli.yawTarget,ease);}else heli.yaw=heli.yawTarget;wind=damp(wind,L.lost?lostWind().x:L.wind*(.5+Math.sin(time*.61)*.32+Math.sin(time*1.71)*.18),1.1,dt);
 const hands=touchAxes(),handsOn=coarse||touchFlight;let inputX=clamp((keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+hands.x+gyroInput(dt),-1,1),inputY=clamp((keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)+(keys.KeyW||keys.ArrowUp||keys.KeyS||keys.ArrowDown?0:handsOn?(hoverMode&&!hands.left&&!hands.right?0:hands.y):0),-1,1);
 inputX=clamp(inputX*save.sensitivity,-1,1);inputY=clamp(inputY*save.sensitivity,-1,1);
 heli.z=heli.vz=0;

 if(edges.KeyQ)requestFacing(-heli.dir);if(edges.KeyH){hoverMode=!hoverMode;heli.hoverY=heli.y;radio(hoverMode?'Stabilizer active. Countersteer to stop sideways drift.':'Manual flight.',3)}
 if(Math.abs(inputY)>.12&&!edges.KeyH)hoverMode=false;
 const mass=1+heli.carrying*.028+(heli.ropeTarget?.kind==='cargo'?.28*heli.ropeSupport:heli.ropeTarget?.kind==='person'?.028*heli.ropeSupport:heli.ropeTarget?.kind==='bucket'?(.035+(ops?.water||0)*.0022)*heli.ropeSupport:0);heli.cyclic=damp(heli.cyclic,inputX,5.4*save.sensitivity,dt);
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
 if(heli.y>=gy){const impact=Math.hypot(heli.vx*.55,heli.vy);if(!wasLanded&&heli.airborne){landings++;if(school.active&&school.stage===2){school.cleanLanding=impact<55&&Math.abs(heli.angle)<.2;if(!school.cleanLanding)radio('A little too hard. Lift again and descend more slowly onto the pad.',5);}if(impact>87||Math.abs(heli.angle)>.34){const dmg=Math.min(65,(Math.max(0,impact-62)*.42)+Math.abs(heli.angle)*28);if(L.lost)lost.reason='Too much speed or tilt at ground contact.';hitHeli(dmg);addDent(rand(-30,34),22,clamp(impact/110,.2,.9));crashHits++;radio('Hard landing. Brake early and level out before touchdown.',4);smoke(heli.x,gy,25,1,'#6b6759');}else if(impact<38&&Math.abs(heli.angle)<.13){const landingKey=Math.round(heli.x/150);if(!precision.landings.has(landingKey)){precision.landings.add(landingKey);score+=75;popup(heli.x,heli.y-58,'SOFT LANDING +75');}else popup(heli.x,heli.y-58,'SOFT LANDING');}}if(!wasLanded)heli.compression=clamp(impact*.045,0,5.5);
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
 updateWinch(dt);updateOperation(dt);updateBase(dt);if(mode!=='playing')return;
 updateWeapons(dt);updateEnemies(dt);updateProjectiles(dt);if(mode!=='playing')return;
 updateCamera(dt);
 if(heli.fuel===0&&heli.landed&&heli.x>620)failMission('Fuel exhausted. Use base or field pads to refuel during longer missions.');
 updateTraining(dt);updatePrecision(dt);updateTutorial();updateLost(dt);AudioState.update(dt);hudTimer-=dt;if(hudTimer<=0){updateHUD();hudTimer=.08;}for(const k in edges)delete edges[k];}
function winchMount(){const yaw=heli.turn>0?heli.yaw:(heli.dir===1?0:Math.PI),p=projectHeliPoint(-6,21,17,yaw,heli.bank);return rotateLocal(p.x,p.y);}
// A chain of point masses, integrated at the fixed 120 Hz game timestep.
// Unilateral distance constraints resist tension but allow slack; the hook and payload carry more mass.
function simulateRope(dt,mount){
 const h=heli,count=18,clearance=h.ropeTarget?.kind==='cargo'?48:h.ropeTarget?.kind==='person'?34:h.ropeTarget?.kind==='bucket'?30:14;
 if(!h.ropeNodes.length){for(let i=0;i<=count;i++)h.ropeNodes.push({x:mount.x,y:mount.y+i*h.rope/count,px:mount.x,py:mount.y+i*h.rope/count});}
 const nodes=h.ropeNodes;
 if(h.rope<1.5&&!h.ropeTarget){for(const n of nodes){n.x=n.px=mount.x;n.y=n.py=mount.y;}h.hookX=mount.x;h.hookY=mount.y;h.ropeMount={...mount};h.ropeAngle=0;return;}
 // Resets are only needed for a discontinuous level/debug relocation, never for ordinary flight.
 if(h.ropeMount&&Math.hypot(mount.x-h.ropeMount.x,mount.y-h.ropeMount.y)>350){const dx=mount.x-h.ropeMount.x,dy=mount.y-h.ropeMount.y;for(const n of nodes){n.x+=dx;n.px+=dx;n.y+=dy;n.py+=dy;}}
 h.ropeMount={...mount};const seg=h.rope/count,last=nodes[count],load=h.ropeTarget?.kind,tipWeight=load==='cargo'?.045:load==='person'?.10:load==='bucket'?lerp(.36,.08,(ops?.water||0)/100):.36;
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
 if(load&&h.rope>12&&Math.hypot(last.x-mount.x,last.y-mount.y)>h.rope*.94){const pull=(last.x-mount.x)/Math.max(1,h.rope);h.vx+=pull*(load==='cargo'?34:load==='bucket'?8+(ops?.water||0)*.22:9)*dt;}
}
function updateWinch(dt){if(ops?.bucket){updateBucketWinch(dt);return;}const held=!!keys.KeyE,mount=winchMount(),h=heli;const minLength=h.ropeTarget?.kind==='cargo'?49:0;
 const target=held?185:minLength,speed=held?95:h.ropeTarget?.kind==='cargo'?62:112;
 h.rope+=clamp(target-h.rope,-speed*dt,speed*dt);h.rope=clamp(h.rope,0,185);simulateRope(dt,mount);
 if(held&&Math.abs(heli.z)<14&&!heli.ropeTarget&&heli.rope>20&&Math.abs(heli.vx)<72&&Math.abs(heli.vy)<72){const p=people.find(p=>p.status==='waiting'&&Math.hypot(p.x-heli.hookX,p.y-20-heli.hookY)<25);if(p){p.status='attached';heli.ropeTarget={kind:'person',ref:p};AudioState.sfx('attach');radio('Contact! Release the winch to lift aboard.',3)}else if(cargo&&cargo.status==='waiting'&&Math.hypot(cargo.x-heli.hookX,cargo.y-34-heli.hookY)<28){cargo.status='attached';heli.ropeTarget={kind:'cargo',ref:cargo};AudioState.sfx('attach');radio('Generator secured. The load adds weight — hold extra lift.',5)}}
 if(heli.ropeTarget){const t=heli.ropeTarget.ref;t.x=heli.hookX;t.y=heli.hookY+(heli.ropeTarget.kind==='cargo'?35:24);if(heli.ropeTarget.kind==='person'&&!held&&heli.rope<14){t.status='aboard';heli.carrying++;heli.ropeTarget=null;score+=400;if(precision.hold>=1.2){perfectPickups++;score+=100;popup(heli.x,heli.y-62,'PRECISION RESCUE +500')}else popup(heli.x,heli.y-62,'PASSENGERS +400');AudioState.sfx('rescue');radio('Passenger aboard. '+(people.length-heli.carrying-heli.delivered)+' remaining to rescue.',4)}else if(heli.ropeTarget.kind==='cargo'){heli.rope=Math.max(49,heli.rope);if(held&&Math.abs(heli.z)<14&&Math.abs(t.x-t.to)<100&&Math.abs(heli.vx)<45&&Math.abs(heli.vy)<40&&t.y>=ground(t.to)-27){t.status='delivered';t.x=t.to;t.y=ground(t.to)-15;heli.ropeTarget=null;score+=1000;popup(t.x,t.y-42,'DELIVERED +1 000');radio('Outpost powered. Clean delivery!',5);AudioState.sfx('rescue');}}}
 // A slow landing also allows boarding. No instant pickup while flying through survivors.
 if(heli.landed&&Math.abs(heli.z)<14&&Math.abs(heli.vx)<15){for(const p of people){if(p.status==='waiting'&&Math.abs(p.x-heli.x)<68){p.x=damp(p.x,heli.x,1.5,dt);if(Math.abs(p.x-heli.x)<16){p.status='aboard';heli.carrying++;score+=400;AudioState.sfx('rescue');radio('Passenger aboard. Lift when ready.',3)}}}}
}
function operationTerrain(x,y){
 // Authored alpine terraces, sampled by the same terrain/collision system.
 if(L.summit){const pts=L.profile;for(let i=1;i<pts.length;i++)if(x<=pts[i][0]){const [ax,ay]=pts[i-1],[bx,by]=pts[i],t=clamp((x-ax)/(bx-ax),0,1);return lerp(ay,by,t*t*(3-2*t));}return pts[pts.length-1][1];}
 for(const lake of L.lakes||[]){const d=x<lake.x?lake.x-x:x>lake.x+lake.w?x-lake.x-lake.w:0;if(d<90)y=lerp(lake.y+44,y,clamp(d/90,0,1));}
 for(const px of L.fieldPads||[]){const d=Math.abs(x-px);if(d<160){const flat=570+Math.sin(px*.002+L.seed)*58+Math.sin(px*.0062)*25+Math.sin(px*.015)*7;y=lerp(flat,y,clamp((d-90)/70,0,1));}}
 return y;
}
function initOperation(){
 ops=L.ops?{fires:(L.fires||[]).map((f,i)=>({...f,y:ground(f.x),left:f.water,max:f.water,out:false,id:i})),lakes:(L.lakes||[]).map(l=>({...l})),water:0,bucket:!!L.fires?.length,dropping:false,dropClock:0,drops:[],used:0,hits:0,unlocked:!L.gate,fillNotice:false,fieldTime:0,heatNotice:0}:null;
 if(ops&&L.gate)people.forEach(p=>p.status='sheltered');
 if(ops?.bucket)heli.ropeTarget={kind:'bucket',ref:{x:heli.x,y:heli.y+65}};
 document.body?.classList.toggle('operationMode',!!ops);
}
function updateBucketWinch(dt){
 const h=heli,mount=winchMount();if(!h.ropeTarget)h.ropeTarget={kind:'bucket',ref:{}};
 const length=keys.KeyE?185:58;h.rope+=clamp(length-h.rope,-76*dt,90*dt);h.rope=clamp(h.rope,0,185);simulateRope(dt,mount);
 h.ropeTarget.ref.x=h.hookX;h.ropeTarget.ref.y=h.hookY+8;
 const lake=ops.lakes.find(l=>{const b=lakeBounds(l);return h.hookX>b.left+4&&h.hookX<b.right-4&&h.hookY+17>=l.y&&h.hookY<ground(h.hookX);});
 if(lake&&!ops.dropping&&Math.abs(h.vx)<65&&Math.abs(h.vy)<65){ops.water=Math.min(100,ops.water+dt*50);if(ops.water>=99&&!ops.fillNotice){ops.fillNotice=true;radio('Bucket full. Raise it and fly to the fire. Use Space or DROP WATER to release.',5);AudioState.sfx('attach');}}
 if(ops.water<70)ops.fillNotice=false;
}
function toggleWater(){if(!ops?.bucket||ops.water<=0)return;ops.dropping=!ops.dropping;ops.dropClock=0;}
function waterImpact(x,y,amount){
 for(const f of ops.fires){if(f.out||Math.abs(x-f.x)>74||Math.abs(y-f.y)>65)continue;const used=Math.min(amount,f.left);f.left=Math.max(0,f.left-used);ops.hits+=used;
  if(f.left<=.01){f.out=true;score+=600;AudioState.sfx('rescue');radio('Fire '+(f.id+1)+' extinguished. '+ops.fires.filter(k=>!k.out).length+' remaining.',3);}
 }
}
function updateOperation(dt){
 if(!ops||mode!=='playing')return;
 if(edges.Space)toggleWater();ops.heatNotice=Math.max(0,ops.heatNotice-dt);
 if(ops.bucket&&ops.dropping&&ops.water>0){
  ops.dropClock-=dt;
  while(ops.dropClock<=0&&ops.water>0){ops.dropClock+=.05;const amount=Math.min(3,ops.water),n=heli.ropeNodes.at(-1),pv=n?(n.x-n.px)/Math.max(dt,.001):heli.vx;
   ops.water-=amount;ops.used+=amount;
   if(ops.drops.length<220)ops.drops.push({x:heli.hookX,y:heli.hookY+18,px:heli.hookX,py:heli.hookY+18,vx:clamp(pv,-350,350)*.8,vy:Math.max(25,heli.vy*.5+35),amount,life:5});
  }
  if(ops.water<=0)ops.dropping=false;
 }
 for(const d of ops.drops){d.px=d.x;d.py=d.y;d.vx+=(wind*.6-d.vx*.12)*dt;d.vy+=315*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.life-=dt;
  // Swept short steps keep narrow obstacles from letting water pass through their edges.
  const steps=Math.max(1,Math.ceil(Math.hypot(d.x-d.px,d.y-d.py)/6));
  for(let i=1;i<=steps;i++){const x=lerp(d.px,d.x,i/steps),y=lerp(d.py,d.y,i/steps);if(obstacles.some(o=>circleContact(x,y,1,obstaclePolygon(o)))){d.life=0;break;}
   if(y>=ground(x)){waterImpact(x,ground(x),d.amount);d.life=0;for(let j=0;j<3;j++)addParticle(x,ground(x)-2,rand(-24,24),rand(-35,-8),'#b7f2ef',1.8,.35,'dust');break;}
  }
 }
 ops.drops=ops.drops.filter(d=>d.life>0);
 for(const f of ops.fires){if(!f.out&&Math.abs(heli.x-f.x)<75&&heli.y>f.y-65){hitHeli(1.2);if(!ops.heatNotice){radio('Heat near the ground. Drop water from higher up.',3);ops.heatNotice=4;}}}
 for(const l of ops.lakes)if(heli.x>lakeBounds(l).left&&heli.x<lakeBounds(l).right&&heli.y+15>l.y){hitHeli(2);if(!ops.heatNotice){radio('Only the bucket belongs in the lake. Keep the helicopter above the water.',4);ops.heatNotice=4;}}
 const fireDone=ops.fires.every(f=>f.out);
 if(ops.bucket&&fireDone){ops.bucket=false;ops.water=0;ops.dropping=false;heli.ropeTarget=null;keys.KeyE=false;radio(people.length?'Fires extinguished. Rescue hook ready — collect the residents.':'All fires extinguished. Return and land at base.',6);}
 if(!ops.unlocked&&((L.gate==='fire'&&fireDone)||(L.gate==='cargo'&&cargo?.status==='delivered'))){ops.unlocked=true;people.forEach(p=>{if(p.status==='sheltered')p.status='waiting';});if(L.gate==='cargo')radio('Power and heating restored. The crew is leaving shelter — collect them.',5);}
 const field=(L.fieldPads||[]).find(x=>Math.abs(heli.x-x)<65);
 if(field!==undefined&&heli.landed&&Math.abs(heli.vx)<15){ops.fieldTime+=dt;if(L.combat&&ops.fieldTime>1){heli.rockets=8;heli.flares=4;}heli.fuel=Math.min(100,heli.fuel+dt*18);heli.hp=Math.min(100,heli.hp+dt*10);repairDents(dt*.12);if(ops.fieldTime>1&&ops.fieldTime-dt<=1)radio('Field service. Refuelling and repairing. Your objective remains on the instrument rail.',4);}else ops.fieldTime=0;
}
function operationTarget(){
 const nearest=list=>list.slice().sort((a,b)=>Math.abs(a.x-heli.x)-Math.abs(b.x-heli.x))[0];
 if(ops.bucket){if(ops.water<12&&!ops.dropping){const l=nearest(ops.lakes.map(l=>({x:l.x+l.w/2})));return{x:l.x,text:'FILL BUCKET IN LAKE'};}const f=nearest(ops.fires.filter(f=>!f.out));return{x:f?.x||390,text:'EXTINGUISH FIRE · '+ops.fires.filter(f=>f.out).length+'/'+ops.fires.length};}
 if(L.summit&&cargo?.status==='attached')return{x:cargo.to,text:Math.abs(heli.x-cargo.to)<300&&heli.y<ground(cargo.to)?'LOWER GENERATOR ONTO SUMMIT PAD':'CROWN SUMMIT · '+Math.max(0,Math.round((heli.y-ground(cargo.to))*.45))+' m TO CLIMB'};
 if(cargo&&cargo.status!=='delivered')return{x:cargo.status==='attached'?cargo.to:cargo.x,text:cargo.status==='attached'?'LOWER GENERATOR ONTO PAD':'PICK UP THE GENERATOR'};
 if(heli.ropeTarget?.kind==='person')return{x:heli.x,text:'RELEASE WINCH · LIFT ABOARD'};
 if(L.combat&&enemies.some(e=>e.hp>0)){const e=nearest(enemies.filter(e=>e.hp>0));return{x:e.x,text:'DISABLE ROBOT · '+enemies.filter(e=>e.hp<=0).length+'/'+enemies.length};}if(boss?.hp>0)return{x:boss.x,text:'DISABLE WARDEN COMMAND DRONE'};
 const p=nearest(people.filter(p=>p.status==='waiting'));return p?{x:p.x,text:'RESCUE · '+(heli.carrying+heli.delivered)+'/'+people.length}:{x:390,text:'RETURN TO BASE'};
}
function operationHint(){
 if(L.summit){if(ops.fieldTime>0)return 'MOUNTAIN CAMP · REFUELLING AND REPAIRING';if(cargo?.status==='delivered')return 'DELIVERY COMPLETE · DESCEND LEFT TO THE VALLEY BASE';return cargo?.status==='attached'?'CLIMB BEFORE EACH RIDGE · CAMPS OFFER FUEL AND REPAIRS':'VALLEY DEPOT · PICK UP THE GENERATOR WITH YOUR WINCH';}
 if(ops.bucket){if(ops.dropping)return 'WATER KEEPS YOUR MOMENTUM · TAP AGAIN TO STOP';return ops.water<12?'LOWER BUCKET INTO LAKE · AUTOMATIC REFILL':'RAISE BUCKET · SPACE / DROP WATER ABOVE FIRE';}
 if(cargo?.status==='attached')return 'HEAVY LOAD · BRAKE GENTLY AND LET THE SWAY SETTLE';
 if(time<13)return L.opsIndex===0?'STEADY APPROACH · LOWER WINCH WITH E OR THE BUTTON':L.tag;
 return ops.fieldTime>0?'SERVICING · STAY LANDED':'';
}
function updateCombatHUD(){const on=!!L.combat&&mode==='playing';$('combatBar').hidden=!on;if(!on)return;put('fireControl',heli.overheated?'COOLING':keys.Space?'STOP FIRE':'FIRE',true);put('rocketControl','ROCKET '+heli.rockets,true);put('flareControl','FLARES '+heli.flares,true);$('rocketControl').disabled=heli.rockets<1;$('flareControl').disabled=heli.flares<1;}
function updateOperationHUD(){updateCombatHUD();
 const on=!!ops?.bucket&&mode==='playing';document.body?.classList.toggle('bucketMode',on);$('dropBtn').hidden=!on;$('waterStatus').hidden=!ops?.bucket;
 if(ops?.bucket){put('waterStatus','<small>WATER</small><b>'+Math.round(ops.water)+'<em>%</em></b>');put('dropBtn',ops.dropping?'STOP WATER':'DROP WATER',true);$('dropBtn').disabled=ops.water<=0;}
 put('winchBtn',ops?.bucket?'BUCKET ↓ / ↑':'WINCH',true);
}
function operationBriefing(){showModal('MISSION '+(L.opsIndex+1)+' / '+operations.length+' · '+L.tag,L.name,'<p>'+L.brief+'</p><p class="missionhint">'+L.objective+'</p><p>'+((L.fires||[]).length?'E / BUCKET: lower and raise. The bucket fills automatically in a lake. Space / DROP WATER: start or stop the release.':'E / WINCH: hold to lower, release to raise. On touch screens: tap to toggle.')+'</p><p>No hard time limit. Every mission is available to select and replay.</p>',[{text:'START MISSION',primary:true,run:begin},{text:'MISSIONS',run:selectMissions}]);}
function selectMissions(){
 mode='select';$('menu').hidden=true;showModal('NORDIC AIR RESCUE',operations.length+' calls. Your helicopter.','<div class="missionlist operations" id="missionList"></div><p>The expedition plus every call is open. Fly at your own pace; improve your precision and star rating on each return.</p>',[{text:'MAIN MENU',run:toMenu}]);
 const list=$('missionList');
 // The expedition is not one of the calls, but it is the long course the game is named
 // for; it has no other way in, so it leads the list.
 {const v=levels[LOST_LEVEL],b=document.createElement('button'),saved=readLost();b.className='operationCard expeditionCard';b.innerHTML='<small>00 · EXPEDITION</small><b>'+v.name+'</b><span>'+v.region+' · '+(v.length*.45/1000).toFixed(1)+' km across</span><em>'+(saved?.best?'BEST '+fmt(Math.round(saved.best*.45))+' m · CONTINUE →':'START →')+'</em>';b.onclick=()=>{AudioState.init();startLost(!readLost()?.snapshot)};list.append(b);}
 operations.forEach((l,i)=>{const b=document.createElement('button'),r=save.results[OP_START+i];b.className='operationCard';b.innerHTML='<small>'+String(i+1).padStart(2,'0')+' · '+l.tag+'</small><b>'+l.name+'</b><span>'+l.region+' · '+(l.length*.45/1000).toFixed(1)+' km across</span><em>'+(r?'★'.repeat(r.stars)+'☆'.repeat(3-r.stars)+' · '+fmt(r.score)+' points':'MISSIONS →')+'</em>';b.onclick=()=>loadLevel(OP_START+i);list.append(b);});
}
// Water follows the sampled terrain; shore positions are interpolated at the still-water level.
const lakeShoreCache=new WeakMap();
function lakeBounds(l){
 const cached=lakeShoreCache.get(l);if(cached?.terrain===terrain)return cached.bounds;
 const shore=(from,dir)=>{let x=from,y=ground(x);for(let i=0;i<300;i++){const nx=clamp(x+dir*4,0,L.length),ny=ground(nx);if(ny<=l.y){let wet=x,dry=nx;for(let k=0;k<16;k++){const mid=(wet+dry)/2;if(ground(mid)>l.y)wet=mid;else dry=mid;}return(wet+dry)/2;}if(nx===x)return x;x=nx;y=ny;}return x;};
 const bounds={left:shore(l.x,-1),right:shore(l.x+l.w,1)};lakeShoreCache.set(l,{terrain,bounds});return bounds;
}
function drawLake(l){
 const {left,right}=lakeBounds(l);if(right<camera-20||left>camera+vw+20)return;
 const a=Math.max(left,camera-20),b=Math.min(right,camera+vw+20),t=reduceMotion?0:visualTime;
 const wave=x=>Math.sin(x*.065-t*2)*1.1+Math.sin(x*.14+t*1.3)*.45;
 ctx.save();ctx.beginPath();ctx.moveTo(a,l.y-3);ctx.lineTo(b,l.y-3);ctx.lineTo(b,ground(b));for(let x=b-4;x>a;x-=4)ctx.lineTo(x,ground(x));ctx.lineTo(a,ground(a));ctx.closePath();ctx.clip();
 const g=ctx.createLinearGradient(0,l.y,0,l.y+55);g.addColorStop(0,'#8bc5c6');g.addColorStop(.13,'#429caa');g.addColorStop(.55,'#226f85');g.addColorStop(1,'#103e59');
 ctx.beginPath();ctx.moveTo(a,l.y+wave(a));for(let x=a+4;x<b;x+=4)ctx.lineTo(x,l.y+wave(x));ctx.lineTo(b,l.y+wave(b));ctx.lineTo(b,l.y+200);ctx.lineTo(a,l.y+200);ctx.closePath();ctx.fillStyle=g;ctx.fill();
 // Drifting reflections and submerged light bands, clipped against the actual lake bed.
 for(let row=0;row<5;row++){for(let x=Math.floor(a/54)*54;x<b;x+=54){const phase=t*(row%2?7:-5),xx=x+Math.sin(x*.02+phase*.07)*9,yy=l.y+4+row*7+Math.sin(x*.05+t)*1.5;line(xx,yy,xx+18+row*3,yy+Math.sin(t+x)*.7,row<2?'#daf0df55':'#82d4ce20',row<2?.8:1.3);}}
 ctx.beginPath();for(let x=a;x<=b;x+=3){const y=l.y+wave(x);x===a?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.strokeStyle='#d8eee5bb';ctx.lineWidth=1.2;ctx.stroke();
 const ripple=(x,amount)=>{for(let i=0;i<3;i++){const phase=(t*.7+i/3)%1;ctx.beginPath();ctx.ellipse(x,l.y+2,5+phase*amount,1+phase*2.5,0,0,TAU);ctx.strokeStyle='rgba(215,247,239,'+((1-phase)*.5)+')';ctx.lineWidth=.8;ctx.stroke();}};
 if(ops.bucket&&heli.hookX>left&&heli.hookX<right&&heli.hookY+20>l.y&&heli.hookY<l.y+50)ripple(heli.hookX,36);
 if(heli.x>left&&heli.x<right&&heli.y>l.y-170)ripple(heli.x,75*heli.spool);
 ctx.restore();
 for(const x of [left+7,right-7]){line(x,l.y+1,x+(x<l.x?12:-12),l.y+1,'#d5e4cd88',1.6);}
 for(const x of [l.x+24,l.x+l.w-24]){const bob=wave(x)*.6;line(x,l.y+bob,x,l.y-16+bob,'#c3d5cd',1.4);ellipse(x,l.y+bob,5,2.5,'#ed983e');poly([[x,l.y-16+bob],[x+10,l.y-12+bob],[x,l.y-9+bob]],'#e4e5c4');}
}
function drawFire(f){
 if(f.x<camera-210||f.x>camera+vw+210)return;
 const power=clamp(f.left/f.max,0,1),t=reduceMotion?0:visualTime,wet=1-power;
 if(L.gate==='fire')building(f.x-37,f.y,74,40,'#876f52');
 const ash=[];for(let x=f.x-75;x<=f.x+75;x+=5)ash.push([x,ground(x)-.5]);for(let x=f.x+75;x>=f.x-75;x-=5)ash.push([x,ground(x)+6]);poly(ash,'#202d2b99');
 for(let j=0;j<6;j++){const x=f.x-52+j*20,y=ground(x);line(x-7,y-1,x+10,y-9,'#302d2b',4);line(x-6,y-2,x+7,y-8,f.out?'#53696b':'#a14d26',1.4);}
 if(f.out){ellipse(f.x,f.y,60,5,'#579eab35');return;}
 // Smoke rises in separate soft puffs; the plume leans with the existing wind.
 for(let j=0;j<(coarse?7:11);j++){const phase=(t*.19+j*.117)%1,r=12+phase*35,xx=f.x+Math.sin(j*3.4)*29+wind*phase*2.5,yy=f.y-24-phase*(110+power*70);const g=ctx.createRadialGradient(xx,yy,0,xx,yy,r);g.addColorStop(0,'rgba(42,46,49,'+((1-phase)*(.18+power*.19))+')');g.addColorStop(.65,'rgba(66,67,64,'+((1-phase)*.1)+')');g.addColorStop(1,'#3b454b00');ctx.fillStyle=g;ctx.fillRect(xx-r,yy-r,r*2,r*2);}
 glow(f.x,f.y-17,65+power*45,'#ff892b25');for(let j=0;j<9;j++){const x=f.x-55+j*14;glow(x,ground(x)-9,12+power*9,'#ff8d2550');}
 // Three curved flame layers, each with its own phase and tapered tip.
 for(let j=0;j<11;j++){const seed=hash(f.x+j*19),x=f.x-61+j*12,cycle=(t*(1.3+seed*.5)+seed*8)%1,h=(20+seed*47)*Math.sqrt(power)*(.67+Math.sin(cycle*Math.PI)*.4),lean=wind*.35+Math.sin(t*5+j*2)*11,w=(6+seed*5)*(.5+power*.5);
  for(let layer=0;layer<3;layer++){const hh=h*(1-layer*.29),ww=w*(1-layer*.23),yy=ground(x)-layer*.8,twist=Math.sin(t*6+j*4+layer)*ww*.8;ctx.beginPath();ctx.moveTo(x-ww,yy);ctx.bezierCurveTo(x-ww*1.6,yy-hh*.28,x+lean-ww*.7+twist,yy-hh*.65,x+lean+twist,yy-hh);ctx.bezierCurveTo(x+lean+ww*.4-twist,yy-hh*.62,x+ww*1.4,yy-hh*.23,x+ww,yy);ctx.closePath();const g=ctx.createLinearGradient(0,yy-hh,0,yy);g.addColorStop(0,['#ee652408','#ffc35118','#fff0b640'][layer]);g.addColorStop(.3,['#ed612877','#ffad3999','#ffe69cb0'][layer]);g.addColorStop(1,['#ce54237a','#f98426b5','#fff2b8cc'][layer]);ctx.fillStyle=g;ctx.fill();}
 }
 for(let j=0;j<(coarse?7:13);j++){const phase=(t*(.5+hash(j)*.4)+j*.17)%1,x=f.x+(hash(j+f.x)-.5)*105+wind*phase,yy=f.y-12-phase*(45+power*70);line(x,yy,x+Math.sin(j+t)*2,yy+2.5,'rgba(255,190,90,'+((1-phase)*power*.7)+')',.9);}
 // Water hits already reduce power; pale steam replaces flame without changing the damage rules.
 if(wet>.05)for(let j=0;j<4;j++){const phase=(t*.4+j*.25)%1;glow(f.x+Math.sin(j*4)*40+wind*phase,f.y-12-phase*65,10+phase*19,'rgba(211,231,221,'+(wet*(1-phase)*.16)+')');}
}

function drawOperation(){
 if(L.summit){for(const x of [...L.fieldPads,L.cargo.to]){if(x<camera-180||x>camera+vw+180)continue;const y=ground(x),summit=x===L.cargo.to;label(summit?'CROWN SUMMIT · 2,165 m':'MOUNTAIN CAMP · '+Math.round((610-y)*.45)+' m',x,y-92,'#d4eceb',11);line(x-115,y,x-115,y-75,'#a7bbb8',3);const flutter=Math.sin(visualTime*3+x)*4;poly([[x-115,y-75],[x-78,y-70+flutter],[x-115,y-57]],'#f59442');}}

 if(!ops)return;
 for(const l of ops.lakes)drawLake(l);
 if(L.opsIndex===2){const x=cargo.to+185,y=ground(x);ctx.save();ctx.globalAlpha=.68;poly([[x-17,y],[x+17,y],[x+12,y-104],[x-12,y-104]],'#c9d8ce');poly([[x+5,y],[x+17,y],[x+12,y-104],[x+4,y-104]],'#576e7a');ctx.fillStyle='#516779';ctx.fillRect(x-13,y-83,26,12);ctx.fillRect(x-13,y-46,26,12);poly([[x-16,y-106],[x+16,y-106],[x+12,y-119],[x-12,y-119]],'#20394b');const lit=cargo.status==='delivered';ctx.fillStyle=lit?'#ffecab':'#374955';ctx.fillRect(x-10,y-114,20,7);if(lit){glow(x,y-111,68,'#ffe39945');poly([[x,y-111],[x+220,y-151+Math.sin(visualTime)*20],[x+220,y-81+Math.sin(visualTime)*20]],'#fff1ab10');}ctx.restore();}
 for(const x of L.fieldPads||[])if(x>camera-120&&x<camera+vw+120){landingPad(x,160);line(x-70,ground(x)-3,x-70,ground(x)-40,'#94b5ad',2);ellipse(x-70,ground(x)-42,3,3,'#a4ffe0');}
 for(const f of ops.fires)drawFire(f);
 for(const d of ops.drops){line(d.x-d.vx*.025,d.y-d.vy*.025,d.x,d.y,'#c0f4edbb',3);ellipse(d.x,d.y,2.7,4.5,'#e1fff6c9');}
}
function drawBucket(){
 if(!ops?.bucket||mode==='wreck'||mode==='failed')return;const h=heli;ctx.save();ctx.translate(h.hookX,h.hookY+8);ctx.rotate(-h.ropeAngle*.6);
 line(-11,5,0,-6,'#d1dbcd',1.5);line(11,5,0,-6,'#d1dbcd',1.5);
 const g=ctx.createLinearGradient(-14,0,14,20);g.addColorStop(0,'#ffe09a');g.addColorStop(.5,'#e38c31');g.addColorStop(1,'#914b29');poly([[-14,3],[14,3],[11,22],[-11,22]],g);ellipse(0,3,14,4,'#263f4e');
 if(ops.water>0)ellipse(0,4,12,3,'#79dcd8');for(const x of [-9,8])line(x,7,x*.8,20,'#fff0b955',1.5);line(-11,21,11,21,'#442e29',2);ctx.restore();
}

function ready(){return (!ops||ops.fires.every(f=>f.out))&&people.every(p=>p.status==='delivered')&&(!L.clear||enemies.every(e=>e.hp<=0))&&(!cargo||cargo.status==='delivered')&&(!boss||boss.hp<=0)}
function updateBase(dt){if(heli.landed&&Math.abs(heli.z)<14&&heli.x<610&&Math.abs(heli.vx)<20){service+=dt;repairDents(dt*.11);heli.hp=Math.min(100,heli.hp+dt*11);heli.fuel=Math.min(100,heli.fuel+dt*17);if(service>1){heli.rockets=8;heli.flares=4;heli.heat=Math.max(0,heli.heat-dt*2);}if(heli.carrying>0){unload+=dt;if(unload>1.2){const n=heli.carrying;heli.delivered+=n;heli.carrying=0;people.forEach(p=>{if(p.status==='aboard')p.status='delivered'});score+=n*200;popup(heli.x,heli.y-60,'HOME +'+n*200);AudioState.sfx('rescue');radio('Crew safe. Welcome home.',4)}}if(!school.active&&ready()&&service>1.5){if(L.lost)completeLost();else finishMission();};}else{service=0;unload=0;}}
function updateWeapons(dt){if(!L.combat||mode!=='playing')return;heli.heat=Math.max(0,heli.heat-dt*.19);if(heli.overheated&&heli.heat<.3)heli.overheated=false;const g=weapon();
 if(keys.Space&&gunCd<=0&&!heli.overheated&&heli.turn<.08){gunCd=.095;heli.heat=Math.min(1,heli.heat+.025);bullets.push({x:g.x,y:g.y,px:g.x,py:g.y,vx:g.dx*930,vy:g.dy*930,life:1.25,enemy:false,z:heli.z,vz:0});heli.vx-=g.dx*.43;heli.vy-=g.dy*.43;muzzle=.07;shake=Math.max(shake,.6);AudioState.sfx('gun');if(heli.heat>=1){heli.overheated=true;radio('Cannon cooling. Short bursts keep the heat down.',3)}}
 if(edges.KeyR&&rocketCd<=0&&heli.rockets>=1&&heli.turn<.08){rocketCd=.65;heli.rockets--;rockets.push({x:g.x,y:g.y+3,px:g.x,py:g.y+3,dx:g.dx,dy:g.dy,speed:260,z:heli.z,life:3.3,trail:0});heli.vx-=g.dx*6;heli.vy-=g.dy*6;heli.av-=heli.dir*.02;shake=Math.max(shake,2);AudioState.sfx('rocket');}
 if(edges.KeyF&&flareCd<=0&&heli.flares>=1){flareCd=2.7;heli.flares--;for(let i=0;i<7;i++){decoys.push({x:heli.x,y:heli.y+10,vx:heli.vx*.4+rand(-100,100),vy:rand(30,100),z:heli.z,life:3.1});}AudioState.sfx('flare');radio('Flares deployed.',2);}}
function updateEnemies(dt){for(const e of enemies){if(e.hp<=0||e.training)continue;if(e.type==='drone'){e.x=e.homeX+Math.sin(time*.5+e.homeX)*95;e.y=ground(e.x)-210+Math.sin(time*1.2)*28;}e.cd-=dt;e.flash=Math.max(0,e.flash-dt);const dx=heli.x-e.x,dy=heli.y-e.y;e.aim=Math.atan2(dy,dx);const distance=Math.hypot(dx,dy);e.warn=e.cd<.6&&distance<760?1:0;if(e.cd<=0&&distance<760&&heli.x>680&&!blocked(e.x,e.y-25,heli.x,heli.y)){if(e.type==='missile'){missiles.push({x:e.x,y:e.y-32,px:e.x,py:e.y-32,vx:0,vy:-100,life:7,trail:0,decoy:null});e.cd=5.5;radio('Missile incoming. Use flares or break away.',3);}else{const speed=235;const lead=.35;const a=Math.atan2(dy+heli.vy*lead,dx+heli.vx*lead);bullets.push({x:e.x,y:e.y-22,px:e.x,py:e.y-22,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:4,enemy:true});e.cd=1.8+Math.random()*.5;e.flash=.12;}}}
 if(boss&&boss.hp>0){const b=boss;b.active=Math.abs(heli.x-b.x)<1150;if(b.active){b.t+=dt;b.x=damp(b.x,clamp(heli.x+heli.dir*420,L.length-2300,L.length-350),.42,dt);b.y=damp(b.y,clamp(heli.y-55+Math.sin(b.t*.8)*100,130,430),.5,dt);const clearRoof=obstacles.filter(o=>b.x>o.x-100&&b.x<o.x+o.w+100).reduce((y,o)=>Math.min(y,o.y-85),ground(b.x)-110);b.y=Math.min(b.y,clearRoof);b.cd-=dt;b.missileCd-=dt;b.flash=Math.max(0,b.flash-dt);if(b.cd<=0){b.cd=b.hp<b.max*.4?1.2:1.9;let a=Math.atan2(heli.y-b.y,heli.x-b.x);for(let i=-1;i<=1;i++)bullets.push({x:b.x,y:b.y+12,px:b.x,py:b.y+12,vx:Math.cos(a+i*.13)*260,vy:Math.sin(a+i*.13)*260,life:4,enemy:true});b.flash=.14;}if(b.missileCd<=0){b.missileCd=7;missiles.push({x:b.x,y:b.y+25,px:b.x,py:b.y+25,vx:0,vy:70,life:7,trail:0,decoy:null});}}}}
function updateProjectiles(dt){for(const b of bullets){if(b.life<=0)continue;if(b.z===undefined){b.z=0;b.vz=b.enemy?(heli.z/Math.max(.1,Math.hypot(heli.x-b.x,heli.y-b.y)/Math.hypot(b.vx,b.vy))):0;}b.z+=(b.vz||0)*dt;b.px=b.x;b.py=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(blocked(b.px,b.py,b.x,b.y)){b.life=0;continue;}if(b.enemy){if(Math.abs(b.z-heli.z)<20&&segmentDist(b.px,b.py,b.x,b.y,heli.x,heli.y)<25){b.life=0;hitHeli(7)}}else{for(const e of enemies){if(e.hp>0&&Math.abs(b.z)<20&&segmentDist(b.px,b.py,b.x,b.y,e.x,e.y)<28){if(e.trainingWeapon!=='rocket')damageEnemy(e,7);else if(warningTimer<0){radio('The armoured target needs a rocket. Press R / ROCKET.',3);warningTimer=4;}b.life=0;break}}if(b.life>0&&boss&&boss.hp>0&&Math.abs(b.z)<28&&segmentDist(b.px,b.py,b.x,b.y,boss.x,boss.y)<57){boss.hp=Math.max(0,boss.hp-4);boss.flash=.07;b.life=0;if(boss.hp<=0)killBoss();}}
 if(b.life>0&&b.y>ground(b.x)){b.life=0;for(let j=0;j<2;j++)addParticle(b.x,ground(b.x)-2,rand(-25,25),rand(-45,-10),'#a59679',2,.25)} }
 for(const r of rockets){if(r.life<=0)continue;r.px=r.x;r.py=r.y;r.speed=Math.min(820,r.speed+390*dt);r.x+=r.dx*r.speed*dt;r.y+=r.dy*r.speed*dt;r.life-=dt;r.trail-=dt;if(r.trail<=0){smoke(r.x-r.dx*9,r.y-r.dy*9,3,.45,'#bec4bb',r.z||0);r.trail=.045;}let impact=blocked(r.px,r.py,r.x,r.y)||r.y>=ground(r.x)||r.x<0||r.x>L.length;for(const e of enemies){if(e.hp>0&&Math.abs(r.z||0)<25&&segmentDist(r.px,r.py,r.x,r.y,e.x,e.y)<32)impact=true}if(boss&&boss.hp>0&&Math.abs(r.z||0)<35&&segmentDist(r.px,r.py,r.x,r.y,boss.x,boss.y)<62)impact=true;if(impact){r.life=0;explode(r.x,r.y,1,r.z||0);for(const e of enemies){const d=Math.hypot(e.x-r.x,e.y-r.y,r.z||0);if(e.hp>0&&d<105&&e.trainingWeapon!=='gun')damageEnemy(e,80*(1-d/150))}if(boss&&boss.hp>0&&Math.hypot(boss.x-r.x,boss.y-r.y,r.z||0)<115){boss.hp=Math.max(0,boss.hp-48);boss.flash=.2;if(boss.hp<=0)killBoss();}}}
 for(const m of missiles){if(m.life<=0)continue;m.life-=dt;m.z=m.z||0;m.vz=m.vz||0;if(!m.decoy){const f=decoys.find(f=>f.life>0&&Math.hypot(f.x-m.x,f.y-m.y,(f.z||0)-m.z)<420);if(f)m.decoy=f}const target=m.decoy||heli;let dx=target.x-m.x,dy=target.y-m.y,dz=(target.z||0)-m.z,len=Math.hypot(dx,dy,dz)||1;m.vz=damp(m.vz,dz/len*225,1.8,dt);m.z+=m.vz*dt;m.vx=damp(m.vx,dx/len*225,1.8,dt);m.vy=damp(m.vy,dy/len*225,1.8,dt);m.px=m.x;m.py=m.y;m.x+=m.vx*dt;m.y+=m.vy*dt;m.trail-=dt;if(m.trail<0){smoke(m.x,m.y,3,.45,'#b6beb8',m.z);m.trail=.05;}if(m.decoy&&len<22){m.life=0;explode(m.x,m.y,.45,m.z);score+=40;}else if(!m.decoy&&Math.abs(m.z-heli.z)<20&&segmentDist(m.px,m.py,m.x,m.y,heli.x,heli.y)<26){m.life=0;hitHeli(22);explode(m.x,m.y,.65,m.z)}if(blocked(m.px,m.py,m.x,m.y)||m.y>ground(m.x)){m.life=0;explode(m.x,m.y,.55,m.z)}}
 bullets=bullets.filter(b=>b.life>0);rockets=rockets.filter(r=>r.life>0);missiles=missiles.filter(m=>m.life>0);}
function drawRobot(x,y,size,air,hp,max,aim=0,warning=false){ctx.save();ctx.translate(x,y);ctx.scale(size,size);
 const metal=ctx.createLinearGradient(0,-30,0,22);metal.addColorStop(0,'#a4b4b9');metal.addColorStop(.4,'#4b626e');metal.addColorStop(1,'#203440');
 if(air){for(const side of [-1,1]){line(side*15,-6,side*36,-14,'#6f858e',6);ellipse(side*36,-14,16,5,'#102a38');ellipse(side*36,-15,14,3,'#b7ced655');const r=visualTime*35;line(side*36-Math.cos(r)*14,-15-Math.sin(r)*3,side*36+Math.cos(r)*14,-15+Math.sin(r)*3,'#d7e6e8a0',1.4);}}
 else{ctx.fillStyle='#152934';ctx.fillRect(-29,3,58,16);for(let i=-22;i<=22;i+=11){ellipse(i,11,5,5,'#71848b');ellipse(i,11,2,2,'#263d48');}}
 poly([[-26,4],[-22,-14],[-8,-23],[17,-19],[27,-5],[22,9],[-17,11]],metal);line(-19,-13,15,-17,'#dae5df',1.5);for(let i=0;i<4;i++)line(-17+i*4,-4,-17+i*4,3,'#142a36',2);
 ctx.save();ctx.rotate(aim);line(4,-5,30,-5,'#253945',6);line(9,-7,28,-7,'#94a7ad',1.5);ctx.restore();ellipse(7,-13,7,4,'#122836');ellipse(7,-13,4,2,warning?'#ffe3a1':'#ef9560');if(warning)glow(7,-13,18,'#ffd49355');
 poly([[-22,-13],[-8,-23],[-7,-4],[-23,4]],'#b7c7c52b');line(-5,-18,-5,4,'#192f3a',1);line(15,-16,21,-4,'#d1ddda77',1);for(const [px,py] of [[-19,-10],[-15,7],[17,3],[11,-17]]){ellipse(px,py,1,1,'#b8cbc9');ellipse(px,py,.4,.4,'#1d3541');}line(-9,-22,-13,-34,'#617b88',1.5);ellipse(-13,-34,1.5,1.5,'#efb878');line(-9,7,15,7,'#d99b54',2);ctx.fillStyle='#122631';ctx.fillRect(-23,24,46,3);ctx.fillStyle='#e4af6e';ctx.fillRect(-23,24,46*clamp(hp/max,0,1),3);ctx.restore();}
function drawEnemy(e){if(e.hp<=0)return;drawRobot(e.x,e.y,1,e.type==='drone',e.hp,e.max,e.aim,e.warn||e.flash>0);if(e.warn)label('ROBOT LOCK',e.x,e.y-47,'#f4c98d',9);}
function drawCommandDrone(){const b=boss;drawRobot(b.x,b.y,2.05,true,b.hp,b.max,Math.atan2(heli.y-b.y,heli.x-b.x),b.cd<.6||b.flash>0);label('WARDEN · UNMANNED',b.x,b.y-65,'#e4c7a5',10);}
function killBoss(){explode(boss.x,boss.y,2.1);score+=2200;popup(boss.x,boss.y-55,'WARDEN OFFLINE +2 200');radio('Command drone offline. Bring the rescue crew home.',6);for(let i=0;i<6;i++)debris.push({x:boss.x+rand(-50,50),y:boss.y,vx:rand(-100,100),vy:rand(-80,0),s:rand(.3,.7),type:'falling'});}
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
 if(mode==='menu'||mode==='playing'&&!school.active)return;
 ctx.save();const px=size*1.92/scale;ctx.font=`${size<12?'600':'500'} ${px}px ui-monospace,monospace`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(text,x,y);ctx.restore();ctx.textAlign='left'}
function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
function palette(){const night=L.theme==='night',snow=L.theme==='snow',sun=L.theme==='sunset';return{top:snow?'#b7cace':night?'#244251':sun?'#776345':'#57726c',edge:snow?'#e4eddf':night?'#547683':sun?'#b19361':'#9ea88a',front:snow?'#506776':night?'#142b3b':sun?'#433f36':'#304955',facet:snow?'#657e87':night?'#1c3543':sun?'#585044':'#3f5961',tree:snow?'#547879':night?'#1d3f4b':'#35645e',treeLight:snow?'#acc8c5':night?'#335666':'#577e6a',night,snow};}
// Keep the original 720-unit backdrop composition while the flight camera zooms in.
function drawBackdrop(){const flightHeight=vh;ctx.save();ctx.scale(1,flightHeight/720);try{vh=720;drawSky();drawAtmosphere();}finally{vh=flightHeight;ctx.restore();}}
// Environment presets own appearance only. Mission wind, geometry and flight remain authoritative.
const ENVIRONMENTS={
 'alpine-day':{sky:['#3d779d','#a5d2db','#e2d9b6'],far:'#799baa',mid:'#486e82',lit:'#b6c9ca',snow:'#eff5ec',forest:'#28574f',weather:'clear'},
 'alpine-sunset':{sky:['#31476c','#bb817b','#ffd29b'],far:'#827e9b',mid:'#526278',lit:'#dda99a',snow:'#ffe2c1',forest:'#284e4c',weather:'clear'},
 'snow-aurora':{sky:['#071c34','#20465c','#718c99'],far:'#526e8a',mid:'#344e71',lit:'#88aac4',snow:'#ddebf5',forest:'#234351',weather:'snow',aurora:true},
 'storm-mountains':{sky:['#172c41','#516775','#91a2a4'],far:'#687c8b',mid:'#3c5367',lit:'#8a9fa7',snow:'#c2d3da',forest:'#233f48',weather:'rain'},
 'misty-valley':{sky:['#638492','#bfc6bd','#e7d0af'],far:'#9ba7b2',mid:'#65818d',lit:'#c6c8b8',snow:'#e6e4d7',forest:'#436968',weather:'mist'},
 'tropical-canyon':{sky:['#4e9cae','#a4d7d3','#e2dfb2'],far:'#779e9b',mid:'#47756e',lit:'#b8bd8a',snow:'#a5b787',forest:'#235d4c',weather:'mist'},
 'twilight-mountains':{sky:['#112b4f','#556589','#cca0a0'],far:'#778aa9',mid:'#40577b',lit:'#a0afc9',snow:'#d1dceb',forest:'#243f51',weather:'clear'},
 'alpine-lake':{sky:['#368cb6','#a2dbe4','#ddedda'],far:'#7eabb8',mid:'#477f90',lit:'#bfd7cf',snow:'#eef7eb',forest:'#285e59',weather:'clear',lake:true}
};
function environment(){const id=L.environment||({day:'alpine-day',sunset:'alpine-sunset',snow:'snow-aurora',storm:'storm-mountains',night:'twilight-mountains',jungle:'tropical-canyon'}[L.theme]);return ENVIRONMENTS[id]||ENVIRONMENTS['alpine-day'];}
const PARALLAX={sky:.02,clouds:.08,farMountains:.18,midMountains:.30,farForest:.35,mist:.50,nearForest:.75,foreground:1};
const mountainCache=new Map();
function mountainImage(){
 const source=L.theme==='jungle'?art.tropical:art.range;if(!source||!(source.naturalWidth||source.width))return null;
 const key=L.environment||L.theme;if(mountainCache.has(key))return mountainCache.get(key);
 const surface=document.createElement('canvas');surface.width=1536;surface.height=512;const c=surface.getContext?.('2d');if(!c)return source;
 c.drawImage(source,0,0,1536,512);c.globalCompositeOperation='source-atop';c.fillStyle=L.theme==='night'?'#102951a6':L.theme==='snow'?'#294e7659':L.theme==='storm'?'#20394980':L.theme==='sunset'?'#d7854c26':'#578e9710';c.fillRect(0,0,1536,512);
 if(mountainCache.size>=2)mountainCache.delete(mountainCache.keys().next().value);mountainCache.set(key,surface);const bitmap=new Image();bitmap.onload=()=>{if(mountainCache.get(key)===surface)mountainCache.set(key,bitmap);};bitmap.src=surface.toDataURL('image/png');return surface;
}
function drawMountainRange(speed,base,height,color,lit,snow){
 const img=mountainImage();
 if(img&&(img.naturalWidth||img.width)>0){
  const far=speed===PARALLAX.farMountains,w=far?1520:1820,h=w/3,offset=camera*speed,alt=clamp(-cameraY*.035,-18,60),period=w-4;
  ctx.save();ctx.globalAlpha=far?.52:.91;
  const start=-((offset%period+period)%period)-period;
  for(let x=start;x<vw;x+=period)ctx.drawImage(img,x,base-h+140+alt,w,h);
  ctx.restore();return;
 }

 const spacing=230,offset=camera*speed,first=Math.floor((offset-350)/spacing),alt=clamp(-cameraY*.035,-18,60);
 for(let i=first;i<first+Math.ceil(vw/spacing)+4;i++){
  const seed=i*71+L.seed,px=i*spacing-offset,w=230+hash(seed)*130,h=height*(.62+hash(seed+3)*.5),peak=px+w*.48,py=base-h+alt,foot=base+150+alt;
  const outline=[[px-40,foot],[px+w*.12,base-h*.34+alt],[peak-33,py+53],[peak-11,py+15],[peak,py],[peak+24,py+38],[peak+40,py+33],[px+w*.83,base-h*.27+alt],[px+w+60,foot]];
  poly(outline,color);
  poly([[peak,py],[peak+24,py+38],[peak+40,py+33],[px+w*.83,base-h*.27+alt],[px+w+60,foot],[peak+20,base+70+alt],[peak+11,py+90]],lit);
  poly([[peak,py],[peak-11,py+15],[peak-33,py+53],[peak-70,py+105],[peak-38,py+89],[peak-25,py+95],[peak-8,py+58],[peak+1,py+76],[peak+11,py+43],[peak+40,py+85],[peak+31,py+56],[peak+40,py+33],[peak+24,py+38]],snow);
  for(let j=0;j<4;j++){const x=peak-60+j*30;line(peak+(j-1)*7,py+70+j*6,x,base+60+alt,'#17395030',1.4);poly([[x,py+100+j*13],[x-25,foot-15],[x+12,foot]],'#15344613');}
 }
}
function drawSky(){
 const e=environment(),g=ctx.createLinearGradient(0,0,0,720);e.sky.forEach((c,i)=>g.addColorStop(i/2,c));ctx.fillStyle=g;ctx.fillRect(0,0,vw,720);
 const sx=vw*.72-camera*PARALLAX.sky,sy=L.theme==='sunset'?240:100;
 glow(sx,sy,145,L.theme==='night'||e.aurora?'#c6e5f016':'#ffe9b633');ellipse(sx,sy,e.aurora?10:16,e.aurora?10:16,e.aurora?'#d9ebef':'#fff0c6b0');
 if(e.aurora){for(let band=0;band<3;band++){ctx.beginPath();for(let x=-50;x<vw+50;x+=18){const y=110+band*30+Math.sin(x*.006+visualTime*.07+band)*40;x===-50?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.strokeStyle=['#66dfbf12','#78a8e714','#83dec81a'][band];ctx.lineWidth=25;ctx.stroke();}}
 drawMountainRange(PARALLAX.farMountains,480,260,e.far,e.lit,e.snow);
 const haze=ctx.createLinearGradient(0,220,0,580);haze.addColorStop(0,'#cdded900');haze.addColorStop(1,e.sky[2]+'77');ctx.fillStyle=haze;ctx.fillRect(0,220,vw,360);
 drawMountainRange(PARALLAX.midMountains,580,245,e.mid,e.far,e.snow);
 if(e.lake){const lake=ctx.createLinearGradient(0,555,0,720);lake.addColorStop(0,'#96d7d8');lake.addColorStop(1,'#377f91');ctx.fillStyle=lake;ctx.fillRect(0,555,vw,165);for(let j=0;j<18;j++){const x=((j*113-camera*.3)%(vw+100)+vw+100)%(vw+100);line(x,563+j*8,x+38,563+j*8,'#d2ece331',1);}}
}
function drawAtmosphere(){const p=palette(),sun=L.theme==='sunset',storm=L.theme==='storm';
 if(p.night){for(let i=0;i<48;i++){const x=((i*173.3-camera*.018)%vw+vw)%vw,y=30+(i*71.7)%230;ellipse(x,y,.7,.7,`rgba(205,225,235,${.15+.16*(1+Math.sin(visualTime*.5+i))})`);}}
 else if(!storm&&!p.snow){const x=vw*.76-camera*.025,y=sun?210:100;glow(x,y,180,sun?'#ffb95b26':'#fff3bc1c');ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<5;i++){const shift=Math.sin(visualTime*.13+i)*22;const g=ctx.createLinearGradient(x,y,x-220,600);g.addColorStop(0,'#fff2b60d');g.addColorStop(1,'#fff2b600');poly([[x+i*12,y],[x+i*12+14,y],[x-220+i*65+shift,610],[x-300+i*65+shift,610]],g);}ctx.restore();}
 for(let i=0;i<8;i++){const width=260+i%3*100,x=((i*487-camera*PARALLAX.clouds+visualTime*(4+i%3))%(vw+800)+vw+800)%(vw+800)-400,y=75+(i*47)%210;const g=ctx.createRadialGradient(x,y,1,x,y,width);g.addColorStop(0,p.night?'#8ab5d010':storm?'#142b425a':'#e7eff126');g.addColorStop(1,'#dae8ee00');ctx.save();ctx.translate(x,y);ctx.scale(1,.18);ctx.translate(-x,-y);ctx.fillStyle=g;ctx.fillRect(x-width,y-width,width*2,width*2);ctx.restore();}
 for(const band of [{speed:.35,base:548,scale:.72,tint:p.night?'#1f3d4766':'#3a625d5c',step:31},
                    {speed:.75,base:590,scale:1,tint:p.night?'#25495386':'#42696280',step:39}]){
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
   if(L.theme==='jungle'){ellipse(x+sway,y-h*.65,w*1.8,h*.4,band.tint);ellipse(x-w,y-h*.5,w*1.6,h*.3,band.tint);continue;}
   const crown=[[x+sway,y-h*1.18]];
   for(let j=0;j<4;j++){const yy=y-h*.87+j*h*.27,ww=w*(.35+j*.24);crown.push([x+ww,yy],[x+ww*.55,yy+2]);}
   for(let j=3;j>=0;j--){const yy=y-h*.87+j*h*.27,ww=w*(.35+j*.24);crown.push([x-ww,yy+2],[x-ww*.55,yy]);}
   poly(crown,band.tint);
  }
 }
 for(let i=0;i<4;i++){const y=440+i*24+Math.sin(visualTime*.19+i)*9,x=vw*.5+Math.sin(visualTime*.07+i-camera*.0005)*vw*.35;const g=ctx.createRadialGradient(x,y,0,x,y,vw*.6);g.addColorStop(0,p.night?'#badce90c':'#d7e5da17');g.addColorStop(1,'#cadfda00');ctx.save();ctx.translate(x,y);ctx.scale(1,.075);ctx.translate(-x,-y);ctx.fillStyle=g;ctx.fillRect(x-vw,y-vw,vw*2,vw*2);ctx.restore();}
}
function drawGroundDetail(){const p=palette();for(let x=Math.floor((camera-40)/16)*16;x<camera+vw+40;x+=16){if(x<680)continue;const y=ground(x),n=Math.sin(x*43.7),gust=Math.sin(visualTime*2+x*.03)*2+wind*.08,rotorWash=clamp(1-Math.abs(x-heli.x)/100,0,1)*clamp(1-(ground(heli.x)-heli.y)/150,0,1)*heli.spool*13*Math.sign(x-heli.x);for(let j=0;j<3;j++)line(x+j*3,y+1,x+j*3+gust+rotorWash,y-3-Math.abs(n)*7,p.snow?'#e2eddf77':'#a5b08a66',1);if(n>.5)ellipse(x+4,y+5,3,1.5,p.edge);}}
function drawTerrain(){
 const p=palette(),a=Math.max(0,Math.floor((camera-100)/40)),b=Math.min(terrain.length-1,Math.ceil((camera+vw+100)/40));
 const ceiling=Math.min(0,cameraY-100),floor=Math.max(1400,cameraY+vh+100),pts=[[a*40,floor]];for(let i=a;i<=b;i++)pts.push([i*40,terrain[i]]);pts.push([b*40,floor]);
 ctx.save();ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
 const g=ctx.createLinearGradient(0,500,0,1300);g.addColorStop(0,p.snow?'#7d9296':'#8e8066');g.addColorStop(.38,p.night?'#243543':'#4b5553');g.addColorStop(1,'#142a35');ctx.fillStyle=g;ctx.fillRect(a*40,ceiling,(b-a)*40,floor-ceiling);
 // Continuous sediment beds follow the true terrain surface, with larger fractured slabs below.
 for(let layer=0;layer<7;layer++){
  const band=[];for(let i=a;i<=b;i++)band.push([i*40,terrain[i]+24+layer*37+Math.sin(i*.62+layer)*9]);
  for(let i=b;i>=a;i--)band.push([i*40,terrain[i]+43+layer*39+Math.sin(i*.62+layer)*12]);
  poly(band,['#ccac7535','#0c23383f','#a3a18b35','#081c2b35'][layer%4]);
 }
 for(let i=a;i<b;i++){
  const x=i*40,y=terrain[i],ny=terrain[i+1],n=hash(x);
  poly([[x,y+20],[x+40,ny+23],[x+25,ny+75+n*65],[x-8,y+55]],i%2?'#d7c4a014':'#0c263327');
  line(x+19,y+38,x+13,y+73+n*72,'#0c213b4a',1.2);
  poly([[x,y],[x+40,ny],[x+40,ny+6],[x+24,ny+12],[x,y+9]],p.snow?'#e5eee5':L.theme==='jungle'?'#789846':'#a4a56b');
  line(x,y+1,x+40,ny+1,p.snow?'#fff9e8':'#d9ce936e',1.8);
  for(let j=0;j<3;j++){const xx=x+j*12+4,yy=ground(xx)+16+hash(xx)*80;ellipse(xx,yy,1.5+hash(xx+2)*2,.8,'#c6c0a22a');}
 }
 ctx.restore();
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
 shade.addColorStop(0,ceiling?'#807a69':'#b6a68a');shade.addColorStop(.34,'#6f7569');shade.addColorStop(1,'#293e48');
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
 for(let k=0;k<Math.ceil(w/21);k++){
  const px=x+k*21,drop=14+hash(px+59)*Math.min(h*.7,130);
  const stain=ctx.createLinearGradient(0,y,0,y+drop);stain.addColorStop(0,'#b5b58048');stain.addColorStop(1,'#76865a00');
  poly([[px,y],[px+8,y],[px+3,y+drop],[px-2,y+drop*.65]],stain);
 }
 // Fine strata and mineral highlights stay within the clipped collision face.
 for(let row=0;row<Math.ceil(h/18);row++){const yy=y+14+row*18;
  ctx.beginPath();for(let xx=x;xx<=x+w+16;xx+=16){const sy=yy+Math.sin(xx*.043+row*1.7)*3;xx===x?ctx.moveTo(xx,sy):ctx.lineTo(xx,sy);}ctx.strokeStyle=row%3===0?'#132d3a35':'#c2c0a11b';ctx.lineWidth=row%3===0?1.2:.7;ctx.stroke();
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
   label('CAVE PASSAGE',o.x-85,o.y+o.h+60,'#a7ead8',12);label('→',o.x-70,o.y+o.h+88,'#a7ead8',24);
  }
 }if(L.theme==='jungle'){for(let x=1650;x<3050;x+=140){glow(x,ground(x)-4,30,'#68cfa914');ellipse(x,ground(x)-3,2,2,'#9decd0');}if(heli.x>1750&&heli.x<3050&&heli.y>590){glow(heli.x,heli.y,170,'#c5e2b60c');}}}
function drawTree(t){
 if(L.theme==='jungle'){drawJungleTree(t);return;}const p=palette();ctx.save();ctx.translate(t.x,t.y+2);ctx.scale(t.s,t.s);
 ctx.transform(1,0,Math.sin(visualTime*.9+t.x*.03)*.012+wind*.0008,1,0,0);
 ellipse(7,2,30,5,'#09273335');if((art.pine?.naturalWidth||art.pine?.width)>0&&hash(t.x*1.37)>=.1){ctx.save();ctx.scale(hash(t.x*2)>.5?-1:1,1);ctx.drawImage(art.pine,-42,-124,84,126);if(p.snow){for(let k=0;k<8;k++){const y=-108+k*12,w=8+k*3;line(-w,y,w*.55,y+4,'#eaf2e278',1.8);}}ctx.restore();ctx.restore();return;}if(hash(t.x*1.37)<.1&&!p.snow){line(0,0,1,-93,'#77796a',3);for(let k=0;k<5;k++){const y=-18-k*14;line(0,y,18-k*2,y-9,'#717464',2);line(0,y-3,-15+k,y-12,'#555f58',1.7);}ctx.restore();return;}poly([[-3,0],[4,0],[2,-89],[-1,-89]],'#665543');line(1,-3,1,-72,'#c4ab7255',1.5);
 for(let j=0;j<6;j++){
  const y=-12-j*14,w=32-j*4.4;let edge=[[0,y-35]];
  for(let k=0;k<5;k++){const yy=y-24+k*7,ww=w*(.25+k*.18);edge.push([ww,yy],[ww*.68,yy+2]);}
  for(let k=4;k>=0;k--){const yy=y-24+k*7,ww=w*(.25+k*.18);edge.push([-ww,yy+3],[-ww*.64,yy]);}
  for(let n=0;n<4;n++){const xx=(hash(t.x+j*13+n)-.5)*w*1.7,yy=y-7+hash(t.x+j+n*7)*12;line(xx,yy,xx+3,yy-6,p.snow?'#d5e5df':'#3f7058',1.3);}poly(edge,p.night?'#183d43':j%2?'#214f48':'#2c6152');
  poly([[0,y-35],[w*.33,y-21],[w*.25,y-18],[w*.7,y-6],[w*.5,y-5],[w,y+7],[w*.3,y+9],[2,y-5]],p.snow?'#d4e3db':'#6b916459');
  for(let k=0;k<3;k++)line(0,y-13+k*7,w*(.3+k*.22),y-7+k*6,p.snow?'#f1f3e77a':'#afbd7840',1);
 }
 ctx.restore();
}

function drawRock(t){
 const p=palette();ctx.save();ctx.translate(t.x,t.y);ctx.scale(t.s,t.s);ellipse(3,1,26,4,'#071e274a');
 const body=[[-24,0],[-20,-13],[-10,-23],[3,-27],[18,-20],[27,-9],[29,2]];
 const g=ctx.createLinearGradient(-12,-28,16,1);g.addColorStop(0,p.snow?'#dae5dd':'#a5a28b');g.addColorStop(.5,'#677a77');g.addColorStop(1,'#354e58');poly(body,g);
 poly([[-10,-23],[3,-27],[8,-14],[-5,-7],[-20,-13]],'#d3cfac40');poly([[8,-14],[18,-20],[27,-9],[29,2],[5,-2]],'#18374655');
 line(-10,-22,-5,-7,'#374e5566',.8);line(-5,-7,5,-2,'#273f4d88',.8);line(3,-26,8,-15,'#e0dcc25c',1);
 poly([[-22,-3],[-15,-8],[-5,-6],[1,-9],[11,-3],[6,0]],p.snow?'#e3eee4':'#889b5d');
 for(let j=0;j<7;j++){const xx=-13+hash(t.x+j*7)*32,yy=-4-hash(t.x+j*19)*12;ellipse(xx,yy,1,.6,'#c4cbb43a');}ctx.restore();
}
function building(x,y,w,h,color='#425963'){
 ellipse(x+w*.55,y+3,w*.62,7,'#081c2b52');
 const wall=ctx.createLinearGradient(x,y-h,x+w,y);wall.addColorStop(0,'#e6d7b4');wall.addColorStop(.55,'#b3b59e');wall.addColorStop(1,'#7e968e');
 poly([[x,y-h],[x+w,y-h],[x+w,y],[x,y]],wall);
 poly([[x+w,y-h],[x+w+15,y-h-12],[x+w+15,y-12],[x+w,y]],'#355362');
 poly([[x-3,y-h],[x+13,y-h-14],[x+w+18,y-h-14],[x+w+3,y-h]],'#264b5b');
 line(x-3,y-h,x+w+3,y-h,'#81a1a4',2);
 ctx.fillStyle='#d96832';ctx.fillRect(x,y-h+5,w,9);ctx.fillStyle='#3c5960';ctx.fillRect(x,y-8,w,8);
 for(let xx=x+5;xx<x+w-4;xx+=11){line(xx,y-h+16,xx,y-9,'#25465526',1);ellipse(xx,y-h+19,.8,.8,'#5a7069');}
 for(let xx=x+12;xx<x+w-22;xx+=32){
  ctx.fillStyle='#35505a';ctx.fillRect(xx-2,y-h+25,26,21);
  const glass=ctx.createLinearGradient(0,y-h+26,0,y-h+44);glass.addColorStop(0,'#abcfcf');glass.addColorStop(1,'#254354');ctx.fillStyle=glass;ctx.fillRect(xx,y-h+27,22,16);
  line(xx+4,y-h+28,xx+12,y-h+41,'#edf5d755',2);line(xx+11,y-h+27,xx+11,y-h+43,'#2c4755',1.5);
 }
 // Rooftop photovoltaic panels and vented equipment preserve the original building envelope.
 for(let j=0;j<3;j++){const xx=x+w*.36+j*15;poly([[xx,y-h-3],[xx+7,y-h-10],[xx+19,y-h-10],[xx+12,y-h-3]],'#244b6c');line(xx+2,y-h-4,xx+16,y-h-9,'#87b6c0',.7);}
 ctx.fillStyle='#f8e9c9';ctx.fillRect(x+5,y-h+6,20,7);ctx.fillStyle='#b54822';ctx.fillRect(x+13,y-h+7,3,5);ctx.fillRect(x+11,y-h+9,7,1.5);
}

function landingPad(x,width=140,active=true){
 const y=ground(x),left=x-width/2;
 poly([[left-8,y+3],[left+8,y-13],[left+width+8,y-13],[left+width-8,y+3]],'#263d49');
 poly([[left-8,y+3],[left+width-8,y+3],[left+width-8,y+9],[left-8,y+9]],'#112c3b');
 line(left+8,y-12,left+width+7,y-12,'#d4b77d',2);line(left-7,y+2,left+width-8,y+2,'#f1cc87',2);
 for(let i=0;i<width/20;i++){const xx=left+i*20;line(xx,y+4,xx+8,y+4,'#e89847',3);}
 ctx.save();ctx.translate(x,y-5);ctx.scale(1,.23);ctx.beginPath();ctx.arc(0,0,29,0,TAU);ctx.strokeStyle='#f1e5bb';ctx.lineWidth=2;ctx.stroke();line(-10,-16,-10,16,'#f1e5bb',5);line(10,-16,10,16,'#f1e5bb',5);line(-10,0,10,0,'#f1e5bb',5);ctx.restore();
 for(const xx of [left+7,left+width-7]){ctx.fillStyle='#122c38';ctx.fillRect(xx-3,y-6,6,5);ellipse(xx,y-6,2,1.6,active?'#a9ffe3':'#ffd494');glow(xx,y-6,11,active?'#6df6cc25':'#ffcb6b25');}
}

function drawBase(){const y=ground(300);building(100,y,132,68,'#b4c4bf');poly([[100,y-68],[129,y-100],[228,y-100],[232,y-68]],'#36596a');poly([[232,y-68],[228,y-100],[246,y-86],[246,y-10],[232,y]],'#254654');ctx.fillStyle='#112b39';ctx.fillRect(147,y-48,70,48);line(149,y-46,215,y-46,'#ed8e4a',3);for(let x=103;x<136;x+=13){ctx.fillStyle='#a5c5c2';ctx.fillRect(x,y-45,8,15)}landingPad(390,174);landingPad(553,100);line(72,y,72,y-142,'#708c8d',3);line(72,y-142,88,y-130,'#839b91',2);const direction=wind>=0?1:-1;poly([[72,y-139],[72+direction*40,y-133+Math.sin(visualTime*3)*3],[72+direction*37,y-124+Math.sin(visualTime*3)*4],[72,y-128]],'#f17d38');line(117,y-100,117,y-150,'#90a5a1',2);line(104,y-142,129,y-142,'#90a5a1',2);ellipse(117,y-151,2,2,Math.sin(visualTime*2)>0?'#efba7c':'#6a7063');for(let yy=y-43;yy<y;yy+=7)line(149,yy,215,yy,'#78969a44',1);line(101,y-5,231,y-5,'#ed7638',5);for(let j=0;j<3;j++)line(72+direction*(7+j*11),y-138+j*2,72+direction*(7+j*11),y-128+j,'#f2e9d9',4);label(L.lost?'EAGLE BASE':'FORWARD BASE',170,y-115,'#b8d5ce',10);label('SERVICE',390,y+28,'#a2c9bd',10);label('LANDING',553,y+26,'#a2c9bd',9);
 if(heli.x<620&&heli.landed&&mode==='playing'){if(Math.abs(heli.x-400)<520)label(heli.carrying?'UNLOADING PASSENGERS':'FUEL · REPAIRS',400,y-90,'#d8e7bd',10);}}
function drawOutpost(){if(!cargo)return;const y=ground(cargo.to);building(cargo.to+140,y,100,63,'#4e636b');landingPad(cargo.to,170,cargo.status==='delivered');label(cargo.status==='delivered'?'GENERATOR DELIVERED':'LOWER THE GENERATOR',cargo.to,y-50,cargo.status==='delivered'?'#c5f0d0':'#edc888',11);if(cargo.status!=='delivered'){ctx.setLineDash([4,6]);line(cargo.to-65,y-33,cargo.to+65,y-33,'#efc8869a');ctx.setLineDash([])}}
// Reusable scene props. Origins are the ground/contact point; none alter colliders.
function drawMissionProp(kind,x,y,size=1){
 if(kind!=='generator'&&(x<camera-180||x>camera+vw+180))return;ctx.save();ctx.translate(x,y);ctx.scale(size,size);
 const box=(w,h,color)=>{const g=ctx.createLinearGradient(-w/2,-h,w/2,0);g.addColorStop(0,color);g.addColorStop(1,'#354d59');poly([[-w/2,-h],[w/2,-h],[w/2,0],[-w/2,0]],g);poly([[-w/2,-h],[-w/2+5,-h-5],[w/2+5,-h-5],[w/2,-h]],color);poly([[w/2,-h],[w/2+5,-h-5],[w/2+5,-5],[w/2,0]],'#233d4b');line(-w/2,-h,w/2,-h,'#fff3cf8a',1);};
 const cross=(x,y)=>{ctx.fillStyle='#fff6e7';ctx.fillRect(x-2,y-6,4,12);ctx.fillRect(x-6,y-2,12,4);};
 ellipse(2,1,19,3,'#0924333d');
 if(['generator','cargo_crate','medical_case','supply_case'].includes(kind)){
  const medical=kind==='medical_case',color=medical?'#e26940':kind==='supply_case'?'#839569':'#f5b44b';box(34,25,color);
  for(const x of [-13,12]){ctx.fillStyle='#233b48';ctx.fillRect(x-2,-26,4,27);for(const y of [-23,-3])ellipse(x,y,1,1,'#c1cdd0');}
  line(-7,-28,7,-28,'#173543',2.5);line(-7,-28,-7,-25,'#173543',2);line(7,-28,7,-25,'#173543',2);
  if(medical)cross(0,-13);else if(kind==='generator'){ctx.fillStyle='#192e3c';ctx.fillRect(-10,-20,13,12);for(let j=0;j<4;j++)line(-9,-18+j*2.5,2,-18+j*2.5,'#687e89',.8);ellipse(8,-15,2.2,2.2,'#132b3c');ellipse(8,-15,.8,.8,cargo?.status==='delivered'?'#a4deb7':'#f5be61');for(const x of [-12,13]){ellipse(x,0,4,4,'#182e3d');ellipse(x,0,1.8,1.8,'#a4b4b7');}}else{line(-11,-10,11,-10,'#fff4d341',1);line(0,-23,0,-2,'#4b5c5940',1);}
 }else if(kind==='barrel'){box(18,27,'#ce613a');ellipse(0,-27,9,3,'#e18b56');for(const y of [-20,-7])line(-9,y,9,y,'#f6aa7166',1.5);ellipse(4,-27,2,1,'#263e48');}
 else if(kind==='fuel_can'){box(16,22,'#cf6741');line(-4,-24,5,-24,'#dcb587',3);line(-5,-17,5,-5,'#763e2f',1.5);line(5,-17,-5,-5,'#763e2f',1.5);}
 else if(kind==='cable_spool'){for(const x of [-6,6])ellipse(x,-12,8,12,'#dfae57');ctx.fillStyle='#233746';ctx.fillRect(-6,-22,12,20);for(let y=-20;y<0;y+=3)line(-6,y,6,y,'#879694',1);ellipse(7,-12,2,2,'#273e47');}
 else if(kind==='container'){box(82,42,'#6486a0');for(let x=-37;x<39;x+=6){line(x,-39,x,-3,'#1c3d5755',2);line(x+1,-39,x+1,-3,'#aac8d154',1);}for(const x of [-40,39])line(x,-41,x,0,'#c7d4d3',2);}
 else if(kind==='stretcher'){line(-22,-8,22,-8,'#e9ae4a',4);ctx.fillStyle='#29434f';ctx.fillRect(-20,-15,40,6);for(const x of [-14,14]){line(x,-8,-x,1,'#b4c9cb',1.5);ellipse(x,1,3,3,'#1a313c');}}
 else if(kind==='antenna'){line(0,0,0,-68,'#b3c6c8',2);line(-12,0,0,-36,'#6d8994',1);line(12,0,0,-36,'#6d8994',1);ctx.save();ctx.translate(2,-45);ctx.rotate(-.4);ellipse(0,0,10,6,'#d7e3e5');ellipse(1,0,7,4,'#8babb7');ctx.restore();ellipse(0,-69,1.5,1.5,'#ee8860');}
 else if(kind==='beacon'||kind==='portable_light'){for(const x of [-12,12])line(x,0,0,-14,'#b2c6c7',1.5);line(0,0,0,-37,'#8da8ad',2);if(kind==='beacon'){ctx.fillStyle='#e38b3c';ctx.fillRect(-3,-46,6,9);glow(0,-42,13,'#ffb36d22');}else{box(12,8,'#e3af55');for(const x of [-8,8]){ctx.fillStyle='#1f3846';ctx.fillRect(x-6,-44,12,8);ctx.fillStyle='#ffebbc';ctx.fillRect(x-4,-43,8,5);glow(x,-41,17,'#ffe6aa15');}}}
 ctx.restore();
}
function drawSceneProps(){
 for(const [kind,x,scale] of [['medical_case',265,.8],['fuel_can',284,.9],['cable_spool',46,.8],['barrel',28,.7],['portable_light',305,.8],['antenna',211,.8],['supply_case',83,.7]])drawMissionProp(kind,x,ground(x),scale);
 for(const x of L.fieldPads||[]){drawMissionProp('medical_case',x-105,ground(x-105),.65);drawMissionProp('beacon',x+94,ground(x+94),.85);drawMissionProp('fuel_can',x+109,ground(x+109),.8);}
 if(cargo){drawMissionProp('container',cargo.to+186,ground(cargo.to+186),.6);drawMissionProp('portable_light',cargo.to+110,ground(cargo.to+110),.8);}
 for(const p of people){if(p.status==='delivered'||p.status==='aboard')continue;const x=p.homeX??p.x;if(x<camera-90||x>camera+vw+90)continue;drawMissionProp('beacon',x+32,ground(x+32),.55);if(p.phase>3)drawMissionProp('stretcher',x+57,ground(x+57),.7);}
}
function characterState(p){if(p.visualState)return p.visualState;if(p.status==='attached')return 'pickup';if(p.status==='aboard'||p.status==='delivered')return 'rescued';if(p.status==='sheltered')return 'waiting';return Math.abs(heli.x-p.x)<300?'signal':'idle';}
function drawPerson(p){
 const state=characterState(p);if(state==='injured'){drawMissionProp('stretcher',p.x,p.y+8);ellipse(p.x-14,p.y-1,4,4,'#d5b08e');line(p.x-9,p.y,p.x+14,p.y,'#669bb0',7);return;}if(state==='rescued'||p.x<camera-80||p.x>camera+vw+80)return;
 const type=p.character||['hiker','rescue_worker','civilian','child'][Math.round(p.phase/1.7)%4],child=type==='child',crew=type==='rescue_worker'||type==='medic';
 const jacket=crew?'#ef762d':child?'#e8b74b':type==='hiker'?'#7c9e5b':'#568faf',shade=crew?'#a84325':child?'#c48128':type==='hiker'?'#3b6550':'#295777';
 ctx.save();ctx.translate(p.x,p.y);if(child)ctx.scale(.82,.82);const sway=state==='pickup'?Math.sin(heli.ropeAngle)*.08:Math.sin(visualTime*1.8+p.phase)*.018;ctx.rotate(sway);const wave=(state==='signal'||state==='wave')?Math.sin(visualTime*5+p.phase)*4:0;
 ellipse(1,9,9,2.7,'#08243942');poly([[-8,-17],[-4,-20],[-3,1],[-9,-1]],crew?'#b6482d':'#586751');line(-7,-16,-7,-3,'#aab78c',.8);
 for(const x of [-3,3]){line(x,1,x+(x<0?-1:2),8,'#283d4c',4);line(x-2,9,x+3,9,'#1b2c37',2.8);}
 const cloth=ctx.createLinearGradient(-6,-16,7,3);cloth.addColorStop(0,jacket);cloth.addColorStop(1,shade);poly([[-5,-17],[4,-17],[7,-3],[5,3],[-5,3],[-7,-4]],cloth);
 line(0,-16,0,2,'#c8dbd48a',.6);line(-4,-4,-1,-4,'#172f3d77',.8);line(2,-4,5,-4,'#172f3d77',.8);
 const lifted=state==='signal'||state==='wave'||state==='pickup';line(-5,-13,-10,lifted?-20+wave:-3,jacket,3.8);line(5,-13,10,lifted?-20-wave:-3,jacket,3.8);ellipse(-10,lifted?-20+wave:-3,2,2,'#263746');ellipse(10,lifted?-20-wave:-3,2,2,'#263746');
 ellipse(0,-21,4.3,5,'#d5b08e');poly([[-5,-23],[-3,-27],[2,-28],[5,-24],[5,-22],[-5,-22]],crew?'#e5ecee':child?'#c7822e':'#d9793a');
 if(crew){poly([[-4,-22],[4,-22],[3,-19],[-3,-19]],'#17384e');line(-4,-8,5,-8,'#f2e9ce',1.8);line(-3,-17,-3,1,'#223845',1.5);line(3,-17,3,1,'#223845',1.5);}else{ellipse(2,-21,.7,.7,'#183340');line(-2,-16,2,-16,'#d2c098',1);}
 ctx.restore();if(p.status==='waiting'){const pulse=.5+Math.sin(visualTime*2.5+p.phase)*.5;ctx.strokeStyle='#c9efd47a';ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(p.x,ground(p.x)+2,23+pulse*5,5,0,0,TAU);ctx.stroke();poly([[p.x-4,p.y-45],[p.x,p.y-40],[p.x+4,p.y-45]],'#ebbf78');if(Math.abs(heli.x-p.x)<250)label('SOS',p.x,p.y-52,'#f1dfb7',9);}
}
function drawCargo(){if(!cargo)return;const c=cargo;ctx.save();ctx.translate(c.x,c.y+12);if(c.status==='attached')ctx.rotate(heli.ropeAngle*.4);drawMissionProp('generator',0,0,1);ctx.restore();if(c.status==='waiting')label('GENERATOR',c.x,c.y-48,'#edcc8d',10);}
function drawDents(dir){
 if(!heli.dents||!heli.dents.length)return;
 ctx.save();
 for(const k of heli.dents){
  const yaw=heli.turn>0?heli.yaw:(dir===1?0:Math.PI),pos=(k.part==='gear'?gearPoint:projectHeliPoint)(k.x,k.y-(k.part==='gear'?heli.compression:0),0,yaw,heli.bank);
  const x=pos.x,y=pos.y,r=(k.part==='tail'?1.4:2.4)+k.s*(k.part==='gear'?2:4.4),shade=hash(k.seed);
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
   line(-r*.5,r*.15,r*.35,-r*.22,'#d6dad078',.9);line(-r*.45,r*.28,r*.5,-r*.12,'#132b3cb0',1.1);
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
   const kp=(k.part==='gear'?gearPoint:projectHeliPoint)(k.x,k.y-(k.part==='gear'?heli.compression:0),0,yaw,heli.bank),kx=kp.x,ky=kp.y,d=Math.hypot(p.x-kx,p.y-ky),R=11+k.s*16;
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
 const hit=isBoss?boss?.flash>0:heli.hitCd>0,cream=hit?'#efe2bd':isBoss?'#637780':'#edf3f6',dark=isBoss?'#3c515d':'#b14b24',top=isBoss?'#87989d':'#ffffff',stripe=isBoss?'#8d795f':'#ee6429';
 // Faceted cross-sections form a true volume, with cabin, rounded nose and a tapered tail.
 const rings=[[-42,-12,9,9],[-36,-18,15,15],[-29,-22,18,19],[-14,-24,19,21],[10,-24,19,21],[23,-20,19,20],[31,-15,17,18],[40,-8,15,15],[48,-2,11,11],[54,6,9,5]];
 function ring(r){const [xx,yt,yb,w]=r;return[[xx,yt,-w*.55],[xx,yt,w*.55],[xx,yt+6,w],[xx,yb-5,w],[xx,yb,w*.6],[xx,yb,-w*.6],[xx,yb-5,-w],[xx,yt+6,-w]];}
 for(let i=0;i<rings.length-1;i++){const r=ring(rings[i]),n=ring(rings[i+1]);for(let j=0;j<8;j++){const k=(j+1)%8;face([r[j],n[j],n[k],r[k]],[top,cream,cream,stripe,'#653b30',dark,cream,top][j]);}}
 face(ring(rings[0]),dark);face(ring(rings[rings.length-1]),cream);
 // Both side doors and glass exist in the model, so a turn reveals the far side naturally.
 for(const sign of [-1,1]){
  const z=20*sign;
  face([[-27,-16,z],[-2,-19,z+sign],[0,-2,z+sign],[-27,-1,z]],'#102e43');
  face([[-26,-15,z+.1*sign],[-3,-18,z+1.1*sign],[-2,-12,z+1.1*sign],[-26,-8,z+.1*sign]],'#58a5bd');
  face([[3,-19,21*sign],[20,-17,20*sign],[27,-4,19*sign],[4,-3,21*sign]],'#102e43');
  face([[5,-18,21.1*sign],[19,-16,20.1*sign],[23,-9,19.8*sign],[5,-11,21.1*sign]],'#8ecbd3');
  face([[24,-15,18.2*sign],[38,-8,16*sign],[47,0,11.5*sign],[29,-2,18.7*sign]],'#102c40');
  face([[25,-14,18.3*sign],[36,-8,16.2*sign],[40,-4,15*sign],[29,-7,18.5*sign]],'#d9f3e7');
  face([[-32,2,18.1*sign],[11,1,21.2*sign],[31,3,17.8*sign],[44,7,12*sign],[36,13,16*sign],[-30,11,18*sign]],stripe);
  box(-30,-18,z,-28,14,z+sign*.8,dark,top,dark);box(-1,-21,z,1,15,z+sign*.8,dark,top,dark);
  box(-9,1,21*sign,-3,2.5,22*sign,'#edf0d0');
  // Recessed cabin door, reflective rescue sash and white cross, on both sides.
  face([[-26,3,21.4*sign],[-13,3,21.4*sign],[-13,12,21.4*sign],[-26,12,21.4*sign]],'#c64920');
  face([[-21,4,21.6*sign],[-18,4,21.6*sign],[-18,11,21.6*sign],[-21,11,21.6*sign]],'#fff6dc');
  face([[-24,6,21.6*sign],[-15,6,21.6*sign],[-15,9,21.6*sign],[-24,9,21.6*sign]],'#fff6dc');
  // Pilot and seat seen through the windshield; narrow specular streaks sit over the glass.
  face([[12,-13,21.35*sign],[17,-14,21.35*sign],[19,-9,21.35*sign],[12,-8,21.35*sign]],'#ead7b0');
  face([[11,-9,21.4*sign],[17,-9,21.4*sign],[23,-4,20*sign],[10,-4,21.4*sign]],'#243846');
  face([[10,-16,21.45*sign],[16,-17,21.45*sign],[18,-13,21.45*sign],[11,-12,21.45*sign]],'#ecebd5');
  face([[7,-18,21.6*sign],[9,-18,21.6*sign],[15,-4,21.6*sign],[13,-4,21.6*sign]],'#d4f4ef60');
  face([[-22,-14,21.5*sign],[-18,-15,21.5*sign],[-9,-4,21.5*sign],[-12,-3,21.5*sign]],'#d3f2e94d');
  for(let q=0;q<5;q++)box(-22+q*5,-31,9*sign,-20+q*5,-27,9.5*sign,'#1b3440','#83969a');
  drawingGear=true;const compression=isBoss?0:heli.compression;
  const gearTube=(a,b,r)=>tube([a[0],a[1]-(a[1]>20?compression:0),a[2]],[b[0],b[1]-(b[1]>20?compression:0),b[2]],r);
  const gearBox=(x1,y1,z1,x2,y2,z2,...colors)=>box(x1,y1-compression,z1,x2,y2-compression,z2,...colors);
  // Landing gear has real separation across depth, rather than coincident screen lines.
  gearTube([-22,14,sign*13],[-26,28.7,sign*25],1.9);
  gearTube([22,14,sign*13],[28,28.7,sign*25],1.9);
  const rail=[[-43,25,sign*25],[-37,29,sign*25],[38,29,sign*25],[47,25,sign*25],[51,20,sign*25]];
  for(let k=0;k<rail.length-1;k++)gearTube(rail[k],rail[k+1],1.8);
  gearBox(-27,26.3,sign*23.5,-24,29.4,sign*26.5,'#476977','#aabeb7');
  gearBox(26,26.3,sign*23.5,29,29.4,sign*26.5,'#476977','#aabeb7');for(const xx of [-24,25]){gearBox(xx-1.8,20,sign*19,xx+1.8,23,sign*22,'#eef4f7','#ffffff','#68808d');}drawingGear=false;

 }
 for(const sign of [-1,1]){for(const xx of [-24,-16,-8,6,14]){const yy=8,zz=21.3*sign;face([[xx,yy,zz],[xx+1,yy,zz],[xx+1,yy+1,zz],[xx,yy+1,zz]],'#e6e4be');}box(-34,-10,18*sign,-32,6,18.5*sign,'#476772','#75998f');}
 // Tapered tail boom, stabilizers, engine housing and exhaust.
 face([[-39,-11,-7],[-101,-17,-3],[-101,-10,3],[-39,7,8]],dark);
 face([[-39,-11,7],[-101,-17,3],[-101,-10,3],[-39,7,8]],'#f06a28');
 face([[-39,-11,-7],[-101,-17,-3],[-101,-17,3],[-39,-11,7]],top);
 box(-101,-18,-22,-86,-15,22,dark,top);box(-103,-44,-2,-96,-10,2,'#ed763d',top,dark);
 box(-22,-29,-12,12,-23,12,'#c3d3da',top);box(-19,-35,-8,5,-29,8,'#a5bbc5','#eff4f5');
 box(-26,-30,-6,-18,-25,6,'#263f4b','#596f70');box(-3,-47,-2,1,-34,2,'#6d8586','#d0d5b5');
 // Barrel shares its exact origin with weapon().
 
 const rotor=isBoss?visualTime*55:heli.rotor,rotorBlur=isBoss?.8:clamp((heli.spool-.32)/.48,0,1);
 // Visible blade opacity fades as RPM increases; the collision disc remains unchanged.
 if(isBoss||mode!=='wreck')for(let blade=0;blade<4;blade++){const ang=rotor+blade*Math.PI/2,c=Math.cos(ang),sn=Math.sin(ang),r1=5,r2=91,w=2.4;face([[c*r1-sn*w,-47,sn*r1+c*w],[c*r2-sn*w,-47,sn*r2+c*w],[c*r2+sn*w,-47,sn*r2-c*w],[c*r1+sn*w,-47,sn*r1-c*w]],'rgba(219,231,237,'+(1-rotorBlur*.83)+')');face([[c*79-sn*w,-47,sn*79+c*w],[c*r2-sn*w,-47,sn*r2+c*w],[c*r2+sn*w,-47,sn*r2-c*w],[c*79+sn*w,-47,sn*79-c*w]],'rgba(255,107,36,'+(1-rotorBlur*.7)+')');}
 // Painter sorting keeps roof, skids, windows and blades in the correct depth order.
 faces.sort((a,b)=>a.z-b.z);for(const f of faces){const pts=f.pp.map(p=>[p.x,p.y]);poly(pts,f.color);if(f.color.length===7){const ys=f.pp.map(p=>p.y),topY=Math.min(...ys),bottomY=Math.max(...ys);if(bottomY-topY>4){const light=ctx.createLinearGradient(-30,topY,45,bottomY);light.addColorStop(0,'#fff7df40');light.addColorStop(.5,'#fff2c500');light.addColorStop(1,'#071b3a50');poly(pts,light);}}}
 // Surface decals are projected onto the visible cabin after the volume pass.
 // This avoids painter-depth averaging burying small markings inside a large hull face.
 if(!isBoss&&Math.abs(Math.cos(yaw))>.35){
  const z=(Math.cos(yaw)>0?1:-1)*21.7;
  const decal=(v,c)=>poly(v.map(([px,py])=>{const q=point([px,py,z]);return[q.x,q.y]}),c);
  // Reference-led SAR cabin: broad glazing, orange rescue door and enamel panels.
  const panel=(v,fill,edge='#425e6e',width=.55)=>{const pts=v.map(([px,py])=>{const q=point([px,py,z]);return[q.x,q.y]});poly(pts,fill);ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.strokeStyle=edge;ctx.lineWidth=width;ctx.stroke();};
  const glass=ctx.createLinearGradient(0,-22,15,2);glass.addColorStop(0,'#9dd9ef');glass.addColorStop(.22,'#2878a3');glass.addColorStop(.52,'#153952');glass.addColorStop(1,'#081b2e');
  panel([[-30,-20],[-1,-22],[1,15],[-30,14]],'#f16a2e','#8f391f',.8);
  panel([[-27,-17],[-4,-19],[-3,-4],[-27,-3]],glass,'#e5eef1',1);
  panel([[4,-20],[20,-17],[27,-4],[5,-3]],glass,'#ecf4f5',1.2);
  // Fine mullions and bright diagonal reflections emphasize curved blue glass.
  decal([[-17,-18],[-16,-18],[-16,-3],[-17,-3]],'#173146');
  decal([[-26,-16],[-22,-16],[-11,-4],[-14,-4]],'#b7eaff47');
  decal([[6,-18],[9,-18],[20,-5],[17,-5]],'#dbf7ff66');
  panel([[-27,0],[-4,0],[-4,13],[-27,13]],'#ce391d','#fff3e5',.7);
  decal([[-19,2],[-15,2],[-15,11],[-19,11]],'#ffffff');
  decal([[-23,5],[-11,5],[-11,8],[-23,8]],'#ffffff');
  const q=point([-8,-1,z]),r=point([-3,-1,z]);line(q.x,q.y,r.x,r.y,'#dcebf1',1.1);
  for(const [xx,yy] of [[-29,-18],[-29,11],[-2,-20],[-2,12],[7,12],[26,8]]){const p=point([xx,yy,z]);ellipse(p.x,p.y,.6,.6,'#526b7a');ellipse(p.x-.15,p.y-.2,.22,.22,'#ffffff');}
  panel([[-39,-10],[-34,-12],[-33,2],[-38,3]],'#10344e','#cad8de',.7);
  // Raised door hinges and a recessed step retain legibility at game scale.
  for(const yy of [-11,8])panel([[-31,yy],[-28,yy],[-28,yy+3],[-31,yy+3]],'#dce5e9');

 }
 if(!isBoss)drawDents(dir);
 const bent=isBoss?0:(heli.rotorHurt||0);
 const disk=[];for(let j=0;j<=40;j++){const ang=j/40*TAU,wob=1-bent*.09*Math.abs(Math.sin(ang*2+rotor*.3));
  const p=point([Math.cos(ang)*92*wob,-47+bent*Math.sin(ang*2+rotor*.3)*3.5,Math.sin(ang)*92*wob]);disk.push([p.x,p.y]);}
 if(isBoss||mode!=='wreck'){
  poly(disk,'rgba(218,231,234,'+(.012+rotorBlur*.065)+')');
  for(let ring=0;ring<3;ring++)for(let j=0;j<4;j++){
   ctx.beginPath();for(let k=0;k<=18;k++){const ang=rotor*.3+j*TAU/4+k*.075,p=point([Math.cos(ang)*(87-ring*5),-47,Math.sin(ang)*(87-ring*5)]);k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}
   ctx.strokeStyle='rgba(233,243,245,'+(rotorBlur*(.08-ring*.018))+')';ctx.lineWidth=2.3;ctx.stroke();
  }
 }
 const hub=point([-1,-48,0]);ellipse(hub.x,hub.y+1,6,2.7,'#142b39');ellipse(hub.x,hub.y-1,5,2.8,'#f57626');ellipse(hub.x-1,hub.y-2,2.5,.7,'#ffd29c');for(const sign of [-1,1]){const p=point([sign*5,-44,0]),q=point([sign*8,-47,0]);line(p.x,p.y,q.x,q.y,'#b5c8d3',.8);}
 const tail=point([-100,-22,4]);ctx.save();ctx.translate(tail.x,tail.y);ctx.rotate(rotor*1.9);ctx.globalAlpha=1-rotorBlur*.8;line(-12,0,12,0,'#e4eef3',2.4);line(0,-12,0,12,'#e4eef3',2.4);for(const sign of [-1,1]){line(sign*8,0,sign*12,0,'#ff641f',2.6);line(0,sign*8,0,sign*12,'#ff641f',2.6);}ellipse(0,0,2.4,2.4,'#183347');ctx.restore();ellipse(tail.x,tail.y,13,13,'rgba(221,236,241,'+(.02+rotorBlur*.11)+')');ctx.save();ctx.strokeStyle='rgba(244,131,56,'+(rotorBlur*.27)+')';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(tail.x,tail.y,11,rotor*.2,rotor*.2+4.6);ctx.stroke();ctx.restore();
 const lamp=point([-26,-24,16]);ellipse(lamp.x,lamp.y,2.2,2.2,Math.sin(visualTime*4)>0?'#ed9b79':'#815e53');
 // Tail lettering follows the boom plane, rather than a screen-space label.
 if(Math.abs(Math.cos(yaw))>.45){
  const sign=Math.cos(yaw)>0?1:-1,tailPoint=(xx,yy)=>point([xx,yy,sign*(3+(xx+101)/62*5)]);
  const origin=tailPoint(sign>0?-86:-48,-11),along=tailPoint(sign>0?-85:-49,-11),down=tailPoint(sign>0?-86:-48,-10);
  ctx.save();ctx.transform(along.x-origin.x,along.y-origin.y,down.x-origin.x,down.y-origin.y,origin.x,origin.y);
  ctx.font='700 5px sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle='#fff7ec';ctx.fillText(isBoss?'MK IV':'RESCUE 07',0,0,34);ctx.restore();
 }
 // Searchlight and winch housings are attached to the same projected aircraft geometry.
 const light=point([26,13,9]);ellipse(light.x,light.y,4.7,3.4,'#173341');ellipse(light.x+.5,light.y,2.7,2,'#adc4cd');ellipse(light.x+.8,light.y+.3,1.8,1.4,'#fff2bc');
 const mount=point([-6,21,17]);ctx.save();ctx.translate(mount.x,mount.y);ctx.fillStyle='#17313f';ctx.fillRect(-7,-5,14,5);line(-6,-5,6,-5,'#abc0c7',1);ellipse(3,-2,3,3,'#e66b2a');ellipse(3,-2,1.5,1.5,'#213b48');ctx.restore();
 ctx.restore();
}
function drawRotorWash(){
 if(reduceMotion||heli.spool<.4||mode!=='playing')return;
 const lake=(L.lakes||[]).find(l=>heli.x>l.x&&heli.x<l.x+l.w),surface=lake?lake.y:ground(heli.x),strength=clamp(1-(surface-heli.y)/170,0,1)*heli.spool;
 if(strength<=0)return;
 ctx.save();ctx.globalAlpha=strength;
 if(lake){for(let i=0;i<4;i++){const phase=(visualTime*.7+i*.25)%1;ctx.beginPath();ctx.ellipse(heli.x,surface+2,15+phase*85,2+phase*5,0,0,TAU);ctx.strokeStyle='rgba(210,237,234,'+((1-phase)*.28)+')';ctx.lineWidth=.7;ctx.stroke();}}
 else for(let i=0;i<(coarse?12:20);i++){const phase=(visualTime*.8+i*.137)%1,side=i%2?1:-1,x=heli.x+side*(17+phase*95),y=ground(x)-3-Math.sin(phase*Math.PI)*(6+hash(i)*12);ellipse(x,y,2+phase*4,.7+phase,palette().snow?'#e4eee554':'#d9bc8138');}
 ctx.restore();
}
function drawHeli(){if(mode==='failed')return;drawRotorWash();const h=heli,alt=ground(h.x)-h.y;ellipse(h.x,ground(h.x)+5,clamp(72-alt*.08,24,72),clamp(10-alt*.01,4,10),'#061b2550');
 if(h.rope>1.5&&h.ropeNodes.length){
  const nodes=h.ropeNodes;ctx.lineCap='round';ctx.lineJoin='round';
  for(const [color,width] of [['#071b28b0',3.7],['#b5c5ba',1.8],['#ecedcf88',.65]]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(nodes[0].x,nodes[0].y);for(let i=1;i<nodes.length;i++)ctx.lineTo(nodes[i].x,nodes[i].y);ctx.stroke();}
  ctx.save();ctx.translate(h.hookX,h.hookY);ctx.rotate(-h.ropeAngle);
  const hookPath=()=>{ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(0,7);ctx.bezierCurveTo(0,16,13,15,10,7);ctx.lineTo(8,9);};
  ctx.strokeStyle='#071b26';ctx.lineWidth=4.5;hookPath();ctx.stroke();ctx.strokeStyle='#ed672c';ctx.lineWidth=2.8;hookPath();ctx.stroke();
  ellipse(0,0,3.4,3.4,'#8ba19a');ellipse(0,0,1.5,1.5,'#173340');line(-2,3,2,3,'#e4bf73',2.5);
  if(h.ropeTarget)line(1,3,10,7,'#c4d4c4',1.2);ctx.restore();ctx.lineCap='butt';ctx.lineJoin='miter';
 }

 if((palette().night||hoverMode||keys.KeyE)&&alt>50){
  const yaw=h.turn>0?h.yaw:(h.dir===1?0:Math.PI),lp=projectHeliPoint(26,13,9,yaw,h.bank),mount=rotateLocal(lp.x,lp.y),endY=Math.min(ground(h.x),mount.y+400);
  // Nested low-alpha cones feather both the edge and the far end without screen blur.
  for(let layer=0;layer<5;layer++){const w=80-layer*12,g=ctx.createLinearGradient(0,mount.y,0,endY);g.addColorStop(0,'#fff4cf05');g.addColorStop(.45,'#fff4cf08');g.addColorStop(.85,'#fff4cf06');g.addColorStop(1,'#fff4cf00');poly([[mount.x-2,mount.y],[h.x+10+w,endY],[h.x+10-w,endY],[mount.x+2,mount.y]],g);}
  ellipse(h.x+10,ground(h.x)+2,65,6,'#efdb991a');
 }

 if(h.landed){const yaw=h.turn>0?h.yaw:(h.dir===1?0:Math.PI);for(const z of [-25,25]){const a=gearPoint(-37,30.8-h.compression,z,yaw,h.bank),b=gearPoint(38,30.8-h.compression,z,yaw,h.bank),aa=rotateLocal(a.x,a.y),bb=rotateLocal(b.x,b.y);line(aa.x,aa.y+1,bb.x,bb.y+1,'#061b28b0',3);}}heliBody(h.x,h.y,h.angle,h.dir);if(mode==='playing'){const g=weapon();if(L.combat){line(g.x-g.dx*17,g.y-g.dy*17,g.x,g.y,'#253c48',5);line(g.x-g.dx*14,g.y-g.dy*14-1,g.x,g.y-1,'#a1b4ba',1);const tx=g.x+g.dx*150,ty=g.y+g.dy*150;line(tx-5,ty,tx+5,ty,'#e9d7a080',1);line(tx,ty-5,tx,ty+5,'#e9d7a080',1);}if(muzzle>0){ctx.save();ctx.translate(g.x,g.y);ctx.rotate(Math.atan2(g.dy,g.dx));poly([[0,-3],[17,-8],[10,-1],[31,0],[10,3],[18,8],[0,4]],'#ffe3a0');ctx.restore();glow(g.x,g.y,27,'#ffe2ac55');}
 // Manual reticle follows exactly the same transformed vector as bullets and rockets.
 if(hoverMode)label('STAB',h.x,h.y-65,'#c3e9d2',9);}}
// Working guide for the winch, drawn at the hook where the pilot is already looking:
// how much rope is out, whether a survivor is inside the pickup ring, and whether the
// craft is steady enough for the hook to take.
function drawWinchGuides(){
 if(ops?.bucket)return;
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
   if(!steady)hookNote('HOLD STEADY',reach.x,reach.y-reach.r-11,'#f6cd93','center');}
  else hookNote(Math.round(reach.d*.45)+' m',reach.x,reach.y-reach.r-11,'#c8dfd9aa','center');
 }
 const held=heli.ropeTarget?.kind;
 hookNote(held==='cargo'?'CARGO · LOWER AT TARGET':held?'RELEASE WINCH · RAISE':Math.round(heli.rope*.45)+' m',
  hx+15,hy+4,held?'#bfe6cf':'#cfe2ddcc','left');
}
function hookNote(text,x,y,color,align){ctx.save();ctx.font='600 11px ui-monospace,monospace';ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();ctx.textAlign='center';}

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
function drawWeather(){const weather=environment().weather;if(weather!=='rain'&&weather!=='snow')return;const snowing=weather==='snow';for(let layer=0;layer<2;layer++){const count=coarse?26:45,speed=layer?.74:.25;for(let i=0;i<count;i++){const seed=i*93.71+layer*37,x=((seed*13-visualTime*(snowing?26:95)-camera*speed)%(vw+100)+vw+100)%(vw+100)-50,y=(seed*7+visualTime*(snowing?32+layer*20:340+layer*180))%(vh+80)-40;if(snowing)ellipse(x,y,(i%3*.4+.6)*(layer?1.1:.6),(i%3*.4+.6)*(layer?1.1:.6),layer?'#dce7e179':'#dce7e140');else line(x,y,x-4-layer*3,y+12+layer*10,layer?'#b7d3e150':'#b7d3e12a',layer?1:.6);}}if(weather==='rain'&&Math.sin(visualTime*.18)>.9997&&!reduceMotion){ctx.fillStyle='#cbdde521';ctx.fillRect(0,0,vw,vh)}}
function atDepth(z,draw){if(!z){draw();return;}const k=1-z*.0017,c=camera+vw*.5;ctx.save();ctx.translate(c,230-z*.28);ctx.scale(k,k);ctx.translate(-c,-230);draw();ctx.restore();}
function drawDepthFloor(){if(!save.depthMode)return;for(const z of [100,0,-100])atDepth(z,()=>{ctx.setLineDash([9,15]);ctx.strokeStyle=z===0?'#d9d9a947':'#b4d3d323';ctx.lineWidth=1;ctx.beginPath();for(let x=camera-100;x<camera+vw+200;x+=20){const y=ground(x);x===camera-100?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke();ctx.setLineDash([])});}
function drawPlayer(){atDepth(heli.z,()=>{for(const p of people)if(p.status==='attached')drawPerson(p);if(cargo?.status==='attached')drawCargo();drawHeli();drawBucket();});}
function render(){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#06151f';ctx.fillRect(0,0,innerWidth,innerHeight);ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.save();ctx.beginPath();ctx.rect(0,0,vw,vh);ctx.clip();if(!reduceMotion){ctx.translate(Math.sin(visualTime*53)*shake*.25,Math.cos(visualTime*47)*shake*.20)}drawBackdrop();ctx.save();ctx.translate(-camera,-cameraY);drawTerrain();drawGroundDetail();if(heli.z>14)drawPlayer();for(const s of scenery){if(s.x<camera-100||s.x>camera+vw+100)continue;s.type==='tree'?drawTree(s):drawRock(s)}drawBase();drawOutpost();drawSceneProps();drawObstacles();drawOperation();drawLost();drawHazardGuides();drawFlightGuides();for(const e of enemies)if(e.x>camera-100&&e.x<camera+vw+100)drawEnemy(e);for(const d of debris){
   if(d.type==='falling'||d.type==='wreck'){poly([[d.x-13*d.s,d.y],[d.x-20*d.s,d.y-15*d.s],[d.x+16*d.s,d.y-20*d.s],[d.x+23*d.s,d.y]],'#3b4c55')}
   else if(d.type==='rotor'){
    ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.rot);
    for(let b=0;b<3;b++){ctx.save();ctx.rotate(b*TAU/3);
     poly([[0,-2.5],[86,-1.6],[86,1.6],[0,2.5]],'#5d6b6d');ctx.restore();}
    ellipse(0,0,6,4,'#c9d4b8');ctx.restore();
   }
   else if(d.type==='panel'){
    ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.rot);const w=13*d.s,h=8*d.s;
    poly([[-w,-h],[w,-h*.7],[w*.8,h],[-w*.9,h*.8]],'#e77c42');
    line(-w,-h,w,-h*.7,'#c3ccc6',1);ctx.restore();
   }
  }for(const p of people)if(p.status!=='attached')drawPerson(p);if(cargo?.status!=='attached')drawCargo();if(boss&&boss.hp>0&&boss.x>camera-170&&boss.x<camera+vw+170){ellipse(boss.x,ground(boss.x),70,11,'#071b284d');drawCommandDrone();}if(heli.z<=14)drawPlayer();drawWinchGuides();drawEffects();ctx.restore();drawWeather();ctx.fillStyle=screenGrad('vignette',()=>{const g=ctx.createRadialGradient(vw*.5,vh*.45,Math.min(vw,vh)*.3,vw*.5,vh*.5,Math.max(vw,vh)*.7);g.addColorStop(0,'#00000000');g.addColorStop(1,'#05152066');return g});ctx.fillRect(0,0,vw,vh);if(damageFlash>0&&!reduceMotion){ctx.fillStyle=`rgba(206,91,57,${damageFlash})`;ctx.fillRect(0,0,vw,vh)}drawFlightInstruments();ctx.restore();}
// --- Music ---------------------------------------------------------------------------------
// Tracks are streamed from dist/music/<name>.mp3 with plain audio elements rather than decoded
// into Web Audio buffers: a three-minute track decodes to tens of megabytes, and a phone should
// not be asked to hold six of those in memory at once.
//
// A missing file is not an error. Until the mp3s are added the game simply runs silent, and any
// track that fails to load falls back down MUSIC_FALLBACK to one that exists.
const MUSIC_DIR='music/';
const MUSIC_FALLBACK={title:null,valley:null,beacon:'valley',shaft:'valley',school:'title',
 jungle:'valley',debrief:'title'};
const Music={
 tracks:{},failed:{},cur:null,prev:null,gain:0,prevGain:0,unlocked:false,
 // Resolve a name to something that actually loaded, walking the fallback chain.
 resolve(name){
  let hops=0;
  while(name&&this.failed[name]&&hops++<4)name=MUSIC_FALLBACK[name]||null;
  return name;
 },
 el(name){
  if(this.tracks[name])return this.tracks[name];
  if(this.failed[name]||typeof Audio!=='function')return null;
  const a=new Audio(MUSIC_DIR+name+'.mp3');
  a.preload='auto';a.loop=true;a.volume=0;
  a.addEventListener('error',()=>{this.failed[name]=true;delete this.tracks[name];
   if(this.cur===name){this.cur=null;this.gain=0;}});
  this.tracks[name]=a;
  return a;
 },
 // Browsers will not start audio without a gesture, so this is called from the same taps that
 // start the sound engine.
 unlock(){
  this.unlocked=true;
  const c=this.cur&&this.tracks[this.cur];
  if(c&&c.paused)c.play().catch(()=>{});
 },
 want(name){
  name=this.resolve(name);
  if(name===this.cur)return;
  // Whatever was already fading out loses its slot; two crossfades at once is mud.
  if(this.prev&&this.tracks[this.prev])this.tracks[this.prev].pause();
  this.prev=this.cur;this.prevGain=this.gain;
  this.cur=name;this.gain=0;
  const el=name?this.el(name):null;
  if(el&&this.unlocked){try{el.currentTime=0}catch{}el.volume=0;el.play().catch(()=>{});}
 },
 update(dt){
  const ceiling=save.muted?0:clamp(save.musicVolume??.55,0,1);
  if(this.prev){
   this.prevGain=Math.max(0,this.prevGain-dt*.9);
   const p=this.tracks[this.prev];
   if(p)p.volume=clamp(this.prevGain*ceiling,0,1);
   if(this.prevGain<=0){if(p)p.pause();this.prev=null;}
  }
  const c=this.cur?this.tracks[this.cur]:null;
  if(!c)return;
  if(ceiling<=0){if(!c.paused)c.pause();c.volume=0;return;}
  if(this.unlocked&&c.paused)c.play().catch(()=>{});
  this.gain=Math.min(1,this.gain+dt*.7);
  // An mp3 loop leaves a small gap at the seam. Dipping through it reads as a breath rather
  // than a cut, which is the best that can be done without decoding the whole file.
  let seam=1;
  const d=c.duration;
  if(d&&isFinite(d)){
   if(d-c.currentTime<1.2)seam=Math.min(seam,.4+(d-c.currentTime)/1.2*.6);
   if(c.currentTime<1.2)seam=Math.min(seam,.4+c.currentTime/1.2*.6);
  }
  c.volume=clamp(this.gain*ceiling*seam,0,1);
 },
 // Called when the mute button or the volume slider moves.
 sync(){this.update(0);}
};
// Which track the game wants right now. Keep this the only place that decides.
function musicForState(){
 if(mode==='menu'||mode==='settings')return 'title';
 if(mode==='lostDone'||mode==='debrief')return 'debrief';
 if(school.active)return 'school';
 if(!L)return 'title';
 if(L.theme==='jungle')return 'jungle';
 if(L.lost){
  // Down between the walls of a shaft, where the sky is a long way up.
  const rim=ground(heli.x-400);
  if(ground(heli.x)-rim>120&&heli.y>rim+40)return 'shaft';
  if(heli.x>20000)return 'beacon';
 }
 return 'valley';
}

const AudioState={ac:null,master:null,rotor:null,rotorGain:null,music:null,nextNote:0,note:0,noise:null,
 init(){Music.unlock();if(this.ac){this.ac.resume().catch(()=>{});return;}const Constructor=window.AudioContext||window.webkitAudioContext;if(!Constructor)return;try{this.ac=new Constructor();const a=this.ac;this.master=a.createGain();this.master.gain.value=0;this.master.connect(a.destination);this.music=a.createGain();this.music.gain.value=.65;this.music.connect(this.master);this.rotorGain=a.createGain();this.rotorGain.gain.value=.045;this.rotor=a.createOscillator();this.rotor.type='sawtooth';this.rotor.frequency.value=44;const low=a.createBiquadFilter();low.type='lowpass';low.frequency.value=175;this.rotor.connect(low);low.connect(this.rotorGain);this.rotorGain.connect(this.master);this.rotor.start();const lfo=a.createOscillator(),depth=a.createGain();lfo.frequency.value=17;depth.gain.value=.02;lfo.connect(depth);depth.connect(this.rotorGain.gain);lfo.start();this.noise=a.createBuffer(1,a.sampleRate*.7,a.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;this.nextNote=a.currentTime+.25;a.resume().catch(()=>{});this.sync();}catch{this.ac=null;}}
 ,sync(){Music.sync();if(!this.ac)return;const running=mode==='playing';this.master.gain.setTargetAtTime(save.muted||!running?0:.42,this.ac.currentTime,.16);if(running)this.nextNote=Math.max(this.ac.currentTime+.08,this.nextNote);}
 ,tone(freq,duration,volume,type='sine',endFreq=0,delay=0,output=null){if(!this.ac)return;const a=this.ac,t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(12,endFreq),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(output||this.master);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect()};}
 ,noiseHit(duration,volume,cutoff){if(!this.ac||!this.noise)return;const a=this.ac,t=a.currentTime,b=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();b.buffer=this.noise;f.type='lowpass';f.frequency.value=cutoff;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);b.connect(f);f.connect(g);g.connect(this.master);b.start();b.stop(t+duration+.01);b.onended=()=>{b.disconnect();f.disconnect();g.disconnect()};}
 ,sfx(type){if(!this.ac||save.muted)return;if(type==='gun'){this.noiseHit(.065,.10,1450);this.tone(130,.07,.07,'triangle',48)}if(type==='rocket'){this.noiseHit(.35,.22,780);this.tone(170,.32,.12,'sawtooth',36)}if(type==='boom'){this.noiseHit(.65,.46,700);this.tone(82,.58,.24,'sine',22)}if(type==='hit'){this.noiseHit(.12,.11,2100)}if(type==='attach'){this.tone(560,.12,.08,'sine');this.tone(750,.16,.06,'sine',0,.1)}if(type==='rescue'){[440,554.37,659.25].forEach((f,i)=>this.tone(f,.34,.09,'sine',0,i*.09))}if(type==='flare')this.noiseHit(.25,.16,1900);if(type==='switch')this.tone(310,.09,.04,'triangle',240);}
 ,update(dt){if(!this.ac)return;this.rotor.frequency.setTargetAtTime(34+heli.spool*28,this.ac.currentTime,.1);this.rotorGain.gain.setTargetAtTime(.025+heli.spool*.055,this.ac.currentTime,.1);if(save.muted)return;const now=this.ac.currentTime;if(now>this.nextNote){const notes=[220,0,261.63,329.63,293.66,0,196,261.63,174.61,220,261.63,0,196,246.94,293.66,0];const n=this.note++%notes.length;this.nextNote=now+.65;if(notes[n])this.tone(notes[n],1.35,.023,'triangle',0,0,this.music);if(n%4===0){const bass=[55,65.41,43.65,49][Math.floor(n/4)];this.tone(bass,2.5,.05,'sine',0,0,this.music);this.tone(bass*3,2.1,.013,'sine',0,.02,this.music)}if(n%2===0)this.tone(75,.2,.032,'sine',32,0,this.music);}}
};
function showModal(tag,title,body,actions){clearInput();$('combatBar').hidden=true;$('dropBtn').hidden=true;$('settingsBtn').disabled=!['menu','playing','paused'].includes(mode);$('modalTag').textContent=tag;$('modalTitle').textContent=title;$('modalBody').innerHTML=body;const wrap=$('modalActions');wrap.replaceChildren();for(const action of actions){const b=document.createElement('button');b.textContent=action.text;b.className=action.primary?'primary':'quiet';b.onclick=action.run;wrap.append(b);}$('modal').hidden=false;$('mobile').hidden=true;AudioState.sync();wrap.querySelector('button')?.focus({preventScroll:true});}
function dismiss(){clearInput();$('settingsBtn').disabled=false;$('modal').hidden=true;}
function begin(){dismiss();mode='playing';$('hud').hidden=false;$('mobile').hidden=!coarse;$('pauseBtn').hidden=false;radio(level===0?'SAR–07, cleared for takeoff. Increase lift gently.':L.region+'. Fly safely. Your mission is ready.',5);AudioState.init();AudioState.sync();updateHUD();}
function briefing(){if(ops){operationBriefing();return;}const extra=level===0?'<p><b>A / D:</b> tilt to fly. Countersteer to brake.<br><b>W / S:</b> increase or decrease lift.<br><b>Countersteer early.</b> The helicopter retains momentum.</p>':cargo?'<p>Tap WINCH to lower the hook, tap again to reel in. On keyboard: hold and release E. Lower the generator onto the outpost delivery pad.</p>':'<p>Stabilize with H before winching. Return to base for fuel, repairs or rockets.</p>';showModal(`${String(level+1).padStart(2,'0')} / ${L.region.toUpperCase()}`,L.name,`<p>${L.brief}</p>${extra}<p class="missionhint">${coarse?'Hold either screen half to tilt; both to climb. Release to descend. Swipe to turn. WINCH toggles lowering and raising.':'Hold E to lower the winch. Release E to reel in. Q turns the nose.'}</p>`,[{text:'START FLIGHT',primary:true,run:begin},{text:'MISSION',run:selectMissions}]);}
function toMenu(){if(L.lost)saveLost();document.body?.classList.remove('lostMode');$('lostStatus').hidden=true;dismiss();loadLevel(OP_START,false);$('menu').hidden=false;$('hud').hidden=true;$('pauseBtn').hidden=true;$('mobile').hidden=true;AudioState.sync();}
function pause(){if(mode==='paused'){dismiss();mode='playing';$('mobile').hidden=!coarse;AudioState.sync();return;}if(mode!=='playing')return;mode='paused';showModal('FLIGHT PAUSED','Take a breath.',`<p>Hull: ${Math.ceil(heli.hp)} % · Fuel: ${Math.ceil(heli.fuel)} % · Passengers: ${heli.carrying}/${people.length}</p><p>${L.lost?'Checkpoint: '+lostPads[lost.cp].name+' · Best: '+Math.round(lost.best/L.beacon*100)+' % · Crashes: '+lost.crashes:L.objective}</p><p><b>Countersteer to brake.</b> The helicopter retains momentum when you release the controls. Add lift in steep banks.</p><p>${coarse?'Hold left/right to tilt. Hold both to climb; release to descend. Swipe to turn. Tap WINCH to lower or raise.':'WASD / arrows: fly · Q: turn<br>E: winch · H: stabilize'}</p><p>Land at base for fuel and repairs.</p>`,[{text:'RESUME FLIGHT',primary:true,run:pause},{text:'SETTINGS',run:settings},{text:save.muted?'SOUND ON':'SOUND OFF',run:()=>{save.muted=!save.muted;persist();AudioState.sync();mode='playing';pause();}},{text:school.active?'CHOOSE EXERCISE':'STABILIZER '+(hoverMode?'OFF':'ON'),run:()=>{if(school.active)selectTraining();else{hoverMode=!hoverMode;heli.hoverY=heli.y;pause();}}},{text:'RESTART MISSION',run:()=>L.lost?retryLost():school.active?startDrill(school.kind):loadLevel(level)},{text:'MAIN MENU',run:toMenu}]);}
function finishMission(){if(mode!=='playing')return;mode='debrief';const timeBonus=Math.max(0,Math.round((L.par-time)*7)),conditionBonus=Math.round(heli.hp*6),total=score+timeBonus+conditionBonus;score=total;const stars=1+(time<=L.par?1:0)+(crashHits===0&&heli.hp>=65?1:0);const previous=save.results[level]||{};save.results[level]={score:Math.max(total,previous.score||0),stars:Math.max(stars,previous.stars||0),time:Math.min(time,previous.time||Infinity)};save.unlocked=Math.max(save.unlocked,Math.min(level+1,levels.length-1));save.best=Math.max(save.best,total);persist();updateHUD();const final=L.ops?L.opsIndex===operations.length-1:level===7;const starline='★'.repeat(stars)+'☆'.repeat(3-stars);showModal(final?'CAMPAIGN COMPLETE':'CREW SAFE AT HOME',final?'Nobody left behind.':'Well flown.',`<div class="medals">${starline}</div><div class="results"><div><b>${fmt(total)}</b><span>SCORE</span></div><div><b>${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')}</b><span>FLIGHT TIME</span></div><div><b>${heli.delivered}</b><span>RESCUED</span></div></div><p>Time bonus +${fmt(timeBonus)} · Hull bonus +${fmt(conditionBonus)}<br>${perfectPickups} precision rescues · ${crashHits} hard landings</p>${ops?.fires.length?'<p>'+ops.fires.filter(f=>f.out).length+' fires extinguished · '+Math.round(ops.hits/Math.max(1,ops.used)*100)+' % water accuracy</p>':''}<p>★ Mission complete · ★ Under ${Math.round(L.par/60*10)/10} min<br>★ No hard landings and at least 65% hull</p>`,[{text:final?'MISSIONS':'NEXT MISSION',primary:true,run:final?selectMissions:()=>levels[level+1]?.lost?startLost():loadLevel(level+1)},{text:'FLY AGAIN',run:()=>loadLevel(level)},{text:'MAIN MENU',run:toMenu}]);}
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
function failNow(reason){mode='failed';explode(heli.x,heli.y,1.2);for(let i=0;i<5;i++)debris.push({x:heli.x+rand(-20,20),y:heli.y,vx:rand(-80,80),vy:rand(-80,-20),s:rand(.5,1),type:'falling'});showModal('SAR–07 / DISTRESS SIGNAL','Back in the air.',`<p>${reason||'The helicopter could not survive the damage. You can restart your latest mission immediately.'}</p><p>Tip: brake before reaching the target. Countersteer, level out and descend slowly. H holds altitude for rescue.</p>`,[{text:'TRY AGAIN',primary:true,run:()=>school.active?startDrill(school.kind||'basic'):loadLevel(level)},{text:'MISSIONS',run:selectMissions}]);}
function settings(){if(!['menu','playing','paused'].includes(mode))return;const previous=mode;clearInput();mode='settings';showModal('FLIGHT CONTROLS','Tune your flight.',`<label class="settingLabel" for="sensitivity">Control sensitivity <b id="sensitivityValue">${Math.round(save.sensitivity*100)} %</b></label><input id="sensitivity" type="range" min="50" max="160" step="5" value="${Math.round(save.sensitivity*100)}"><label class="settingLabel" for="musicVol">Music <b id="musicVolValue">${Math.round((save.musicVolume??.55)*100)} %</b></label><input id="musicVol" type="range" min="0" max="100" step="5" value="${Math.round((save.musicVolume??.55)*100)}"><p>Small inputs give precision; larger inputs allow up to 70° of tilt. Countersteer to brake and increase lift in steep turns.</p><button id="gyroEnable">${gyro.enabled?'DISABLE GYRO':'ENABLE GYRO'}</button> <button id="gyroCalibrate">CALIBRATE CENTRE</button><p id="gyroStatus" role="status">${gyro.status}</p><label><input id="gyroInvert" type="checkbox" ${gyro.invert?'checked':''}> Invert gyro</label><p>Hold your iPhone or iPad comfortably in landscape and calibrate. Tilt left and right. Touch and gyro work together. H / STABILIZE helps with winching.</p>`,[{text:'CONTINUE',primary:true,run:()=>{save.sensitivity=clamp(Number($('sensitivity').value)/100,.5,1.6);save.musicVolume=clamp(Number($('musicVol').value)/100,0,1);persist();dismiss();mode=previous;$('mobile').hidden=mode!=='playing'||!coarse;updateHUD();AudioState.sync();if(previous==='paused'){mode='playing';pause()}}}]);$('sensitivity').oninput=()=>{$('sensitivityValue').textContent=$('sensitivity').value+' %';};
 // Heard while you drag it, which is the only way to set a music level.
 $('musicVol').oninput=()=>{save.musicVolume=clamp(Number($('musicVol').value)/100,0,1);
  $('musicVolValue').textContent=$('musicVol').value+' %';Music.sync();};$('gyroEnable').onclick=enableGyro;$('gyroCalibrate').onclick=calibrateGyro;$('gyroInvert').onchange=e=>{gyro.invert=e.target.checked;gyro.filtered=0;};}

function selectArchivedMissions(){mode='select';$('menu').hidden=true;showModal('FLIGHT OPERATIONS','Choose a mission.','<div class="missionlist" id="missionList"></div><p>TEST FLIGHT: all missions are unlocked. Stars and scores are saved on this device.</p>',[{text:'BACK',run:toMenu}]);const list=$('missionList');levels.forEach((l,i)=>{const b=document.createElement('button'),r=save.results[i],locked=!TEST_FLIGHT&&i>save.unlocked;b.disabled=locked;b.innerHTML=`<b>${String(i+1).padStart(2,'0')} / ${l.region.toUpperCase()}</b>${l.name}<span>${locked?'LOCKED — COMPLETE THE PREVIOUS MISSION':r?'★'.repeat(r.stars)+'☆'.repeat(3-r.stars)+' · '+fmt(r.score)+' points':'READY FOR TAKEOFF'}</span>`;b.onclick=()=>l.lost?startLost():loadLevel(i);list.append(b);});}
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
const lostPads=[{x:390,name:'Eagle Base',w:174},{x:1480,name:'Old Ranger Platform',w:132},{x:3160,name:'Mine Relay',w:124},{x:4880,name:'Storm Shelter',w:160},{x:6900,name:'Tallskogen',w:180},{x:9100,name:'Kopparryggen',w:180},{x:11300,name:'Floddalen',w:180},{x:13600,name:'Mountain Station',w:180},{x:15800,name:'Long Pass',w:180},{x:18100,name:'North valley',w:180},{x:20400,name:'Last outpost',w:180},{x:22800,name:'Fyrleden',w:180}];
let lost={active:false,cp:0,hold:0,best:0,crashes:0,total:0,secret:false,returning:false,returnService:new Set(),snapshot:null,lastSave:0,reason:'',recordShown:0};
function lostTerrain(x,y){if(x<680)return 610;let out=610+Math.sin(x*.002)*65+Math.sin(x*.006)*30;if(x>3300&&x<4450)out=790;for(const p of lostPads){const d=Math.abs(x-p.x);if(d<140)out=610;else if(d<260)out=lerp(610,out,(d-140)/120);}if(x>5700&&x<6100)out=lerp(out,640,(x-5700)/400);if(x>=6100){out=620+Math.sin((x-6100)*.0008)*95+Math.sin((x-6100)*.0024)*35;for(const p of lostPads){const d=Math.abs(x-p.x);if(d<150)out=610;else if(d<300)out=lerp(610,out,(d-150)/150);}}if(x>L.beacon-400)out=640;return out+shaftDepth(x);}
function lostWind(){const u=time%14;let x=0,y=0,label='CALM';if(u>=3&&u<6){x=Math.sin((u-3)/3*Math.PI)*31;label='WIND →';}else if(u>=7&&u<10){x=-Math.sin((u-7)/3*Math.PI)*35;label='← WIND';}else if(u>=10&&u<12){y=-Math.sin((u-10)/2*Math.PI)*24;label='UPDRAFT ↑';}let strength=.10;
 for(const [from,to,power] of windZones)if(heli.x>from&&heli.x<to){strength=power;break}
 return{x:x*strength,y:y*strength,label:strength>.5?label:'LIGHT WIND',strength,phase:u/14};}
function readLost(){try{const data=JSON.parse(localStorage.getItem('flyinLongValleyV1')||'null');return data&&data.version===1?data:null;}catch{return null;}}
function saveLost(){if(!lost.active)return;try{localStorage.setItem('flyinLongValleyV1',JSON.stringify({version:1,snapshot:lost.snapshot,best:lost.best,crashes:lost.crashes,total:lost.total,completed:lost.completed||false}));}catch{}}
function lostSnapshot(){return{cp:lost.cp,secret:lost.secret,hp:heli.hp,fuel:heli.fuel};}
function startLost(fresh=false){const previous=readLost(),saved=fresh?null:previous;loadLevel(LOST_LEVEL);lost={active:true,cp:clamp(saved?.snapshot?.cp||0,0,lostPads.length-1),hold:0,best:previous?.best||0,crashes:saved?.crashes||0,total:saved?.total||0,secret:!!saved?.snapshot?.secret,returning:false,returnService:new Set(),snapshot:saved?.snapshot||null,lastSave:0,reason:'',recordShown:saved?.best||0};restoreLostPosition();if(!lost.snapshot)lost.snapshot=lostSnapshot();saveLost();$('modalTag').textContent='THE LOST VALLEY · EXPEDITION';$('modalTitle').textContent=saved?.snapshot?'One more try.':'Every metre matters.';$('modalBody').innerHTML='<p>Fly to Rescue Beacon, winch up two people and return all the way to Eagle Base.</p><p>Land gently on marked relay pads to save a checkpoint. Rock edges are solid. Trees and mist are scenery. The mine is a shorter, tighter route; fly over the mountain for more space.</p><p>Wind follows the same 14-second pattern on every attempt. A crash returns you to the latest checkpoint. After the rescue, you still need to fly home.</p><p>A valley four times longer, with eleven landing stations. Take breaks, refuel and resume from your latest checkpoint.</p>';document.body?.classList.add('lostMode');updateHUD();}
function restoreLostPosition(){const p=lostPads[lost.cp];heli.x=p.x;heli.y=ground(p.x)-30.8;heli.vx=heli.vy=heli.angle=heli.av=heli.bank=0;heli.hp=clamp(lost.snapshot?.hp||100,45,100);heli.fuel=clamp(lost.snapshot?.fuel||100,55,100);heli.rockets=8;heli.flares=4;heli.landed=true;heli.airborne=false;zoom=1;applyView();camera=clamp(heli.x-vw*.43,0,L.length-vw);cameraY=heli.y-vh*.5;}
function retryLost(){const old={...lost};loadLevel(7,false);lost={...old,active:true,hold:0,returning:false,returnService:new Set(),secret:!!old.snapshot?.secret,lastSave:0};time=0;restoreLostPosition();document.body?.classList.add('lostMode');$('menu').hidden=true;begin();radio('Gravity won this round. Try again.',4);}
function crashLost(reason){lost.crashes++;lost.reason=reason||lost.reason||'Hard terrain impact.';saveLost();mode='failed';clearInput();$('mobile').hidden=true;const jokes=['The helicopter discovered gravity.','That was almost a landing. Emotionally.',
  'Very close. The mountain disagreed.','You unlocked: another try.',
  'Excellent flying. Terrible destination.','The trees remain undefeated.',
  'New record: fastest route back to the checkpoint.','At least nobody saw that.',
  'The rescue mission is briefly rescuing itself.','That landing was more of a suggestion.',
  'The ground was there all along. It just kept quiet.','The rotor had an idea. The mountain had another.',
  'Technically, you flew. Briefly.','Physics noticed that.',
  'You are officially too far in to quit now.'];showModal('CRASH · '+lostPads[lost.cp].name,jokes[(lost.crashes-1)%jokes.length],'<p>'+lost.reason+'</p><p>Best progress: '+Math.round(lost.best/L.beacon*100)+' % to the beacon · '+lost.crashes+' krascher.</p>',[{text:'TRY AGAIN',primary:true,run:retryLost},{text:'MAIN MENU',run:toMenu}]);}
function completeLost(){
 lost.completed=true;saveLost();mode='lostDone';clearInput();$('mobile').hidden=true;AudioState.sfx('rescue');
 const mins=Math.floor(lost.total/60),secs=String(Math.floor(lost.total%60)).padStart(2,'0');
 const stats='<div class="results"><div><b>'+mins+':'+secs+'</b><span>TOTAL TID</span></div>'+
  '<div><b>'+lost.crashes+'</b><span>CRASHES</span></div>'+
  '<div><b>'+heli.delivered+'</b><span>RESCUED</span></div></div>';
 showModal('THE LOST VALLEY · HOME','You made it.',
  '<p>The skids meet concrete. The rotor winds down. Eleven rest stops, '+lost.crashes+
  ' crashes and all the way back.</p>'+stats+
  '<p>Crates from the shafts: '+stars.filter(s=>s.taken).length+' / '+stars.length+
  ' · Hemligheter: '+(lost.secret?'1 / 1':'0 / 1')+'</p>'+
  '<p>Ops has one thing to say before you get out.</p>',
  [{text:'LISTEN',primary:true,run:lostEpilogue}]);
}
// The turn: everything you just did was real, and none of it was necessary.
function lostEpilogue(){
 const mins=Math.floor(lost.total/60),secs=String(Math.floor(lost.total%60)).padStart(2,'0');
 showModal('OPS / DEBRIEF','About the beacon.',
  '<p>The distress signal you flew eleven kilometres for was a scheduled test transmission. The weather station '+
  'sends one every other Tuesday. We forgot to mention that.</p>'+
  '<p>The two people you winched up are Ann-Sofie and Pelle. They are technicians. They were there to '+
  'service the station.</p><p>They had a car.</p>'+
  '<p>They came along because you looked like you had made an effort.</p>'+
  '<p><b>'+mins+':'+secs+'</b> in the air. <b>'+lost.crashes+'</b> crashes. '+
  (lost.secret?'One secret found. ':'')+'Zero lives in danger.</p>'+
  (stars.filter(s=>s.taken).length?'<p>The crates you collected from the shafts were spare parts for '+
   'the station. They ordered them in March.</p>':'')+
  '<p>By the way, Ann-Sofie wonders if you could fly back.</p>'+
  '<p>They forgot the toolbox.</p>',
  [{text:'ONE MORE TRY',primary:true,run:()=>startLost(true)},{text:'MAIN MENU',run:toMenu}]);
}
function updateStars(){
 for(const st of stars){
  if(st.taken)continue;
  if(Math.hypot(st.x-heli.x,st.y-heli.y)<48){
   st.taken=true;AudioState.sfx('rescue');
   const left=stars.filter(v=>!v.taken).length;
   radio(left?'Crate secured. '+left+' left in the shafts.':'All crates aboard. Continue to the beacon.',4);
  }
 }
}
function updateLost(dt){if(!L.lost||!lost.active)return;updateStars();lost.total+=dt;lost.lastSave+=dt;const best=Math.min(L.beacon,heli.x);if(best>lost.best){lost.best=best;if(best>lost.recordShown+350){lost.recordShown=best;popup(heli.x,heli.y-105,'NEW BEST · '+Math.round(best/L.beacon*100)+' %','#bcebd7');}}
 if(!lost.secret&&Math.hypot(heli.x-3940,heli.y-685)<70){lost.secret=true;popup(heli.x,heli.y-80,'SECRET OF THE MINE');radio('Bad idea. Excellent result.',4);}
 if(heli.carrying===people.length&&!lost.returning){lost.returning=true;radio('Everyone aboard. The helicopter counts as everyone too. Get home.',6);}
 const pad=lostPads.findIndex(p=>Math.abs(heli.x-p.x)<p.w*.38);const safe=pad>=0&&heli.landed&&Math.abs(heli.vx)<12&&Math.abs(heli.angle)<.16;
 lost.hold=safe?lost.hold+dt:0;if(safe&&lost.hold>1.1){if(!lost.returning&&pad>lost.cp){lost.cp=pad;heli.hp=Math.min(100,heli.hp+35);repairDents(.45);heli.fuel=100;heli.rockets=8;lost.snapshot=lostSnapshot();saveLost();popup(heli.x,heli.y-80,'CHECKPOINT SAVED');
   const praise=['Now you can fail from a slightly better place.','Saved. The mountain knows you were here.',
    'Nice. That looked almost intentional.','Checkpoint. Breathe. Then keep going.',
    'You are officially better than the last pilot.','Saved. Nobody needs to know how it happened.',
    'Good landing. The valley is still longer than you think.'];
   radio(praise[pad%praise.length],5);AudioState.sfx('rescue');}if(lost.returning&&pad>0&&!lost.returnService.has(pad)){lost.returnService.add(pad);heli.hp=Math.min(100,heli.hp+20);repairDents(.3);heli.fuel=100;radio('Quick service. The journey home remains.',3);}}
 if(lost.lastSave>4){saveLost();lost.lastSave=0;}
 $('lostStatus').hidden=false;const progress=Math.round(lost.best/L.beacon*100);$('lostStatus').textContent=(lost.returning?'← HOME TO EAGLE BASE':'→ RESCUE BEACON')+' · '+lostPads[lost.cp].name+' · BEST '+progress+' % · '+lost.crashes+' CRASHES';$('tip').textContent=heli.x>3350&&heli.x<4350?(heli.y>510?'MINE · STAY CENTRED · WATCH THE CEILING AND WALLS':'SAFE ROUTE · FLY OVER THE MOUNTAIN'):lostWind().label+' · LEARN THE RHYTHM · LAND AT RELAY PADS';
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
for(let i=1;i<lostPads.length;i++){const p=lostPads[i];landingPad(p.x,p.w,i<=lost.cp);label(p.name,p.x,ground(p.x)-83,'#c6ead8',13);if(Math.abs(heli.x-p.x)<340)label(i<=lost.cp?'CHECKPOINT SAVED':'LAND GENTLY · SAVE CHECKPOINT',p.x,ground(p.x)+34,'#c6ead8',10);if(Math.abs(heli.x-p.x)<p.w&&lost.hold>0)line(p.x-45,ground(p.x)-62,p.x-45+90*clamp(lost.hold/1.1,0,1),ground(p.x)-62,'#c6efd5',3);}
 const areas=[[780,'THE OPEN VALLEY'],[2100,'RIVER CROSSING'],[2670,'WIND PASS'],[3300,'THE OLD MINE'],[4740,'MOUNTAIN BRIDGE'],[5450,'STORM PEAK'],
  [7900,'COPPER RIDGE'],[10300,'RIVER VALLEY'],[12600,'MOUNTAIN STATION'],[14800,'THE LONG PASS'],
  [17100,'NORTH VALLEY'],[19500,'THE ABANDONED BASE'],[21800,'BEACON TRAIL'],[24200,'FINAL APPROACH']];for(const [x,name]of areas)if(Math.abs(x-camera-vw/2)<vw)label(name,x,150,'#d1e3d577',18);
 if(!lost.secret){glow(3940,685,35,'#f2d38d35');poly([[3940,671],[3952,685],[3940,699],[3928,685]],'#e7c67e');label('?',3940,690,'#344c54',14);}
 label('MINE →',3300,700,'#aee4d7',13);label('↑ ROUTE OVER THE MOUNTAIN',3300,210,'#bde4da',13);
 const bx=L.beacon,by=ground(bx);line(bx,by,bx,by-110,'#728f8b',5);glow(bx,by-110,45,'#d9efb633');ellipse(bx,by-110,6,6,'#e0f4c7');label('RESCUE BEACON',bx,by-150,'#dceccd',15);
 {const w=lostWind();if(w.strength>.35){for(let i=0;i<10;i++){const x=camera+(i*137+time*w.x*2+vw*10)%vw,y=180+i*36;line(x,y,x+w.x*.6,y+w.y*.6,'#d9e7de44',1);}label(w.label+' · '+Math.floor(time%14)+' / 14 S',heli.x,heli.y-205,'#d6e9df',11);}}
}

const drillNames={basic:'Basics · take off, countersteer and land',turn:'Smooth airborne turns',rescue:'Rescue a person',cargo:'Pick up and deliver cargo'};
function selectTraining(){clearInput();mode='select';school.active=false;$('skipSchool').hidden=$('retrySchool').hidden=true;$('mobile').hidden=true;$('menu').hidden=true;showModal('FLIGHT SCHOOL','Train at your own pace.','<p>Choose any exercise. The same flight physics as the missions. Every exercise can be restarted.</p><div class="missionlist" id="trainingList"></div>',[{text:'MAIN MENU',run:toMenu}]);for(const [kind,name] of Object.entries(drillNames)){const b=document.createElement('button'),done=kind==='basic'?save.schoolComplete:save.trainingResults?.[kind];b.innerHTML='<b>'+name+'</b><span>'+(done?'✓ COMPLETE · TRAIN AGAIN':'START EXERCISE')+'</span>';b.onclick=()=>startDrill(kind);$('trainingList').append(b);}AudioState.sync();}
function startDrill(kind){if(!drillNames[kind])return;if(kind==='basic'){startTraining();return;}loadLevel(0);L={...levels[0],name:'FLIGHT SCHOOL',region:drillNames[kind],length:2600,wind:0,people:[],guns:[],clear:false,cargo:kind==='cargo'?{x:1040,to:1740}:null};makeWorld();
 stars=L.lost?lostShafts.map(x=>({x,y:ground(x)-60,taken:false})):[];
 heli=newHeli();people=kind==='rescue'?[{x:1110,y:ground(1110)-8,homeX:1110,status:'waiting',phase:0}]:[];cargo=kind==='cargo'?{x:1040,y:ground(1040)-14,status:'waiting',to:1740}:null;enemies=['gun','rocket'].includes(kind)?[1120,1700].map(x=>({x,y:ground(x)-15,hp:kind==='gun'?28:55,max:kind==='gun'?28:55,type:kind==='gun'?'gun':'missile',cd:999,aim:-Math.PI/2,flash:0,warn:0,training:true,trainingWeapon:kind})):[];school={active:true,kind,stage:0,hold:0,turnedLeft:false,refill:0};$('modalTitle').textContent=drillNames[kind];$('modalTag').textContent='FLIGHT SCHOOL · FREE PRACTICE';$('modalBody').innerHTML='<p>'+drillHint()+'</p><p>'+({turn:'Take off first. Q / SWIPE turns in about 1.7 seconds. Turn left, hold steady flight, then turn back. The helicopter keeps its momentum throughout.',rescue:'Fly over the researcher. H / STABILIZE helps hold altitude. Hold E / WINCH to lower the hook. Release once attached, then land at base.',cargo:'Hold E / WINCH until the hook catches the crate. Release to lift. Fly to the delivery pad and lower the load gently onto it.',gun:'Tilt the helicopter to aim. Space / FIRE shoots along the barrel. Hit both practice targets. Short bursts prevent overheating.',rocket:'Tilt to aim and press R / ROCKET. Hit both armoured targets. The cannon cannot damage these targets. Practice rockets refill when empty.'}[kind])+'</p>';if(coarse)$('modalBody').innerHTML='<p>'+drillNames[kind]+'</p><p>Hold one screen half to tilt, both to climb. Release to descend. Swipe horizontally to turn the nose that way.</p><p>WINCH: tap to lower, tap again to raise. Stabilize for pickup and land gently.</p>';updateHUD();}
function drillHint(){if(coarse||touchFlight)return school.kind==='turn'?'LIFT WITH BOTH · SWIPE LEFT · BALANCE · SWIPE RIGHT':school.kind==='rescue'?'WINCH: TAP TO LOWER · TAP AGAIN TO REEL IN · LAND AT BASE':'PICK UP THE CRATE · WINCH TOGGLES LOWERING / REELING';if(school.kind==='turn')return school.turnedLeft?'Q / SWIPE RIGHT · KEEP YOUR FLIGHT STEADY':'LIFT · Q / SWIPE LEFT · KEEP YOUR FLIGHT STEADY';if(school.kind==='rescue')return heli.carrying?'← RETURN TO BASE AND LAND':heli.ropeTarget?'RELEASE E / TOGGLE WINCH TO REEL IN':'→ RESEARCHER AT 1110 · LOWER WINCH TO PICK UP';if(school.kind==='cargo')return cargo?.status==='attached'?'→ DELIVERY PAD · LOWER THE CRATE GENTLY':'→ PICK UP THE CRATE WITH E / WINCH';return (school.kind==='gun'?'SPACE / FIRE':'R / ROCKET')+' · HIT BOTH TARGETS · '+enemies.filter(e=>e.hp<=0).length+'/2';}
function updateDrill(dt){let passed=false;if(school.kind==='turn'){const calm=!heli.landed&&heli.turn===0&&Math.abs(heli.angle)<.3&&Math.abs(heli.vx)<50&&Math.abs(heli.vy)<40,dir=school.turnedLeft?1:-1;school.hold=calm&&heli.dir===dir?school.hold+dt:0;if(school.hold>1){if(!school.turnedLeft){school.turnedLeft=true;school.hold=0;radio('Good! Turn back right and balance your flight.',4);}else passed=true;}}if(school.kind==='rescue')passed=people.length>0&&people.every(p=>p.status==='delivered');if(school.kind==='cargo')passed=cargo?.status==='delivered';if(['gun','rocket'].includes(school.kind))passed=enemies.length>0&&enemies.every(e=>e.hp<=0);if(school.kind==='rocket'&&heli.rockets===0&&rockets.length===0){school.refill+=dt;if(school.refill>2){heli.rockets=4;school.refill=0;radio('Four fresh practice rockets. Aim with the nose and try again.',4);}}if(passed){const kind=school.kind;save.trainingResults=save.trainingResults||{};save.trainingResults[kind]=true;persist();school.active=false;mode='trainingDone';clearInput();$('mobile').hidden=true;$('skipSchool').hidden=$('retrySchool').hidden=true;AudioState.sfx('rescue');showModal('TRAINING COMPLETE','Well done.', '<p>'+drillNames[kind]+' completed. Training progress is saved separately from mission scores.</p>',[{text:'NEXT EXERCISE',primary:true,run:()=>{const kinds=Object.keys(drillNames),next=kinds[kinds.indexOf(kind)+1];next?startDrill(next):selectTraining()}},{text:'TRAIN AGAIN',run:()=>startDrill(kind)},{text:'ALL EXERCISES',run:selectTraining}]);}}
function drawDrillGuide(){let x=heli.x,y=heli.y-100,text=drillHint();if(school.kind==='rescue'){x=heli.carrying?390:1110;y=ground(x)-85;text=heli.carrying?'LAND AT BASE':'WINCH UP THE RESEARCHER';}if(school.kind==='cargo'){x=cargo?.status==='attached'?1740:1040;y=ground(x)-85;text=cargo?.status==='attached'?'LOWER THE CRATE':'PICK UP THE CRATE';}if(['gun','rocket'].includes(school.kind)){for(const e of enemies)if(e.hp>0){ctx.strokeStyle='#edcb8f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,40,0,TAU);ctx.stroke();label('PRACTICE TARGETS · '+(school.kind==='gun'?'CANNON':'ROCKET'),e.x,e.y-78,'#f5dda6',11);}return;}label(text,x,y,'#cbf1d8',12);}
function startTraining(){loadLevel(0);school={active:true,kind:'basic',stage:0,hold:0};$('modalBody').innerHTML='<p>Three short exercises: take off, countersteer and land. Follow the turquoise marker. Flight physics match the missions.</p><p>Both screen halves / W: climb. One half / A or D: tilt. Countersteer to brake. Release both / S: descend. You can leave the exercise at any time.</p>';}
function updateTraining(dt){$('retrySchool').hidden=!school.active;$('skipSchool').hidden=!school.active;if(school.active&&school.kind&&school.kind!=='basic'){updateDrill(dt);return;}if(!school.active)return;const h=heli;let inside=false;if(school.stage===0)inside=Math.abs(h.x-390)<90&&h.y<490&&!h.landed;else if(school.stage===1)inside=Math.abs(h.x-553)<60&&Math.abs(h.y-455)<48&&Math.abs(h.vx)<22&&Math.abs(h.vy)<20;else inside=school.cleanLanding&&h.landed&&Math.abs(h.x-553)<55&&Math.abs(h.vx)<12&&Math.abs(h.angle)<.15;school.hold=inside?school.hold+dt:Math.max(0,school.hold-dt*2);if(school.hold>=(school.stage===1?2:.7)){school.stage++;school.hold=0;AudioState.sfx('rescue');if(school.stage===3){school.active=false;time=0;$('retrySchool').hidden=true;save.schoolComplete=true;persist();$('skipSchool').hidden=true;radio('Basic flight complete! Find more exercises in FLIGHT SCHOOL, or continue this rescue mission.',7);popup(h.x,h.y-75,'BASIC FLIGHT COMPLETE');}else radio(school.stage===1?'Good takeoff. Fly to the next box and countersteer early to stop.':'Good control. Descend slowly over the landing pad.',5);}}
function updatePrecision(dt){const h=heli,steady=!h.landed&&Math.abs(h.vx)<22&&Math.abs(h.vy)<18&&Math.abs(h.angle)<.16;precision.hold=steady?Math.min(4,precision.hold+dt):0;if(Math.abs(h.vx)>100)precision.fast=true;const target=people.find(p=>p.status==='waiting'&&Math.abs(p.x-h.x)<85&&p.y-h.y>60&&p.y-h.y<240);if(target&&steady&&precision.fast){precision.approach+=dt;if(precision.approach>=1.5&&!precision.targets.has(target.homeX)){precision.targets.add(target.homeX);score+=100;popup(h.x,h.y-80,'CONTROLLED APPROACH +100');AudioState.sfx('attach');precision.fast=false;}}else precision.approach=0;}
function drawFlightGuides(){if(school.active&&school.kind&&school.kind!=='basic'){drawDrillGuide();}if(school.active&&(!school.kind||school.kind==='basic')){const x=school.stage===0?390:553,y=school.stage===2?ground(x)-31:455,w=school.stage===0?150:110,h=school.stage===2?44:85;ctx.fillStyle='#8ceac810';ctx.fillRect(x-w/2,y-h/2,w,h);ctx.strokeStyle='#a5efcf';ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.strokeRect(x-w/2,y-h/2,w,h);ctx.setLineDash([]);label(['CLIMB HERE','COUNTERSTEER · HOLD POSITION','LAND HERE'][school.stage],x,y-h/2-15,'#caf5de',12);line(x-w/2,y+h/2+9,x-w/2+w*clamp(school.hold/(school.stage===1?2:.7),0,1),y+h/2+9,'#bdf6d7',4);}if(mode==='playing'&&!heli.landed&&(keys.KeyE||heli.ropeTarget)){const progress=clamp(precision.hold/1.2,0,1);line(heli.x-32,heli.y-80,heli.x+32,heli.y-80,'#183848',4);line(heli.x-32,heli.y-80,heli.x-32+64*progress,heli.y-80,'#b8ead0',4);label(progress===1?'STEADY WINCH':'STABILIZE FOR PRECISION',heli.x,heli.y-90,'#d0eadb',10);}}
function drawHazardGuides(){let nearest=Infinity;for(const o of obstacles){const dx=heli.x-clamp(heli.x,o.x,o.x+o.w),dy=heli.y-clamp(heli.y,o.y,o.y+o.h),distance=Math.hypot(dx,dy);nearest=Math.min(nearest,distance);if(o.x>camera+vw+100||o.x+o.w<camera-100)continue;if(distance<145){const x=clamp(heli.x,o.x,o.x+o.w),y=clamp(heli.y,o.y,o.y+o.h);glow(x,y,24,'#ffc57935');}}if(nearest<130&&mode==='playing'){label('ROCK CLOSE · WATCH ROTOR',heli.x,heli.y-155,'#ffd198',12);}}
function updateTutorial(){if(ops){$('tip').textContent=operationHint();return;}if(coarse||touchFlight){$('tip').textContent='ONE SIDE: TILT · BOTH: LIFT · RELEASE: DESCEND · SWIPE: TURN · WINCH: TOGGLE';return;}if(school.active&&school.kind&&school.kind!=='basic'){$('tip').textContent=drillHint();return;}if(school.active){$('tip').textContent=[coarse?'1/3 · HOLD BOTH SCREEN HALVES · CLIMB TO THE BOX':'1/3 · HOLD W · CLIMB TO THE CYAN BOX','2/3 · FLY RIGHT · COUNTERSTEER AND HOLD THE BOX FOR 2 SECONDS','3/3 · REDUCE LIFT · LAND SOFTLY ON THE MARKED PAD'][school.stage];return;}if(L.theme==='jungle'){$('tip').textContent=heli.x>1600&&heli.x<3050?'CAVE PASSAGE · CYAN LIGHTS SHOW THE WAY · H / STABILIZE CAN HELP':'FOLLOW THE RAVINE DOWN · KEEP THE ROTOR CLEAR OF ROCKS';return;}if(level!==0){$('tip').textContent=cargo&&cargo.status==='attached'?'Heavy cargo: add lift. Lower gently over the delivery pad.':'';return;}if(time<12&&heli.x<650)$('tip').textContent=coarse?'Push up to lift. Tilt sideways to build speed.':'Hold W to lift. A / D tilts the helicopter and builds speed.';else if(time<32)$('tip').textContent='Release the controls: momentum carries you on. Countersteer to brake.';else if(people.some(p=>p.status==='waiting'&&Math.abs(p.x-heli.x)<220))$('tip').textContent=coarse?'Hold steady. Toggle WINCH to lower. Toggle again once attached.':'H stabilizes altitude. Hold E to lower the winch, release to reel in.';else if(save.depthMode&&Math.abs(heli.z)>14)$('tip').textContent='Return to mission depth with J / CENTRE to rescue and land at base.';else if(time<70)$('tip').textContent='Countersteer to brake. Q changes direction. Fly gently with cargo.';else $('tip').textContent='';}
function objectiveTarget(){if(ops)return operationTarget();if(heli.ropeTarget?.kind==='person')return{x:heli.x,text:'RELEASE WINCH · LIFT ABOARD'};if(cargo?.status==='attached')return{x:cargo.to,text:'DELIVER THE GENERATOR'};if(cargo?.status==='waiting')return{x:cargo.x,text:'PICK UP THE GENERATOR'};const waiting=people.filter(p=>p.status==='waiting').sort((a,b)=>Math.abs(a.x-heli.x)-Math.abs(b.x-heli.x));if(waiting.length)return{x:waiting[0].x,text:'DISTRESS SIGNAL'};if(L.clear){const e=enemies.filter(e=>e.hp>0).sort((a,b)=>Math.abs(a.x-heli.x)-Math.abs(b.x-heli.x))[0];if(e)return{x:e.x,text:'AIR DEFENCE'}}if(boss?.hp>0)return{x:boss.x,text:'HEAVY GUNSHIP'};return{x:390,text:'RETURN TO BASE'};}
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
 gauge('compactHealth','HULL',heli.hp,heli.hp<30);
 gauge('compactFuel','FUEL',heli.fuel,heli.fuel<20);
 put('compactAlt','<small>ALTITUDE</small><b>'+Math.max(0,Math.round(agl*.45))+'<em> m</em></b>');
 flag('compactAlt','alert',!heli.landed&&agl<45);
 const gathered=stars.filter(s=>s.taken).length;
 put('compactStars','<small>CARGO</small><b>'+gathered+'<em> / '+stars.length+'</em></b>');
 $('compactStars').hidden=!stars.length&&!cargo;if(cargo)put('compactStars','<small>CARGO</small><b>'+(cargo.status==='delivered'?'DELIVERED':cargo.status==='attached'?'ATTACHED':'0 / 1')+'</b>');
 flag('compactStars','done',stars.length>0&&gathered===stars.length);
 put('compactPeople','<small>PASSENGERS</small><b>'+heli.carrying+'<em> / '+people.length+'</em></b>');
 $('compactPeople').hidden=!people.length;
 put('compactGoal',school.active?'FLIGHT SCHOOL':'MISSION · '+arrow+' '+target.text+(distance>60?' · DISTANCE '+Math.round(distance*.45)+' m':''),true);
 updateOperationHUD();
 flag('hoverBtn','active',hoverMode);flag('winchBtn','active',!!keys.KeyE);
 put('soundBtn',save.muted?'SOUND OFF':'SOUND ON',true);$('soundBtn').setAttribute('aria-pressed',String(!save.muted));
 $('radio').style.opacity=radioTimer>0?1:0;
 updateValleyRail();
 // Contextual coaching only; the plain distance already lives in the instrument rail.
 put('targetGuide',school.active?'FLIGHT SCHOOL · '+(school.kind&&school.kind!=='basic'?drillHint():['LIFT','COUNTERSTEER AND STOP','SOFT LANDING'][school.stage]):heli.landed&&heli.x<610?'BASE SERVICE · '+heli.delivered+'/'+people.length+' HOME':distance<70&&target.text==='DISTRESS SIGNAL'?'HOLD POSITION · LOWER WINCH':'',true);
 const warn=heli.hp<25?'CRITICAL HULL · RETURN':heli.fuel<18?'LOW FUEL · RETURN':!heli.landed&&agl<45&&heli.vy>60?'GROUND CLOSE · REDUCE DESCENT':'';
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
for(const [id,key] of [['fireControl','Space'],['rocketControl','KeyR'],['flareControl','KeyF']])$(id).addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation?.();if(mode!=='playing'||!L.combat)return;if(key==='Space')keys.Space=!keys.Space;else edges[key]=true;updateCombatHUD();});
$('dropBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation?.();if(mode==='playing')toggleWater();});
$('hoverBtn').addEventListener('pointerdown',e=>{e.preventDefault();if(mode==='playing')edges.KeyH=true;});
$('menuSettings').onclick=settings;$('lostBtn').onclick=()=>{AudioState.init();loadLevel(Number.isInteger(save.lastOperation)&&levels[save.lastOperation]?.ops?save.lastOperation:OP_START)};$('freshLostBtn').onclick=selectMissions;$('startBtn').onclick=selectMissions;$('schoolBtn').onclick=selectTraining;$('skipSchool').onclick=selectTraining;$('retrySchool').onclick=()=>{const kind=school.kind||'basic';startDrill(kind)};$('selectBtn').onclick=selectMissions;$('jungleBtn').onclick=()=>{AudioState.init();loadLevel(OP_START+3)};$('pauseBtn').onclick=pause;$('settingsBtn').onclick=settings;$('soundBtn').onclick=()=>{save.muted=!save.muted;persist();AudioState.init();AudioState.sync();updateHUD()};$('fullBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();}catch{}};if(!document.documentElement.requestFullscreen)$('fullBtn').hidden=true;
addEventListener('keydown',e=>{if(e.code!=='Tab'||$('modal').hidden)return;const list=[...$('modal').querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')];if(!list.length)return;const first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}});
addEventListener('blur',()=>{if(lost.active)saveLost();clearInput();if(mode==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden){if(lost.active)saveLost();clearInput();if(mode==='playing')pause()}});
let previous=0,accumulator=0;function frame(now){const dt=Math.min(.08,(now-previous)/1000||0);previous=now;accumulator+=dt;while(accumulator>=1/120){fixedUpdate(1/120);accumulator-=1/120;}Music.want(musicForState());Music.update(dt);render();requestAnimationFrame(frame);}
resize();loadLevel(OP_START,false);requestAnimationFrame(frame);
})();


