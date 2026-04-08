// netlify/functions/courses-list.js
import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url    = new URL(req.url);
  const course = url.searchParams.get("course") || "general";

  try {
    const store  = getStore({ name: `courses-${course}`, consistency: "strong" });
    const result = await store.list();
    const files  = [];

    for (const blob of result.blobs) {
      const meta = blob.metadata || {};
      files.push({
        key:        blob.key,
        name:       meta.originalName || blob.key,
        size:       meta.size         || 0,
        type:       meta.type         || "application/octet-stream",
        uploadedBy: meta.uploadedBy   || "Unknown",
        uploadedAt: meta.uploadedAt   || null,
        course,
      });
    }

    files.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));

    return new Response(JSON.stringify({ files }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("courses-list error:", err);
    return new Response(JSON.stringify({ error: "Failed to list files", files: [] }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/courses/list" };
