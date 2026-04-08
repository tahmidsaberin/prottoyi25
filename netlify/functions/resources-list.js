// netlify/functions/resources-list.js
import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }
  try {
    const store  = getStore({ name: "resources", consistency: "strong" });
    const result = await store.list();
    const files  = result.blobs.map((blob) => {
      const m = blob.metadata || {};
      return { key: blob.key, name: m.originalName || blob.key, size: m.size || 0, type: m.type || "application/octet-stream", uploadedBy: m.uploadedBy || "Unknown", uploadedAt: m.uploadedAt || null };
    }).sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));
    return new Response(JSON.stringify({ files }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to list", files: [] }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
export const config = { path: "/api/resources/list" };
