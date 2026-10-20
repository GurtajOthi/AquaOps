'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createServer}=require('../server');
const M=require('../frontend/model');
test('connected facility workflows, permissions, persistence and recovery',async t=>{
  const root=path.join(__dirname,'../test-data');fs.mkdirSync(root,{recursive:true});const dataDir=fs.mkdtempSync(path.join(root,'api-'));
  let server=createServer({dataDir});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let base=`http://127.0.0.1:${server.address().port}`,rev=0,workspace;
  function client(){return {cookie:'',csrf:'',async request(route,method='GET',data){const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json','X-AquaOps-Client':'1','X-CSRF-Token':this.csrf,Cookie:this.cookie},...(data?{body:JSON.stringify(data)}:{})});if(r.headers.get('set-cookie'))this.cookie=r.headers.get('set-cookie').split(';')[0];const value=r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text();if(value.csrf)this.csrf=value.csrf;return {status:r.status,value};}};}
  const admin=client();
  async function request(route,method='GET',data,status=200,c=admin){const r=await c.request(route,method,data);assert.equal(r.status,status,JSON.stringify(r.value));if(r.value.state){workspace=r.value.state;rev=r.value.revision;}return r.value;}
  async function create(kind,record){await request('/api/records/'+kind,'POST',{record,revision:rev});return workspace[kind].at(-1);}
  try{
    await t.test('first-run setup, authentication and CSRF protection',async()=>{
      assert.equal((await request('/api/session')).setupRequired,true);
      await request('/api/workspace','GET',null,401);
      const token=fs.readFileSync(path.join(dataDir,'setup-token.txt'),'utf8');
      await request('/api/setup','POST',{token,username:'admin',name:'Facility Admin',password:'aqua-test-password-123'});
      await request('/api/setup','POST',{token,username:'other',name:'Other',password:'aqua-test-password-123'},409);
      await request('/api/workspace');
      const malformed=await request('/api/records/tasks','POST',[],400);assert.match(malformed.error,/JSON object/);
      const r=await fetch(base+'/api/records/tasks',{method:'POST',headers:{'Content-Type':'application/json',Cookie:admin.cookie},body:'{}'});assert.equal(r.status,403);
      const foreign=await fetch(base+'/api/logout',{method:'POST',headers:{'Content-Type':'application/json','X-AquaOps-Client':'1','X-CSRF-Token':admin.csrf,Origin:'https://evil.example',Cookie:admin.cookie},body:'{}'});assert.equal(foreign.status,403);
    });
    let staff,task,item,doc,template;
    await t.test('CRUD, persistent staff/qualifications, overnight shifts and validation',async()=>{
      staff=await create('staff',{name:'Sam',role:'Lifeguard',email:'sam@example.test',notes:'Opening supervisor'});
      await create('qualifications',{staffId:staff.id,name:'Lifeguard',expiry:'2027-05-01',reference:'CERT-1'});
      await create('qualifications',{staffId:staff.id,name:'First aid',expiry:'2026-10-01',reference:'CERT-2'});
      await create('shifts',{staffId:staff.id,start:'2026-10-17T22:00',end:'2026-10-18T06:00',location:'Main pool'});
      await request('/api/records/shifts','POST',{revision:rev,record:{staffId:staff.id,start:'2026-10-18T05:00',end:'2026-10-18T09:00',location:'Main pool'}},400);
      await request('/api/records/staff/'+staff.id,'DELETE',{revision:rev},409);
      task=await create('tasks',{name:'Backwash',status:'Scheduled',priority:'High',due:'2026-10-18',owner:'Sam',category:'Maintenance'});
      const stale=rev;await request('/api/records/tasks/'+task.id,'PUT',{revision:rev,record:{...task,name:'Backwash revised',status:'Completed'}});
      await request('/api/records/tasks/'+task.id,'PUT',{revision:stale,record:{...task,status:'Scheduled'}},409);
      assert.equal(workspace.tasks.find(t=>t.id===task.id).status,'Completed');
      await request('/api/records/tasks/'+task.id,'PUT',{revision:rev,record:{...task,status:'Scheduled'}});
      await create('facility',{name:'Aqua facility',status:'Restricted',notes:'Lane 3 closed for maintenance'});
      await create('equipment',{name:'Pump A',status:'Needs attention',notes:'Inspect bearing',nextDue:'2026-10-18'});
      await create('chemistry',{chlorine:2.5,ph:7.4,temperature:29,alkalinity:90,notes:'Opening'});
      await request('/api/records/chemistry','POST',{revision:rev,record:{chlorine:2,ph:20,temperature:29,alkalinity:90,notes:''}},400);
      const report=await create('reports',{category:'Incident',title:'Slip near deck',owner:'Sam',notes:'Area isolated; no identifying visitor details.'});
      await request('/api/records/reports/'+report.id,'PUT',{revision:rev,record:{...report,notes:'Deck dried and reopened.'}});
      assert.equal(workspace.reports[0].recordedAt,report.recordedAt);
      item=await create('inventory',{name:'Gloves',quantity:5,unit:'boxes',threshold:3});
      await request('/api/inventory/'+item.id+'/adjust','POST',{revision:rev,delta:-3,reason:'Daily use'});assert.equal(workspace.inventory[0].quantity,2);assert.equal(workspace.adjustments.length,2);
      await request('/api/inventory/'+item.id+'/adjust','POST',{revision:rev,delta:-99,reason:'Invalid'},400);assert.equal(workspace.inventory[0].quantity,2);
    });
    await t.test('inspection snapshots, results, corrective actions and schedule',async()=>{
      template=await create('templates',{name:'Daily opening',items:'Deck clear\nRescue equipment ready',nextDue:'2026-10-17'});
      await request('/api/inspections','POST',{revision:rev,templateId:template.id,results:[{result:'Pass',notes:''},{result:'Fail',notes:'Rescue tube damaged'}],owner:'Sam',due:'2026-10-18',nextDue:'2026-10-18'},201);
      const inspection=workspace.inspections[0];assert.equal(inspection.results[1].label,'Rescue equipment ready');
      const correction=workspace.tasks.find(t=>t.inspectionId===inspection.id);assert.ok(correction);assert.equal(correction.priority,'High');
      await request('/api/records/tasks/'+correction.id,'DELETE',{revision:rev},409);
      await request('/api/records/tasks/'+correction.id,'PUT',{revision:rev,record:{...correction,status:'Completed'}});
      await request('/api/records/templates/'+template.id,'PUT',{revision:rev,record:{...template,items:'New checklist item'}});
      assert.equal(workspace.inspections[0].results.length,2);
      await request('/api/inspections','POST',{revision:rev,templateId:template.id,results:[{result:'Fail',notes:''}],due:'2026-10-18',nextDue:'2026-10-19'},400);
    });
    await t.test('document upload, protected view/download and metadata edit',async()=>{
      await request('/api/documents/upload','POST',{revision:rev,name:'Opening procedure',category:'Procedures',file:{name:'opening.txt',base64:Buffer.from('Open procedure content').toString('base64')}},201);
      doc=workspace.documents[0];const bytes=await request('/api/files/'+doc.fileId);assert.equal(bytes,'Open procedure content');
      const anon=client();await request('/api/files/'+doc.fileId,'GET',null,401,anon);
      await request('/api/records/documents/'+doc.id,'PUT',{revision:rev,record:{name:'Updated procedure',category:'Procedures',url:''}});
      assert.equal(workspace.documents[0].fileId,doc.fileId);
      await request('/api/documents/upload','POST',{revision:rev,name:'Unsafe',category:'Procedures',file:{name:'unsafe.html',base64:Buffer.from('<script>alert(1)</script>').toString('base64')}},400);
    });
    await t.test('roles enforced by API, account lifecycle and password change',async()=>{
      for(const role of ['operator','viewer','manager'])await request('/api/users','POST',{username:role,name:role,role,password:'role-test-password-123'},201);
      const operator=client(),viewer=client(),manager=client();
      for(const [c,name] of [[operator,'operator'],[viewer,'viewer'],[manager,'manager']])await request('/api/login','POST',{username:name,password:'role-test-password-123'},200,c);
      const record={...task,name:'Operator maintenance'};
      await request('/api/records/tasks','POST',{revision:rev,record},200,operator);
      await request('/api/records/staff','POST',{revision:rev,record:staff},403,operator);
      await request('/api/records/tasks','POST',{revision:rev,record},403,viewer);
      await request('/api/backup','GET',null,403,manager);
      await request('/api/records/staff','POST',{revision:rev,record:{...staff,name:'Manager employee'}},200,manager);
      await request('/api/password','POST',{current:'role-test-password-123',password:'new-role-password-123'},200,operator);
      await request('/api/logout','POST',{},200,operator);await request('/api/workspace','GET',null,401,operator);
      await request('/api/login','POST',{username:'operator',password:'new-role-password-123'},200,operator);
      const users=await request('/api/users'),op=users.find(u=>u.username==='operator');
      await request('/api/users/'+op.id,'PATCH',{role:'operator',active:false});await request('/api/workspace','GET',null,401,operator);
      await request('/api/users/'+users.find(u=>u.username==='admin').id,'PATCH',{role:'viewer',active:false},400);
    });
    let backup;
    await t.test('backup contains files, import merge is atomic, and deletion works',async()=>{
      backup=await request('/api/backup');assert.ok(backup.files.some(f=>f.id===doc.fileId));assert.ok(!JSON.stringify(backup).includes('aqua-test-password'));
      await request('/api/import','POST',{state:backup.state,files:backup.files,revision:rev});
      const conflict=structuredClone(backup.state);conflict.tasks[0].name='Conflicting';const before=rev;
      await request('/api/import','POST',{state:conflict,revision:rev},409);assert.equal(rev,before);
      const legacy={version:1,tasks:[{id:'legacy-1',name:'Legacy task',status:'Scheduled',priority:'Normal',due:'',owner:''}],chemistry:[],reports:[],documents:[],inventory:[],adjustments:[],staff:[]};
      await request('/api/import','POST',{state:legacy,revision:rev});assert.ok(workspace.tasks.some(t=>t.id==='legacy-1'));
      await request('/api/records/tasks/legacy-1','DELETE',{revision:rev});assert.ok(!workspace.tasks.some(t=>t.id==='legacy-1'));
      const audit=await request('/api/audit');assert.ok(audit.some(a=>a.action==='Record inspection'));
    });
    await t.test('edit/delete across every mutable record type and static asset boundaries',async()=>{
      const fixtures={
        staff:{name:'Temporary employee',role:'Relief',email:'',notes:''},
        qualifications:{staffId:staff.id,name:'Temporary certification',expiry:'2029-01-01',reference:''},
        shifts:{staffId:staff.id,start:'2028-01-01T09:00',end:'2028-01-01T17:00',location:'Training'},
        tasks:{name:'Temporary task',status:'Scheduled',priority:'Normal',due:'',owner:'',category:'General'},
        reports:{title:'Temporary report',category:'Maintenance',owner:'Sam',notes:'Initial'},
        chemistry:{chlorine:1,ph:7,temperature:28,alkalinity:80,notes:'Initial'},
        documents:{name:'Temporary link',category:'Inspection records',url:'https://example.com/record'},
        inventory:{name:'Temporary supply',quantity:1,unit:'each',threshold:0},
        templates:{name:'Temporary checklist',items:'One check',nextDue:'2029-01-01'},
        equipment:{name:'Temporary equipment',status:'Running',notes:'',nextDue:''}
      };
      for(const [kind,record]of Object.entries(fixtures)){
        const row=await create(kind,record),key=Object.keys(record).find(k=>['name','notes','location','title'].includes(k)),changed={...row,[key]:'Updated value'};
        await request('/api/records/'+kind+'/'+row.id,'PUT',{revision:rev,record:changed});assert.equal(workspace[kind].find(r=>r.id===row.id)[key],'Updated value');
        await request('/api/records/'+kind+'/'+row.id,'DELETE',{revision:rev});assert.equal(workspace[kind].some(r=>r.id===row.id),false);
      }
      const facility=workspace.facility[0];await request('/api/records/facility/'+facility.id,'PUT',{revision:rev,record:{...facility,status:'Closed'}});assert.equal(workspace.facility[0].status,'Closed');
      await request('/api/records/facility/'+facility.id,'DELETE',{revision:rev});assert.equal(workspace.facility.length,0);
      for(const route of ['/','/style.css','/model.js','/script.js']){const response=await fetch(base+route);assert.equal(response.status,200);assert.ok((await response.text()).length>0);}
      assert.equal((await fetch(base+'/data/aquaops.sqlite')).status,404);assert.equal((await fetch(base+'/backend/app.js')).status,404);
      const blockedHost=await new Promise((resolve,reject)=>{require('node:http').get(base+'/',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject);});assert.equal(blockedHost,403);
    });
    await t.test('server restart preserves records, accounts, sessions and files',async()=>{
      const expected=JSON.stringify(workspace);await new Promise(r=>server.close(r));server=createServer({dataDir});await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
      await request('/api/workspace');assert.equal(JSON.stringify(workspace),expected);assert.equal(await request('/api/files/'+doc.fileId),'Open procedure content');
      assert.ok((await request('/api/users')).length>=4);
    });
    await t.test('backup restores into a separate empty facility database',async()=>{
      const restoreDir=fs.mkdtempSync(path.join(root,'restore-')),restored=createServer({dataDir:restoreDir});await new Promise(r=>restored.listen(0,'127.0.0.1',r));const previous=base;base=`http://127.0.0.1:${restored.address().port}`;const c=client();
      try{await request('/api/setup','POST',{token:fs.readFileSync(path.join(restoreDir,'setup-token.txt'),'utf8'),username:'recovery',name:'Recovery Admin',password:'recovery-password-123'},200,c);await request('/api/import','POST',{state:backup.state,files:backup.files,revision:0},200,c);assert.equal(await request('/api/files/'+doc.fileId,'GET',null,200,c),'Open procedure content');}finally{base=previous;await new Promise(r=>restored.close(r));}
    });
  }finally{await new Promise(r=>server.close(r));}
});
