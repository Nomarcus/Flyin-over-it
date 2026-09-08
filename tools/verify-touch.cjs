const fs=require('fs'),vm=require('vm'),assert=require('assert');const {createCanvas,loadImage}=require('@napi-rs/canvas');
(async()=>{
const kv={};const root=require('path').resolve(__dirname,'../dist'),nodes={};function element(id){if(nodes[id])return nodes[id];let base={style:{},hidden:false,innerHTML:'',textContent:'',disabled:false,children:[],classes:new Set(),get classList(){const c=this.classes;return{toggle:(k,on)=>{on===undefined?(c.has(k)?c.delete(k):c.add(k)):(on?c.add(k):c.delete(k))},add:k=>c.add(k),remove:k=>c.delete(k),contains:k=>c.has(k)}},listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)},setAttribute(){},setPointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:135,height:135}},append(b){this.children.push(b)},replaceChildren(){this.children=[]},querySelector(){return this.children[0]},focus(){}};if(id==='game'||id==='map')base=Object.assign(createCanvas(id==='map'?360:1440,id==='map'?100:900),base);return nodes[id]=base;}
const sandbox={console,performance:{now:()=>1000},setTimeout:()=>{},screen:{orientation:{angle:90}},document:{getElementById:element,createElement:()=>element('dynamic'+Math.random()),documentElement:{},addEventListener(){},hidden:false},innerWidth:1440,innerHeight:900,devicePixelRatio:1,addEventListener(){},requestAnimationFrame(){},localStorage:{getItem:k=>kv[k]??null,setItem:(k,v)=>kv[k]=v},Image:function(){},matchMedia:()=>({matches:false}),Math,testArt:{day:await loadImage(root+'/alpine-day.webp'),night:await loadImage(root+'/alpine-night.webp'),jungle:await loadImage(root+'/jungle.webp')}};sandbox.window=sandbox;
let code=fs.readFileSync(root+'/game.js','utf8').replace(/const art=\{[^\n]+/, 'const art=globalThis.testArt;');
code=code.replace(/\}\)\(\);\s*$/,`globalThis.api={touchAxes,clearInput,requestFacing,startLost,retryLost,updateLost,crashLost,getLost:()=>lost,startDrill,updateDrill,startTraining,updateTraining,updatePrecision,getSchool:()=>school,getPrecision:()=>precision,gearPoint,collideObstacles,blocked,getObstacles:()=>obstacles,getPads:()=>lostPads,gyro,orientationSample,gyroInput,gearSupport,loadLevel,begin,fixedUpdate,render,heliBody,winchMount,ground,weapon,keys,edges,resize,pause,settings,selectMissions,ready,updateBase,updateWeapons,updateProjectiles,updateWinch,updateHUD,drawWinchGuides,drawFlightInstruments,buildValleyRail,updateValleyRail,getHudCache:()=>hudCache,get:()=>({camera,cameraY,vw,vh,baseVw,baseVh,zoom,scale,oy,mode,heli,L,level,people,enemies,cargo,boss,bullets,rockets,missiles,decoys,score,save,time,wind}),set:(o)=>{if('mode'in o)mode=o.mode;if('camera'in o)camera=o.camera;if('cameraY'in o)cameraY=o.cameraY;if('hoverMode'in o)hoverMode=o.hoverMode;if('time'in o)time=o.time;if('wind'in o)wind=o.wind},resetProjectiles:()=>{bullets=[];rockets=[];missiles=[];gunCd=rocketCd=flareCd=0;},addMissile:(m)=>missiles.push(m)};})();`);vm.createContext(sandbox);vm.runInContext(code,sandbox);const a=sandbox.api,step=(s)=>{for(let i=0;i<Math.round(s*120);i++)a.fixedUpdate(1/120)},start=i=>{a.loadLevel(i);a.begin();};

const emit=(id,type,pointerId,x,y=300)=>{for(const f of element(id).listeners[type]||[])f({pointerId,clientX:x,clientY:y,preventDefault(){}})};
a.startLost(true);a.begin();
emit('flightLeft','pointerdown',1,100);assert.equal(a.touchAxes().x,-1);assert.equal(a.touchAxes().y,0);
emit('flightRight','pointerdown',2,1200);assert.equal(a.touchAxes().x,0);assert(a.touchAxes().y>0);
step(1.8);let h=a.get().heli;assert(h.y<a.ground(h.x)-80,'Both hands take off');
emit('flightLeft','pointerup',1,100);assert.equal(a.touchAxes().x,1);step(.35);assert(h.angle>0,'Right hand tilts right');
emit('flightRight','pointercancel',2,1200);assert.equal(a.touchAxes().x,0);assert(a.touchAxes().y<0);step(2.4);assert(h.vy>0||h.landed,'Released hands descend');
a.startLost(true);a.begin();emit('flightRight','pointerdown',3,1100);emit('flightRight','pointermove',3,850);assert.equal(a.get().heli.dir,-1,'Swipe left sets facing left');const yaw=a.get().heli.yawTarget;emit('flightRight','pointermove',3,600);assert.equal(a.get().heli.yawTarget,yaw,'One turn per swipe');emit('flightRight','pointerup',3,600);
step(1.8);emit('flightLeft','pointerdown',4,100);emit('flightLeft','pointermove',4,350);assert.equal(a.get().heli.dir,1,'Swipe right faces right');
a.pause();assert.equal(a.touchAxes().x,0);a.pause();
emit('winchBtn','pointerdown',5,700);assert(a.keys.KeyE);emit('winchBtn','pointerdown',6,700);assert(!a.keys.KeyE);
emit('flightLeft','pointerdown',7,100);emit('flightLeft','pointerdown',8,110);emit('flightLeft','lostpointercapture',7,100);assert.equal(a.touchAxes().x,-1,'Second same-side finger preserved');a.clearInput();assert.equal(a.touchAxes().x,0);
for(let i=0;i<8;i++){a.loadLevel(i);a.begin();const state=a.get();assert.equal(state.enemies.length,0);assert(!state.boss);a.keys.Space=true;a.edges.KeyR=true;a.updateWeapons(.1);assert.equal(state.bullets.length,0);assert.equal(state.rockets.length,0);state.people.forEach(p=>p.status='aboard');state.heli.carrying=state.people.length;if(state.cargo)state.cargo.status='delivered';if(i<7){step(1.8);assert.equal(a.get().mode,'debrief','Peaceful mission '+i+' finishes');}}

a.startLost(true);a.begin();let craft=a.get().heli;craft.x=2200;craft.y=25;craft.landed=false;step(.05);let view=a.get();assert(view.heli.y-view.cameraY>=119,'Rotor has top clearance');assert(view.heli.x-view.camera>=129,'Side clearance');assert(view.oy>=54,'Canvas below status rail');assert(view.oy+view.vh*view.scale<=sandbox.innerHeight-11,'Canvas within the bottom margin');
sandbox.innerWidth=844;sandbox.innerHeight=390;a.resize();view=a.get();
// On a phone both rails float over the picture rather than reserving bands of their own, so
// the flight view claims almost the whole screen. Reserving them cost a third of a landscape
// iPhone between them.
assert(view.oy>=10&&view.oy<=16,'Phone reserves only a thin top margin, got '+Math.round(view.oy));
const drawnLandscape=view.vh*view.scale;
assert(drawnLandscape>=390-26,'Landscape picture fills the screen, drew '+Math.round(drawnLandscape)+' of 390');
assert(view.oy+drawnLandscape<=381,'Picture stays on screen');
a.render();
// Long-valley checkpoints must save and restore beyond the original four pads.
a.startLost(true);a.begin();h=a.get().heli;
assert.equal(a.get().L.length,26000);assert(a.get().people.every(p=>p.x>25000));
for(const x of [1480,3160,4880,6900,9100,11300,13600,15800,18100,20400,22800]){
 h.x=x;h.y=a.gearSupport();h.vx=h.vy=h.angle=h.av=0;h.landed=true;h.fuel=40;
 a.updateLost(1.2);assert.equal(h.fuel,100,'Checkpoint refuels at '+x);
}
assert.equal(a.getLost().cp,11);a.startLost();a.begin();h=a.get().heli;assert.equal(h.x,22800,'Last checkpoint resumes');
for(const person of a.get().people){
 h.x=person.x;h.y=person.y-145;h.vx=h.vy=h.angle=h.av=0;h.collective=315;h.hoverY=h.y;
 a.set({hoverMode:true});a.keys.KeyE=true;step(2.5);assert(h.ropeTarget,'Far beacon capture');
 a.keys.KeyE=false;step(2.8);assert.equal(person.status,'aboard','Far beacon rescue');
}
a.updateLost(.1);assert(a.getLost().returning);h.x=390;h.angle=h.av=h.vx=h.vy=0;h.y=a.gearSupport();h.landed=true;a.set({hoverMode:false});a.updateBase(2);assert.equal(a.get().mode,'lostDone','Full return completes long valley');
console.log('PASS: all 11 checkpoints, late checkpoint reload, both far beacon rescues and return completion');

// Valley geometry. The flight tests reach checkpoints by teleporting, so nothing else here
// would notice a passage walled off or an obstacle parked on a landing pad. Measured against
// the game's own ground() rather than the numbers the level was authored with.
a.startLost(true);a.begin();
{
 const obs=a.getObstacles(),pads=a.getPads(),beacon=a.get().L.beacon;
 const CRAFT=80;                      // the craft's collision points span about 77 units tall
 assert(obs.length>30,'The valley is built out end to end, got '+obs.length+' obstacles');

 // Every stretch between checkpoints has something in it: no dead kilometres. The opening
 // run to Old Ranger Platform is exempt on purpose — the design plan wants the first area to
 // feel easy, with the landing itself as the challenge.
 for(let i=1;i<pads.length-1;i++){
  const from=pads[i].x,to=pads[i+1].x;
  if(to-from<900)continue;
  const inSection=obs.filter(o=>o.x>from&&o.x<to).length;
  assert(inSection>0,'Nothing to fly between '+pads[i].name+' and '+pads[i+1].name);
 }

 // Hanging obstacles must leave their stated clearance against the highest ground they cross.
 for(const o of obs.filter(o=>o.gap!==undefined)){
  let min=Infinity;
  for(let x=o.x;x<=o.x+o.w;x+=10)min=Math.min(min,a.ground(x)-(o.y+o.h));
  assert(min>=CRAFT+40,'Under-passage at x='+o.x+' leaves only '+min.toFixed(0));
  assert(min<=o.gap+2,'Under-passage at x='+o.x+' is looser than authored: '+min.toFixed(0)+' vs '+o.gap);
 }

 // A pillar standing inside a roof would wall the low route off completely.
 for(const r of obs.filter(o=>o.type==='roof'))
  for(const p of obs.filter(o=>o.type==='pillar'&&o.x+o.w>r.x&&o.x<r.x+r.w)){
   const slot=p.y-(r.y+r.h);
   assert(slot>=CRAFT+40,'Roof at '+r.x+' and pillar at '+p.x+' leave a '+slot.toFixed(0)+' slot');
  }

 // Fairness: a deeply tilted craft is taller than a level one, because the rotor disc swings
 // into the vertical. Every gate has to admit the craft at the full nose-down attitude, or the
 // level is asking for something it does not allow.
 {
  const pts=[[0,0,25],[35,0,14],[-70,-12,10],[-75,-47,5],[75,-47,5],[0,-47,5]];
  const extent=ang=>{let lo=Infinity,hi=-Infinity;
   for(const [px,py,r] of pts){const ry=px*Math.sin(ang)+py*Math.cos(ang);lo=Math.min(lo,ry-r);hi=Math.max(hi,ry+r)}
   return hi-lo};
  const level=extent(0),tilted=extent(.96);
  assert(tilted>level,'A tilted craft is taller than a level one');
  let tightest=Infinity,where=null;
  for(const o of obs.filter(o=>o.gap!==undefined)){
   let min=Infinity;
   for(let x=o.x;x<=o.x+o.w;x+=10)min=Math.min(min,a.ground(x)-(o.y+o.h));
   if(min<tightest){tightest=min;where=o.x}
  }
  assert(tightest>tilted,'Gate at x='+where+' is '+tightest.toFixed(0)+' but a fully tilted craft needs '+tilted.toFixed(0));
 }

 // Landing has to be possible: keep the approach to every pad clear.
 for(const p of pads){
  const half=p.w/2;
  for(const o of obs){
   const d=Math.max(0,Math.max(p.x-half-(o.x+o.w),o.x-(p.x+half)));
   assert(d>=120,'Obstacle at x='+o.x+' crowds '+p.name+', only '+d.toFixed(0)+' away');
  }
  assert(p.x<beacon,'Pad '+p.name+' sits beyond the beacon');
 }
}
console.log('PASS: valley geometry is flyable, pads are approachable, no dead stretches');

// You must always be able to take off again from anywhere you can land. Grounded contact used
// to zero the vertical velocity every tick, which threw away the climb the rotor had just
// built: the craft could only rise one tick's acceleration at a time, and on a slope it slid
// downhill faster than that, so the ground never let go and full power went nowhere. That left
// 151 of 498 resting places in the valley impossible to leave.
{
 const slopeAt=x=>Math.atan2(a.ground(x+38)-a.ground(x-37),75);
 const obs=a.getObstacles();
 const insideObstacle=x=>obs.some(o=>x+85>o.x&&x-85<o.x+o.w);
 // Sample slopes of every character, plus the steepest ground the valley has.
 let steepest=700;
 for(let x=700;x<a.get().L.beacon;x+=25)
  if(!insideObstacle(x)&&Math.abs(slopeAt(x))>Math.abs(slopeAt(steepest)))steepest=x;
 const spots=[390,1000,1350,1725,2875,4880,6900,9100,11300,13600,15800,18100,20400,22800,steepest]
  .filter(x=>!insideObstacle(x));
 let worstTime=0,worstAt=null;
 for(const x of spots){
  a.startLost(true);a.begin();a.clearInput();      // a crash would freeze every later spot
  const c=a.get().heli;
  c.x=x;c.vx=c.vy=c.av=c.cyclic=c.compression=0;c.angle=slopeAt(x);
  c.collective=0;c.fuel=100;c.y=a.gearSupport();c.landed=true;c.airborne=false;
  for(let i=0;i<120;i++)a.fixedUpdate(1/120);   // settle
  a.keys.KeyW=true;
  let t=0,left=null;
  while(t<3){a.fixedUpdate(1/120);t+=1/120;if(a.gearSupport()-c.y>12){left=t;break}}
  a.keys.KeyW=false;
  assert(left!==null,'Cannot take off at x='+x+', slope '+(slopeAt(x)*57.3).toFixed(1)+' degrees');
  if(left>worstTime){worstTime=left;worstAt=x}
 }
 assert(worstTime<1.6,'Slowest lift-off was '+worstTime.toFixed(2)+'s at x='+worstAt);
 // Beyond what the gear can take up, lift is cos(angle) of thrust and full collective cannot
 // beat gravity, so the resting attitude has to stay inside what can be powered out of.
 assert(Math.cos(.42)*530>315,'The gear slope limit must leave enough thrust pointing up');
}
console.log('PASS: the craft can take off again from anywhere it can land');
// Open sky: continuous climb passes the old ceiling and camera follows at altitude.
a.loadLevel(0);a.begin();a.clearInput();h=a.get().heli;a.keys.KeyW=true;step(14);a.keys.KeyW=false;
assert(h.y < -1500,'Can climb far above the old ceiling');assert(h.vy < -100,'No invisible ceiling stops ascent');
let highView=a.get();assert(h.y-highView.cameraY>=119&&h.y-highView.cameraY<=highView.vh-99,'High-altitude camera keeps craft clear of HUD');
a.render();a.keys.KeyS=true;step(3);a.keys.KeyS=false;assert(h.vy>0,'Controlled descent from high altitude');
console.log('PASS: unrestricted ascent, high-altitude rendering, camera clearance and descent');
// Controlled flight: momentum persists, opposing input brakes, tilt stays bounded.
a.loadLevel(0);a.begin();a.clearInput();h=a.get().heli;h.x=1800;h.y=180;h.landed=false;h.collective=315;h.vx=100;
step(.25);assert(h.vx>85,'Momentum persists without auto braking');
a.keys.KeyA=true;step(.85);a.keys.KeyA=false;assert(h.vx<70,'Countersteering reduces speed');assert(Math.abs(h.angle)<=1.24,'Tilt bounded');assert(Number.isFinite(h.vy),'Lift remains finite');
assert.equal(a.get().baseVh,400,'Landscape keeps the close 400-unit world height');
console.log('PASS: retained momentum, controlled countersteering, bounded attitude and closer camera');

// Handling budget. Speed is a commitment: hands off, the craft carries a long way, so a fast
// run has to be planned out of. What it must NOT become is twitchy or unstoppable, so braking
// authority and attitude response are held to the same figures as before the drag was cut.
a.loadLevel(0);a.begin();a.clearInput();
const fly=(vx)=>{const c=a.get().heli;c.x=1800;c.y=180;c.landed=false;c.airborne=true;
 c.collective=315;c.vx=vx;c.vy=0;c.angle=0;c.av=0;c.cyclic=0;return c};
const tick=1/120;
// Pin the altitude each tick so this measures the horizontal law alone. Without it a leftover
// touch session reads "no fingers" as descend, and the craft lands mid-measurement.
const level=(c)=>{c.y=180;c.vy=0;c.landed=false;c.airborne=true};
h=fly(160);let x0=h.x,t=0;
while(Math.abs(h.vx)>40&&t<12){a.fixedUpdate(tick);level(h);t+=tick}
const coast=h.x-x0;
assert(coast>480&&coast<580,'Hands-off coast stays in the planned band, got '+Math.round(coast));
h=fly(160);x0=h.x;t=0;a.keys.KeyA=true;
while(h.vx>5&&t<12){a.fixedUpdate(tick);level(h);t+=tick}
a.keys.KeyA=false;
const brake=h.x-x0;
assert(brake<160,'Committed braking still stops it quickly, got '+Math.round(brake));
assert(coast/brake>3,'Coasting must cost far more ground than braking, ratio '+(coast/brake).toFixed(1));
h=fly(0);let peak=0;a.keys.KeyD=true;
for(let i=0;i<220;i++){a.fixedUpdate(tick);level(h);peak=Math.max(peak,Math.abs(h.angle))}
a.keys.KeyD=false;
assert(peak>.78&&peak<=.90,'The nose reaches deep but does not tip over, peak '+peak.toFixed(3));

// The point of a deep nose: lift is cos(angle) of rotor thrust, so speed is bought with
// height. Held at hover power the floor must come up, and it must buy real speed for it.
h=fly(0);a.keys.KeyD=true;
// Pin the collective at hover power: the claim is about what tilt alone does to lift, not
// about whatever a leftover touch session is asking the engine for.
for(let i=0;i<240;i++){h.collective=315;a.fixedUpdate(tick)}
a.keys.KeyD=false;
assert(h.vy>70,'A deep nose sinks at hover power, got '+Math.round(h.vy));
assert(h.vx>230,'A deep nose buys real speed for that height, got '+Math.round(h.vx));
console.log('PASS: handling asks for planning without becoming twitchy');

// Portrait fills the screen: the world box grows instead of the picture shrinking into bars.
sandbox.innerWidth=390;sandbox.innerHeight=844;a.resize();let portrait=a.get();
const availableH=844-12-12,drawn=portrait.baseVh*(portrait.scale*portrait.zoom);
assert(portrait.baseVh>600,'Portrait grows the world box, got '+portrait.baseVh);
assert(drawn>=availableH*.95,'Portrait fills the flight area, drew '+Math.round(drawn)+' of '+availableH);
assert(portrait.oy>=10&&portrait.oy+drawn<=844-11,'Portrait canvas stays inside the margins');
sandbox.innerWidth=1440;sandbox.innerHeight=900;a.resize();
console.log('PASS: portrait fills the flight area without letterboxing');

// Climbing pulls the camera back so the valley floor stays visible instead of sliding away.
a.loadLevel(0);a.begin();a.clearInput();h=a.get().heli;
let low=a.get();assert(Math.abs(low.zoom-1)<.02,'Ground level keeps the close camera');
a.keys.KeyW=true;step(2.2);a.keys.KeyW=false;step(1.4);
let up=a.get();const agl=a.ground(h.x)-h.y-30.8;
assert(agl>260&&agl<560,'Test climb lands in the framed band, got '+Math.round(agl));
assert(up.zoom>1.15,'Camera pulls back with altitude, zoom '+up.zoom.toFixed(2));
assert(up.vh>up.baseVh,'Zoom widens the world box');
assert(a.ground(h.x)-up.cameraY<=up.vh,'Valley floor stays inside the frame at working altitude');
assert(h.y-up.cameraY>=119,'Rotor keeps clearance while zoomed out');
// Past the design limit the pull-back saturates rather than shrinking the craft to nothing;
// the floor is allowed to leave, but the craft must stay clear of the instrument rail.
a.keys.KeyW=true;step(6);a.keys.KeyW=false;step(1);let far=a.get();
assert(far.zoom<=2.0001,'Zoom saturates at the design limit, got '+far.zoom.toFixed(2));
assert(h.y-far.cameraY>=119,'Rotor clearance holds above the framed band');
// The on-screen rectangle must not move when the camera zooms.
assert(Math.abs(up.vh*up.scale-up.baseVh*(up.scale*up.zoom))<.001,'Zoom leaves the drawn rect fixed');
a.render();
console.log('PASS: altitude zoom-out keeps the valley floor framed');
// The instrument rail must carry height above ground and range to the objective.
a.startLost(true);a.begin();a.updateHUD();
const rail=id=>nodes[id]?.innerHTML||nodes[id]?.textContent||'';
assert(/HÖJD/.test(rail('compactAlt')),'Rail shows height above ground');
// Low hull, low fuel and a low pass each have to raise their own alert.
h=a.get().heli;h.hp=20;h.fuel=12;h.landed=false;h.y=a.ground(h.x)-40;a.updateHUD();
assert(nodes.compactHealth.classes.has('alert'),'Critical hull flags the gauge');
assert(nodes.compactFuel.classes.has('alert'),'Low fuel flags the gauge');
assert(nodes.compactAlt.classes.has('alert'),'A low pass flags the height');
assert(/SKROV KRITISKT/.test(nodes.warning.textContent),'Critical hull warns');
assert(nodes.tip.classes.has('hushed'),'A warning hushes the coaching tip');
h.hp=100;h.fuel=100;h.y=a.ground(h.x)-400;a.updateHUD();
assert(!nodes.compactHealth.classes.has('alert')&&!nodes.compactAlt.classes.has('alert'),'Alerts clear again');
assert(!nodes.tip.classes.has('hushed'),'The tip returns once the warning clears');
assert(/SKROV/.test(rail('compactHealth'))&&/BRÄNSLE/.test(rail('compactFuel')),'Rail keeps hull and fuel');
assert(/\d+\s*m/.test(nodes.compactGoal.textContent),'Rail shows range to the objective');
const readAlt=()=>Number(nodes.compactAlt.innerHTML.match(/<b>(\d+)/)[1]);
h=a.get().heli;const before=readAlt();h.y-=400;a.updateHUD();const after=readAlt();
assert(after>before,'Height reading tracks the climb: '+before+' -> '+after);
assert(Math.abs((after-before)-180)<3,'Height reads 0.45 m per world unit, got '+(after-before)+' for 400 units');
console.log('PASS: instrument rail reports hull, fuel, height and range');

// The valley rail is a one-line map of the route: a tick per relay pad plus the beacon and
// the craft's own marker, and pads light up as checkpoints are banked.
a.startLost(true);a.begin();const railEl=nodes.valleyRail;
assert.equal(railEl.hidden,false,'Valley rail shows in the long valley');
assert.equal(railEl.children.length,14,'Twelve pads, the beacon and the marker, got '+railEl.children.length);
const marker=railEl.children[13],firstPad=railEl.children[0];
h=a.get().heli;h.x=0;a.updateHUD();const atStart=marker.style.left;
h.x=a.get().L.beacon;a.updateHUD();const atBeacon=marker.style.left;
assert.equal(atStart,'0%','Marker starts at the mouth of the valley');
assert.equal(atBeacon,'100%','Marker reaches the beacon');
assert(parseFloat(firstPad.style.left)>=0&&parseFloat(firstPad.style.left)<=100,'Pads sit on the rail');
// Pads light up only once their checkpoint is banked.
const pads=railEl.children.slice(0,12);
assert(pads[0].classes.has('reached'),'Base counts as banked from the start');
assert(!pads[5].classes.has('reached'),'A pad ahead of the craft stays dark');
h=a.get().heli;
for(const x of [1480,3160,4880,6900,9100,11300]){h.x=x;h.y=a.gearSupport();h.vx=h.vy=h.angle=h.av=0;h.landed=true;a.updateLost(1.2);}
a.updateHUD();
assert(pads[5].classes.has('reached'),'Landing on a pad lights it up');
assert(!pads[7].classes.has('reached'),'Pads beyond the last checkpoint stay dark');
a.loadLevel(0);a.begin();assert.equal(nodes.valleyRail.hidden,true,'Valley rail hides outside the long valley');
console.log('PASS: valley rail maps pads, beacon and craft position');

// The rail only writes to the DOM when a reading actually changes.
a.startLost(true);a.begin();a.updateHUD();
let writes=0;const cache=nodes.compactAlt;let stored=cache.innerHTML;
Object.defineProperty(cache,'innerHTML',{get:()=>stored,set:v=>{writes++;stored=v},configurable:true});
h=a.get().heli;h.landed=false;
for(let i=0;i<25;i++)a.updateHUD();
assert.equal(writes,0,'Unchanged height is not rewritten, got '+writes+' writes');
h.y-=300;a.updateHUD();
assert.equal(writes,1,'A changed height writes exactly once, got '+writes);
delete cache.innerHTML;cache.innerHTML=stored;
console.log('PASS: the instrument rail only writes on change');

// Winch guides and the altitude ladder must survive every state they can be drawn in.
a.startLost(true);a.begin();h=a.get().heli;const survivor=a.get().people[0];
for(const [x,y,rope,label] of [[survivor.x,survivor.y-150,120,'over a survivor'],
  [survivor.x-300,survivor.y-90,60,'off to one side'],[390,a.ground(390)-31,0,'parked at base'],
  [survivor.x,-2000,185,'far above the valley']]){
 h.x=x;h.y=y;h.rope=rope;h.hookX=x;h.hookY=y+rope;h.landed=rope===0;
 a.drawWinchGuides();a.drawFlightInstruments();a.render();
}
console.log('PASS: winch guides and altitude ladder render in every state');
console.log('PASS: reserved flight viewport, camera clearance and landscape resize');
console.log('PASS: two-hand lift, one-hand tilt, released descent, directional swipe, pointer cancellation, pause cleanup, winch toggle, no combat and seven rescue mission gates.');
})().catch(e=>{console.error(e);process.exit(1)});
