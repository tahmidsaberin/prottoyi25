/* ================================================================
   PROTTOYI 25 — Main Script  v2
   main.js
   ================================================================ */

/* ── Navbar scroll effect ────────────────────────────────────── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
  updateActiveLink();
});

/* ── Active nav link tracker ─────────────────────────────────── */
function updateActiveLink() {
  const sections = ['home', 'courses', 'notice', 'about'];
  const links    = document.querySelectorAll('.nav-links a');
  let current    = 'home';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 120) current = id;
  });
  links.forEach(link => {
    link.classList.toggle(
      'active',
      link.getAttribute('href') === '#' + current &&
      !link.classList.contains('nav-cta')
    );
  });
}

/* ── Mobile menu ─────────────────────────────────────────────── */
function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () =>
    document.getElementById('navLinks').classList.remove('open')
  );
});

/* ── Scroll reveal ───────────────────────────────────────────── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.10, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ── Admin session check ──────────────────────────────────────── */
function checkAdminSession() {
  if (sessionStorage.getItem('prottoyi_admin') === 'true') {
    const navItem  = document.getElementById('admin-nav-item');
    const uploadWrap = document.getElementById('admin-upload-btn-wrap');
    if (navItem)   navItem.style.display = 'list-item';
    if (uploadWrap) uploadWrap.style.display = 'flex';
  }
}

/* ── Build a course card element ──────────────────────────────── */
function buildCourseCard(course, delay) {
  const isAvailable = course.status === 'available';
  const tag = isAvailable ? 'a' : 'div';
  const el  = document.createElement(tag);

  el.className = `course-card reveal${delay ? ' reveal-delay-' + delay : ''}`;

  if (isAvailable && course.htmlUrl) {
    el.href   = course.htmlUrl;
    el.target = '_blank';
    el.rel    = 'noopener noreferrer';
  } else if (!isAvailable) {
    el.style.cursor = 'default';
  }

  const metaHtml = [];
  if (course.years)  metaHtml.push(`<div class="card-meta-item"><span>${course.years}</span> years</div>`);
  if (course.topics) metaHtml.push(`<div class="card-meta-item"><span>${course.topics}</span> topics</div>`);
  if (!isAvailable)  metaHtml.push(`<div class="card-meta-item" style="color:var(--text3)">Upload pending</div>`);

  el.innerHTML = `
    <div class="card-tag" ${!isAvailable ? 'style="color:var(--text3);border-color:var(--border);background:transparent"' : ''}>
      ${isAvailable ? 'Available' : 'Coming Soon'}
    </div>
    <div class="card-code">${escHtml(course.code)}</div>
    <div class="card-title">${escHtml(course.title)}</div>
    <p class="card-desc">${escHtml(course.description || '')}</p>
    <div class="card-footer">
      <div class="card-meta">${metaHtml.join('')}</div>
      <div class="card-arrow" ${!isAvailable ? 'style="opacity:0.2"' : ''}>
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 17L17 7M7 7h10v10"/>
        </svg>
      </div>
    </div>
  `;
  return el;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Load dynamic courses from Firebase ───────────────────────── */
async function loadDynamicCourses() {
  // Guard: need Firebase + proper config
  if (typeof firebase === 'undefined' || typeof firebaseReady !== 'function' || !firebaseReady()) return;

  const grid        = document.getElementById('courses-grid');
  const placeholder = document.getElementById('dynamic-courses-placeholder');
  if (!grid || !placeholder) return;

  try {
    const snap = await db.collection('uploadedCourses')
      .orderBy('createdAt', 'desc')
      .get();

    if (snap.empty) return;

    // Remove placeholder before inserting cards
    placeholder.remove();

    let delay = 1;
    snap.forEach(doc => {
      const course = { id: doc.id, ...doc.data() };
      const card   = buildCourseCard(course, delay % 4);
      grid.appendChild(card);
      revealObserver.observe(card);
      delay++;
    });
  } catch (err) {
    // Firebase not yet configured or offline — silently skip
    console.info('[Prottoyi] Firebase courses unavailable:', err.message);
  }
}

/* ── DOMContentLoaded ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  checkAdminSession();
  loadDynamicCourses();
});
