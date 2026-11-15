/* Campaign progression and weapon tasks. Tasks count only in story gameplay. */
(()=>{'use strict';const $=s=>document.querySelector(s);const key='kickback-campaign-v1';
const chapters=['CONTAINMENT BREACH','WEAPONS DIVISION','LUNAR RESEARCH STATION','THE ORIGINAL PROTOTYPE'];
const mapOrder=[4,4,3,1,5,3,2,6,2,4];
const names=['Awakening','Failed Reconstruction','No Survivors','Weapons Archive','Hostile Reflection','Bank the Shot','Lunar Arrival','Broken Signals','Advanced Copy','The Original Prototype'];
let data={cleared:[],unlocked:[true,false,false,false,false,false,false],kills:0,bestHits:0,safeKills:0,bestSafe:0,airKills:0,quick:false,banks:0,advanced:false,intro:false};
try{data={...data,...JSON.parse(localStorage.getItem(key)||'{}')};}catch{}
let active=false,current=0,hitStreak=0,bankStreak=0,recent=[],levelDamaged=false,pistolOnly=true,scene=0;
const tasks=['Available immediately','20 kills + 8 consecutive hits','3 kills within 5 seconds','15 kills without damage (across levels)','40 kills, including 10 airborne kills','3 consecutive bank-shot hits in level 7+ (loan weapon)','Defeat the advanced copy with only the Pistol, without damage'];
const gunNames=['Pistol','Revolver','Shotgun','SMG','Assault Rifle','Ricochet Rifle','Heavy Gun'];
function save(){try{localStorage.setItem(key,JSON.stringify(data));}catch{}}
function render(){
 $('#tasks').innerHTML=gunNames.map((n,i)=>`<div class="task-row"><b>${data.unlocked[i]?'UNLOCKED':'LOCKED'} / ${n}</b><p>${tasks[i]}</p></div>`).join('')+`<p>KILLS ${data.kills} / AIRBORNE ${data.airKills}<br>BEST HIT STREAK ${data.bestHits} / BEST SAFE KILLS ${data.bestSafe}<br>BANK-SHOT STREAK ${data.banks}/3</p>`;
 const highest=Math.min(9,data.cleared.length?Math.max(...data.cleared)+1:0);
 $('#campaign-levels').innerHTML=names.map((n,i)=>`<button data-story-level="${i}" ${i>highest?'disabled':''}><small>${chapters[i===9?3:Math.floor(i/3)]}</small><br>${data.cleared.includes(i)?'CLEAR ':''}${i+1}. ${n}</button>`).join('');
 document.querySelectorAll('[data-story-level]').forEach(b=>b.onclick=()=>start(+b.dataset.storyLevel));
}
function notify(text){$('#toast').textContent=text;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),3000);}
function check(){const criteria=[true,data.kills>=20&&data.bestHits>=8,data.quick,data.bestSafe>=15,data.kills>=40&&data.airKills>=10,data.banks>=3,data.advanced];criteria.forEach((ok,i)=>{if(ok&&!data.unlocked[i]){data.unlocked[i]=true;notify('WEAPON UNLOCKED: '+gunNames[i]);}});save();render();window.KICKBACK?.refreshGuns?.();}
function show(id){window.KickbackShell.show(id);}
function start(i){active=true;current=i;window.KICKBACK.startCampaign(i,mapOrder[i]);}
const scenes=[
 ['THE RECONSTRUCTION PROJECT','A body could be rebuilt. A life could be copied. The facility thought it had conquered failure.','assets/lab.svg','experiment'],
 ['AN ERROR THAT WOULD NOT DIE','The failed copies survived every attempt to destroy them. Something inside them had changed.','assets/story-lab.png','copies'],
 ['CONTAINMENT BREACH','The copies turned on the scientists, researchers and security staff. No one could stop them.','assets/lab.svg','breach'],
 ['THE LAST ORIGINAL','Everyone in the facility was killed. Everyone except you. Now the faces hunting you are your own.','assets/lab.svg','survivor'],
 ['FIGHT YOUR REFLECTION','Recover the weapons. Track the copies across the city and the lunar station. Stop the most advanced copy.','assets/maps/graveyard/Background_0.png','departure']
];
function animateScene(){const s=scenes[scene];$('#story-bg').src=s[2];$('#story-screen').dataset.scene=s[3];$('#story-chapter').textContent=`RECOVERED RECORDING ${scene+1}/${scenes.length}`;$('#story-title').textContent=s[0];$('#story-text').textContent=s[1];$('#story-next').textContent=scene===scenes.length-1?'BEGIN LEVEL 1':'NEXT SCENE';}
function intro(){active=false;window.KICKBACK.previewMenu();show('story-screen');scene=0;animateScene();}
function advance(){if(scene<scenes.length-1){scene++;animateScene();}else{data.intro=true;save();start(0);}}
function finishIntro(){data.intro=true;save();start(0);}
function endingReady(){return data.cleared.length===10&&data.unlocked.every(Boolean);}
window.Campaign={get active(){return active;},begin(i,mode){if(mode==='menu'){active=false;return;}current=i;levelDamaged=false;pistolOnly=true;hitStreak=0;bankStreak=0;recent=[];},allowed(i){return data.unlocked[i]||(current>=6&&i===5);},
 weaponUsed(i){if(active&&i!==0)pistolOnly=false;},hurt(){if(!active)return;levelDamaged=true;data.safeKills=0;save();},
 hit(b){if(!active)return;hitStreak++;data.bestHits=Math.max(data.bestHits,hitStreak);if(current>=6&&b.bounced){bankStreak++;data.banks=Math.max(data.banks,bankStreak);}else bankStreak=0;check();},
 miss(){if(active){hitStreak=0;bankStreak=0;}},
 kill(e,g,vy){if(!active)return;data.kills++;data.safeKills++;data.bestSafe=Math.max(data.bestSafe,data.safeKills);if(Math.abs(vy)>20)data.airKills++;const now=performance.now()/1000;recent.push(now);recent=recent.filter(t=>now-t<=5);if(recent.length>=3)data.quick=true;if(e.advanced&&g===0&&pistolOnly&&!levelDamaged)data.advanced=true;check();},
 clear(i){if(!active)return;if(!data.cleared.includes(i))data.cleared.push(i);save();render();if(i===9){$('#winText').textContent=endingReady()?'All levels and tasks complete.':'Campaign cleared! Replay levels to finish the remaining Armory tasks.';}},
 next(){if(endingReady()){active=false;window.KICKBACK.previewMenu();show('ending-screen');return;}if(current<9)start(current+1);else{active=false;window.KICKBACK.previewMenu();show('levels-screen');}},
 snapshot:()=>({active,current,data:JSON.parse(JSON.stringify(data)),endingReady:endingReady()})};
$('#story-play').onclick=()=>{if(endingReady()){show('ending-screen');return;}if(!data.intro)intro();else{render();show('levels-screen');}};
$('#watch-intro').onclick=intro;$('#story-next').onclick=advance;$('#story-skip').onclick=finishIntro;
render();
})();
