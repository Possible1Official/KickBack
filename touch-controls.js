/* Pointer-event touch controls. One finger owns the floating stick; other
   fingers can hold an action without moving or replacing that stick. */
(()=>{'use strict';
window.TouchControls={create({surface,root,playing,onVector,onAction,onCycle}){
 const stick=document.querySelector('#touch-stick'),knob=document.querySelector('#touch-knob');
 let owner=null,origin={x:0,y:0};const actions=new Map();
 function enable(){root.classList.add('touch-device');}
 function position(e){const r=root.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
 function move(e){const p=position(e),dx=p.x-origin.x,dy=p.y-origin.y,d=Math.hypot(dx,dy),radius=48;
  const scale=d>radius?radius/d:1;knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;
  onVector(d<10?{x:0,y:0}:{x:dx/d,y:dy/d});
 }
 function releaseCapture(el,id){try{if(el.hasPointerCapture(id))el.releasePointerCapture(id);}catch{}}
 function stopStick(){const id=owner;owner=null;stick.hidden=true;onVector({x:0,y:0});if(id!==null)releaseCapture(surface,id);}
 function stopAction(id,cancel){const entry=actions.get(id);if(!entry)return;actions.delete(id);entry.button.classList.remove('held');onAction(entry.action,cancel?'cancel':'up');releaseCapture(entry.button,id);}
 function reset(){stopStick();for(const id of [...actions.keys()])stopAction(id,true);}
 surface.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'||!playing())return;enable();e.preventDefault();
  if(owner!==null)return;owner=e.pointerId;origin=position(e);
  stick.style.left=origin.x+'px';stick.style.top=origin.y+'px';knob.style.transform='translate(0px,0px)';stick.hidden=false;
  surface.setPointerCapture(owner);onVector({x:0,y:0});
 });
 surface.addEventListener('pointermove',e=>{if(e.pointerType==='touch'&&e.pointerId===owner){e.preventDefault();move(e);}});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,e=>{if(e.pointerId===owner)stopStick();});
 document.querySelectorAll('[data-touch-action]').forEach(button=>{
  button.addEventListener('pointerdown',e=>{
   if(e.pointerType!=='touch'||!playing())return;enable();e.preventDefault();
   const action=button.dataset.touchAction;if([...actions.values()].some(a=>a.action===action))return;
   actions.set(e.pointerId,{button,action});button.setPointerCapture(e.pointerId);button.classList.add('held');onAction(action,'down');
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>stopAction(e.pointerId,type!=='pointerup'));
  // Keyboard and mouse activation keep these accessible on hybrid devices.
  button.addEventListener('click',e=>{if(e.detail===0&&playing()){const action=button.dataset.touchAction;onAction(action,'down');onAction(action,'up');}});
 });
 document.querySelectorAll('[data-touch-cycle]').forEach(button=>button.addEventListener('click',()=>{if(playing())onCycle(Number(button.dataset.touchCycle));}));
 window.addEventListener('resize',reset);window.addEventListener('blur',reset);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 return{reset};
}};
})();
