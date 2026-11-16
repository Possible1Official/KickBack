/* Run with node tests/physics.cjs. Executes actual game logic in a minimal DOM,
   with test hooks injected only into this VM (not shipped in the running game). */
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
process.chdir(path.join(__dirname,'..'));
const elements=new Map();const el=()=>({textContent:'',hidden:false,disabled:false,style:{},innerHTML:'',checked:true,classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelectorAll(){return[]},focus(){},getContext(){return{}},cloneNode(){return{play(){return Promise.resolve()}}}});
const document={querySelector(s){if(!elements.has(s))elements.set(s,el());return elements.get(s)},querySelectorAll(){return[]},addEventListener(){}};
const c={console,document,Math,Number,Promise,Image:class{set src(v){this.onload()}},Audio:class{cloneNode(){return{play(){return Promise.resolve()}}}},requestAnimationFrame(){}};c.window=c;c.addEventListener=()=>{};vm.createContext(c);
vm.runInContext(fs.readFileSync('levels.js','utf8'),c);
const source=fs.readFileSync('game.js','utf8').replace('// Read-only snapshot',`window.TEST={clearSight,pause,enemies:()=>enemies,setEnemies:v=>enemies=v,setBlocks:v=>blocks=v,setInvulnerable:v=>invulnerable=v,addHostile:b=>hostile.push(b),hurt,damageEnemy,updateEnemies,loadLevel,tick,fire,collide,collideBodies,moveBody,updateBullets,explode,resetPlayer,setAim:a=>aim=a,setGun:g=>gun=g,setCooldown:n=>cooldown=n,player:()=>player,objects:()=>objects,blocks:()=>blocks,switches:()=>switches,shootAt:(x,y,vx,vy,bounce=0)=>bullets.push({x,y,vx,vy,bounce,life:2,color:'#fff'})};\n// Read-only snapshot`);
vm.runInContext(source,c);const t=c.TEST,snap=()=>c.RECOIL.snapshot();


// Arena chains: cap at x5, award once per kill, damage/rescue/timeout break it.
t.loadLevel(2);const es=t.enemies();for(let i=0;i<6;i++)t.damageEnemy(es[i],100);
assert.equal(snap().score,2000);assert.equal(snap().combo,5);assert.equal(snap().bestCombo,5);t.damageEnemy(es[0],100);assert.equal(snap().score,2000);
t.pause();const timer=snap().comboTimer;t.tick(8);assert.equal(snap().comboTimer,timer,'pause freezes combo');t.pause();
t.setInvulnerable(0);t.hurt(20);assert.equal(snap().combo,0);t.damageEnemy(es[6],100);assert.equal(snap().score,2100);t.resetPlayer();assert.equal(snap().combo,0,'rescue breaks combo');
t.damageEnemy(es[7],100);t.tick(4.01);assert.equal(snap().combo,0);assert.equal(snap().bestCombo,5);
t.loadLevel(0);assert.equal(snap().score,0,'score resets each wave');
// Story cannot award arena points.
c.Campaign={active:true,begin(){},kill(){},allowed:()=>true};t.loadLevel(0);t.damageEnemy(t.enemies()[0],100);assert.equal(snap().score,0);delete c.Campaign;
// Cover blocks sight, including vertical/parallel rays; removed cover opens it.
t.loadLevel(0);const cover={x:200,y:50,w:30,h:150,alive:true};t.setBlocks([cover]);assert(!t.clearSight(100,100,300,100));assert(t.clearSight(100,10,300,10));assert(!t.clearSight(210,10,210,300));assert(t.clearSight(100,10,100,300));cover.alive=false;assert(t.clearSight(100,100,300,100));
// Actual ranged enemy warns before firing and keeps its original aim direction.
t.setBlocks([]);const e={x:100,y:100,vx:0,vy:0,r:22,mass:2,rotation:0,omega:0,hp:2,maxHp:2,type:'skeleton',cool:0,hop:10,alive:true};t.setEnemies([e]);t.player().x=400;t.player().y=100;t.updateEnemies(.01);assert(e.windup>0);assert.equal(snap().hostile.length,0);const aim=e.aimAngle;t.player().y=450;t.updateEnemies(.3);assert.equal(e.aimAngle,aim);assert.equal(snap().hostile.length,0);t.updateEnemies(.36);assert.equal(snap().hostile.length,1);assert(snap().hostile[0].vx>0);assert(Math.abs(snap().hostile[0].vy)<10);
// An enemy behind a closed door doesn't begin a windup.
e.windup=0;e.cool=0;e.x=100;e.y=100;e.vx=0;e.vy=0;t.player().x=400;t.player().y=100;cover.alive=true;t.setBlocks([cover]);t.updateEnemies(.01);assert.equal(e.windup,0);
// A killed enemy cannot finish a warning; cover absorbs projectiles before hurt.
e.windup=.1;e.alive=false;const n=snap().hostile.length;t.updateEnemies(.2);assert(snap().hostile.length<=n);
t.loadLevel(0);t.setEnemies([]);t.setInvulnerable(0);const p=t.player();t.setBlocks([{x:p.x-10,y:p.y-10,w:20,h:20,alive:true}]);t.addHostile({x:p.x,y:p.y,vx:0,vy:0,life:1});t.updateEnemies(0);assert.equal(snap().health,100);
console.log('PASS: arena combo scoring/cap, damage/rescue/timeout resets, pause, story exclusion, solid/open cover, locked attack warnings and projectile cover priority.');
