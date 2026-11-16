/* Kickback: browser prototype. Physics uses world pixels / seconds; positive Y is down.
   No engine dependency. Level data and gun data can be mapped to Godot resources. */
(()=>{'use strict';
const $=s=>document.querySelector(s), canvas=$('#game'),ctx=canvas.getContext('2d');
const W=1280,H=720,TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let enemies=[],hostile=[],health=100,invulnerable=0,kills=0,round=0; const images={},sounds={},audioNames=['laserSmall_000','laserLarge_000','laserRetro_000','explosionCrunch_000','forceField_000'];
const assets={robot:'robot.png',moon:'moon.png',mountains:'mountains.png',barrel:'barrel.png',crate:'crate.png'};
for(const n of [29,30,35,36,37,43,54,55,62,67,68,70,71,73,74,79,83,84,85,86,90,94,100,107])assets['tile'+n]=`industrial/platformIndustrial_${String(n).padStart(3,'0')}.png`;
for(let i=0;i<8;i++)assets['gun'+i]=`gun${i}.png`;
assets.sky='custom/sky.png';assets.stone='custom/stone.png';assets.wall='custom/wall.png';assets.torch='custom/torch.png';assets.books='custom/books.png';for(let i=0;i<4;i++)assets['gun'+[0,4,2,6][i]]='custom/weapon'+i+'.png';for(const n of ['hero','skeleton','wolf'])for(let i=0;i<12;i++)assets[n+i]='custom/'+n+i+'.png';
const mapAssets={centralSky:'central/Base Color.png',centralCity:'central/Background Props.png',industrialSky:'industrial/3_Far_Background_Tile.png',industrialWall:'industrial/2_Industrial_Tileset_1B_Background.png',neonBuilding:'neon/building_01.png',graveyardSky:'graveyard/Background_0.png',graveyardCity:'graveyard/Background_1.png',graveyardGrass:'graveyard/Grass_background_2.png'};
for(let i=1;i<=6;i++)mapAssets['neonLayer'+i]='neon/parallax_background_layer_'+i+'.png';
for(const n of ['central','industrial','neon','graveyard'])mapAssets[n+'Floor']=n+'Floor.png';
for(const [k,v] of Object.entries(mapAssets))assets[k]='maps/'+v;
const LEGACY_GUNS=[{name:'Pulse',sub:'precise · ricochet',kick:245,cd:.25,pellets:1,spread:0,bounce:2,img:'gun0',sound:0,color:'#8de3d2'}, {name:'Scatter',sub:'wide · strong recoil',kick:390,cd:.54,pellets:5,spread:.09,bounce:0,img:'gun4',sound:1,color:'#ffac64'}, {name:'Drifter',sub:'gentle · rapid fire',kick:100,cd:.12,pellets:1,spread:0,bounce:0,img:'gun2',sound:2,color:'#9ac2ff'}, {name:'Bankshot',sub:'heavy · ricochet',kick:440,cd:.7,pellets:1,spread:0,bounce:4,img:'gun6',sound:1,color:'#d5b1ff'}];
const GUNS=[
{name:'Pistol',kick:245,cd:.25,pellets:1,bounce:0,img:'gun0',sound:0,color:'#8de3d2'},
{name:'Revolver',kick:360,cd:.45,pellets:1,bounce:0,img:'extra0',sound:1,color:'#ffd29a'},
{name:'Shotgun',kick:390,cd:.54,pellets:5,spread:.09,bounce:0,img:'gun4',sound:1,color:'#ffac64'},
{name:'SMG',kick:100,cd:.12,pellets:1,bounce:0,img:'gun2',sound:2,color:'#9ac2ff'},
{name:'Assault Rifle',kick:155,cd:.17,pellets:1,bounce:0,img:'extra1',sound:0,color:'#edc9ff'},
{name:'Ricochet Rifle',kick:300,cd:.35,pellets:1,bounce:4,img:'gun6',sound:1,color:'#d5b1ff'},
{name:'Heavy Gun',kick:500,cd:.8,pellets:1,bounce:0,img:'extra2',sound:1,color:'#ffb0cf'}].map(g=>({...g,spread:g.spread||0,sub:g.bounce?'ricochet':'recoil drive'}));
assets.boss='boss.png';for(let i=0;i<3;i++)assets['extra'+i]='campaign-gun'+i+'.png';
let clearDelay=0,bossClock=0,laser=null,shotSerial=0;
let ready=false,state='menu',selected=0,level,stageIndex=0,player,blocks=[],objects=[],switches=[],bullets=[],particles=[],rings=[],cam=0,gun=0,charge=0,charging=false,cooldown=0,time=0,shots=0,toastTimer=0,mute=false,sfxVolume=.7,assist=true,flash=0,flashTimer=0;
let touchController=null,touchAim=null,touchVector={x:0,y:0};
let controlMode='directional',brakeEnergy=1,brakeDelay=0,brakeLocked=false;
const brakeKeys=new Set(),chargeSources=new Set();
const movementKeys=new Set();
const moveCodes=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight']);
function movement(){return{x:Number(movementKeys.has('KeyD')||movementKeys.has('ArrowRight'))-Number(movementKeys.has('KeyA')||movementKeys.has('ArrowLeft')),y:Number(movementKeys.has('KeyS')||movementKeys.has('ArrowDown'))-Number(movementKeys.has('KeyW')||movementKeys.has('ArrowUp'))};}
function updateAim(){const m=touchVector.x||touchVector.y?touchVector:controlMode==='directional'?movement():{x:0,y:0};aim=m.x||m.y?Math.atan2(-m.y,-m.x):(touchAim??Math.atan2(pointer.y-player.y,pointer.x+cam-player.x));return Boolean(m.x||m.y);}
let pointer={x:760,y:440,left:false},lastTime=0,accumulator=0,aim=0;
const counters={shots:0,broken:0,switches:0,explosions:0,ricochets:0,pushes:0,rescues:0,completed:0};
function sound(i,volume=.22){if(mute)return;const a=sounds[audioNames[i]]?.cloneNode();if(a){a.volume=Math.min(1,volume*sfxVolume);a.play().catch(()=>{});}}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');toastTimer=3;}
function sprite(key,x,y,w,h,alpha=1){const im=images[key];if(!im)return;ctx.globalAlpha=alpha;ctx.drawImage(im,x,y,w,h);ctx.globalAlpha=1;}
function label(text,x,y,color='#a9c5cd',size=11){ctx.font=`${size}px GamePixel, monospace`;ctx.fillStyle=color;ctx.fillText(text,x,y);}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function createBlock(a,type='solid',i=0){return{x:a[0],y:a[1],w:a[2],h:a[3],type,id:i,alive:true,vx:0,vy:0,ox:a[0],oy:a[1],ax:a[4]||0,ay:a[5]||0,rate:a[6]||1};}
function clearInput(){touchAim=null;touchVector={x:0,y:0};touchController?.reset();movementKeys.clear();brakeKeys.clear();chargeSources.clear();brakeLocked=false;pointer.left=false;charging=false;charge=0;}
function beginCharge(source){if(state!=='play')return;chargeSources.add(source);charging=true;}
function releaseCharge(source){if(!chargeSources.delete(source)||chargeSources.size)return;if(state==='play'&&charging){updateAim();if(!fire(1+charge*1.25))toast('Gun is cooling down. Hold charge a little longer.');}charging=false;charge=0;}
function resetPlayer(){clearInput();player={x:level.spawn[0],y:level.spawn[1],vx:0,vy:0,r:19,rotation:0,omega:0,mass:1};pointer.left=false;charge=0;charging=false;cam=0;}
function loadLevel(index,mode='play',mapIndex=selected){clearDelay=0;bossClock=0;laser=null;window.Campaign?.begin(index,mode);
 brakeEnergy=1;brakeDelay=0;brakeLocked=false;round=index;stageIndex=mapIndex;level=window.RECOIL_LEVELS[stageIndex];health=100;invulnerable=1;hostile=[];kills=0;enemies=Array.from({length:4+round*2},(_,i)=>({x:480+(i*213)%(level.width-640),y:260-(i%3)*65,vx:0,vy:0,r:22,mass:2,rotation:0,omega:0,hp:2+Math.floor(round/2),maxHp:2+Math.floor(round/2),type:i%3===2?'wolf':'skeleton',cool:2+i*.25,hop:1+i*.2,alive:true}));time=0;shots=0;cooldown=0;bullets=[];particles=[];rings=[];gun=0;
 blocks=[...level.platforms.map(a=>createBlock(a)),...level.breakables.map(a=>createBlock(a,'breakable')),...level.doors.map((a,i)=>createBlock(a,'door',i)),...level.movers.map(a=>createBlock(a,'moving'))];
 switches=level.switches.map(([x,y],i)=>({x,y,id:i,on:false,r:20}));
 objects=level.objects.map(([x,y,type])=>({x,y,type,vx:0,vy:0,r:19,mass:1.5,rotation:0,omega:0,alive:true}));
 if(window.Campaign?.active){enemies.forEach(e=>e.type='hero');if(index===8){enemies[0].advanced=true;enemies[0].hp=enemies[0].maxHp=12;enemies[0].r=28;}if(index===9)enemies=[{x:930,y:420,vx:0,vy:0,r:65,mass:8,rotation:0,omega:0,hp:100,maxHp:100,type:'boss',cool:3,hop:5,alive:true}];}resetPlayer();state=mode;window.ArenaRecords?.begin(stageIndex,round,mode==='play'&&!window.Campaign?.active);updateGunUI();$('#menu').hidden=mode!=='menu';$('#hud').hidden=mode==='menu';$('#paused').hidden=true;$('#complete').hidden=true;$('#pause').hidden=mode!=='play';$('#touch-actions').hidden=mode!=='play';$('#mobile-tip').hidden=mode!=='play';window.KickbackShell?.sync(state);
 $('#sector').textContent=`WAVE ${round+1} / ${level.name.toUpperCase()}`;$('#gravity').textContent=(level.gravity/600).toFixed(2)+' G';updateObjective();
 $('#dead').hidden=true;if(mode==='play'){canvas.focus();toast(('ontouchstart' in window)?'Touch anywhere and drag to move · your gun fires opposite':'Clear the enemies · Shift: air brake · Space: charge · Q / E: weapons');}
}
function updateGunUI(){$('#touch-gun').textContent=GUNS[gun].name;$('#guns').innerHTML=GUNS.map((g,i)=>`<button class="${i===gun?'active':''}" data-gun="${i}" ${window.Campaign?.active&&!window.Campaign.allowed(i)?'disabled':''} title="${g.sub}"><img src="assets/${assets[g.img]}" alt=""><b>${i+1} · ${g.name}</b><small>${g.sub}</small></button>`).join('');$('#guns').querySelectorAll('button').forEach(b=>b.onclick=()=>changeGun(+b.dataset.gun));}
function changeGun(n){n=(n+7)%7;if(window.Campaign?.active&&!window.Campaign.allowed(n)){toast('Weapon locked. View Armory for its challenge.');return;}gun=n;updateGunUI();}
function cycleGun(direction){for(let i=1;i<=GUNS.length;i++){const n=(gun+direction*i+GUNS.length)%GUNS.length;if(!window.Campaign?.active||window.Campaign.allowed(n)){changeGun(n);return;}}}
function updateObjective(){const alive=enemies.filter(e=>e.alive).length;$('#objective').textContent=`Eliminate enemies: ${kills} / ${enemies.length}`;$('#hint').textContent=`${alive} remaining · ${health} HP · ${controlMode==='directional'?'WASD / arrows: recoil drive':'Mouse: aim · hold click: fire'} · Shift: brake`;$('#healthFill').style.width=health+'%';$('#healthText').textContent=health+' / 100 HP';}
function hurt(amount){if(invulnerable>0||state!=='play')return;window.Campaign?.hurt();window.ArenaRecords?.damage(amount);health=Math.max(0,health-amount);invulnerable=.8;burst(player.x,player.y,'#ff7289',18);updateObjective();if(health===0){state='dead';clearInput();window.ArenaRecords?.finish(false);window.KickbackShell?.sync(state);pointer.left=false;charging=false;$('#dead').hidden=false;sound(3,.25);}else toast(`Hit! ${health} HP remaining`);}
function damageEnemy(e,amount,weapon=gun){if(!e.alive)return;e.hp-=amount;burst(e.x,e.y,'#e7b5f8',10);if(e.hp<=0){e.alive=false;kills++;window.Campaign?.kill(e,weapon,player.vy);sound(3,.1);burst(e.x,e.y,'#d9b3fa',28);}updateObjective();}
function bossAttack(dt){const boss=enemies.find(e=>e.type==='boss'&&e.alive);if(!boss)return;bossClock+=dt;if(!laser&&bossClock>5){bossClock=0;const pattern=Math.floor(time/5)%3;if(pattern===0){for(let i=0;i<16;i++){const a=i*Math.PI/8;hostile.push({x:boss.x,y:boss.y,vx:Math.cos(a)*185,vy:Math.sin(a)*185,life:7});}toast('GOLEM: RADIAL BURST');}else{laser={x:boss.x,y:boss.y,angle:pattern===1?Math.atan2(player.y-boss.y,player.x-boss.x):Math.PI/2,timer:0};toast('LASER CHARGING — dodge the marked line!');}}if(laser){laser.timer+=dt;if(laser.timer>1.2&&laser.timer<2.1){const dx=player.x-laser.x,dy=player.y-laser.y;if(Math.abs(dx*Math.sin(laser.angle)-dy*Math.cos(laser.angle))<25)hurt(20);}if(laser.timer>2.1)laser=null;}}
function updateEnemies(dt){bossAttack(dt);invulnerable=Math.max(0,invulnerable-dt);for(const e of enemies)if(e.alive){const dir=Math.sign(player.x-e.x);e.vx+=dir*(85+round*12)*dt;e.vx=clamp(e.vx,-85-round*9,85+round*9);e.hop-=dt;if(e.hop<0){e.vy=e.type==='boss'?-130:-220;e.hop=2.6;}moveBody(e,dt);e.cool-=dt;if(e.cool<=0){e.cool=Math.max(1.3,3.5-round*.2);const ang=Math.atan2(player.y-e.y,player.x-e.x);hostile.push({x:e.x,y:e.y,vx:Math.cos(ang)*(185+round*14),vy:Math.sin(ang)*(185+round*14),life:7});burst(e.x,e.y,'#ff83a1',8,50);}if(e.y>800){e.y=300;e.vy=0;}}
for(const b of hostile){b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(Math.hypot(b.x-player.x,b.y-player.y)<23){hurt(20);b.life=0;}for(const block of blocks)if(block.alive&&b.x>block.x&&b.x<block.x+block.w&&b.y>block.y&&b.y<block.y+block.h)b.life=0;}hostile=hostile.filter(b=>b.life>0);}

function fire(power=1){
 if(cooldown>0||state!=='play')return false;
 window.Campaign?.weaponUsed(gun);const shotId=++shotSerial;const g=GUNS[gun],dx=Math.cos(aim),dy=Math.sin(aim),k=g.kick*power*(assist?.84:1);
 player.vx-=dx*k;player.vy-=dy*k;player.omega+=(-dx*.7+dy*.18)*power;cooldown=g.cd;shots++;counters.shots++;window.ArenaRecords?.shot();
 for(let i=0;i<g.pellets;i++){const a=aim+(i-(g.pellets-1)/2)*g.spread;bullets.push({x:player.x+dx*30,y:player.y+dy*30,vx:Math.cos(a)*1000,vy:Math.sin(a)*1000,shotId,weapon:gun,hit:false,damage:gun===6?6:power>1.5?2:1,life:2.6,bounce:g.bounce,color:g.color});}
 burst(player.x+dx*30,player.y+dy*30,g.color,6,50);flash=.07;sound(g.sound,.13);return true;
}
function burst(x,y,color,n=12,force=150){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=Math.random()*force;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.3+Math.random()*.5,max:.8,color});}}
function explode(o){if(!o.alive)return;o.alive=false;counters.explosions++;rings.push({x:o.x,y:o.y,r:8,life:.55});burst(o.x,o.y,'#ffb065',35,320);sound(3,.35);toast('Shockwave! Barrels launch you and nearby cargo.');
 for(const b of [player,...objects])if(b!==o&&(b.alive!==false)){const dx=b.x-o.x,dy=b.y-o.y,d=Math.hypot(dx,dy);if(d<260){const k=(1-d/260)*650/Math.sqrt(b.mass);b.vx+=dx/Math.max(1,d)*k;b.vy+=dy/Math.max(1,d)*k-110;b.omega+=dx*.01;}}
 // Chain reactions propagate once because each barrel is marked inactive first.
 for(const e of enemies)if(e.alive&&Math.hypot(e.x-o.x,e.y-o.y)<200)damageEnemy(e,3);
 for(const b of objects)if(b.type==='barrel'&&b.alive&&Math.hypot(b.x-o.x,b.y-o.y)<150)explode(b);
}
function hitSwitch(s){if(s.on)return;s.on=true;counters.switches++;for(const b of blocks)if(b.type==='door'&&b.id===s.id)b.alive=false;sound(4,.3);burst(s.x,s.y,'#8de3d2',22);toast('Switch linked. Door unlocked.');updateObjective();}
function normalCircleBox(body,b){const qx=clamp(body.x,b.x,b.x+b.w),qy=clamp(body.y,b.y,b.y+b.h),dx=body.x-qx,dy=body.y-qy,d=Math.hypot(dx,dy);if(d>=body.r)return null;if(d>.00001)return{nx:dx/d,ny:dy/d,depth:body.r-d};
 const edges=[{d:body.x-b.x,nx:-1,ny:0},{d:b.x+b.w-body.x,nx:1,ny:0},{d:body.y-b.y,nx:0,ny:-1},{d:b.y+b.h-body.y,nx:0,ny:1}].sort((a,b)=>a.d-b.d);return{nx:edges[0].nx,ny:edges[0].ny,depth:body.r+edges[0].d};}
function collide(body,b){const c=normalCircleBox(body,b);if(!c)return;body.x+=c.nx*c.depth;body.y+=c.ny*c.depth;const rvx=body.vx-b.vx,rvy=body.vy-b.vy,vn=rvx*c.nx+rvy*c.ny;if(vn<0){const restitution=Math.abs(vn)>95?.48:0;body.vx-=(1+restitution)*vn*c.nx;body.vy-=(1+restitution)*vn*c.ny;
 // Tangential friction transfers moving platform velocity and adds contact torque.
 const tx=-c.ny,ty=c.nx,tangent=(body.vx-b.vx)*tx+(body.vy-b.vy)*ty,friction=.13;body.vx-=tangent*tx*friction;body.vy-=tangent*ty*friction;body.omega+=tangent/body.r*.012;
 }}
function collideBodies(a,b){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),sum=a.r+b.r;if(d>=sum||d<.001)return;const nx=dx/d,ny=dy/d,dep=sum-d;a.x-=nx*dep*.6;a.y-=ny*dep*.6;b.x+=nx*dep*.4;b.y+=ny*dep*.4;const vn=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(vn<0){const j=-(1.4)*vn/(1/a.mass+1/b.mass);a.vx-=j*nx/a.mass;a.vy-=j*ny/a.mass;b.vx+=j*nx/b.mass;b.vy+=j*ny/b.mass;a.omega-=ny*j*.003;b.omega+=ny*j*.003;}}
function moveBody(b,dt){
 b.vy+=level.gravity*dt;
 for(const fan of level.fans)if(b.x>fan.x-b.r&&b.x<fan.x+fan.w+b.r&&b.y>fan.y&&b.y<fan.y+fan.h){b.vx+=fan.fx*dt;b.vy+=fan.fy*dt;}
 const drag=b===player?(assist?.65:.22):.22;b.vx*=Math.exp(-drag*dt);b.vy*=Math.exp(-drag*dt*.35);
 const speed=Math.hypot(b.vx,b.vy),cap=assist?590:820;if(speed>cap){b.vx*=cap/speed;b.vy*=cap/speed;}
 b.x+=b.vx*dt;b.y+=b.vy*dt;b.rotation+=b.omega*dt;b.omega*=Math.exp(-.6*dt);
 for(const block of blocks)if(block.alive)collide(b,block);
}
function updateBullets(dt){for(const b of bullets){b.life-=dt;const oldX=b.x,oldY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;
 for(const s of switches)if(!s.on&&Math.hypot(b.x-s.x,b.y-s.y)<s.r+5){hitSwitch(s);b.life=0;break;}
 if(b.life<=0)continue;
 for(const e of enemies)if(e.alive&&Math.hypot(b.x-e.x,b.y-e.y)<e.r+7){window.Campaign?.hit(b);window.ArenaRecords?.hit(b.shotId);b.hit=true;damageEnemy(e,b.damage||1,b.weapon);b.life=0;break;}if(b.life<=0)continue;
 for(const o of objects)if(o.alive&&Math.hypot(b.x-o.x,b.y-o.y)<o.r+4){if(o.type==='barrel')explode(o);else{o.vx+=b.vx*.16;o.vy+=b.vy*.16-40;o.omega+=b.vx*.001;counters.pushes++;burst(b.x,b.y,'#a4dff4',7);}b.life=0;break;}
 if(b.life<=0)continue;
 for(const p of blocks)if(p.alive&&b.x>=p.x-2&&b.x<=p.x+p.w+2&&b.y>=p.y-2&&b.y<=p.y+p.h+2){if(p.type==='breakable'){p.alive=false;counters.broken++;burst(b.x,b.y,'#ffc185',18);b.life=0;}else if(b.bounce>0){if(oldX<p.x||oldX>p.x+p.w){b.vx*=-1;b.x=oldX;}else{b.vy*=-1;b.y=oldY;}b.bounce--;b.bounced=true;counters.ricochets++;burst(b.x,b.y,b.color,3,50);}else b.life=0;break;}
 }for(const b of bullets)if(b.life<=0&&!b.hit)window.Campaign?.miss(b);bullets=bullets.filter(b=>b.life>0);}
function tick(dt){
 if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('#toast').classList.remove('show');}
 if(state!=='play')return;time+=dt;cooldown=Math.max(0,cooldown-dt);const moving=updateAim();
 if(charging)charge=Math.min(1,charge+dt/1.15);if((moving||pointer.left)&&!charging&&cooldown<=0)fire();flash=Math.max(0,flash-dt);
 for(const b of blocks)if(b.type==='moving'){b.vx=b.ax*Math.cos(time*b.rate)*b.rate;b.vy=b.ay*Math.cos(time*b.rate)*b.rate;b.x=b.ox+b.ax*Math.sin(time*b.rate);b.y=b.oy+b.ay*Math.sin(time*b.rate);}
 const braking=brakeKeys.size>0&&!brakeLocked&&brakeEnergy>0;
 if(braking){const drag=Math.exp(-5*dt);player.vx*=drag;player.vy*=drag;player.omega*=drag;brakeEnergy=Math.max(0,brakeEnergy-dt*.7);brakeDelay=.8;if(brakeEnergy===0)brakeLocked=true;}else{brakeDelay=Math.max(0,brakeDelay-dt);if(brakeDelay===0)brakeEnergy=Math.min(1,brakeEnergy+dt*.28);}
 $('#brakeFill').style.width=(brakeEnergy*100)+'%';$('#brakeText').textContent=braking?'BRAKING':brakeLocked?'RELEASE SHIFT':brakeEnergy<1?'RECHARGING':'READY';
 moveBody(player,dt);for(const o of objects)if(o.alive)moveBody(o,dt);
 const live=objects.filter(o=>o.alive);for(const o of live)collideBodies(player,o);for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++)collideBodies(live[i],live[j]);
 updateBullets(dt);updateEnemies(dt);if(state==='dead')return;
 for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=170*dt;}particles=particles.filter(p=>p.life>0);
 for(const r of rings){r.life-=dt;r.r+=530*dt;}rings=rings.filter(r=>r.life>0);
 if(!Number.isFinite(player.x)||player.y>level.height+250||player.x< -100||player.x>level.width+100){resetPlayer();counters.rescues++;window.ArenaRecords?.rescue();toast('Returned to the entrance. Health preserved.');}
 if(level.scroll)cam+=(clamp(player.x-W*.4,0,level.width-W)-cam)*Math.min(1,dt*5);else cam=0;
 if(enemies.every(e=>!e.alive)){clearDelay+=dt;if(clearDelay>=2){state='complete';clearInput();window.ArenaRecords?.finish(true);window.KickbackShell?.sync(state);pointer.left=false;charging=false;counters.completed++;$('#complete').hidden=false;$('#winTitle').textContent='Wave cleared.';$('#winText').textContent=`Level ${round+1} · ${kills} defeated · ${health} HP`;$('#next').textContent='CONTINUE';if(!window.Campaign?.active)$('#winText').textContent+=window.ArenaRecords?.summary()||'';window.Campaign?.clear(round);sound(4,.35);}}else clearDelay=0;
 $('#speed').textContent=(Math.hypot(player.vx,player.vy)/45).toFixed(1)+' m/s';$('#chargeFill').style.width=charge*100+'%';$('#chargeText').textContent=charging?(cooldown>0?'Cooling down… hold charge':charge===1?'Fully charged · release to launch':Math.round(charge*100)+'% · release to launch'):'Hold, then release';
}
function tileStrip(b,key){if(b.type==='solid')key=level.theme?level.theme+'Floor':'stone';for(let x=b.x;x<b.x+b.w;x+=48){const width=Math.min(48,b.x+b.w-x);ctx.save();ctx.beginPath();ctx.rect(x,b.y,width,b.h);ctx.clip();sprite(key,x,b.y,48,Math.max(24,b.h));ctx.restore();}}
function parallax(key,factor,width,height,alpha){for(let x=-(cam*factor)%width-width;x<W;x+=width)sprite(key,x,600-height,width,height,alpha);}
function draw(){
 ctx.clearRect(0,0,W,H);const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#122c3b');bg.addColorStop(1,stageIndex===2?'#35454c':'#23434e');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 ctx.imageSmoothingEnabled=false;
 const theme=level?.theme;
 if(theme==='central'){sprite('centralSky',0,0,W,H);parallax('centralCity',.2,620,600,0.8);}
 else if(theme==='industrial'){sprite('industrialSky',0,0,W,H);for(let x=-cam*.2%384-384;x<W;x+=384)sprite('industrialWall',x,170,384,430,.65);}
 else if(theme==='neon'){for(let i=1;i<=6;i++)parallax('neonLayer'+i,.04+i*.045,1280,720,1);parallax('neonBuilding',.38,270,390,.65);}
 else if(theme==='graveyard'){sprite('graveyardSky',0,0,W,620);parallax('graveyardCity',.16,1280,620,.9);parallax('graveyardGrass',.35,520,560,.7);}
 else {sprite('sky',0,0,W,H,.85);rect(0,0,W,H,'#110e2c55');for(let x=-cam*.25%240-240;x<W;x+=240){sprite('wall',x,280,95,310,.45);sprite('torch',x+65,365,24,40,.9);}}
 const glow=ctx.createRadialGradient(700,340,5,700,340,650);glow.addColorStop(0,'#78d0d60c');glow.addColorStop(1,'#07192477');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.translate(-cam,0);
 if(level){
 for(const f of level.fans){const color=f.fx?'#a8d5fa':'#8de3d2';rect(f.x,f.y,f.w,f.h,'#75d8ce0d');ctx.strokeStyle=color+'33';ctx.setLineDash([4,8]);ctx.strokeRect(f.x,f.y,f.w,f.h);ctx.setLineDash([]);sprite('tile67',f.x+f.w/2-23,f.y+f.h-36,46,36);for(let i=0;i<9;i++){const progress=(time*.6+i/9)%1,x=f.fx?f.x+progress*f.w:f.x+15+(i*37)%(f.w-30),y=f.fx?f.y+20+(i*19)%(f.h-30):f.y+f.h-progress*f.h;ctx.save();ctx.translate(x,y);ctx.rotate(f.fx?Math.PI/2:0);sprite('tile84',-7,-9,14,18,.35+progress*.25);ctx.restore();}}
 for(const b of blocks)if(b.alive){if(b.x+b.w<cam-50||b.x>cam+W+50)continue;
 if(b.type==='door'){sprite('tile100',b.x,b.y,b.w,b.h);sprite('tile107',b.x-8,b.y+35,b.w+16,40);rect(b.x,b.y,2,b.h,'#ffb56a');}
 else{tileStrip(b,b.type==='breakable'?'tile79':b.type==='moving'?'tile37':'tile35');if(b.type==='breakable')rect(b.x,b.y,b.w,2,'#ffac64');if(b.type==='moving'){rect(b.x,b.y,b.w,2,'#9ac2ff');label('↔',b.x+b.w/2-6,b.y+18,'#c4e6ff',13);}}}
 for(const [x,y,t] of level.labels)label(t,x,y,'#a3bfc3',10);
 for(const s of switches){ctx.shadowColor=s.on?'#8de3d2':'#ffac64';ctx.shadowBlur=15;sprite(s.on?'tile55':'tile54',s.x-19,s.y-24,38,42);ctx.shadowBlur=0;label(s.on?'LINKED':'SHOOT',s.x-20,s.y-31,s.on?'#8de3d2':'#ffac64',10);}

 for(const o of objects)if(o.alive){ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.rotation);sprite(o.type==='barrel'?'barrel':'crate',-20,-20,40,40);ctx.restore();label(o.type==='barrel'?'! SHOCKWAVE':'↔ MOVABLE',o.x-30,o.y-30,o.type==='barrel'?'#ffac64':'#b8d9e9',9);}
 for(const b of bullets){ctx.strokeStyle=b.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x-b.vx*.012,b.y-b.vy*.012);ctx.lineTo(b.x,b.y);ctx.stroke();}
 for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);rect(p.x,p.y,3,3,p.color);}ctx.globalAlpha=1;
 for(const r of rings){ctx.strokeStyle=`rgba(255,177,98,${r.life/.55})`;ctx.lineWidth=5;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,TAU);ctx.stroke();}
 if(laser){ctx.strokeStyle=laser.timer<1.2?'#ffb96488':'#ff658aff';ctx.lineWidth=laser.timer<1.2?3:22;ctx.beginPath();ctx.moveTo(laser.x-Math.cos(laser.angle)*3000,laser.y-Math.sin(laser.angle)*3000);ctx.lineTo(laser.x+Math.cos(laser.angle)*3000,laser.y+Math.sin(laser.angle)*3000);ctx.stroke();}for(const e of enemies)if(e.alive){ctx.save();ctx.translate(e.x,e.y);if(player.x<e.x)ctx.scale(-1,1);if(e.type==='boss')sprite('boss',-90,-130,180,165);else sprite(e.type+Math.floor(time*9)%12,-28,-37,56,64);ctx.restore();rect(e.x-22,e.y-47,44,4,'#352339');rect(e.x-22,e.y-47,44*e.hp/e.maxHp,4,'#f29ab7');}for(const b of hostile){ctx.shadowColor='#ff688f';ctx.shadowBlur=12;rect(b.x-5,b.y-3,10,6,'#ff9dbd');ctx.shadowBlur=0;}
 if(player){ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.rotation);ctx.shadowColor='#8de3d2';ctx.shadowBlur=10;sprite('hero'+Math.floor(time*9)%12,-27,-35,54,64,invulnerable>0&&Math.floor(time*14)%2?.4:1);ctx.shadowBlur=0;ctx.restore();
 const a=state==='menu'?-.25:aim;ctx.save();ctx.translate(player.x,player.y);ctx.rotate(a);if(Math.cos(a)<0)ctx.scale(1,-1);ctx.imageSmoothingEnabled=false;sprite(GUNS[gun].img,8,-10,40,20);ctx.imageSmoothingEnabled=true;if(flash>0){ctx.fillStyle='#ffe5ad';ctx.beginPath();ctx.arc(49,0,6,0,TAU);ctx.fill();}ctx.restore();
 if(state==='play'){// Recoil preview points opposite the independent gun aim.
 ctx.strokeStyle='#8de3d25c';ctx.lineWidth=2;ctx.setLineDash([3,7]);ctx.beginPath();ctx.moveTo(player.x-Math.cos(aim)*32,player.y-Math.sin(aim)*32);ctx.lineTo(player.x-Math.cos(aim)*80,player.y-Math.sin(aim)*80);ctx.stroke();ctx.setLineDash([]);
 if(charging){ctx.strokeStyle='#ffac64';ctx.lineWidth=3;ctx.beginPath();ctx.arc(player.x,player.y,31,-Math.PI/2,-Math.PI/2+charge*TAU);ctx.stroke();}}
 }
 }ctx.restore();
 if(state==='play'&&!$('#stage').classList.contains?.('touch-device')){ctx.strokeStyle=GUNS[gun].color;ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(pointer.x,pointer.y,8,0,TAU);ctx.moveTo(pointer.x-13,pointer.y);ctx.lineTo(pointer.x-5,pointer.y);ctx.moveTo(pointer.x+5,pointer.y);ctx.lineTo(pointer.x+13,pointer.y);ctx.stroke();}
}
function frame(now){if(!lastTime)lastTime=now;accumulator+=Math.min((now-lastTime)/1000,.05);lastTime=now;while(accumulator>=1/120){tick(1/120);accumulator-=1/120;}draw();requestAnimationFrame(frame);}
function pause(){if(state!=='play'&&state!=='paused')return;clearInput();state=state==='play'?'paused':'play';pointer.left=false;charging=false;charge=0;$('#paused').hidden=state!=='paused';$('#pause').hidden=state!=='play';$('#touch-actions').hidden=state!=='play';$('#mobile-tip').hidden=state!=='play';window.KickbackShell?.sync(state);if(state==='play')canvas.focus();}
function home(){pointer.left=false;charging=false;$('#toast').classList.remove('show');loadLevel(0,'menu');window.KickbackShell?.home();}
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;touchAim=null;const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/W,r.height/H),left=r.left+(r.width-W*scale)/2,top=r.top+(r.height-H*scale)/2;pointer.x=(e.clientX-left)/scale;pointer.y=(e.clientY-top)/scale;});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||state!=='play')return;touchAim=null;canvas.focus();canvas.setPointerCapture(e.pointerId);if(e.button===0)pointer.left=true;if(e.button===2)beginCharge('mouse');e.preventDefault();});
window.addEventListener('pointerup',e=>{if(e.pointerType==='touch')return;if(e.button===0)pointer.left=false;if(e.button===2)releaseCharge('mouse');});
canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{if(state==='play'){e.preventDefault();cycleGun(e.deltaY>0?1:-1);}},{passive:false});
function isEditing(e){return /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target?.tagName);}
window.addEventListener('keydown',e=>{
 if(e.code==='Escape'&&!e.repeat){if(!$('#creditsDialog')?.open)pause();return;}
 if(state!=='play'||isEditing(e)||$('#creditsDialog')?.open)return;
 if(moveCodes.has(e.code)){e.preventDefault();movementKeys.add(e.code);}
 if(e.code==='Space'){e.preventDefault();if(!e.repeat)beginCharge('keyboard');}
 if(e.code==='ShiftLeft'||e.code==='ShiftRight'){e.preventDefault();brakeKeys.add(e.code);}
 if(e.repeat)return;
 if(/^Digit[1-7]$/.test(e.code))changeGun(+e.code.slice(-1)-1);
 if(e.code==='KeyQ')cycleGun(-1);if(e.code==='KeyE')cycleGun(1);
 if(e.code==='KeyR'){window.ArenaRecords?.rescue();resetPlayer();toast('Returned safely to the entrance.');}
});
window.addEventListener('keyup',e=>{
 if(moveCodes.has(e.code)){movementKeys.delete(e.code);if(state==='play')e.preventDefault();}
 if(e.code==='Space'){if(state==='play')e.preventDefault();releaseCharge('keyboard');}
 if(e.code==='ShiftLeft'||e.code==='ShiftRight'){brakeKeys.delete(e.code);if(!brakeKeys.size)brakeLocked=false;}
});
canvas.addEventListener('pointercancel',e=>{if(e.pointerType!=='touch')clearInput();});
touchController=window.TouchControls?.create({surface:canvas,root:$('#stage'),playing:()=>state==='play',onVector:v=>{touchVector=v;if(v.x||v.y)touchAim=Math.atan2(-v.y,-v.x);},onCycle:cycleGun,onAction:(action,phase)=>{
 if(action==='charge'){if(phase==='down')beginCharge('touch');else if(phase==='up')releaseCharge('touch');else{chargeSources.delete('touch');if(!chargeSources.size){charging=false;charge=0;}}}
 if(action==='brake'){if(phase==='down')brakeKeys.add('touch');else{brakeKeys.delete('touch');if(!brakeKeys.size)brakeLocked=false;}}
}});
window.addEventListener('blur',()=>{clearInput();if(state==='play')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(state==='play')pause();}});
$('#retry').onclick=()=>loadLevel(round);$('#deadMenu').onclick=()=>{$('#dead').hidden=true;home();};$('#play').onclick=()=>{assist=$('#assist').checked;loadLevel(0);};document.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>{selected=+b.dataset.map;document.querySelectorAll('[data-map]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});loadLevel(0,'menu');});

$('#pause').onclick=pause;$('#resume').onclick=pause;$('#back').onclick=home;$('#finishMenu').onclick=home;$('#restart').onclick=()=>loadLevel(round);$('#replay').onclick=()=>loadLevel(round);$('#next').onclick=()=>{if(window.Campaign?.active)window.Campaign.next();else loadLevel(round+1);};
window.KICKBACK={setControlMode:mode=>{controlMode=mode==='mouse'?'mouse':'directional';clearInput();if(level)updateObjective();},refreshGuns:updateGunUI,startCampaign:(level,map)=>{selected=map;loadLevel(level);},previewMenu:()=>home(),setSfxVolume:v=>{sfxVolume=Math.max(0,Math.min(1,v));},setAssist:v=>{assist=Boolean(v);},snapshot:()=>window.RECOIL?.snapshot()};
for(const n of audioNames){const a=new Audio('assets/'+n+'.ogg');a.preload='auto';sounds[n]=a;}
Promise.all(Object.entries(assets).map(([key,path])=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>{images[key]=i;resolve();};i.onerror=()=>reject(new Error(path));i.src='assets/'+path;}))).then(()=>{ready=true;$('#play').disabled=false;$('#play').textContent='ENTER ARENA';loadLevel(0,'menu');requestAnimationFrame(frame);}).catch(e=>{$('#play').textContent='ASSETS MISSING · RE-EXTRACT ZIP';console.error(e);});
// Read-only snapshot for integration checks; mutation hooks are intentionally absent.
window.RECOIL={snapshot:()=>({ready,state,stageIndex,round,health,kills,time,shots,assist,controlMode,brakeEnergy,brakeLocked,charging,enemies:enemies.map(e=>({...e})),hostile:hostile.map(b=>({...b})),gravity:level?.gravity,scroll:level?.scroll,cam,gun,charge,player:player?{...player}:null,switches:switches.map(s=>({...s})),blocks:blocks.map(b=>({...b})),objects:objects.map(o=>({...o})),bullets:bullets.map(b=>({...b})),counters:{...counters},images:Object.keys(images).length})};
})();
