// netlify/functions/admin-verify.js
// POST { password }          → verify password, return session token
// POST { setup, password }   → first-time setup (only works if no password set)

import {
  sha256, getPasswordHash, setPasswordHash,
  makeSessionToken, json
} from "./_auth.js";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const stored = await getPasswordHash();

  /* ── First-time setup ─────────────────────────────────────── */
  if (body.setup) {
    if (stored) {
      return json({ error: "Password already set. Use change-password instead." }, 400);
    }
    if (!body.password || body.password.length < 6) {
      return json({ error: "Password must be at least 6 characters." }, 400);
    }
    await setPasswordHash(sha256(body.password));
    const token = await makeSessionToken();
    return json({ ok: true, token, firstTime: false });
  }

  /* ── Normal login ─────────────────────────────────────────── */
  if (!stored) {
    // No password set yet — tell the client to show setup form
    return json({ ok: false, firstTime: true });
  }

  if (!body.password) return json({ error: "Password required." }, 400);

  if (sha256(body.password) !== stored) {
    return json({ ok: false, error: "Incorrect password." }, 401);
  }

  const token = await makeSessionToken();
  return json({ ok: true, token });
};

export const config = { path: "/api/admin/verify" };
