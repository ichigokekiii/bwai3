const { query } = require("../config/db");

async function createVote(req, res, next) {
  try {
    const {
      announcement_id,
      group_id,
      voter_name,
      voter_email,
      vote_type
    } = req.body;

    const result = await query(
      `INSERT INTO community_votes (
        announcement_id,
        group_id,
        voter_name,
        voter_email,
        vote_type
      ) VALUES (?, ?, ?, ?, ?)`,
      [announcement_id, group_id, voter_name, voter_email, vote_type]
    );

    const [vote] = await query("SELECT * FROM community_votes WHERE id = ?", [result.insertId]);
    res.status(201).json(vote);
  } catch (error) {
    next(error);
  }
}

async function getVotesByAnnouncement(req, res, next) {
  try {
    const votes = await query(
      `SELECT vote_type, COUNT(*) AS total
       FROM community_votes
       WHERE announcement_id = ?
       GROUP BY vote_type`,
      [req.params.announcementId]
    );

    res.json(votes);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createVote,
  getVotesByAnnouncement
};
