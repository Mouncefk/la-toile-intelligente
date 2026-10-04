import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const port=4392;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'latoile-v29-2-'));
const env={...process.env,V28_HISTORY_TEST_SERVER:'1',PORT:String(port),V29_FILE_STORAGE_DIR:dir};
const server=spawn(process.execPath,['server/index.js'],{env,stdio:'pipe'});
let log='';
server.stdout.on('data',d=>{log+=d.toString()});
server.stderr.on('data',d=>{log+=d.toString()});
const base='http://127.0.0.1:'+port;
async function wait(){
  for(let i=0;i<40;i++){try{const r=await fetch(base+'/api/countries');if(r.ok)return;}catch{} await new Promise(r=>setTimeout(r,250));}
  throw new Error('server_not_ready '+log);
}
async function j(url,opts={}){const r=await fetch(base+url,opts);let body=null;try{body=await r.json()}catch{};return {status:r.status,body};}
try{
  await wait();
  const bad=await j('/api/v29/conversations/999999/files',{method:'POST',body:new URLSearchParams({actorType:'traveler',actorId:'1'})});
  assert.equal(bad.status,400);
  console.log('V29.2 file exchange contract: PASS');
}finally{
  server.kill('SIGTERM');
  await once(server,'close').catch(()=>{});
  fs.rmSync(dir,{recursive:true,force:true});
}