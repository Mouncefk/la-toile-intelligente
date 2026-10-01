// V18 — Radar API surface
const express = require("express");
const router = express.Router();

router.get("/api/radar/v18/signals", async (req, res) => {
  res.json({
    version: "18",
    status: "ready",
    filters: {
      country: req.query.country || null,
      type: req.query.type || null,
      status: req.query.status || "new"
    },
    signals: []
  });
});

router.post("/api/radar/v18/signals", async (req, res) => {
  res.status(201).json({
    version: "18",
    status: "received",
    signal: req.body || {}
  });
});

router.post("/api/radar/v18/signals/:id/qualify", async (req, res) => {
  res.json({
    version: "18",
    signalId: req.params.id,
    qualification: {
      status: "queued",
      intent: req.body?.intent || {},
      sectors: req.body?.sectors || [],
      suggestedActions: req.body?.suggestedActions || []
    }
  });
});

router.post("/api/radar/v18/signals/:id/dispatch", async (req, res) => {
  res.json({
    version: "18",
    signalId: req.params.id,
    status: "dispatch_queued",
    targets: req.body?.targets || []
  });
});

module.exports = router;
