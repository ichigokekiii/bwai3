const { query } = require("../config/db");

async function createUser(req, res, next) {
  try {
    const {
      full_name,
      email,
      school_name,
      city,
      education_level,
      section_or_group,
      alert_intensity,
      panic_personality
    } = req.body;

    const result = await query(
      `INSERT INTO users (
        full_name,
        email,
        school_name,
        city,
        education_level,
        section_or_group,
        alert_intensity,
        panic_personality
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name,
        email,
        school_name,
        city,
        education_level,
        section_or_group || null,
        alert_intensity,
        panic_personality
      ]
    );

    const [user] = await query("SELECT * FROM users WHERE id = ?", [result.insertId]);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

async function getUser(req, res, next) {
  try {
    const [user] = await query("SELECT * FROM users WHERE id = ?", [req.params.id]);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const {
      full_name,
      email,
      school_name,
      city,
      education_level,
      section_or_group,
      alert_intensity,
      panic_personality
    } = req.body;

    await query(
      `UPDATE users
       SET full_name = ?,
           email = ?,
           school_name = ?,
           city = ?,
           education_level = ?,
           section_or_group = ?,
           alert_intensity = ?,
           panic_personality = ?
       WHERE id = ?`,
      [
        full_name,
        email,
        school_name,
        city,
        education_level,
        section_or_group || null,
        alert_intensity,
        panic_personality,
        req.params.id
      ]
    );

    const [user] = await query("SELECT * FROM users WHERE id = ?", [req.params.id]);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createUser,
  getUser,
  updateUser
};
