/* Presentation and audio are separate from the game engine. Add future screens
   as sections with class=screen, and navigate with data-screen attributes. */
(()=>{'use strict';
const $=s=>document.querySelector(s),all=s=>document.querySelectorAll(s);
let screen='home-screen',gameState='menu',unlocked=false,preferences={sfx:70,music:30,musicMuted:false,assist:true,controlMode:'directional'};
try{preferences={...preferences,...JSON.parse(localStorage.getItem('kickback-settings')||'{}')};}catch{}
for(const key of ['sfx','music'])preferences[key]=Math.max(0,Math.min(100,Number(preferences[key])||0));
const music=new Audio('assets/menu-track.mp3');music.id='menuMusic';music.hidden=true;music.loop=true;music.preload='auto';document.body.appendChild(music);
function save(){try{localStorage.setItem('kickback-settings',JSON.stringify(preferences));}catch{}}
function isMusicMuted(){return preferences.musicMuted||preferences.music===0;}
function syncMusicButtons(){const muted=isMusicMuted();all('[data-music-toggle]').forEach(button=>{button.setAttribute('aria-pressed',String(muted));button.setAttribute('aria-label',muted?'Unmute music':'Mute music');button.querySelector('[data-music-status]').textContent=muted?'MUSIC OFF':'MUSIC ON';});}
function syncAudio(){const muted=isMusicMuted();syncMusicButtons();music.volume=muted?0:preferences.music/100;window.KICKBACK?.setSfxVolume(preferences.sfx/100);if(gameState!=='play'&&unlocked&&!muted&&!document.hidden){if(music.paused)music.play().then(()=>{$('#music-note').textContent='MENU MUSIC ON';}).catch(()=>{$('#music-note').textContent='Click again to enable menu music';});}else{music.pause();if(gameState==='play')music.currentTime=0;$('#music-note').textContent=muted?'MENU MUSIC MUTED':'Click anywhere to start the menu music';}}
function show(id){screen=id;all('.screen').forEach(el=>el.hidden=el.id!==id);if(id==='maps-screen')updateMapLabel();const panel=$('#'+id);const target=panel?.querySelector('.menu-button')||panel?.querySelector('button');target?.focus({preventScroll:true});}
function updateMapLabel(){const card=$('[data-map].active b');$('#selected-map').textContent='SELECTED: '+(card?.textContent||'Moonlit ruins').toUpperCase();}
function syncSettings(){for(const key of ['sfx','music']){all(`[data-setting="${key}"]`).forEach(el=>el.value=preferences[key]);all(`[data-value="${key}"]`).forEach(el=>el.textContent=preferences[key]+'%');}$('#control-mode').value=preferences.controlMode==='mouse'?'mouse':'directional';window.KICKBACK?.setControlMode(preferences.controlMode);$('#assist').checked=preferences.assist;window.KICKBACK?.setAssist(preferences.assist);syncAudio();}
all('[data-screen]').forEach(button=>button.onclick=()=>show(button.dataset.screen));
all('[data-map]').forEach(button=>button.addEventListener('click',updateMapLabel));
all('[data-setting]').forEach(input=>input.addEventListener('input',()=>{preferences[input.dataset.setting]=Number(input.value);if(input.dataset.setting==='music'&&preferences.music>0)preferences.musicMuted=false;syncSettings();save();}));
all('[data-music-toggle]').forEach(button=>button.addEventListener('click',()=>{const muted=isMusicMuted();preferences.musicMuted=!muted;if(muted&&preferences.music===0)preferences.music=30;unlocked=true;syncSettings();save();}));
$('#assist').addEventListener('change',()=>{preferences.assist=$('#assist').checked;window.KICKBACK?.setAssist(preferences.assist);save();});
$('#control-mode').addEventListener('change',()=>{preferences.controlMode=$('#control-mode').value;window.KICKBACK?.setControlMode(preferences.controlMode);save();});
$('#fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else $('#app').requestFullscreen?.().catch(()=>{});};
function unlock(){unlocked=true;syncAudio();}
document.addEventListener('pointerdown',unlock);document.addEventListener('keydown',e=>{if(e.code!=='Escape')unlock();if(e.code==='Escape'&&gameState==='menu'&&screen!=='home-screen')show('home-screen');});
document.addEventListener('visibilitychange',syncAudio);
window.KickbackShell={sync(state){gameState=state;$('#pause').hidden=state!=='play';if(state!=='play')$('#toast').classList.remove('show');syncAudio();},show,home(){show('home-screen');},snapshot:()=>({screen,gameState,musicPlaying:!music.paused,musicVolume:music.volume,musicMuted:isMusicMuted(),sfxVolume:preferences.sfx/100,loop:music.loop})};
syncSettings();show('home-screen');
})();
