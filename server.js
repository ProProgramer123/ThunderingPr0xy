import express from "express";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

function proxify(url, base) {
  try {
    const u = new URL(url, base);
    return "/proxy?url=" + encodeURIComponent(u.toString());
  } catch {
    return url;
  }
}

app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing url parameter");

  try {
    const upstream = await fetch(target);
    const contentType = upstream.headers.get("content-type") || "";

    // If HTML → rewrite links
    if (contentType.includes("text/html")) {
      const text = await upstream.text();
      const dom = new JSDOM(text);
      const doc = dom.window.document;

      // Fix <a href>, <img src>, <script src>, <link href>, forms
      doc.querySelectorAll("[src]").forEach(el => {
        el.src = proxify(el.getAttribute("src"), target);
      });
      doc.querySelectorAll("[href]").forEach(el => {
        el.href = proxify(el.getAttribute("href"), target);
      });
      doc.querySelectorAll("form").forEach(el => {
        if (el.action) el.action = proxify(el.action, target);
      });

      res.set("Content-Type", "text/html");
      res.send(dom.serialize());
    } else {
      // Non-HTML: just stream (images, JS, CSS, etc.)
      res.set("Content-Type", contentType);
      upstream.body.pipe(res);
    }
  } catch (err) {
    console.error(err);
    res.status(502).send("Proxy error");
  }
});

app.listen(PORT, () => console.log(`Proxy running at http://localhost:${PORT}`));
