/* Run with node tests/physics.cjs. Executes actual game logic in a minimal DOM,
   with test hooks injected only into this VM (not shipped in the running game). */
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
process.chdir(path.join(__dirname,'..'));
const elements=new Map();const el=()=>({textContent:'',hidden:false,disabled:false,style:{},innerHTML:'',checked:true,classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelectorAll(){return[]},focus(){},getContext(){return{}},cloneNode(){return{play(){return Promise.resolve()}}}});
const document={querySelector(s){if(!elements.has(s))elements.set(s,el());return elements.get(s)},querySelectorAll(){return[]},addEventListener(){}};
const c={console,document,Math,Number,Promise,Image:class{set src(v){this.onload()}},Audio:class{cloneNode(){return{play(){return Promise.resolve()}}}},requestAnimationFrame(){}};c.window=c;const events={};c.addEventListener=(n,f)=>{(events[n]??=[]).push(f)};vm.createContext(c);
vm.runInContext(fs.readFileSync('levels.js','utf8'),c);
const source=fs.readFileSync('game.js','utf8').replace('// Read-only snapshot',`window.TEST={cycleGun,beginCharge,releaseCharge,hurt,damageEnemy,updateEnemies,loadLevel,tick,fire,collide,collideBodies,moveBody,updateBullets,explode,resetPlayer,setAim:a=>aim=a,setGun:g=>gun=g,setCooldown:n=>cooldown=n,player:()=>player,objects:()=>objects,blocks:()=>blocks,switches:()=>switches,shootAt:(x,y,vx,vy,bounce=0)=>bullets.push({x,y,vx,vy,bounce,life:2,color:'#fff'})};\n// Read-only snapshot`);
vm.runInContext(source,c);const t=c.TEST,snap=()=>c.RECOIL.snapshot();


function key(type,code){for(const f of events[type]||[])f({code,repeat:false,preventDefault(){}})}
function step(){for(let i=0;i<4;i++)t.tick(1/120)}

// Mouse mode never silently replaces mouse aim with WASD input.
t.loadLevel(0);c.KICKBACK.setControlMode('mouse');key('keydown','KeyD');step();assert.equal(snap().shots,0);key('keyup','KeyD');
c.KICKBACK.setControlMode('directional');key('keydown','KeyD');step();assert(snap().shots>0);key('keyup','KeyD');
// Space charges without auto-firing; release fires one empowered shot.
t.loadLevel(0);key('keydown','Space');for(let i=0;i<120;i++)t.tick(1/120);assert(snap().charge>.8);assert.equal(snap().shots,0);key('keyup','Space');assert.equal(snap().shots,1);assert.equal(snap().charging,false);assert(snap().bullets[0].damage===2);
// Mixed mouse/keyboard charge sources release only after both inputs are up.
t.loadLevel(0);key('keydown','Space');t.beginCharge('mouse');key('keyup','Space');assert.equal(snap().shots,0);t.releaseCharge('mouse');assert.equal(snap().shots,1);
// Pause, blur, and respawn cancel charges without firing on a later release.
for(const cancel of [()=>key('keydown','Escape'),()=>events.blur[0](),()=>key('keydown','KeyR')]){t.loadLevel(0);key('keydown','Space');step();cancel();key('keyup','Space');assert.equal(snap().shots,0);assert.equal(snap().charging,false);}
// Limited braking slows momentum, locks at empty, regenerates and requires release.
t.loadLevel(0);t.player().vx=450;key('keydown','ShiftLeft');step();assert(t.player().vx<400);assert(snap().brakeEnergy<1);
for(let i=0;i<240;i++)t.tick(1/120);assert(snap().brakeLocked);const energy=snap().brakeEnergy;
for(let i=0;i<120;i++)t.tick(1/120);assert(snap().brakeEnergy>energy,'held key must not consume regenerated energy');
key('keyup','ShiftLeft');assert(!snap().brakeLocked);key('keydown','ShiftRight');step();assert(snap().brakeEnergy<1);key('keydown','Escape');const pausedEnergy=snap().brakeEnergy;for(let i=0;i<120;i++)t.tick(1/120);assert.equal(snap().brakeEnergy,pausedEnergy);
// Cycling skips locked weapons, wraps, and respects a campaign loan weapon.
c.Campaign={begin(){},active:true,allowed:n=>n===0||n===3||n===5};t.loadLevel(0);key('keydown','KeyE');assert.equal(snap().gun,3);key('keydown','KeyE');assert.equal(snap().gun,5);key('keydown','KeyE');assert.equal(snap().gun,0);key('keydown','KeyQ');assert.equal(snap().gun,5);
// A bullet retains its originating gun after the player switches.
delete c.Campaign;t.loadLevel(0);t.setAim(0);t.fire();key('keydown','Digit7');assert.equal(snap().bullets[0].weapon,0);
console.log('PASS: control modes, Space charge, mixed charge sources, charge cancellation, finite brake energy and recharge, pause, unlocked weapon cycling and projectile attribution.');
