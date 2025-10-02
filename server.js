// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch"; // Install: npm install node-fetch@3

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from 'public'
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Helper to proxify URLs for assets
function proxify(url, base) {
  try {
    const u = new URL(url, base);
    return "/proxy?url=" + encodeURIComponent(u.toString());
  } catch {
    return url;
  }
}

// Proxy route
app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing URL");

  try {
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow"
    });

    const contentType = response.headers.get("content-type") || "";
    res.set("Content-Type", contentType);

    if (contentType.includes("text/html")) {
      const html = await response.text();

      // Rewrite HTML to proxy asset URLs
      const proxiedHtml = html
        .replace(/(src|href)="([^"]+)"/g, (_, attr, url) => `${attr}="${proxify(url, targetUrl)}"`)
        .replace(/action="([^"]*)"/g, (_, url) => `action="${proxify(url, targetUrl)}"`);

      res.send(proxiedHtml);
    } else {
      // For CSS, JS, images, fonts, etc.
      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    }
  } catch (err) {
    console.error("Proxy fetch error:", err.message);
    res.status(500).send("Proxy fetch failed");
  }
});

app.listen(PORT, () => {
  console.log(`Proxy browser running on port ${PORT}`);
});
