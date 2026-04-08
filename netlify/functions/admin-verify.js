// netlify/functions/admin-verify.js
// Verifies admin password stored in Netlify environment variable ADMIN_PASSWORD_HASH

import { createHash } from "crypto";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { password } = await req.json();

    if (!password) {
      return new Response(JSON.stringify({ ok: false, error: "Password required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ADMIN_PASSWORD_HASH should be a SHA-256 hex hash of the admin password.
    // Set it in Netlify → Site Settings → Environment variables.
    const storedHash = process.env.ADMIN_PASSWORD_HASH;
    if (!storedHash) {
      console.error("ADMIN_PASSWORD_HASH env variable is not set.");
      return new Response(JSON.stringify({ ok: false, error: "Admin not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const inputHash = createHash("sha256").update(password).digest("hex");
    const ok        = inputHash === storedHash.toLowerCase();

    return new Response(JSON.stringify({ ok }), {
      status: ok ? 200 : 401,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-verify error:", err);
    return new Response(JSON.stringify({ ok: false, error: "Verification failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/admin/verify" };
