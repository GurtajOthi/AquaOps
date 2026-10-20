'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const M=require('../frontend/model'),{createServer}=require('../server');
test('coverage counts interval gaps, qualifications and overnight availability',()=>{
  const s=M.blank();s.staff=[{id:'a',name:'A',role:'Guard',email:'',notes:''},{id:'b',name:'B',role:'Guard',email:'',notes:''}];
  s.qualifications=[{id:'qa',staffId:'a',name:'Lifeguard',expiry:'2028-01-01',reference:''}];
  s.shifts=[{id:'sa',staffId:'a',start:'2027-01-01T22:00',end:'2027-01-02T01:00',location:'Pool',requirements:''},{id:'sb',staffId:'b',start:'2027-01-02T01:00',end:'2027-01-02T06:00',location:'Pool',requirements:''}];
  const slot={start:'2027-01-01T22:00',end:'2027-01-02T06:00',location:'Pool',minimum:1,requirements:'Lifeguard'};
  assert.deepEqual(M.coverageGaps(s,slot),[{start:'2027-01-02T01:00',end:'2027-01-02T06:00',assigned:0,missing:1}]);
  s.availability=[{id:'av',staffId:'a',start:slot.start,end:slot.end,type:'Available',notes:''}];
  assert.match(M.schedulingIssues(s,'b',slot,{explicitAvailability:true}).join(';'),/availability/);
  assert.match(M.schedulingIssues(s,'b',slot).join(';'),/certifications/);
});
test('old v2 database receives a v4 upgrade without mutating saved values',()=>{const old={...M.blank(),version:2};delete old.availability;delete old.taskupdates;delete old.assignments;const next=M.upgrade(old);assert.equal(next.version,4);assert.equal(old.version,2);assert.deepEqual(next.availability,[]);assert.deepEqual(next.taskupdates,[]);assert.equal(old.availability,undefined);});
test('chemistry alerts use configured bounds only and include exact boundaries',()=>{const s=M.blank(),r={chlorine:2,ph:7.4};assert.deepEqual(M.chemistryAlerts(s,r),[]);s.thresholds=[{measurement:'chlorine',minimum:1,maximum:2}];assert.deepEqual(M.chemistryAlerts(s,r),[]);r.chlorine=2.1;assert.equal(M.chemistryAlerts(s,r).length,1);});
test('availability precedence and partial staffing gaps use exact intervals',()=>{
  const s=M.blank();s.staff=[{id:'a',name:'A',role:'Guard',email:'',notes:''}];const shift={id:'s',staffId:'a',start:'2027-03-01T09:00',end:'2027-03-01T17:00',location:'Pool',requirements:''};s.shifts=[shift];s.availability=[{id:'yes',staffId:'a',start:shift.start,end:shift.end,type:'Available',notes:''},{id:'no',staffId:'a',start:'2027-03-01T12:00',end:'2027-03-01T13:00',type:'Unavailable',notes:''}];
  assert.deepEqual(M.coverageGaps(s,{...shift,minimum:1}),[{start:'2027-03-01T12:00',end:'2027-03-01T13:00',assigned:0,missing:1}]);
  assert.match(M.schedulingIssues(s,'a',shift,{explicitAvailability:true}).join(),/unavailable/);
  s.availability=s.availability.filter(a=>a.type==='Available');s.availability[0].end='2027-03-01T12:00';s.availability.push({id:'yes2',staffId:'a',start:'2027-03-01T12:00',end:shift.end,type:'Available',notes:''});assert.deepEqual(M.schedulingIssues(s,'a',shift,{explicitAvailability:true}),[]);
});
test('adjacent shifts are allowed without reordering persisted records',()=>{
  const s=M.blank();s.staff=[{id:'a',name:'A',role:'Guard',email:'',notes:''}];const base={staffId:'a',location:'Pool',requirements:''};s.shifts=[{...base,id:'late',start:'2027-01-01T12:00',end:'2027-01-01T17:00'},{...base,id:'early',start:'2027-01-01T09:00',end:'2027-01-01T12:00'}];M.validate(s);assert.equal(s.shifts[0].id,'late');s.shifts[0].start='2027-01-01T11:59';assert.throws(()=>M.validate(s),/overlap/);
});
test('operations API enforces scheduling, approval, progress, privacy and recovery',async t=>{
  const root=path.join(__dirname,'../test-data');fs.mkdirSync(root,{recursive:true});const dataDir=fs.mkdtempSync(path.join(root,'operations-'));let server=createServer({dataDir});await new Promise(r=>server.listen(0,'127.0.0.1',r));let base=`http://127.0.0.1:${server.address().port}`,state,revision=0;
  function client(){return {cookie:'',csrf:'',async call(url,method='GET',data){const r=await fetch(base+url,{method,headers:{Cookie:this.cookie,'Content-Type':'application/json','X-AquaOps-Client':'1','X-CSRF-Token':this.csrf},...(data?{body:JSON.stringify({...data,revision})}:{})});const cookie=r.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];const body=r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text();if(body.csrf)this.csrf=body.csrf;return {status:r.status,body};}};}
  const admin=client(),operator=client(),viewer=client();
  async function req(url,method='GET',data,status=200,c=admin){const r=await c.call(url,method,data);assert.equal(r.status,status,JSON.stringify(r.body));if(r.body.state){state=r.body.state;revision=r.body.revision;}return r.body;}
  async function create(kind,record){await req('/api/records/'+kind,'POST',{record});return state[kind].at(-1);}
  try{
    await req('/api/setup','POST',{token:fs.readFileSync(path.join(dataDir,'setup-token.txt'),'utf8'),username:'admin',name:'Admin',password:'operations-test-password'});
    for(const role of ['operator','viewer'])await req('/api/users','POST',{username:role,name:role,role,password:'operations-test-password'},201);
    await req('/api/login','POST',{username:'operator',password:'operations-test-password'},200,operator);await req('/api/login','POST',{username:'viewer',password:'operations-test-password'},200,viewer);await req('/api/workspace');
    const staff=await create('staff',{name:'Qualified guard',role:'Guard',email:'',notes:''}),other=await create('staff',{name:'Unqualified guard',role:'Guard',email:'',notes:''});
    await create('qualifications',{staffId:staff.id,name:'Lifeguard',expiry:'2028-01-01',reference:'ABC'});
    await create('availability',{staffId:staff.id,start:'2027-02-01T08:00',end:'2027-02-01T18:00',type:'Available',notes:''});
    const slot=await create('coverage',{location:'Main pool',start:'2027-02-01T09:00',end:'2027-02-01T17:00',minimum:1,requirements:'Lifeguard'});
    await t.test('eligible replacements exclude missing qualifications/availability and require supervisor approval',async()=>{
      const candidates=await req('/api/coverage/'+slot.id+'/candidates');assert.equal(candidates.find(p=>p.staffId===staff.id).eligible,true);assert.equal(candidates.find(p=>p.staffId===other.id).eligible,false);
      await req('/api/coverage/'+slot.id+'/assign','POST',{staffId:other.id},400);await req('/api/coverage/'+slot.id+'/assign','POST',{staffId:staff.id},403,operator);
      await req('/api/coverage/'+slot.id+'/assign','POST',{staffId:staff.id});assert.equal(state.assignments.length,1);assert.equal(state.assignments[0].actor,'admin');assert.deepEqual(M.coverageGaps(state,slot),[]);
      await req('/api/coverage/'+slot.id+'/assign','POST',{staffId:staff.id},409);
    });
    await t.test('manual assignments reject unavailable employees, missing certifications and overlapping shifts',async()=>{
      await req('/api/records/shifts','POST',{record:{staffId:other.id,start:slot.start,end:slot.end,location:'Main pool',requirements:'Lifeguard'}},400);
      await create('availability',{staffId:other.id,start:'2027-02-02T09:00',end:'2027-02-02T17:00',type:'Unavailable',notes:'Leave'});
      await req('/api/records/shifts','POST',{record:{staffId:other.id,start:'2027-02-02T10:00',end:'2027-02-02T16:00',location:'Pool',requirements:''}},400);
      await req('/api/records/shifts','POST',{record:{staffId:staff.id,start:slot.start,end:slot.end,location:'Other pool',requirements:''}},400);
    });
    let task,photo;
    await t.test('inactive employees retain history but cannot fill staffing requirements or receive new shifts',async()=>{
      await req('/api/records/staff/'+staff.id,'PUT',{record:{...staff,status:'Inactive'}});assert.ok(M.coverageGaps(state,slot).length);assert.match((await req('/api/coverage/'+slot.id+'/candidates')).find(p=>p.staffId===staff.id).issues.join(),/inactive/);
      await req('/api/records/shifts','POST',{record:{staffId:staff.id,start:'2027-02-01T08:00',end:'2027-02-01T09:00',location:'Pool',requirements:'Lifeguard'}},400);assert.equal(state.shifts.length,1);assert.equal(state.qualifications.length,1);await req('/api/records/staff/'+staff.id,'PUT',{record:{...staff,status:'Active'}});assert.deepEqual(M.coverageGaps(state,slot),[]);
    });
    await t.test('task progress photos persist, update completion and reject invalid uploads atomically',async()=>{
      task=await create('tasks',{name:'Repair filter',status:'Scheduled',priority:'High',due:'2027-02-02',owner:staff.name,category:'Maintenance'});
      const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDm0AAAAASUVORK5CYII=';
      await req('/api/tasks/'+task.id+'/progress','POST',{notes:'Filter inspected',completion:50,file:{name:'filter.png',base64:png}},201,operator);assert.equal(state.tasks.find(t=>t.id===task.id).status,'In Progress');photo=state.taskupdates[0];assert.equal(photo.actor,'operator');
      const image=await fetch(base+'/api/files/'+photo.fileId,{headers:{Cookie:operator.cookie}});assert.equal(image.status,200);assert.ok((await image.arrayBuffer()).byteLength>10);
      const before=revision;await req('/api/tasks/'+task.id+'/progress','POST',{notes:'Invalid',completion:101},400);assert.equal(revision,before);
      await req('/api/tasks/'+task.id+'/progress','POST',{notes:'Completed repair',completion:100},201);assert.equal(state.tasks.find(t=>t.id===task.id).status,'Completed');
      await req('/api/records/tasks/'+task.id,'DELETE',{},409);
    });
    await t.test('facility limits and corrective actions create retained, assigned follow-up tasks',async()=>{
      await create('thresholds',{measurement:'chlorine',minimum:1,maximum:3,notes:'Test facility procedure'});
      const reading=await create('chemistry',{chlorine:4,ph:7.4,temperature:29,alkalinity:90,notes:'Check'});assert.equal(M.chemistryAlerts(state,reading).length,1);
      const action=await create('chemistryactions',{readingId:reading.id,action:'Retest after supervisor review',owner:staff.name,due:'2027-02-02'});assert.ok(state.tasks.find(t=>t.id===action.taskId));
      await req('/api/records/chemistry/'+reading.id,'DELETE',{},409);await req('/api/records/thresholds','POST',{record:{measurement:'ph',minimum:9,maximum:7,notes:'Invalid'}},400);
    });
    let incidentFile;
    await t.test('backdated measurements preserve saved timestamps and reminder configuration is supervisor-only',async()=>{
      const record={chlorine:1.5,ph:7.2,temperature:28,alkalinity:85,notes:'Back-entered reading',measuredAt:'2020-01-01T09:00'};await req('/api/records/chemistry','POST',{record});const reading=state.chemistry.at(-1);assert.ok(Date.parse(reading.recordedAt)>Date.parse('2020-01-01'));assert.notEqual(M.latestChemistry(state).id,reading.id);await req('/api/records/chemistry','POST',{record:{...record,measuredAt:'2099-01-01T09:00'}},400);
      const facility=await create('facility',{name:'Pool',status:'Not assessed',notes:'Configured operating procedure',chemistryInterval:60});await req('/api/records/facility/'+facility.id,'PUT',{record:{...facility,chemistryInterval:120}},403,operator);const operational={name:facility.name,status:'Restricted',notes:'Operator status observation'};await req('/api/records/facility/'+facility.id,'PUT',{record:operational},200,operator);assert.equal(state.facility[0].chemistryInterval,60);assert.equal(state.facility[0].status,'Restricted');
    });
    await t.test('editing chemistry actions creates or updates follow-up tasks without undoing independent task changes',async()=>{
      const reading=state.chemistry[0];let action=await create('chemistryactions',{readingId:reading.id,action:'Observe and review',owner:'Guard',due:''});assert.equal(action.taskId,undefined);
      await req('/api/records/chemistryactions/'+action.id,'PUT',{record:{...action,due:'2027-02-03'}});action=state.chemistryactions.find(a=>a.id===action.id);let task=state.tasks.find(t=>t.id===action.taskId);assert.ok(task);assert.equal(task.createdBy,'admin');assert.ok(task.createdAt);
      await req('/api/records/tasks/'+task.id,'PUT',{record:{...task,status:'Completed',due:'2027-02-04'}});await req('/api/records/chemistryactions/'+action.id,'PUT',{record:{...action,action:'Updated observation'}});task=state.tasks.find(t=>t.id===action.taskId);assert.equal(task.due,'2027-02-04');assert.equal(task.status,'Completed');assert.match(task.name,/Updated observation/);
      action=state.chemistryactions.find(a=>a.id===action.id);await req('/api/records/chemistryactions/'+action.id,'PUT',{record:{...action,owner:'New owner',due:'2027-02-05'}});task=state.tasks.find(t=>t.id===action.taskId);assert.equal(task.owner,'New owner');assert.equal(task.due,'2027-02-05');assert.equal(task.status,'Completed');await req('/api/records/chemistryactions/'+action.id,'PUT',{record:{...action,due:''}},400);
      const audit=await req('/api/audit');assert.ok(audit.some(a=>a.action==='Update chemistry follow-up task'));await req('/api/workspace');
    });
    await t.test('restricted incident data stays absent from reads, mutations and file retrieval for lower roles',async()=>{
      const privateIncident=await create('incidents',{title:'PRIVATE-INCIDENT',occurredAt:'2027-02-01T10:00',location:'Deck',severity:'Moderate',description:'Restricted details',response:'Supervisor reviewed',status:'Open'});
      await create('reports',{category:'Incident',title:'PRIVATE-LEGACY',owner:'Admin',notes:'Restricted legacy narrative'});
      await req('/api/documents/upload','POST',{name:'PRIVATE-DOCUMENT',category:' incident RECORDS ',access:'All staff',file:{name:'incident.txt',base64:Buffer.from('PRIVATE-FILE').toString('base64')}},201);incidentFile=state.documents.find(d=>d.name==='PRIVATE-DOCUMENT');
      assert.equal(incidentFile.access,'Supervisors');
      const progressDocument=state.documents.find(d=>d.fileId===photo.fileId);await req('/api/records/documents/'+progressDocument.id,'PUT',{record:{...progressDocument,name:'PRIVATE-PROGRESS',access:'Supervisors'}});
      const aliasBackup=await req('/api/backup');aliasBackup.state.documents.push({...progressDocument,id:'public-alias',name:'PUBLIC-ALIAS',access:'All staff'});await req('/api/import','POST',{state:aliasBackup.state,files:aliasBackup.files});
      const read=await req('/api/workspace','GET',null,200,viewer);assert.ok(!JSON.stringify(read).includes('PRIVATE-'));assert.equal(read.state.incidents.length,0);
      assert.ok(!read.state.documents.some(d=>d.fileId===photo.fileId));
      const visibleProgress=read.state.taskupdates.find(u=>u.id===photo.id);assert.equal(visibleProgress.fileId,undefined);assert.equal(visibleProgress.fileName,undefined);assert.equal(visibleProgress.attachmentRestricted,true);await req('/api/files/'+photo.fileId,'GET',null,404,viewer);
      const mutation=await req('/api/records/tasks','POST',{record:{name:'Public task',status:'Scheduled',priority:'Normal',due:'',owner:'',category:'General'}},200,operator);assert.ok(!JSON.stringify(mutation).includes('PRIVATE-'));
      await req('/api/files/'+incidentFile.fileId,'GET',null,404,viewer);await req('/api/records/incidents/'+privateIncident.id,'PUT',{record:privateIncident},403,operator);
      await req('/api/records/reports','POST',{record:{category:'Incident',title:'Not allowed',owner:'Op',notes:'Restricted'}},403,operator);await req('/api/workspace');
    });
    await t.test('a revoked session cannot finish a write whose body was already in flight',async()=>{
      await req('/api/users','POST',{username:'revoked',name:'Revocation test',role:'operator',password:'revocation-test-password'},201);const account=client();await req('/api/login','POST',{username:'revoked',password:'revocation-test-password'},200,account);
      const users=await req('/api/users'),target=users.find(u=>u.username==='revoked');
      let received;const started=new Promise(r=>{received=request=>{if(request.url==='/api/records/tasks'){server.off('request',received);r();}};server.on('request',received);});
      let write;const response=new Promise((resolve,reject)=>{write=require('node:http').request(base+'/api/records/tasks',{method:'POST',headers:{Cookie:account.cookie,'Content-Type':'application/json','X-AquaOps-Client':'1','X-CSRF-Token':account.csrf}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});write.on('error',reject);});
      write.write('{"revision":'+revision+',"record":');await started;
      await req('/api/users/'+target.id,'PATCH',{role:'operator',active:false});
      write.end(JSON.stringify({name:'Revoked write',status:'Scheduled',priority:'Normal',due:'',owner:'',category:'General'})+'}');assert.equal(await response,401);
      await req('/api/workspace');assert.ok(!state.tasks.some(t=>t.name==='Revoked write'));
    });
    await t.test('operators submit confidential incidents without receiving private records or closure rights',async()=>{
      const result=await req('/api/records/incidents','POST',{record:{title:'CONFIDENTIAL-OPERATOR-REPORT',occurredAt:'2027-02-01T11:00',location:'Deck',severity:'Moderate',description:'PRIVATE-SUBMISSION-DETAILS',response:'Immediate facility response recorded',status:'Closed'}},200,operator);assert.match(result.reference,/^[a-f0-9-]{36}$/);assert.equal(result.state.incidents.length,0);assert.ok(!JSON.stringify(result).includes('PRIVATE-'));
      await req('/api/workspace');const incident=state.incidents.find(i=>i.id===result.reference);assert.equal(incident.status,'Open');assert.equal(incident.createdBy,'operator');await req('/api/records/incidents/'+incident.id,'DELETE',{},403,operator);await req('/api/records/incidents/'+incident.id,'PUT',{record:{...incident,status:'Closed'}},403,operator);await req('/api/records/incidents','POST',{record:incident},403,viewer);await req('/api/workspace');
    });
    await t.test('unexpected stored account roles fail closed',async()=>{
      const db=new(require('node:sqlite').DatabaseSync)(path.join(dataDir,'aquaops.sqlite'));
      try{db.prepare('UPDATE users SET role=? WHERE username=?').run('unknown-role','operator');await req('/api/workspace','GET',null,401,operator);}finally{db.prepare('UPDATE users SET role=? WHERE username=?').run('operator','operator');db.close();}
    });
    await t.test('new records survive restart and backup merge includes operational history and files',async()=>{
      const analytics=await req('/api/analytics?category=Maintenance');assert.equal(analytics.totalCompletions,1);assert.equal((await req('/api/analytics?category=Safety')).totalCompletions,1);assert.equal((await req('/api/analytics?from=2099-01-01')).totalCompletions,0);await req('/api/analytics?from=2027-02-30','GET',null,400);
      const backup=await req('/api/backup');assert.equal(backup.state.assignments.length,1);assert.equal(backup.state.taskupdates.length,2);assert.ok(backup.files.find(f=>f.id===photo.fileId));
      await new Promise(r=>server.close(r));server=createServer({dataDir});await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
      await req('/api/workspace');assert.equal(state.assignments.length,1);assert.equal(state.taskupdates.length,2);assert.equal(state.incidents.length,2);
      await req('/api/import','POST',{state:backup.state,files:backup.files});assert.equal(state.taskupdates.length,2);
    });
  }finally{await new Promise(r=>server.close(r));}
});
