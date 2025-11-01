
// v6 core
const LS_USERS='lssd_users_v6', LS_SESSION='lssd_session_v6', LS_DAILY='lssd_daily_v6', LS_CPZ='lssd_cpz_v6', LS_EQUIP='lssd_equip_v6', LS_ROLES='lssd_roles_v6', LS_LOGS='lssd_logs_v6';
function P(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(_){return null}} function S(k,v){localStorage.setItem(k,JSON.stringify(v))} function G(k,f){const v=P(k);return (v==null?f:v)}
function current(){return G(LS_SESSION,null)}
function roleLabel(key){const r=G(LS_ROLES,{}); return (r[key]&&r[key].label)||key }
function canManageUsers(u){const rs=G(LS_ROLES,{}); return !!(rs[u.role]&&rs[u.role].perms&&rs[u.role].perms.users) || u.role==='admin'}
function canReview(u){const rs=G(LS_ROLES,{}); return !!(rs[u.role]&&rs[u.role].perms&&rs[u.role].perms.review_chain)}
function dailyList(){return G(LS_DAILY,[])} function dailySave(rec){const L=dailyList(); if(rec.id){const i=L.findIndex(r=>r.id===rec.id);L[i]=rec;} else {rec.id=(L.at(-1)?.id||0)+1; L.push(rec);} S(LS_DAILY,L); return rec}
function cpzList(){return G(LS_CPZ,[])} function cpzSave(rec){const L=cpzList(); if(rec.id){const i=L.findIndex(r=>r.id===rec.id);L[i]=rec;} else {rec.id=(L.at(-1)?.id||0)+1; L.push(rec);} S(LS_CPZ,L); return rec}
const APPROVAL_CHAIN=['sergeant','lieutenant','captain','commander','division_chief','assistant_sheriff','undersheriff','sheriff'];
function nextStatus(old){ if(old==='submitted') return 'sergeant_ok'; const idx=APPROVAL_CHAIN.findIndex(k=>`${k}_ok`===old); if(idx>=0 && idx<APPROVAL_CHAIN.length-1) return `${APPROVAL_CHAIN[idx+1]}_ok`; return old }
function shouldSee(u, rec){ if(!canReview(u)) return false; if(rec.shift!==u.shift) return false; const expect = rec.status==='submitted' ? 'sergeant' : rec.status.replace('_ok',''); return u.role===expect || u.role==='admin' }

// Logout bootstrap (always there)
window.__logout = function(){ try { for (let i=localStorage.length-1;i>=0;i--){ const k=localStorage.key(i); if(k && k.startsWith('lssd_')) localStorage.removeItem(k);} sessionStorage.clear(); }catch(e){} location.href='login' };

document.addEventListener('DOMContentLoaded',()=>{
  const y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
  const u=current(); // null on login, but on intranet pages must exist
  if(document.querySelector('.content') && !u){ location.href='login'; return; }

  // Sidebar/topbar visibility by role
  const adminNav=document.getElementById('adminNav'), adminTop=document.getElementById('adminTop');
  const sNav=document.getElementById('sergeantNav'), sTop=document.getElementById('sergeantTop');
  const rNav=document.getElementById('reviewNav');
  if(u){
    if(canManageUsers(u) || ['assistant_sheriff','undersheriff','sheriff','admin'].includes(u.role)){ if(adminNav) adminNav.classList.remove('hide'); if(adminTop) adminTop.classList.remove('hide'); }
    // Review nav: only for those with review right (Sergeant+)
    if(canReview(u)){ if(rNav) rNav.classList.remove('hide'); }
    // Sergeant hub: from Sergeant up
    const order=['deputy_trainee','deputy_sheriff','deputy_sheriff_bonus_i','deputy_sheriff_bonus_ii','senior_deputy_master_fto','sergeant','lieutenant','captain','commander','division_chief','assistant_sheriff','undersheriff','sheriff','admin'];
    const isSgtPlus = order.indexOf(u.role) >= order.indexOf('sergeant');
    if(isSgtPlus){ if(sNav) sNav.classList.remove('hide'); if(sTop) sTop.classList.remove('hide'); }
  }

  // Welcome banner (one-shot after login)
  if((location.pathname.endsWith('/dashboard') || location.pathname.endsWith('dashboard.html')) && u){
    const w=sessionStorage.getItem('lssd_welcome');
    if(w==='1'){ const card=document.getElementById('welcomeCard'); const text=document.getElementById('welcomeText'); if(card&&text){ text.textContent='Vítejte, ' + (u.fullName||u.username) + ' (' + roleLabel(u.role) + ')'; card.classList.remove('hide'); setTimeout(()=>card.classList.add('hide'), 4500); } sessionStorage.removeItem('lssd_welcome'); }
  }

  // DASHBOARD
  if(location.pathname.endsWith('/dashboard') || location.pathname.endsWith('dashboard.html')){
    document.getElementById('uName').textContent=(u.fullName? u.fullName+' ('+u.username+')' : u.username);
    document.getElementById('uRole').textContent=roleLabel(u.role);
    document.getElementById('uShift').textContent=u.shift;
    const myD=dailyList().filter(r=>r.author===u.username).slice(-8).reverse();
    const myC=cpzList().filter(r=>r.author===u.username).slice(-8).reverse();
    document.getElementById('myDaily').innerHTML=myD.map(r=>`<li>#${r.id} – ${r.date} – ${r.summary} <small>(${r.status})</small></li>`).join('') || '<li>Žádné záznamy.</li>';
    document.getElementById('myCPZ').innerHTML=myC.map(r=>`<li>#${r.id} – ${r.date} – ${r.subject} <small>(${r.status})</small></li>`).join('') || '<li>Žádné záznamy.</li>';
  }

  // DAILY NEW — robust submit
  if(location.pathname.endsWith('/report-new') || location.pathname.endsWith('report-new.html')){
    document.getElementById('d_shift').value=u.shift;
    document.getElementById('d_date').value=new Date().toISOString().slice(0,10);
    const form=document.getElementById('dailyForm'); const err=document.getElementById('dailyErr');
    function doSubmit(e){ if(e) e.preventDefault(); err.textContent=''; try{ const rec={ id:null, author:u.username, shift:document.getElementById('d_shift').value, date:document.getElementById('d_date').value, summary:document.getElementById('d_summary').value.trim(), detail:document.getElementById('d_detail').value.trim(), status:'submitted', history:[{ts:new Date().toISOString(), by:u.username, action:'submit'}] }; if(!rec.summary) throw Error('Vyplň souhrn'); dailySave(rec); alert('Odesláno ke schválení.'); location.href='dashboard'; }catch(ex){ err.textContent=ex.message } }
    form.addEventListener('submit', doSubmit);
    document.getElementById('saveDaily').addEventListener('click', doSubmit);
  }

  // CPZ NEW — robust submit
  if(location.pathname.endsWith('/cpz-new') || location.pathname.endsWith('cpz-new.html')){
    document.getElementById('c_shift').value=u.shift;
    const iso=new Date().toISOString().slice(0,16); document.getElementById('c_date').value=iso;
    const form=document.getElementById('cpzForm'); const err=document.getElementById('cpzErr');
    function doSubmit(e){ if(e) e.preventDefault(); err.textContent=''; try{ const rec={ id:null, author:u.username, shift:document.getElementById('c_shift').value, date:document.getElementById('c_date').value, subject:document.getElementById('c_subject').value.trim(), charges:document.getElementById('c_charges').value.trim(), narrative:document.getElementById('c_narr').value.trim(), status:'submitted', history:[{ts:new Date().toISOString(), by:u.username, action:'submit'}] }; if(!rec.subject) throw Error('Vyplň subjekt'); cpzSave(rec); alert('Odesláno ke schválení.'); location.href='dashboard'; }catch(ex){ err.textContent=ex.message } }
    form.addEventListener('submit', doSubmit);
    document.getElementById('saveCPZ').addEventListener('click', doSubmit);
  }

  // REVIEW
  if(location.pathname.endsWith('/review') || location.pathname.endsWith('review.html')){
    const rNav=document.getElementById('reviewNav'); if(!canReview(u)){ location.href='dashboard'; return; }
    const dailyTB=document.querySelector('#dailyQueue tbody'); const cpzTB=document.querySelector('#cpzQueue tbody');
    function render(){ const D=dailyList().filter(r=>shouldSee(u,r)); dailyTB.innerHTML=''; D.forEach(r=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${r.id}</td><td>${r.author}</td><td>${r.shift}</td><td>${r.date}</td><td>${r.summary}</td><td>${r.status}</td><td><button class='btn primary' data-act='ok' data-type='d' data-id='${r.id}'>Schválit</button> <button class='btn' data-act='rej' data-type='d' data-id='${r.id}'>Zamítnout</button></td>`; dailyTB.appendChild(tr) }); if(!D.length) dailyTB.innerHTML='<tr><td colspan="7">Žádné položky ve frontě.</td></tr>';
      const C=cpzList().filter(r=>shouldSee(u,r)); cpzTB.innerHTML=''; C.forEach(r=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${r.id}</td><td>${r.author}</td><td>${r.shift}</td><td>${r.date}</td><td>${r.subject}</td><td>${r.status}</td><td><button class='btn primary' data-act='ok' data-type='c' data-id='${r.id}'>Schválit</button> <button class='btn' data-act='rej' data-type='c' data-id='${r.id}'>Zamítnout</button></td>`; cpzTB.appendChild(tr) }); if(!C.length) cpzTB.innerHTML='<tr><td colspan="7">Žádné položky ve frontě.</td></tr>'; }
    function act(act, typ, id){ if(typ==='d'){ const L=dailyList(); const i=L.findIndex(r=>r.id==id); if(i<0) return; if(act==='ok'){ L[i].status=nextStatus(L[i].status); L[i].history.push({ts:new Date().toISOString(), by:u.username, action:'approve'}) } else { L[i].status='rejected'; L[i].history.push({ts:new Date().toISOString(), by:u.username, action:'reject'}) } S(LS_DAILY,L);} else { const L=cpzList(); const i=L.findIndex(r=>r.id==id); if(i<0) return; if(act==='ok'){ L[i].status=nextStatus(L[i].status); L[i].history.push({ts:new Date().toISOString(), by:u.username, action:'approve'}) } else { L[i].status='rejected'; L[i].history.push({ts:new Date().toISOString(), by:u.username, action:'reject'}) } S(LS_CPZ,L);} render(); }
    dailyTB.addEventListener('click',e=>{const t=e.target; if(t.dataset.act){act(t.dataset.act,t.dataset.type,t.dataset.id)}}); cpzTB.addEventListener('click',e=>{const t=e.target; if(t.dataset.act){act(t.dataset.act,t.dataset.type,t.dataset.id)}});
    render();
  }

  // SERGEANT HUB
  if(location.pathname.endsWith('/sergeant-hub') || location.pathname.endsWith('sergeant-hub.html')){
    const order=['deputy_trainee','deputy_sheriff','deputy_sheriff_bonus_i','deputy_sheriff_bonus_ii','senior_deputy_master_fto','sergeant','lieutenant','captain','commander','division_chief','assistant_sheriff','undersheriff','sheriff','admin'];
    const isSgtPlus = order.indexOf(u.role) >= order.indexOf('sergeant');
    if(!isSgtPlus){ location.href='dashboard'; return; }
    const dBody=document.querySelector('#sgtDaily tbody'); const cBody=document.querySelector('#sgtCPZ tbody');
    function render(){ const D=dailyList().filter(r=> r.shift===u.shift && r.status==='submitted'); dBody.innerHTML=''; D.forEach(r=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${r.id}</td><td>${r.author}</td><td>${r.date}</td><td>${r.summary}</td><td><button class='btn primary' data-type='d' data-act='ok' data-id='${r.id}'>Schválit</button> <button class='btn' data-type='d' data-act='rej' data-id='${r.id}'>Zamítnout</button></td>`; dBody.appendChild(tr) }); if(!D.length) dBody.innerHTML='<tr><td colspan="5">Nic k vyřízení.</td></tr>'; const C=cpzList().filter(r=> r.shift===u.shift && r.status==='submitted'); cBody.innerHTML=''; C.forEach(r=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${r.id}</td><td>${r.author}</td><td>${r.date}</td><td>${r.subject}</td><td><button class='btn primary' data-type='c' data-act='ok' data-id='${r.id}'>Schválit</button> <button class='btn' data-type='c' data-act='rej' data-id='${r.id}'>Zamítnout</button></td>`; cBody.appendChild(tr) }); if(!C.length) cBody.innerHTML='<tr><td colspan="5">Nic k vyřízení.</td></tr>'; }
    function act(act,type,id){ if(type==='d'){ const L=dailyList(); const i=L.findIndex(r=>r.id==id); if(i<0) return; if(act==='ok'){ L[i].status='sergeant_ok'; L[i].history.push({ts:new Date().toISOString(), by:u.username, action:'approve'}) } else { L[i].status='rejected'; L[i].history.push({ts:new Date().toISOString(), by:u.username, action:'reject'}) } S(LS_DAILY,L); } else { const L=cpzList(); const i=L.findIndex(r=>r.id==id); if(i<0) return; if(act==='ok'){ L[i].status='sergeant_ok'; L[i].history.push({ts:new Date().toISOString(), by:u.username, action:'approve'}) } else { L[i].status='rejected'; L[i].history.push({ts:new Date().toISOString(), by:u.username, action:'reject'}) } S(LS_CPZ,L); } render(); }
    document.body.addEventListener('click',e=>{const t=e.target; if(t.dataset.type && t.dataset.act && t.dataset.id){ act(t.dataset.act, t.dataset.type, t.dataset.id) }});
    render();
  }

  
// ---- v6.1 admin quality-of-life ----
function _normRoleKey(s){ return (s||'').toLowerCase().trim().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'') }


// ADMIN (Assistant Sheriff+)
  if(location.pathname.endsWith('/admin') || location.pathname.endsWith('admin.html')){
    const isAdminAllowed = ['assistant_sheriff','undersheriff','sheriff','admin'].includes(u.role);
    if(!isAdminAllowed){ location.href='dashboard'; return; }
    const order=['deputy_trainee','deputy_sheriff','deputy_sheriff_bonus_i','deputy_sheriff_bonus_ii','senior_deputy_master_fto','sergeant','lieutenant','captain','commander','division_chief','assistant_sheriff','undersheriff','sheriff','admin'];
    document.querySelectorAll('[data-role-min]').forEach(sec=>{ const need=sec.getAttribute('data-role-min'); if(order.indexOf(u.role) < order.indexOf(need)) sec.classList.add('hide'); });
    const rs=G(LS_ROLES,{}); const userBody=document.querySelector('#usersTable tbody'), roleBody=document.querySelector('#rolesTable tbody');
    const u_id=document.getElementById('u_id'), u_name=document.getElementById('u_name'), u_pass=document.getElementById('u_pass'), u_role=document.getElementById('u_role'), u_shift=document.getElementById('u_shift'), u_full=document.getElementById('u_full'), u_err=document.getElementById('userErr');
    function fillRoleSelect(){ u_role.innerHTML=''; let entries=Object.entries(rs); const ord=window.__LSSD_ORDER||[]; if(ord.length){ entries.sort((a,b)=> ord.indexOf(a[0]) - ord.indexOf(b[0])) } entries.forEach(([k,v])=>{const o=document.createElement('option');o.value=k;o.textContent=v.label; u_role.appendChild(o)})}
    function users(){return G(LS_USERS,[])} function saveUsers(list){S(LS_USERS,list)}
    function renderUsers(){ const list=users(); userBody.innerHTML=''; list.forEach(us=>{const tr=document.createElement('tr'); tr.innerHTML=`<td>${us.username}</td><td>${us.fullName||'—'}</td><td>${(rs[us.role]&&rs[us.role].label)||us.role}</td><td>${us.shift}</td><td><button class='btn' data-act='edit' data-u='${us.username}'>Upravit</button> <button class='btn' data-act='del' data-u='${us.username}'>Smazat</button></td>`; userBody.appendChild(tr) }); if(!list.length) userBody.innerHTML='<tr><td colspan="5">Žádní uživatelé.</td></tr>' }
    userBody.addEventListener('click',e=>{const t=e.target; const name=t.dataset.u; if(t.dataset.act==='edit'){const us=users().find(x=>x.username===name); u_id.value=us.username; u_name.value=us.username; u_role.value=us.role; u_shift.value=us.shift; u_pass.value=''; u_full.value=us.fullName||''} if(t.dataset.act==='del'){ if(confirm('Smazat uživatele?')){ const list=users().filter(x=>x.username!==name); saveUsers(list); renderUsers(); } });
    function doSaveUser(e){ e.preventDefault(); u_err.textContent=''; try{ const list=users(); const name=u_name.value.trim(); const pass=u_pass.value; const role=u_role.value; const shift=u_shift.value; const full=u_full.value.trim(); if(name.length<3) throw Error('Min 3 znaky'); let L=list.slice(); const i=L.findIndex(x=>x.username===name); if(i>=0){ L[i]={...L[i],username:name,role,shift,fullName:full||L[i].fullName,password:pass||L[i].password} } else { if(pass.length<8) throw Error('Nové heslo min 8 znaků'); L.push({username:name,password:pass,role,shift,fullName:full||name}) } saveUsers(L); u_id.value=''; u_name.value=''; u_pass.value=''; u_full.value=''; renderUsers(); }catch(ex){u_err.textContent=ex.message} }
    document.getElementById('saveUser').addEventListener('click',doSaveUser);
    document.getElementById('userForm').addEventListener('submit',doSaveUser);
    document.getElementById('resetUser').addEventListener('click',(e)=>{e.preventDefault(); u_id.value=''; u_name.value=''; u_pass.value=''; u_full.value=''; u_role.value=Object.keys(rs)[0]; u_shift.value='A'; u_err.textContent='' });
    fillRoleSelect(); renderUsers();

    const seedUsersBtn=document.getElementById('seedDefaultUsers'); const userMsg=document.getElementById('userMsg');
    if(seedUsersBtn){ seedUsersBtn.addEventListener('click',()=>{ try{ const defaults=[
      {username:'lssd-admin',password:'Admin-1234',role:'admin',shift:'A',fullName:'Admin User'},
      {username:'sgt-a',password:'Sergeant-1234',role:'sergeant',shift:'A',fullName:'John Doe'},
      {username:'lt-a',password:'Lieutenant-1234',role:'lieutenant',shift:'A',fullName:'Jane Smith'},
      {username:'cpt-a',password:'Captain-1234',role:'captain',shift:'A',fullName:'Alex Johnson'},
      {username:'deputy1',password:'Deputy-1234',role:'deputy_sheriff',shift:'A',fullName:'Chris Brown'}
    ]; S(LS_USERS,defaults); renderUsers(); userMsg.textContent='Výchozí účty obnoveny.'; setTimeout(()=>userMsg.textContent='',2500);}catch(e){ alert('Chyba: '+e.message) } }); }

    const r_id=document.getElementById('r_id'), r_key=document.getElementById('r_key'), r_label=document.getElementById('r_label'), p_any=document.getElementById('p_review_any'), p_users=document.getElementById('p_users'), r_err=document.getElementById('roleErr');
    function renderRoles(){ roleBody.innerHTML=''; let entries=Object.entries(rs); const ord=window.__LSSD_ORDER||[]; if(ord.length){ entries.sort((a,b)=> ord.indexOf(a[0]) - ord.indexOf(b[0])) } entries.forEach(([k,v])=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${k}</td><td>${v.label}</td><td>${v.perms&&v.perms.review_chain?'✓':'—'}</td><td>${v.perms&&v.perms.users?'✓':'—'}</td><td><button class='btn' data-act='edit' data-k='${k}'>Upravit</button> <button class='btn' data-act='del' data-k='${k}'>Smazat</button></td>`; roleBody.appendChild(tr) }); if(!Object.keys(rs).length) roleBody.innerHTML='<tr><td colspan="5">Žádné role.</td></tr>' }
    roleBody.addEventListener('click',e=>{const t=e.target; const key=t.dataset.k; if(t.dataset.act==='edit'){ const rr=rs[key]; r_id.value=key; r_key.value=key; r_label.value=rr.label; p_any.checked=!!(rr.perms&&rr.perms.review_chain); p_users.checked=!!(rr.perms&&rr.perms.users) } if(t.dataset.act==='del'){ if(confirm('Smazat roli?')){ delete rs[key]; S(LS_ROLES,rs); renderRoles();

    const seedRolesBtn=document.getElementById('seedDefaultRoles'); const roleMsg=document.getElementById('roleMsg');
    if(seedRolesBtn){ seedRolesBtn.addEventListener('click',()=>{ try{
      const base={'deputy_trainee':'Deputy Trainee','deputy_sheriff':'Deputy Sheriff','deputy_sheriff_bonus_i':'Deputy Sheriff Bonus I','deputy_sheriff_bonus_ii':'Deputy Sheriff Bonus II','senior_deputy_master_fto':'Senior Deputy Master FTO','sergeant':'Sergeant','lieutenant':'Lieutenant','captain':'Captain','commander':'Commander','division_chief':'Division Chief','assistant_sheriff':'Assistant Sheriff','undersheriff':'Undersheriff','sheriff':'Sheriff','admin':'Admin'};
      const perms=(k)=>({review_chain:['sergeant','lieutenant','captain','commander','division_chief','assistant_sheriff','undersheriff','sheriff'].includes(k), users:['sheriff','undersheriff','assistant_sheriff','division_chief','commander','captain','admin'].includes(k)});
      const o={}; Object.entries(base).forEach(([k,l])=>o[k]={label:l,perms:perms(k)}); S(LS_ROLES,o); location.reload();
    }catch(e){ alert('Chyba: '+e.message) } }); } } });
    function doSaveRole(e){ e.preventDefault(); r_err.textContent=''; try{ let k=_normRoleKey(r_key.value); const l=r_label.value.trim(); if(!k||!l) throw Error('Vyplň klíč i popisek'); if(rs[k] && r_id.value!==k) throw Error('Tento klíč už existuje'); rs[k]={label:l,perms:{review_chain:p_any.checked,users:p_users.checked}}; S(LS_ROLES,rs); r_id.value=''; r_key.value=''; r_label.value=''; p_any.checked=p_users.checked=false; renderRoles();

    const seedRolesBtn=document.getElementById('seedDefaultRoles'); const roleMsg=document.getElementById('roleMsg');
    if(seedRolesBtn){ seedRolesBtn.addEventListener('click',()=>{ try{
      const base={'deputy_trainee':'Deputy Trainee','deputy_sheriff':'Deputy Sheriff','deputy_sheriff_bonus_i':'Deputy Sheriff Bonus I','deputy_sheriff_bonus_ii':'Deputy Sheriff Bonus II','senior_deputy_master_fto':'Senior Deputy Master FTO','sergeant':'Sergeant','lieutenant':'Lieutenant','captain':'Captain','commander':'Commander','division_chief':'Division Chief','assistant_sheriff':'Assistant Sheriff','undersheriff':'Undersheriff','sheriff':'Sheriff','admin':'Admin'};
      const perms=(k)=>({review_chain:['sergeant','lieutenant','captain','commander','division_chief','assistant_sheriff','undersheriff','sheriff'].includes(k), users:['sheriff','undersheriff','assistant_sheriff','division_chief','commander','captain','admin'].includes(k)});
      const o={}; Object.entries(base).forEach(([k,l])=>o[k]={label:l,perms:perms(k)}); S(LS_ROLES,o); location.reload();
    }catch(e){ alert('Chyba: '+e.message) } }); } const m=document.getElementById('roleMsg'); if(m){ m.textContent='Uloženo.'; setTimeout(()=>m.textContent='',2000) } }catch(ex){ r_err.textContent=ex.message } }
    document.getElementById('saveRole').addEventListener('click',doSaveRole);
    document.getElementById('roleForm').addEventListener('submit',doSaveRole);
    renderRoles();

    const seedRolesBtn=document.getElementById('seedDefaultRoles'); const roleMsg=document.getElementById('roleMsg');
    if(seedRolesBtn){ seedRolesBtn.addEventListener('click',()=>{ try{
      const base={'deputy_trainee':'Deputy Trainee','deputy_sheriff':'Deputy Sheriff','deputy_sheriff_bonus_i':'Deputy Sheriff Bonus I','deputy_sheriff_bonus_ii':'Deputy Sheriff Bonus II','senior_deputy_master_fto':'Senior Deputy Master FTO','sergeant':'Sergeant','lieutenant':'Lieutenant','captain':'Captain','commander':'Commander','division_chief':'Division Chief','assistant_sheriff':'Assistant Sheriff','undersheriff':'Undersheriff','sheriff':'Sheriff','admin':'Admin'};
      const perms=(k)=>({review_chain:['sergeant','lieutenant','captain','commander','division_chief','assistant_sheriff','undersheriff','sheriff'].includes(k), users:['sheriff','undersheriff','assistant_sheriff','division_chief','commander','captain','admin'].includes(k)});
      const o={}; Object.entries(base).forEach(([k,l])=>o[k]={label:l,perms:perms(k)}); S(LS_ROLES,o); location.reload();
    }catch(e){ alert('Chyba: '+e.message) } }); }

    const logsBody=document.querySelector('#logsTable tbody'); function renderLogs(){ const L=G(LS_LOGS,[]).slice().reverse(); logsBody.innerHTML=''; L.forEach(row=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${new Date(row.ts).toLocaleString()}</td><td>${row.user}</td><td>${row.action}</td><td>${row.entity}</td><td>${row.detail||'—'}</td>`; logsBody.appendChild(tr) }); if(!L.length) logsBody.innerHTML='<tr><td colspan="5">Prázdné.</td></tr>' }
    renderLogs();
    document.getElementById('exportLogs').addEventListener('click',()=>{ const data=JSON.stringify(G(LS_LOGS,[]),null,2); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([data],{type:'application/json'})); a.download='lssd-logs.json'; a.click(); URL.revokeObjectURL(a.href) });
    document.getElementById('clearLogs').addEventListener('click',()=>{ if(confirm('Vyčistit logy?')){ S(LS_LOGS,[]); renderLogs(); } });
  }
});
