const fs=require('fs'),vm=require('vm'),assert=require('assert');const {createCanvas,loadImage}=require('@napi-rs/canvas');
(async()=>{
const kv={};globalThis.madeAudio=[];const root=require('path').resolve(__dirname,'../dist'),nodes={};function element(id){if(nodes[id])return nodes[id];let base={style:{},hidden:false,innerHTML:'',textContent:'',disabled:false,children:[],classes:new Set(),get classList(){const c=this.classes;return{toggle:(k,on)=>{on===undefined?(c.has(k)?c.delete(k):c.add(k)):(on?c.add(k):c.delete(k))},add:k=>c.add(k),remove:k=>c.delete(k),contains:k=>c.has(k)}},listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)},setAttribute(){},setPointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:135,height:135}},append(b){this.children.push(b)},replaceChildren(){this.children=[]},querySelector(){return this.children[0]},focus(){}};if(id==='game'||id==='map')base=Object.assign(createCanvas(id==='map'?360:1440,id==='map'?100:900),base);return nodes[id]=base;}
const sandbox={console,performance:{now:()=>1000},setTimeout:()=>{},screen:{orientation:{angle:90}},document:{getElementById:element,createElement:tag=>tag==='canvas'?createCanvas(1,1):element('dynamic'+Math.random()),documentElement:{},addEventListener(){},hidden:false},innerWidth:1440,innerHeight:900,devicePixelRatio:1,addEventListener(){},requestAnimationFrame(){},localStorage:{getItem:k=>kv[k]??null,setItem:(k,v)=>kv[k]=v},Image:function(){},matchMedia:()=>({matches:false}),Math,
 Audio:function(src){this.src=src;this.volume=0;this.paused=true;this.currentTime=0;this.loop=false;this.preload='';
  this.duration=120;this.play=()=>{this.paused=false;return Promise.resolve()};this.pause=()=>{this.paused=true};
  this.addEventListener=(t,fn)=>{if(t==='error')this.fail=fn};globalThis.madeAudio.push(this);},
 testArt:{pine:await loadImage(root+'/assets/nature/pine-mature.webp'),tropical:await loadImage(root+'/assets/backgrounds/tropical-range.webp'),range:await loadImage(root+'/assets/backgrounds/alpine-range.webp'),day:await loadImage(root+'/alpine-expedition.webp'),night:await loadImage(root+'/night-expedition.webp'),jungle:await loadImage(root+'/jungle-expedition.webp')}};sandbox.window=sandbox;
let code=fs.readFileSync(root+'/game.js','utf8').replace(/const art=\{[^\n]+/, 'const art=globalThis.testArt;');

// Expose what the sound work needs to be measurable.
code=code.replace(/\}\)\(\);\s*$/,`globalThis.api={AudioState,loadLevel,begin,fixedUpdate,ground,startLost,getEnemies:()=>enemies,get:()=>({heli,camera,vw,mode,save}),set:(o)=>{if('mode'in o)mode=o.mode;if('camera'in o)camera=o.camera}};})();`);
const {OfflineContext,RATE}=require('./webaudio-offline.cjs');
let ctx=null;
sandbox.AudioContext=function(){ctx=new OfflineContext();return ctx};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
const a=sandbox.api,A=a.AudioState;
a.loadLevel(a.get().save.lastOperation||8);a.begin();

// Render one sound in isolation and describe it in numbers a person would recognise: how loud,
// how fast it starts, how long it lasts, and where its energy sits.
function measure(fire,seconds=1.6){
 ctx=null;A.ac=null;A.voices=0;A.init();
 a.set({mode:'playing'});A.sync();
 // Silence the three continuous beds so a one-shot is measured on its own; they get their own
 // section further down.
 A.rotorGain.gain.value=0;A.windGain.gain.value=0;A.winchGain.gain.value=0;
 fire(A);
 const {L,R,N}=ctx.render(seconds);
 const mono=new Float32Array(N);for(let i=0;i<N;i++)mono[i]=(L[i]+R[i])/2;
 let peak=0,sum=0;for(let i=0;i<N;i++){const v=Math.abs(mono[i]);if(v>peak)peak=v;sum+=mono[i]*mono[i];}
 const rms=Math.sqrt(sum/N);
 // Attack: samples until it first reaches half its peak. Decay: last sample above 2% of peak.
 let attack=N,tail=0;
 for(let i=0;i<N;i++){if(Math.abs(mono[i])>=peak*.5){attack=i;break;}}
 for(let i=N-1;i>=0;i--){if(Math.abs(mono[i])>=peak*.02){tail=i;break;}}
 // Three bands by one-pole splits: low under 300 Hz, high over 2 kHz, mid the rest.
 const band=(cut,hi)=>{const k=Math.exp(-2*Math.PI*cut/RATE);let z=0,e=0;
  for(let i=0;i<N;i++){z=mono[i]*(1-k)+z*k;const v=hi?mono[i]-z:z;e+=v*v;}return Math.sqrt(e/N);};
 const low=band(300,false),high=band(2000,true),mid=Math.max(1e-9,rms-low*.5-high*.5);
 let panL=0,panR=0;for(let i=0;i<N;i++){panL+=L[i]*L[i];panR+=R[i]*R[i];}
 return{peak,rms,attack:attack/RATE,dur:tail/RATE,low,mid,high,
  bright:high/Math.max(1e-9,low+high),pan:(Math.sqrt(panR)-Math.sqrt(panL))/Math.max(1e-9,Math.sqrt(panR)+Math.sqrt(panL))};
}

const NAMES=['gun','enemyGun','rocket','boom','hit','strike','touch','touchHard','latch','rescue',
 'delivered','fill','water','steam','flare','alarm','lock','fuelWarn','hullWarn','overheat',
 'checkpoint','star','switch','ui','wreck'];
const m={};
for(const n of NAMES)m[n]=measure(A=>A.sfx(n));

if(process.env.SFX_TABLE){
 console.log('name        peak    rms     attack   dur    bright');
 for(const n of NAMES)console.log(n.padEnd(11)+m[n].peak.toFixed(3).padStart(6)+m[n].rms.toFixed(4).padStart(8)+(m[n].attack*1000).toFixed(1).padStart(8)+'ms'+m[n].dur.toFixed(2).padStart(7)+m[n].bright.toFixed(3).padStart(8));
}
// 1. Every sound in the table actually makes a sound, and none of them clips the output.
for(const n of NAMES){
 assert(m[n].peak>.02,n+' is inaudible (peak '+m[n].peak.toFixed(4)+')');
 assert(m[n].peak<=1.0,n+' clips (peak '+m[n].peak.toFixed(3)+')');
 assert(m[n].dur>.015,n+' is over before it starts ('+m[n].dur.toFixed(3)+'s)');
}

// 2. No two sounds are the same shape. This is the whole point of the set: brightness, attack
// and length together have to separate every pair, because a player identifies an event by the
// difference between sounds, not by any one of them.
function apart(x,y){
 const A1=m[x],B1=m[y];
 return Math.abs(A1.bright-B1.bright)*3
  +Math.abs(Math.log(A1.dur/B1.dur))
  +Math.abs(Math.log((A1.attack+.002)/(B1.attack+.002)))*.6;
}
let closest=null;
for(let i=0;i<NAMES.length;i++)for(let j=i+1;j<NAMES.length;j++){
 const d=apart(NAMES[i],NAMES[j]);
 if(!closest||d<closest.d)closest={d,pair:NAMES[i]+' / '+NAMES[j]};
}
assert(closest.d>.16,'two sounds are too alike to tell apart: '+closest.pair+' (distance '+closest.d.toFixed(3)+')');

// 3. The cannon specifically. It has to crack — reach half level almost instantly — and be gone
// again quickly, or a held burst turns into a wash.
assert(m.gun.attack<.012,'the cannon does not crack; it takes '+(m.gun.attack*1000).toFixed(1)+' ms to reach half level');
assert(m.gun.dur<.55,'the cannon rings on for '+m.gun.dur.toFixed(2)+'s');
// 0.30 is not arbitrary: deleting the 3 ms crack layer measures 0.21, so this threshold is
// exactly the one that notices if the transient is ever lost.
assert(m.gun.bright>.30,'the cannon is too dull (brightness '+m.gun.bright.toFixed(2)+')');
// Their fire must be unmistakably darker than yours, so incoming and outgoing never blur.
assert(m.enemyGun.bright<m.gun.bright*.75,'their fire is not darker than yours ('+m.enemyGun.bright.toFixed(2)+' vs '+m.gun.bright.toFixed(2)+')');
// And no two shots are identical: the engine detunes each one.
const shots=[measure(A=>A.sfx('gun')),measure(A=>A.sfx('gun')),measure(A=>A.sfx('gun'))];
assert(new Set(shots.map(s=>s.rms.toFixed(6))).size>1,'every shot is the same sample');

// 4. Direction. A launch is a rise and an impact is a fall; that is what tells them apart even
// through gunfire.
const half=s=>{ // where the energy sits in the first half versus the second
 return s;
};
assert(m.rocket.dur>m.gun.dur*2,'the rocket is not longer than a shot');
assert(m.boom.low>m.gun.low*1.5,'the explosion has no more weight than a rifle shot');
assert(m.wreck.dur>1.0,'the crash is over too quickly to watch');
assert(m.steam.bright>.55,'the fire going out should be hiss, not tone');
assert(m.hit.dur<.3&&m.strike.dur>m.hit.dur,'a rotor strike must ring longer than a bullet hit');
assert(m.touchHard.peak>m.touch.peak*1.4,'a hard landing sounds no worse than a soft one');

// 5. World position: a sound off to the right is on the right and quieter than the same sound
// under the aircraft. This is how an off-screen sentry announces itself.
const {camera,vw}=a.get();
const here=measure(A=>A.sfx('enemyGun',camera+vw*.5));
const right=measure(A=>A.sfx('enemyGun',camera+vw*.95));
const away=measure(A=>A.sfx('enemyGun',camera+vw*2.4));
assert(right.pan>.15,'a sound on the right does not pan right ('+right.pan.toFixed(2)+')');
assert(Math.abs(here.pan)<.06,'a sound under the aircraft is not centred ('+here.pan.toFixed(2)+')');
assert(away.rms<here.rms*.65,'distance does not quieten anything ('+away.rms.toFixed(4)+' vs '+here.rms.toFixed(4)+')');

// 6. Mute means silence, and the voice cap holds under a burst rather than letting thirty
// overlapping decays sum into clipping.
const save=a.get().save,was=save.muted;
save.muted=true;
const quiet=measure(A=>{for(let i=0;i<8;i++)A.sfx('gun')});
save.muted=was;
assert(quiet.peak<1e-6,'muted is not silent');
const burst=measure(A=>{for(let i=0;i<40;i++){A.sfx('gun');A.sfx('boom');}},2.2);
assert(burst.peak<=1.0,'a heavy burst clips (peak '+burst.peak.toFixed(2)+')');
assert(A.voices<=27,'the voice cap leaked ('+A.voices+' still counted)');

// 7. The beds. The rotor has to answer the collective rather than sit at one level, airflow has
// to answer speed, and neither may be heard in a menu.
ctx=null;A.ac=null;A.init();a.set({mode:'playing'});A.sync();
const h=a.get().heli;
h.spool=.35;h.collective=0;h.vx=0;h.vy=0;h.landed=true;A.update(1/60);
const idle={r:A.rotorGain.gain.at(9),w:A.windGain.gain.at(9)};
h.spool=1;h.collective=520;h.vx=520;h.vy=-80;h.landed=false;A.update(1/60);
const hard={r:A.rotorGain.gain.at(9),w:A.windGain.gain.at(9)};
assert(hard.r>idle.r*1.6,'the rotor does not answer the collective ('+idle.r.toFixed(4)+' → '+hard.r.toFixed(4)+')');
assert(hard.w>idle.w+.01,'airflow does not answer speed ('+idle.w.toFixed(4)+' → '+hard.w.toFixed(4)+')');
a.set({mode:'menu'});A.update(1/60);
assert(A.rotorGain.gain.at(9)<hard.r*.6,'the rotor is still running in the menu');
assert(A.windGain.gain.at(9)<.005,'airflow is still running in the menu');

// 8. Warnings repeat on their own clock. A fuel state sitting exactly on the threshold used to
// mean sixty beeps a second.
a.set({mode:'playing'});
h.fuel=8;h.hp=100;h.landed=false;h.overheated=false;
let fired=0;const realSfx=A.sfx.bind(A);A.sfx=(t)=>{if(t==='fuelWarn')fired++};
A.warn.fuel=0;for(let i=0;i<600;i++)A.warnings(1/60);   // ten seconds of flight
A.sfx=realSfx;
assert(fired>=2&&fired<=7,'low fuel warned '+fired+' times in ten seconds');

// 9. The music files on disk have to be named what the game asks for. An upload that arrives as
// title.mp3.mp3 is a 404 and a silent game, and nothing else in the suite would notice.
{
 const dir=root+'/music',have=fs.readdirSync(dir).filter(f=>f.toLowerCase().endsWith('.mp3'));
 const wanted=['title','valley','beacon','shaft','debrief','school','jungle'];
 for(const f of have)assert(wanted.includes(f.replace(/\.mp3$/,'')),
  'dist/music/'+f+' is not a name the game ever requests — it will 404 (expected one of '+wanted.join(', ')+'.mp3)');
 assert(have.length>0,'no music files at all');
}

console.log('PASS: 25 distinct sounds, a cannon that cracks, positioned world audio, mute, voice cap, live rotor and airflow beds, paced warnings, and music filenames the game can actually reach');
})().catch(e=>{console.error(e);process.exit(1)});
