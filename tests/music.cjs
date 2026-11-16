/* Run with node tests/music.cjs. Exercises the real menu audio controls. */
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'menu.js'),'utf8');
const storage=new Map();
function boot(){
 const element=()=>({textContent:'',value:0,checked:true,hidden:false,dataset:{},attrs:{},events:{},classList:{remove(){}},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){this.events[k]=fn},focus(){},querySelector(){return null}});
 const buttons=[element(),element()];for(const b of buttons){b.status=element();b.querySelector=()=>b.status;}
 const sliders=['sfx','music','sfx','music'].map(key=>{const e=element();e.dataset.setting=key;return e;});
 const outputs=['sfx','music','sfx','music'].map(key=>{const e=element();e.dataset.value=key;return e;});
 const elements=new Map();const get=s=>{if(!elements.has(s))elements.set(s,element());return elements.get(s)};
 const document={hidden:false,body:{appendChild(){}},querySelector:get,addEventListener(){},querySelectorAll(s){
  if(s==='[data-music-toggle]')return buttons;
  if(s==='[data-setting]')return sliders;
  const setting=s.match(/^\[data-setting="(.*?)"\]$/);if(setting)return sliders.filter(e=>e.dataset.setting===setting[1]);
  const output=s.match(/^\[data-value="(.*?)"\]$/);if(output)return outputs.filter(e=>e.dataset.value===output[1]);
  return [];
 }};
 let sfx,mode;
 const c={document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},Audio:class{constructor(){this.paused=true;this.currentTime=0;}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}},KICKBACK:{setSfxVolume(v){sfx=v},setAssist(){},setControlMode(v){mode=v}}};c.window=c;vm.createContext(c);vm.runInContext(source,c);
 return {buttons,sliders,shell:c.KickbackShell,sfx:()=>sfx,mode:()=>mode,control:get('#control-mode')};
}
const click=(app,i=0)=>app.buttons[i].events.click();
const synced=(app,muted)=>{for(const b of app.buttons){assert.equal(b.attrs['aria-pressed'],String(muted));assert.equal(b.attrs['aria-label'],muted?'Unmute music':'Mute music');assert.equal(b.status.textContent,muted?'MUSIC OFF':'MUSIC ON');}};
let app=boot();synced(app,false);click(app);synced(app,true);assert.equal(app.shell.snapshot().musicVolume,0);assert.equal(app.sfx(),.7,'music mute preserves sound effects');
app=boot();synced(app,true);assert.equal(app.shell.snapshot().musicVolume,0,'mute survives reload');
app.shell.sync('paused');click(app,1);synced(app,false);assert.equal(app.shell.snapshot().musicVolume,.3);assert(app.shell.snapshot().musicPlaying,'pause toggle can start music');
const slider=app.sliders[1];slider.value=65;slider.events.input();assert.equal(app.shell.snapshot().musicVolume,.65);
click(app);click(app,1);assert.equal(app.shell.snapshot().musicVolume,.65,'unmute restores chosen volume');
slider.value=0;slider.events.input();synced(app,true);click(app,1);synced(app,false);assert.equal(app.shell.snapshot().musicVolume,.3,'unmute recovers from a zero slider');
click(app);slider.value=45;slider.events.input();synced(app,false);assert.equal(app.shell.snapshot().musicVolume,.45,'adjusting slider unmutes both buttons');
app.shell.sync('play');assert(!app.shell.snapshot().musicPlaying,'menu music stays off during gameplay');app.shell.sync('paused');assert(app.shell.snapshot().musicPlaying);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.equal((html.match(/data-music-toggle/g)||[]).length,2);
console.log('PASS: synchronized home/pause music toggles, saved mute, restored volume, zero-volume recovery, slider sync, independent SFX and gameplay/pause audio.');

app.control.value='mouse';app.control.events.change();assert.equal(app.mode(),'mouse');app=boot();assert.equal(app.mode(),'mouse','control mode survives reload');
