// netlify/functions/courses-delete.js
// POST /api/courses/delete  { id, htmlBlobKey }

import { getStore } from "@netlify/blobs";
import { isAuthorized, json, unauthorized } from "./_auth.js";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await isAuthorized(req.headers))) return unauthorized();

  let body;
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const { id, htmlBlobKey } = body;
  if (!id) return json({ error: "id is required." }, 400);

  // Delete HTML blob if present
  if (htmlBlobKey && htmlBlobKey.startsWith("analyses/")) {
    const fileStore = getStore("files");
    try { await fileStore.delete(htmlBlobKey); } catch {}
  }

  // Remove from index
  const metaStore = getStore("metadata");
  try {
    const existing = await metaStore.get("index/courses", { type: "json" });
    if (Array.isArray(existing)) {
      const updated = existing.filter(c => c.id !== id);
      await metaStore.set("index/courses", JSON.stringify(updated));
    }
  } catch {}

  return json({ ok: true });
};

export const config = { path: "/api/courses/delete" };
