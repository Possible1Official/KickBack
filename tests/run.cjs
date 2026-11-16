const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
for(const file of fs.readdirSync(__dirname).filter(f=>f.endsWith('.cjs')&&f!=='run.cjs').sort()){
 const result=spawnSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
