'use strict';
// Inspect every tree and unique blob reachable from the selected ref. Never
// print matched values. This supplements, rather than replaces, manual review.
const {execFileSync}=require('node:child_process'),path=require('node:path');
function audit({cwd=process.cwd(),ref='HEAD'}={}){
 const git=(args,options={})=>execFileSync('git',['-c','safe.directory='+path.resolve(cwd).replaceAll('\\','/'),...args],{cwd,maxBuffer:128*1024*1024,...options});
 const commits=git(['rev-list',ref],{encoding:'utf8'}).trim().split('\n').filter(Boolean),blobs=new Map(),findings=[],reviews=[];
 const excluded=/(^|\/)(?:data|demo-data|test-data|uploads|backups|\.private-backups|\.publication|node_modules|\.aws|\.ssh)(\/|$)|(?:^|\/)\.env(?:\..*)?$|\.(?:sqlite(?:-wal|-shm|\.partial.*)?|db(?:-wal|-shm)?|bundle|bak|pem|key|pfx|p12|log)$/i;
 for(const commit of commits){
  const rows=git(['ls-tree','-rz',commit],{encoding:'utf8'}).split('\0').filter(Boolean);
  for(const row of rows){const match=row.match(/^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/);if(!match)throw Error('Unrecognized Git tree entry.');const [,mode,type,oid,name]=match;
   if(type!=='blob'||mode==='120000')findings.push({commit,path:name,rule:'non-regular-source-entry'});
   if(name!=='.env.example'&&excluded.test(name))findings.push({commit,path:name,rule:'private-or-generated-path'});
   if(type==='blob'){if(!blobs.has(oid))blobs.set(oid,new Set());blobs.get(oid).add(name);}
  }
 }
 const rules=[['shared-conversation-link',/https?:\/\/(?:chatgpt\.com|chat\.openai\.com)\/share\//i],['private-key',/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/],['provider-token',/\b(?:sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16}|xox[baprs]-[A-Za-z0-9-]{15,}|AIza[A-Za-z0-9_-]{30,})\b/],['encoded-session-token',/\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/]];
 for(const [oid,names]of blobs){const bytes=git(['cat-file','blob',oid]);const paths=[...names];if(bytes.subarray(0,16).toString()==='SQLite format 3\0')findings.push({oid,paths,rule:'sqlite-content'});
  const text=bytes.toString('utf8');for(const [rule,pattern]of rules)if(pattern.test(text))findings.push({oid,paths,rule});if(bytes.includes(0))continue;
  for(const [index,line]of text.split(/\r?\n/).entries())if(/\b(?:password|api[_-]?key|session[_-]?secret|client[_-]?secret|access[_-]?token)\s*[:=]\s*['"][^'"]{8,}['"]/i.test(line))reviews.push({oid,paths,line:index+1,rule:'literal-credential-manual-review'});
 }
 return {ref,commits:commits.length,uniqueBlobs:blobs.size,findings,reviews,automatedChecksPassed:findings.length===0,manualReviewRequired:true};
}
if(require.main===module){try{const result=audit({cwd:process.argv[2]||process.cwd(),ref:process.argv[3]||'HEAD'});console.log(JSON.stringify(result,null,2));if(!result.automatedChecksPassed)process.exitCode=1;}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={audit};
