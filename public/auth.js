/* ================================================================
   auth.js — Prottoyi 25 Authentication Module
   Firebase Authentication with Google OAuth
   ================================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

/* ── Firebase config ─────────────────────────────────────────
   IMPORTANT: Replace every value below with YOUR project's config.
   Get it from: Firebase Console → Project Settings → Your apps
   These values are PUBLIC and safe to expose in frontend code.
   (Firebase security is enforced by Security Rules, not by hiding keys)
─────────────────────────────────────────────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyC-j09OzvXVwbSnCn6-mfJQ6diGKyotaSo",
  authDomain: "prottoyi25cse.firebaseapp.com",
  projectId: "prottoyi25cse",
  storageBucket: "prottoyi25cse.firebasestorage.app",
  messagingSenderId: "574758538627",
  appId: "1:574758538627:web:c23dde120db8800accfab6"
};

/* ── Initialize Firebase ─────────────────────────────────────── */
const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const provider = new GoogleAuthProvider();

/* Request these extra scopes (optional — remove if not needed) */
provider.addScope("profile");
provider.addScope("email");

/* Force account picker every time (prevents auto-login as wrong account) */
provider.setCustomParameters({ prompt: "select_account" });

/* ── Set persistence to LOCAL ────────────────────────────────────
   browserLocalPersistence = user stays logged in across browser restarts
   browserSessionPersistence = user logged out when tab closes
   inMemoryPersistence = no persistence (most secure, least convenient)
─────────────────────────────────────────────────────────────── */
await setPersistence(auth, browserLocalPersistence);

/* ════════════════════════════════════════════════════════════════
   PUBLIC API — import these functions in your pages
════════════════════════════════════════════════════════════════ */

/**
 * Sign in with Google (popup).
 * Returns the user object on success.
 * Throws on error.
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    /* Translate Firebase error codes to friendly messages */
    const msg = FIREBASE_ERROR_MESSAGES[error.code] ?? error.message;
    throw new Error(msg);
  }
}

/**
 * Sign out the current user.
 */
export async function signOutUser() {
  await signOut(auth);
}

/**
 * Get the currently signed-in user synchronously.
 * Returns null if no user is signed in.
 * NOTE: This may return null momentarily on page load while Firebase
 * restores the session. Use onAuthChange() for reliable state.
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Subscribe to auth state changes.
 * Callback fires immediately with current user (or null),
 * then again whenever the user signs in or out.
 *
 * @param {function} callback - called with (user | null)
 * @returns {function} unsubscribe function
 *
 * Usage:
 *   const unsub = onAuthChange(user => {
 *     if (user) console.log("Logged in:", user.displayName);
 *     else console.log("Logged out");
 *   });
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Returns a Promise that resolves with the current user once Firebase
 * has finished restoring the session from storage.
 * Use this when you need to know the auth state exactly once (e.g., on page load).
 */
export function waitForUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();   // stop listening after first event
      resolve(user);
    });
  });
}

/**
 * Returns the current user's ID token (JWT).
 * Use this when calling your own API endpoints that need to verify identity.
 * The token expires every 1 hour; Firebase refreshes it automatically.
 */
export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken(/* forceRefresh= */ false);
}

/* ── Friendly error messages ──────────────────────────────────── */
const FIREBASE_ERROR_MESSAGES = {
  "auth/popup-closed-by-user":      "Sign-in was cancelled.",
  "auth/popup-blocked":             "Pop-up was blocked by your browser. Please allow pop-ups for this site.",
  "auth/cancelled-popup-request":   "Sign-in was cancelled.",
  "auth/account-exists-with-different-credential":
    "An account already exists with a different sign-in method.",
  "auth/network-request-failed":    "Network error. Please check your internet connection.",
  "auth/too-many-requests":         "Too many failed attempts. Please try again later.",
  "auth/user-disabled":             "This account has been disabled.",
  "auth/operation-not-allowed":     "Google sign-in is not enabled for this project.",
};
