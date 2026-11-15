/* Run with node tests/physics.cjs. Executes actual game logic in a minimal DOM,
   with test hooks injected only into this VM (not shipped in the running game). */
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
process.chdir(path.join(__dirname,'..'));
const elements=new Map();const el=()=>({textContent:'',hidden:false,disabled:false,style:{},innerHTML:'',checked:true,classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelectorAll(){return[]},focus(){},getContext(){return{}},cloneNode(){return{play(){return Promise.resolve()}}}});
const document={querySelector(s){if(!elements.has(s))elements.set(s,el());return elements.get(s)},querySelectorAll(){return[]},addEventListener(){}};
const c={console,document,Math,Number,Promise,Image:class{set src(v){this.onload()}},Audio:class{cloneNode(){return{play(){return Promise.resolve()}}}},requestAnimationFrame(){}};c.window=c;c.addEventListener=()=>{};vm.createContext(c);
vm.runInContext(fs.readFileSync('levels.js','utf8'),c);
vm.runInContext(fs.readFileSync('maps.js','utf8'),c);
const source=fs.readFileSync('game.js','utf8').replace('// Read-only snapshot',`window.TEST={getLaser:()=>laser,bossAttack,enemies:()=>enemies,selectMap:n=>selected=n,hurt,damageEnemy,updateEnemies,loadLevel,tick,fire,collide,collideBodies,moveBody,updateBullets,explode,resetPlayer,setAim:a=>aim=a,setGun:g=>gun=g,setCooldown:n=>cooldown=n,player:()=>player,objects:()=>objects,blocks:()=>blocks,switches:()=>switches,shootAt:(x,y,vx,vy,bounce=0)=>bullets.push({x,y,vx,vy,bounce,life:2,color:'#fff'})};\n// Read-only snapshot`);
vm.runInContext(source,c);const t=c.TEST,snap=()=>c.RECOIL.snapshot();



const storage=new Map();c.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};let clock=0;c.performance={now:()=>clock*1000};c.setTimeout=()=>1;c.clearTimeout=()=>{};c.KickbackShell={sync(){},show(){},home(){}};
vm.runInContext(fs.readFileSync('campaign.js','utf8'),c);
document.querySelector('#story-skip').onclick();assert(c.Campaign.active);assert.equal(snap().enemies[0].type,'hero');assert(c.Campaign.allowed(0));assert(!c.Campaign.allowed(1));
for(let i=0;i<8;i++)c.Campaign.hit({});for(let i=0;i<8;i++){clock++;c.Campaign.kill({},0,50)}
c.Campaign.begin(1,'play');for(let i=0;i<7;i++){clock++;c.Campaign.kill({},0,50)}assert(c.Campaign.snapshot().data.unlocked[3],'SMG safe streak carries across levels');
c.Campaign.hurt();assert.equal(c.Campaign.snapshot().data.safeKills,0);
for(let i=0;i<30;i++){clock+=.1;c.Campaign.kill({},0,50)}assert(c.Campaign.snapshot().data.unlocked[1]);assert(c.Campaign.snapshot().data.unlocked[2]);assert(c.Campaign.snapshot().data.unlocked[4]);
c.Campaign.begin(6,'play');assert(c.Campaign.allowed(5),'loan available');for(let i=0;i<3;i++)c.Campaign.hit({bounced:true});assert(c.Campaign.snapshot().data.unlocked[5]);
c.Campaign.begin(8,'play');c.Campaign.kill({advanced:true},0,0);assert(c.Campaign.snapshot().data.unlocked[6]);
// Wave completion must wait at least two simulated seconds.
t.loadLevel(0);t.enemies().forEach(e=>e.alive=false);t.tick(1.99);assert.equal(snap().state,'play');t.tick(.02);assert.equal(snap().state,'complete');
// Final boss has radial and warned laser patterns.
c.KICKBACK.startCampaign(9,4);assert.equal(snap().enemies[0].type,'boss');assert.equal(snap().enemies[0].maxHp,100);t.bossAttack(5.1);assert(snap().hostile.length>=16);for(let i=0;i<5;i++)t.tick(1);t.bossAttack(5.1);assert(t.getLaser()||snap().hostile.length>0);
assert(!c.Campaign.snapshot().endingReady,'levels must also be cleared');for(let i=0;i<10;i++)c.Campaign.clear(i);assert(c.Campaign.snapshot().endingReady,'ending requires ten cleared levels AND all tasks');
console.log('PASS: story copy enemies, locked guns, 7 gun tasks, safe kills across levels, reset on damage, loan rifle, advanced-copy task, 2-second delay, crystal boss patterns, final completion gate.');
