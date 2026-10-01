// La Toile V20 — Analytics API surface
const express = require("express");
const router = express.Router();

router.post("/api/analytics/v20/events", async (req, res) => {
  res.status(202).json({
    version: "20",
    status: "accepted",
    event: req.body || {}
  });
});

router.get("/api/analytics/v20/country/:iso3", async (req, res) => {
  res.json({
    version: "20",
    country: req.params.iso3,
    period: req.query.period || "30d",
    metrics: [],
    insights: []
  });
});

router.get("/api/analytics/v20/institution/:institutionId", async (req, res) => {
  res.json({
    version: "20",
    institutionId: req.params.institutionId,
    privacy: {
      mode: "aggregated_only",
      personal_vault_excluded: true,
      health_data_excluded: true
    },
    metrics: [],
    insights: []
  });
});

router.post("/api/analytics/v20/insights", async (req, res) => {
  res.status(201).json({
    version: "20",
    status: "queued",
    scope: req.body?.scope || null
  });
});

module.exports = router;
