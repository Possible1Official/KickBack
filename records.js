/* Local arena records. Story progress remains owned by campaign.js. */
(()=>{'use strict';
const key='kickback-arena-records-v1';
let records={};
try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))records=saved;}catch{}
let run=null,lastSummary='';
const valid=n=>Number.isFinite(n)&&n>=0;
const format=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}.${Math.floor(seconds%1*10)}`;
function render(){document.querySelectorAll('[data-map]').forEach(card=>{
 const map=Number(card.dataset.map),parts=[];
 for(const [suffix,name] of [['assist','ASSIST'],['raw','RAW']]){
  const r=records[`${map}-${suffix}`];if(r&&valid(r.wave)&&r.wave>0)parts.push(`${name} · WAVE ${r.wave}${valid(r.bestScore)?` · ${r.bestScore} PTS`:""}`);
 }
 let badge=card.querySelector('.arena-record');if(!badge){badge=document.createElement('small');badge.className='arena-record';card.querySelector('span').appendChild(badge);}badge.textContent=parts.join(' / ')||'NO CLEARS YET';
});}
window.ArenaRecords={
 begin(map,wave,active){run=active?{map,wave,shots:0,hits:new Set(),damage:0,rescues:0}:null;lastSummary='';},
 shot(){if(run)run.shots++;},hit(id){if(run&&id!==undefined)run.hits.add(id);},
 damage(amount){if(run)run.damage+=amount;},rescue(){if(run)run.rescues++;},
 finish(cleared){if(!run)return;const s=window.RECOIL.snapshot(),accuracy=run.shots?Math.round(run.hits.size/run.shots*100):0;
  lastSummary=` · ${format(s.time)} · ${s.score||0} points · BEST x${s.bestCombo||0} · ${run.shots} shots · ${accuracy}% accuracy · ${run.damage} damage · ${run.rescues} rescues`;
  if(cleared){const id=`${run.map}-${s.assist?'assist':'raw'}`,old=records[id]||{},record={bestScore:Math.max(valid(old.bestScore)?old.bestScore:0,valid(s.score)?s.score:0),wave:valid(old.wave)?Math.max(old.wave,run.wave+1):run.wave+1,bestTimes:old.bestTimes&&typeof old.bestTimes==='object'?{...old.bestTimes}:{}};
   const previous=record.bestTimes[run.wave];
   if(run.rescues===0&&(!valid(previous)||s.time<previous)){record.bestTimes[run.wave]=s.time;lastSummary+=' · NEW BEST TIME';}
   records[id]=record;try{localStorage.setItem(key,JSON.stringify(records));}catch{}render();
  }
  if(!cleared){const p=document.querySelector('#dead p');p.textContent=`Wave ${run.wave+1} · ${s.kills} defeated${lastSummary}`;}
  run=null;
 },summary:()=>lastSummary,snapshot:()=>JSON.parse(JSON.stringify(records))
};
render();
})();
