const {app}=require('@azure/functions');
const {TableClient,AzureNamedKeyCredential}=require('@azure/data-tables');
const crypto=require('node:crypto');
const {summarize,validate,initialGuests}=require('./core');
const partition='potluck-2026';
function client(){const connection=process.env.AZURE_STORAGE_CONNECTION_STRING;if(!connection)throw Error('Storage is not configured');return TableClient.fromConnectionString(connection,'PotluckSignups');}
async function setup(){const c=client();await c.createTable().catch(e=>{if(e.statusCode!==409)throw e});return c;}
function json(data,status=200){return {status,jsonBody:data,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}};}
function principal(req){try{const raw=req.headers.get('x-ms-client-principal');return raw?JSON.parse(Buffer.from(raw,'base64').toString('utf8')):null;}catch{return null;}}
function approver(req){const p=principal(req);return p&&Array.isArray(p.userRoles)&&p.userRoles.includes('potluck_approver')&&p.userId&&p.identityProvider!=='anonymous'?p:null;}
async function all(c){const result=[];for await(const item of c.listEntities({queryOptions:{filter:`PartitionKey eq '${partition}'`}}))result.push(item);return result;}
function publicRow(r){return {id:r.rowKey,name:r.name,dish:r.dish,category:r.category,servings:r.servings,status:r.status,createdAt:r.createdAt};}
function privateRow(r){return {...publicRow(r),phone:r.phone,adults:r.adults,children:r.children,notes:r.notes,verifiedBy:r.verifiedBy||'',verifiedAt:r.verifiedAt||'',approvedBy:r.approvedBy||'',approvedAt:r.approvedAt||'',decisionNote:r.decisionNote||'',updatedAt:r.updatedAt||''};}
async function list(req){try{const rows=await all(await setup());const isAdmin=!!approver(req);return json({categories:summarize(rows),guests:initialGuests,contributions:rows.filter(r=>r.status==='approved').sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).map(publicRow),...(isAdmin?{submissions:rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(privateRow)}:{})});}catch(e){return json({error:'Unable to load contributions'},500)}}
app.http('list',{methods:['GET'],authLevel:'anonymous',route:'potluck',handler:list});
async function signup(req){try{const raw=await req.json();if(raw.website)return json({ok:true});const data=validate(raw);const c=await setup();const now=new Date().toISOString();const rowKey=crypto.randomUUID();await c.createEntity({partitionKey:partition,rowKey,...data,status:'pending',createdAt:now,updatedAt:now});return json({ok:true,id:rowKey,status:'pending'},201);}catch(e){return json({error:e.message==='Storage is not configured'?'Service unavailable':e.message||'Unable to submit'},e.message==='Storage is not configured'?503:400)}}
app.http('signup',{methods:['POST'],authLevel:'anonymous',route:'potluck/signup',handler:signup});
async function decide(req){const p=approver(req);if(!p)return json({error:'Approver access required'},403);try{const id=req.params.id;if(!/^[0-9a-f-]{36}$/i.test(id))return json({error:'Invalid signup ID'},400);const data=await req.json();if(!['approve','decline','revoke','reopen'].includes(data.action))return json({error:'Invalid action'},400);const c=await setup();let row;try{row=await c.getEntity(partition,id)}catch(e){if(e.statusCode===404)return json({error:'Signup not found'},404);throw e}
if(data.action==='approve'&&(row.status!=='pending'||data.textConfirmed!==true))return json({error:'Text confirmation required for pending signup'},409);
if(data.action==='decline'&&row.status!=='pending')return json({error:'Only pending signups may be declined'},409);
if(data.action==='revoke'&&row.status!=='approved')return json({error:'Only approved signups may be revoked'},409);
if(data.action==='reopen'&&!['declined','revoked'].includes(row.status))return json({error:'Only declined/revoked signups may be reopened'},409);
const now=new Date().toISOString();const status={approve:'approved',decline:'declined',revoke:'revoked',reopen:'pending'}[data.action];const who=p.userDetails||p.userId;const update={partitionKey:partition,rowKey:id,status,updatedAt:now,decisionNote:String(data.note||'').slice(0,300)};if(data.action==='approve')Object.assign(update,{verifiedBy:who,verifiedAt:now,approvedBy:who,approvedAt:now});await c.updateEntity(update,'Merge',{etag:row.etag});
const log=TableClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING,'PotluckAudit');await log.createTable().catch(e=>{if(e.statusCode!==409)throw e});await log.createEntity({partitionKey:id,rowKey:crypto.randomUUID(),action:data.action,actor:who,at:now,note:update.decisionNote});return json({ok:true,status});
}catch(e){return json({error:e.statusCode===412?'Signup changed; refresh and try again':'Unable to update signup'},e.statusCode===412?409:500)}}
app.http('decision',{methods:['POST'],authLevel:'anonymous',route:'potluck/{id}/decision',handler:decide});
