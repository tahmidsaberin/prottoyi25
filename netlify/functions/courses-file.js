// netlify/functions/courses-file.js
// GET /api/courses/file?key=analyses/course_xxx.html
// Serves the stored HTML analysis file.

import { getStore } from "@netlify/blobs";
import { json } from "./_auth.js";

export default async (req) => {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key) return json({ error: "?key= is required" }, 400);
  if (!key.startsWith("analyses/")) return json({ error: "Invalid key." }, 403);

  const fileStore = getStore("files");
  let result;
  try {
    result = await fileStore.getWithMetadata(key, { type: "arrayBuffer" });
  } catch {
    return json({ error: "File not found." }, 404);
  }

  if (!result?.data) return json({ error: "File not found." }, 404);

  return new Response(result.data, {
    status: 200,
    headers: {
      "Content-Type":  "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    }
  });
};

export const config = { path: "/api/courses/file" };
