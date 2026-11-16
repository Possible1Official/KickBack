/* Real touch controller + game integration, including separate pointer owners. */
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
process.chdir(path.join(__dirname,'..'));
const elements=new Map();
function el(){const classes=new Set(),captures=new Set();return{textContent:'',dataset:{},hidden:false,disabled:false,style:{},innerHTML:'',checked:true,events:{},classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle(){}},addEventListener(k,fn){(this.events[k]??=[]).push(fn)},querySelectorAll(){return[]},focus(){},getContext(){return{}},setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id),getBoundingClientRect:()=>({left:100,top:50,width:800,height:450})};}
const get=s=>{if(!elements.has(s))elements.set(s,el());return elements.get(s)};
const chargeButton=el(),brakeButton=el(),next=el(),prev=el();chargeButton.dataset.touchAction='charge';brakeButton.dataset.touchAction='brake';next.dataset.touchCycle='1';prev.dataset.touchCycle='-1';
const document={querySelector:get,querySelectorAll:s=>s==='[data-touch-action]'?[chargeButton,brakeButton]:s==='[data-touch-cycle]'?[prev,next]:[],events:{},addEventListener(k,f){(this.events[k]??=[]).push(f)}};
const events={},c={document,console,Math,Number,Promise,Image:class{set src(v){this.onload()}},Audio:class{cloneNode(){return{play:()=>Promise.resolve()}}},requestAnimationFrame(){}};c.window=c;c.addEventListener=(k,f)=>{(events[k]??=[]).push(f)};vm.createContext(c);
for(const file of ['levels.js','touch-controls.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
vm.runInContext(fs.readFileSync('game.js','utf8').replace('// Read-only snapshot','window.TEST={loadLevel,tick,pause,resetPlayer};\n// Read-only snapshot'),c);
const t=c.TEST,snap=()=>c.RECOIL.snapshot(),canvas=get('#game'),stick=get('#touch-stick'),knob=get('#touch-knob');
function event(target,type,id=1,x=250,y=250,extra={}){const e={pointerType:'touch',pointerId:id,clientX:x,clientY:y,button:0,detail:1,preventDefault(){},...extra};for(const fn of target.events[type]||[])fn(e);return e;}
function step(n=4){for(let i=0;i<n;i++)t.tick(1/120);}
function stop(id=1){const e=event(canvas,'pointerup',id);for(const fn of events.pointerup||[])fn(e);}
// Finger down shows the stick at that exact CSS position, without a shot.
t.loadLevel(0);event(canvas,'pointerdown',1,320,230);assert.equal(stick.hidden,false);assert.equal(stick.style.left,'220px');assert.equal(stick.style.top,'180px');step();assert.equal(snap().shots,0);
// A second finger cannot steal or relocate the stick.
event(canvas,'pointerdown',2,600,300);event(canvas,'pointermove',2,500,200);assert.equal(stick.style.left,'220px');assert.equal(knob.style.transform,'translate(0px,0px)');
event(canvas,'pointermove',1,380,230);step();assert(snap().player.vx>0);assert(snap().bullets.some(b=>b.vx<0));assert.equal(knob.style.transform,'translate(48px,0px)');
stop(2);assert.equal(stick.hidden,false);stop();assert.equal(stick.hidden,true);const count=snap().shots;step(60);assert.equal(snap().shots,count,'release stops firing');
// Fresh origins, diagonal normalization, dead zone, and mouse-mode override.
t.loadLevel(0);c.KICKBACK.setControlMode('mouse');event(canvas,'pointerdown',3,500,320);assert.equal(stick.style.left,'400px');event(canvas,'pointermove',3,505,325);step();assert.equal(snap().shots,0);event(canvas,'pointermove',3,540,280);step();let b=snap().bullets[0];assert(b.vx<0&&b.vy>0);assert(Math.abs(Math.abs(b.vx)-Math.abs(b.vy))<.01);stop(3);
// Charge with another finger while keeping the stick; unrelated touch-up doesn't fire.
t.loadLevel(0);event(canvas,'pointerdown',4,300,280);event(canvas,'pointermove',4,370,280);event(chargeButton,'pointerdown',5);event(chargeButton,'pointerup',9);assert(snap().charging);step(120);assert.equal(snap().shots,0);stop(4);event(chargeButton,'pointerup',5);assert.equal(snap().shots,1);assert(snap().bullets[0].vx<0,'release retains last touch direction');assert.equal(snap().charging,false);
// Cancellation never fires; action cancellation doesn't cancel joystick movement.
t.loadLevel(0);event(canvas,'pointerdown',6);event(canvas,'pointermove',6,320,250);event(chargeButton,'pointerdown',7);step(30);event(chargeButton,'pointercancel',7);assert(!snap().charging);assert.equal(stick.hidden,false);assert.equal(snap().shots,0);step();assert.equal(snap().shots,1);
event(brakeButton,'pointerdown',8);step(20);assert(snap().brakeEnergy<1);event(brakeButton,'lostpointercapture',8);const energy=snap().brakeEnergy;step(10);assert.equal(snap().brakeEnergy,energy,'cancelled brake no longer drains');
// Pause clears every finger; late releases cannot emit a charged shot.
event(chargeButton,'pointerdown',10);step(10);t.pause();assert(stick.hidden);assert(!snap().charging);const paused=snap().shots;event(chargeButton,'pointerup',10);stop(6);t.pause();step(60);assert.equal(snap().shots,paused);
// Rotation/resize and lost pointer capture stop movement; gestures in menus ignored.
t.loadLevel(0);event(canvas,'pointerdown',11);event(canvas,'pointermove',11,300,250);for(const f of events.resize)f();assert(stick.hidden);step();assert.equal(snap().shots,0);
event(canvas,'pointerdown',12);event(canvas,'lostpointercapture',12);assert(stick.hidden);
t.loadLevel(0,'menu');event(canvas,'pointerdown',13);assert(stick.hidden);event(chargeButton,'pointerdown',14);assert(!snap().charging);
t.loadLevel(0);event(next,'click');assert.equal(snap().gun,1);event(prev,'click');assert.equal(snap().gun,0);
console.log('PASS: floating origins, dead zone, recoil direction, multi-touch ownership, release/cancel/lost capture, dual-finger charging/braking, pause/rotation cleanup, mouse-mode touch override and weapon buttons.');
