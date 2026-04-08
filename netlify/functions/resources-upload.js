// netlify/functions/resources-upload.js
import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }
  try {
    const formData   = await req.formData();
    const file       = formData.get("file");
    const uploadedBy = formData.get("uploadedBy") || "Anonymous";
    if (!file || typeof file === "string") {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (file.size > 50 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large (max 50 MB)" }), { status: 413, headers: { "Content-Type": "application/json" } });
    }
    const store   = getStore({ name: "resources", consistency: "strong" });
    const safeKey = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const buffer  = await file.arrayBuffer();
    await store.set(safeKey, buffer, { metadata: { originalName: file.name, size: file.size, type: file.type, uploadedBy, uploadedAt: Date.now() } });
    return new Response(JSON.stringify({ success: true, key: safeKey, name: file.name }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Upload failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
export const config = { path: "/api/resources/upload" };
