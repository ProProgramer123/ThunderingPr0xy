// server.js
const express = require("express");
const fetch = require("node-fetch"); // For Node <18
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (like index.html, css, js)
app.use(express.static(path.join(__dirname, "public")));

// Route: root → serve index.html (your search bar page)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Proxy route
app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing URL");

  try {
    const response = await fetch(targetUrl, { redirect: "follow" });
    const contentType = response.headers.get("content-type") || "text/html";
    res.set("Content-Type", contentType);

    // If HTML, send as text; otherwise stream raw body
    if (contentType.includes("text/html")) {
      const body = await response.text();
      res.send(body);
    } else {
      response.body.pipe(res);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching URL");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
