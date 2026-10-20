'use strict';
// Reproduce portfolio images from a fresh fictional fixture, never facility data.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.AQUAOPS_PLAYWRIGHT||'playwright');
const {initializeDemo,password}=require('./demo.cjs'),{createServer}=require('../server');
(async()=>{
 const fixtures=path.join(__dirname,'../test-data');fs.mkdirSync(fixtures,{recursive:true});
 const fixture=await initializeDemo({root:fs.mkdtempSync(path.join(fixtures,'portfolio-'))}),server=createServer({dataDir:fixture.dataDir});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.AQUAOPS_BROWSER_CHANNEL?{channel:process.env.AQUAOPS_BROWSER_CHANNEL}:{})});
  const out=path.join(__dirname,'../docs/portfolio');fs.mkdirSync(out,{recursive:true});
  for(const [username,width,height,file,ready]of [['demo.manager',1440,1000,'manager.png','.original-dashboard'],['demo.employee',390,844,'employee.png','.employee-welcome']]){
   const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
   await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByLabel('Username',{exact:true}).fill(username);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator(ready).waitFor();
   await page.getByText('DEMO MODE — fictional records only. Separate from your facility workspace.',{exact:true}).waitFor();
   await page.screenshot({path:path.join(out,file),fullPage:true});await context.close();
  }
  console.log('Portfolio images generated only from a fresh fictional fixture.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
