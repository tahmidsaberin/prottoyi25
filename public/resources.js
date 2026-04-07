/* ================================================================
   PROTTOYI 25 — Resources Page  (Netlify Blobs version)
   resources.js — zero external dependencies
   ================================================================ */

const COURSES = {
  cse211: { code: 'CSE 211', fullName: 'Object Oriented Programming' },
  cse214: { code: 'CSE 214', fullName: 'Discrete Mathematics' },
  eee221: { code: 'EEE 221', fullName: 'Electronic Devices & Circuits' },
  eee222: { code: 'EEE 222', fullName: 'Electrical Circuits' },
  eng271: { code: 'ENG 271', fullName: 'Technical English' },
  mat231: { code: 'MAT 231', fullName: 'Mathematics' },
  phy241: { code: 'PHY 241', fullName: 'Physics (General)' },
  sta251: { code: 'STA 251', fullName: 'Statistics & Probability' },
};

const SECTIONS = [
  { id: 'ct-questions',   label: 'CT Questions',   icon: '❓' },
  { id: 'ct-answers',     label: 'CT Answers',     icon: '✅' },
  { id: 'ct-suggestions', label: 'CT Suggestions', icon: '💡' },
  { id: 'study-notes',    label: 'Study Notes',    icon: '📚' },
];

let activeCourse = 'cse211';

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fileIcon(name = '') {
  const s = name.toLowerCase();
  if (s.endsWith('.pdf'))                       return '📄';
  if (/\.(png|jpg|jpeg|gif|webp)$/.test(s))    return '🖼️';
  if (/\.(doc|docx)$/.test(s))                 return '📝';
  return '📁';
}

/* ── Navbar / scroll / reveal setup ──────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* Mobile menu */
  document.querySelectorAll('.nav-links a').forEach(a =>
    a.addEventListener('click', () =>
      document.getElementById('navLinks')?.classList.remove('open')
    )
  );

  /* Navbar scroll */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () =>
      navbar.classList.toggle('scrolled', window.scrollY > 40)
    );
  }

  /* Scroll reveal */
  const ro = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.10, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.reveal').forEach(el => ro.observe(el));

  /* Admin nav visibility */
  if (sessionStorage.getItem('p25_admin_token')) {
    const navItem = document.getElementById('admin-nav-item');
    if (navItem) navItem.style.display = 'list-item';
  }

  /* Tab click handlers */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      activeCourse = this.getAttribute('data-course');
      updateCourseHeader(activeCourse);
      loadResources(activeCourse);
    });
  });

  /* Load initial tab */
  updateCourseHeader(activeCourse);
  loadResources(activeCourse);
});

function toggleMenu() {
  document.getElementById('navLinks')?.classList.toggle('open');
}

/* ── Update course header ─────────────────────────────────────── */
function updateCourseHeader(courseId) {
  const course = COURSES[courseId];
  if (!course) return;
  const title = document.getElementById('course-header-title');
  const meta  = document.getElementById('course-header-meta');
  if (title) title.textContent = `${course.code} — ${course.fullName}`;
  if (meta)  meta.textContent  = 'Class Test & Study Materials';
}

/* ── Fetch and render resources ───────────────────────────────── */
async function loadResources(courseId) {
  const container = document.getElementById('resource-sections');
  if (!container) return;

  container.innerHTML = `
    <div class="ct-loading" style="grid-column:1/-1;">
      <div class="loading-spinner"></div>
      <span>Loading resources…</span>
    </div>`;

  try {
    const res  = await fetch(`/api/resources/list?course=${courseId}`);

    /* When running locally (file:// or non-Netlify), the function won't exist */
    if (!res.ok) throw new Error(`Server responded ${res.status}`);

    const data = await res.json();
    renderSections(container, data.sections || {});

  } catch (e) {
    // Show a graceful "empty" state rather than an ugly error
    container.innerHTML = '';
    SECTIONS.forEach(sec => {
      container.appendChild(buildSectionCard(sec, []));
    });
  }
}

function renderSections(container, sections) {
  container.innerHTML = '';
  SECTIONS.forEach(sec => {
    const files = sections[sec.id] || [];
    container.appendChild(buildSectionCard(sec, files));
  });
}

function buildSectionCard(sec, files) {
  const div = document.createElement('div');
  div.className = 'ct-division';

  const filesHtml = files.length === 0
    ? `<p class="no-files-msg">No files uploaded yet.</p>`
    : files.map(f => `
        <a href="${esc(f.downloadUrl || '#')}" class="resource-file-link"
           target="_blank" rel="noopener noreferrer">
          <span class="file-icon">${fileIcon(f.originalName)}</span>
          <span class="file-name">${esc(f.displayName || f.originalName || 'Unnamed')}</span>
          ${f.size ? `<span class="file-size">${esc(f.size)}</span>` : ''}
          <span class="file-dl-icon">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </span>
        </a>`).join('');

  div.innerHTML = `
    <div class="division-header">
      <div class="division-icon">${sec.icon}</div>
      <h4 class="division-title">${sec.label}</h4>
      <span class="file-count-badge">${files.length} file${files.length !== 1 ? 's' : ''}</span>
    </div>
    <div class="division-content">
      <div class="resource-files">${filesHtml}</div>
    </div>`;

  return div;
}
