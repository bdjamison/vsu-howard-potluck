
const {app}=require('@azure/functions');
const {TableClient}=require('@azure/data-tables');
const crypto=require('node:crypto');
const {summarize,validate,initialGuests}=require('./core');

const DEFAULT_EVENT='vsu-holiday-2026';

const EVENTS={
  'vsu-holiday-2026':{
    partition:'potluck-2026',
    guestPartition:'potluck-guests-2026',
    guests:40
  },
  'kpl-holiday-2026':{
    partition:'potluck-kpl-holiday-2026',
    guestPartition:'potluck-guests-kpl-holiday-2026',
    guests:50
  }
};

function getEventPartitions(eventId=DEFAULT_EVENT){
  const result=EVENTS[eventId];
  if(!result)throw Error('Unknown event');
  return result;
}

function getRequestEvent(req){
  const id=new URL(req.url).searchParams.get('eventId')||DEFAULT_EVENT;
  getEventPartitions(id);
  return id;
}

function isPlatformAdmin(req){
  const p=principal(req);
  const email=String(p?.userDetails||'').trim().toLowerCase();
  const configured=String(process.env.PLATFORM_ADMIN_EMAIL||'').trim().toLowerCase();

  return !!(
    p?.userId &&
    p.identityProvider!=='anonymous' &&
    configured &&
    email===configured
  );
}

function canManage(req,eventId){
  return eventId===DEFAULT_EVENT
    ? !!approver(req)||isPlatformAdmin(req)
    : isPlatformAdmin(req);
}

const guestKey=email=>
  'g-'+crypto.createHash('sha256').update(email).digest('hex');

function client(){
  const connection=process.env.AZURE_STORAGE_CONNECTION_STRING;
  if(!connection)throw Error('Storage is not configured');

  return TableClient.fromConnectionString(connection,'PotluckSignups');
}

async function setup(){
  const c=client();
  await c.createTable().catch(e=>{
    if(e.statusCode!==409)throw e;
  });
  return c;
}

function json(data,status=200){
  return {
    status,
    jsonBody:data,
    headers:{
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff'
    }
  };
}

function principal(req){
  try{
    const raw=req.headers.get('x-ms-client-principal');
    return raw
      ? JSON.parse(Buffer.from(raw,'base64').toString('utf8'))
      : null;
  }catch{
    return null;
  }
}

function approver(req){
  const p=principal(req);
  return p &&
    Array.isArray(p.userRoles) &&
    p.userRoles.includes('potluck_approver') &&
    p.userId &&
    p.identityProvider!=='anonymous'
      ? p
      : null;
}

async function rowsFor(c,key){
  const result=[];
  for await(const item of c.listEntities({
    queryOptions:{filter:`PartitionKey eq '${key}'`}
  })){
    result.push(item);
  }
  return result;
}

async function all(c,eventId=DEFAULT_EVENT){
  return rowsFor(c,getEventPartitions(eventId).partition);
}

async function guestsFor(c,eventId=DEFAULT_EVENT){
  return rowsFor(c,getEventPartitions(eventId).guestPartition);
}

function attendanceSummary(rows,guests){
  const active=rows.filter(r=>
    ['approved','pending'].includes(r.status)
  );

  const grouped=new Map();

  for(const r of active){
    const key=r.guestId||
      guestKey(String(r.email||r.rowKey).toLowerCase());

    const existing=grouped.get(key);

    if(!existing){
      grouped.set(key,{
        guestId:key,
        name:r.name,
        email:r.email,
        phone:r.phone,
        attendees:Number(r.attendees)||1,
        status:r.status,
        contributions:[]
      });
    }

    const g=grouped.get(key);

    g.contributions.push({
      id:r.rowKey,
      dish:r.dish,
      category:r.category,
      servings:r.servings,
      status:r.status
    });

    if(r.status==='approved')g.status='approved';
  }

  for(const g of grouped.values()){
    const record=guests.find(x=>x.rowKey===g.guestId);

    if(record){
      g.name=record.name;
      g.email=record.email;
      g.phone=record.phone;
      g.attendees=Number(record.attendees)||1;
    }
  }

  return [...grouped.values()];
}

function publicRow(r){
  return {
    id:r.rowKey,
    name:r.name,
    dish:r.dish,
    category:r.category,
    servings:r.servings,
    status:r.status,
    createdAt:r.createdAt
  };
}

function privateRow(r){
  return {
    ...publicRow(r),
    guestId:r.guestId||
      guestKey(String(r.email||r.rowKey).toLowerCase()),
    phone:r.phone,
    email:r.email,
    attendees:r.attendees,
    notes:r.notes,
    verifiedBy:r.verifiedBy||'',
    verifiedAt:r.verifiedAt||'',
    approvedBy:r.approvedBy||'',
    approvedAt:r.approvedAt||'',
    decisionNote:r.decisionNote||'',
    updatedAt:r.updatedAt||''
  };
}

async function list(req){
  try{
    const eventId=getRequestEvent(req);
    const c=await setup();
    const rows=await all(c,eventId);
    const isAdmin=canManage(req,eventId);

    const roster=isAdmin
      ? attendanceSummary(rows,await guestsFor(c,eventId))
      : [];

    return json({
      eventId,
      categories:summarize(rows),
      guests:getEventPartitions(eventId).guests,
      contributions:rows
        .filter(r=>r.status==='approved')
        .sort((a,b)=>a.createdAt.localeCompare(b.createdAt))
        .map(publicRow),
      ...(isAdmin?{
        submissions:rows
          .sort((a,b)=>b.createdAt.localeCompare(a.createdAt))
          .map(privateRow),
        roster
      }:{})
    });
  }catch(e){
    return json({error:'Unable to load contributions'},500);
  }
}

app.http('list',{
  methods:['GET'],
  authLevel:'anonymous',
  route:'potluck',
  handler:list
});

async function signup(req){
  try{
    const raw=await req.json();

    if(raw.website)return json({ok:true});

    const data=validate(raw);
    const eventId=getRequestEvent(req);
    const {partition,guestPartition}=getEventPartitions(eventId);
    const c=await setup();

    const key=guestKey(data.email);
    let guest=null;

    try{
      guest=await c.getEntity(guestPartition,key);
    }catch(e){
      if(e.statusCode!==404)throw e;
    }

    // Existing guests are counted once per event.
    // Additional dishes do not increase attendance.

    if(!guest){
      const now=new Date().toISOString();

      try{
        await c.createEntity({
          partitionKey:guestPartition,
          rowKey:key,
          name:data.name,
          email:data.email,
          phone:data.phone,
          attendees:data.attendees,
          createdAt:now,
          updatedAt:now
        });
      }catch(e){
        if(e.statusCode!==409)throw e;
      }

      guest=await c.getEntity(guestPartition,key);
    }

    const now=new Date().toISOString();
    const rowKey=crypto.randomUUID();

    const {
      name,email,phone,dish,category,servings,notes
    }=data;

    await c.createEntity({
      partitionKey:partition,
      rowKey,
      guestId:key,
      name:guest.name,
      email,
      phone:guest.phone,
      dish,
      category,
      servings,
      attendees:guest?.attendees||data.attendees,
      notes,
      status:'pending',
      createdAt:now,
      updatedAt:now
    });

    return json({
      ok:true,
      id:rowKey,
      status:'pending'
    },201);

  }catch(e){
    return json({
      error:e.message==='Storage is not configured'
        ? 'Service unavailable'
        : e.message||'Unable to submit'
    },e.message==='Storage is not configured'?503:400);
  }
}

app.http('signup',{
  methods:['POST'],
  authLevel:'anonymous',
  route:'potluck/signup',
  handler:signup
});

async function decide(req){
  let eventId;

  try{
    eventId=getRequestEvent(req);
  }catch{
    return json({error:'Unknown event'},400);
  }

  if(!canManage(req,eventId)){
    return json({error:'Approver access required'},403);
  }

  const p=principal(req);
  const {partition}=getEventPartitions(eventId);

  try{
    const id=req.params.id;

    if(!/^[0-9a-f-]{36}$/i.test(id)){
      return json({error:'Invalid signup ID'},400);
    }

    const data=await req.json();

    if(!['approve','decline','revoke','reopen'].includes(data.action)){
      return json({error:'Invalid action'},400);
    }

    const c=await setup();
    let row;

    try{
      row=await c.getEntity(partition,id);
    }catch(e){
      if(e.statusCode===404){
        return json({error:'Signup not found'},404);
      }
      throw e;
    }

    if(data.action==='approve'&&
      (row.status!=='pending'||data.textConfirmed!==true)){
      return json({
        error:'Text confirmation required for pending signup'
      },409);
    }

    if(data.action==='decline'&&row.status!=='pending'){
      return json({
        error:'Only pending signups may be declined'
      },409);
    }

    if(data.action==='revoke'&&row.status!=='approved'){
      return json({
        error:'Only approved signups may be revoked'
      },409);
    }

    if(data.action==='reopen'&&
      !['declined','revoked'].includes(row.status)){
      return json({
        error:'Only declined/revoked signups may be reopened'
      },409);
    }

    const now=new Date().toISOString();

    const status={
      approve:'approved',
      decline:'declined',
      revoke:'revoked',
      reopen:'pending'
    }[data.action];

    const who=p.userDetails||p.userId;

    const update={
      partitionKey:partition,
      rowKey:id,
      status,
      updatedAt:now,
      decisionNote:String(data.note||'').slice(0,300)
    };

    if(data.action==='approve'){
      Object.assign(update,{
        verifiedBy:who,
        verifiedAt:now,
        approvedBy:who,
        approvedAt:now
      });
    }

    await c.updateEntity(update,'Merge',{etag:row.etag});

    const log=TableClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
      'PotluckAudit'
    );

    await log.createTable().catch(e=>{
      if(e.statusCode!==409)throw e;
    });

    await log.createEntity({
      partitionKey:`${eventId}:${id}`,
      rowKey:crypto.randomUUID(),
      eventId,
      action:data.action,
      actor:who,
      at:now,
      note:update.decisionNote
    });

    return json({ok:true,status});

  }catch(e){
    return json({
      error:e.statusCode===412
        ? 'Signup changed; refresh and try again'
        : 'Unable to update signup'
    },e.statusCode===412?409:500);
  }
}

app.http('decision',{
  methods:['POST'],
  authLevel:'anonymous',
  route:'potluck/{id}/decision',
  handler:decide
});
