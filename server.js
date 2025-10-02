// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Helper to make URLs go through the proxy
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
    const response = await fetch(targetUrl, { redirect: "follow" });
    const contentType = response.headers.get("content-type") || "text/html";
    res.set("Content-Type", contentType);

    if (contentType.includes("text/html")) {
      const text = await response.text();
      const dom = new JSDOM(text);
      const doc = dom.window.document;

      // Rewrite assets
      doc.querySelectorAll("[src]").forEach(el => {
        el.src = proxify(el.getAttribute("src"), targetUrl);
      });
      doc.querySelectorAll("[href]").forEach(el => {
        el.href = proxify(el.getAttribute("href"), targetUrl);
      });
      doc.querySelectorAll("form").forEach(el => {
        const action = el.getAttribute("action") || "";
        el.setAttribute("action", proxify(action, targetUrl));
        if (!el.method || el.method.toLowerCase() !== "post") el.method = "get";
      });

      res.send(dom.serialize());
    } else {
      // Stream CSS, JS, images
      const body = response.body;
      body.pipe(res);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Proxy error");
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
