// netlify/functions/courses-file.js
import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url    = new URL(req.url);
  const key    = url.searchParams.get("key");
  const course = url.searchParams.get("course") || "general";

  if (!key) {
    return new Response(JSON.stringify({ error: "key is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const store   = getStore({ name: `courses-${course}`, consistency: "strong" });
    const blob    = await store.getWithMetadata(key, { type: "arrayBuffer" });

    if (!blob || !blob.data) {
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const meta     = blob.metadata || {};
    const filename = meta.originalName || key;
    const mimeType = meta.type || "application/octet-stream";

    return new Response(blob.data, {
      status: 200,
      headers: {
        "Content-Type":        mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control":       "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("courses-file error:", err);
    return new Response(JSON.stringify({ error: "Failed to retrieve file" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/courses/file" };
