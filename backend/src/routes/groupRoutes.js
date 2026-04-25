const express = require("express");
const {
  createGroup,
  getUserGroups,
  addGroupMember,
  getGroupMembers,
  deleteGroupMember
} = require("../controllers/groupController");

const router = express.Router();

router.post("/", createGroup);
router.get("/user/:userId", getUserGroups);
router.post("/:groupId/members", addGroupMember);
router.get("/:groupId/members", getGroupMembers);
router.delete("/:groupId/members/:memberId", deleteGroupMember);

module.exports = router;
