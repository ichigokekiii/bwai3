const express = require("express");
const {
  createAnnouncement,
  getUserAnnouncements,
  getAnnouncement
} = require("../controllers/announcementController");

const router = express.Router();

router.post("/", createAnnouncement);
router.get("/user/:userId", getUserAnnouncements);
router.get("/:id", getAnnouncement);

module.exports = router;
