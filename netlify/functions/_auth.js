// netlify/functions/_auth.js
// Shared helper — verifies the admin password hash stored in Netlify Blobs.

import { getStore } from "@netlify/blobs";
import crypto from "crypto";

export function sha256(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

export async function getPasswordHash() {
  const store = getStore("admin");
  const val   = await store.get("passwordHash");
  return val; // null if never set
}

export async function setPasswordHash(hash) {
  const store = getStore("admin");
  await store.set("passwordHash", hash);
}

/**
 * Returns true if the plaintext password matches the stored hash.
 * Returns "NOT_SET" if no password has been configured yet.
 */
export async function verifyPassword(plain) {
  const stored = await getPasswordHash();
  if (!stored) return "NOT_SET";
  return sha256(plain) === stored;
}

/** Reads the Bearer token from the Authorization header */
export function getToken(headers) {
  const auth = headers.get ? headers.get("authorization") : headers["authorization"];
  return auth?.replace("Bearer ", "").trim() ?? null;
}

/**
 * Lightweight session token: SHA-256 of (passwordHash + secret salt).
 * Valid as long as the password has not changed.
 */
export async function makeSessionToken() {
  const hash = await getPasswordHash();
  const salt = process.env.SESSION_SALT ?? "prottoyi25-default-salt";
  return sha256((hash ?? "") + salt);
}

export async function isAuthorized(headers) {
  const token    = getToken(headers);
  const expected = await makeSessionToken();
  return token === expected;
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export function unauthorized() {
  return json({ error: "Unauthorized" }, 401);
}
