import express, { type Request, type Response } from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Test route
app.get("/", (_req: Request, res: Response) => {
  res.send("Story Pack API is running!");
});

// Simple POST endpoint for Story Pack (stub)
app.post("/convert", (req: Request, res: Response) => {
  try {
    // Here you would read match_events.json or use req.body
    const inputPath = path.join(__dirname, "../data/match_events.json");
    const matchEvents = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

    // Stub: just echo back input for now
    res.json({
      message: "Received match events",
      count: matchEvents.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process input" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
