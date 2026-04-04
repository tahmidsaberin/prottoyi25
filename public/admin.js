/* ================================================================
   PROTTOYI 25 — Admin Panel  (Netlify Blobs version)
   admin.js — zero external dependencies
   ================================================================ */

/* ── Session token stored in sessionStorage ──────────────────── */
const TOKEN_KEY = 'p25_admin_token';

function getToken()      { return sessionStorage.getItem(TOKEN_KEY); }
function setToken(t)     { sessionStorage.setItem(TOKEN_KEY, t); }
function clearToken()    { sessionStorage.removeItem(TOKEN_KEY); }

function authHeaders(extra = {}) {
  return { 'Authorization': 'Bearer ' + getToken(), ...extra };
}

/* ── File state ──────────────────────────────────────────────── */
let courseFile   = null;
let resourceFile = null;
let confirmCb    = null;

/* ── Helpers ─────────────────────────────────────────────────── */
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtBytes(b) {
  if (b < 1024)    return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
function fileIcon(name = '') {
  const s = name.toLowerCase();
  if (s.endsWith('.pdf'))                       return '📄';
  if (/\.(png|jpg|jpeg|gif|webp)$/.test(s))    return '🖼️';
  if (/\.(doc|docx)$/.test(s))                 return '📝';
  if (/\.(txt|md)$/.test(s))                   return '📃';
  return '📁';
}
function showMsg(id, text, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent  = text;
  el.className    = 'upload-msg' + (type ? ' msg-' + type : '');
  el.style.display = text ? 'block' : 'none';
}

/* ════════════════════════════════════════════════════════════════
   AUTH
════════════════════════════════════════════════════════════════ */
async function initAuth() {
  // Check if site has any password set yet
  const res  = await fetch('/api/admin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})        // empty body → just probe
  });
  const data = await res.json();

  document.getElementById('login-checking').style.display = 'none';

  if (data.firstTime) {
    // No password ever set — show setup form
    document.getElementById('setup-form').style.display = 'block';
  } else {
    // If we already have a token, go straight to dashboard
    if (getToken()) {
      showDashboard();
    } else {
      document.getElementById('login-form').style.display = 'block';
    }
  }
}

async function doSetup() {
  const pw1 = document.getElementById('setup-pw1').value;
  const pw2 = document.getElementById('setup-pw2').value;
  if (!pw1 || pw1.length < 6) { showMsg('setup-msg','Password must be ≥ 6 characters.','error'); return; }
  if (pw1 !== pw2)             { showMsg('setup-msg','Passwords do not match.','error');          return; }

  const res  = await fetch('/api/admin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setup: true, password: pw1 })
  });
  const data = await res.json();
  if (data.ok) { setToken(data.token); showDashboard(); }
  else showMsg('setup-msg', data.error || 'Setup failed.', 'error');
}

async function doLogin() {
  const pw  = document.getElementById('login-pw').value;
  if (!pw) { showMsg('login-msg', 'Please enter your password.', 'error'); return; }

  const btn = document.querySelector('#login-form .btn-login');
  btn.disabled = true; btn.textContent = 'Verifying…';

  const res  = await fetch('/api/admin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw })
  });
  const data = await res.json();

  btn.disabled = false; btn.textContent = 'Enter Admin Panel';

  if (data.ok) { setToken(data.token); showDashboard(); }
  else {
    showMsg('login-msg', data.error || 'Incorrect password.', 'error');
    document.getElementById('login-pw').value = '';
    document.getElementById('login-pw').focus();
  }
}

function doLogout() {
  clearToken();
  document.getElementById('screen-dashboard').style.display = 'none';
  document.getElementById('screen-login').style.display     = 'flex';
  document.getElementById('login-pw').value = '';
  document.getElementById('login-form').style.display       = 'block';
  document.getElementById('login-checking').style.display   = 'none';
  showMsg('login-msg', '', '');
}

function showDashboard() {
  document.getElementById('screen-login').style.display     = 'none';
  document.getElementById('screen-dashboard').style.display = 'block';
  loadCoursesList();
  loadFilesList();
  // Deep-link support: admin.html#tab-resources
  const hash = location.hash.replace('#', '');
  if (hash && document.getElementById(hash)) switchTab(hash);
}

/* ════════════════════════════════════════════════════════════════
   TAB SWITCHING
════════════════════════════════════════════════════════════════ */
function switchTab(id) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelector(`[data-tab="${id}"]`).classList.add('active');
}

/* ════════════════════════════════════════════════════════════════
   COURSES — file select
════════════════════════════════════════════════════════════════ */
function onCourseFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.html')) {
    showMsg('course-msg', 'Only .html files are accepted.', 'error');
    input.value = ''; return;
  }
  courseFile = file;
  const lbl = document.getElementById('course-dz-label');
  lbl.innerHTML = `<strong style="color:var(--g1)">${esc(file.name)}</strong><br><span>${fmtBytes(file.size)}</span>`;
  document.getElementById('course-dz').classList.add('has-file');
}

/* ── COURSES: submit ──────────────────────────────────────────── */
async function submitCourse() {
  const code   = document.getElementById('c-code').value.trim();
  const title  = document.getElementById('c-title').value.trim();
  const desc   = document.getElementById('c-desc').value.trim();
  const years  = document.getElementById('c-years').value;
  const topics = document.getElementById('c-topics').value;
  const status = document.getElementById('c-status').value;

  if (!code)  { showMsg('course-msg', 'Course code is required.', 'error');  return; }
  if (!title) { showMsg('course-msg', 'Course title is required.', 'error'); return; }
  if (!desc)  { showMsg('course-msg', 'Description is required.', 'error');  return; }
  if (status === 'available' && !courseFile) {
    showMsg('course-msg', 'Please select an HTML file (required when status is Available).', 'error'); return;
  }

  const btn = document.getElementById('btn-course-submit');
  btn.disabled = true;
  showMsg('course-msg', '', '');

  const fd = new FormData();
  fd.append('code',        code);
  fd.append('title',       title);
  fd.append('description', desc);
  fd.append('years',       years);
  fd.append('topics',      topics);
  fd.append('status',      status);
  if (courseFile) fd.append('file', courseFile);

  // Simulate upload progress (XHR gives real progress; fetch doesn't)
  const prog  = document.getElementById('course-progress-wrap');
  const fill  = document.getElementById('course-progress-fill');
  const label = document.getElementById('course-progress-label');
  prog.style.display = 'flex';
  animateFakeProgress(fill, label, 'Uploading…');

  try {
    const res  = await fetch('/api/courses/upload', {
      method: 'POST',
      headers: authHeaders(),
      body: fd
    });
    const data = await res.json();

    fill.style.width = '100%'; label.textContent = 'Done ✓';
    setTimeout(() => { prog.style.display = 'none'; fill.style.width = '0%'; }, 600);

    if (data.ok) {
      showMsg('course-msg', `✓ "${code} — ${title}" published successfully!`, 'success');
      resetCourseForm();
      loadCoursesList();
    } else {
      showMsg('course-msg', data.error || 'Upload failed.', 'error');
    }
  } catch (e) {
    showMsg('course-msg', 'Network error: ' + e.message, 'error');
    prog.style.display = 'none';
  } finally {
    btn.disabled = false;
  }
}

function resetCourseForm() {
  ['c-code','c-title','c-desc','c-years','c-topics'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('c-status').value = 'available';
  document.getElementById('c-file').value = '';
  courseFile = null;
  document.getElementById('course-dz-label').innerHTML =
    `Click or drag-and-drop HTML file here<br><span>Self-contained HTML — CSS and JS must be inline</span>`;
  document.getElementById('course-dz').classList.remove('has-file');
}

/* ── COURSES: list ───────────────────────────────────────────── */
async function loadCoursesList() {
  const list = document.getElementById('courses-list');
  list.innerHTML = '<div class="list-loading"><div class="loading-spinner"></div> Loading…</div>';

  try {
    const res  = await fetch('/api/courses/list');
    const data = await res.json();

    if (!data.ok || !data.courses.length) {
      list.innerHTML = '<div class="list-empty">No analyses uploaded yet. Upload your first one above.</div>';
      return;
    }

    list.innerHTML = '';
    data.courses.forEach(c => list.appendChild(buildCourseItem(c)));
  } catch (e) {
    list.innerHTML = `<div class="list-empty">Error loading courses: ${esc(e.message)}</div>`;
  }
}

function buildCourseItem(c) {
  const el = document.createElement('div');
  el.className = 'list-item';
  el.id = 'ci-' + c.id;
  const badge = c.status === 'available'
    ? '<span class="badge-available">Available</span>'
    : '<span class="badge-soon">Coming Soon</span>';
  const viewLink = c.htmlUrl
    ? `<a href="${esc(c.htmlUrl)}" target="_blank" class="item-link">↗ View</a>` : '';

  el.innerHTML = `
    <div class="item-info">
      <div class="item-title">${esc(c.code)} — ${esc(c.title)}</div>
      <div class="item-meta">
        ${badge}
        ${c.years  ? `<span class="item-chip">${c.years} yrs</span>` : ''}
        ${c.topics ? `<span class="item-chip">${c.topics} topics</span>` : ''}
        ${viewLink}
      </div>
    </div>
    <div class="item-actions">
      <button class="btn-delete" onclick="confirmDeleteCourse(${JSON.stringify(c.id)}, ${JSON.stringify(c.code + ' — ' + c.title)}, ${JSON.stringify(c.htmlBlobKey ?? '')})">
        🗑 Delete
      </button>
    </div>`;
  return el;
}

function confirmDeleteCourse(id, label, blobKey) {
  openModal('Delete Analysis', `Delete <strong>${esc(label)}</strong>? This cannot be undone.`, async () => {
    try {
      const res = await fetch('/api/courses/delete', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id, htmlBlobKey: blobKey })
      });
      const data = await res.json();
      if (data.ok) { document.getElementById('ci-' + id)?.remove(); }
      else alert('Delete failed: ' + (data.error || 'Unknown error'));
    } catch (e) { alert('Network error: ' + e.message); }
  });
}

/* ════════════════════════════════════════════════════════════════
   RESOURCES — file select
════════════════════════════════════════════════════════════════ */
function onResFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 52428800) {
    showMsg('res-msg', 'File too large (max 50 MB).', 'error');
    input.value = ''; return;
  }
  resourceFile = file;
  const lbl = document.getElementById('res-dz-label');
  lbl.innerHTML = `<strong style="color:var(--g1)">${esc(file.name)}</strong><br><span>${fmtBytes(file.size)}</span>`;
  document.getElementById('res-dz').classList.add('has-file');
  // Auto-fill display name if blank
  const nameEl = document.getElementById('r-name');
  if (!nameEl.value) nameEl.value = file.name.replace(/\.[^.]+$/, '');
}

/* ── RESOURCES: submit ───────────────────────────────────────── */
async function submitResource() {
  const course  = document.getElementById('r-course').value;
  const section = document.getElementById('r-section').value;
  const name    = document.getElementById('r-name').value.trim();

  if (!resourceFile) {
    showMsg('res-msg', 'Please select a file to upload.', 'error'); return;
  }

  const btn = document.getElementById('btn-res-submit');
  btn.disabled = true;
  showMsg('res-msg', '', '');

  const fd = new FormData();
  fd.append('course',   course);
  fd.append('section',  section);
  fd.append('name',     name);
  fd.append('file',     resourceFile);

  const prog  = document.getElementById('res-progress-wrap');
  const fill  = document.getElementById('res-progress-fill');
  const label = document.getElementById('res-progress-label');
  prog.style.display = 'flex';
  animateFakeProgress(fill, label, 'Uploading…');

  try {
    const res  = await fetch('/api/resources/upload', {
      method: 'POST',
      headers: authHeaders(),
      body: fd
    });
    const data = await res.json();

    fill.style.width = '100%'; label.textContent = 'Done ✓';
    setTimeout(() => { prog.style.display = 'none'; fill.style.width = '0%'; }, 600);

    if (data.ok) {
      showMsg('res-msg', `✓ "${data.displayName}" uploaded successfully!`, 'success');
      resetResForm();
      loadFilesList();
    } else {
      showMsg('res-msg', data.error || 'Upload failed.', 'error');
    }
  } catch (e) {
    showMsg('res-msg', 'Network error: ' + e.message, 'error');
    prog.style.display = 'none';
  } finally {
    btn.disabled = false;
  }
}

function resetResForm() {
  document.getElementById('r-name').value = '';
  document.getElementById('r-file').value = '';
  resourceFile = null;
  document.getElementById('res-dz-label').innerHTML =
    `Click or drag-and-drop file here<br><span>PDF, Image, Word document — max 50 MB</span>`;
  document.getElementById('res-dz').classList.remove('has-file');
}

/* ── RESOURCES: list files for selected course ───────────────── */
async function loadFilesList() {
  const course = document.getElementById('r-course')?.value;
  const list   = document.getElementById('files-list');
  if (!list) return;
  list.innerHTML = '<div class="list-loading"><div class="loading-spinner"></div> Loading…</div>';

  try {
    const res  = await fetch(`/api/resources/list?course=${course}`);
    const data = await res.json();

    const SECTION_LABELS = {
      'ct-questions':   '❓ CT Questions',
      'ct-answers':     '✅ CT Answers',
      'ct-suggestions': '💡 CT Suggestions',
      'study-notes':    '📚 Study Notes',
    };

    let hasAny = false;
    list.innerHTML = '';

    for (const [sec, files] of Object.entries(data.sections || {})) {
      if (!files.length) continue;
      hasAny = true;
      const grp = document.createElement('div');
      grp.className = 'file-section-group';
      grp.innerHTML = `<div class="file-section-label">${SECTION_LABELS[sec] || sec}</div>`;
      files.forEach(f => grp.appendChild(buildFileItem(f, course, sec)));
      list.appendChild(grp);
    }

    if (!hasAny) {
      list.innerHTML = `<div class="list-empty">No files uploaded for ${course.toUpperCase()} yet.</div>`;
    }
  } catch (e) {
    list.innerHTML = `<div class="list-empty">Error: ${esc(e.message)}</div>`;
  }
}

function buildFileItem(f, course, section) {
  const el = document.createElement('div');
  el.className = 'list-item';
  el.id = 'fi-' + f.id;

  el.innerHTML = `
    <div class="item-info">
      <div class="item-title">${fileIcon(f.originalName)} ${esc(f.displayName || f.originalName)}</div>
      <div class="item-meta">
        ${f.size ? `<span class="item-chip">${esc(f.size)}</span>` : ''}
        <span class="item-chip">${esc(f.originalName || '')}</span>
        ${f.downloadUrl ? `<a href="${esc(f.downloadUrl)}" target="_blank" class="item-link">↗ Open</a>` : ''}
      </div>
    </div>
    <div class="item-actions">
      <button class="btn-delete"
        onclick="confirmDeleteFile(${JSON.stringify(f.id)}, ${JSON.stringify(course)}, ${JSON.stringify(section)}, ${JSON.stringify(f.blobKey)}, ${JSON.stringify(f.displayName || f.originalName)})">
        🗑 Delete
      </button>
    </div>`;
  return el;
}

function confirmDeleteFile(fileId, course, section, blobKey, displayName) {
  openModal('Delete File', `Delete <strong>${esc(displayName)}</strong>? Students will lose access immediately.`, async () => {
    try {
      const res = await fetch('/api/resources/delete', {
        method: 'DELETE',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ course, section, fileId, blobKey })
      });
      const data = await res.json();
      if (data.ok) { document.getElementById('fi-' + fileId)?.remove(); }
      else alert('Delete failed: ' + (data.error || 'Unknown error'));
    } catch (e) { alert('Network error: ' + e.message); }
  });
}

/* ════════════════════════════════════════════════════════════════
   SETTINGS — change password
════════════════════════════════════════════════════════════════ */
async function changePassword() {
  const oldPw  = document.getElementById('s-old').value;
  const newPw1 = document.getElementById('s-new1').value;
  const newPw2 = document.getElementById('s-new2').value;

  if (!oldPw)              { showMsg('settings-msg', 'Enter your current password.', 'error');      return; }
  if (newPw1.length < 6)  { showMsg('settings-msg', 'New password must be ≥ 6 characters.', 'error'); return; }
  if (newPw1 !== newPw2)  { showMsg('settings-msg', 'New passwords do not match.', 'error');        return; }

  try {
    const res  = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw1 })
    });
    const data = await res.json();
    if (data.ok) {
      setToken(data.token); // new token since password changed
      showMsg('settings-msg', '✓ Password updated. You are still logged in.', 'success');
      ['s-old','s-new1','s-new2'].forEach(id => document.getElementById(id).value = '');
    } else {
      showMsg('settings-msg', data.error || 'Failed.', 'error');
    }
  } catch (e) {
    showMsg('settings-msg', 'Network error: ' + e.message, 'error');
  }
}

/* ════════════════════════════════════════════════════════════════
   MODAL
════════════════════════════════════════════════════════════════ */
function openModal(title, body, onConfirm) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML    = body;
  document.getElementById('confirm-modal').style.display = 'flex';
  confirmCb = onConfirm;
  document.getElementById('modal-confirm-btn').onclick = () => { closeModal(); if (confirmCb) confirmCb(); };
}
function closeModal() {
  document.getElementById('confirm-modal').style.display = 'none';
  confirmCb = null;
}
// Close modal on overlay click
document.getElementById('confirm-modal')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

/* ════════════════════════════════════════════════════════════════
   DRAG AND DROP
════════════════════════════════════════════════════════════════ */
function initDrop(zoneId, inputId, handler) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;
  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', ()=> { zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const input = document.getElementById(inputId);
    const dt = new DataTransfer();
    if (e.dataTransfer.files[0]) {
      dt.items.add(e.dataTransfer.files[0]);
      input.files = dt.files;
      handler(input);
    }
  });
}

/* ════════════════════════════════════════════════════════════════
   FAKE PROGRESS ANIMATION
   (fetch doesn't give upload progress; this looks better than nothing)
════════════════════════════════════════════════════════════════ */
function animateFakeProgress(fillEl, labelEl, baseLabel) {
  let pct = 0;
  const iv = setInterval(() => {
    // Approach 90% quickly, then slow down waiting for server
    pct += pct < 60 ? 8 : pct < 85 ? 3 : 0.5;
    if (pct > 92) { clearInterval(iv); return; }
    fillEl.style.width    = pct + '%';
    labelEl.textContent   = `${baseLabel} ${Math.round(pct)}%`;
  }, 150);
  return iv;
}

/* ════════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initDrop('course-dz', 'c-file', onCourseFileSelect);
  initDrop('res-dz',    'r-file', onResFileSelect);
});
