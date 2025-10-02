// server.js
import express from "express";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

const app = express();
const PORT = process.env.PORT || 3000;

// Default starting site
let currentBase = "https://duckduckgo.com";

// Helper: turn a normal URL into a proxied one
function proxify(url, base) {
  try {
    const u = new URL(url, base);
    return "/proxy?url=" + encodeURIComponent(u.toString());
  } catch {
    return url;
  }
}

// Core proxy handler
async function handleProxy(target, res) {
  const upstream = await fetch(target, { redirect: "follow" });
  const contentType = upstream.headers.get("content-type") || "";

  if (contentType.includes("text/html")) {
    const text = await upstream.text();
    const dom = new JSDOM(text);
    const doc = dom.window.document;

    // Rewrite asset URLs
    doc.querySelectorAll("[src]").forEach(el => {
      el.src = proxify(el.getAttribute("src"), target);
    });
    doc.querySelectorAll("[href]").forEach(el => {
      el.href = proxify(el.getAttribute("href"), target);
    });

    // Rewrite forms (fix search engines!)
    doc.querySelectorAll("form").forEach(el => {
      const action = el.getAttribute("action") || "";
      el.setAttribute("action", proxify(action, target));

      // Make sure GET is default for searches
      if (!el.method || el.method.toLowerCase() !== "post") {
        el.method = "get";
      }
    });

    res.set("Content-Type", "text/html");
    res.send(dom.serialize());
  } else {
    // Pass through non-HTML files (images, JS, CSS, etc.)
    res.set("Content-Type", contentType);
    upstream.body.pipe(res);
  }
}

// Explicit /proxy endpoint
app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing url parameter");

  try {
    currentBase = target;
    await handleProxy(target, res);
  } catch (err) {
    console.error(err);
    res.status(502).send("Proxy error");
  }
});

// Catch-all: treat any other path as relative to current site
app.get("*", async (req, res) => {
  try {
    const target = new URL(req.originalUrl, currentBase).toString();
    await handleProxy(target, res);
  } catch (err) {
    console.error(err);
    res.status(502).send("Proxy error");
  }
});

app.listen(PORT, () =>
  console.log(`✅ Proxy browser running on http://localhost:${PORT}`)
);
