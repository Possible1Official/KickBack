/* Run with node tests/physics.cjs. Executes actual game logic in a minimal DOM,
   with test hooks injected only into this VM (not shipped in the running game). */
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
process.chdir(path.join(__dirname,'..'));
const elements=new Map();const el=()=>({textContent:'',hidden:false,disabled:false,style:{},innerHTML:'',checked:true,classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelectorAll(){return[]},focus(){},getContext(){return{}},cloneNode(){return{play(){return Promise.resolve()}}}});
const document={querySelector(s){if(!elements.has(s))elements.set(s,el());return elements.get(s)},querySelectorAll(){return[]},addEventListener(){}};
const c={console,document,Math,Number,Promise,Image:class{set src(v){this.onload()}},Audio:class{cloneNode(){return{play(){return Promise.resolve()}}}},requestAnimationFrame(){}};c.window=c;c.addEventListener=()=>{};vm.createContext(c);
vm.runInContext(fs.readFileSync('levels.js','utf8'),c);
const source=fs.readFileSync('game.js','utf8').replace('// Read-only snapshot',`window.TEST={hurt,damageEnemy,updateEnemies,loadLevel,tick,fire,collide,collideBodies,moveBody,updateBullets,explode,resetPlayer,setAim:a=>aim=a,setGun:g=>gun=g,setCooldown:n=>cooldown=n,player:()=>player,objects:()=>objects,blocks:()=>blocks,switches:()=>switches,shootAt:(x,y,vx,vy,bounce=0)=>bullets.push({x,y,vx,vy,bounce,life:2,color:'#fff'})};\n// Read-only snapshot`);
vm.runInContext(source,c);const t=c.TEST,snap=()=>c.RECOIL.snapshot();

t.loadLevel(0);assert.equal(snap().health,100);assert.equal(snap().enemies.length,4);
t.tick(1.1);t.hurt(20);assert.equal(snap().health,80);t.hurt(20);assert.equal(snap().health,80,'hit protection');
for(let i=0;i<4;i++){t.tick(.81);t.hurt(20)}assert.equal(snap().health,0);assert.equal(snap().state,'dead');
t.loadLevel(1);assert.equal(snap().health,100);assert.equal(snap().enemies.length,6);
for(let i=0;i<8;i++){t.updateEnemies(.5)}assert(snap().hostile.length>0,'ranged enemies fire');
t.loadLevel(2);assert.equal(snap().enemies.length,8);assert.equal(snap().enemies[0].hp,3);
// Actual bullet collision kills an enemy after sufficient hits.
let e=snap().enemies[0];for(let i=0;i<3;i++){t.shootAt(e.x-5,e.y,100,0);t.updateBullets(.01)}assert.equal(snap().kills,1);
// Defeat remaining targets through collision checks, then verify wave progression.
for(const enemy of snap().enemies.filter(e=>e.alive))for(let i=0;i<enemy.hp;i++){t.shootAt(enemy.x-5,enemy.y,100,0);t.updateBullets(.01)}
t.tick(2.01);assert.equal(snap().state,'complete');
t.loadLevel(3);assert.equal(snap().round,3);assert.equal(snap().enemies.length,10);assert.equal(snap().health,100);
t.setAim(Math.PI/2);t.fire();assert(t.player().vy<0,'recoil lift retained');
console.log('PASS: 100 HP, five unprotected hits cause death, invulnerability, full-health retry, ranged attacks, increasing enemy counts and HP, bullet kills, wave clear and fourth-level progression, recoil movement.');
