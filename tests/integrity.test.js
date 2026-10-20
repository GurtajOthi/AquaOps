'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('../server'),{createBackup,verifyBackup}=require('../tools/storage.cjs');
test('damaged history imports reject atomically while complete corrective actions and evidence recover',async t=>{
  const root=path.join(__dirname,'../test-data');fs.mkdirSync(root,{recursive:true});const servers=[];
  async function facility(prefix){const dataDir=fs.mkdtempSync(path.join(root,prefix)),server=createServer({dataDir});servers.push(server);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;let cookie='',csrf='',revision=0,state;
    async function req(route,method='GET',data,status=200){const r=await fetch(base+route,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-AquaOps-Client':'1','X-CSRF-Token':csrf},...(data?{body:JSON.stringify({...data,revision})}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const body=await r.json();assert.equal(r.status,status,JSON.stringify(body));if(body.csrf)csrf=body.csrf;if(body.state){state=body.state;revision=body.revision;}return body;}
    await req('/api/setup','POST',{token:fs.readFileSync(path.join(dataDir,'setup-token.txt'),'utf8'),username:'admin',name:'Admin',password:'integrity-test-password'});return {req,dataDir,get state(){return state;}};
  }
  try{
    const source=await facility('integrity-source-'),target=await facility('integrity-target-');
    await source.req('/api/records/templates','POST',{record:{name:'Opening',items:'Rescue tube ready',nextDue:'2027-01-01'}});await source.req('/api/inspections','POST',{templateId:source.state.templates[0].id,results:[{result:'Fail',notes:'Replace tube'}],owner:'Guard',due:'2027-01-01',nextDue:'2027-01-02'},201);
    await source.req('/api/records/chemistry','POST',{record:{chlorine:2,ph:7.4,temperature:29,alkalinity:90,notes:'Recorded'}});await source.req('/api/records/chemistryactions','POST',{record:{readingId:source.state.chemistry[0].id,action:'Retest',owner:'Guard',due:'2027-01-01'}});await source.req('/api/records/inventory','POST',{record:{name:'Gloves',quantity:2,unit:'boxes',threshold:1}});
    await source.req('/api/tasks/'+source.state.tasks[0].id+'/progress','POST',{notes:'Tube ordered',completion:10,file:{name:'photo.png',base64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDm0AAAAASUVORK5CYII='}},201);
    const backup=await source.req('/api/backup'),cases=[
      ['missing inspection corrective task',s=>{s.tasks=s.tasks.filter(task=>!task.inspectionId);s.taskupdates=[];}],
      ['cross-linked inspection task',s=>{s.tasks.find(task=>task.inspectionId).inspectionId='wrong-inspection';}],
      ['missing chemistry follow-up',s=>{s.tasks=s.tasks.filter(task=>!task.chemistryActionId);} ],
      ['duplicate stock-history IDs',s=>s.adjustments.push({...s.adjustments[0]})],
      ['malformed completed checklist result',s=>{s.inspections[0].results[0]=null;}],
      ['invalid history ID',s=>{s.inspections[0].id='unsafe"id';}],
      ['missing progress photo document',s=>{s.documents=[];}]
    ];
    for(const [name,damage]of cases)await t.test(name,async()=>{const state=structuredClone(backup.state);damage(state);await target.req('/api/import','POST',{state,files:backup.files},400);const after=await target.req('/api/backup');assert.equal(after.revision,0);assert.equal(after.state.tasks.length,0);assert.equal(after.files.length,0);});
    await target.req('/api/import','POST',{state:backup.state,files:backup.files});assert.equal(target.state.inspections.length,1);assert.equal(target.state.chemistryactions.length,1);assert.equal(target.state.taskupdates.length,1);
    const full=await createBackup({dataDir:source.dataDir}),db=new(require('node:sqlite').DatabaseSync)(full.file);try{const row=db.prepare('SELECT body FROM workspace WHERE id=1').get(),state=JSON.parse(row.body);state.documents=[];db.prepare('UPDATE workspace SET body=? WHERE id=1').run(JSON.stringify(state));}finally{db.close();}assert.throws(()=>verifyBackup(full.file),/progress photo/);
  }finally{for(const server of servers)await new Promise(r=>server.close(r));}
});
