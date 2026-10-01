// La Toile V26 — Guide Virtual Companion API
const express = require("express");
const router = express.Router();

router.post("/api/guide/v26/profiles", async (req, res) => {
  res.status(201).json({
    version: "26",
    status: "created",
    profile: req.body || {}
  });
});

router.post("/api/guide/v26/sessions", async (req, res) => {
  res.status(201).json({
    version: "26",
    status: "active",
    session: req.body || {}
  });
});

router.post("/api/guide/v26/sessions/:sessionId/messages", async (req, res) => {
  res.status(201).json({
    version: "26",
    sessionId: req.params.sessionId,
    status: "processed",
    reply: null,
    actions: []
  });
});

router.get("/api/guide/v26/sessions/:sessionId/context", async (req, res) => {
  res.json({
    version: "26",
    sessionId: req.params.sessionId,
    context: {
      country: null,
      city: null,
      trip: null,
      preferences: {},
      recentIntent: null
    }
  });
});

router.post("/api/guide/v26/sessions/:sessionId/actions", async (req, res) => {
  res.status(201).json({
    version: "26",
    sessionId: req.params.sessionId,
    status: "suggested",
    action: req.body || {}
  });
});

module.exports = router;
