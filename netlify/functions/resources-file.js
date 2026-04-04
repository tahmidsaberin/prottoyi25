// netlify/functions/resources-file.js
// GET /api/resources/file?key=resources/cse211/ct-questions/...
// Streams the file from Netlify Blobs to the browser.
// Public — students download directly from this endpoint.

import { getStore } from "@netlify/blobs";
import { json } from "./_auth.js";

export default async (req) => {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key) return json({ error: "?key= is required" }, 400);

  // Security: key must start with "resources/" to prevent path traversal
  if (!key.startsWith("resources/")) {
    return json({ error: "Invalid key." }, 403);
  }

  const fileStore = getStore("files");

  let result;
  try {
    result = await fileStore.getWithMetadata(key, { type: "arrayBuffer" });
  } catch {
    return json({ error: "File not found." }, 404);
  }

  if (!result || !result.data) return json({ error: "File not found." }, 404);

  const meta        = result.metadata ?? {};
  const mimeType    = meta.mimeType   || "application/octet-stream";
  const fileName    = meta.originalName || key.split("/").pop();
  const disposition = mimeType.startsWith("image/") || mimeType === "application/pdf"
    ? `inline; filename="${fileName}"`      // open PDFs/images in browser
    : `attachment; filename="${fileName}"`; // download everything else

  return new Response(result.data, {
    status: 200,
    headers: {
      "Content-Type":        mimeType,
      "Content-Disposition": disposition,
      "Cache-Control":       "public, max-age=3600",
    }
  });
};

export const config = { path: "/api/resources/file" };
