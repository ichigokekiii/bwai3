const { query } = require("../config/db");
const generateInviteCode = require("../utils/generateInviteCode");

async function createGroup(req, res, next) {
  try {
    const { owner_user_id, group_name } = req.body;
    const inviteCode = generateInviteCode(group_name);

    const result = await query(
      "INSERT INTO `groups` (owner_user_id, group_name, invite_code) VALUES (?, ?, ?)",
      [owner_user_id, group_name, inviteCode]
    );

    const [group] = await query("SELECT * FROM `groups` WHERE id = ?", [result.insertId]);
    res.status(201).json(group);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      error.status = 409;
      error.message = "That barkada group name already exists for this user.";
    }
    next(error);
  }
}

async function getUserGroups(req, res, next) {
  try {
    const groups = await query(
      `SELECT g.*, COUNT(gm.id) AS member_count
       FROM \`groups\` g
       LEFT JOIN group_members gm ON gm.group_id = g.id
       WHERE g.owner_user_id = ?
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [req.params.userId]
    );

    res.json(groups);
  } catch (error) {
    next(error);
  }
}

async function addGroupMember(req, res, next) {
  try {
    const { name, email, role, is_opted_in } = req.body;

    const result = await query(
      `INSERT INTO group_members (group_id, name, email, role, is_opted_in)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.params.groupId,
        name,
        email,
        role || "member",
        Boolean(is_opted_in)
      ]
    );

    const [member] = await query("SELECT * FROM group_members WHERE id = ?", [result.insertId]);
    res.status(201).json(member);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      error.status = 409;
      error.message = "That email is already added to this barkada group.";
    }
    next(error);
  }
}

async function getGroupMembers(req, res, next) {
  try {
    const members = await query(
      "SELECT * FROM group_members WHERE group_id = ? ORDER BY created_at ASC",
      [req.params.groupId]
    );

    res.json(members);
  } catch (error) {
    next(error);
  }
}

async function deleteGroupMember(req, res, next) {
  try {
    await query("DELETE FROM group_members WHERE id = ? AND group_id = ?", [
      req.params.memberId,
      req.params.groupId
    ]);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createGroup,
  getUserGroups,
  addGroupMember,
  getGroupMembers,
  deleteGroupMember
};
