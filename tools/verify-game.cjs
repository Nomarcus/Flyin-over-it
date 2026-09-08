const fs=require('fs'),vm=require('vm'),assert=require('assert');const {createCanvas,loadImage}=require('@napi-rs/canvas');
(async()=>{
const kv={};const root=require('path').resolve(__dirname,'../dist'),nodes={};function element(id){if(nodes[id])return nodes[id];let base={style:{},hidden:false,innerHTML:'',textContent:'',disabled:false,children:[],classList:{toggle(){},add(){},remove(){}},addEventListener(){},setAttribute(){},setPointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:135,height:135}},append(b){this.children.push(b)},replaceChildren(){this.children=[]},querySelector(){return this.children[0]},focus(){}};if(id==='game'||id==='map')base=Object.assign(createCanvas(id==='map'?360:1440,id==='map'?100:900),base);return nodes[id]=base;}
const sandbox={console,performance:{now:()=>1000},setTimeout:()=>{},screen:{orientation:{angle:90}},document:{getElementById:element,createElement:()=>element('dynamic'+Math.random()),documentElement:{},addEventListener(){},hidden:false},innerWidth:1440,innerHeight:900,devicePixelRatio:1,addEventListener(){},requestAnimationFrame(){},localStorage:{getItem:k=>kv[k]??null,setItem:(k,v)=>kv[k]=v},Image:function(){},matchMedia:()=>({matches:false}),Math,testArt:{day:await loadImage(root+'/alpine-day.webp'),night:await loadImage(root+'/alpine-night.webp'),jungle:await loadImage(root+'/jungle.webp')}};sandbox.window=sandbox;
let code=fs.readFileSync(root+'/game.js','utf8').replace(/const art=\{[^\n]+/, 'const art=globalThis.testArt;');
code=code.replace(/\}\)\(\);\s*$/,`globalThis.api={startLost,retryLost,updateLost,crashLost,getLost:()=>lost,startDrill,updateDrill,startTraining,updateTraining,updatePrecision,getSchool:()=>school,getPrecision:()=>precision,gearPoint,collideObstacles,blocked,getObstacles:()=>obstacles,gyro,orientationSample,gyroInput,gearSupport,loadLevel,begin,fixedUpdate,render,heliBody,winchMount,ground,weapon,keys,edges,resize,pause,settings,selectMissions,ready,updateBase,updateWeapons,updateProjectiles,updateWinch,updateHUD,get:()=>({mode,heli,L,level,people,enemies,cargo,boss,bullets,rockets,missiles,decoys,score,save,time,wind}),set:(o)=>{if('mode'in o)mode=o.mode;if('camera'in o)camera=o.camera;if('cameraY'in o)cameraY=o.cameraY;if('hoverMode'in o)hoverMode=o.hoverMode;if('time'in o)time=o.time;if('wind'in o)wind=o.wind},resetProjectiles:()=>{bullets=[];rockets=[];missiles=[];gunCd=rocketCd=flareCd=0;},addMissile:(m)=>missiles.push(m)};})();`);vm.createContext(sandbox);vm.runInContext(code,sandbox);const a=sandbox.api,step=(s)=>{for(let i=0;i<Math.round(s*120);i++)a.fixedUpdate(1/120)},start=i=>{a.loadLevel(i);a.begin();};
start(0);a.keys.KeyW=true;step(1.8);a.keys.KeyW=false;let h=a.get().heli;assert(h.y<a.ground(h.x)-70,'Takeoff');a.keys.KeyD=true;step(1.2);a.keys.KeyD=false;const before=h.vx;step(.6);assert(h.vx>before*.7,'Momentum retained');assert(Math.abs(h.angle)<1.25,'Angle bounded');a.keys.KeyA=true;step(1.5);a.keys.KeyA=false;assert(h.vx<before*.5,'Countersteer brakes');
// Physical aiming exactly follows attitude in both directions; no targeting data is consulted.
for(const dir of [-1,1])for(const angle of [-.55,-.22,0,.3,.6]){start(0);h=a.get().heli;h.x=1900;h.y=180;h.angle=angle;h.dir=dir;h.vx=75;h.vy=-22;a.resetProjectiles();a.keys.Space=true;a.edges.KeyR=true;a.updateWeapons(.001);const {bullets,rockets}=a.get(),g=a.weapon();assert(bullets.length===1&&rockets.length===1);const cross=bullets[0].vx*g.dy-bullets[0].vy*g.dx;assert(Math.abs(cross)<1e-8,'Gun alignment');assert(Math.abs(rockets[0].dx-g.dx)<1e-9&&Math.abs(rockets[0].dy-g.dy)<1e-9,'Rocket alignment');a.keys.Space=false;delete a.edges.KeyR;}
// Rescue with a stationary helicopter plus landing pickup alternative.
start(0);h=a.get().heli;let p=a.get().people[0];h.x=p.x;h.y=p.y-145;h.collective=315;h.hoverY=h.y;a.set({hoverMode:true});a.keys.KeyE=true;step(2.3);assert(h.ropeTarget,'Hook attaches');a.keys.KeyE=false;step(2.4);assert.equal(h.carrying,1,'Winch boards');assert.equal(p.status,'aboard');
start(0);h=a.get().heli;p=a.get().people[0];h.x=p.x-40;h.y=a.ground(h.x)-28;step(2);assert(h.carrying>=1,'Ground pickup');
// Cargo pickup, suspended load and destination release.
start(2);h=a.get().heli;let c=a.get().cargo;h.x=c.x;h.y=c.y-140;h.collective=315;h.hoverY=h.y;a.set({hoverMode:true,wind:0});a.keys.KeyE=true;step(2);assert(h.ropeTarget?.kind==='cargo','Cargo attaches');a.keys.KeyE=false;step(1);assert.equal(c.status,'attached');h.x=c.to;h.y=a.ground(c.to)-135;h.vx=h.vy=0;h.angle=h.av=0;h.ropeAngle=h.ropeV=0;h.hoverY=h.y;a.keys.KeyE=true;step(2.5);assert.equal(c.status,'delivered','Cargo delivered');
// All mission victory gates and saved unlocks.
for(let i=0;i<7;i++){start(i);const s=a.get();s.people.forEach(p=>p.status='aboard');s.heli.carrying=s.people.length;s.enemies.forEach(e=>e.hp=0);if(s.cargo)s.cargo.status='delivered';if(s.boss)s.boss.hp=0;step(1.8);assert.equal(a.get().mode,'debrief','Mission '+i+' completion');assert(a.get().save.results[i],'Saved results');}
// Return before completing objective must not finish mission.
start(1);step(2);assert.equal(a.get().mode,'playing');
// Pausing halts simulation; clearing input prevents stuck controls.
a.keys.KeyD=true;a.pause();let x=a.get().heli.x;step(1);assert.equal(a.get().heli.x,x);assert(!a.keys.KeyD);a.pause();assert.equal(a.get().mode,'playing');
// Actual collision damage and countermeasure path.
start(1);h=a.get().heli;let e=a.get().enemies[0];h.x=e.x-140;h.y=e.y-10;h.angle=0;h.dir=1;a.keys.Space=true;step(1.2);assert(e.hp<=0,'Cannon kills along bore');assert(a.get().score>=250,'Kill score');
start(1);h=a.get().heli;e=a.get().enemies[0];h.x=e.x-160;h.y=e.y-13;h.angle=0;a.edges.KeyR=true;a.updateWeapons(.01);delete a.edges.KeyR;for(let n=0;n<50;n++)a.updateProjectiles(.01);assert(e.hp<=0,'Rocket impact splash');
start(0);h=a.get().heli;h.x=1100;h.y=300;a.addMissile({x:1300,y:300,px:1300,py:300,vx:-100,vy:0,life:6,trail:0,decoy:null});a.edges.KeyF=true;a.updateWeapons(.01);delete a.edges.KeyF;a.updateProjectiles(.01);assert(a.get().missiles[0].decoy,'Flares divert missile');assert.equal(h.flares,3);
start(0);h=a.get().heli;h.x=1100;h.y=400;h.hp=4;a.addMissile({x:h.x+5,y:h.y,px:h.x+5,py:h.y,vx:-10,vy:0,life:6,trail:0,decoy:null});a.updateProjectiles(.01);assert.equal(a.get().mode,'failed','Destruction shows retry');a.loadLevel(0);a.begin();assert.equal(a.get().mode,'playing');assert.equal(a.get().heli.hp,100);
// Render each environment from the same geometry as the shipped game.
for(let i=0;i<7;i++){start(i);const s=a.get();h=s.heli;h.x=i===0?1100:2400;h.y=330;h.angle=.23;h.collective=340;h.rope=i===2?100:0;a.set({camera:h.x-500,time:32});a.updateHUD();a.render();fs.writeFileSync('/tmp/rotor-flight-scene-'+i+'.png',nodes.game.toBuffer('image/png'));}
// The yaw turn must advance smoothly and land at the new facing direction.
start(0);h=a.get().heli;h.y=250;h.collective=315;a.edges.KeyQ=true;step(.2);assert(h.yaw>0&&h.yaw<Math.PI);assert(h.turn>0);step(1.6);assert(Math.abs(h.yaw-Math.PI)<1e-8);const g=a.weapon();assert(g.dx<0,'Turn finishes facing left');
const rc=nodes.game.getContext('2d');rc.setTransform(1,0,0,1,0,0);rc.fillStyle='#193341';rc.fillRect(0,0,1440,900);rc.scale(2,2);h.bank=-.16;h.turn=.4;for(let i=0;i<4;i++){h.yaw=i*Math.PI/3;h.dir=i<2?1:-1;a.heliBody(150+(i%2)*365,130+Math.floor(i/2)*205,.1,h.dir);}fs.writeFileSync('/tmp/rotor-depth-poses.png',nodes.game.toBuffer('image/png'));
// Rope: bounds, tensile length, acceleration lag, free pendulum and floor contact.
start(0);h=a.get().heli;h.x=900;h.y=180;h.angle=0;h.bank=0;a.set({wind:0});a.keys.KeyE=true;let stretch=0;
const ropeStep=()=>{a.updateWinch(1/120);const ns=h.ropeNodes;for(let j=1;j<ns.length;j++){const n=ns[j],p=ns[j-1];assert(Number.isFinite(n.x)&&Number.isFinite(n.y));if(h.rope>15)stretch=Math.max(stretch,Math.hypot(n.x-p.x,n.y-p.y)/(h.rope/18));assert(n.y<=a.ground(n.x)-.99,'Rope above terrain')}};
for(let i=0;i<600;i++)ropeStep();const homeX=h.hookX;for(let i=0;i<120;i++){h.x+=1;ropeStep();}const lag=h.hookX-a.winchMount().x;assert(lag<-15,'Hook lags acceleration');let forward=-Infinity;for(let i=0;i<480;i++){ropeStep();forward=Math.max(forward,h.hookX-a.winchMount().x)}assert(forward>10,'Hook swings forward after stopping');assert(stretch<1.08,'Limited rope extension');
a.set({camera:h.x-450});a.render();fs.writeFileSync('/tmp/rotor-rope-flight.png',nodes.game.toBuffer('image/png'));
while(h.y<a.ground(h.x)-85){h.y=Math.min(h.y+.65,a.ground(h.x)-85);ropeStep();}for(let i=0;i<600;i++)ropeStep();assert(h.hookY<=a.ground(h.hookX)-13.9,'Hook rests above ground');assert(stretch<1.08,'Slack ground cable stable');a.keys.KeyE=false;for(let i=0;i<300;i++)ropeStep();assert.equal(h.rope,0,'Winch stows');assert(Math.hypot(h.hookX-a.winchMount().x,h.hookY-a.winchMount().y)<1,'Hook parked');console.log('Rope diagnostics:',{lag,forward,maxStretch:stretch});
// Gyro deadzone, smooth response, landscape reversal, contact and attitude envelope.
start(0);a.selectMissions();assert.equal(nodes.missionList.children.length,8);assert(nodes.missionList.children.every(b=>!b.disabled));start(0);h=a.get().heli;step(3);assert(Math.abs(h.angle)<.0001);assert(Math.abs(h.y-a.gearSupport())<.001);assert(h.landed);assert.equal(h.z,0);
a.gyro.enabled=true;a.orientationSample({beta:0,gamma:0});a.orientationSample({beta:1,gamma:0});for(let i=0;i<100;i++)a.gyroInput(1/120);assert.equal(a.gyro.filtered,0);a.orientationSample({beta:-20,gamma:0});let first=a.gyroInput(1/120);assert(first>0&&first<.1);for(let i=0;i<120;i++)a.gyroInput(1/120);assert(a.gyro.filtered>.5);a.gyro.enabled=false;a.gyro.filtered=0;
start(0);h=a.get().heli;h.y=160;h.landed=false;h.collective=500;a.keys.KeyD=true;a.keys.KeyW=true;step(1);assert(h.angle>.7,'Wide tilt envelope');a.keys.KeyD=false;step(.25);assert(h.angle>.4,'Attitude inertia');
for(let i=0;i<7;i++){start(i);h=a.get().heli;h.x=1200;h.y=300;h.angle=.35;a.set({camera:700,time:32});a.render();fs.writeFileSync('/tmp/rotor-upgraded-scene-'+i+'.png',nodes.game.toBuffer('image/png'));}
start(0);a.render();fs.writeFileSync('/tmp/rotor-jungle-start.png',nodes.game.toBuffer('image/png'));
console.log('PASS: gyro filtering/deadzone, stable contact, extended tilt, six scenes');
// Traversable cave interior, solid ceiling and projectile shielding.
start(6);h=a.get().heli;h.x=2300;h.y=730;h.landed=false;h.collective=315;h.hoverY=h.y;a.set({hoverMode:true,camera:1780,cameraY:270});step(.5);assert(h.y>650&&h.y<800,'Below roof and above cavern floor');assert(a.blocked(2300,350,2300,720),'Roof shields vertical shots');assert(!a.blocked(1850,730,2800,730),'Open tunnel line');h.y=605;h.vy=-100;a.collideObstacles(1/120);assert(h.y>605,'Ceiling pushes aircraft down');h.y=730;h.angle=0;a.set({camera:1780,cameraY:260});a.render();fs.writeFileSync('/tmp/rotor-jungle-cave.png',nodes.game.toBuffer('image/png'));
start(6);h=a.get().heli;let researcher=a.get().people[1];h.x=researcher.x;h.y=researcher.y-145;h.collective=315;h.hoverY=h.y;a.set({hoverMode:true,wind:0});a.keys.KeyE=true;step(2.4);assert(h.ropeTarget,'Cave rescue attaches');a.keys.KeyE=false;step(2.5);assert.equal(h.carrying,1,'Cave rescue boards');
for(const z of [-25,25]){const p=a.gearPoint(0,30.8,z,0,0);assert(Math.abs(p.y-30.8)<1e-8,'Both skids share baseline');}
console.log('PASS: cave flight, ceiling collisions, wall shielding, cave rescue and both skid baselines');
// Training only advances after actual aircraft conditions are met.
a.startTraining();a.begin();assert(a.getSchool().active);a.updateTraining(1);assert.equal(a.getSchool().stage,0);h=a.get().heli;h.y=470;h.landed=false;a.updateTraining(.8);assert.equal(a.getSchool().stage,1);h.x=553;h.y=455;h.vx=80;a.updateTraining(3);assert.equal(a.getSchool().stage,1);h.vx=h.vy=0;a.updateTraining(2.1);assert.equal(a.getSchool().stage,2);h.landed=true;h.angle=0;a.updateTraining(.8);assert(a.getSchool().active);a.getSchool().cleanLanding=true;a.updateTraining(.8);assert(!a.getSchool().active);assert(a.get().save.schoolComplete);
start(0);h=a.get().heli;h.landed=false;h.vx=150;a.updatePrecision(.1);h.x=a.get().people[0].x;h.y=a.get().people[0].y-140;h.vx=h.vy=h.angle=0;let base=a.get().score;a.updatePrecision(1.6);assert.equal(a.get().score,base+100);a.updatePrecision(2);assert.equal(a.get().score,base+100);assert(a.getPrecision().hold>=1.2);
a.startTraining();a.begin();a.render();fs.writeFileSync('/tmp/rotor-school-view.png',nodes.game.toBuffer('image/png'));console.log('PASS: school conditions, completed persistence, sustained precision, no repeated approach farming');

// Lost Valley checkpoint, durable resume, retry and homecoming gates.
a.startLost(true);a.begin();step(1);assert.equal(a.get().mode,'playing');
h=a.get().heli;h.x=1480;h.y=a.ground(h.x)-30.8;h.landed=true;h.vx=h.vy=h.angle=0;a.updateLost(1.2);
assert.equal(a.getLost().cp,1);a.crashLost('test collision');assert.equal(a.get().mode,'failed');a.retryLost();assert.equal(a.get().heli.x,1480);assert.equal(a.getLost().crashes,1);assert.equal(a.get().heli.carrying,0);
a.startLost();assert.equal(a.getLost().cp,1);a.begin();h=a.get().heli;h.x=6100;h.y=400;h.landed=false;a.updateLost(.1);assert.equal(a.getLost().best,6100);
for(const p of a.get().people)p.status='aboard';h.carrying=2;a.updateLost(.1);assert(a.getLost().returning);assert.equal(a.get().mode,'playing');
h.x=390;h.y=a.ground(390)-30.8;h.vx=h.vy=h.angle=0;h.landed=true;step(2);assert.equal(a.get().mode,'lostDone');a.startLost(true);assert.equal(a.getLost().best,6100);assert.equal(a.getLost().cp,0);
a.begin();h=a.get().heli;h.x=3900;h.y=645;h.landed=false;a.set({camera:3250,cameraY:220});a.updateLost(.1);a.render();fs.writeFileSync('/tmp/rotor-lost-valley.png',nodes.game.toBuffer('image/png'));
for(const kind of ['turn','rescue','cargo','gun','rocket']){
 a.startDrill(kind);a.begin();a.updateDrill(.1);assert.equal(a.get().mode,'playing');h=a.get().heli;
 if(kind==='turn'){h.landed=false;h.dir=-1;h.angle=h.vx=h.vy=h.turn=0;a.updateDrill(1.1);assert(a.getSchool().turnedLeft);h.dir=1;a.updateDrill(1.1);}
 if(kind==='rescue'){a.get().people[0].status='delivered';a.updateDrill(.1);}
 if(kind==='cargo'){a.get().cargo.status='delivered';a.updateDrill(.1);}
 if(kind==='gun'||kind==='rocket'){a.get().enemies.forEach(e=>e.hp=0);a.updateDrill(.1);}
 assert.equal(a.get().mode,'trainingDone',kind+' gate');assert(a.get().save.trainingResults[kind]);
}
console.log('PASS: Lost Valley checkpoint/resume/retry/homecoming/personal best and five drill completion gates');

// Actual drill projectiles hit both stationary targets.
for(const kind of ['gun','rocket']){a.startDrill(kind);a.begin();h=a.get().heli;
 for(const target of a.get().enemies){h.x=target.x-140;h.y=target.y-13;h.angle=0;h.dir=1;h.yaw=h.yawTarget=0;h.turn=0;a.resetProjectiles();
 for(let shot=0;shot<10&&target.hp>0;shot++){a.resetProjectiles();a.keys.Space=kind==='gun';if(kind==='rocket')a.edges.KeyR=true;a.updateWeapons(.2);a.keys.Space=false;delete a.edges.KeyR;for(let n=0;n<55;n++)a.updateProjectiles(.01);}
 assert(target.hp<=0,kind+' physical hit');
 }}
a.startLost(true);a.begin();h=a.get().heli;
for(const person of a.get().people){h.x=person.x;h.y=person.y-145;h.vx=h.vy=h.angle=h.av=0;h.collective=315;h.hoverY=h.y;a.set({hoverMode:true});a.keys.KeyE=true;step(2.5);assert(h.ropeTarget,'Beacon hook capture');a.keys.KeyE=false;step(2.8);assert.equal(person.status,'aboard');}
assert.equal(h.carrying,2);console.log('PASS: physical drill projectile hits and both beacon winch rescues');
// Portrait rotation cannot change world coordinates.
start(0);h=a.get().heli;
const snapshot={y:h.y,p:a.get().people[0].y};sandbox.innerWidth=390;sandbox.innerHeight=844;a.resize();a.render();assert.equal(h.y,snapshot.y);assert.equal(a.get().people[0].y,snapshot.p);
console.log('PASS: takeoff, momentum, countersteering, both-direction gun/rocket attitude across 10 orientations, winch and landing rescues, cargo transport, all 6 mission gates and persistence, pause/input cleanup, six native-canvas renders, portrait resize.');
})().catch(e=>{console.error(e);process.exit(1)});
