'use strict';
const fields=['name','areas','operatingHours','staffRoles','certificationRequirements','maintenanceCategories','inventoryCategories','notes','chemistryInterval'];
function draftFields(value){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!fields.includes(k)))throw Object.assign(Error('Use recognized facility setup fields.'),{status:400});const result={};for(const key of fields){const v=value[key]??'';if(typeof v!=='string'||v.length>2000)throw Object.assign(Error('Setup draft fields must be text up to 2000 characters.'),{status:400});result[key]=v;}return result;}
function optionalText(value,label){if(typeof value!=='string'||value.length>2000)throw Object.assign(Error('Enter '+label+' as text up to 2000 characters.'),{status:400});return value.trim();}
module.exports={fields,draftFields,optionalText};
