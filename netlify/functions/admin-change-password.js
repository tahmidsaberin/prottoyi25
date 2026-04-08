// netlify/functions/admin-change-password.js
// POST { oldPassword, newPassword }  (requires valid session token in Authorization header)

import {
  sha256, getPasswordHash, setPasswordHash,
  makeSessionToken, isAuthorized, json, unauthorized
} from "./_auth.js";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await isAuthorized(req.headers))) return unauthorized();

  let body;
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const { oldPassword, newPassword } = body;
  if (!oldPassword || !newPassword) return json({ error: "Both passwords required." }, 400);
  if (newPassword.length < 6)       return json({ error: "New password must be at least 6 characters." }, 400);

  const stored = await getPasswordHash();
  if (sha256(oldPassword) !== stored) return json({ error: "Current password is incorrect." }, 401);

  await setPasswordHash(sha256(newPassword));
  const token = await makeSessionToken();
  return json({ ok: true, token }); // Return new token since password changed
};

export const config = { path: "/api/admin/change-password" };
