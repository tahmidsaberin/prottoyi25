// netlify/functions/admin-change-password.js
// Changes the admin password by updating the Netlify environment variable via the Netlify API.
// Requires NETLIFY_API_TOKEN and NETLIFY_SITE_ID environment variables to be set.

import { createHash } from "crypto";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ ok: false, error: "Both passwords required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (newPassword.length < 8) {
      return new Response(JSON.stringify({ ok: false, error: "New password must be at least 8 characters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify current password first
    const storedHash    = process.env.ADMIN_PASSWORD_HASH;
    const currentHash   = createHash("sha256").update(currentPassword).digest("hex");
    if (currentHash !== storedHash?.toLowerCase()) {
      return new Response(JSON.stringify({ ok: false, error: "Current password is incorrect" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const newHash      = createHash("sha256").update(newPassword).digest("hex");
    const apiToken     = process.env.NETLIFY_API_TOKEN;
    const siteId       = process.env.NETLIFY_SITE_ID;

    if (!apiToken || !siteId) {
      return new Response(JSON.stringify({ ok: false, error: "Server not configured for password updates" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update environment variable via Netlify API
    const netlifyRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/env/ADMIN_PASSWORD_HASH`,
      {
        method:  "PATCH",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({ value: newHash }),
      }
    );

    if (!netlifyRes.ok) {
      throw new Error(`Netlify API error: ${netlifyRes.status}`);
    }

    return new Response(JSON.stringify({ ok: true, message: "Password updated successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-change-password error:", err);
    return new Response(JSON.stringify({ ok: false, error: "Password change failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/admin/change-password" };
