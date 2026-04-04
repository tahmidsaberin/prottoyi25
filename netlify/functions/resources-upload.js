// netlify/functions/resources-upload.js
// POST multipart/form-data:
//   course   — e.g. "cse211"
//   section  — e.g. "ct-questions"
//   name     — display name (optional, falls back to filename)
//   file     — the actual file binary

import { getStore } from "@netlify/blobs";
import { isAuthorized, json, unauthorized } from "./_auth.js";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await isAuthorized(req.headers))) return unauthorized();

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return json({ error: "Expected multipart/form-data" }, 400);
  }

  let formData;
  try { formData = await req.formData(); }
  catch (e) { return json({ error: "Could not parse form data: " + e.message }, 400); }

  const course  = formData.get("course");
  const section = formData.get("section");
  const name    = formData.get("name") || "";
  const file    = formData.get("file");

  if (!course || !section || !file || typeof file === "string") {
    return json({ error: "course, section, and file are required." }, 400);
  }

  if (file.size > MAX_BYTES) {
    return json({ error: `File too large (max 50 MB, got ${(file.size/1048576).toFixed(1)} MB).` }, 413);
  }

  // ── Sanitize filename ───────────────────────────────────────
  const rawName   = file.name || "upload";
  const safeFile  = rawName.replace(/[^a-zA-Z0-9._\-]/g, "_");
  const fileId    = `${Date.now()}_${safeFile}`;
  const blobKey   = `resources/${course}/${section}/${fileId}`;

  // ── Store the file binary in Netlify Blobs ──────────────────
  const fileStore = getStore("files");
  const buffer    = await file.arrayBuffer();
  await fileStore.set(blobKey, buffer, {
    metadata: {
      originalName: rawName,
      displayName:  name || rawName.replace(/\.[^.]+$/, ""),
      course, section,
      mimeType:     file.type || "application/octet-stream",
      size:         formatBytes(file.size),
      uploadedAt:   new Date().toISOString(),
    }
  });

  // ── Update the metadata index for this course/section ────────
  const metaStore = getStore("metadata");
  const indexKey  = `index/${course}/${section}`;
  let index = [];
  try {
    const existing = await metaStore.get(indexKey, { type: "json" });
    if (Array.isArray(existing)) index = existing;
  } catch { /* first upload for this section */ }

  index.unshift({
    id:           fileId,
    blobKey,
    originalName: rawName,
    displayName:  name || rawName.replace(/\.[^.]+$/, ""),
    mimeType:     file.type || "application/octet-stream",
    size:         formatBytes(file.size),
    uploadedAt:   new Date().toISOString(),
  });

  await metaStore.set(indexKey, JSON.stringify(index));

  return json({ ok: true, fileId, displayName: name || rawName });
};

function formatBytes(b) {
  if (b < 1024)      return b + " B";
  if (b < 1048576)   return (b/1024).toFixed(1) + " KB";
  return (b/1048576).toFixed(1) + " MB";
}

export const config = { path: "/api/resources/upload" };
