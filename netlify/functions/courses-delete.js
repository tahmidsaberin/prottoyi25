// netlify/functions/courses-delete.js
import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "DELETE" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body   = await req.json();
    const { key, course } = body;

    if (!key || !course) {
      return new Response(JSON.stringify({ error: "key and course are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const store = getStore({ name: `courses-${course}`, consistency: "strong" });
    await store.delete(key);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("courses-delete error:", err);
    return new Response(JSON.stringify({ error: "Delete failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/courses/delete" };
