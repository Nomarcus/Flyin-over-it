const fs=require('fs'),vm=require('vm'),assert=require('assert');const {createCanvas,loadImage}=require('@napi-rs/canvas');
(async()=>{
const kv={};const root=require('path').resolve(__dirname,'../dist'),nodes={};function element(id){if(nodes[id])return nodes[id];let base={style:{},hidden:false,innerHTML:'',textContent:'',disabled:false,children:[],classes:new Set(),get classList(){const c=this.classes;return{toggle:(k,on)=>{on===undefined?(c.has(k)?c.delete(k):c.add(k)):(on?c.add(k):c.delete(k))},add:k=>c.add(k),remove:k=>c.delete(k),contains:k=>c.has(k)}},listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)},setAttribute(){},setPointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:135,height:135}},append(b){this.children.push(b)},replaceChildren(){this.children=[]},querySelector(){return this.children[0]},focus(){}};if(id==='game'||id==='map')base=Object.assign(createCanvas(id==='map'?360:1440,id==='map'?100:900),base);return nodes[id]=base;}
const sandbox={console,performance:{now:()=>1000},setTimeout:()=>{},screen:{orientation:{angle:90}},document:{getElementById:element,createElement:()=>element('dynamic'+Math.random()),documentElement:{},addEventListener(){},hidden:false},innerWidth:1440,innerHeight:900,devicePixelRatio:1,addEventListener(){},requestAnimationFrame(){},localStorage:{getItem:k=>kv[k]??null,setItem:(k,v)=>kv[k]=v},Image:function(){},matchMedia:()=>({matches:false}),Math,testArt:{day:await loadImage(root+'/alpine-expedition.webp'),night:await loadImage(root+'/night-expedition.webp'),jungle:await loadImage(root+'/jungle-expedition.webp')}};sandbox.window=sandbox;
let code=fs.readFileSync(root+'/game.js','utf8').replace(/const art=\{[^\n]+/, 'const art=globalThis.testArt;');
code=code.replace(/\}\)\(\);\s*$/,`globalThis.api={circleContact,obstaclePolygon,collisionSamples,terrainContact,drawPillar,drawSpan,drawOverhang,drawBoulder,ctx,touchAxes,clearInput,requestFacing,startLost,retryLost,updateLost,crashLost,getLost:()=>lost,startDrill,updateDrill,startTraining,updateTraining,updatePrecision,getSchool:()=>school,getPrecision:()=>precision,gearPoint,collideObstacles,blocked,getObstacles:()=>obstacles,getPads:()=>lostPads,lostEpilogue,addDent,repairDents,failMission,getDebris:()=>debris,getWreck:()=>wreck,HULL,getStars:()=>stars,gyro,orientationSample,gyroInput,gearSupport,loadLevel,begin,fixedUpdate,render,heliBody,winchMount,ground,weapon,keys,edges,resize,pause,settings,selectMissions,ready,updateBase,updateWeapons,updateProjectiles,updateWinch,updateHUD,drawWinchGuides,drawFlightInstruments,buildValleyRail,updateValleyRail,getHudCache:()=>hudCache,get:()=>({camera,cameraY,vw,vh,baseVw,baseVh,zoom,scale,oy,mode,heli,L,level,people,enemies,cargo,boss,bullets,rockets,missiles,decoys,score,save,time,wind}),set:(o)=>{if('mode'in o)mode=o.mode;if('camera'in o)camera=o.camera;if('cameraY'in o)cameraY=o.cameraY;if('hoverMode'in o)hoverMode=o.hoverMode;if('time'in o)time=o.time;if('wind'in o)wind=o.wind},resetProjectiles:()=>{bullets=[];rockets=[];missiles=[];gunCd=rocketCd=flareCd=0;},addMissile:(m)=>missiles.push(m)};})();`);vm.createContext(sandbox);vm.runInContext(code,sandbox);const a=sandbox.api,step=(s)=>{for(let i=0;i<Math.round(s*120);i++)a.fixedUpdate(1/120)},start=i=>{a.loadLevel(i);a.begin();};



a.startLost(true);a.begin();let h=a.get().heli;
const gy=a.ground(390),floorContact=a.terrainContact(390,gy-2,4);assert(floorContact&&Math.abs(floorContact.depth-2)<1e-6&&floorContact.ny<-.99,'Ground contact respects the real surface');assert(!a.terrainContact(390,gy-6,4),'Clear ground clearance is not a collision');
const shape=a.obstaclePolygon({type:'pillar',x:100,y:100,w:240,h:220,tx:160,topW:100});
const len=Math.hypot(220,80),nx=220/len,ny=-80/len;
const slope=a.circleContact(300+nx*4,210+ny*4,7,shape);
assert(slope&&Math.abs(slope.depth-3)<1e-6,'Sloped side uses true perpendicular distance');
assert(Math.abs(slope.nx-nx)<1e-6&&Math.abs(slope.ny-ny)<1e-6,'Slope response follows the actual surface normal');
const box=a.obstaclePolygon({type:'roof',x:100,y:100,w:200,h:100,drip:20});
assert(a.circleContact(200,222,4,box),'The solid roof lip collides');
assert(!a.circleContact(200,225,4,box),'Space beneath the lip is clear');
const embedded=a.circleContact(102,150,5,box);assert(embedded.nx<-.99&&embedded.depth===7,'Inside contacts leave by nearest face');
h.turn=1;h.yaw=0;h.dir=-1;h.bank=0;
const first=a.collisionSamples();h.yaw=.001;const next=a.collisionSamples();
assert(first.every((p,i)=>Math.hypot(p.x-next[i].x,p.y-next[i].y)<.2),'No instantaneous hitbox flip on a smooth turn');
const rotor=first.filter(p=>p.part==='rotor');assert(rotor.length>=24);assert(Math.min(...rotor.map(p=>p.y-p.r))<-80,'Rotor ellipse covers its visible upper sweep');
h.dents=[];h.rotorHurt=0;a.addDent(90,-47,.8,'rotor');assert.equal(h.dents.length,0,'Rotor strike never paints a floating cabin dent');assert(h.rotorHurt>0);
a.addDent(-95,-24,.7,'tail');assert(h.dents[0].x<-90,'Tail damage remains on the tail');
a.addDent(47,-14,.7,'hull');assert(h.dents[1].y>-5,'Nose damage is anchored to actual nose skin');
a.addDent(30,21,.6,'gear');assert.equal(h.dents[2].y,28,'Gear damage stays on the skid');
const n=h.dents.length;a.addDent(31,21,.6,'gear');assert.equal(h.dents.length,n,'Repeated same-part hit deepens rather than duplicates');
a.repairDents(1);assert.equal(h.dents.length,0);assert.equal(h.rotorHurt,0);
// A broad wall touches multiple samples; one impact may remove at most one damage event.
a.startLost(true);a.begin();h=a.get().heli;h.x=1605;h.y=220;h.vx=140;h.vy=0;h.angle=0;h.bank=0;h.dir=1;h.turn=0;h.landed=false;
a.getObstacles().splice(0,a.getObstacles().length,{type:'rock',x:1700,y:0,w:100,h:450});
a.collideObstacles(1/120);assert(h.hp<100&&h.hp>=58,'One collision produces one bounded damage event');
const hp=h.hp;a.collideObstacles(1/120);assert.equal(h.hp,hp,'Resting contact does not repeatedly damage the hull');assert(h.vx<=0,'The wall stops inward velocity');
assert([h.x,h.y,h.vx,h.vy].every(Number.isFinite),'Contact remains numerically finite');
a.set({mode:'wreck'});assert(!a.collisionSamples().some(p=>p.part==='rotor'),'Detached rotor no longer collides as attached');
console.log('PASS: slope normals, inside recovery, roof lip, smooth-turn hitboxes, rotor sweep, damage anchors, repairs and single-impact damage');
})().catch(e=>{console.error(e);process.exit(1)});
