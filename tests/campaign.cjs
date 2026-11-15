/* Run with node tests/campaign.cjs. Executes actual game logic in a minimal DOM,
   with test hooks injected only into this VM (not shipped in the running game). */
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
process.chdir(path.join(__dirname,'..'));
const elements=new Map();const el=()=>({textContent:'',dataset:{},hidden:false,disabled:false,style:{},innerHTML:'',checked:true,classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelectorAll(){return[]},focus(){},getContext(){return{}},cloneNode(){return{play(){return Promise.resolve()}}}});
const document={querySelector(s){if(!elements.has(s))elements.set(s,el());return elements.get(s)},querySelectorAll(){return[]},addEventListener(){}};
const c={console,document,Math,Number,Promise,Image:class{set src(v){this.onload()}},Audio:class{cloneNode(){return{play(){return Promise.resolve()}}}},requestAnimationFrame(){}};c.window=c;c.addEventListener=()=>{};vm.createContext(c);
vm.runInContext(fs.readFileSync('levels.js','utf8'),c);
vm.runInContext(fs.readFileSync('maps.js','utf8'),c);
const source=fs.readFileSync('game.js','utf8').replace('// Read-only snapshot',`window.TEST={getLaser:()=>laser,bossAttack,enemies:()=>enemies,selectMap:n=>selected=n,hurt,damageEnemy,updateEnemies,loadLevel,tick,fire,collide,collideBodies,moveBody,updateBullets,explode,resetPlayer,setAim:a=>aim=a,setGun:g=>gun=g,setCooldown:n=>cooldown=n,player:()=>player,objects:()=>objects,blocks:()=>blocks,switches:()=>switches,shootAt:(x,y,vx,vy,bounce=0)=>bullets.push({x,y,vx,vy,bounce,life:2,color:'#fff'})};\n// Read-only snapshot`);
vm.runInContext(source,c);const t=c.TEST,snap=()=>c.RECOIL.snapshot();



const storage=new Map();c.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};let clock=0;c.performance={now:()=>clock*1000};const timers=[];c.setTimeout=fn=>{timers.push(fn);return timers.length;};c.clearTimeout=()=>{};let shownScreen;c.KickbackShell={sync(){},show(id){shownScreen=id;},home(){}};
vm.runInContext(fs.readFileSync('campaign.js','utf8'),c);
// A first Play opens the intro; only Next advances a scene or starts level 1.
const click=id=>document.querySelector(id).onclick();
click('#story-play');assert.equal(shownScreen,'story-screen');
for(let i=1;i<=5;i++){
 assert.equal(document.querySelector('#story-chapter').textContent,`RECOVERED RECORDING ${i}/5`);
 assert.equal(timers.length,0,'story must not schedule automatic advancement');
 assert(!c.Campaign.active,'gameplay waits for the final button');
 if(i<5)click('#story-next');
}
assert.equal(document.querySelector('#story-next').textContent,'BEGIN LEVEL 1');
click('#story-next');assert(c.Campaign.active);assert.equal(c.Campaign.snapshot().current,0);
assert.equal(JSON.parse(storage.get('kickback-campaign-v1')).intro,true);
click('#story-play');assert.equal(shownScreen,'levels-screen');
click('#watch-intro');assert.equal(document.querySelector('#story-chapter').textContent,'RECOVERED RECORDING 1/5');
click('#story-skip');assert(c.Campaign.active);assert.equal(snap().enemies[0].type,'hero');assert(c.Campaign.allowed(0));assert(!c.Campaign.allowed(1));
for(let i=0;i<8;i++)c.Campaign.hit({});for(let i=0;i<8;i++){clock++;c.Campaign.kill({},0,50)}
c.Campaign.begin(1,'play');for(let i=0;i<7;i++){clock++;c.Campaign.kill({},0,50)}assert(c.Campaign.snapshot().data.unlocked[3],'SMG safe streak carries across levels');
c.Campaign.hurt();assert.equal(c.Campaign.snapshot().data.safeKills,0);
for(let i=0;i<30;i++){clock+=.1;c.Campaign.kill({},0,50)}assert(c.Campaign.snapshot().data.unlocked[1]);assert(c.Campaign.snapshot().data.unlocked[2]);assert(c.Campaign.snapshot().data.unlocked[4]);
c.Campaign.begin(6,'play');assert(c.Campaign.allowed(5),'loan available');for(let i=0;i<3;i++)c.Campaign.hit({bounced:true});assert(c.Campaign.snapshot().data.unlocked[5]);
c.Campaign.begin(8,'play');c.Campaign.kill({advanced:true},0,0);assert(!c.Campaign.allowed(6),'single advanced-copy kill does not finish the task');
c.Campaign.hurt();c.Campaign.clear(8);assert(!c.Campaign.allowed(6),'damage disqualifies the run');
c.Campaign.begin(8,'play');c.Campaign.weaponUsed(1);c.Campaign.clear(8);assert(!c.Campaign.allowed(6),'another weapon disqualifies the run');
c.Campaign.begin(7,'play');c.Campaign.clear(7);assert(!c.Campaign.allowed(6),'task requires Level 9');
c.Campaign.begin(8,'play');c.Campaign.clear(8);assert(c.Campaign.allowed(6),'perfect Pistol clear unlocks Heavy Gun before final boss');
c.Campaign.begin(9,'play');assert(c.Campaign.allowed(6),'Heavy Gun is available for the final boss');
// Wave completion must wait at least two simulated seconds.
t.loadLevel(0);t.enemies().forEach(e=>e.alive=false);t.tick(1.99);assert.equal(snap().state,'play');t.tick(.02);assert.equal(snap().state,'complete');
// Final boss has radial and warned laser patterns.
c.KICKBACK.startCampaign(9,4);assert.equal(snap().enemies[0].type,'boss');assert.equal(snap().enemies[0].maxHp,100);t.bossAttack(5.1);assert(snap().hostile.length>=16);for(let i=0;i<5;i++)t.tick(1);t.bossAttack(5.1);assert(t.getLaser()||snap().hostile.length>0);
assert(!c.Campaign.snapshot().endingReady,'levels must also be cleared');for(let i=0;i<10;i++)c.Campaign.clear(i);assert(c.Campaign.snapshot().endingReady,'ending requires ten cleared levels AND all tasks');
console.log('PASS: first Play intro, manual scene advancement, saved intro, story copy enemies, locked guns, 7 gun tasks, safe kills across levels, reset on damage, loan rifle, perfect Level 9 Pistol task before final boss, 2-second delay, crystal boss patterns, final completion gate.');
