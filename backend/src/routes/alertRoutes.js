const express = require("express");
const {
  startAlert,
  stopAlert,
  acknowledgeAlertController,
  getAlert,
  getAlertsByUser
} = require("../controllers/alertController");

const router = express.Router();

router.post("/start", startAlert);
router.post("/:alertId/stop", stopAlert);
router.post("/:alertId/acknowledge", acknowledgeAlertController);
router.get("/:alertId", getAlert);
router.get("/user/:userId", getAlertsByUser);

module.exports = router;
