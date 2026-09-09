const fs=require('fs'),vm=require('vm'),assert=require('assert');const {createCanvas,loadImage}=require('@napi-rs/canvas');
(async()=>{
const kv={};globalThis.madeAudio=[];const root=require('path').resolve(__dirname,'../dist'),nodes={};function element(id){if(nodes[id])return nodes[id];let base={style:{},hidden:false,innerHTML:'',textContent:'',disabled:false,children:[],classes:new Set(),get classList(){const c=this.classes;return{toggle:(k,on)=>{on===undefined?(c.has(k)?c.delete(k):c.add(k)):(on?c.add(k):c.delete(k))},add:k=>c.add(k),remove:k=>c.delete(k),contains:k=>c.has(k)}},listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)},setAttribute(){},setPointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:135,height:135}},append(b){this.children.push(b)},replaceChildren(){this.children=[]},querySelector(){return this.children[0]},focus(){}};if(id==='game'||id==='map')base=Object.assign(createCanvas(id==='map'?360:1440,id==='map'?100:900),base);return nodes[id]=base;}
const sandbox={console,performance:{now:()=>1000},setTimeout:()=>{},screen:{orientation:{angle:90}},document:{getElementById:element,createElement:tag=>tag==='canvas'?createCanvas(1,1):element('dynamic'+Math.random()),documentElement:{},addEventListener(){},hidden:false},innerWidth:1440,innerHeight:900,devicePixelRatio:1,addEventListener(){},requestAnimationFrame(){},localStorage:{getItem:k=>kv[k]??null,setItem:(k,v)=>kv[k]=v},Image:function(){},matchMedia:()=>({matches:false}),Math,
 Audio:function(src){this.src=src;this.volume=0;this.paused=true;this.currentTime=0;this.loop=false;this.preload='';
  this.duration=120;this.play=()=>{this.paused=false;return Promise.resolve()};this.pause=()=>{this.paused=true};
  this.addEventListener=(t,fn)=>{if(t==='error')this.fail=fn};globalThis.madeAudio.push(this);},
 testArt:{pine:await loadImage(root+'/assets/nature/pine-mature.webp'),tropical:await loadImage(root+'/assets/backgrounds/tropical-range.webp'),range:await loadImage(root+'/assets/backgrounds/alpine-range.webp'),day:await loadImage(root+'/alpine-expedition.webp'),night:await loadImage(root+'/night-expedition.webp'),jungle:await loadImage(root+'/jungle-expedition.webp')}};sandbox.window=sandbox;
let code=fs.readFileSync(root+'/game.js','utf8').replace(/const art=\{[^\n]+/, 'const art=globalThis.testArt;');
code=code.replace(/\}\)\(\);\s*$/,`globalThis.api={operations,OP_START,getOps:()=>ops,updateOperation,updateBucketWinch,toggleWater,operationTarget,obstaclePolygon,circleContact,touchAxes,clearInput,requestFacing,startLost,retryLost,updateLost,crashLost,getLost:()=>lost,startDrill,updateDrill,startTraining,updateTraining,updatePrecision,getSchool:()=>school,getPrecision:()=>precision,gearPoint,collideObstacles,blocked,getObstacles:()=>obstacles,getPads:()=>lostPads,lostEpilogue,addDent,repairDents,failMission,getDebris:()=>debris,getWreck:()=>wreck,HULL,getStars:()=>stars,Music,gyro,orientationSample,gyroInput,gearSupport,loadLevel,begin,fixedUpdate,render,heliBody,winchMount,ground,weapon,keys,edges,resize,pause,settings,selectMissions,ready,updateBase,updateWeapons,updateProjectiles,updateWinch,updateHUD,drawWinchGuides,drawFlightInstruments,buildValleyRail,updateValleyRail,getHudCache:()=>hudCache,get:()=>({camera,cameraY,vw,vh,baseVw,baseVh,zoom,scale,oy,mode,heli,L,level,people,enemies,cargo,boss,bullets,rockets,missiles,decoys,score,save,time,wind}),set:(o)=>{if('mode'in o)mode=o.mode;if('camera'in o)camera=o.camera;if('cameraY'in o)cameraY=o.cameraY;if('hoverMode'in o)hoverMode=o.hoverMode;if('time'in o)time=o.time;if('wind'in o)wind=o.wind},resetProjectiles:()=>{bullets=[];rockets=[];missiles=[];gunCd=rocketCd=flareCd=0;},addMissile:(m)=>missiles.push(m)};})();`);vm.createContext(sandbox);vm.runInContext(code,sandbox);const a=sandbox.api,step=(s)=>{for(let i=0;i<Math.round(s*120);i++)a.fixedUpdate(1/120)},start=i=>{a.loadLevel(i);a.begin();};


const dt=1/120;
function pin(x,y){const h=a.get().heli;h.x=x;h.y=y;h.vx=h.vy=h.angle=h.av=0;h.landed=false;h.ropeNodes=[];h.ropeMount=null;h.rope=0;return h;}
function ropeSeconds(s){for(let i=0;i<s*120;i++)a.updateWinch(dt);}
function scoop(){const o=a.getOps(),l=o.lakes[0],h=pin(l.x+l.w/2,l.y-155);a.keys.KeyE=true;ropeSeconds(5);assert(o.water>99,'Skopa fylls genom repets kontakt med sjön: '+o.water);a.keys.KeyE=false;ropeSeconds(2);return h;}
function extinguish(f){const h=pin(f.x,f.y-210);a.keys.KeyE=false;ropeSeconds(2);a.toggleWater();for(let i=0;i<5*120;i++){a.updateWinch(dt);a.updateOperation(dt);}assert(f.out,'Ballistiskt vatten släcker branden vid '+f.x+' (kvar '+f.left+')');}
function deliverCargo(){const c=a.get().cargo;pin(c.x,c.y-140);a.keys.KeyE=true;ropeSeconds(3);assert.equal(c.status,'attached','Generator kopplas med kroken');a.keys.KeyE=false;ropeSeconds(2);pin(c.to,a.ground(c.to)-150);a.keys.KeyE=true;ropeSeconds(3);a.keys.KeyE=false;a.updateOperation(dt);assert.equal(c.status,'delivered','Generator sänks på sin platta');}
function rescue(p){pin(p.x,p.y-145);a.keys.KeyE=true;ropeSeconds(3);assert.equal(p.status,'attached','Vinschen fångar personen');a.keys.KeyE=false;ropeSeconds(3);assert.equal(p.status,'aboard','Person hissas ombord');}
assert.equal(a.operations.length,17);a.selectMissions();assert.equal(nodes.missionList.children.length,19);{const cards=nodes.missionList.children;assert(/LOST VALLEY/.test(cards[0].innerHTML),'Expeditionen ligger först i listan');assert(/LAST CLIMB/.test(cards[cards.length-1].innerHTML),'Finalen avslutar listan');assert.equal(cards.filter(b=>/LOST VALLEY/.test(b.innerHTML)).length,1);assert(cards.slice(1).every(b=>!/LOST VALLEY/.test(b.innerHTML)));assert(cards.slice(0,-1).every(b=>!/LAST CLIMB/.test(b.innerHTML)));cards[0].onclick();const st=a.get();assert(st.L.lost,'Kortet startar den långa banan');assert(a.getLost().active);assert(a.getPads().length>=11);assert(a.getStars().length>0,'Schakten finns i banan');}assert(a.operations.every((l,i)=>!i||l.length>a.operations[i-1].length));
for(let i=0;i<a.operations.length;i++){
 start(a.OP_START+i);const st=a.get(),o=a.getOps();assert(!a.ready());assert.equal(st.enemies.length,(st.L.guns||[]).length);assert.equal(!!st.boss,!!st.L.boss);assert(st.L.ops);assert(st.heli.landed);a.render();
 if(st.L.gate){assert(st.people.every(p=>p.status==='sheltered'));const p=st.people[0];pin(p.x,p.y-145);a.keys.KeyE=true;ropeSeconds(3);assert.equal(p.status,'sheltered','Räddning öppnas först när platsen är säker');a.keys.KeyE=false;}
 for(const f of o.fires){scoop();extinguish(f);}
 if(st.L.combat){const h=st.heli;pin(900,200);a.keys.Space=true;a.edges.KeyR=true;a.updateWeapons(dt);assert(st.bullets.length>0&&st.rockets.length>0,'Both original weapons fire');a.keys.Space=false;delete a.edges.KeyR;a.resetProjectiles();for(const e of st.enemies){e.hp=7;st.bullets=a.get().bullets;st.bullets.push({x:e.x-6,y:e.y,px:e.x-6,py:e.y,vx:930,vy:0,life:1,z:0,enemy:false});a.updateProjectiles(dt);assert.equal(e.hp,0,'Machine gun disables robot');}if(st.boss){const b=st.boss;b.hp=40;const rs=a.get().rockets;rs.push({x:b.x-4,y:b.y,px:b.x-4,py:b.y,dx:1,dy:0,speed:260,z:0,life:2,trail:1});a.updateProjectiles(dt);assert.equal(b.hp,0,'Rocket disables command drone');}assert(st.people.every(p=>p.status==='sheltered'||p.status==='waiting'),'Weapons cannot damage people');}
 if(st.cargo)deliverCargo();assert(st.people.every(p=>p.status==='waiting'));
 for(const p of st.people)rescue(p);
 assert.equal(st.heli.carrying,st.people.length);assert(st.people.every(p=>p.status==='aboard'));assert(o.fires.every(f=>f.out));assert(!o.bucket);
 const h=st.heli;h.x=390;h.y=a.gearSupport();h.vx=h.vy=h.angle=h.av=0;h.landed=true;a.updateBase(2);assert.equal(a.get().mode,'debrief');assert(a.ready());assert(a.get().save.results[a.OP_START+i]);assert(nodes.modalActions.children.some(b=>b.textContent===(i===a.operations.length-1?'MISSIONS':'NEXT MISSION')));
 console.log('PASS: '+st.L.name+' – actual winch, cargo/water gates, return and result');
}
// Summit uses the existing winch and return gate at genuinely high world coordinates.
start(a.OP_START+6);const summit=a.get().L;assert(a.ground(390)-a.ground(summit.cargo.to)>4800);
for(const x of summit.fieldPads){assert.equal(a.ground(x-65),a.ground(x+65));const h=pin(x,a.ground(x)-30.8);h.landed=true;h.fuel=20;h.hp=70;a.updateOperation(2);assert(h.fuel>50&&h.hp>80);}
deliverCargo();assert.equal(a.get().mode,'playing','Summit delivery alone does not finish the return journey');assert.equal(a.operationTarget().x,390);
const high=pin(summit.cargo.to,a.ground(summit.cargo.to)-150);a.set({camera:high.x-500,cameraY:high.y-300});a.render();fs.writeFileSync('/tmp/summit-operation.png',nodes.game.toBuffer('image/png'));
a.keys.KeyW=true;step(.5);assert(high.y<-4200&&Number.isFinite(a.get().cameraY),'No artificial altitude ceiling');a.keys.KeyW=false;
console.log('PASS: 2165m summit, three flat service camps, delivery requires descent, high-altitude rendering and flight');
// Robot encounter: live AI patrol and fire, paused controls, peaceful weapons disabled.
start(a.OP_START+2);let patrol=a.get().enemies[0];pin(patrol.x-180,patrol.y-30);a.get().heli.collective=315;a.set({hoverMode:true});a.get().heli.hoverY=a.get().heli.y;const patrolX=patrol.x;let robotFired=false;for(let n=0;n<360;n++){step(1/120);robotFired ||= a.get().bullets.some(b=>b.enemy);}assert.notEqual(patrol.x,patrolX);assert(robotFired,'Robot patrol fires in live simulation');a.pause();assert(nodes.combatBar.hidden);assert(!a.keys.Space);a.pause();
start(a.OP_START+5);let command=a.get().boss;pin(command.x-160,command.y+25);a.get().heli.collective=315;step(.1);assert(command.active);const view=a.get();a.set({camera:command.x-view.vw*.5,cameraY:command.y-view.vh*.38});a.render();fs.writeFileSync('/tmp/robot-command.png',nodes.game.toBuffer('image/png'));
for(const i of [0,1,3,4,6]){start(a.OP_START+i);a.keys.Space=true;a.edges.KeyR=true;a.updateWeapons(.1);assert.equal(a.get().bullets.length,0);assert.equal(a.get().rockets.length,0);assert(nodes.combatBar.hidden);}
console.log('PASS: robot patrol fires, command drone activates, pause clears fire, five peaceful missions stay unarmed');
// Water is finite, misses cost water, and scenery blocks its swept trajectory.
start(a.OP_START+1);let o=a.getOps(),f=o.fires[0];scoop();pin(f.x+210,f.y-210);ropeSeconds(2);a.toggleWater();for(let i=0;i<600;i++)a.updateOperation(dt);assert.equal(f.left,f.max);assert.equal(o.water,0);a.toggleWater();assert(!o.dropping);
scoop();pin(f.x,f.y-220);ropeSeconds(2);const barrier={x:f.x-80,y:f.y-90,w:160,h:25,type:'roof',drip:0};a.getObstacles().push(barrier);a.toggleWater();for(let i=0;i<600;i++)a.updateOperation(dt);assert.equal(f.left,f.max,'Rock intercepts water');a.getObstacles().pop();
start(a.OP_START+1);o=a.getOps();assert.equal(o.water,0);assert(o.fires.every(f=>!f.out&&f.left===f.max));scoop();a.toggleWater();a.pause();const before=o.water;step(1);assert.equal(o.water,before);assert(nodes.dropBtn.hidden);a.pause();a.updateHUD();assert(!nodes.dropBtn.hidden);
// Same collective produces less lift with the full suspended bucket.
function climb(water){start(a.OP_START+1);const h=pin(1900,150);a.getOps().water=water;h.rope=58;h.ropeSupport=1;h.collective=315;a.keys.KeyW=true;step(.6);return h.vy;}
assert(climb(100)>climb(0)+8,'Water mass changes lift rather than being cosmetic');
// Full simulation rescue inside the authored cave, with actual rotor/roof collision enabled.
start(a.OP_START+3);const person=a.get().people[1],h=pin(person.x,person.y-145);h.collective=315;h.hoverY=h.y;a.set({hoverMode:true});a.keys.KeyE=true;step(2.5);assert.equal(person.status,'attached');a.keys.KeyE=false;step(2.8);assert.equal(person.status,'aboard');assert(h.hp>90,'Cave offers real rotor clearance');
// Render the new content using the same native canvas as the collision tests.
start(a.OP_START+1);scoop();f=a.getOps().fires[0];pin(f.x,f.y-220);ropeSeconds(2);a.toggleWater();for(let i=0;i<70;i++){a.updateWinch(dt);a.updateOperation(dt);}const v=a.get();a.set({camera:f.x-v.vw*.55,cameraY:f.y-v.vh*.78});a.render();fs.writeFileSync('/tmp/fire-operation.png',nodes.game.toBuffer('image/png'));
// Every mission's layout, checked against the terrain the seed actually produces rather than
// against the numbers as written. A bridge authored with a 260-unit gap can still end up buried
// if the ground beneath it rises, and a fire or a service pad placed inside an obstacle footprint
// cannot be reached at all. People and gun emplacements are deliberately exempt: one researcher
// waits under the arch by design, and the sentries use the rock as cover.
for(let i=0;i<a.operations.length;i++){
 start(a.OP_START+i);const L=a.get().L,obs=a.getObstacles();
 for(const o of obs.filter(o=>o.type!=='pillar')){
  let m=Infinity;for(let x=o.x;x<=o.x+o.w;x+=10)m=Math.min(m,a.ground(x)-(o.y+o.h));
  assert(m>=95,L.name+': only '+m.toFixed(0)+' units under the '+o.type+' at x='+o.x);
 }
 const reach=[...(L.fires||[]).map(f=>['fire',f.x]),...(L.fieldPads||[]).map(x=>['field pad',x]),
  ...(L.cargo?[['depot',L.cargo.x],['delivery pad',L.cargo.to]]:[])];
 for(const [what,x] of reach){
  assert(x>680&&x<L.length-60,L.name+': '+what+' at '+x+' is outside the flyable span');
  for(const o of obs)assert(!(x>o.x-70&&x<o.x+o.w+70),L.name+': '+what+' at '+x+' sits in the '+o.type+' at x='+o.x);
  for(const l of L.lakes||[])if(what==='fire')assert(!(x>l.x-40&&x<l.x+l.w+40),L.name+': '+what+' at '+x+' stands in a lake');
 }
 assert(L.gate!=='fire'||(L.fires||[]).length,L.name+': fire gate with no fires');
 assert(L.gate!=='cargo'||L.cargo,L.name+': cargo gate with no cargo');
 assert(!(L.fires||[]).length||(L.lakes||[]).length,L.name+': fires with nowhere to fill the bucket');
 assert(!L.clear||(L.guns||[]).length||L.boss,L.name+': clear flag with nothing to clear');
}
console.log('PASS: every mission layout is reachable — clearance, footprints, lakes and gates');
console.log('PASS: seven ordered missions, real scooping and ballistic drops, misses, rock interception, reset, pause, suspended mass and cave clearance');
})().catch(e=>{console.error(e);process.exit(1)});
