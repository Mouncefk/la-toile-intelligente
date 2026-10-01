// La Toile V19 — Notification & Communication API surface
const express = require("express");
const router = express.Router();

router.get("/api/notifications/v19/:actorType/:actorId", async (req, res) => {
  res.json({
    version: "19",
    actor: { type: req.params.actorType, id: req.params.actorId },
    unread: 0,
    notifications: []
  });
});

router.post("/api/notifications/v19/events", async (req, res) => {
  res.status(201).json({
    version: "19",
    status: "queued",
    event: req.body || {}
  });
});

router.patch("/api/notifications/v19/:id/read", async (req, res) => {
  res.json({
    version: "19",
    notificationId: req.params.id,
    status: "read"
  });
});

router.put("/api/notifications/v19/preferences", async (req, res) => {
  res.json({
    version: "19",
    status: "saved",
    preferences: req.body || {}
  });
});

module.exports = router;
