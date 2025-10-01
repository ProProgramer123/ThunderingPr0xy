import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// OPTIONAL: restrict to only certain domains
const ALLOWED_HOSTS = ["example.com", "jsonplaceholder.typicode.com"];

function allowed(url) {
  try {
    const u = new URL(url);
    return ALLOWED_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing url parameter");
  if (!allowed(target)) return res.status(403).send("Host not allowed");

  try {
    const response = await fetch(target);
    res.set("Content-Type", response.headers.get("content-type") || "text/plain");
    response.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(502).send("Proxy error");
  }
});

app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
