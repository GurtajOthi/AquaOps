'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('../server');
test('account edits reject stale settings and concurrent password-reset races without exposing credentials',async()=>{
  const root=path.join(__dirname,'../test-data');fs.mkdirSync(root,{recursive:true});const dataDir=fs.mkdtempSync(path.join(root,'accounts-')),server=createServer({dataDir});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;let cookie='',csrf='';
  async function call(route,method='GET',data){const r=await fetch(base+route,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-AquaOps-Client':'1','X-CSRF-Token':csrf},...(data?{body:JSON.stringify(data)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const body=await r.json();if(body.csrf)csrf=body.csrf;return {status:r.status,body};}
  async function req(route,method='GET',data,status=200){const r=await call(route,method,data);assert.equal(r.status,status,JSON.stringify(r.body));return r.body;}
  try{
    const setup=await req('/api/setup','POST',{token:fs.readFileSync(path.join(dataDir,'setup-token.txt'),'utf8'),username:'admin',name:'Admin',password:'account-test-password'});assert.ok(setup.expiresAt>Date.now());assert.equal(setup.user.password,undefined);
    await req('/api/users','POST',{username:'employee',name:'Employee',role:'operator',password:'account-test-password'},201);let target=(await req('/api/users')).find(u=>u.username==='employee');assert.match(target.version,/^[a-f0-9]{64}$/);assert.equal(target.password,undefined);
    await req('/api/users/'+target.id,'PATCH',{role:'viewer',active:true,version:target.version});await req('/api/users/'+target.id,'PATCH',{role:'manager',active:true,version:target.version,password:'stale-password-reset'},409);target=(await req('/api/users')).find(u=>u.username==='employee');assert.equal(target.role,'viewer');
    const results=await Promise.all([call('/api/users/'+target.id,'PATCH',{role:'manager',active:true,version:target.version,password:'concurrent-password-one'}),call('/api/users/'+target.id,'PATCH',{role:'operator',active:true,version:target.version,password:'concurrent-password-two'})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
    const updated=(await req('/api/users')).find(u=>u.id===target.id);assert.notEqual(updated.version,target.version);assert.ok(['manager','operator'].includes(updated.role));
    await req('/api/users/'+target.id,'PATCH',{role:'viewer',active:true,version:[]},400);
    const db=new(require('node:sqlite').DatabaseSync)(path.join(dataDir,'aquaops.sqlite'));try{db.prepare('UPDATE users SET password=? WHERE id=?').run('dummy-salt:invalid',''+target.id);}finally{db.close();}
    const invalid=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json','X-AquaOps-Client':'1'},body:JSON.stringify({username:'employee',password:'account-test-password'})});assert.equal(invalid.status,401);
  }finally{await new Promise(r=>server.close(r));}
});
