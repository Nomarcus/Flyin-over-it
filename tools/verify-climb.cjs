const fs=require('fs'),vm=require('vm'),assert=require('assert');const {createCanvas,loadImage}=require('@napi-rs/canvas');
(async()=>{
const kv={};globalThis.madeAudio=[];const root=require('path').resolve(__dirname,'../dist'),nodes={};function element(id){if(nodes[id])return nodes[id];let base={style:{},hidden:false,innerHTML:'',textContent:'',disabled:false,children:[],classes:new Set(),get classList(){const c=this.classes;return{toggle:(k,on)=>{on===undefined?(c.has(k)?c.delete(k):c.add(k)):(on?c.add(k):c.delete(k))},add:k=>c.add(k),remove:k=>c.delete(k),contains:k=>c.has(k)}},listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)},setAttribute(){},setPointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:135,height:135}},append(b){this.children.push(b)},replaceChildren(){this.children=[]},querySelector(){return this.children[0]},focus(){}};if(id==='game'||id==='map')base=Object.assign(createCanvas(id==='map'?360:1440,id==='map'?100:900),base);return nodes[id]=base;}
const sandbox={console,performance:{now:()=>1000},setTimeout:()=>{},screen:{orientation:{angle:90}},document:{getElementById:element,createElement:tag=>tag==='canvas'?createCanvas(1,1):element('dynamic'+Math.random()),documentElement:{},addEventListener(){},hidden:false},innerWidth:1440,innerHeight:900,devicePixelRatio:1,addEventListener(){},requestAnimationFrame(){},localStorage:{getItem:k=>kv[k]??null,setItem:(k,v)=>kv[k]=v},Image:function(){},matchMedia:()=>({matches:false}),Math,
 Audio:function(src){this.src=src;this.volume=0;this.paused=true;this.currentTime=0;this.loop=false;this.preload='';
  this.duration=120;this.play=()=>{this.paused=false;return Promise.resolve()};this.pause=()=>{this.paused=true};
  this.addEventListener=(t,fn)=>{if(t==='error')this.fail=fn};globalThis.madeAudio.push(this);},
 testArt:{jungleTree:await loadImage(root+'/assets/nature/rainforest-tree.png'),pine:await loadImage(root+'/assets/nature/pine-mature.webp'),tropical:await loadImage(root+'/assets/backgrounds/tropical-range.webp'),range:await loadImage(root+'/assets/backgrounds/alpine-range.webp'),day:await loadImage(root+'/alpine-expedition.webp'),night:await loadImage(root+'/night-expedition.webp'),jungle:await loadImage(root+'/jungle-expedition.webp')}};sandbox.window=sandbox;
let code=fs.readFileSync(root+'/game.js','utf8').replace(/const art=\{[^\n]+/, 'const art=globalThis.testArt;');

code=code.replace(/\}\)\(\);\s*$/,`globalThis.api={updateWeapons,updateProjectiles,weapon,getShots:()=>bullets,startClimb,updateClimb,climbBand,climbObstacles,drawClimb,drawClimbWeather,finishClimb,closeCredits,getClimb:()=>climb,CLIMB_FLOOR,CLIMB_TOP,CLIMB_WIDE,CLIMB_PADS,CLIMB_LEVEL,collideObstacles,getObstacles:()=>obstacles,hitHeli,failMission,updateWreck,getWreck:()=>wreck,keys,edges,begin,fixedUpdate,render,updateHUD,ground,Music,AudioState,gearSupport,loadLevel,selectMissions,get:()=>({heli,L,mode,camera,cameraY,vw,vh,save,wind}),set:(o)=>{if('cameraY'in o)cameraY=o.cameraY;if('mode'in o)mode=o.mode}};})();`);
vm.createContext(sandbox);vm.runInContext(code,sandbox);
const a=sandbox.api;
const step=(s)=>{for(let i=0;i<Math.round(s*120);i++)a.fixedUpdate(1/120)};
const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
a.startClimb(true);a.begin();
const h=a.get().heli,C=a.getClimb();
assert.equal(a.get().L.climb,true,'The finale is its own kind of level');
assert(h.landed,'It starts on the ground');
assert.equal(Math.round(h.y+30.8),a.CLIMB_FLOOR,'on the floor of the shaft');

// 1. The shaft is a corridor with a way through it at every height. A gate you cannot fit
// through is not a difficulty, it is a wall.
{
 // The collision hull, not the drawn body: rotor tips reach 94 units forward and the tail boom
 // 111 back, so the craft is 205 across even though it looks like 150.
 const obs=a.getObstacles(),CRAFT=205;
 // A gate is everything within 200 units of the span row: the two spans reaching in from the
 // walls and, on the split gates, the stub hanging into the middle of the opening. Checking the
 // spans alone would pass a gate the stub has made impassable.
 const rows=new Map();
 for(const o of obs)if(o.type==='bridge'&&!o.deck)rows.set(o.y,obs.filter(k=>Math.abs(k.y-o.y)<=200&&!k.deck));
 let tightest=1e9;
 for(const [y,row] of rows){
  // The opening is whatever the two spans leave between them inside the walls.
  const edges=[90,...row.flatMap(o=>[o.x,o.x+o.w]),a.CLIMB_WIDE-90].sort((p,q)=>p-q);
  let widest=0;
  for(let i=0;i<edges.length-1;i++){
   const lo=edges[i],hi=edges[i+1];
   const blocked=row.some(o=>o.x<hi&&o.x+o.w>lo);
   if(!blocked)widest=Math.max(widest,hi-lo);
  }
  assert(widest>=CRAFT,'the gate at '+y+' is only '+widest+' wide; the craft is '+CRAFT);
  tightest=Math.min(tightest,widest);
 }
 // No gate sits across a ledge you are supposed to land on.
 // No gate is built across a ledge — the ledge itself is the only thing at that height.
 for(const p of a.CLIMB_PADS)for(const o of obs){
  if(o.deck)continue;
  assert(Math.abs(o.y-p.y)>120||o.x+o.w<a.CLIMB_WIDE*.5-160||o.x>a.CLIMB_WIDE*.5+160,
   'something is built across the ledge at '+p.y);
 }
 // And each ledge is something you can actually stand on rather than a painted shelf.
 for(let i=1;i<a.CLIMB_PADS.length;i++)
  assert(obs.some(o=>o.deck===i&&Math.abs(o.y-a.CLIMB_PADS[i].y)<2),'the ledge at '+a.CLIMB_PADS[i].y+' is not solid');
 assert(obs.some(o=>o.deck==='station'),'the station deck is not solid');
 const station=obs.find(o=>o.deck==='station');
 assert(station.x-70>=205 && a.CLIMB_WIDE-70-station.x-station.w>=205,'station must be reachable from below on either side');
}

// 2. The weather happens in the right order on the way up, and the dark band really is dark.
{
 const at=f=>a.climbBand(a.CLIMB_FLOOR+(a.CLIMB_TOP-a.CLIMB_FLOOR)*f);
 assert(at(0).gust<.05&&at(0).rain<.05&&at(0).dark<.05,'the bottom of the shaft is calm');
 assert(at(.3).gust>.3,'wind has arrived by a third of the way up');
 assert(at(.5).rain>.5,'rain in the middle');
 assert(at(.6).dark>.9,'the cloud deck is properly dark');
 assert(at(.5).dark<at(.6).dark&&at(.85).dark<.2,'and it opens again above the deck');
 assert(at(1).above>.9&&at(1).rain<.05,'the top is above the weather');
 // Rain before dark, dark before daylight: the order is the story of the climb.
 const peak=k=>{let best=0,at2=0;for(let i=0;i<=100;i++){const v=a.climbBand(a.CLIMB_FLOOR+(a.CLIMB_TOP-a.CLIMB_FLOOR)*(i/100))[k];if(v>best){best=v;at2=i}}return at2};
 assert(peak('rain')<peak('dark'),'rain comes before the dark');
 assert(peak('dark')<peak('above'),'and the dark before the daylight');
}

// 3. Can the weave actually be flown? Rather than build an ever-better autopilot and conclude
// something about the autopilot, measure the aircraft once and then check the level against it.
// Two numbers decide it: how far the craft can move sideways while it climbs from one gate to
// the next, and how far the level ever asks it to.
{
 a.startClimb(true);a.begin();
 const h2=a.get().heli;
 // How long a gate spacing lasts at a steady 90 units a second — about seven seconds.
 const SPACING=640,RATE=90,window=SPACING/RATE;
 // Fly it: from rest, full tilt one way while holding that climb rate, for exactly that long.
 h2.x=a.CLIMB_WIDE*.5;h2.y=-2000;h2.vx=0;h2.vy=0;h2.landed=false;h2.airborne=true;
 const x0=h2.x;
 for(let i=0;i<window*120;i++){
  a.keys.KeyD=true;a.keys.KeyW=(-h2.vy)<RATE;
  a.fixedUpdate(1/120);
 }
 a.keys.KeyD=false;a.keys.KeyW=false;
 const reach=h2.x-x0;
 assert(reach>0,'the craft can move sideways at all while climbing');

 // What the level asks for: the biggest step between one opening centre and the next.
 const obs=a.getObstacles();
 const gates=[...new Set(obs.filter(o=>o.type==='bridge'&&!o.deck).map(o=>o.y))].sort((p,q)=>q-p)
  .map(y=>{
   const row=obs.filter(o=>Math.abs(o.y-y)<=200&&!o.deck);
   const edges=[90,...row.flatMap(o=>[o.x,o.x+o.w]),a.CLIMB_WIDE-90].sort((p,q)=>p-q);
   let best=0,mid=a.CLIMB_WIDE*.5;
   for(let k=0;k<edges.length-1;k++){
    const lo=edges[k],hi=edges[k+1];
    if(row.some(o=>o.x<hi&&o.x+o.w>lo))continue;
    if(hi-lo>best){best=hi-lo;mid=(lo+hi)/2;}
   }
   return{y,mid,width:best};
  });
 let worst=0,worstAt=0;
 for(let k=1;k<gates.length;k++){
  const step=Math.abs(gates[k].mid-gates[k-1].mid);
  // Gates either side of a ledge are further apart, so the craft has proportionally longer.
  const room=reach*Math.abs(gates[k].y-gates[k-1].y)/SPACING;
  if(step/room>worst){worst=step/room;worstAt=gates[k].y;}
 }
 console.log('   (in one gate spacing the craft can move '+Math.round(reach)+' units sideways; '
  +'the widest weave asks for '+Math.round(worst*100)+'% of that)');
 // Half the available reach is the line between a weave and a scramble: the craft has to arrive
 // settled, not still sliding, and the wind up here is worth 18 units a second on its own.
 assert(worst<.5,'the weave at '+worstAt+' asks for '+Math.round(worst*100)+'% of the sideways reach the craft has between gates');

 // And every gate has to clear the hull with room for the wind on top.
 const tight=Math.min(...gates.map(g=>g.width));
 assert(tight>=260,'the tightest gate is '+Math.round(tight)+' wide against a 205-wide hull; that leaves nothing for the wind');
}

// 3b. The loop end to end: fly the first stretch for real, gates and all, and come out of it in
// one piece. This is the part a measurement cannot stand in for.
{
 a.startClimb(true);a.begin();
 const h3=a.get().heli,obs=a.getObstacles();
 const gates=[...new Set(obs.filter(o=>o.type==='bridge'&&!o.deck).map(o=>o.y))].sort((p,q)=>q-p)
  .map(y=>{
   const row=obs.filter(o=>Math.abs(o.y-y)<=200&&!o.deck);
   const edges=[90,...row.flatMap(o=>[o.x,o.x+o.w]),a.CLIMB_WIDE-90].sort((p,q)=>p-q);
   let best=0,mid=a.CLIMB_WIDE*.5;
   for(let k=0;k<edges.length-1;k++){
    const lo=edges[k],hi=edges[k+1];
    if(row.some(o=>o.x<hi&&o.x+o.w>lo))continue;
    if(hi-lo>best){best=hi-lo;mid=(lo+hi)/2;}
   }
   return{y,mid};
  });
 const target=gates[3].y-200;                       // through the first four gates
 let next=0,t=0;
 for(let i=0;i<120*120&&h3.y>target;i++){
  while(next<gates.length-1&&gates[next].y>h3.y-40)next++;
  // The hull is not centred on the aircraft: the tail reaches 111 back and the rotor 94 forward,
  // so sitting the drawn body on the middle of a gap puts the tail into the span.
  const want=gates[next].mid+8;
  const cmd=(want-h3.x)*.05-h3.vx*.62;
  a.keys.KeyD=cmd>.1;a.keys.KeyA=cmd<-.1;
  a.keys.KeyW=(-h3.vy)<90;
  a.fixedUpdate(1/120);t+=1/120;
  if(a.get().mode!=='playing')break;
 }
 a.keys.KeyW=a.keys.KeyA=a.keys.KeyD=false;
 assert.equal(a.get().mode,'playing','flying the first four gates does not end the run');
 assert(h3.y<=target,'and gets through them, reached '+Math.round((a.CLIMB_FLOOR-h3.y)*.45)+' m');
 assert(h3.hp>70,'without tearing the aircraft apart, hull '+h3.hp.toFixed(0)+'%');
 // The whole shaft at that pace, plus the weaving, is the three minutes the brief asked for.
 const whole=(a.CLIMB_FLOOR-a.CLIMB_TOP)/(a.CLIMB_FLOOR-h3.y)*t;
 console.log('   (four gates flown in '+t.toFixed(0)+'s, so the shaft is about '+Math.round(whole)+'s at that pace)');
 assert(whole>150&&whole<330,'the shaft works out at '+Math.round(whole)+'s, and the brief was about three minutes');
}

// 4. The ledges hold progress, and a crash goes back to the last one rather than the ground.
{
 a.startClimb(true);a.begin();
 const h3=a.get().heli,c=a.getClimb();
 const pad=a.CLIMB_PADS[1];
 h3.x=a.CLIMB_WIDE*.5;h3.y=pad.y-30.8;h3.vx=0;h3.vy=0;h3.landed=true;h3.fuel=40;
 a.updateClimb(1/60);
 assert(c.landed.has(1),'landing on the first ledge holds it');
 assert.equal(c.cp,1,'and it becomes the checkpoint');
 for(let i=0;i<120;i++){h3.landed=true;h3.y=pad.y-30.8;a.updateClimb(1/60);}
 assert(h3.fuel>60,'a ledge refuels you, got '+h3.fuel.toFixed(0)+'%');
 // Now fall out of the sky.
 h3.y=pad.y-3000;h3.hp=1;a.set({mode:'playing'});
 a.failMission('test');
 for(let i=0;i<120*8&&a.get().mode==='wreck';i++)a.fixedUpdate(1/120);
 assert.equal(a.get().mode,'failed','a crash in the shaft ends in the shaft, not in a mission debrief');
 assert.equal(c.cp,1,'and the checkpoint survives it');
}

// 5. The ending. Reaching the deck rolls the credits, and the credits say what they should.
{
 a.startClimb(true);a.begin();
 const h4=a.get().heli,c=a.getClimb();
 c.total=214;c.crashes=2;
 h4.x=a.CLIMB_WIDE*.5;h4.y=a.CLIMB_TOP-30.8;h4.vx=0;h4.vy=0;h4.landed=true;
 h4.x=110;
 for(let i=0;i<80;i++)a.updateClimb(1/60);
 assert.equal(a.get().mode,'playing','flying beside the station must not finish the mission');
 h4.x=a.CLIMB_WIDE*.5;
 let atFinish=0;
 for(let i=0;i<200&&a.get().mode==='playing';i++){h4.landed=true;h4.y=a.CLIMB_TOP-30.8;h4.vx=0;a.updateClimb(1/60);atFinish=c.total;}
 assert.equal(a.get().mode,'credits','landing on the station ends the game');
 assert(c.arrived,'and it is marked as arrived');
 const roll=nodes.creditsRoll.innerHTML;
 assert(!nodes.credits.hidden,'the credits are on screen');
 assert(/YOU MADE IT/.test(roll),'they say you finished it');
 assert(/10 440 m/.test(roll),'they carry the height');
 // The time on the card is the time actually flown, not a number typed into the page.
 const shown=(roll.match(/(\d+) min (\d+) s/)||[]).slice(1).map(Number);
 assert(shown.length===2,'the credits carry a flight time');
 assert(Math.abs(shown[0]*60+shown[1]-Math.round(atFinish))<=1,
  'and it matches the run: card says '+shown.join('m ')+'s against '+Math.round(atFinish)+'s flown');
 assert(/Thank you to the AI/.test(roll),'and they thank the machines that helped build it');
 assert(/Claude/.test(roll)&&/ChatGPT/.test(roll)&&/Suno/.test(roll),'by name');
 assert(!/[åäöÅÄÖ]/.test(roll),'and every word of it is in English');
 // The chiptune plays instead of the record, and the record comes back afterwards.
 a.closeCredits();
 assert(nodes.credits.hidden,'closing puts them away');
 assert.equal(a.get().mode,'menu','and lands back on the main menu');
 assert.equal(a.getClimb(),null,'with the climb packed up behind it');
}

// Combat uses the real shared weapon and projectile pipeline.
{
 a.startClimb(true);a.begin();
 assert(a.get().L.combat,'finale enables existing combat controls');
 assert(a.CLIMB_WIDE>=1400&&a.CLIMB_FLOOR-a.CLIMB_TOP>23000);
 assert(a.CLIMB_PADS.length===6,'five service checkpoints plus launch');
 const c=a.getClimb(),h=a.get().heli,d=c.drones[0];
 assert(c.drones.length>=7,'patrol encounters throughout the climb');
 h.x=d.x-160;h.y=d.y;h.angle=0;h.dir=1;h.turn=0;h.yaw=0;
 const muzzle=a.weapon();d.y=muzzle.y;
 a.keys.Space=true;a.updateWeapons(.1);a.keys.Space=false;
 for(let i=0;i<40;i++)a.updateProjectiles(1/120);
 assert(d.hp<d.max,'cannon damages a climb robot');
 d.hp=42;h.rockets=8;a.edges.KeyR=true;a.updateWeapons(.8);delete a.edges.KeyR;
 for(let i=0;i<120;i++)a.updateProjectiles(1/120);
 assert.equal(d.hp,0,'rocket destroys a climb robot');
 const enemy=c.drones[1];h.x=enemy.x-150;h.y=enemy.homeY;enemy.cd=0;
 const before=a.getShots().filter(b=>b.enemy).length;a.updateClimb(.01);
 assert(a.getShots().filter(b=>b.enemy).length>before,'nearby patrol fires');
 console.log('PASS: longer/wider finale, five checkpoints, cannon and rocket hits, robot retaliation');
}
// 6. It renders, in the dark and in the light, without throwing.
{
 a.startClimb(true);a.begin();
 const h5=a.get().heli,c=a.getClimb();
 for(const f of [0,.3,.5,.6,.85,1]){
  h5.y=a.CLIMB_FLOOR+(a.CLIMB_TOP-a.CLIMB_FLOOR)*f;h5.x=a.CLIMB_WIDE*.5;
  c.mood=a.climbBand(h5.y);a.set({cameraY:h5.y-a.get().vh*.5});
  for(const light of [false,true]){c.light=light;a.updateHUD();a.render();}
 if(f===1)fs.writeFileSync('/tmp/climb-station.png',nodes.game.toBuffer('image/png'));
 }
 assert(/CLOUDBASE STATION/.test(nodes.compactGoal.textContent),'and the rail says where you are going, got '+nodes.compactGoal.textContent);
 assert(/TO GO/.test(nodes.compactGoal.textContent),'and how much is left');
}
console.log('PASS: the shaft has a way through every gate, the weather arrives in order, it can be climbed on fuel, ledges hold, and the ending rolls');
})().catch(e=>{console.error(e);process.exit(1)});
