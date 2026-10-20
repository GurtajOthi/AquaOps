'use strict';
const M=require('../frontend/model');
const string=(v,max,required=true)=>typeof v==='string'&&v.length<=max&&(!required||!!v.trim()),id=v=>string(v,100)&&/^[a-zA-Z0-9._-]+$/.test(v),stamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
function period(start,end){return [start,end].every(v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(v)&&M.validDate(v.slice(0,10)))&&start<end;}
function request(row,state,hasFile){
 const r=JSON.parse(row.body),allowed={Offer:['Offered','Accepted','Declined','Approved','Rejected','Cancelled'],Coverage:['Pending','Approved','Rejected','Cancelled'],Volunteer:['Pending','Approved','Rejected','Cancelled'],'Time off':['Pending','Approved','Rejected','Cancelled'],Certification:['Pending','Approved','Rejected','Cancelled'],Maintenance:['Pending','Approved','Rejected','Cancelled']};
 let valid=r&&r.id===row.id&&id(r.id)&&id(r.version)&&stamp(r.createdAt)&&(r.updatedAt===undefined||stamp(r.updatedAt))&&string(r.actor,64)&&state.staff.some(p=>p.id===r.staffId)&&allowed[r.kind]?.includes(r.status)&&r.payload&&typeof r.payload==='object'&&!Array.isArray(r.payload)&&string(r.payload.notes,2000)&&(r.decisionNotes===undefined||string(r.decisionNotes,2000,false));
 if(valid&&['Offer','Coverage','Volunteer','Time off'].includes(r.kind))valid=period(r.payload.start,r.payload.end);
 if(valid&&['Offer','Coverage','Volunteer'].includes(r.kind))valid=id(r.targetId)&&string(r.payload.location,10000)&&string(r.payload.requirements,10000,false)&&(r.sourceId===undefined||r.sourceId===''||id(r.sourceId));
 if(valid&&r.kind==='Certification')valid=string(r.payload.name,150)&&M.validDate(r.payload.expiry)&&id(r.payload.fileId)&&string(r.payload.fileName,255)&&hasFile(r.payload.fileId);
 if(valid&&r.kind!=='Certification'&&r.payload.fileId)valid=false;
 if(!valid)throw Error('Backup contains invalid employee request history or missing private evidence.');
 return r;
}
function accounts(rows){for(const u of rows)if(!id(u.id)||!string(u.username,64)||!/^[a-zA-Z0-9._-]{3,64}$/.test(u.username)||!string(u.name,150)||!['admin','manager','operator','viewer','employee'].includes(u.role)||![0,1].includes(u.active)||typeof u.password!=='string'||!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(u.password))throw Error('Backup contains invalid account metadata or unsupported roles.');if(rows.length&&!rows.some(u=>u.role==='admin'&&u.active===1))throw Error('Backup has no active administrator; review account recovery before restoring.');}
module.exports={request,accounts};
