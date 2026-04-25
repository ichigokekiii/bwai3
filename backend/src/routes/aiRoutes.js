const express = require("express");
const { analyzeAnnouncementController } = require("../controllers/aiController");

const router = express.Router();

router.post("/analyze-announcement", analyzeAnnouncementController);

module.exports = router;
