// netlify/functions/courses-list.js
// GET /api/courses/list  — public, returns all uploaded course analyses

import { getStore } from "@netlify/blobs";
import { json } from "./_auth.js";

export default async (req) => {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const metaStore = getStore("metadata");
  let index = [];
  try {
    const data = await metaStore.get("index/courses", { type: "json" });
    if (Array.isArray(data)) index = data;
  } catch { /* no courses yet */ }

  return json({ ok: true, courses: index });
};

export const config = { path: "/api/courses/list" };
