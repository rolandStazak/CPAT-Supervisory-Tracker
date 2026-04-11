// ── CONFIGURATION ─────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBujHbgl7qvfTOqYYHHDl31i8M8dI5fXf0",
  authDomain:        "cpat-supervisory-tracker.firebaseapp.com",
  projectId:         "cpat-supervisory-tracker",
  storageBucket:     "cpat-supervisory-tracker.firebasestorage.app",
  messagingSenderId: "1082103191979",
  appId:             "1:1082103191979:web:09e5a3cb684d2193bf5aee"
};
// Only this Google account email can sign in.
const AUTHORIZED_EMAIL = "YOUR_EMAIL@EXAMPLE.COM";

// ── INIT ──────────────────────────────────────────────────────
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db   = firebase.firestore();

// ── STATE ─────────────────────────────────────────────────────
let attorneys = {};  // { id: { name, role, order } }
let matters   = {};  // { id: { name, attorneyIds[], order } }
let tasks     = {};  // { id: { matterId, description, dueDate, isOngoing, completed, completedDate, notes, order } }
let activeTab = 'overview';
let listeners = [];
let seeded    = false;

// ── AUTH ──────────────────────────────────────────────────────
document.getElementById('btn-signin').onclick = () =>
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
      .catch(e => { document.getElementById('login-error').textContent = e.message; });

document.getElementById('btn-signout').onclick = () => {
  listeners.forEach(fn => fn()); listeners = [];
  auth.signOut();
};

auth.onAuthStateChanged(user => {
  if (user) {
    if (AUTHORIZED_EMAIL !== "YOUR_EMAIL@EXAMPLE.COM" && user.email !== AUTHORIZED_EMAIL) {
      document.getElementById('login-error').textContent = 'Access denied: unauthorized account.';
      auth.signOut(); return;
    }
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    startListeners();
  } else {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }
});

// ── FIRESTORE LISTENERS ───────────────────────────────────────
function startListeners() {
  listeners.push(
    db.collection('attorneys').onSnapshot(snap => {
      attorneys = {};
      snap.forEach(d => { attorneys[d.id] = d.data(); });
      if (!seeded) { seeded = true; seedIfEmpty(); }
      render();
    }),
    db.collection('matters').onSnapshot(snap => {
      matters = {};
      snap.forEach(d => { matters[d.id] = d.data(); });
      render();
    }),
    db.collection('tasks').onSnapshot(snap => {
      tasks = {};
      snap.forEach(d => { tasks[d.id] = d.data(); });
      render();
    })
  );
}

// ── SEED ──────────────────────────────────────────────────────
async function seedIfEmpty() {
  if (Object.keys(attorneys).length > 0) return;

  function xl(serial) { // Excel serial → ISO date string
    if (!serial) return null;
    return new Date((serial - 25569) * 86400 * 1000).toISOString().slice(0, 10);
  }

  const batch = db.batch();
  const STAFF = [
    {name:'Jill Abrams',      role:'Attorney'},
    {name:'Sarah Aceves',     role:'Attorney'},
    {name:'Merideth Chaudoir',role:'Attorney'},
    {name:'Rose Kennedy',     role:'Attorney'},
    {name:'Rizlaine Sabiani', role:'Attorney'},
    {name:'Justin Sherman',   role:'Attorney'},
    {name:'Alex Spring',      role:'Attorney'},
    {name:'Andre Souligny',   role:'Investigator'},
    {name:'Jonathan Goddard', role:'Investigator'},
    {name:'Gabriela Ferrari', role:'Paralegal'},
  ];
  const aIds = {};
  STAFF.forEach(({name, role}, i) => {
    const r = db.collection('attorneys').doc(); aIds[name] = r.id;
    batch.set(r, { name, role, order: i });
  });

  const jId = aIds['Jonathan Goddard'];
  const MATTERS = [
    { name:'Tobacco', tasks:[
      { description:'2 Desk Audits', dueDate:null, isOngoing:false, completed:true, completedDate:xl(46119), notes:'(Date may have been earlier, this is when we discussed)' },
      { description:'Tobacco Certifications Begin', dueDate:xl(46142), isOngoing:false, completed:false, completedDate:null, notes:'' }
    ]},
    { name:'Data Breach', tasks:[
      { description:'(3x Weekly) Data Breach Notice Report Processing', dueDate:null, isOngoing:true, completed:false, completedDate:null, notes:'' },
      { description:'(Daily) Data Breach Email Review', dueDate:null, isOngoing:true, completed:false, completedDate:null, notes:'' },
      { description:'Data Breach table - assess project first steps', dueDate:xl(46127), isOngoing:false, completed:false, completedDate:null, notes:'' },
      { description:'Data Breach table - Process Complete', dueDate:xl(46136), isOngoing:false, completed:false, completedDate:null, notes:'' },
      { description:'Update data breach webpage re affirmation for 14-day exemption', dueDate:xl(46172), isOngoing:false, completed:false, completedDate:null, notes:'(Not a priority, to be handled sometime after data breach tables)' }
    ]},
    { name:'Meta - Scams', tasks:[
      { description:'Document review - first 50', dueDate:xl(46129), isOngoing:false, completed:false, completedDate:null, notes:'(Sent guidance and initial assignment on 4/8)' },
      { description:'Document review - full', dueDate:xl(46157), isOngoing:false, completed:false, completedDate:null, notes:'' }
    ]},
    { name:'Plastics', tasks:[
      { description:'Something with Meghan and Natalie, TBD', dueDate:null, isOngoing:false, completed:false, completedDate:null, notes:'' }
    ]},
    { name:'FCA', tasks:[
      { description:'Did a project for Jill previously, unclear whether further work will be required', dueDate:null, isOngoing:false, completed:false, completedDate:null, notes:'' }
    ]},
    { name:'Casella', tasks:[
      { description:'Research project for Sarah re Casella acquisitions, possible antitrust', dueDate:null, isOngoing:false, completed:false, completedDate:null, notes:'Assigned 4/8, no ETA' }
    ]}
  ];

  let mo = 0;
  for (const m of MATTERS) {
    const mr = db.collection('matters').doc();
    batch.set(mr, { name: m.name, attorneyIds: [jId], order: mo++ });
    let to = 0;
    for (const t of m.tasks) batch.set(db.collection('tasks').doc(), { matterId: mr.id, ...t, order: to++ });
  }
  await batch.commit();
}

// ── HELPERS ───────────────────────────────────────────────────
function todayISO()   { return new Date().toISOString().slice(0,10); }
function weekISO()    { const d=new Date(); d.setDate(d.getDate()+7); return d.toISOString().slice(0,10); }
function fmtDate(iso) { if(!iso) return ''; const [y,m,d]=iso.split('-'); return `${m}/${d}/${y}`; }
function esc(s)       { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

function sortedAttorneys() {
  const roleOrder = {'Attorney':0,'Investigator':1,'Paralegal':2};
  return Object.entries(attorneys).sort((a,b) => {
    const ra = roleOrder[a[1].role ?? 'Attorney'] ?? 0;
    const rb = roleOrder[b[1].role ?? 'Attorney'] ?? 0;
    if (ra !== rb) return ra - rb;
    const la = (a[1].name||'').split(' ').pop().toLowerCase();
    const lb = (b[1].name||'').split(' ').pop().toLowerCase();
    return la.localeCompare(lb);
  });
}

function mattersFor(aId) {
  return Object.entries(matters).filter(([,m]) => m.attorneyIds?.includes(aId))
               .sort((a,b) => (a[1].order??0) - (b[1].order??0));
}
function tasksFor(mId) {
  return Object.entries(tasks).filter(([,t]) => t.matterId === mId)
               .sort((a,b) => (a[1].order??0) - (b[1].order??0));
}

function taskDateClass(t) {
  if (t.completed || t.isOngoing || !t.dueDate) return '';
  const today = todayISO(), week = weekISO();
  if (t.dueDate < today) return 'overdue';
  if (t.dueDate <= week) return 'upcoming';
  return '';
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
document.querySelectorAll('.modal-overlay').forEach(o =>
  o.addEventListener('click', e => { if (e.target === o) o.classList.add('hidden'); })
);

// ── RENDER ────────────────────────────────────────────────────
function render() { renderTabs(); renderContent(); }

function renderTabs() {
  const today = todayISO(), nav = document.getElementById('tab-nav');
  let html = `<button class="tab-btn${activeTab==='overview'?' active':''}" onclick="setTab('overview')">Overview</button>`;
  for (const [id, a] of sortedAttorneys()) {
    const overdueCount = mattersFor(id).flatMap(([mid]) => tasksFor(mid))
      .filter(([,t]) => !t.completed && !t.isOngoing && t.dueDate && t.dueDate < today).length;
    const cls = `tab-btn${activeTab===id?' active':''}${overdueCount?' has-overdue':''}`;
    html += `<button class="${cls}" onclick="setTab('${id}')" title="${esc(a.name)}">${esc(a.name)}</button>`;
  }
  html += `<button class="tab-btn${activeTab==='__manage'?' active':''}" onclick="setTab('__manage')" style="margin-left:auto;color:var(--muted)">⚙ Manage Staff</button>`;
  nav.innerHTML = html;
}

function setTab(id) { activeTab = id; render(); }

function renderContent() {
  const el = document.getElementById('tab-content');
  if (activeTab === 'overview')    el.innerHTML = renderOverview();
  else if (activeTab === '__manage') el.innerHTML = renderManage();
  else {
    const a = attorneys[activeTab];
    if (!a) { el.innerHTML = ''; return; }
    el.innerHTML = renderAttorneyTab(activeTab, a);
  }
}

// ── ROLE COLORS ───────────────────────────────────────────────
const ROLE_COLORS = {
  'Attorney':    'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe',
  'Investigator':'background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0',
  'Paralegal':   'background:#fdf4ff;color:#7e22ce;border:1px solid #e9d5ff',
};

// ── OVERVIEW ──────────────────────────────────────────────────
function renderOverview() {
  const today = todayISO(), week = weekISO();
  let overdue = 0, upcoming = 0;
  Object.values(tasks).forEach(t => {
    if (t.completed || t.isOngoing || !t.dueDate) return;
    if (t.dueDate < today) overdue++;
    else if (t.dueDate <= week) upcoming++;
  });

  let html = `<div class="stats-grid">
    <div class="stat-card stat-primary"><div class="stat-val">${Object.keys(attorneys).length}</div><div class="stat-lbl">Staff</div></div>
    <div class="stat-card stat-primary"><div class="stat-val">${Object.keys(matters).length}</div><div class="stat-lbl">Active Matters</div></div>
    <div class="stat-card stat-overdue"><div class="stat-val">${overdue}</div><div class="stat-lbl">Overdue Tasks</div></div>
    <div class="stat-card stat-upcoming"><div class="stat-val">${upcoming}</div><div class="stat-lbl">Due This Week</div></div>
  </div><h2 style="font-size:.9rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px">Staff at a Glance</h2>`;

  for (const [aId, a] of sortedAttorneys()) {
    const aMatters = mattersFor(aId);
    let aOverdue = 0, aUpcoming = 0;
    aMatters.forEach(([mid]) => tasksFor(mid).forEach(([,t]) => {
      if (t.completed || t.isOngoing || !t.dueDate) return;
      if (t.dueDate < today) aOverdue++; else if (t.dueDate <= week) aUpcoming++;
    }));
    let badges = aOverdue ? `<span class="badge badge-overdue">${aOverdue} overdue</span>` : '';
    badges += aUpcoming ? `<span class="badge badge-upcoming">${aUpcoming} due soon</span>` : '';
    if (!aOverdue && !aUpcoming) badges = `<span class="badge badge-ok">On track</span>`;

    const roleStyle = ROLE_COLORS[a.role||'Attorney'] || '';
    html += `<div class="overview-card">
      <div class="overview-card-hdr" onclick="setTab('${aId}')">
        <h3>${esc(a.name)} <span style="font-size:.68rem;font-weight:700;padding:2px 7px;border-radius:10px;margin-left:6px;${roleStyle}">${esc(a.role||'Attorney')}</span></h3>
        <div class="badge-row">${badges}</div>
      </div>
      <div class="overview-matters">`;

    if (!aMatters.length) { html += `<div class="ov-row"><span class="ov-meta">No matters yet</span></div>`; }
    for (const [mid, m] of aMatters) {
      const mTasks = tasksFor(mid);
      const total = mTasks.filter(([,t]) => !t.isOngoing).length;
      const done  = mTasks.filter(([,t]) => t.completed).length;
      const mOver = mTasks.filter(([,t]) => !t.completed && !t.isOngoing && t.dueDate && t.dueDate < today).length;
      const others = (m.attorneyIds||[]).filter(id => id !== aId).map(id => attorneys[id]?.name).filter(Boolean);
      html += `<div class="ov-row">
        <span class="ov-name">${esc(m.name)}</span>
        <span class="ov-meta">${done}/${total} done${mOver ? ` · <span style="color:var(--danger)">${mOver} overdue</span>` : ''}</span>
        ${others.length ? `<span class="ov-also">also: ${esc(others.join(', '))}</span>` : ''}
      </div>`;
    }
    html += `</div></div>`;
  }
  return html;
}

// ── ATTORNEY TAB ──────────────────────────────────────────────
function renderAttorneyTab(aId, a) {
  const today = todayISO(), week = weekISO();
  let html = `<div class="atty-hdr"><h2>${esc(a.name)}</h2>
    <button class="btn btn-primary" onclick="openAddMatter('${aId}')">+ Add Matter</button></div>`;

  const aMatters = mattersFor(aId);
  if (!aMatters.length) return html + `<div class="empty-state">No matters yet. Click "+ Add Matter" to get started.</div>`;

  for (const [mId, m] of aMatters) {
    const others = (m.attorneyIds||[]).filter(id => id !== aId).map(id => attorneys[id]?.name).filter(Boolean);
    html += `<div class="matter-card">
      <div class="matter-hdr">
        <span class="matter-name">${esc(m.name)}</span>
        ${others.length ? `<span class="matter-also">also: ${esc(others.join(', '))}</span>` : ''}
        <div class="matter-actions">
          <button class="btn btn-ghost btn-sm" onclick="openEditMatter('${mId}','${aId}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDel('matter','${mId}','${esc(m.name)}')">Delete</button>
        </div>
      </div>
      <table class="task-table">
        <thead><tr><th style="width:26px"></th><th>Task</th><th style="width:105px">Due</th><th style="width:105px">Status</th><th>Notes</th><th style="width:72px"></th></tr></thead>
        <tbody>`;

    const mTasks = tasksFor(mId);
    const ongoing = mTasks.filter(([,t]) => t.isOngoing);
    const active  = mTasks.filter(([,t]) => !t.isOngoing && !t.completed)
                          .sort((a,b) => {
                            if (!a[1].dueDate && !b[1].dueDate) return 0;
                            if (!a[1].dueDate) return 1;
                            if (!b[1].dueDate) return -1;
                            return a[1].dueDate.localeCompare(b[1].dueDate);
                          });
    const done    = mTasks.filter(([,t]) => t.completed);

    for (const [tId, t] of [...ongoing, ...active]) html += taskRow(tId, t, today, week);

    if (done.length) {
      html += `</tbody></table><div class="done-divider">✓ Completed (${done.length})</div>
        <table class="task-table"><tbody>`;
      for (const [tId, t] of done) html += taskRow(tId, t, today, week);
    }

    html += `</tbody></table>
      <div style="padding:8px 12px">
        <button class="add-task-btn" onclick="openAddTask('${mId}')">+ Add Task</button>
      </div></div>`;
  }
  return html;
}

function taskRow(tId, t, today, week) {
  const dc = taskDateClass(t);
  const rowCls = t.completed ? 'task-row is-done' : 'task-row';

  let ctrl = '', dateCell = '', statusCell = '';
  if (t.isOngoing) {
    ctrl = `<span class="ongoing-pill">↻</span>`;
    dateCell = `<td class="task-date">—</td>`;
    statusCell = `<td><span class="ongoing-pill">Ongoing</span></td>`;
  } else if (t.completed) {
    ctrl = `<input type="checkbox" class="task-checkbox" checked onchange="toggleTask('${tId}',false)">`;
    dateCell = `<td class="task-date done-date">${t.completedDate ? fmtDate(t.completedDate) : 'Done'}</td>`;
    statusCell = `<td><span class="done-pill">✓ Complete</span></td>`;
  } else {
    ctrl = `<input type="checkbox" class="task-checkbox" onchange="openCompleteModal('${tId}',this)">`;
    dateCell = t.dueDate
      ? `<td class="task-date ${dc}">${dc==='overdue' ? '⚠ ' : ''}${fmtDate(t.dueDate)}</td>`
      : `<td class="task-date">—</td>`;
    statusCell = dc==='overdue'  ? `<td><span class="badge badge-overdue">Overdue</span></td>`
               : dc==='upcoming' ? `<td><span class="badge badge-upcoming">Due Soon</span></td>`
               : `<td></td>`;
  }

  return `<tr class="${rowCls}">
    <td>${ctrl}</td>
    <td class="task-desc">${esc(t.description)}</td>
    ${dateCell}${statusCell}
    <td class="task-notes">${esc(t.notes||'')}</td>
    <td class="task-actions">
      <button class="icon-btn" onclick="openEditTask('${tId}')" title="Edit">✎</button>
      <button class="icon-btn del" onclick="confirmDel('task','${tId}','${esc(t.description)}')" title="Delete">✕</button>
    </td>
  </tr>`;
}

// ── MANAGE TAB ────────────────────────────────────────────────
function renderManage() {
  let html = `<div style="max-width:600px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h2 style="font-size:1.05rem;font-weight:700">Manage Staff</h2>
      <button class="btn btn-primary" onclick="openAddAttorney()">+ Add Staff Member</button>
    </div>
    <div style="background:var(--surface);border-radius:10px;border:1px solid var(--border);overflow:hidden">`;
  const list = sortedAttorneys();
  if (!list.length) html += `<div class="empty-state">No staff yet.</div>`;
  let lastRole = null;
  for (const [id, a] of list) {
    const role = a.role || 'Attorney';
    if (role !== lastRole) {
      lastRole = role;
      html += `<div style="padding:6px 16px;background:#f8fafc;border-bottom:1px solid var(--border);font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)">${role}s</div>`;
    }
    const mc = mattersFor(id).length;
    const roleStyle = ROLE_COLORS[role] || '';
    html += `<div class="manage-row">
      <span style="flex:1;font-weight:500">${esc(a.name)}</span>
      <span style="font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:10px;margin-right:12px;${roleStyle}">${esc(role)}</span>
      <span style="color:var(--muted);font-size:.8rem;margin-right:14px">${mc} matter${mc!==1?'s':''}</span>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" onclick="openEditAttorney('${id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDel('attorney','${id}','${esc(a.name)}')">Remove</button>
      </div>
    </div>`;
  }
  return html + '</div></div>';
}

// ── CRUD: TASK ────────────────────────────────────────────────
async function toggleTask(id, completed, date) {
  await db.collection('tasks').doc(id).update({ completed, completedDate: completed ? (date || todayISO()) : null });
}

// ── COMPLETE MODAL ────────────────────────────────────────────
let _completeTaskId = null, _completeCb = null;
function openCompleteModal(taskId, cb) {
  _completeTaskId = taskId; _completeCb = cb;
  const t = tasks[taskId];
  document.getElementById('mcomplete-desc').textContent = t?.description || '';
  document.getElementById('mcomplete-date').value = todayISO();
  document.getElementById('modal-complete').classList.remove('hidden');
}
function cancelCompleteModal() {
  if (_completeCb) _completeCb.checked = false;
  closeModal('modal-complete');
}
document.getElementById('mcomplete-save').onclick = async () => {
  const date = document.getElementById('mcomplete-date').value || todayISO();
  await toggleTask(_completeTaskId, true, date);
  closeModal('modal-complete');
};
document.getElementById('modal-complete').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-complete')) cancelCompleteModal();
});

// ── CRUD: TASK MODAL ──────────────────────────────────────────
let _taskMatter = null, _taskEdit = null;
function openAddTask(mId) {
  _taskMatter = mId; _taskEdit = null;
  document.getElementById('mtask-title').textContent = 'Add Task';
  ['mtask-desc','mtask-date','mtask-notes'].forEach(i => document.getElementById(i).value = '');
  document.getElementById('mtask-ongoing').checked = false;
  document.getElementById('modal-task').classList.remove('hidden');
  document.getElementById('mtask-desc').focus();
}
function openEditTask(id) {
  _taskEdit = id; _taskMatter = null;
  const t = tasks[id];
  document.getElementById('mtask-title').textContent = 'Edit Task';
  document.getElementById('mtask-desc').value    = t.description || '';
  document.getElementById('mtask-date').value    = t.dueDate || '';
  document.getElementById('mtask-notes').value   = t.notes || '';
  document.getElementById('mtask-ongoing').checked = !!t.isOngoing;
  document.getElementById('modal-task').classList.remove('hidden');
  document.getElementById('mtask-desc').focus();
}
document.getElementById('mtask-save').onclick = async () => {
  const desc = document.getElementById('mtask-desc').value.trim(); if (!desc) return;
  const dueDate   = document.getElementById('mtask-date').value || null;
  const notes     = document.getElementById('mtask-notes').value.trim();
  const isOngoing = document.getElementById('mtask-ongoing').checked;
  if (_taskEdit) {
    await db.collection('tasks').doc(_taskEdit).update({ description: desc, dueDate, notes, isOngoing });
  } else {
    const existing = Object.values(tasks).filter(t => t.matterId === _taskMatter);
    const order = existing.length ? Math.max(...existing.map(t => t.order ?? 0)) + 1 : 0;
    await db.collection('tasks').doc().set({ matterId: _taskMatter, description: desc, dueDate, notes, isOngoing, completed: false, completedDate: null, order });
  }
  closeModal('modal-task');
};

// ── CRUD: MATTER ──────────────────────────────────────────────
let _matterPrimary = null, _matterEdit = null;
function openAddMatter(aId) {
  _matterPrimary = aId; _matterEdit = null;
  document.getElementById('mmatter-title').textContent = 'Add Matter';
  document.getElementById('mmatter-name').value = '';
  populateMatterAttys(aId, []);
  document.getElementById('modal-matter').classList.remove('hidden');
  document.getElementById('mmatter-name').focus();
}
function openEditMatter(mId, viewingAs) {
  _matterEdit = mId; _matterPrimary = viewingAs;
  const m = matters[mId];
  document.getElementById('mmatter-title').textContent = 'Edit Matter';
  document.getElementById('mmatter-name').value = m.name || '';
  populateMatterAttys(viewingAs, m.attorneyIds || []);
  document.getElementById('modal-matter').classList.remove('hidden');
  document.getElementById('mmatter-name').focus();
}
function populateMatterAttys(primaryId, selected) {
  const c = document.getElementById('mmatter-attys'); c.innerHTML = '';
  const others = sortedAttorneys().filter(([id]) => id !== primaryId);
  if (!others.length) {
    c.innerHTML = '<span style="color:var(--muted);font-size:.82rem">No other staff to share with.</span>';
    return;
  }
  others.forEach(([id, a]) => {
    c.innerHTML += `<label class="check-row"><input type="checkbox" value="${id}" ${selected.includes(id) ? 'checked' : ''}> ${esc(a.name)}</label>`;
  });
}
document.getElementById('mmatter-save').onclick = async () => {
  const name = document.getElementById('mmatter-name').value.trim(); if (!name) return;
  const extra = [...document.querySelectorAll('#mmatter-attys input:checked')].map(i => i.value);
  const aIds = [...(new Set([_matterPrimary, ...extra]))].filter(Boolean);
  if (_matterEdit) {
    await db.collection('matters').doc(_matterEdit).update({ name, attorneyIds: aIds });
  } else {
    const order = Object.keys(matters).length ? Math.max(...Object.values(matters).map(m => m.order ?? 0)) + 1 : 0;
    await db.collection('matters').doc().set({ name, attorneyIds: aIds, order });
  }
  closeModal('modal-matter');
};

// ── CRUD: ATTORNEY ────────────────────────────────────────────
let _attyEdit = null;
function openAddAttorney() {
  _attyEdit = null;
  document.getElementById('matty-title').textContent = 'Add Staff Member';
  document.getElementById('matty-name').value = '';
  document.getElementById('matty-role').value = 'Attorney';
  document.getElementById('modal-attorney').classList.remove('hidden');
  document.getElementById('matty-name').focus();
}
function openEditAttorney(id) {
  _attyEdit = id;
  document.getElementById('matty-title').textContent = 'Edit Staff Member';
  document.getElementById('matty-name').value  = attorneys[id]?.name || '';
  document.getElementById('matty-role').value  = attorneys[id]?.role || 'Attorney';
  document.getElementById('modal-attorney').classList.remove('hidden');
  document.getElementById('matty-name').focus();
}
document.getElementById('matty-save').onclick = async () => {
  const name = document.getElementById('matty-name').value.trim(); if (!name) return;
  const role = document.getElementById('matty-role').value;
  if (_attyEdit) {
    await db.collection('attorneys').doc(_attyEdit).update({ name, role });
  } else {
    const order = Object.keys(attorneys).length ? Math.max(...Object.values(attorneys).map(a => a.order ?? 0)) + 1 : 0;
    await db.collection('attorneys').doc().set({ name, role, order });
  }
  closeModal('modal-attorney');
};

// ── DELETE ────────────────────────────────────────────────────
let _del = null;
function confirmDel(type, id, label) {
  _del = {type, id};
  const msgs = {
    attorney: `Remove "${label}"? Their matters stay in the system but won't be linked to them.`,
    matter:   `Delete "${label}" and all its tasks? This cannot be undone.`,
    task:     `Delete task "${label}"?`
  };
  document.getElementById('mconfirm-title').textContent = `Delete ${type}?`;
  document.getElementById('mconfirm-msg').textContent   = msgs[type] || '';
  document.getElementById('modal-confirm').classList.remove('hidden');
}
document.getElementById('mconfirm-ok').onclick = async () => {
  if (!_del) return;
  const {type, id} = _del;
  if (type === 'attorney') {
    const batch = db.batch();
    batch.delete(db.collection('attorneys').doc(id));
    Object.entries(matters).forEach(([mid, m]) => {
      if (m.attorneyIds?.includes(id))
        batch.update(db.collection('matters').doc(mid), {attorneyIds: m.attorneyIds.filter(x => x !== id)});
    });
    await batch.commit();
    if (activeTab === id) setTab('overview');
  } else if (type === 'matter') {
    const batch = db.batch();
    batch.delete(db.collection('matters').doc(id));
    Object.entries(tasks).filter(([,t]) => t.matterId === id)
          .forEach(([tid]) => batch.delete(db.collection('tasks').doc(tid)));
    await batch.commit();
  } else if (type === 'task') {
    await db.collection('tasks').doc(id).delete();
  }
  _del = null; closeModal('modal-confirm');
};

// ── KEYBOARD SHORTCUTS ────────────────────────────────────────
document.getElementById('matty-name').addEventListener('keydown',  e => { if (e.key==='Enter') document.getElementById('matty-save').click(); });
document.getElementById('mmatter-name').addEventListener('keydown', e => { if (e.key==='Enter') document.getElementById('mmatter-save').click(); });
document.getElementById('mtask-desc').addEventListener('keydown',   e => { if (e.key==='Enter') document.getElementById('mtask-save').click(); });
