const express = require("express");
const {
  analyzeAnnouncementController,
  extractImageTextController
} = require("../controllers/aiController");

const router = express.Router();

router.post("/extract-image-text", extractImageTextController);
router.post("/analyze-announcement", analyzeAnnouncementController);

module.exports = router;
