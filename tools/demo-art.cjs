'use strict';
// Code-drawn fictional pump-room illustration; never represented as evidence
// of actual equipment. PNG generation uses only the bundled Node runtime.
const {deflateSync}=require('node:zlib');
function demoIllustration(){
  const width=400,height=200,pixels=Buffer.alloc(width*height*4,255);
  const pixel=(x,y,c)=>{if(x<0||y<0||x>=width||y>=height)return;const i=(y*width+x)*4;pixels[i]=c[0];pixels[i+1]=c[1];pixels[i+2]=c[2];};
  const rect=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)pixel(i,j,c);};
  const circle=(cx,cy,r,c)=>{for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++)if((x-cx)**2+(y-cy)**2<=r*r)pixel(x,y,c);};
  rect(0,0,width,height,[222,224,220]);rect(0,150,width,50,[151,161,163]);
  for(let y=20;y<150;y+=25)rect(0,y,width,1,[198,204,202]);for(let x=0;x<400;x+=70)rect(x,0,1,150,[207,211,208]);
  // Overhead manifold and vertical filter plumbing.
  rect(20,30,350,16,[92,110,116]);rect(20,33,350,5,[186,199,200]);
  for(const x of [62,160,258]){rect(x,32,13,102,[103,121,128]);rect(x+2,32,4,100,[194,205,205]);circle(x+6,56,10,[52,81,95]);rect(x-7,53,28,5,[196,71,60]);}
  for(const x of [45,143,241]){rect(x,93,47,56,[58,87,98]);circle(x+23,93,23,[82,119,132]);circle(x+23,143,23,[62,95,108]);rect(x+5,105,37,36,[90,128,140]);rect(x+4,116,39,5,[170,192,197]);rect(x+7,155,32,8,[39,65,74]);}
  rect(28,166,275,12,[70,85,91]);rect(31,168,270,4,[166,181,184]);
  // Demo chemical containers and a portable maintenance tool case.
  rect(320,116,52,65,[41,130,183]);circle(346,116,26,[91,175,209]);rect(323,136,46,15,[226,236,232]);rect(330,100,29,7,[39,89,119]);
  rect(280,153,38,35,[226,184,52]);rect(291,147,15,8,[98,100,83]);rect(27,174,55,20,[70,105,131]);
  const raw=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++)pixels.copy(raw,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
  const crc=buffer=>{let n=0xffffffff;for(const b of buffer){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;};
  const chunk=(type,data)=>{const name=Buffer.from(type),length=Buffer.alloc(4),checksum=Buffer.alloc(4);length.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(Buffer.concat([name,data])));return Buffer.concat([length,name,data,checksum]);};
  const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
module.exports={demoIllustration};
