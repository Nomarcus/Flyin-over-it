// A small offline Web Audio implementation, enough to actually render what the game's sound
// engine schedules. The point is to measure the sounds rather than assert that a function was
// called: a test that only counts createOscillator() calls passes just as happily when every
// sound in the game has become the same beep.
'use strict';
const RATE=22050;

class Param{
 constructor(v){this.def=v;this.events=[];}
 get value(){return this._v??this.def}
 set value(v){this._v=v;this.def=v}
 setValueAtTime(v,t){this.events.push({k:'set',v,t});return this}
 linearRampToValueAtTime(v,t){this.events.push({k:'lin',v,t});return this}
 exponentialRampToValueAtTime(v,t){this.events.push({k:'exp',v,t});return this}
 setTargetAtTime(v,t,tc){this.events.push({k:'target',v,t,tc});return this}
 cancelScheduledValues(){this.events=[];return this}
 at(t){
  const e=this.events;
  if(!e.length)return this.value;
  const sorted=e.slice().sort((a,b)=>a.t-b.t);
  let val=this.def,prevT=-Infinity,prevV=this.def;
  for(let i=0;i<sorted.length;i++){
   const ev=sorted[i];
   if(t<ev.t){
    if(ev.k==='lin'||ev.k==='exp'){
     const span=ev.t-prevT;
     if(!isFinite(span)||span<=0)return prevV;
     const u=(t-prevT)/span;
     if(u<0)return prevV;
     return ev.k==='lin'?prevV+(ev.v-prevV)*u
      :prevV<=0||ev.v<=0?prevV+(ev.v-prevV)*u:prevV*Math.pow(ev.v/prevV,u);
    }
    return prevV;
   }
   if(ev.k==='target'){
    const next=sorted[i+1];
    if(!next||t<next.t)return ev.v+(prevV-ev.v)*Math.exp(-(t-ev.t)/Math.max(1e-6,ev.tc));
   }
   prevV=ev.v;prevT=ev.t;val=ev.v;
  }
  return val;
 }
}

class Node{
 constructor(ctx){this.ctx=ctx;this.outs=[];ctx.nodes.push(this);}
 connect(n){this.outs.push(n);return n}
 disconnect(){this.outs=[]}
}
class Osc extends Node{
 constructor(ctx){super(ctx);this.type='sine';this.frequency=new Param(440);this.detune=new Param(0);this._on=null;this._off=null;}
 start(t=this.ctx.currentTime){this._on=t}
 stop(t){this._off=t}
 render(N){
  const out=new Float32Array(N);if(this._on===null)return out;
  let phase=0;
  for(let i=0;i<N;i++){
   const t=i/RATE;
   if(t<this._on||(this._off!==null&&t>this._off))continue;
   const f=Math.max(1,this.frequency.at(t));
   phase+=f/RATE;const x=phase%1;
   out[i]=this.type==='sine'?Math.sin(x*2*Math.PI)
    :this.type==='square'?(x<.5?1:-1)
    :this.type==='sawtooth'?2*x-1
    :4*Math.abs(x-.5)-1;                       // triangle
  }
  return out;
 }
}
class Src extends Node{
 constructor(ctx){super(ctx);this.buffer=null;this.playbackRate=new Param(1);this.loop=false;this._on=null;this._off=null;}
 start(t=this.ctx.currentTime){this._on=t}
 stop(t){this._off=t}
 render(N){
  const out=new Float32Array(N);if(this._on===null||!this.buffer)return out;
  const d=this.buffer.data,rate=this.playbackRate.value;
  for(let i=0;i<N;i++){
   const t=i/RATE;
   if(t<this._on||(this._off!==null&&t>this._off))continue;
   let k=Math.floor((t-this._on)*RATE*rate*(this.buffer.rate/RATE));
   if(k>=d.length){if(!this.loop)continue;k%=d.length;}
   out[i]=d[k];
  }
  return out;
 }
}
class Gain extends Node{
 constructor(ctx){super(ctx);this.gain=new Param(1);}
 process(inp,N){const o=new Float32Array(N);for(let i=0;i<N;i++)o[i]=inp[i]*this.gain.at(i/RATE);return o}
}
class Biquad extends Node{
 constructor(ctx){super(ctx);this.type='lowpass';this.frequency=new Param(350);this.Q=new Param(1);this.gainP=new Param(0);}
 process(inp,N){
  const o=new Float32Array(N);
  let x1=0,x2=0,y1=0,y2=0,lastF=-1,b0=1,b1=0,b2=0,a1=0,a2=0;
  for(let i=0;i<N;i++){
   const t=i/RATE,f=Math.min(RATE/2.2,Math.max(10,this.frequency.at(t))),q=Math.max(.05,this.Q.value);
   if(Math.abs(f-lastF)>1){
    lastF=f;
    const w=2*Math.PI*f/RATE,cs=Math.cos(w),sn=Math.sin(w),al=sn/(2*q);
    let B0,B1,B2;
    if(this.type==='lowpass'){B0=(1-cs)/2;B1=1-cs;B2=(1-cs)/2;}
    else if(this.type==='highpass'){B0=(1+cs)/2;B1=-(1+cs);B2=(1+cs)/2;}
    else{B0=al;B1=0;B2=-al;}                    // bandpass
    const A0=1+al;
    b0=B0/A0;b1=B1/A0;b2=B2/A0;a1=(-2*cs)/A0;a2=(1-al)/A0;
   }
   const x=inp[i],y=b0*x+b1*x1+b2*x2-a1*y1-a2*y2;
   x2=x1;x1=x;y2=y1;y1=y;o[i]=y;
  }
  return o;
 }
}
class Panner extends Node{
 constructor(ctx){super(ctx);this.pan=new Param(0);}
 process(inp,N){return inp}
}
class Comp extends Node{
 constructor(ctx){super(ctx);for(const k of ['threshold','knee','ratio','attack','release'])this[k]=new Param(0);}
 process(inp){return inp}
}

class OfflineContext{
 constructor(){
  this.sampleRate=RATE;this.currentTime=0;this.nodes=[];
  this.destination=new Gain(this);this.destination.gain.value=1;
 }
 createGain(){return new Gain(this)}
 createOscillator(){return new Osc(this)}
 createBufferSource(){return new Src(this)}
 createBiquadFilter(){return new Biquad(this)}
 createStereoPanner(){return new Panner(this)}
 createDynamicsCompressor(){return new Comp(this)}
 createBuffer(ch,len,rate){const d=new Float32Array(len);return{data:d,rate,duration:len/rate,getChannelData:()=>d}}
 resume(){return Promise.resolve()}
 // Render everything reaching the destination, in stereo, for `seconds` from t=0.
 render(seconds){
  const N=Math.round(seconds*RATE),L=new Float32Array(N),R=new Float32Array(N);
  const seen=new Set();
  // A node may also be connected to an AudioParam (the rotor's blade-slap modulation does
  // exactly that). Those carry no audio to the destination, so they end the walk.
  const walk=(node,sig,pan)=>{
   if(!node||!node.outs)return;
   if(node===this.destination){
    const a=(Math.max(-1,Math.min(1,pan))+1)*Math.PI/4,gl=Math.cos(a),gr=Math.sin(a);
    for(let i=0;i<N;i++){L[i]+=sig[i]*gl;R[i]+=sig[i]*gr;}
    return;
   }
   let out=sig,p=pan;
   if(node instanceof Panner)p=node.pan.value;
   if(node.process)out=node.process(sig,N);
   for(const n of node.outs)walk(n,out,p);
  };
  for(const n of this.nodes)if((n instanceof Osc||n instanceof Src)&&!seen.has(n)){
   seen.add(n);const sig=n.render(N);
   for(const t of n.outs)walk(t,sig,0);
  }
  // Fire onended for everything that finished inside the window, the way a browser would. The
  // engine releases its voice count there, so skipping it would hide a leak instead of finding
  // one.
  for(const n of this.nodes)if((n instanceof Osc||n instanceof Src)&&n._on!==null&&n._off!==null&&n._off<=seconds&&!n._done){
   n._done=true;n.onended&&n.onended();
  }
  return{L,R,N};
 }
}
module.exports={OfflineContext,RATE};
