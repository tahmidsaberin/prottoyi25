// ═══════════════════════════════════════════════════════════
//  PROTTOYI 25 — Firebase Auth Module
//  Replace the firebaseConfig values with your own project config
//  from: Firebase Console → Project Settings → Your apps
// ═══════════════════════════════════════════════════════════

import { initializeApp }                       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithPopup, signOut,
         GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─────────────────────────────────────────────
// 🔥 REPLACE THESE WITH YOUR FIREBASE CONFIG
// ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

provider.setCustomParameters({ prompt: 'select_account' });

// ── Exports ──────────────────────────────────
export { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, doc, getDoc, setDoc };
