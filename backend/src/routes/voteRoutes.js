const express = require("express");
const { createVote, getVotesByAnnouncement } = require("../controllers/voteController");

const router = express.Router();

router.post("/", createVote);
router.get("/announcement/:announcementId", getVotesByAnnouncement);

module.exports = router;
