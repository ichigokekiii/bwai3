const { getConnection } = require("./db");

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    school_name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    education_level VARCHAR(50) NOT NULL,
    section_or_group VARCHAR(100) NULL,
    alert_intensity VARCHAR(50) NOT NULL DEFAULT 'normal',
    panic_personality VARCHAR(50) NOT NULL DEFAULT 'calm_classmate',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS \`groups\` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_user_id INT NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    invite_code VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_owner_group (owner_user_id, group_name),
    CONSTRAINT fk_groups_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    is_opted_in BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_group_member_email (group_id, email),
    CONSTRAINT fk_group_members_group FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submitted_by_user_id INT NOT NULL,
    announcement_text TEXT NOT NULL,
    source_name VARCHAR(150),
    source_url TEXT,
    source_type VARCHAR(50) DEFAULT 'unknown',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_announcements_user FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS ai_analysis_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id INT NOT NULL,
    user_id INT NOT NULL,
    is_class_suspension BOOLEAN NOT NULL DEFAULT FALSE,
    is_relevant_to_user BOOLEAN NOT NULL DEFAULT FALSE,
    is_likely_official BOOLEAN NOT NULL DEFAULT FALSE,
    confidence_score INT NOT NULL DEFAULT 0,
    alert_level VARCHAR(50) NOT NULL DEFAULT 'none',
    affected_location VARCHAR(150),
    affected_schools TEXT,
    affected_levels VARCHAR(150),
    date_covered VARCHAR(150),
    reason_text TEXT,
    summary_for_student TEXT,
    why_relevant TEXT,
    possible_issues TEXT,
    recommended_action TEXT,
    alert_message TEXT,
    raw_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_result_announcement FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_result_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    announcement_id INT NOT NULL,
    group_id INT NULL,
    alert_level VARCHAR(50) NOT NULL,
    repeat_seconds INT NOT NULL DEFAULT 30,
    max_minutes INT NOT NULL DEFAULT 5,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    stopped_at TIMESTAMP NULL,
    CONSTRAINT fk_alert_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_alert_announcement FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    CONSTRAINT fk_alert_group FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS alert_recipients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_id INT NOT NULL,
    recipient_name VARCHAR(100) NOT NULL,
    recipient_email VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    sent_count INT NOT NULL DEFAULT 0,
    last_sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alert_recipient_alert FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS community_votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id INT NOT NULL,
    group_id INT NOT NULL,
    voter_name VARCHAR(100) NOT NULL,
    voter_email VARCHAR(150) NOT NULL,
    vote_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vote_announcement FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    CONSTRAINT fk_vote_group FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE
  )`
];

async function initDatabase() {
  const connection = await getConnection();

  try {
    for (const statement of statements) {
      await connection.query(statement);
    }

    const [repeatSecondsColumn] = await connection.query(
      `SHOW COLUMNS FROM alerts LIKE 'repeat_seconds'`
    );
    if (!repeatSecondsColumn.length) {
      await connection.query(
        `ALTER TABLE alerts
         ADD COLUMN repeat_seconds INT NOT NULL DEFAULT 30`
      );
    }

    const [maxMinutesColumn] = await connection.query(
      `SHOW COLUMNS FROM alerts LIKE 'max_minutes'`
    );
    if (!maxMinutesColumn.length) {
      await connection.query(
        `ALTER TABLE alerts
         ADD COLUMN max_minutes INT NOT NULL DEFAULT 5`
      );
    }
  } finally {
    connection.release();
  }
}

module.exports = {
  initDatabase
};
