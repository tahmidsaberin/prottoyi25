// netlify/functions/resources-list.js
// GET /api/resources/list?course=cse211
// Returns all sections and their file metadata for the given course.
// Public — no auth required (students read this).

import { getStore } from "@netlify/blobs";
import { json } from "./_auth.js";

const SECTIONS = ["ct-questions", "ct-answers", "ct-suggestions", "study-notes"];

export default async (req) => {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const url    = new URL(req.url);
  const course = url.searchParams.get("course");
  if (!course) return json({ error: "?course= is required" }, 400);

  const metaStore = getStore("metadata");
  const result    = {};

  await Promise.all(SECTIONS.map(async (section) => {
    const key = `index/${course}/${section}`;
    try {
      const data = await metaStore.get(key, { type: "json" });
      result[section] = Array.isArray(data) ? data : [];
    } catch {
      result[section] = [];
    }
  }));

  // Attach a signed download URL for each file
  const fileStore = getStore("files");
  for (const section of SECTIONS) {
    for (const file of result[section]) {
      try {
        // getWithMetadata with a short-lived signed URL (1 hour)
        const { url: signedUrl } = await fileStore.getWithMetadata(file.blobKey, { type: "arrayBuffer" });
        // Actually Netlify Blobs public URLs are derived from the deploy context.
        // We serve files through a separate /api/resources/file?key= endpoint.
        file.downloadUrl = `/api/resources/file?key=${encodeURIComponent(file.blobKey)}`;
      } catch {
        file.downloadUrl = null;
      }
    }
  }

  return json({ ok: true, course, sections: result });
};

export const config = { path: "/api/resources/list" };
