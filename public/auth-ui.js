/* ================================================================
   auth-ui.js — Prottoyi 25 Auth UI Helpers
   Reusable UI functions for login state, user avatar, navbar
   ================================================================ */

import { signInWithGoogle, signOutUser, onAuthChange, waitForUser } from "./auth.js";

/* ════════════════════════════════════════════════════════════════
   PAGE GUARD — call on any page that requires login
   Redirects to /login.html if user is not authenticated.
   Shows page content once authentication is confirmed.
════════════════════════════════════════════════════════════════ */
export async function requireAuth(redirectTo = "/login.html") {
  /* Hide page body while we check — prevents flash of protected content */
  document.body.style.visibility = "hidden";

  const user = await waitForUser();

  if (!user) {
    /* Save the page they tried to visit so we can redirect back after login */
    sessionStorage.setItem("p25_redirect_after_login", location.pathname);
    location.replace(redirectTo);
    return null; /* execution stops here */
  }

  document.body.style.visibility = "visible";
  return user;
}

/* ════════════════════════════════════════════════════════════════
   NAVBAR AUTH WIDGET
   Injects sign-in button OR user avatar+name into a target element.
   Call this on every page that has a navbar.

   Usage in HTML:
     <div id="auth-widget"></div>

   Usage in JS:
     import { initNavbarAuth } from "./auth-ui.js";
     initNavbarAuth(document.getElementById("auth-widget"));
════════════════════════════════════════════════════════════════ */
export function initNavbarAuth(container) {
  if (!container) return;

  onAuthChange((user) => {
    if (user) {
      container.innerHTML = renderUserChip(user);
      container.querySelector("#p25-sign-out-btn")
               ?.addEventListener("click", handleSignOut);
    } else {
      container.innerHTML = renderSignInButton();
      container.querySelector("#p25-sign-in-btn")
               ?.addEventListener("click", handleSignIn);
    }
  });
}

/* ── Sign-in handler ─────────────────────────────────────────── */
async function handleSignIn(e) {
  const btn = e.currentTarget;
  btn.disabled = true;
  btn.innerHTML = `<span class="p25-auth-spinner"></span> Signing in…`;

  try {
    await signInWithGoogle();
    /* onAuthChange will fire automatically and re-render the widget */

    /* Redirect to saved page if any */
    const saved = sessionStorage.getItem("p25_redirect_after_login");
    if (saved) {
      sessionStorage.removeItem("p25_redirect_after_login");
      location.href = saved;
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = renderSignInButtonInner();
    showAuthError(err.message);
  }
}

/* ── Sign-out handler ────────────────────────────────────────── */
async function handleSignOut() {
  await signOutUser();
  /* Optionally redirect to home after logout */
  location.href = "/index.html";
}

/* ── Render helpers ──────────────────────────────────────────── */
function renderSignInButtonInner() {
  return `
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
    Sign in with Google`;
}

function renderSignInButton() {
  return `
    <button id="p25-sign-in-btn" class="p25-btn-signin">
      ${renderSignInButtonInner()}
    </button>`;
}

function renderUserChip(user) {
  const avatar = user.photoURL
    ? `<img src="${escapeHtml(user.photoURL)}" alt="" class="p25-user-avatar">`
    : `<span class="p25-user-avatar-fallback">${escapeHtml(user.displayName?.[0] ?? "?")}</span>`;

  return `
    <div class="p25-user-chip">
      ${avatar}
      <span class="p25-user-name">${escapeHtml(user.displayName ?? user.email ?? "User")}</span>
      <button id="p25-sign-out-btn" class="p25-btn-signout" title="Sign out">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
        </svg>
        Sign out
      </button>
    </div>`;
}

/* ── Error toast ─────────────────────────────────────────────── */
function showAuthError(message) {
  let toast = document.getElementById("p25-auth-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "p25-auth-toast";
    toast.className = "p25-auth-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 4000);
}

/* ── XSS protection ──────────────────────────────────────────── */
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ════════════════════════════════════════════════════════════════
   STYLES — injected once into <head> automatically
   Keeps everything self-contained in one import
════════════════════════════════════════════════════════════════ */
(function injectAuthStyles() {
  if (document.getElementById("p25-auth-styles")) return;
  const style = document.createElement("style");
  style.id = "p25-auth-styles";
  style.textContent = `
    /* ── Sign-in button ── */
    .p25-btn-signin {
      display: inline-flex; align-items: center; gap: 10px;
      padding: 9px 20px; border-radius: 8px;
      background: #fff; color: #3c4043;
      border: 1px solid #dadce0;
      font-family: 'Google Sans', 'DM Sans', sans-serif;
      font-size: 14px; font-weight: 500;
      cursor: pointer; white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0,0,0,.12);
      transition: box-shadow .2s, background .15s;
    }
    .p25-btn-signin:hover { background: #f8f9fa; box-shadow: 0 2px 8px rgba(0,0,0,.2); }
    .p25-btn-signin:disabled { opacity: .6; cursor: not-allowed; }

    /* ── User chip ── */
    .p25-user-chip {
      display: inline-flex; align-items: center; gap: 10px;
      padding: 4px 12px 4px 4px; border-radius: 100px;
      background: rgba(11,218,81,0.10);
      border: 0.5px solid rgba(11,218,81,0.3);
    }
    .p25-user-avatar {
      width: 32px; height: 32px; border-radius: 50%; object-fit: cover;
      flex-shrink: 0;
    }
    .p25-user-avatar-fallback {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--g4, #0BDA51); color: #060c07;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px; flex-shrink: 0;
    }
    .p25-user-name {
      font-size: 13px; color: var(--text, #e8f5e9);
      max-width: 140px; overflow: hidden; text-overflow: ellipsis;
      white-space: nowrap;
    }
    .p25-btn-signout {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 12px; color: var(--text3, #5a7a5b);
      background: none; border: none; cursor: pointer;
      padding: 4px 6px; border-radius: 4px;
      transition: color .2s;
    }
    .p25-btn-signout:hover { color: #ff6b6b; }

    /* ── Spinner ── */
    .p25-auth-spinner {
      display: inline-block; width: 16px; height: 16px;
      border: 2px solid #dadce0; border-top-color: #4285F4;
      border-radius: 50%; animation: p25-spin .7s linear infinite;
    }
    @keyframes p25-spin { to { transform: rotate(360deg); } }

    /* ── Error toast ── */
    .p25-auth-toast {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: #1a0a0a; color: #ff6b6b;
      border: 0.5px solid rgba(255,107,107,.3);
      padding: 12px 24px; border-radius: 8px;
      font-size: 14px; z-index: 9999;
      opacity: 0; transition: opacity .3s, transform .3s;
      pointer-events: none;
    }
    .p25-auth-toast.visible {
      opacity: 1; transform: translateX(-50%) translateY(0);
    }
  `;
  document.head.appendChild(style);
})();
