// ═══════════════════════════════
// STATE
// ═══════════════════════════════
let currentRole = null;
let currentUID = null;

const USERS = {
  '10023': { name: 'Admin User', role: 'admin', initials: 'AU' },
  '10045': { name: 'Sarah Admin', role: 'admin', initials: 'SA' },
  '20087': { name: 'Alex Turner', role: 'user', score: 84, violations: 2, warnings: 1 },
  '20041': { name: 'Jordan Park', role: 'user', score: 91, violations: 0, warnings: 0 },
  '20055': { name: 'Sam Rivera', role: 'user', score: 61, violations: 4, warnings: 3 },
};

const POLICIES = [
  { id: 'P001', title: 'Data Protection Policy', date: '2024-09-15', version: 'v3.2', status: 'active' },
  { id: 'P002', title: 'Security Protocol Guidelines', date: '2024-08-01', version: 'v2.1', status: 'active' },
  { id: 'P003', title: 'Code of Conduct', date: '2024-07-20', version: 'v4.0', status: 'active' },
  { id: 'P004', title: 'Access Control Framework', date: '2024-06-10', version: 'v1.5', status: 'superseded' },
];

const VIOLATIONS = [
  { id: 'V001', user: '20087', name: 'Alex Turner', policy: 'Data Protection', severity: 'High', date: '2024-10-18', status: 'Confirmed' },
  { id: 'V002', user: '20087', name: 'Alex Turner', policy: 'Security Protocol', severity: 'Medium', date: '2024-10-10', status: 'Under Review' },
  { id: 'V003', user: '20055', name: 'Sam Rivera', policy: 'Code of Conduct', severity: 'High', date: '2024-10-05', status: 'Confirmed' },
  { id: 'V004', user: '20055', name: 'Sam Rivera', policy: 'Data Protection', severity: 'High', date: '2024-09-28', status: 'Confirmed' },
  { id: 'V005', user: '20055', name: 'Sam Rivera', policy: 'Access Control', severity: 'Medium', date: '2024-09-15', status: 'Dismissed' },
  { id: 'V006', user: '20041', name: 'Jordan Park', policy: 'Security Protocol', severity: 'Low', date: '2024-09-01', status: 'Dismissed' },
];

const APPEALS = [
  { id: 'A001', violationId: 'V001', user: 'Alex Turner', uid: '20087', date: '2024-10-19', message: 'The flagged data access was part of an authorized Q4 audit.', status: 'Under Review' },
  { id: 'A002', violationId: 'V003', user: 'Sam Rivera', uid: '20055', date: '2024-10-07', message: 'This was a miscommunication with team lead, documented in ticket #4821.', status: 'Pending' },
];

const AUDIT_LOGS = [
  { ts: '2024-10-20 09:14:32', actor: '10023', action: 'Policy Upload', target: 'Data Protection Policy v3.2', ip: '192.168.1.40' },
  { ts: '2024-10-20 08:55:10', actor: '20087', action: 'User Login', target: '—', ip: '192.168.1.55' },
  { ts: '2024-10-19 16:40:01', actor: '20087', action: 'Appeal Submitted', target: 'V001', ip: '192.168.1.55' },
  { ts: '2024-10-18 14:22:45', actor: '10023', action: 'Violation Confirmed', target: 'V001 — Alex Turner', ip: '192.168.1.40' },
  { ts: '2024-10-18 11:03:20', actor: 'SYSTEM', action: 'Violation Detected', target: 'V001 — 20087', ip: '—' },
  { ts: '2024-10-10 13:15:08', actor: 'SYSTEM', action: 'Violation Detected', target: 'V002 — 20087', ip: '—' },
  { ts: '2024-10-08 10:00:00', actor: '20087', action: 'User Login', target: '—', ip: '192.168.1.55' },
  { ts: '2024-10-05 09:30:55', actor: '10023', action: 'Violation Confirmed', target: 'V003 — Sam Rivera', ip: '192.168.1.40' },
  { ts: '2024-09-28 15:12:20', actor: 'SYSTEM', action: 'Violation Detected', target: 'V004 — 20055', ip: '—' },
  { ts: '2024-09-15 11:45:00', actor: '10023', action: 'Policy Upload', target: 'Security Protocol v2.1', ip: '192.168.1.40' },
];

let selectedPolicyFile = null;

// ═══════════════════════════════
// AUTH
// ═══════════════════════════════
function doLogin() {
  const uid = document.getElementById('uid-input').value.trim();
  const err = document.getElementById('login-error');

  if (USERS[uid]) {
    currentUID = uid;
    currentRole = USERS[uid].role;
    err.style.display = 'none';
    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('screen-app').classList.add('active');
    setupApp();
  } else if (uid.startsWith('100') || uid.startsWith('200')) {
    currentUID = uid;
    currentRole = uid.startsWith('100') ? 'admin' : 'user';
    err.style.display = 'none';
    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('screen-app').classList.add('active');
    setupApp();
  } else {
    err.style.display = 'block';
  }
}

function connectDatabase(){
  console.log(document.getElementById('connection').innerText);
  if(document.getElementById('connection').innerText == 'Not Connected'){
      let api = prompt("Enter your cloud API");
      if(api.length > 2){
          console.log(api);
          document.getElementById('connection').innerHTML = '<i class="fa-solid fa-hourglass"></i> Connecting';
          document.getElementById('connection').style.color = 'gray';

          setTimeout( () =>{
              document.getElementById('connection').innerHTML = '<i class="fa-solid fa-link"></i> Connected to DB';
              document.getElementById('connection').style.color = 'var(--green)';
              showToast("Connected to Database");
      },2000);
      }

  }

  else{
      document.getElementById('connection').innerHTML = '<i class="fa-solid fa-ban"></i> Not Connected';
      document.getElementById('connection').style.color = 'var(--red)';
      showToast("Disconnected from database");
  }

}

document.getElementById('uid-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

function doLogout() {
  currentUID = null;
  currentRole = null;
  document.getElementById('screen-app').classList.remove('active');
  document.getElementById('screen-login').classList.add('active');
  document.getElementById('uid-input').value = '';
}

// ═══════════════════════════════
// APP SETUP
// ═══════════════════════════════
function setupApp() {
  const user = USERS[currentUID] || { name: currentUID, role: currentRole, initials: currentUID.slice(0,2) };

  // UI setup
  document.getElementById('user-id-display').textContent = currentUID;
  document.getElementById('user-avatar').textContent = user.initials || currentUID.slice(0,2).toUpperCase();
  const rp = document.getElementById('role-pill');
  rp.textContent = currentRole;
  rp.className = 'role-pill ' + currentRole;

  // Admin-only nav
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = currentRole === 'admin' ? 'flex' : 'none';
  });

  // Init pages
  initDashboard();
  initPolicies();
  initViolations();
  initAppeals();
  initPrediction();
  initAudit();

  // User-specific
  if (currentRole === 'user') {
    document.getElementById('user-appeal-form').style.display = 'block';
    document.getElementById('appeals-sub').textContent = 'Submit appeals for disputed violations and track their progress.';
    document.getElementById('appeals-table-title').textContent = 'My Appeals';
    document.getElementById('violations-sub').textContent = 'Your compliance violations and their current status.';
    document.getElementById('admin-filters').style.display = 'none';
    document.getElementById('admin-pred-select').style.display = 'none';
    document.getElementById('connection').style.display = 'none';
  } else {
    document.getElementById('user-appeal-form').style.display = 'none';
    document.getElementById('appeals-sub').textContent = 'Review and decide on submitted violation appeals.';
    document.getElementById('appeals-table-title').textContent = 'All Appeals';
    document.getElementById('violations-sub').textContent = 'Detect and manage policy violations across the organization.';
    document.getElementById('admin-filters').style.display = 'flex';
    document.getElementById('admin-pred-select').style.display = 'flex';
  }

  // Check pending appeals
  if (currentRole === 'admin') {
    const pending = APPEALS.filter(a => a.status === 'Pending' || a.status === 'Under Review').length;
    document.getElementById('appeal-notif').style.display = pending > 0 ? 'inline-block' : 'none';
  }

  showPage('dashboard');
}

// ═══════════════════════════════
// NAVIGATION
// ═══════════════════════════════
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.querySelector('[data-page="' + id + '"]').classList.add('active');
}

// ═══════════════════════════════
// DASHBOARD
// ═══════════════════════════════
function initDashboard() {
  if (currentRole === 'admin') {
    document.getElementById('admin-dash-main').style.display = 'grid';
    document.getElementById('user-dash-main').style.display = 'none';
    document.getElementById('admin-dash-actions').style.display = 'flex';
    document.getElementById('dash-title').innerHTML = 'System <span>Overview</span>';
    document.getElementById('dash-sub').textContent = 'Organization-wide compliance status and activity.';

    document.getElementById('dash-stats').innerHTML = `
      <div class="stat-card gold">
        <div class="stat-label">Total Users</div>
        <div class="stat-value">3</div>
        <div class="stat-meta">active accounts</div>
      </div>
      <div class="stat-card red">
        <div class="stat-label">Open Violations</div>
        <div class="stat-value">4</div>
        <div class="stat-meta">+2 this week</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-label">Pending Appeals</div>
        <div class="stat-value">2</div>
        <div class="stat-meta">awaiting review</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Active Policies</div>
        <div class="stat-value">3</div>
        <div class="stat-meta">in effect</div>
      </div>
    `;

    const tbody = document.getElementById('admin-violations-body');
    tbody.innerHTML = VIOLATIONS.slice(0, 5).map(v => `
      <tr>
        <td><strong>${v.name}</strong> <span style="color:var(--text3);font-family:'JetBrains Mono',monospace;font-size:10px;">${v.user}</span></td>
        <td>${v.policy}</td>
        <td><span class="severity-${v.severity.toLowerCase()}">${v.severity}</span></td>
        <td><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text2)">${v.date}</span></td>
        <td>${statusBadge(v.status)}</td>
      </tr>
    `).join('');

    const feed = document.getElementById('admin-activity-feed');
    feed.innerHTML = AUDIT_LOGS.slice(0, 6).map(l => {
      const colors = { 'User Login':'var(--blue)', 'Policy Upload':'var(--gold)', 'Violation Detected':'var(--red)', 'Violation Confirmed':'var(--orange)', 'Appeal Submitted':'var(--green)' };
      return `<div class="audit-item">
        <div class="audit-dot" style="background:${colors[l.action]||'var(--text3)'}"></div>
        <div class="audit-line">
          <div class="audit-action">${l.action}</div>
          <div class="audit-meta">${l.actor} · ${l.ts} · ${l.target}</div>
        </div>
      </div>`;
    }).join('');

  } else {
    document.getElementById('admin-dash-main').style.display = 'none';
    document.getElementById('user-dash-main').style.display = 'block';
    document.getElementById('admin-dash-actions').style.display = 'none';
    const user = USERS[currentUID] || {};
    const name = user.name || 'User';
    document.getElementById('dash-title').innerHTML = `Welcome, <span>${name.split(' ')[0]}</span>`;
    document.getElementById('dash-sub').textContent = 'Your compliance status and activity summary.';

    const score = user.score || 84;
    document.getElementById('user-score').textContent = score;
    const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--gold)' : 'var(--red)';
    document.getElementById('user-score').style.color = color;
    const circumference = 352;
    const offset = circumference - (score / 100) * circumference;
    document.getElementById('score-ring-fill').setAttribute('stroke', color);
    document.getElementById('score-ring-fill').setAttribute('stroke-dashoffset', offset);

    document.getElementById('dash-stats').innerHTML = `
      <div class="stat-card green">
        <div class="stat-label">Compliance Score</div>
        <div class="stat-value" style="color:${color}">${score}</div>
        <div class="stat-meta">out of 100</div>
      </div>
      <div class="stat-card red">
        <div class="stat-label">Violations</div>
        <div class="stat-value">${user.violations || 2}</div>
        <div class="stat-meta">total on record</div>
      </div>
      <div class="stat-card gold">
        <div class="stat-label">Warnings</div>
        <div class="stat-value">${user.warnings || 1}</div>
        <div class="stat-meta">issued</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-label">Submissions</div>
        <div class="stat-value">12</div>
        <div class="stat-meta">this quarter</div>
      </div>
    `;

    document.getElementById('user-policies-list').innerHTML = POLICIES.filter(p => p.status === 'active').map(p => `
      <div class="policy-card">
        <div class="policy-icon">📋</div>
        <div class="policy-info">
          <div class="policy-name">${p.title}</div>
          <div class="policy-meta">${p.version} · Updated ${p.date}</div>
        </div>
        <button class="btn btn-outline" style="font-size:10px;padding:5px 10px;">View</button>
      </div>
    `).join('');

    const myViolations = VIOLATIONS.filter(v => v.user === currentUID);
    document.getElementById('user-violations-mini').innerHTML = myViolations.length === 0
      ? `<div class="empty-state"><div class="empty-icon">✓</div><div class="empty-text">No violations</div><div class="empty-sub">Great compliance record!</div></div>`
      : myViolations.map(v => `
        <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:13px;font-weight:600;">${v.policy}</div>
            <div style="font-size:11px;color:var(--text3);font-family:'JetBrains Mono',monospace;margin-top:2px;">${v.date} · <span class="severity-${v.severity.toLowerCase()}">${v.severity}</span></div>
          </div>
          ${statusBadge(v.status)}
        </div>
      `).join('');
  }
}

// ═══════════════════════════════
// POLICIES
// ═══════════════════════════════
function renderPolicyLibraryAndHistory() {
  const lib = document.getElementById('policy-library');
  if (lib) {
    lib.innerHTML = POLICIES.map(p => `
    <div class="policy-card">
      <div class="policy-icon">📄</div>
      <div class="policy-info">
        <div class="policy-name">${p.title}</div>
        <div class="policy-meta">${p.version} · ${p.date} · <span class="badge ${policyStatusBadge(p.status)}">${p.status}</span></div>
      </div>
    </div>
  `).join('');
  }

  const tbody = document.getElementById('policy-history-body');
  if (tbody) {
    tbody.innerHTML = POLICIES.map(p => `
    <tr>
      <td><strong>${p.title}</strong></td>
      <td><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text2)">${currentUID}</span></td>
      <td><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text2)">${p.date}</span></td>
      <td><span class="mono" style="font-size:11px;">${p.version}</span></td>
      <td><span class="badge ${policyStatusBadge(p.status)}">${p.status}</span></td>
      <td style="display:flex;gap:6px;">
        <button class="btn btn-outline" style="font-size:10px;padding:4px 8px;" onclick="togglePolicyStatus('${p.id}')">${p.status === 'suspended' ? 'Activate' : 'Suspend'}</button>
        <button class="btn btn-outline" style="font-size:10px;padding:4px 8px;" onclick="downloadPolicy('${p.id}')">Download</button>
      </td>
    </tr>
  `).join('');
  }
}

function initPolicies() {
  renderPolicyLibraryAndHistory();

  const fileInput = document.getElementById('policy-file-input');
  const uploadZone = document.getElementById('policy-upload-zone');
  const fileNameEl = document.getElementById('policy-file-name');

  if (fileNameEl) {
    fileNameEl.textContent = 'No file selected.';
  }

  if (fileInput && uploadZone) {
    fileInput.addEventListener('change', handlePolicyFileInputChange);

    ['dragenter', 'dragover'].forEach(evt => {
      uploadZone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'dragend', 'drop'].forEach(evt => {
      uploadZone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.remove('drag-over');
      });
    });

    uploadZone.addEventListener('drop', e => {
      const files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      const file = files[0];
      if (file.type !== 'application/pdf') {
        showToast('⚠ Please drop a PDF file.');
        return;
      }
      selectedPolicyFile = file;
      if (fileNameEl) {
        fileNameEl.textContent = file.name;
      }
    });
  }
}

async function uploadPolicy() {
  const title = document.getElementById('policy-title-input').value.trim();
  if (!title) { showToast('⚠ Please enter a policy title.'); return; }
  if (!selectedPolicyFile) { showToast('⚠ Please choose a PDF file.'); return; }

  const btn = document.getElementById('policy-upload-btn');
  const originalText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Uploading...'; }

  const formData = new FormData();
  formData.append('file', selectedPolicyFile);
  formData.append('title', title);

  try {
    const res = await fetch('/api/upload-policy', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (!res.ok) {
      showToast('⚠ ' + (data.error || 'Upload failed.'));
      return;
    }

    const newId = 'P' + String(POLICIES.length + 1).padStart(3, '0');
    const today = now().split(' ')[0];
    POLICIES.unshift({
      id: newId,
      title: title,
      date: today,
      version: 'v1.0',
      status: 'active',
      filename: data.filename,
      extractedText: data.extracted_text || ''
    });
    console.log(POLICIES)

    showToast('✓ Policy "' + title + '" uploaded and processed. ' + (data.page_count ? data.page_count + ' pages extracted.' : ''));
    AUDIT_LOGS.unshift({ ts: now(), actor: currentUID, action: 'Policy Upload', target: title + ' (PDF extracted)', ip: '192.168.1.40' });

    renderPolicyLibraryAndHistory();

    document.getElementById('policy-title-input').value = '';
    const fileInput = document.getElementById('policy-file-input');
    const fileNameEl = document.getElementById('policy-file-name');
    if (fileInput) fileInput.value = '';
    selectedPolicyFile = null;
    if (fileNameEl) fileNameEl.textContent = 'No file selected.';
  } catch (err) {
    showToast('⚠ Upload failed. Is the server running?');
    console.error(err);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = originalText; }
  }
}

function handlePolicyFileInputChange(e) {
  const file = e.target.files && e.target.files[0];
  const fileNameEl = document.getElementById('policy-file-name');
  if (!file) {
    selectedPolicyFile = null;
    if (fileNameEl) fileNameEl.textContent = 'No file selected.';
    return;
  }
  if (file.type !== 'application/pdf') {
    showToast('⚠ Please select a PDF file.');
    e.target.value = '';
    selectedPolicyFile = null;
    if (fileNameEl) fileNameEl.textContent = 'No file selected.';
    return;
  }
  selectedPolicyFile = file;
  if (fileNameEl) {
    fileNameEl.textContent = file.name;
  }
}

function openPolicyFileDialog(event) {
  if (event && event.preventDefault) {
    event.preventDefault();
  }
  const input = document.getElementById('policy-file-input');
  if (input) {
    input.click();
  }
}

function policyStatusBadge(status) {
  const map = { 'active': 'badge-green', 'suspended': 'badge-orange', 'superseded': 'badge-gray' };
  return map[status] || 'badge-gray';
}

function togglePolicyStatus(policyId) {
  const p = POLICIES.find(x => x.id === policyId);
  if (!p) return;
  p.status = p.status === 'active' ? 'suspended' : 'active';
  renderPolicyLibraryAndHistory();
  showToast(`✓ Policy "${p.title}" ${p.status}.`);
}

function downloadPolicy(policyId) {
  const p = POLICIES.find(x => x.id === policyId);
  if (!p) return;
  const content = `ComplianceOS Policy Document\n${'='.repeat(40)}\n\nPolicy ID: ${p.id}\nTitle: ${p.title}\nVersion: ${p.version}\nDate: ${p.date}\nStatus: ${p.status}\n\n${'='.repeat(40)}\n\nThis document represents the policy record. The full PDF is available through your compliance administrator.`;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${p.title.replace(/[^a-z0-9]/gi, '_')}_${p.version}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`✓ Downloaded ${p.title}`);
}

// ═══════════════════════════════
// VIOLATIONS
// ═══════════════════════════════
function initViolations() {
  renderViolationsTable(VIOLATIONS);
}

function renderViolationsTable(data) {
  const isAdmin = currentRole === 'admin';
  const myData = isAdmin ? data : data.filter(v => v.user === currentUID);
  const col = document.getElementById('violations-action-col');
  if (col) col.textContent = isAdmin ? 'Action' : 'Details';

  document.getElementById('violations-tbody').innerHTML = myData.map(v => `
    <tr>
      <td><span class="mono" style="color:var(--gold);font-size:11px;">${v.id}</span></td>
      <td>
        ${isAdmin ? `<strong>${v.name}</strong> <span style="color:var(--text3);font-family:'JetBrains Mono',monospace;font-size:10px;">${v.user}</span>` : `<span style="color:var(--text)">${v.user}</span>`}
      </td>
      <td>${v.policy}</td>
      <td><span class="severity-${v.severity.toLowerCase()}">${v.severity}</span></td>
      <td><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text2)">${v.date}</span></td>
      <td>${statusBadge(v.status)}</td>
      <td>
        ${isAdmin ? `
          <div style="display:flex;gap:4px;">
            <button class="btn btn-outline" style="font-size:9px;padding:3px 7px;" onclick="markViolation('${v.id}','Confirmed')">Confirm</button>
            <button class="btn btn-outline" style="font-size:9px;padding:3px 7px;" onclick="markViolation('${v.id}','Dismissed')">Dismiss</button>
            <button class="btn btn-outline" style="font-size:9px;padding:3px 7px;" onclick="markViolation('${v.id}','Under Review')">Review</button>
          </div>
        ` : `<button class="btn btn-outline" style="font-size:9px;padding:3px 7px;" onclick="showPage('appeals')">Appeal</button>`}
      </td>
    </tr>
  `).join('');
}

function markViolation(id, status) {
  const v = VIOLATIONS.find(x => x.id === id);
  if (v) { v.status = status; renderViolationsTable(VIOLATIONS); showToast(`✓ Violation ${id} marked as ${status}.`); }
}

function filterViolations() {
  const user = document.getElementById('filter-user').value.toLowerCase();
  const policy = document.getElementById('filter-policy').value;
  const status = document.getElementById('filter-status').value;
  const severity = document.getElementById('filter-severity').value;
  const filtered = VIOLATIONS.filter(v =>
    (!user || v.name.toLowerCase().includes(user) || v.user.includes(user)) &&
    (!policy || v.policy.includes(policy)) &&
    (!status || v.status === status) &&
    (!severity || v.severity === severity)
  );
  renderViolationsTable(filtered);
}

// ═══════════════════════════════
// APPEALS
// ═══════════════════════════════
function initAppeals() {
  renderAppealsTable();
}

function renderAppealsTable() {
  const isAdmin = currentRole === 'admin';
  const myAppeals = isAdmin ? APPEALS : APPEALS.filter(a => a.uid === currentUID);
  const col = document.getElementById('appeals-action-col');
  if (col) col.textContent = isAdmin ? 'Decision' : 'Status Detail';

  document.getElementById('appeals-tbody').innerHTML = myAppeals.length === 0
    ? `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3);">No appeals found.</td></tr>`
    : myAppeals.map(a => `
    <tr>
      <td><span class="mono" style="color:var(--blue);font-size:11px;">${a.id}</span></td>
      <td><span class="mono" style="color:var(--red);font-size:11px;">${a.violationId}</span></td>
      <td>${a.user}</td>
      <td><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text2)">${a.date}</span></td>
      <td style="max-width:200px;font-size:12px;color:var(--text2);">${a.message.slice(0,60)}${a.message.length>60?'…':''}</td>
      <td>${appealBadge(a.status)}</td>
      <td>
        ${isAdmin ? `
          <div style="display:flex;gap:4px;">
            <button class="btn btn-outline" style="font-size:9px;padding:3px 8px;" onclick="viewAppealDetails('${a.id}')">View</button>
            <button class="btn btn-gold" style="font-size:9px;padding:3px 8px;" onclick="decideAppeal('${a.id}','Approved')">Approve</button>
            <button class="btn btn-danger" style="font-size:9px;padding:3px 8px;" onclick="decideAppeal('${a.id}','Rejected')">Reject</button>
          </div>
        ` : `
          <div style="display:flex;gap:4px;align-items:center;">
            <button class="btn btn-outline" style="font-size:9px;padding:3px 8px;" onclick="viewAppealDetails('${a.id}')">View</button>
            <span style="font-size:11px;color:var(--text2);">
              ${a.status === 'Pending' ? 'Awaiting admin review' : 'Under review by admin'}
            </span>
          </div>
        `}
      </td>
    </tr>
  `).join('');
}

function submitAppeal() {
  const vid = document.getElementById('appeal-violation-select').value;
  const msg = document.getElementById('appeal-message').value.trim();
  if (!vid || !msg) { showToast('⚠ Please select a violation and write an explanation.'); return; }
  APPEALS.push({
    id: 'A00' + (APPEALS.length + 1),
    violationId: vid,
    user: USERS[currentUID]?.name || currentUID,
    uid: currentUID,
    date: now().split(' ')[0],
    message: msg,
    status: 'Pending'
  });
  renderAppealsTable();
  document.getElementById('appeal-violation-select').value = '';
  document.getElementById('appeal-message').value = '';
  document.getElementById('appeal-notes').value = '';
  showToast('✓ Appeal submitted successfully.');
  AUDIT_LOGS.unshift({ ts: now(), actor: currentUID, action: 'Appeal Submitted', target: vid, ip: '192.168.x.x' });
}

function decideAppeal(id, decision) {
  const idx = APPEALS.findIndex(x => x.id === id);
  if (idx === -1) return;
  const a = APPEALS[idx];
  a.status = decision;
  // Remove the appeal from the list after a decision
  APPEALS.splice(idx, 1);
  renderAppealsTable();
  showToast(`✓ Appeal ${id} ${decision}.`);
}

function viewAppealDetails(id) {
  const a = APPEALS.find(x => x.id === id);
  if (!a) {
    showToast('⚠ Appeal not found. It may have already been resolved.');
    return;
  }
  const body = document.getElementById('appeal-modal-body');
  const modal = document.getElementById('appeal-modal');
  if (!body || !modal) return;

  body.innerHTML = `
    <div class="modal-body-row">
      <div class="modal-body-label">Appeal ID</div>
      <div class="modal-body-value">${a.id}</div>
    </div>
    <div class="modal-body-row">
      <div class="modal-body-label">Violation</div>
      <div class="modal-body-value">${a.violationId}</div>
    </div>
    <div class="modal-body-row">
      <div class="modal-body-label">User</div>
      <div class="modal-body-value">${a.user} (${a.uid})</div>
    </div>
    <div class="modal-body-row">
      <div class="modal-body-label">Submitted</div>
      <div class="modal-body-value">${a.date}</div>
    </div>
    <div class="modal-body-row">
      <div class="modal-body-label">Status</div>
      <div class="modal-body-value">${a.status}</div>
    </div>
    <textarea class="modal-body-message" disabled>${a.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
  `;

  modal.style.display = 'flex';
}

function closeAppealModal() {
  const modal = document.getElementById('appeal-modal');
  if (modal) modal.style.display = 'none';
}

// ═══════════════════════════════
// PREDICTION
// ═══════════════════════════════
const PRED_DATA = {
  '20087': { violations: 2, score: 84, frequency: 0.7, appeals: 1, warnings: 1, risk: 52 },
  '20041': { violations: 0, score: 91, frequency: 0.9, appeals: 0, warnings: 0, risk: 12 },
  '20055': { violations: 4, score: 61, frequency: 0.4, appeals: 1, warnings: 3, risk: 78 },
};

function initPrediction() {
  if (currentRole === 'user') {
    document.getElementById('admin-pred-select').style.display = 'none';
    updatePredictionFor(currentUID);
  } else {
    document.getElementById('admin-pred-select').style.display = 'flex';
    updatePrediction();
  }
}

function updatePrediction() {
  const uid = document.getElementById('pred-user-select').value;
  updatePredictionFor(uid);
}

function updatePredictionFor(uid) {
  const d = PRED_DATA[uid] || PRED_DATA['20087'];
  const risk = d.risk;

  document.getElementById('risk-percent').textContent = risk + '%';

  const angle = -90 + (risk / 100) * 180;
  document.getElementById('risk-needle').style.transform = `translateX(-50%) rotate(${angle}deg)`;

  let cat, col;
  if (risk < 35) { cat = 'LOW RISK'; col = 'var(--green)'; document.getElementById('risk-percent').style.color = 'var(--green)'; }
  else if (risk < 65) { cat = 'MEDIUM RISK'; col = 'var(--gold)'; document.getElementById('risk-percent').style.color = 'var(--gold)'; }
  else { cat = 'HIGH RISK'; col = 'var(--red)'; document.getElementById('risk-percent').style.color = 'var(--red)'; }

  const catEl = document.getElementById('risk-category');
  catEl.textContent = cat;
  catEl.className = 'badge ' + (risk < 35 ? 'badge-green' : risk < 65 ? 'badge-gold' : 'badge-red');
  catEl.style.display = 'inline-flex';
  catEl.style.margin = '8px auto 0';

  const factors = [
    { label: 'Violation History', val: d.violations, max: 6, pct: (d.violations / 6) * 100, color: 'var(--red)' },
    { label: 'Compliance Score', val: d.score + '/100', max: 100, pct: d.score, color: 'var(--green)', invert: true },
    { label: 'Submission Frequency', val: (d.frequency * 100).toFixed(0) + '%', max: 100, pct: d.frequency * 100, color: 'var(--blue)', invert: true },
    { label: 'Appeal Activity', val: d.appeals, max: 5, pct: (d.appeals / 5) * 100, color: 'var(--orange)' },
    { label: 'Warning Count', val: d.warnings, max: 5, pct: (d.warnings / 5) * 100, color: 'var(--gold)' },
  ];

  document.getElementById('risk-factors').innerHTML = factors.map(f => `
    <div class="pred-factor">
      <div class="pred-factor-header">
        <span>${f.label}</span>
        <span class="pred-factor-val">${f.val}</span>
      </div>
      <div class="pred-bar-track">
        <div class="pred-bar-fill" style="width:${f.pct}%;background:${f.color};"></div>
      </div>
    </div>
  `).join('');

  const userName = USERS[uid]?.name || uid;
  document.getElementById('risk-summary').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div>
        <div style="font-size:10px;color:var(--text3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">User</div>
        <div style="font-size:15px;font-weight:700;">${userName}</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">UID</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;">${uid}</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Risk Score</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:${col}">${risk}%</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Category</div>
        <div style="font-size:14px;font-weight:700;color:${col}">${cat}</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Total Violations</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:var(--red)">${d.violations}</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Compliance Score</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:var(--green)">${d.score}</div>
      </div>
    </div>
  `;

  const recs = risk < 35
    ? ['Maintain current compliance practices.', 'Continue regular policy review cadence.', 'Flag for recognition in compliance program.']
    : risk < 65
    ? ['Schedule a compliance refresher session.', 'Increase submission review frequency.', 'Assign a compliance buddy or mentor.']
    : ['Immediate compliance intervention required.', 'Mandatory policy re-training within 7 days.', 'Enhanced monitoring for next 90 days.', 'Manager escalation recommended.'];

  document.getElementById('risk-recommendations').innerHTML = recs.map((r, i) => `
    <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);${i===recs.length-1?'border:none':''}">
      <div style="width:20px;height:20px;background:${col};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:var(--bg);flex-shrink:0;margin-top:2px;">${i+1}</div>
      <div style="font-size:13px;">${r}</div>
    </div>
  `).join('');
}

// ═══════════════════════════════
// AUDIT
// ═══════════════════════════════
function initAudit() {
  const tbody = document.getElementById('audit-tbody');
  tbody.innerHTML = AUDIT_LOGS.map(l => {
    const colors = { 'User Login':'var(--blue)', 'Policy Upload':'var(--gold)', 'Violation Detected':'var(--red)', 'Violation Confirmed':'var(--orange)', 'Appeal Submitted':'var(--green)', 'Admin Decision':'var(--gold)' };
    return `<tr>
      <td><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text2)">${l.ts}</span></td>
      <td><span style="font-family:'JetBrains Mono',monospace;font-size:12px;">${l.actor}</span></td>
      <td><span style="color:${colors[l.action]||'var(--text)'};font-weight:600;font-size:12px;">${l.action}</span></td>
      <td style="font-size:12px;color:var(--text2)">${l.target}</td>
      <td><span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text3)">${l.ip}</span></td>
    </tr>`;
  }).join('');

  const actions = {};
  AUDIT_LOGS.forEach(l => actions[l.action] = (actions[l.action] || 0) + 1);
  const maxVal = Math.max(...Object.values(actions));
  const colors2 = { 'User Login':'var(--blue)', 'Policy Upload':'var(--gold)', 'Violation Detected':'var(--red)', 'Violation Confirmed':'var(--orange)', 'Appeal Submitted':'var(--green)' };

  document.getElementById('audit-distribution').innerHTML = Object.entries(actions).map(([action, count]) => `
    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:12px;">
        <span>${action}</span>
        <span style="font-family:'JetBrains Mono',monospace;color:${colors2[action]||'var(--text)'}">${count}</span>
      </div>
      <div class="pred-bar-track">
        <div class="pred-bar-fill" style="width:${(count/maxVal)*100}%;background:${colors2[action]||'var(--text2)'};"></div>
      </div>
    </div>
  `).join('');
}

// ═══════════════════════════════
// HELPERS
// ═══════════════════════════════
function statusBadge(status) {
  const map = { 'Confirmed': 'badge-red', 'Dismissed': 'badge-gray', 'Under Review': 'badge-gold' };
  return `<span class="badge ${map[status]||'badge-gray'}">${status}</span>`;
}

function appealBadge(status) {
  const map = { 'Pending': 'badge-gold', 'Under Review': 'badge-blue', 'Approved': 'badge-green', 'Rejected': 'badge-red' };
  return `<span class="badge ${map[status]||'badge-gray'}">${status}</span>`;
}

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 3500);
}
