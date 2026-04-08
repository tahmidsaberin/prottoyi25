// ═══════════════════════════════════════════════════════════
//  PROTTOYI 25 — Auth + Profile Manager
// ═══════════════════════════════════════════════════════════

import {
  auth, db, provider,
  signInWithPopup, signOut, onAuthStateChanged,
  doc, getDoc, setDoc
} from './firebase-config.js';

/* ── DOM refs ── */
const topbarCenter      = document.getElementById('topbarCenter');
const topbarAuthBtns    = document.getElementById('topbarAuthBtns');
const authModal         = document.getElementById('authModal');
const profileSetupModal = document.getElementById('profileSetupModal');
const profileAvatar     = document.getElementById('profileAvatar');
const profileNickname   = document.getElementById('profileNickname');
const heroAuthSection   = document.getElementById('heroAuthSection');
const heroLoggedIn      = document.getElementById('heroLoggedIn');

/* ── State ── */
let currentUser = null;
window._isLoggedIn          = false;
window._currentUserPhotoURL = null;

/* ════════════════════════════════════════════
   AUTH STATE LISTENER
════════════════════════════════════════════ */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    window._isLoggedIn          = true;
    window._currentUserPhotoURL = user.photoURL || null;
    const profile = await loadProfile(user.uid);
    if (!profile || !profile.nickname) {
      // Pre-fill with Google photo
      openProfileSetup(user);
    } else {
      renderLoggedIn(profile, user);
    }
  } else {
    currentUser = null;
    window._isLoggedIn          = false;
    window._currentUserPhotoURL = null;
    renderLoggedOut();
  }
});

/* ── Load profile from Firestore ── */
async function loadProfile(uid) {
  try {
    const snap = await getDoc(doc(db, 'profiles', uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error('Profile load error:', e);
    return null;
  }
}

/* ════════════════════════════════════════════
   RENDER STATES
════════════════════════════════════════════ */
function renderLoggedIn(profile, user) {
  // Topbar center
  if (topbarCenter) {
    topbarCenter.innerHTML = `
      <div class="profile-avatar-wrap" id="profileDropdownWrap">
        <img
          class="profile-avatar"
          src="${profile.photoURL || user.photoURL || '/img/default-avatar.svg'}"
          alt="${profile.nickname}"
          id="topbarAvatar"
          onerror="this.src='/img/default-avatar.svg'"
        />
        <div class="profile-dropdown" id="profileDropdown">
          <div style="padding:10px 12px 10px;border-bottom:1px solid var(--border);margin-bottom:6px;">
            <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${profile.nickname}</div>
            <div style="font-size:12px;color:var(--text-muted)">${user.email}</div>
          </div>
          <button class="dropdown-item" onclick="window.openEditProfile()">
            <span class="dropdown-icon">✏️</span> Edit Profile
          </button>
          <button class="dropdown-item danger" onclick="window.handleSignOut()">
            <span class="dropdown-icon">🚪</span> Sign Out
          </button>
        </div>
        <div class="profile-nickname">${profile.nickname}</div>
      </div>
    `;

    // Toggle dropdown on click
    document.getElementById('profileDropdownWrap')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('profileDropdown')?.classList.toggle('open');
    });
    document.addEventListener('click', () => {
      document.getElementById('profileDropdown')?.classList.remove('open');
    });
  }

  // Hide auth buttons, show nothing (profile is in center)
  if (topbarAuthBtns) topbarAuthBtns.classList.add('hidden');

  // Hero section
  if (heroAuthSection) heroAuthSection.classList.add('hidden');
  if (heroLoggedIn) {
    heroLoggedIn.classList.remove('hidden');
    const nameEl = heroLoggedIn.querySelector('#welcomeName');
    if (nameEl) nameEl.textContent = profile.nickname;
  }
}

function renderLoggedOut() {
  // Topbar center — show nothing or a sign-in hint
  if (topbarCenter) {
    topbarCenter.innerHTML = `
      <button class="btn-login" onclick="window.openAuthModal()">
        Sign in with Google
      </button>
    `;
  }
  if (topbarAuthBtns) topbarAuthBtns.classList.remove('hidden');
  if (heroAuthSection) heroAuthSection?.classList.remove('hidden');
  if (heroLoggedIn) heroLoggedIn?.classList.add('hidden');
}

/* ════════════════════════════════════════════
   GOOGLE SIGN IN
════════════════════════════════════════════ */
window.handleGoogleSignIn = async function() {
  try {
    const result = await signInWithPopup(auth, provider);
    closeModal(authModal);
    showToast('Signed in successfully!', 'success');
    // onAuthStateChanged handles the rest
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      showToast('Sign-in failed. Please try again.', 'error');
      console.error(err);
    }
  }
};

/* ════════════════════════════════════════════
   SIGN OUT
════════════════════════════════════════════ */
window.handleSignOut = async function() {
  try {
    await signOut(auth);
    showToast('Signed out.', 'info');
  } catch (e) {
    showToast('Sign-out failed.', 'error');
  }
};

/* ════════════════════════════════════════════
   PROFILE SETUP
════════════════════════════════════════════ */
function openProfileSetup(user) {
  if (!profileSetupModal) return;
  closeModal(authModal);

  // Pre-fill Google photo
  const previewEl  = document.getElementById('avatarPreview');
  const nicknameEl = document.getElementById('setupNickname');
  if (previewEl && user.photoURL) {
    previewEl.innerHTML = `<img src="${user.photoURL}" alt="photo" onerror="this.parentElement.textContent='👤'">`;
  }
  // Pre-fill name hint
  if (nicknameEl && user.displayName) {
    nicknameEl.value = user.displayName.split(' ')[0];
    updateCharCounter();
  }
  openModal(profileSetupModal);
}

window.openEditProfile = async function() {
  if (!currentUser) return;
  const profile = await loadProfile(currentUser.uid);
  const previewEl  = document.getElementById('avatarPreview');
  const nicknameEl = document.getElementById('setupNickname');
  if (previewEl && profile?.photoURL) {
    previewEl.innerHTML = `<img src="${profile.photoURL}" alt="photo">`;
  }
  if (nicknameEl && profile?.nickname) {
    nicknameEl.value = profile.nickname;
    updateCharCounter();
  }
  openModal(profileSetupModal);
};

/* ── Photo upload ── */
window.triggerPhotoUpload = function() {
  document.getElementById('photoFileInput')?.click();
};

window.handlePhotoChange = function(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    showToast('Photo must be under 3 MB.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const previewEl = document.getElementById('avatarPreview');
    if (previewEl) previewEl.innerHTML = `<img src="${e.target.result}" alt="preview">`;
  };
  reader.readAsDataURL(file);
};

/* ── Save Profile ── */
window.saveProfile = async function() {
  if (!currentUser) return;

  const nicknameEl = document.getElementById('setupNickname');
  const nickname   = nicknameEl?.value.trim();
  if (!nickname || nickname.length < 2) {
    showToast('Nickname must be at least 2 characters.', 'error');
    return;
  }
  if (nickname.length > 20) {
    showToast('Nickname must be 20 characters or less.', 'error');
    return;
  }

  const saveBtnEl = document.getElementById('saveProfileBtn');
  if (saveBtnEl) { saveBtnEl.disabled = true; saveBtnEl.innerHTML = '<span class="spinner"></span>'; }

  // Get photo — either uploaded file or existing Google photo
  const previewImg = document.querySelector('#avatarPreview img');
  let photoURL = previewImg?.src || currentUser.photoURL || '';

  // If it's a data URL (uploaded photo), store as-is (or upload to storage if desired)
  try {
    await setDoc(doc(db, 'profiles', currentUser.uid), {
      nickname,
      photoURL,
      email: currentUser.email,
      uid:   currentUser.uid,
      updatedAt: Date.now()
    }, { merge: true });

    closeModal(profileSetupModal);
    showToast(`Welcome, ${nickname}! 🎉`, 'success');
    const profile = await loadProfile(currentUser.uid);
    if (profile) renderLoggedIn(profile, currentUser);
  } catch (e) {
    showToast('Failed to save profile. Try again.', 'error');
    console.error(e);
  } finally {
    if (saveBtnEl) { saveBtnEl.disabled = false; saveBtnEl.innerHTML = 'Save & Continue'; }
  }
};

/* ── Char counter ── */
window.updateCharCounter = function() {
  const val     = document.getElementById('setupNickname')?.value || '';
  const counter = document.getElementById('charCounter');
  if (counter) {
    counter.textContent = `${val.length}/20`;
    counter.className = 'char-counter' + (val.length > 20 ? ' limit' : '');
  }
};

/* ════════════════════════════════════════════
   MODAL HELPERS
════════════════════════════════════════════ */
window.openAuthModal = function() { openModal(authModal); };

function openModal(el)  { el?.classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(el) { el?.classList.remove('active'); document.body.style.overflow = ''; }

window.closeAuthModal        = () => closeModal(authModal);
window.closeProfileSetupModal = () => closeModal(profileSetupModal);

// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay);
  });
});

// Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal(authModal);
    // Don't close profile setup on escape if user is not set up
  }
});

/* ════════════════════════════════════════════
   TOAST
════════════════════════════════════════════ */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2900);
}

// Expose globally for inline onclick use
window.showToast = showToast;
