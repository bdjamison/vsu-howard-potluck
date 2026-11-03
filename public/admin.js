const $=id=>document.getElementById(id);let data=null,filter='pending';const el=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);return x};
async function refresh(){try{const r=await fetch('/api/potluck',{cache:'no-store'});if(!r.ok)throw Error('Unable to load');data=await r.json();if(!Array.isArray(data.submissions))throw Error('Approver role is missing. Contact the Azure administrator.');render()}catch(e){$('records').textContent=e.message}}
function render(){const rows=data.submissions;renderOverview(rows);const counts=$('counts');counts.replaceChildren();for(const status of ['pending','approved','declined','revoked']){const box=el('div','count');box.append(el('b','',rows.filter(r=>r.status===status).length),el('span','',status[0].toUpperCase()+status.slice(1)));counts.append(box)}const search=$('search').value.toLowerCase();const records=$('records');records.replaceChildren();const filtered=rows.filter(r=>(filter==='all'||r.status===filter)&&[r.name,r.dish,r.category].join(' ').toLowerCase().includes(search));if(!filtered.length)records.append(el('p','hint','No matching submissions.'));for(const r of filtered){const box=el('div','item'),head=el('div','cat-title');head.append(el('strong','',r.name),el('span','status '+r.status,r.status));box.append(head,el('p','',`${r.dish} • ${r.servings} servings • ${r.category}`),el('p','hint',`RSVP: ${r.attendees ?? 1} attendee(s) • Submitted: ${new Date(r.createdAt).toLocaleString()}`),el('p','hint',`Email: ${r.email||'Not provided'} • Mobile: ${r.phone}${r.notes?' • Notes: '+r.notes:''}`));if(r.approvedBy)box.append(el('p','hint',`Approved by ${r.approvedBy} on ${new Date(r.approvedAt).toLocaleString()}`));if(r.status==='pending'){const sms=`Hi ${r.name}, this is the VSU Alumni Association Howard County Chapter Executive Board. We're confirming your December 13 holiday potluck signup for ${r.dish} (${r.servings} servings). Please reply to confirm your signup. Thank you!`;const link=el('a','button secondary','Open SMS');link.href=`sms:${r.phone.replace(/[^+\d]/g,'')}?body=${encodeURIComponent(sms)}`;const copy=el('button','secondary','Copy text');copy.onclick=()=>navigator.clipboard.writeText(sms).then(()=>{$('adminMessage').textContent='Text copied.'}).catch(()=>{$('adminMessage').textContent='Unable to copy text.'});const label=el('label','');const cb=el('input');cb.type='checkbox';cb.style.width='auto';label.append(cb,document.createTextNode(' I received a text reply confirming this signup'));const approve=el('button','success','Approve');approve.disabled=true;cb.onchange=()=>approve.disabled=!cb.checked;approve.onclick=()=>decide(r,'approve',true);const decline=el('button','danger','Decline');decline.onclick=()=>decide(r,'decline');const actions=el('div','actions');actions.append(link,copy,approve,decline);box.append(label,actions)}else if(r.status==='approved'){const revoke=el('button','danger','Revoke approval');revoke.onclick=()=>decide(r,'revoke');box.append(revoke)}else{const reopen=el('button','secondary','Reopen for verification');reopen.onclick=()=>decide(r,'reopen');box.append(reopen)}records.append(box)}}
async function decide(row,action,textConfirmed=false){if(action==='approve'&&!textConfirmed)return;let note='';if(action==='decline'||action==='revoke'){note=prompt(`Reason to ${action} ${row.name}:`)||'';if(!note.trim())return}if(!confirm(`${action.toUpperCase()} ${row.name}'s signup?`))return;try{const r=await fetch(`/api/potluck/${encodeURIComponent(row.id)}/decision`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,textConfirmed,note})});const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to update');$('adminMessage').className='ok';$('adminMessage').textContent=`Signup ${d.status}.`;await refresh()}catch(e){$('adminMessage').className='error';$('adminMessage').textContent=e.message}}
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.className=x===b?'active':'secondary');render()});$('search').addEventListener('input',()=>data&&render());refresh();

function renderOverview(rows){
 const roster=data.roster||[];
 const approved=roster.filter(r=>r.status==='approved');
 const pending=roster.filter(r=>r.status==='pending');
 const total=arr=>arr.reduce((sum,r)=>sum+(Number(r.attendees)||1),0);
 const guests=arr=>arr.reduce((sum,r)=>sum+Math.max(0,(Number(r.attendees)||1)-1),0);
 const servings=arr=>arr.reduce((sum,r)=>sum+(Number(r.servings)||0),0);
 const summary=$('attendanceOverview');summary.replaceChildren();
 const tiles=el('div','board-summary');
 for(const [label,value] of [
  ['Confirmed people',total(approved)],['Approved RSVPs',approved.length],
  ['Additional guests',guests(approved)],['Pending people',total(pending)],
  ['Approved food servings',servings(rows.filter(r=>r.status==='approved'))],['Pending food servings',servings(rows.filter(r=>r.status==='pending'))]
 ]){const tile=el('div','board-tile');tile.append(el('b','',value),el('span','',label));tiles.append(tile)}
 summary.append(tiles);
 const attendeeBody=$('attendeeRows');attendeeBody.replaceChildren();
 const active=roster.sort((a,b)=>a.name.localeCompare(b.name));
 if(!active.length){const tr=el('tr');const td=el('td','', 'No registrations yet.');td.colSpan=5;tr.append(td);attendeeBody.append(tr)}
 for(const r of active){const tr=el('tr');const n=Number(r.attendees)||1;for(const value of [r.name,Math.max(0,n-1),n,r.contributions.map(c=>c.dish+' ('+c.servings+')').join('; '),r.status])tr.append(el('td','',value));attendeeBody.append(tr)}
 const food=$('foodOverview');food.replaceChildren();
 for(const c of data.categories||[]){const a=Number(c.approved)||0, p=Number(c.pending)||0, t=Number(c.target)||0;
  const card=el('div','food-category');card.append(el('strong','',`${c.icon||''} ${c.name}`),el('p','',`${a} approved contributor(s) / ${t} minimum • ${p} pending`),el('p','hint',`${c.approvedServings||0} approved portions • ${c.pendingServings||0} pending portions`));
  const track=el('div','board-track'),fill=el('div','board-fill');fill.style.width=`${t?Math.min(100,a/t*100):0}%`;track.append(fill);card.append(track);
  card.append(el('small','',a>t?`${a-t} additional contributor(s) — more welcome`:a===t?'Contributor goal met — more welcome':`${t-a} more contributor(s) suggested`));food.append(card);
 }
 const foodBody=$('foodRows');foodBody.replaceChildren();
 const activeContributions=rows.filter(r=>['approved','pending'].includes(r.status));
 if(!activeContributions.length){const tr=el('tr'),td=el('td','','No food commitments yet.');td.colSpan=5;tr.append(td);foodBody.append(tr)}
 for(const r of activeContributions){const tr=el('tr');const category=(data.categories||[]).find(c=>c.id===r.category);for(const value of [r.name,category?.name||r.category,r.dish,r.servings,r.status])tr.append(el('td','',value));foodBody.append(tr)}
}
