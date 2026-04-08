// netlify/functions/courses-upload.js
// POST multipart/form-data:
//   code        — "CSE 214"
//   title       — "Discrete Mathematics"
//   description — short desc
//   years       — number (optional)
//   topics      — number (optional)
//   status      — "available" | "coming-soon"
//   file        — the HTML file (required when status=available)

import { getStore } from "@netlify/blobs";
import { isAuthorized, json, unauthorized } from "./_auth.js";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await isAuthorized(req.headers))) return unauthorized();

  let formData;
  try { formData = await req.formData(); }
  catch (e) { return json({ error: "Could not parse form: " + e.message }, 400); }

  const code    = (formData.get("code")        || "").trim();
  const title   = (formData.get("title")       || "").trim();
  const desc    = (formData.get("description") || "").trim();
  const years   = parseInt(formData.get("years"))  || null;
  const topics  = parseInt(formData.get("topics")) || null;
  const status  = formData.get("status") || "available";
  const file    = formData.get("file");

  if (!code || !title || !desc)
    return json({ error: "code, title, description are required." }, 400);
  if (status === "available" && (!file || typeof file === "string"))
    return json({ error: "HTML file is required when status is 'available'." }, 400);

  const id        = `course_${Date.now()}`;
  const metaStore = getStore("metadata");
  const fileStore = getStore("files");

  let htmlBlobKey = null;

  // ── Store the HTML file ──────────────────────────────────────
  if (file && typeof file !== "string") {
    const buffer   = await file.arrayBuffer();
    htmlBlobKey    = `analyses/${id}.html`;
    await fileStore.set(htmlBlobKey, buffer, {
      metadata: { mimeType: "text/html", originalName: file.name }
    });
  }

  // ── Add to courses index ─────────────────────────────────────
  let index = [];
  try {
    const existing = await metaStore.get("index/courses", { type: "json" });
    if (Array.isArray(existing)) index = existing;
  } catch { /* first upload */ }

  const entry = {
    id, code, title, description: desc,
    years, topics, status, htmlBlobKey,
    htmlUrl: htmlBlobKey ? `/api/courses/file?key=${encodeURIComponent(htmlBlobKey)}` : null,
    createdAt: new Date().toISOString(),
  };

  index.unshift(entry);
  await metaStore.set("index/courses", JSON.stringify(index));

  return json({ ok: true, course: entry });
};

export const config = { path: "/api/courses/upload" };
