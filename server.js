'use strict';
// Local facility application. HTTP is restricted to loopback; do not expose directly.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = { '/':'index.html', '/index.html':'index.html', '/style.css':'style.css', '/portal.css':'portal.css', '/schedule.css':'schedule.css', '/calendar.js':'calendar.js', '/coverage-status.js':'coverage-status.js', '/attention.js':'attention.js', '/setup.js':'setup.js', '/schedule.js':'schedule.js', '/portal.js':'portal.js', '/recommendations.js':'recommendations.js', '/model.js':'model.js', '/script.js':'script.js' };
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const {createApp}=require('./backend/app');
function createServer(options){
const app=createApp(options);
const server = http.createServer(async (req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Frame-Options','SAMEORIGIN');
  if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host||'')){res.writeHead(403);res.end('Use localhost or 127.0.0.1');return;}
  try { if(await app.handle(req,res))return; } catch { res.writeHead(500);res.end('Application request failed');return; }
  const file=files[req.url.split('?')[0]];
  if(!file || !['GET','HEAD'].includes(req.method)){res.writeHead(404);res.end('Not found');return;}
  fs.readFile(path.join(__dirname,'frontend',file),(error,data)=>{
    if(error){res.writeHead(500);res.end('Could not read application file');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
    res.end(req.method==='HEAD'?undefined:data);
  });
});
server.on('close',()=>app.close());
return server;
}
function startLocalServer(){
  const port=process.env.PORT===undefined?8000:Number(process.env.PORT);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be a whole number from 1 to 65535.');
  const server=createServer({dataDir:process.env.AQUAOPS_DATA_DIR||path.join(__dirname,'data')});
  server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Port already in use. Close the previous AquaOps server, or set PORT to another port.':e.message);process.exitCode=1;server.close();});
  server.listen(port,'127.0.0.1',()=>console.log(`AquaOps: http://127.0.0.1:${server.address().port}\nData directory: ${path.resolve(process.env.AQUAOPS_DATA_DIR||path.join(__dirname,'data'))}\nFirst run: read setup-token.txt in that data directory and create your administrator in the browser.\nKeep this terminal open. Press Ctrl+C to stop.`));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
if(require.main===module)try{startLocalServer();}catch(error){console.error('AquaOps could not start: '+error.message);process.exitCode=1;}
module.exports={createServer};
