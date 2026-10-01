// La Toile V25 — Tourism Knowledge & Content API
const express = require("express");
const router = express.Router();

router.get("/api/knowledge/v25/search", async (req, res) => {
  res.json({
    version: "25",
    query: req.query.q || "",
    country: req.query.country || null,
    language: req.query.language || null,
    results: []
  });
});

router.get("/api/knowledge/v25/entity/:id", async (req, res) => {
  res.json({
    version: "25",
    entityId: req.params.id,
    entity: null,
    content: [],
    relations: []
  });
});

router.post("/api/knowledge/v25/entities", async (req, res) => {
  res.status(201).json({
    version: "25",
    status: "created",
    entity: req.body || {}
  });
});

router.post("/api/knowledge/v25/entities/:id/content", async (req, res) => {
  res.status(201).json({
    version: "25",
    entityId: req.params.id,
    status: "content_queued",
    content: req.body || {}
  });
});

router.post("/api/knowledge/v25/entities/:id/relations", async (req, res) => {
  res.status(201).json({
    version: "25",
    entityId: req.params.id,
    status: "relation_created",
    relation: req.body || {}
  });
});

module.exports = router;
