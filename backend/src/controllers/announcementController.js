const { query } = require("../config/db");

async function createAnnouncement(req, res, next) {
  try {
    const {
      submitted_by_user_id,
      announcement_text,
      source_name,
      source_url,
      source_type
    } = req.body;

    const result = await query(
      `INSERT INTO announcements (
        submitted_by_user_id,
        announcement_text,
        source_name,
        source_url,
        source_type
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        submitted_by_user_id,
        announcement_text,
        source_name || null,
        source_url || null,
        source_type || "unknown"
      ]
    );

    const [announcement] = await query("SELECT * FROM announcements WHERE id = ?", [
      result.insertId
    ]);

    res.status(201).json(announcement);
  } catch (error) {
    next(error);
  }
}

async function getUserAnnouncements(req, res, next) {
  try {
    const announcements = await query(
      `SELECT a.*, r.confidence_score, r.alert_level, r.summary_for_student
       FROM announcements a
       LEFT JOIN ai_analysis_results r ON r.announcement_id = a.id
       WHERE a.submitted_by_user_id = ?
       ORDER BY a.created_at DESC`,
      [req.params.userId]
    );

    res.json(announcements);
  } catch (error) {
    next(error);
  }
}

async function getAnnouncement(req, res, next) {
  try {
    const [announcement] = await query(
      `SELECT a.*, r.*
       FROM announcements a
       LEFT JOIN ai_analysis_results r ON r.announcement_id = a.id
       WHERE a.id = ?
       ORDER BY r.created_at DESC
       LIMIT 1`,
      [req.params.id]
    );

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found." });
    }

    res.json(announcement);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createAnnouncement,
  getUserAnnouncements,
  getAnnouncement
};
