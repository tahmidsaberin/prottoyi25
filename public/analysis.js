/* ================================================================
   PROTTOYI 25 — Analysis Page Script
   analysis.js
   ================================================================ */

/* ── Accordion toggle ────────────────────────────────────────── */
function toggle(header) {
  const body = header.nextElementSibling;
  const hint = header.querySelector('.toggle-hint');
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  hint.textContent = isOpen ? '▼ expand' : '▲ collapse';
}

/* ── PDF Download via browser print ───────────────────────────── */
function downloadPDF() {
  const btn = document.getElementById('pdfBtn');

  // Visual feedback
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
    <span>Generating PDF…</span>
  `;
  btn.disabled = true;

  // Use browser's print functionality to generate PDF
  window.print();

  // Restore button state after print dialog closes
  setTimeout(() => {
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>Download PDF</span>
    `;
    btn.disabled = false;
  }, 1000);
}
