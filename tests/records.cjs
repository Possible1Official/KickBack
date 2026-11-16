const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../records.js'),'utf8');
const storage=new Map();let s={time:32.4,assist:true,kills:4};
function boot(){const c={localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{querySelectorAll:()=>[],querySelector:()=>({})},RECOIL:{snapshot:()=>s}};c.window=c;vm.createContext(c);vm.runInContext(source,c);return c.ArenaRecords;}
let r=boot();r.begin(0,0,true);for(let i=0;i<4;i++)r.shot();r.hit(1);r.hit(1);r.hit(2);r.finish(true);assert(r.summary().includes('50% accuracy'),'pellets count as one hit per shot');assert(r.summary().includes('NEW BEST'));assert.equal(r.snapshot()['0-assist'].wave,1);
r=boot();assert.equal(r.snapshot()['0-assist'].bestTimes[0],32.4,'records persist');
s.time=40;r.begin(0,0,true);r.finish(true);assert(!r.summary().includes('NEW BEST'));assert.equal(r.snapshot()['0-assist'].bestTimes[0],32.4);
s.time=10;r.begin(0,0,true);r.rescue();r.finish(true);assert.equal(r.snapshot()['0-assist'].bestTimes[0],32.4,'rescue cannot improve a time');
s.assist=false;r.begin(0,2,true);r.finish(true);assert.equal(r.snapshot()['0-raw'].wave,3);assert.equal(r.snapshot()['0-assist'].wave,1,'assist records stay separate');
r.begin(1,0,false);r.shot();r.finish(true);assert(!r.snapshot()['1-raw'],'story cannot create arena records');
r.begin(1,0,true);r.finish(false);assert(!r.snapshot()['1-raw'],'death cannot set a clear record');
storage.set('kickback-arena-records-v1','broken JSON');assert.deepEqual(JSON.parse(JSON.stringify(boot().snapshot())),{});
console.log('PASS: persistent records, unique-shot accuracy, fastest clean clears, rescue exclusion, separate assist records, story/death exclusion and corrupt storage recovery.');
