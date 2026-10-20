'use strict';
const {DatabaseSync}=require('node:sqlite');
const {randomBytes,randomUUID,createHash,scrypt,timingSafeEqual}=require('node:crypto');
const {promisify}=require('node:util');
const fs=require('node:fs');
const path=require('node:path');
const {AsyncLocalStorage}=require('node:async_hooks');
const M=require('../frontend/model');
const derive=promisify(scrypt), sha=s=>createHash('sha256').update(s).digest('hex');
const fail=(code,message)=>{const e=Error(message);e.status=code;throw e;};
const roles=['admin','manager','operator','viewer','employee'];
const operational=['tasks','reports','inventory','chemistry','chemistryactions','equipment','facility'];
const supervisor=user=>['admin','manager'].includes(user.role);
const restrictedDocument=d=>d.access==='Supervisors'||String(d.category).trim().toLowerCase()==='incident records';
const collections=[...Object.keys(M.schemas),'adjustments','inspections','taskupdates','assignments'];
function publicState(state,user){
  if(user.role==='employee')return M.blank();
  if(supervisor(user))return state;
  const restrictedFiles=new Set(state.documents.filter(restrictedDocument).map(d=>d.fileId).filter(Boolean));
  const filtered=structuredClone(state);filtered.incidents=[];filtered.reports=filtered.reports.filter(r=>r.category!=='Incident');filtered.documents=filtered.documents.filter(d=>!restrictedDocument(d)&&!restrictedFiles.has(d.fileId));
  filtered.taskupdates=filtered.taskupdates.map(update=>{if(!restrictedFiles.has(update.fileId))return update;const {fileId,fileName,...shared}=update;return {...shared,attachmentRestricted:true};});return filtered;
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function createApp({dataDir=path.join(__dirname,'../data')}={}){
  const absoluteData=path.resolve(dataDir).replace(/[\\/]+$/,''),dataLocation=sha(process.platform==='win32'?absoluteData.toLowerCase():absoluteData);
  fs.mkdirSync(dataDir,{recursive:true});
  const db=new DatabaseSync(path.join(dataDir,'aquaops.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS workspace(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT UNIQUE COLLATE NOCASE NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL,password TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,userId TEXT NOT NULL,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,name TEXT NOT NULL,type TEXT NOT NULL,bytes BLOB NOT NULL);
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,at TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,before TEXT,after TEXT);
    CREATE TABLE IF NOT EXISTS app_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
  `);
  if(fs.existsSync(path.join(dataDir,'demo-marker.json')))db.prepare("INSERT OR IGNORE INTO app_metadata VALUES('mode','demo')").run();
  const demoMode=db.prepare("SELECT value FROM app_metadata WHERE key='mode'").get()?.value==='demo';
  db.prepare('INSERT OR IGNORE INTO workspace VALUES(1,0,?)').run(JSON.stringify({...M.blank(),...(demoMode?{demo:true}:{})}));
  const setupFile=path.join(dataDir,'setup-token.txt');
  if(!db.prepare('SELECT id FROM users LIMIT 1').get()&&!fs.existsSync(setupFile))fs.writeFileSync(setupFile,randomBytes(24).toString('hex'),{mode:0o600});
  const loginAttempts=new Map();
  const requestContext=new AsyncLocalStorage();
  const load=()=>{const row=db.prepare('SELECT * FROM workspace WHERE id=1').get();return {revision:row.revision,state:M.upgrade(JSON.parse(row.body))};};
  const audit=(actor,action,before,after)=>db.prepare('INSERT INTO audit(at,actor,action,before,after) VALUES(?,?,?,?,?)').run(new Date().toISOString(),actor,action,before==null?null:JSON.stringify(before),after==null?null:JSON.stringify(after));
  function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const context=requestContext.getStore();if(context?.user){const current=session(context.req);if(!current||current.id!==context.user.id||current.role!==context.user.role)fail(401,'Your account or session changed. Sign in again before saving.');}const value=fn();db.exec('COMMIT');return value;}catch(e){db.exec('ROLLBACK');throw e;}}
  function save(next,revision,user,action,before,after){
    M.validate(next);
    const result=db.prepare('UPDATE workspace SET body=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(next),revision);
    if(!result.changes)fail(409,'Another user changed the workspace. Refresh data before retrying; your form has been kept.');
    audit(user.username,action,before,after);return {state:next,revision:revision+1};
  }
  const accountVersion=u=>sha(JSON.stringify([u.id,u.username,u.name,u.role,u.active,u.password,portal.linked(u)]));
  const publicUser=u=>({id:u.id,username:u.username,name:u.name,role:u.role,active:!!u.active,version:accountVersion(u),staffId:portal.linked(u)});
  async function hashPassword(password){if(typeof password!=='string'||password.length<12||password.length>256)fail(400,'Use a password between 12 and 256 characters.');const salt=randomBytes(16).toString('hex');return salt+':'+Buffer.from(await derive(password,salt,64)).toString('hex');}
  async function checkPassword(password,encoded){if(typeof encoded!=='string'||!/^(?:[a-f0-9]{32}|dummy-salt):[a-f0-9]{128}$/.test(encoded))return false;const [salt,key]=encoded.split(':');const actual=Buffer.from(await derive(String(password),salt,64));return timingSafeEqual(actual,Buffer.from(key,'hex'));}
  function cookie(res,token){res.setHeader('Set-Cookie',`aquaops_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token?28800:0}`);}
  function session(req){const match=(req.headers.cookie||'').match(/(?:^|;\s*)aquaops_session=([a-f0-9]{64})(?:;|$)/);if(!match)return null;const found=db.prepare('SELECT users.*,sessions.csrf,sessions.expires FROM sessions JOIN users ON users.id=sessions.userId WHERE token=? AND expires>? AND active=1').get(sha(match[1]),Date.now());if(!found||!roles.includes(found.role))return null;if(found.role==='employee'&&!load().state.staff.some(p=>p.id===portal.linked(found)&&p.status!=='Inactive'))return null;return found;}
  function startSession(res,user){const token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex'),expiresAt=Date.now()+8*3600000;db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(sha(token),user.id,csrf,expiresAt);cookie(res,token);return {user:publicUser(user),csrf,expiresAt};}
  function permit(user,kind,deleting=false){if(user.role==='employee'||user.role==='viewer'||(user.role==='operator'&&(!operational.includes(kind)||(deleting&&kind!=='tasks'))))fail(403,'Your role does not allow this change.');}
  async function body(req){
    if(!String(req.headers['content-type']||'').startsWith('application/json'))fail(415,'Send application/json.');
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>32*1024*1024)fail(413,'Request too large (32 MB maximum).');chunks.push(chunk);}
    let data;try{data=JSON.parse(Buffer.concat(chunks).toString());}catch{fail(400,'Invalid JSON request.');}if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'Request must be a JSON object.');return data;
  }
  function json(res,code,value){if(value?.state&&res.aquaUser){value={...value,state:publicState(value.state,res.aquaUser)};if(supervisor(res.aquaUser)&&!value.format)value.taskAssignments=db.prepare('SELECT * FROM task_staff').all();}res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}
  function cleanRecord(kind,input,old,user){
    if(!input||typeof input!=='object')fail(400,'Missing record.');
    const record={id:old?.id||randomUUID()};
    for(const key of Object.keys(M.schemas[kind]))record[key]=input[key]??'';
    if(kind==='staff')record.status=input.status||old?.status||'Active';
    if(['chemistry','reports','chemistryactions','incidents'].includes(kind)){record.recordedAt=old?old.recordedAt:new Date().toISOString();record.legacyTime=old?.legacyTime||'';}
    record.createdBy=old?(old.createdBy||''):user.username;
    record.updatedAt=new Date().toISOString();record.updatedBy=user.username;
    if(old?.createdAt)record.createdAt=old.createdAt;else if(!old)record.createdAt=record.updatedAt;
    if(kind==='documents'&&old?.fileId){record.fileId=old.fileId;record.fileName=old.fileName;record.url='';for(const key of ['taskId','inspectionId','evidenceNotes','recordedAt'])if(old[key]!==undefined)record[key]=old[key];}
    if(kind==='tasks'&&old?.inspectionId)record.inspectionId=old.inspectionId;
    if(kind==='tasks')record.equipmentId=input.equipmentId??old?.equipmentId??'';
    if(kind==='chemistry')record.additional=M.captureAdditional(load().state,input.additional,old);
    if(kind==='tasks'&&old?.chemistryActionId)record.chemistryActionId=old.chemistryActionId;
    if(kind==='chemistryactions'&&old?.taskId)record.taskId=old.taskId;
    if(kind==='documents'){record.access=input.access||old?.access||'All staff';if(!['All staff','Supervisors'].includes(record.access))fail(400,'Invalid document access.');if(restrictedDocument(record))record.access='Supervisors';}
    if(kind==='incidents'&&!supervisor(user))record.status='Open';
    if(kind==='chemistry'&&record.measuredAt&&Date.parse(record.measuredAt)>Date.now()+5*60000)fail(400,'Measurement time cannot be more than five minutes ahead of this facility computer. Check the date and time zone.');
    if(kind==='facility'&&!supervisor(user)){if(input.chemistryInterval!==undefined&&input.chemistryInterval!==(old?.chemistryInterval??''))fail(403,'Only supervisors can configure chemistry reminder intervals.');record.chemistryInterval=old?.chemistryInterval??'';}
    return record;
  }
  function stockHistory(next,old,record,user,reason){const delta=record.quantity-(old?.quantity||0);if(delta)next.adjustments.push({id:randomUUID(),itemId:record.id,name:record.name,delta,unit:record.unit,reason,recordedAt:new Date().toISOString(),actor:user.username});}
  function chemistryFollowup(state,record,old,user){
    const metadata={updatedAt:record.updatedAt,updatedBy:user.username};
    if(!record.taskId&&record.due){record.taskId=randomUUID();const task={id:record.taskId,name:'Chemistry follow-up: '+String(record.action).slice(0,120),status:'Scheduled',priority:'High',due:record.due,owner:record.owner,category:'Safety',chemistryActionId:record.id,createdAt:record.updatedAt,createdBy:user.username,...metadata};state.tasks.push(task);audit(user.username,'Create chemistry follow-up task',null,task);return;}
    if(record.taskId){if(!record.due)fail(400,'A linked follow-up task requires a due date. Manage completion or reopening on Tasks.');const task=state.tasks.find(t=>t.id===record.taskId),before={...task};if(record.action!==old?.action)task.name='Chemistry follow-up: '+String(record.action).slice(0,120);if(record.owner!==old?.owner)task.owner=record.owner;if(record.due!==old?.due)task.due=record.due;if(!same(task,before)){Object.assign(task,metadata);audit(user.username,'Update chemistry follow-up task',before,task);}}
  }
  const fileTypes={'.pdf':'application/pdf','.txt':'text/plain','.csv':'text/csv','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'};
  function parseFile(f){
    if(!f||typeof f.name!=='string'||f.name.length>200||!f.name.trim()||/[\x00-\x1f]/.test(f.name)||typeof f.base64!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(f.base64))fail(400,'Invalid file.');
    const name=path.basename(f.name),type=fileTypes[path.extname(name).toLowerCase()];
    const bytes=Buffer.from(f.base64,'base64');if(!type||!bytes.length||bytes.length>5*1024*1024)fail(400,'Upload PDF, TXT, CSV, PNG or JPEG files, up to 5 MB.');
    if((type==='application/pdf'&&!bytes.subarray(0,5).equals(Buffer.from('%PDF-')))||(type==='image/png'&&!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))||(type==='image/jpeg'&&(bytes.length<3||bytes.readUInt16BE(0)!==0xffd8)))fail(400,'File content does not match its extension.');
    return {name,type,bytes};
  }
  const portal=require('./portal').createPortal({db,load,save,transaction,audit,parseFile});
  async function handle(req,res){
    const url=new URL(req.url,'http://localhost'),route=url.pathname;
    if(!route.startsWith('/api/'))return false;
    try{
      const mutating=!['GET','HEAD'].includes(req.method);
      if(mutating){const origin=req.headers.origin;const expected=`http://${req.headers.host}`;if((origin&&origin!==expected)||req.headers['sec-fetch-site']==='cross-site')fail(403,'Cross-site request denied.');if(req.headers['x-aquaops-client']!=='1')fail(403,'Missing application request header.');}
      let user=session(req);
      if(route==='/api/session'&&req.method==='GET'){json(res,200,{app:'AquaOps',protocol:10,dataLocation,demo:demoMode,...(user?{user:publicUser(user),csrf:user.csrf,expiresAt:user.expires}:{user:null,setupRequired:!db.prepare('SELECT id FROM users LIMIT 1').get()})});return true;}
      if(['/api/setup','/api/login'].includes(route)&&req.method==='POST'){
        const key=req.socket.remoteAddress,attempt=loginAttempts.get(key);if(attempt&&attempt.until>Date.now()&&attempt.count>=20)fail(429,'Too many authentication attempts. Wait 15 minutes.');
        loginAttempts.set(key,{count:(attempt?.until>Date.now()?attempt.count:0)+1,until:attempt?.until>Date.now()?attempt.until:Date.now()+900000});
        const data=await body(req);if(typeof data.password!=='string'||data.password.length>256)fail(400,'Invalid password.');
        if(route==='/api/setup'){
          if(db.prepare('SELECT id FROM users LIMIT 1').get())fail(409,'Administrator already exists. Sign in.');
          if(typeof data.token!=='string'||!fs.existsSync(setupFile)||sha(data.token.trim())!==sha(fs.readFileSync(setupFile,'utf8').trim()))fail(403,'Incorrect setup token. Read data/setup-token.txt on this computer.');
          if(typeof data.username!=='string'||!/^[a-zA-Z0-9._-]{3,64}$/.test(data.username)||typeof data.name!=='string'||!data.name.trim()||data.name.length>150)fail(400,'Enter a name and a username of 3–64 letters, numbers, dots, dashes or underscores.');
          const encoded=await hashPassword(data.password);
          user=transaction(()=>{if(db.prepare('SELECT id FROM users LIMIT 1').get())fail(409,'Administrator already exists.');const id=randomUUID();db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(id,data.username,data.name.trim(),'admin',encoded);audit(data.username,'Setup administrator',null,{id});return db.prepare('SELECT * FROM users WHERE id=?').get(id);});
          // The setup token is no longer accepted once an account exists; keep file for recovery records.
        }else{
          const found=typeof data.username==='string'?db.prepare('SELECT * FROM users WHERE username=? AND active=1').get(data.username):null;
          const encoded=found?.password||'dummy-salt:'+ '00'.repeat(64);
          if(!(await checkPassword(data.password,encoded))||!found)fail(401,'Incorrect username or password.');const current=db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(found.id);if(!current||current.password!==found.password)fail(401,'Your account changed. Sign in again.');user=current;
        }
        if(!roles.includes(user.role))fail(401,'This account is unavailable. Contact an administrator.');if(user.role==='employee')portal.profile(user);
        loginAttempts.delete(key);json(res,200,startSession(res,user));return true;
      }
      if(!user)fail(401,'Sign in to use AquaOps.');
      res.aquaUser=user;
      requestContext.getStore().user=user;
      if(mutating&&req.headers['x-csrf-token']!==user.csrf)fail(403,'Session token is missing or expired. Reload and sign in again.');
      if(route==='/api/logout'&&req.method==='POST'){const token=(req.headers.cookie||'').match(/aquaops_session=([a-f0-9]{64})/);if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(sha(token[1]));cookie(res,'');json(res,200,{ok:true});return true;}
      if(route==='/api/password'&&req.method==='POST'){const data=await body(req);if(!await checkPassword(data.current,user.password))fail(403,'Current password is incorrect.');const password=await hashPassword(data.password);transaction(()=>{db.prepare('UPDATE users SET password=? WHERE id=?').run(password,user.id);db.prepare('DELETE FROM sessions WHERE userId=?').run(user.id);audit(user.username,'Change own password',null,null);});json(res,200,startSession(res,user));return true;}
      if(['/api/alerts','/api/employee','/api/management'].some(prefix=>route===prefix||route.startsWith(prefix+'/'))){const result=await portal.handle(route,req,user,mutating?await body(req):null);if(result===null)fail(404,'Portal route not found.');json(res,200,result);return true;}
      if(user.role==='employee'&&!/^\/api\/files\/[a-zA-Z0-9-]+$/.test(route))fail(403,'This action requires an operational or supervisor account. Use your employee portal.');
      if(route==='/api/workspace'&&req.method==='GET'){json(res,200,load());return true;}
      if(route==='/api/users'){
        if(user.role!=='admin')fail(403,'Administrator access required.');
        if(req.method==='GET'){json(res,200,db.prepare('SELECT * FROM users ORDER BY username').all().map(publicUser));return true;}
        if(req.method==='POST'){
          const data=await body(req);if(typeof data.username!=='string'||!/^[a-zA-Z0-9._-]{3,64}$/.test(data.username)||typeof data.name!=='string'||!data.name.trim()||data.name.length>150||!roles.includes(data.role))fail(400,'Enter a valid username, display name and role.');
          const password=await hashPassword(data.password),id=randomUUID();transaction(()=>{if(db.prepare('SELECT id FROM users WHERE username=?').get(data.username))fail(409,'Username already exists.');db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(id,data.username,data.name,data.role,password);portal.bind(id,data.staffId||'',data.role);audit(user.username,'Create account',null,{id,username:data.username,role:data.role});});json(res,201,{id});return true;
        }
      }
      const account=route.match(/^\/api\/users\/([a-zA-Z0-9-]+)$/);
      if(account&&req.method==='PATCH'){
        if(user.role!=='admin')fail(403,'Administrator access required.');const data=await body(req),target=db.prepare('SELECT * FROM users WHERE id=?').get(account[1]);if(!target)fail(404,'Account not found.');if(!roles.includes(data.role)||typeof data.active!=='boolean'||(data.version!==undefined&&(typeof data.version!=='string'||!/^[a-f0-9]{64}$/.test(data.version))))fail(400,'Invalid role, active state or account version.');
        const expectedVersion=data.version||accountVersion(target),password=data.password?await hashPassword(data.password):target.password;
        transaction(()=>{
          const current=db.prepare('SELECT * FROM users WHERE id=?').get(target.id);if(!current||accountVersion(current)!==expectedVersion)fail(409,'This account changed. Refresh the account list and review its current settings before retrying.');const before=publicUser(current);
          if(target.id===user.id&&(data.role!=='admin'||!data.active))fail(400,'You cannot demote or disable your own administrator account.');
          db.prepare('UPDATE users SET role=?,active=?,password=? WHERE id=?').run(data.role,Number(data.active),password,target.id);portal.bind(target.id,data.staffId===undefined?portal.linked(target):data.staffId,data.role);db.prepare('DELETE FROM sessions WHERE userId=?').run(target.id);audit(user.username,'Update account',before,publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(target.id)));
        });json(res,200,{ok:true});return true;
      }
      if(route==='/api/audit'&&req.method==='GET'){if(!['admin','manager'].includes(user.role))fail(403,'Manager access required.');json(res,200,db.prepare('SELECT id,at,actor,action FROM audit ORDER BY id DESC LIMIT 300').all());return true;}
      if(route==='/api/backups'&&req.method==='GET'){
        if(user.role!=='admin')fail(403,'Administrator access required.');const root=path.resolve(dataDir,'backups');const backups=fs.existsSync(root)?fs.readdirSync(root).filter(name=>/^full-[a-zA-Z0-9-]+\.sqlite$/.test(name)).flatMap(name=>{const stat=fs.lstatSync(path.join(root,name));return stat.isFile()&&!stat.isSymbolicLink()?[{name,size:stat.size,modifiedAt:stat.mtime.toISOString()}]:[];}).sort((a,b)=>b.modifiedAt.localeCompare(a.modifiedAt)).slice(0,20):[];json(res,200,{backups,scope:'Protected local snapshots only; arrange off-device copies and rehearse recovery.'});return true;
      }
      if(route==='/api/backups'&&req.method==='POST'){
        if(user.role!=='admin')fail(403,'Administrator access required.');await body(req);const current=session(req);if(!current||current.id!==user.id||current.role!=='admin')fail(401,'Your administrator session changed. Sign in again.');const snapshot=await require('../tools/storage.cjs').createBackup({dataDir});transaction(()=>audit(user.username,'Create verified local full backup',null,{name:path.basename(snapshot.file),revision:snapshot.revision,records:snapshot.records}));json(res,201,{name:path.basename(snapshot.file),integrity:snapshot.integrity,revision:snapshot.revision,records:snapshot.records});return true;
      }
      if(route==='/api/backups/verify'&&req.method==='POST'){
        if(user.role!=='admin')fail(403,'Administrator access required.');const data=await body(req),current=session(req);if(!current||current.id!==user.id||current.role!=='admin')fail(401,'Your administrator session changed. Sign in again.');if(typeof data.name!=='string'||!/^full-[a-zA-Z0-9-]+\.sqlite$/.test(data.name))fail(400,'Choose a completed full snapshot from this workspace.');const file=path.resolve(dataDir,'backups',data.name);if(!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink()||!fs.lstatSync(file).isFile())fail(404,'Snapshot not found.');const verified=require('../tools/storage.cjs').verifyBackup(file);json(res,200,{name:data.name,integrity:verified.integrity,revision:verified.revision,records:verified.records});return true;
      }
      if(route==='/api/analytics'&&req.method==='GET'){
        const from=url.searchParams.get('from')||'',to=url.searchParams.get('to')||'',category=url.searchParams.get('category')||'All';if((from&&!M.validDate(from))||(to&&!M.validDate(to))||(from&&to&&from>to)||!['All',...M.schemas.tasks.category[1]].includes(category))fail(400,'Invalid analytics date range or task category.');
        const counts=new Map();for(const row of db.prepare("SELECT at,before,after FROM audit WHERE action IN ('POST tasks','PUT tasks','Record task progress','Employee task progress') ORDER BY id").all()){
          const before=row.before?JSON.parse(row.before):null,after=row.after?JSON.parse(row.after):null,d=new Date(row.at),date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          if(after?.status==='Completed'&&before?.status!=='Completed'&&(!from||date>=from)&&(!to||date<=to)&&(category==='All'||(after.category||before?.category)===category))counts.set(date,(counts.get(date)||0)+1);
        }
        json(res,200,{completionEvents:[...counts].map(([date,count])=>({date,count})),totalCompletions:[...counts.values()].reduce((a,b)=>a+b,0)});return true;
      }
      if(route==='/api/backup'&&req.method==='GET'){
        if(user.role!=='admin')fail(403,'Administrator access required.');
        const data={...load(),format:'aquaops-backup-v4',scope:'Operational merge only. Use a full SQLite backup for accounts, linked employee identities, requests, permissions, read state and audit.',files:db.prepare('SELECT * FROM files').all().map(f=>({id:f.id,name:f.name,base64:Buffer.from(f.bytes).toString('base64')}))};
        res.setHeader('Content-Disposition','attachment; filename="aquaops-backup.json"');json(res,200,data);return true;
      }
      if(route==='/api/import'&&req.method==='POST'){
        if(user.role!=='admin')fail(403,'Administrator access required.');const data=await body(req),incoming=M.upgrade(data.state||data.workspace||data);const parsedFiles=(data.files||[]).map(f=>({id:f.id,...parseFile(f)}));
        if(!!incoming.demo!==demoMode)fail(409,'Demo and real facility records cannot be merged. Use their separate launchers and full recovery copies.');
        const result=transaction(()=>{const current=load();if(data.revision!==undefined&&data.revision!==current.revision)fail(409,'Workspace changed. Refresh before importing.');const next=structuredClone(current.state);
          for(const kind of collections)for(const row of incoming[kind]){const existing=next[kind].find(r=>r.id===row.id);if(existing&&!same(existing,row))fail(409,`Conflicting ${kind} record. Import cancelled; no records changed.`);if(!existing)next[kind].push(row);}
          for(const key of ['schedulingPolicy','facilitySetup','chemistryParameters','coveragePolicy','setupDraft'])if(incoming[key]!==undefined){if(next[key]!==undefined&&!same(next[key],incoming[key]))fail(409,'Conflicting facility configuration. Import cancelled; no records changed.');next[key]=incoming[key];}
          for(const f of parsedFiles){if(typeof f.id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(f.id))fail(400,'Invalid file ID.');const existing=db.prepare('SELECT * FROM files WHERE id=?').get(f.id);if(existing&&!Buffer.from(existing.bytes).equals(f.bytes))fail(409,'Conflicting document file.');if(!existing)db.prepare('INSERT INTO files VALUES(?,?,?,?)').run(f.id,f.name,f.type,f.bytes);}
          for(const d of next.documents)if(d.fileId&&!db.prepare('SELECT id FROM files WHERE id=?').get(d.fileId))fail(400,'Backup is missing a document file.');
          for(const update of next.taskupdates)if(update.fileId&&(!next.documents.some(d=>d.fileId===update.fileId)||!db.prepare('SELECT id FROM files WHERE id=?').get(update.fileId)))fail(400,'Backup is missing a linked task progress photo or document record.');
          return save(next,current.revision,user,'Import workspace',null,{counts:Object.fromEntries(Object.keys(M.schemas).map(k=>[k,incoming[k].length]))});});json(res,200,result);return true;
      }
      if(route==='/api/documents/upload'&&req.method==='POST'){
        permit(user,'documents');const data=await body(req),file=parseFile(data.file);
        if(String(data.category).trim().toLowerCase()==='incident records')data.access='Supervisors';
        const result=transaction(()=>{const {state,revision}=load();if(data.revision!==revision)fail(409,'Workspace changed. Refresh before retrying.');if(data.access&&!['All staff','Supervisors'].includes(data.access))fail(400,'Invalid document access.');const fileId=randomUUID(),at=new Date().toISOString(),record={id:randomUUID(),name:data.name||file.name,category:data.category,url:'',fileId,fileName:file.name,access:data.access||'All staff',createdAt:at,updatedAt:at,createdBy:user.username,updatedBy:user.username};state.documents.push(record);db.prepare('INSERT INTO files VALUES(?,?,?,?)').run(fileId,file.name,file.type,file.bytes);return save(state,revision,user,'Upload document',null,{...record,size:file.bytes.length});});json(res,201,result);return true;
      }
      const fileRoute=route.match(/^\/api\/files\/([a-zA-Z0-9-]+)$/);
      if(fileRoute&&req.method==='GET'){
        const privateAccess=portal.privateFile(user,fileRoute[1]),documents=load().state.documents.filter(d=>d.fileId===fileRoute[1]);if((!supervisor(user)&&documents.some(restrictedDocument))||privateAccess===false||(privateAccess!==true&&(!documents.length||(user.role==='employee'&&!portal.employeeData(user).documents.some(d=>d.fileId===fileRoute[1])))))fail(404,'Document not found.');const f=db.prepare('SELECT * FROM files WHERE id=?').get(fileRoute[1]);if(!f)fail(404,'File not found.');
        res.writeHead(200,{'Content-Type':f.type,'Content-Disposition':`${url.searchParams.has('download')?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(f.name)}`,'Content-Security-Policy':"sandbox; default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'"});res.end(Buffer.from(f.bytes));return true;
      }
      if(route==='/api/inspections'&&req.method==='POST'){
        if(user.role==='viewer')fail(403,'Your role cannot record inspections.');const data=await body(req);
        const result=transaction(()=>{const {state,revision}=load();if(data.revision!==revision)fail(409,'Workspace changed. Refresh before retrying.');const t=state.templates.find(t=>t.id===data.templateId);if(!t)fail(400,'Select an inspection checklist.');const labels=t.items.split(/\r?\n/).map(x=>x.trim());if(!Array.isArray(data.results)||data.results.length!==labels.length)fail(400,'Answer every checklist item.');
          const id=randomUUID(),at=new Date().toISOString(),results=labels.map((label,i)=>{const result=data.results[i];if(!result||!['Pass','Fail','Not applicable'].includes(result.result)||typeof result.notes!=='string'||result.notes.length>10000)fail(400,'Invalid inspection result.');const row={label,result:result.result,notes:result.notes};if(row.result==='Fail'){if(!row.notes.trim()||!M.validDate(data.due))fail(400,'Failures require notes and a corrective action due date.');row.taskId=randomUUID();state.tasks.push({id:row.taskId,name:`Corrective action: ${label}`,status:'Scheduled',priority:'High',due:data.due,owner:typeof data.owner==='string'?data.owner:'',category:'Inspection',inspectionId:id,createdAt:at,updatedAt:at,createdBy:user.username,updatedBy:user.username});}return row;});
          const record={id,templateId:t.id,name:t.name,owner:user.name,createdBy:user.username,recordedAt:at,results};state.inspections.push(record);if(data.nextDue){if(!M.validDate(data.nextDue))fail(400,'Invalid next inspection date.');t.nextDue=data.nextDue;t.updatedAt=at;t.updatedBy=user.username;}else fail(400,'Set the next inspection due date.');return save(state,revision,user,'Record inspection',null,record);});json(res,201,result);return true;
      }
      const evidenceRoute=route.match(/^\/api\/inspections\/([a-zA-Z0-9._-]+)\/evidence$/);
      if(evidenceRoute&&req.method==='POST'){
        if(user.role==='viewer')fail(403,'Your role cannot add inspection evidence.');const data=await body(req),file=parseFile(data.file);
        if(data.access&&!['All staff','Supervisors'].includes(data.access))fail(400,'Invalid document access.');
        if(data.access==='Supervisors'&&!supervisor(user))fail(403,'Supervisor access required for restricted evidence.');
        if(typeof data.notes!=='string'||!data.notes.trim()||data.notes.length>10000)fail(400,'Describe what this file supports (up to 10000 characters).');
        const result=transaction(()=>{const {state,revision}=load();if(data.revision!==revision)fail(409,'Workspace changed. Refresh before attaching evidence.');const inspection=state.inspections.find(i=>i.id===evidenceRoute[1]);if(!inspection)fail(404,'Inspection not found.');
          const at=new Date().toISOString(),record={id:randomUUID(),name:data.name||file.name,category:'Inspection records',url:'',fileId:randomUUID(),fileName:file.name,inspectionId:inspection.id,evidenceNotes:data.notes.trim(),recordedAt:at,createdBy:user.username,updatedBy:user.username,updatedAt:at,access:data.access||'All staff'};
          state.documents.push(record);db.prepare('INSERT INTO files VALUES(?,?,?,?)').run(record.fileId,file.name,file.type,file.bytes);return save(state,revision,user,'Attach inspection evidence',null,{...record,size:file.bytes.length});});json(res,201,result);return true;
      }
      const adjust=route.match(/^\/api\/inventory\/([a-zA-Z0-9-]+)\/adjust$/);
      const candidates=route.match(/^\/api\/coverage\/([a-zA-Z0-9._-]+)\/candidates$/);
      if(['/api/schedule/preview','/api/schedule/apply'].includes(route)&&req.method==='POST'){
        if(!supervisor(user))fail(403,'Supervisor access required.');const data=await body(req);
        if(route.endsWith('/preview')){const {state,revision}=load();if(data.revision!==revision)fail(409,'Workspace changed. Refresh before previewing.');json(res,200,M.planPattern(state,data.pattern));return true;}
        const result=transaction(()=>{const {state,revision}=load();if(data.revision!==revision)fail(409,'Workspace changed. Refresh and preview again before applying.');const plan=M.planPattern(state,data.pattern);if(plan.rows.some(r=>r.blocked))fail(409,'Pattern contains blocked scheduling records. No rows were created; resolve the preview conflicts first.');const at=new Date().toISOString(),records=plan.rows.filter(r=>!r.duplicate).map(r=>({...r.record,createdBy:user.username,updatedBy:user.username,createdAt:at,updatedAt:at}));if(!records.length)fail(409,'Every pattern row already exists; no duplicate records were created.');state[plan.kind].push(...records);return save(state,revision,user,'Apply weekly scheduling pattern',null,{pattern:data.pattern,kind:plan.kind,createdIds:records.map(r=>r.id)});});json(res,201,result);return true;
      }
      if(candidates&&req.method==='GET'){
        if(!supervisor(user))fail(403,'Supervisor access required.');const {state}=load(),slot=state.coverage.find(s=>s.id===candidates[1]);if(!slot)fail(404,'Coverage period not found.');
        json(res,200,portal.candidates(state,slot));return true;
      }
      const assign=route.match(/^\/api\/coverage\/([a-zA-Z0-9._-]+)\/assign$/);
      if(assign&&req.method==='POST'){
        if(!supervisor(user))fail(403,'Supervisor access required.');const data=await body(req);
        const result=transaction(()=>{const {state,revision}=load();if(revision!==data.revision)fail(409,'Workspace changed. Refresh before approving.');const slot=state.coverage.find(c=>c.id===assign[1]);if(!slot)fail(404,'Coverage period not found.');if(Date.parse(slot.end)<=Date.now())fail(409,'Coverage period has ended.');if(!M.coverageGaps(state,slot).length)fail(409,'Coverage is already filled.');const issues=M.schedulingIssues(state,data.staffId,slot,{explicitAvailability:true});if(issues.length)fail(400,issues.join('; '));const at=new Date().toISOString(),shift={id:randomUUID(),staffId:data.staffId,start:slot.start,end:slot.end,location:slot.location,requirements:slot.requirements||'',createdAt:at,updatedAt:at,createdBy:user.username,updatedBy:user.username};state.shifts.push(shift);state.assignments.push({id:randomUUID(),coverageId:slot.id,staffId:data.staffId,shiftId:shift.id,actor:user.username,recordedAt:at});return save(state,revision,user,'Approve shift replacement',null,shift);});json(res,200,result);return true;
      }
      const progressRoute=route.match(/^\/api\/tasks\/([a-zA-Z0-9._-]+)\/progress$/);
      if(progressRoute&&req.method==='POST'){
        permit(user,'tasks');const data=await body(req),file=data.file?parseFile(data.file):null;if(file&&!file.type.startsWith('image/'))fail(400,'Progress photos must be PNG or JPEG.');
        const result=transaction(()=>{const {state,revision}=load();if(revision!==data.revision)fail(409,'Workspace changed. Refresh before retrying.');const task=state.tasks.find(t=>t.id===progressRoute[1]);if(!task)fail(404,'Task not found.');const previousTask={...task},update={id:randomUUID(),taskId:task.id,notes:data.notes,completion:data.completion,actor:user.username,recordedAt:new Date().toISOString()};
          if(file){update.fileId=randomUUID();update.fileName=file.name;db.prepare('INSERT INTO files VALUES(?,?,?,?)').run(update.fileId,file.name,file.type,file.bytes);state.documents.push({id:randomUUID(),name:task.name+' progress photo',category:'Maintenance photos',url:'',fileId:update.fileId,fileName:file.name,taskId:task.id,access:'All staff',createdAt:update.recordedAt,updatedAt:update.recordedAt,createdBy:user.username,updatedBy:user.username});}
          state.taskupdates.push(update);task.status=data.completion===100?'Completed':data.completion>0?'In Progress':'Scheduled';task.updatedAt=update.recordedAt;task.updatedBy=user.username;return save(state,revision,user,'Record task progress',previousTask,{...update,status:task.status});});json(res,201,result);return true;
      }
      if(adjust&&req.method==='POST'){
        permit(user,'inventory');const data=await body(req);const result=transaction(()=>{const {state,revision}=load();if(data.revision!==revision)fail(409,'Workspace changed. Refresh before retrying.');const item=state.inventory.find(i=>i.id===adjust[1]);if(!item)fail(404,'Item not found.');if(!Number.isFinite(data.delta)||!data.delta||typeof data.reason!=='string'||!data.reason.trim()||data.reason.length>1000)fail(400,'Enter a nonzero adjustment and reason.');const old={...item};item.quantity+=data.delta;stockHistory(state,old,item,user,data.reason);return save(state,revision,user,'Adjust inventory',old,item);});json(res,200,result);return true;
      }
      const recordRoute=route.match(/^\/api\/records\/([a-z]+)(?:\/([a-zA-Z0-9._-]+))?$/);
      if(recordRoute&&['POST','PUT','DELETE'].includes(req.method)){
        const [,kind,id]=recordRoute;if(!Object.hasOwn(M.schemas,kind))fail(404,'Unknown record type.');if(kind==='incidents'&&user.role==='operator'){if(req.method!=='POST')fail(403,'Operators can submit incidents, but only supervisors can review or change them.');}else permit(user,kind,req.method==='DELETE');const data=await body(req);
        const result=transaction(()=>{const {state,revision}=load();if(data.revision!==revision)fail(409,'Another user changed the workspace. Refresh data before retrying; your form has been kept.');const index=state[kind].findIndex(r=>r.id===id),old=index<0?null:state[kind][index];
          if(kind==='reports'&&!supervisor(user)&&(old?.category==='Incident'||data.record?.category==='Incident'))fail(403,'Incident records require supervisor access.');
          if(req.method!=='POST'&&!old)fail(404,'Record not found.');if(req.method==='POST'&&id)fail(400,'Invalid create URL.');
          let record=null;
          if(req.method==='DELETE'){
            if(kind==='staff'&&(db.prepare('SELECT userId FROM account_staff WHERE staffId=?').get(id)||db.prepare('SELECT taskId FROM task_staff WHERE staffId=? LIMIT 1').get(id)||db.prepare("SELECT id FROM portal_requests WHERE json_extract(body,'$.staffId')=? LIMIT 1").get(id)||state.schedulingPolicy?.eligibility.some(p=>p.staffId===id)||state.inspections.some(i=>i.staffId===id)||state.shifts.some(s=>s.staffId===id)||state.qualifications.some(s=>s.staffId===id)||state.availability.some(s=>s.staffId===id)))fail(409,'Retain linked employee history. Mark this employee inactive instead.');
            if(kind==='tasks'&&(old.inspectionId||old.chemistryActionId||state.taskupdates.some(u=>u.taskId===id)))fail(409,'Tasks with corrective actions or progress history must be completed or reopened, not deleted.');
            if(kind==='equipment'&&state.tasks.some(t=>t.equipmentId===id))fail(409,'Equipment with linked maintenance history must be retained. Record its current status instead.');
            if(kind==='chemistry'&&state.chemistryactions.some(a=>a.readingId===id))fail(409,'Readings with corrective actions must be retained.');
            if(kind==='chemistryactions')fail(409,'Corrective action history must be retained.');
            if(kind==='documents'&&state.taskupdates.some(u=>u.fileId&&u.fileId===old.fileId))fail(409,'Photos linked to task progress must be retained with their history.');
            if(kind==='documents'&&old.inspectionId)fail(409,'Inspection evidence must be retained with its history.');
            if(kind==='tasks')db.prepare('DELETE FROM task_staff WHERE taskId=?').run(id);
            if(kind==='staff'){db.prepare('DELETE FROM employee_permissions WHERE staffId=?').run(id);db.prepare('DELETE FROM employee_preferences WHERE staffId=?').run(id);}
            state[kind].splice(index,1);
          }else{
            record=cleanRecord(kind,data.record,old,user);
            if(kind==='staff'&&record.status==='Inactive')db.prepare('DELETE FROM sessions WHERE userId IN (SELECT userId FROM account_staff WHERE staffId=?)').run(record.id);
            if(kind==='tasks'){
              const bound=db.prepare('SELECT staffId FROM task_staff WHERE taskId=?').get(record.id)?.staffId;
              if(data.record.portalStaffId!==undefined){if(!supervisor(user))fail(403,'Only supervisors can assign private employee duties.');const staffId=data.record.portalStaffId;if(typeof staffId!=='string')fail(400,'Choose an employee identity.');if(staffId){const employee=state.staff.find(p=>p.id===staffId&&(p.status!=='Inactive'||bound===staffId));if(!employee)fail(400,'Choose an active employee for this duty.');db.prepare('INSERT INTO task_staff VALUES(?,?) ON CONFLICT(taskId) DO UPDATE SET staffId=excluded.staffId').run(record.id,staffId);record.owner=employee.name;}else db.prepare('DELETE FROM task_staff WHERE taskId=?').run(record.id);if(staffId!==(bound||''))audit(user.username,'Set private employee task binding',{taskId:record.id,staffId:bound||''},{taskId:record.id,staffId});}
              else if(bound&&old&&record.owner!==old.owner){db.prepare('DELETE FROM task_staff WHERE taskId=?').run(record.id);audit(user.username,'Clear employee task binding after owner change',{taskId:record.id,staffId:bound},null);}
            }
            if(kind==='shifts'){const issues=M.schedulingIssues(state,record.staffId,record);if(issues.length)fail(400,issues.join('; '));}
            if(kind==='inventory')stockHistory(state,old,record,user,old?'Quantity edited':'Initial stock');
            if(kind==='chemistryactions')chemistryFollowup(state,record,old,user);
            if(index<0)state[kind].push(record);else state[kind][index]=record;
          }
          return save(state,revision,user,`${req.method} ${kind}`,old,record);});json(res,200,{...result,...(kind==='incidents'&&user.role==='operator'?{reference:result.state.incidents.at(-1).id}:{})});return true;
      }
      fail(404,'API route not found.');
    }catch(e){const sqlite=String(e.code||'').includes('SQLITE'),busy=sqlite&&[5,6].includes(e.errcode);if(sqlite)console.error('Database request failed:',e.code,e.errcode);json(res,e.status||(busy?503:sqlite?500:400),{error:e.status?e.message:busy?'Facility database is busy. Refresh and check saved records before retrying.':sqlite?'Database operation failed. Refresh and check saved records before retrying.':e.message});}
    return true;
  }
  return {handle:(req,res)=>requestContext.run({req},()=>handle(req,res)),close:()=>db.close(),dataDir};
}
module.exports={createApp};
