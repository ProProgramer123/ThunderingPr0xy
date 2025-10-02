// server.js
import express from "express";
import fetch from "node-fetch"; // For Node <18, otherwise native fetch works
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (like index.html)
app.use(express.static(path.join(__dirname, "public")));

// Root route → serve index.html
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
