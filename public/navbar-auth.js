/* ================================================================
   navbar-auth.js — Prottoyi 25
   Self-contained navbar auth widget + profile setup modal
   Import this once in any page that has a navbar.
   ================================================================ */

import {
  signInWithGoogle, signOutUser, onAuthChange,
  getProfile, createProfile, updateProfile, uploadAvatar,
} from "./auth.js";

/* ════════════════════════════════════════════════════════════════
   INJECT STYLES — once, into <head>
════════════════════════════════════════════════════════════════ */
(function injectStyles() {
  if (document.getElementById("p25-auth-styles")) return;
  const s = document.createElement("style");
  s.id = "p25-auth-styles";
  s.textContent = `
/* ── Navbar auth zone ─────────────────────────────────────────── */
#p25-auth-zone {
  display: flex; align-items: center;
  position: absolute; left: 50%; transform: translateX(-50%);
}

/* ── Sign-in button ───────────────────────────────────────────── */
.p25-signin-btn {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 10px 22px; border-radius: 8px;
  background: #ffffff; color: #3c4043;
  border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
  box-shadow: 0 2px 12px rgba(0,0,0,0.25);
  transition: transform 0.15s, box-shadow 0.2s;
  white-space: nowrap;
}
.p25-signin-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
.p25-signin-btn:active { transform: translateY(0); }
.p25-signin-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.p25-signin-btn svg { flex-shrink: 0; }

/* ── User chip (shown when logged in) ─────────────────────────── */
.p25-user-chip {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 5px 14px 5px 5px;
  background: rgba(11,218,81,0.10);
  border: 0.5px solid rgba(11,218,81,0.35);
  border-radius: 100px; cursor: pointer;
  transition: background 0.2s;
  position: relative;
}
.p25-user-chip:hover { background: rgba(11,218,81,0.18); }

.p25-chip-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  object-fit: cover; flex-shrink: 0;
  border: 1.5px solid rgba(11,218,81,0.4);
}
.p25-chip-fallback {
  width: 36px; height: 36px; border-radius: 50%;
  background: #0BDA51; color: #060c07;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 15px; flex-shrink: 0;
  font-family: 'Rajdhani', sans-serif; letter-spacing: 0;
}
.p25-chip-name {
  font-family: 'Rajdhani', sans-serif; font-size: 16px; font-weight: 600;
  color: #e8f5e9; letter-spacing: 0.5px;
  max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ── Dropdown ─────────────────────────────────────────────────── */
.p25-chip-dropdown {
  position: absolute; top: calc(100% + 10px); left: 50%; transform: translateX(-50%);
  background: #0a130b; border: 0.5px solid rgba(11,218,81,0.25);
  border-radius: 12px; padding: 6px;
  min-width: 180px; z-index: 9999;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  display: none;
}
.p25-chip-dropdown.open { display: block; }
.p25-dropdown-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 14px; color: #9db89e;
  cursor: pointer; transition: background 0.15s, color 0.15s;
  background: none; border: none; width: 100%; text-align: left;
}
.p25-dropdown-item:hover { background: rgba(11,218,81,0.10); color: #e8f5e9; }
.p25-dropdown-item.danger:hover { background: rgba(255,107,107,0.10); color: #ff6b6b; }
.p25-dropdown-divider { height: 0.5px; background: rgba(11,218,81,0.12); margin: 4px 0; }

/* ── Spinner ──────────────────────────────────────────────────── */
.p25-spin {
  display: inline-block; width: 16px; height: 16px;
  border: 2px solid #dadce0; border-top-color: #4285F4;
  border-radius: 50%; animation: p25-spin-kf 0.7s linear infinite;
}
@keyframes p25-spin-kf { to { transform: rotate(360deg); } }

/* ── Toast ────────────────────────────────────────────────────── */
.p25-toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(16px);
  background: #0a130b; border: 0.5px solid rgba(11,218,81,0.3);
  color: #e8f5e9; padding: 12px 24px; border-radius: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 14px;
  z-index: 99999; pointer-events: none;
  opacity: 0; transition: opacity 0.3s, transform 0.3s;
}
.p25-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.p25-toast.error { border-color: rgba(255,107,107,0.4); color: #ff6b6b; }

/* ════════════════════════════════════════════════════════════════
   PROFILE SETUP MODAL
════════════════════════════════════════════════════════════════ */
.p25-overlay {
  position: fixed; inset: 0; z-index: 100000;
  background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; pointer-events: none;
  transition: opacity 0.25s;
}
.p25-overlay.open { opacity: 1; pointer-events: all; }

.p25-modal {
  background: #0a130b; border: 0.5px solid rgba(11,218,81,0.3);
  border-radius: 18px; padding: 36px 32px;
  width: 100%; max-width: 420px; margin: 16px;
  box-shadow: 0 0 60px rgba(11,218,81,0.12), 0 32px 80px rgba(0,0,0,0.6);
  transform: translateY(20px); transition: transform 0.25s;
}
.p25-overlay.open .p25-modal { transform: translateY(0); }

.p25-modal-title {
  font-family: 'Rajdhani', sans-serif; font-size: 24px; font-weight: 700;
  color: #00FF40; letter-spacing: 1px; margin-bottom: 4px;
  text-shadow: 0 0 20px rgba(0,255,64,0.4);
}
.p25-modal-sub {
  font-size: 13px; color: #5a7a5b; margin-bottom: 28px; line-height: 1.6;
}

/* ── Avatar picker ────────────────────────────────────────────── */
.p25-avatar-row {
  display: flex; align-items: center; gap: 18px; margin-bottom: 24px;
}
.p25-avatar-preview {
  width: 72px; height: 72px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid rgba(11,218,81,0.4);
  object-fit: cover; background: #0f1c10;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Rajdhani', sans-serif; font-size: 28px; font-weight: 700;
  color: #0BDA51; overflow: hidden;
}
.p25-avatar-preview img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.p25-avatar-actions { display: flex; flex-direction: column; gap: 8px; }
.p25-btn-upload {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 16px; border-radius: 7px;
  background: rgba(11,218,81,0.08); border: 0.5px solid rgba(11,218,81,0.3);
  color: #0BDA51; font-family: 'DM Sans', sans-serif; font-size: 13px;
  cursor: pointer; transition: background 0.2s;
}
.p25-btn-upload:hover { background: rgba(11,218,81,0.16); }
.p25-avatar-hint { font-size: 11px; color: #5a7a5b; line-height: 1.5; }

/* ── Nickname field ───────────────────────────────────────────── */
.p25-field-label {
  font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 1.5px;
  text-transform: uppercase; color: #5a7a5b; margin-bottom: 7px; display: block;
}
.p25-field-input {
  width: 100%; padding: 11px 14px;
  background: #0f1c10; color: #e8f5e9;
  border: 0.5px solid rgba(11,218,81,0.2);
  border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 15px;
  outline: none; transition: border-color 0.2s;
  margin-bottom: 6px;
}
.p25-field-input:focus { border-color: rgba(11,218,81,0.5); }
.p25-field-input::placeholder { color: #5a7a5b; }
.p25-field-hint { font-size: 11px; color: #5a7a5b; margin-bottom: 24px; }

/* ── Save button ──────────────────────────────────────────────── */
.p25-btn-save {
  width: 100%; padding: 13px;
  background: #0BDA51; color: #060c07;
  border: none; border-radius: 9px; cursor: pointer;
  font-family: 'Rajdhani', sans-serif; font-size: 16px; font-weight: 700;
  letter-spacing: 1.5px; text-transform: uppercase;
  box-shadow: 0 0 24px rgba(11,218,81,0.4);
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
}
.p25-btn-save:hover { background: #00FF40; box-shadow: 0 0 40px rgba(0,255,64,0.6); transform: translateY(-1px); }
.p25-btn-save:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

/* ── Edit profile link in modal ───────────────────────────────── */
.p25-edit-link {
  display: block; text-align: center; margin-top: 14px;
  font-size: 12px; color: #5a7a5b; cursor: pointer;
  transition: color 0.2s;
}
.p25-edit-link:hover { color: #0BDA51; }
`;
  document.head.appendChild(s);
})();

/* ════════════════════════════════════════════════════════════════
   STATE
════════════════════════════════════════════════════════════════ */
let _currentUser    = null;
let _currentProfile = null;
let _avatarFile     = null;  // staged file before save

/* ════════════════════════════════════════════════════════════════
   INIT — call once per page
════════════════════════════════════════════════════════════════ */
export function initNavbarAuth() {
  injectAuthZone();
  injectProfileModal();
  injectToast();

  onAuthChange(async (user) => {
    _currentUser = user;
    if (user) {
      _currentProfile = await getProfile(user.uid);
      if (!_currentProfile) {
        /* New user — show profile setup */
        openProfileModal(user, /* isNew= */ true);
      } else {
        renderUserChip();
      }
    } else {
      _currentProfile = null;
      renderSignInButton();
    }
  });
}

/* ════════════════════════════════════════════════════════════════
   DOM INJECTION
════════════════════════════════════════════════════════════════ */
function injectAuthZone() {
  const navbar = document.getElementById("navbar");
  if (!navbar || document.getElementById("p25-auth-zone")) return;
  const zone = document.createElement("div");
  zone.id = "p25-auth-zone";
  navbar.appendChild(zone);
}

function injectProfileModal() {
  if (document.getElementById("p25-profile-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id        = "p25-profile-overlay";
  overlay.className = "p25-overlay";
  overlay.innerHTML = `
    <div class="p25-modal" id="p25-modal">

      <div class="p25-modal-title" id="p25-modal-title">Set Up Your Profile</div>
      <p class="p25-modal-sub" id="p25-modal-sub">
        Choose a nickname and profile photo that others will see on Prottoyi 25.
      </p>

      <!-- Avatar picker -->
      <div class="p25-avatar-row">
        <div class="p25-avatar-preview" id="p25-avatar-preview">
          <span id="p25-avatar-fallback">?</span>
        </div>
        <div class="p25-avatar-actions">
          <label class="p25-btn-upload" for="p25-avatar-file-input">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            Upload Photo
          </label>
          <input type="file" id="p25-avatar-file-input" accept="image/*"
                 style="display:none" onchange="window.__p25HandleAvatarChange(this)">
          <span class="p25-avatar-hint">JPG, PNG or GIF<br>Max 2 MB</span>
        </div>
      </div>

      <!-- Nickname input -->
      <label class="p25-field-label" for="p25-nickname-input">Your Nickname</label>
      <input
        type="text" id="p25-nickname-input" class="p25-field-input"
        placeholder="e.g. TahmidCSE25"
        maxlength="24"
        autocomplete="off"
      >
      <div class="p25-field-hint">2–24 characters · letters, numbers, underscores only</div>

      <!-- Save button -->
      <button class="p25-btn-save" id="p25-save-btn" onclick="window.__p25SaveProfile()">
        Save &amp; Continue
      </button>

      <span class="p25-edit-link" id="p25-modal-skip" onclick="window.__p25SkipSetup()">
        Skip for now
      </span>
    </div>
  `;
  document.body.appendChild(overlay);

  /* Close on overlay click (only for edit mode, not new user) */
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay && !overlay.dataset.required) closeProfileModal();
  });

  /* Expose handlers to window (needed for inline onclick inside injected HTML) */
  window.__p25HandleAvatarChange = handleAvatarChange;
  window.__p25SaveProfile        = saveProfile;
  window.__p25SkipSetup          = skipSetup;
}

function injectToast() {
  if (document.getElementById("p25-toast")) return;
  const t = document.createElement("div");
  t.id = "p25-toast";
  t.className = "p25-toast";
  document.body.appendChild(t);
}

/* ════════════════════════════════════════════════════════════════
   RENDER HELPERS
════════════════════════════════════════════════════════════════ */
function renderSignInButton() {
  const zone = document.getElementById("p25-auth-zone");
  if (!zone) return;
  zone.innerHTML = `
    <button class="p25-signin-btn" id="p25-signin-btn">
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      Sign in with Google
    </button>`;
  document.getElementById("p25-signin-btn").addEventListener("click", handleSignIn);
}

function renderUserChip() {
  const zone    = document.getElementById("p25-auth-zone");
  const profile = _currentProfile;
  const user    = _currentUser;
  if (!zone) return;

  const avatarSrc = profile?.avatarUrl || user?.photoURL;
  const name      = profile?.nickname  || user?.displayName?.split(" ")[0] || "User";
  const initial   = name[0].toUpperCase();

  const avatarHtml = avatarSrc
    ? `<img src="${esc(avatarSrc)}" class="p25-chip-avatar" alt="">`
    : `<div class="p25-chip-fallback">${esc(initial)}</div>`;

  zone.innerHTML = `
    <div class="p25-user-chip" id="p25-user-chip">
      ${avatarHtml}
      <span class="p25-chip-name">${esc(name)}</span>
      <div class="p25-chip-dropdown" id="p25-dropdown">
        <button class="p25-dropdown-item" id="p25-edit-profile-btn">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          Edit Profile
        </button>
        <div class="p25-dropdown-divider"></div>
        <button class="p25-dropdown-item danger" id="p25-signout-btn">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          Sign Out
        </button>
      </div>
    </div>`;

  const chip    = document.getElementById("p25-user-chip");
  const dropdown= document.getElementById("p25-dropdown");

  chip.addEventListener("click", (e) => {
    dropdown.classList.toggle("open");
    e.stopPropagation();
  });
  document.addEventListener("click", () => dropdown.classList.remove("open"), { once: false });

  document.getElementById("p25-edit-profile-btn").addEventListener("click", () => {
    dropdown.classList.remove("open");
    openProfileModal(_currentUser, false);
  });
  document.getElementById("p25-signout-btn").addEventListener("click", async () => {
    await signOutUser();
  });
}

/* ════════════════════════════════════════════════════════════════
   SIGN IN HANDLER
════════════════════════════════════════════════════════════════ */
async function handleSignIn() {
  const btn = document.getElementById("p25-signin-btn");
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = `<span class="p25-spin"></span> Signing in…`;

  try {
    await signInWithGoogle();
    /* onAuthChange fires automatically — will render chip or open setup modal */
  } catch (err) {
    btn.disabled = false;
    renderSignInButton();
    showToast(err.message, true);
  }
}

/* ════════════════════════════════════════════════════════════════
   PROFILE MODAL
════════════════════════════════════════════════════════════════ */
function openProfileModal(user, isNew) {
  const overlay  = document.getElementById("p25-profile-overlay");
  const title    = document.getElementById("p25-modal-title");
  const sub      = document.getElementById("p25-modal-sub");
  const input    = document.getElementById("p25-nickname-input");
  const skip     = document.getElementById("p25-modal-skip");
  const preview  = document.getElementById("p25-avatar-preview");
  const fallback = document.getElementById("p25-avatar-fallback");
  if (!overlay) return;

  /* Reset staged file */
  _avatarFile = null;

  if (isNew) {
    title.textContent     = "Set Up Your Profile";
    sub.textContent       = "Choose a nickname and profile photo. Others will see this on Prottoyi 25.";
    skip.style.display    = "block";
    overlay.dataset.required = "";
    input.value           = user?.displayName?.split(" ")[0] ?? "";
  } else {
    title.textContent     = "Edit Profile";
    sub.textContent       = "Update your nickname or profile photo.";
    skip.style.display    = "none";
    delete overlay.dataset.required;
    input.value           = _currentProfile?.nickname ?? "";
  }

  /* Show current avatar */
  const existingAvatar = _currentProfile?.avatarUrl ?? user?.photoURL;
  refreshAvatarPreview(existingAvatar, input.value);

  overlay.classList.add("open");
  setTimeout(() => input.focus(), 260);

  /* Live-update fallback letter */
  input.addEventListener("input", () => {
    if (!_avatarFile && !_currentProfile?.avatarUrl && !user?.photoURL) {
      const initial = (input.value || "?")[0].toUpperCase();
      fallback.textContent = initial;
    }
  });
}

function closeProfileModal() {
  const overlay = document.getElementById("p25-profile-overlay");
  overlay?.classList.remove("open");
}

function refreshAvatarPreview(url, nickname) {
  const preview  = document.getElementById("p25-avatar-preview");
  const fallback = document.getElementById("p25-avatar-fallback");
  if (!preview) return;

  if (url) {
    preview.innerHTML = `<img src="${esc(url)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else {
    preview.innerHTML = `<span id="p25-avatar-fallback">${esc((nickname || "?")[0].toUpperCase())}</span>`;
  }
}

function handleAvatarChange(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast("Image must be under 2 MB", true);
    input.value = "";
    return;
  }
  _avatarFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById("p25-avatar-preview");
    if (preview) {
      preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    }
  };
  reader.readAsDataURL(file);
}

async function saveProfile() {
  const user      = _currentUser;
  const input     = document.getElementById("p25-nickname-input");
  const saveBtn   = document.getElementById("p25-save-btn");
  const nickname  = input?.value.trim() ?? "";

  /* Validate nickname */
  if (!nickname || nickname.length < 2) {
    showToast("Nickname must be at least 2 characters", true);
    input?.focus(); return;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
    showToast("Only letters, numbers and underscores allowed", true);
    input?.focus(); return;
  }

  saveBtn.disabled     = true;
  saveBtn.textContent  = "Saving…";

  try {
    let avatarUrl = _currentProfile?.avatarUrl ?? user?.photoURL ?? null;

    /* Upload new avatar if selected */
    if (_avatarFile) {
      avatarUrl = await uploadAvatar(user.uid, _avatarFile);
    }

    const profileData = { nickname, avatarUrl, email: user.email };

    if (_currentProfile) {
      await updateProfile(user.uid, profileData);
    } else {
      await createProfile(user.uid, profileData);
    }

    _currentProfile = { ..._currentProfile, ...profileData };
    _avatarFile     = null;

    closeProfileModal();
    renderUserChip();
    showToast(`Welcome, ${nickname}! 🎉`);

  } catch (err) {
    showToast("Failed to save profile: " + err.message, true);
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = "Save & Continue";
  }
}

async function skipSetup() {
  /* Save a minimal profile using Google display name */
  const user     = _currentUser;
  const nickname = user?.displayName?.split(" ")[0] ?? "Student";
  const avatarUrl= user?.photoURL ?? null;

  try {
    await createProfile(user.uid, { nickname, avatarUrl, email: user.email });
    _currentProfile = { nickname, avatarUrl, email: user.email };
  } catch {}

  closeProfileModal();
  renderUserChip();
}

/* ════════════════════════════════════════════════════════════════
   TOAST
════════════════════════════════════════════════════════════════ */
function showToast(msg, isError = false) {
  const t = document.getElementById("p25-toast");
  if (!t) return;
  t.textContent = msg;
  t.className   = "p25-toast" + (isError ? " error" : "");
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 3500);
}

/* ════════════════════════════════════════════════════════════════
   UTILS
════════════════════════════════════════════════════════════════ */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
