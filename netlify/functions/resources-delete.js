// netlify/functions/resources-delete.js
// DELETE /api/resources/delete
// Body: { course, section, fileId, blobKey }

import { getStore } from "@netlify/blobs";
import { isAuthorized, json, unauthorized } from "./_auth.js";

export default async (req) => {
  if (req.method !== "DELETE" && req.method !== "POST")
    return json({ error: "Method not allowed" }, 405);
  if (!(await isAuthorized(req.headers))) return unauthorized();

  let body;
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const { course, section, fileId, blobKey } = body;
  if (!course || !section || !fileId || !blobKey)
    return json({ error: "course, section, fileId, blobKey are required." }, 400);

  // Security: blobKey must start with "resources/"
  if (!blobKey.startsWith("resources/"))
    return json({ error: "Invalid blobKey." }, 403);

  // ── Delete the file blob ───────────────────────────────────────
  const fileStore = getStore("files");
  try { await fileStore.delete(blobKey); } catch { /* already gone — ok */ }

  // ── Remove from the metadata index ────────────────────────────
  const metaStore = getStore("metadata");
  const indexKey  = `index/${course}/${section}`;
  try {
    const existing = await metaStore.get(indexKey, { type: "json" });
    if (Array.isArray(existing)) {
      const updated = existing.filter(f => f.id !== fileId);
      await metaStore.set(indexKey, JSON.stringify(updated));
    }
  } catch { /* index doesn't exist — nothing to remove */ }

  return json({ ok: true });
};

export const config = { path: "/api/resources/delete" };
