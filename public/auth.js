/* ================================================================
   auth.js — Prottoyi 25 Authentication + Profile System
   Firebase Authentication with Google OAuth + Firestore profiles
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
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

/* ── Firebase config — REPLACE WITH YOUR VALUES ─────────────── */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC-j09OzvXVwbSnCn6-mfJQ6diGKyotaSo",
  authDomain: "prottoyi25cse.firebaseapp.com",
  projectId: "prottoyi25cse",
  storageBucket: "prottoyi25cse.firebasestorage.app",
  messagingSenderId: "574758538627",
  appId: "1:574758538627:web:c23dde120db8800accfab6",
};

/* ── Initialize Firebase ─────────────────────────────────────── */
const app      = initializeApp(FIREBASE_CONFIG);
const auth     = getAuth(app);
const db       = getFirestore(app);
const storage  = getStorage(app);
const provider = new GoogleAuthProvider();

provider.addScope("profile");
provider.addScope("email");
provider.setCustomParameters({ prompt: "select_account" });

await setPersistence(auth, browserLocalPersistence);

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    throw new Error(FIREBASE_ERRORS[error.code] ?? error.message);
  }
}

export async function signOutUser() {
  await signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function waitForUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

export async function getProfile(uid) {
  const snap = await getDoc(doc(db, "profiles", uid));
  return snap.exists() ? snap.data() : null;
}

export async function createProfile(uid, data) {
  await setDoc(doc(db, "profiles", uid), {
    uid,
    nickname:  data.nickname,
    avatarUrl: data.avatarUrl ?? null,
    email:     data.email ?? null,
    createdAt: new Date().toISOString(),
  });
}

export async function updateProfile(uid, data) {
  await updateDoc(doc(db, "profiles", uid), data);
}

export async function uploadAvatar(uid, file) {
  const ext     = file.name.split(".").pop();
  const storRef = ref(storage, `avatars/${uid}.${ext}`);
  await uploadBytes(storRef, file, { contentType: file.type });
  return await getDownloadURL(storRef);
}

const FIREBASE_ERRORS = {
  "auth/popup-closed-by-user":    "Sign-in cancelled.",
  "auth/popup-blocked":           "Pop-up blocked. Please allow pop-ups for this site.",
  "auth/cancelled-popup-request": "Sign-in cancelled.",
  "auth/network-request-failed":  "Network error. Check your connection.",
  "auth/too-many-requests":       "Too many attempts. Try again later.",
  "auth/user-disabled":           "This account has been disabled.",
  "auth/operation-not-allowed":   "Google sign-in is not enabled for this project.",
};
