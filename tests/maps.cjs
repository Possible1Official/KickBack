/* Run with node tests/physics.cjs. Executes actual game logic in a minimal DOM,
   with test hooks injected only into this VM (not shipped in the running game). */
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
process.chdir(path.join(__dirname,'..'));
const elements=new Map();const el=()=>({textContent:'',hidden:false,disabled:false,style:{},innerHTML:'',checked:true,classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelectorAll(){return[]},focus(){},getContext(){return{}},cloneNode(){return{play(){return Promise.resolve()}}}});
const document={querySelector(s){if(!elements.has(s))elements.set(s,el());return elements.get(s)},querySelectorAll(){return[]},addEventListener(){}};
const c={console,document,Math,Number,Promise,Image:class{set src(v){this.onload()}},Audio:class{cloneNode(){return{play(){return Promise.resolve()}}}},requestAnimationFrame(){}};c.window=c;c.addEventListener=()=>{};vm.createContext(c);
vm.runInContext(fs.readFileSync('levels.js','utf8'),c);
vm.runInContext(fs.readFileSync('maps.js','utf8'),c);
const source=fs.readFileSync('game.js','utf8').replace('// Read-only snapshot',`window.TEST={selectMap:n=>selected=n,hurt,damageEnemy,updateEnemies,loadLevel,tick,fire,collide,collideBodies,moveBody,updateBullets,explode,resetPlayer,setAim:a=>aim=a,setGun:g=>gun=g,setCooldown:n=>cooldown=n,player:()=>player,objects:()=>objects,blocks:()=>blocks,switches:()=>switches,shootAt:(x,y,vx,vy,bounce=0)=>bullets.push({x,y,vx,vy,bounce,life:2,color:'#fff'})};\n// Read-only snapshot`);
vm.runInContext(source,c);const t=c.TEST,snap=()=>c.RECOIL.snapshot();


assert.equal(c.RECOIL_LEVELS.length,8);
const themes=['central','industrial','neon','graveyard','reactor'];
for(let id=0;id<8;id++){
 t.selectMap(id);t.loadLevel(0);let s=snap();assert.equal(s.stageIndex,id);assert.equal(s.round,0);assert.equal(s.enemies.length,4);assert.equal(s.health,100);
 if(id>=3)assert.equal(c.RECOIL_LEVELS[id].theme,themes[id-3]);
 const p=s.player;assert(!s.blocks.some(b=>p.x>b.x-p.r&&p.x<b.x+b.w+p.r&&p.y>b.y-p.r&&p.y<b.y+b.h+p.r),'spawn clear');
 const gravity=s.gravity;t.loadLevel(1);s=snap();assert.equal(s.stageIndex,id,'next wave preserves map');assert.equal(s.enemies.length,6);assert.equal(s.gravity,gravity,'map gravity constant');
 t.loadLevel(1);assert.equal(snap().stageIndex,id,'retry preserves map');
 for(const e of snap().enemies)for(let n=0;n<e.hp;n++){t.shootAt(e.x-5,e.y,100,0);t.updateBullets(.01)}t.tick(2.01);assert.equal(snap().state,'complete','all maps can clear');
}
console.log('PASS: all 8 maps selectable, unique new themes, safe spawns, equal starting difficulty, wave/retry retain map, constant gravity, all 8 clear conditions.');
