/* Run with node tests/physics.cjs. Executes actual game logic in a minimal DOM,
   with test hooks injected only into this VM (not shipped in the running game). */
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
process.chdir(path.join(__dirname,'..'));
const elements=new Map();const el=()=>({textContent:'',hidden:false,disabled:false,style:{},innerHTML:'',checked:true,classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelectorAll(){return[]},focus(){},getContext(){return{}},cloneNode(){return{play(){return Promise.resolve()}}}});
const document={querySelector(s){if(!elements.has(s))elements.set(s,el());return elements.get(s)},querySelectorAll(){return[]},addEventListener(){}};
const c={console,document,Math,Number,Promise,Image:class{set src(v){this.onload()}},Audio:class{cloneNode(){return{play(){return Promise.resolve()}}}},requestAnimationFrame(){}};c.window=c;const events={};c.addEventListener=(n,f)=>{(events[n]??=[]).push(f)};vm.createContext(c);
vm.runInContext(fs.readFileSync('levels.js','utf8'),c);
const source=fs.readFileSync('game.js','utf8').replace('// Read-only snapshot',`window.TEST={hurt,damageEnemy,updateEnemies,loadLevel,tick,fire,collide,collideBodies,moveBody,updateBullets,explode,resetPlayer,setAim:a=>aim=a,setGun:g=>gun=g,setCooldown:n=>cooldown=n,player:()=>player,objects:()=>objects,blocks:()=>blocks,switches:()=>switches,shootAt:(x,y,vx,vy,bounce=0)=>bullets.push({x,y,vx,vy,bounce,life:2,color:'#fff'})};\n// Read-only snapshot`);
vm.runInContext(source,c);const t=c.TEST,snap=()=>c.RECOIL.snapshot();


function key(type,code){for(const f of events[type]||[])f({code,repeat:false,preventDefault(){}})}
function step(){for(let i=0;i<4;i++)t.tick(1/120)}
for(const [code,axis,sign,bulletAxis,bulletSign] of [['KeyD','vx',1,'vx',-1],['ArrowRight','vx',1,'vx',-1],['KeyA','vx',-1,'vx',1],['ArrowLeft','vx',-1,'vx',1],['KeyW','vy',-1,'vy',1],['ArrowUp','vy',-1,'vy',1],['KeyS','vy',1,'vy',-1],['ArrowDown','vy',1,'vy',-1]]){
 t.loadLevel(0);key('keydown',code);step();let s=snap();assert(s.player[axis]*sign>0,code+' recoil direction');assert(s.bullets.some(b=>b[bulletAxis]*bulletSign>0),code+' bullet opposite');const n=s.counters.shots;key('keyup',code);for(let i=0;i<80;i++)t.tick(1/120);assert.equal(snap().counters.shots,n,'release stops auto-fire');
}
t.loadLevel(0);key('keydown','KeyW');key('keydown','KeyD');step();let b=snap().bullets[0];assert(b.vx<0&&b.vy>0);assert(Math.abs(Math.abs(b.vx)-Math.abs(b.vy))<.01,'normalized diagonal');
t.loadLevel(0);key('keydown','KeyA');key('keydown','KeyD');step();assert.equal(snap().bullets.length,0,'opposing inputs cancel');
t.loadLevel(0);key('keydown','KeyD');step();key('keydown','Escape');assert.equal(snap().state,'paused');key('keydown','Escape');let n=snap().counters.shots;for(let i=0;i<80;i++)t.tick(1/120);assert.equal(snap().counters.shots,n,'pause clears keys');
t.loadLevel(0);key('keydown','KeyD');step();events.blur[0]();assert.equal(snap().state,'paused');key('keydown','Escape');n=snap().counters.shots;for(let i=0;i<80;i++)t.tick(1/120);assert.equal(snap().counters.shots,n,'blur clears keys');
console.log('PASS: WASD and all arrows propel correctly, bullets go opposite, release stops firing, normalized diagonals, opposite-key cancellation, pause and focus-loss release.');
