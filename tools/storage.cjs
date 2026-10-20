'use strict';
// Local filesystem administration only. No network or upload capability.
const fs=require('node:fs'),path=require('node:path');
const {DatabaseSync,backup}=require('node:sqlite');
const M=require('../frontend/model');
function verifyBackup(file){
  const absolute=path.resolve(file);if(!fs.existsSync(absolute))throw Error('Backup file not found.');
  const db=new DatabaseSync(absolute,{readOnly:true});
  let reading=false;
  try{
    db.exec('BEGIN');reading=true;
    const schema=db.prepare("SELECT type,sql FROM sqlite_master WHERE type IN ('trigger','view','table')").all();
    if(schema.some(row=>['trigger','view'].includes(row.type)||/^\s*CREATE\s+VIRTUAL\s+TABLE\b/i.test(row.sql||'')))throw Error('Backup contains unsupported database logic (triggers, views or virtual tables). Use a trusted AquaOps snapshot.');
    const integrity=db.prepare('PRAGMA integrity_check').all();if(integrity.some(r=>Object.values(r)[0]!=='ok'))throw Error('SQLite integrity check failed.');
    const row=db.prepare('SELECT revision,body FROM workspace WHERE id=1').get();if(!row)throw Error('Workspace is missing.');const state=M.upgrade(JSON.parse(row.body));
    for(const d of state.documents)if(d.fileId&&!db.prepare('SELECT id FROM files WHERE id=?').get(d.fileId))throw Error('Backup is missing a document file.');
    for(const update of state.taskupdates)if(update.fileId&&(!state.documents.some(d=>d.fileId===update.fileId)||!db.prepare('SELECT id FROM files WHERE id=?').get(update.fileId)))throw Error('Backup is missing a linked task progress photo or document record.');
    for(const table of ['users','sessions','audit','files'])db.prepare(`SELECT count(*) AS count FROM ${table}`).get();
    require('./backup-validation.cjs').accounts(db.prepare('SELECT * FROM users').all());
    const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name));
    if(state.demo&&(!tables.has('app_metadata')||db.prepare("SELECT value FROM app_metadata WHERE key='mode'").get()?.value!=='demo'))throw Error('Fictional demo backup is missing its persistent demo classification.');
    if(tables.has('account_staff'))for(const binding of db.prepare('SELECT * FROM account_staff').all())if(!state.staff.some(p=>p.id===binding.staffId)||!db.prepare('SELECT id FROM users WHERE id=?').get(binding.userId))throw Error('Backup contains a broken employee identity binding.');
    for(const u of db.prepare("SELECT id FROM users WHERE role='employee'").all())if(!tables.has('account_staff')||!db.prepare('SELECT staffId FROM account_staff WHERE userId=?').get(u.id))throw Error('Backup is missing an employee account identity binding.');
    if(tables.has('portal_requests'))for(const row of db.prepare('SELECT id,body FROM portal_requests').all())require('./backup-validation.cjs').request(row,state,id=>!!db.prepare('SELECT id FROM files WHERE id=?').get(id));
    if(tables.has('task_staff'))for(const row of db.prepare('SELECT * FROM task_staff').all())if(!state.tasks.some(t=>t.id===row.taskId)||!state.staff.some(p=>p.id===row.staffId))throw Error('Backup contains a broken employee task assignment.');
    for(const table of ['employee_permissions','employee_preferences'])if(tables.has(table))for(const row of db.prepare(`SELECT * FROM ${table}`).all()){const value=JSON.parse(row.body);if(!state.staff.some(p=>p.id===row.staffId)||!value||(table==='employee_permissions'?typeof value.chemistry!=='boolean'||typeof value.inspections!=='boolean':typeof value.locations!=='string'||!Number.isFinite(value.weeklyHours)||value.weeklyHours<0||value.weeklyHours>168))throw Error('Backup contains invalid employee permissions or preferences.');}
    return {file:absolute,integrity:'ok',revision:row.revision,records:Object.values(state).filter(Array.isArray).reduce((sum,rows)=>sum+rows.length,0)};
  }finally{if(reading)db.exec('ROLLBACK');db.close();}
}
async function createBackup({dataDir=process.env.AQUAOPS_DATA_DIR||path.join(__dirname,'../data'),outputDir}={}){
  const source=path.resolve(dataDir,'aquaops.sqlite');if(!fs.existsSync(source))throw Error('No AquaOps database found. Start the app first.');
  const dir=path.resolve(outputDir||path.join(dataDir,'backups'));fs.mkdirSync(dir,{recursive:true});
  const destination=path.join(dir,`full-${new Date().toISOString().replace(/[:.]/g,'-')}-${require('node:crypto').randomBytes(8).toString('hex')}.sqlite`),pending=destination+'.partial';
  if(fs.existsSync(destination))throw Error('Backup already exists; refusing to overwrite.');
  const db=new DatabaseSync(source,{readOnly:true});try{await backup(db,pending);}finally{db.close();}
  const verified=verifyBackup(pending);if(fs.existsSync(destination))throw Error('Backup destination appeared during verification; refusing to overwrite.');fs.renameSync(pending,destination);
  return {...verified,file:destination};
}
function restoreBackup(file,targetDir){
  const source=path.resolve(file),wal=source+'-wal';
  if(source.toLowerCase().endsWith('.partial')||(fs.existsSync(wal)&&fs.statSync(wal).size>0))throw Error('Restore requires a completed snapshot, not an unfinished or live WAL database. Create a verified full backup first.');
  const verified=verifyBackup(file),target=path.resolve(targetDir);
  if(fs.existsSync(target))throw Error('Restore target must be a new directory; existing data will never be overwritten.');
  if(fs.existsSync(wal)&&fs.statSync(wal).size>0)throw Error('Source is a live WAL database. Create a completed snapshot before restoring.');
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.mkdirSync(target);const destination=path.join(target,'aquaops.sqlite');fs.copyFileSync(verified.file,destination,fs.constants.COPYFILE_EXCL);
  const db=new DatabaseSync(destination);try{
    db.exec('BEGIN IMMEDIATE');db.exec('DELETE FROM sessions');
    db.prepare('INSERT INTO audit(at,actor,action,before,after) VALUES(?,?,?,?,?)').run(new Date().toISOString(),'local recovery','Restore verified full backup',null,JSON.stringify({sessionsRevoked:true}));db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}finally{db.close();}
  return verifyBackup(destination);
}
if(require.main===module){
  const [command,arg,target]=process.argv.slice(2);
  Promise.resolve().then(()=>{
    if(command==='backup')return createBackup();
    if(command==='verify'&&arg)return verifyBackup(arg);
    if(command==='restore'&&arg&&target)return restoreBackup(arg,target);
    throw Error('Usage: node tools/storage.cjs backup | verify <backup.sqlite> | restore <backup.sqlite> <new-directory>');
  }).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
module.exports={createBackup,verifyBackup,restoreBackup};
