const fs=require('fs'),vm=require('vm'),assert=require('assert');const {createCanvas,loadImage}=require('@napi-rs/canvas');
(async()=>{
const kv={};const root=require('path').resolve(__dirname,'../dist'),nodes={};function element(id){if(nodes[id])return nodes[id];let base={style:{},hidden:false,innerHTML:'',textContent:'',disabled:false,children:[],classes:new Set(),get classList(){const c=this.classes;return{toggle:(k,on)=>{on===undefined?(c.has(k)?c.delete(k):c.add(k)):(on?c.add(k):c.delete(k))},add:k=>c.add(k),remove:k=>c.delete(k),contains:k=>c.has(k)}},listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)},setAttribute(){},setPointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:135,height:135}},append(b){this.children.push(b)},replaceChildren(){this.children=[]},querySelector(){return this.children[0]},focus(){}};if(id==='game'||id==='map')base=Object.assign(createCanvas(id==='map'?360:1440,id==='map'?100:900),base);return nodes[id]=base;}
const sandbox={console,performance:{now:()=>1000},setTimeout:()=>{},screen:{orientation:{angle:90}},document:{getElementById:element,createElement:()=>element('dynamic'+Math.random()),documentElement:{},addEventListener(){},hidden:false},innerWidth:1440,innerHeight:900,devicePixelRatio:1,addEventListener(){},requestAnimationFrame(){},localStorage:{getItem:k=>kv[k]??null,setItem:(k,v)=>kv[k]=v},Image:function(){},matchMedia:()=>({matches:false}),Math,testArt:{day:await loadImage(root+'/alpine-expedition.webp'),night:await loadImage(root+'/night-expedition.webp'),jungle:await loadImage(root+'/jungle-expedition.webp')}};sandbox.window=sandbox;
let code=fs.readFileSync(root+'/game.js','utf8').replace(/const art=\{[^\n]+/, 'const art=globalThis.testArt;');
code=code.replace(/\}\)\(\);\s*$/,`globalThis.api={drawPillar,drawSpan,drawOverhang,drawBoulder,ctx,touchAxes,clearInput,requestFacing,startLost,retryLost,updateLost,crashLost,getLost:()=>lost,startDrill,updateDrill,startTraining,updateTraining,updatePrecision,getSchool:()=>school,getPrecision:()=>precision,gearPoint,collideObstacles,blocked,getObstacles:()=>obstacles,getPads:()=>lostPads,lostEpilogue,addDent,repairDents,failMission,getDebris:()=>debris,getWreck:()=>wreck,HULL,getStars:()=>stars,gyro,orientationSample,gyroInput,gearSupport,loadLevel,begin,fixedUpdate,render,heliBody,winchMount,ground,weapon,keys,edges,resize,pause,settings,selectMissions,ready,updateBase,updateWeapons,updateProjectiles,updateWinch,updateHUD,drawWinchGuides,drawFlightInstruments,buildValleyRail,updateValleyRail,getHudCache:()=>hudCache,get:()=>({camera,cameraY,vw,vh,baseVw,baseVh,zoom,scale,oy,mode,heli,L,level,people,enemies,cargo,boss,bullets,rockets,missiles,decoys,score,save,time,wind}),set:(o)=>{if('mode'in o)mode=o.mode;if('camera'in o)camera=o.camera;if('cameraY'in o)cameraY=o.cameraY;if('hoverMode'in o)hoverMode=o.hoverMode;if('time'in o)time=o.time;if('wind'in o)wind=o.wind},resetProjectiles:()=>{bullets=[];rockets=[];missiles=[];gunCd=rocketCd=flareCd=0;},addMissile:(m)=>missiles.push(m)};})();`);vm.createContext(sandbox);vm.runInContext(code,sandbox);const a=sandbox.api,step=(s)=>{for(let i=0;i<Math.round(s*120);i++)a.fixedUpdate(1/120)},start=i=>{a.loadLevel(i);a.begin();};


a.startLost(true);a.begin();
const c=element('game'),cx=a.ctx;cx.resetTransform();
for(const [type,fn] of [['pillar','drawPillar'],['bridge','drawSpan'],['roof','drawOverhang'],['rock','drawBoulder']]){
 cx.clearRect(0,0,c.width,c.height);
 const o={type,x:100,y:100,w:240,h:220,tx:150,topW:140,drip:type==='roof'?20:0};
 a[fn](o);
 const alpha=(x,y)=>cx.getImageData(x,y,1,1).data[3];
 const left=type==='pillar'?151:101,right=type==='pillar'?288:338;
 for(const x of [left,(left+right)>>1,right])assert(alpha(x,101)>240,type+' top collision is visible');
 for(let x=102;x<338;x+=9)assert(alpha(x,318+o.drip)>240,type+' bottom collision is visible');
 assert.equal(alpha(98,160),0,type+' no false solid wall');
 assert.equal(alpha(342,160),0,type+' no false solid wall');
 assert.equal(alpha(200,98),0,type+' no false solid ceiling');
 assert.equal(alpha(200,323+o.drip),0,type+' no false solid floor');
}
console.log('PASS: all obstacle contact edges are opaque; no misleading exterior solid paint');
if(process.env.GRAPHICS_PREVIEW){
 cx.resetTransform();cx.fillStyle='#adcbc5';cx.fillRect(0,0,c.width,c.height);
 a.drawPillar({x:70,y:110,w:180,h:380,tx:115,topW:95});
 a.drawSpan({x:310,y:160,w:400,h:135});
 a.drawOverhang({x:790,y:140,w:540,h:270,drip:20});
 a.drawBoulder({x:390,y:440,w:190,h:200});
 fs.writeFileSync(process.env.GRAPHICS_PREVIEW,c.toBuffer('image/png'));
 a.startLost(true);a.begin();a.get().heli.x=3650;a.get().heli.y=620;a.set({camera:3100,cameraY:140});a.render();
 fs.writeFileSync(process.env.GRAPHICS_PREVIEW.replace('.png','-scene.png'),c.toBuffer('image/png'));
}
})().catch(e=>{console.error(e);process.exit(1)});
