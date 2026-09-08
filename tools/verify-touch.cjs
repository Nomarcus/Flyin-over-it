const fs=require('fs'),vm=require('vm'),assert=require('assert');const {createCanvas,loadImage}=require('@napi-rs/canvas');
(async()=>{
const kv={};const root=require('path').resolve(__dirname,'../dist'),nodes={};function element(id){if(nodes[id])return nodes[id];let base={style:{},hidden:false,innerHTML:'',textContent:'',disabled:false,children:[],classList:{toggle(){},add(){},remove(){}},listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)},setAttribute(){},setPointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:135,height:135}},append(b){this.children.push(b)},replaceChildren(){this.children=[]},querySelector(){return this.children[0]},focus(){}};if(id==='game'||id==='map')base=Object.assign(createCanvas(id==='map'?360:1440,id==='map'?100:900),base);return nodes[id]=base;}
const sandbox={console,performance:{now:()=>1000},setTimeout:()=>{},screen:{orientation:{angle:90}},document:{getElementById:element,createElement:()=>element('dynamic'+Math.random()),documentElement:{},addEventListener(){},hidden:false},innerWidth:1440,innerHeight:900,devicePixelRatio:1,addEventListener(){},requestAnimationFrame(){},localStorage:{getItem:k=>kv[k]??null,setItem:(k,v)=>kv[k]=v},Image:function(){},matchMedia:()=>({matches:false}),Math,testArt:{day:await loadImage(root+'/alpine-day.webp'),night:await loadImage(root+'/alpine-night.webp'),jungle:await loadImage(root+'/jungle.webp')}};sandbox.window=sandbox;
let code=fs.readFileSync(root+'/game.js','utf8').replace(/const art=\{[^\n]+/, 'const art=globalThis.testArt;');
code=code.replace(/\}\)\(\);\s*$/,`globalThis.api={touchAxes,clearInput,requestFacing,startLost,retryLost,updateLost,crashLost,getLost:()=>lost,startDrill,updateDrill,startTraining,updateTraining,updatePrecision,getSchool:()=>school,getPrecision:()=>precision,gearPoint,collideObstacles,blocked,getObstacles:()=>obstacles,gyro,orientationSample,gyroInput,gearSupport,loadLevel,begin,fixedUpdate,render,heliBody,winchMount,ground,weapon,keys,edges,resize,pause,settings,selectMissions,ready,updateBase,updateWeapons,updateProjectiles,updateWinch,updateHUD,drawWinchGuides,drawFlightInstruments,buildValleyRail,updateValleyRail,getHudCache:()=>hudCache,get:()=>({camera,cameraY,vw,vh,baseVw,baseVh,zoom,scale,oy,mode,heli,L,level,people,enemies,cargo,boss,bullets,rockets,missiles,decoys,score,save,time,wind}),set:(o)=>{if('mode'in o)mode=o.mode;if('camera'in o)camera=o.camera;if('cameraY'in o)cameraY=o.cameraY;if('hoverMode'in o)hoverMode=o.hoverMode;if('time'in o)time=o.time;if('wind'in o)wind=o.wind},resetProjectiles:()=>{bullets=[];rockets=[];missiles=[];gunCd=rocketCd=flareCd=0;},addMissile:(m)=>missiles.push(m)};})();`);vm.createContext(sandbox);vm.runInContext(code,sandbox);const a=sandbox.api,step=(s)=>{for(let i=0;i<Math.round(s*120);i++)a.fixedUpdate(1/120)},start=i=>{a.loadLevel(i);a.begin();};

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

a.startLost(true);a.begin();let craft=a.get().heli;craft.x=2200;craft.y=25;craft.landed=false;step(.05);let view=a.get();assert(view.heli.y-view.cameraY>=119,'Rotor has top clearance');assert(view.heli.x-view.camera>=129,'Side clearance');assert(view.oy>=54,'Canvas below status rail');assert(view.oy+view.vh*view.scale<=sandbox.innerHeight-77,'Canvas above controls');
sandbox.innerWidth=844;sandbox.innerHeight=390;a.resize();view=a.get();assert(view.oy>=54);assert(view.oy+view.vh*view.scale<=313);a.render();
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

// Portrait fills the screen: the world box grows instead of the picture shrinking into bars.
sandbox.innerWidth=390;sandbox.innerHeight=844;a.resize();let portrait=a.get();
const availableH=844-54-78,drawn=portrait.baseVh*(portrait.scale*portrait.zoom);
assert(portrait.baseVh>600,'Portrait grows the world box, got '+portrait.baseVh);
assert(drawn>=availableH*.95,'Portrait fills the flight area, drew '+Math.round(drawn)+' of '+availableH);
assert(portrait.oy>=54&&portrait.oy+drawn<=844-77,'Portrait canvas stays inside the rails');
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
assert(/SKROV/.test(rail('compactHealth'))&&/BRÄNSLE/.test(rail('compactFuel')),'Rail keeps hull and fuel');
assert(/\d+\s*m/.test(nodes.compactGoal.textContent),'Rail shows range to the objective');
h=a.get().heli;h.y-=400;a.updateHUD();
assert(/<b>1[0-9]{2}/.test(nodes.compactAlt.innerHTML),'Height reading tracks the climb: '+rail('compactAlt'));
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
