import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

function proxify(url, base) {
  try {
    const u = new URL(url, base);
    return "/proxy?url=" + encodeURIComponent(u.toString());
  } catch {
    return url;
  }
}

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing URL");

  try {
    const response = await fetch(targetUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "*/*"
      }
    });

    const contentType = response.headers.get("content-type") || "text/html";
    res.set("Content-Type", contentType);

    if (contentType.includes("text/html")) {
      const html = await response.text();
      const dom = new JSDOM(html);
      const doc = dom.window.document;

      // Rewrite assets
      doc.querySelectorAll("[src]").forEach(el => {
        const src = el.getAttribute("src");
        if (src) el.src = proxify(src, targetUrl);
      });
      doc.querySelectorAll("[href]").forEach(el => {
        const href = el.getAttribute("href");
        if (href) el.href = proxify(href, targetUrl);
      });
      doc.querySelectorAll("form").forEach(el => {
        const action = el.getAttribute("action") || "";
        el.setAttribute("action", proxify(action, targetUrl));
        if (!el.method || el.method.toLowerCase() !== "post") el.method = "get";
      });

      res.send(dom.serialize());
    } else {
      // Stream fonts, JS, images, CSS
      response.body.pipe(res);
    }
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send("Proxy fetch failed");
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
