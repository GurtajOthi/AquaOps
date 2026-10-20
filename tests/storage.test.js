'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('../server'),{createBackup,verifyBackup,restoreBackup}=require('../tools/storage.cjs');
test('invalid port configuration fails before creating or modifying a data directory',()=>{
  const target=path.join(__dirname,'../test-data/invalid-port-'+Date.now());const result=require('node:child_process').spawnSync(process.execPath,[path.join(__dirname,'../server.js')],{env:{...process.env,PORT:'65536',AQUAOPS_DATA_DIR:target},encoding:'utf8'});assert.equal(result.status,1);assert.match(result.stderr,/PORT must be/);assert.equal(fs.existsSync(target),false);
});
test('live full backup, verification and non-destructive recovery retain accounts/data and revoke sessions',async()=>{
  const root=path.join(__dirname,'../test-data');fs.mkdirSync(root,{recursive:true});const dataDir=fs.mkdtempSync(path.join(root,'storage-'));let server=createServer({dataDir});await new Promise(r=>server.listen(0,'127.0.0.1',r));let base=`http://127.0.0.1:${server.address().port}`,cookie='',csrf='';
  async function request(route,method='GET',data){const response=await fetch(base+route,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-AquaOps-Client':'1','X-CSRF-Token':csrf},...(data?{body:JSON.stringify(data)}:{})});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];const body=await response.json();if(body.csrf)csrf=body.csrf;return {status:response.status,body};}
  try{
    assert.equal((await request('/api/setup','POST',{token:fs.readFileSync(path.join(dataDir,'setup-token.txt'),'utf8'),username:'admin',name:'Recovery owner',password:'storage-test-password'})).status,200);
    assert.equal((await request('/api/records/tasks','POST',{revision:0,record:{name:'Retained task',status:'Scheduled',priority:'High',due:'',owner:'',category:'Maintenance'}})).status,200);
    const backup=await createBackup({dataDir});assert.equal(backup.integrity,'ok');assert.equal(verifyBackup(backup.file).revision,1);
    const restoredDir=path.join(dataDir,'recovered');restoreBackup(backup.file,restoredDir);assert.throws(()=>restoreBackup(backup.file,restoredDir),/new directory/);assert.equal(verifyBackup(path.join(dataDir,'aquaops.sqlite')).revision,1);
    await new Promise(r=>server.close(r));server=createServer({dataDir:restoredDir});await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
    assert.equal((await request('/api/workspace')).status,401);
    assert.equal((await request('/api/login','POST',{username:'admin',password:'storage-test-password'})).status,200);
    const workspace=await request('/api/workspace');assert.equal(workspace.body.state.tasks[0].name,'Retained task');assert.equal(workspace.body.revision,1);
    const history=await request('/api/audit');assert.ok(history.body.some(a=>a.action==='Restore verified full backup'));
  }finally{await new Promise(r=>server.close(r));}
});
test('failed backup verification retains a partial snapshot without publishing a completed backup or altering earlier snapshots',async()=>{
  const root=path.join(__dirname,'../test-data');fs.mkdirSync(root,{recursive:true});const dataDir=fs.mkdtempSync(path.join(root,'partial-backup-')),server=createServer({dataDir});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{const first=await createBackup({dataDir});assert.ok(first.file.endsWith('.sqlite'));const db=new(require('node:sqlite').DatabaseSync)(path.join(dataDir,'aquaops.sqlite'));try{const row=db.prepare('SELECT body FROM workspace WHERE id=1').get(),state=JSON.parse(row.body);state.documents.push({id:'missing-document',name:'Missing file',category:'Procedures',url:'',fileId:'missing-file'});db.prepare('UPDATE workspace SET body=? WHERE id=1').run(JSON.stringify(state));}finally{db.close();}await assert.rejects(createBackup({dataDir}),/missing a document file/);const files=fs.readdirSync(path.join(dataDir,'backups'));assert.equal(files.filter(f=>f.endsWith('.sqlite')).length,1);assert.equal(files.filter(f=>f.endsWith('.sqlite.partial')).length,1);assert.equal(verifyBackup(first.file).integrity,'ok');
    const recovered=path.join(dataDir,'nested','new-target');assert.equal(restoreBackup(first.file,recovered).integrity,'ok');assert.throws(()=>restoreBackup(first.file,recovered),/new directory/);
  }finally{await new Promise(r=>server.close(r));}
});
