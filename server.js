import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend
app.use(express.static("public"));

// Proxy route
app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing url parameter");

  try {
    const response = await fetch(target);
    res.set("Content-Type", response.headers.get("content-type") || "text/html");
    response.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(502).send("Proxy error");
  }
});

app.listen(PORT, () => console.log(`Proxy running on ${PORT}`));
