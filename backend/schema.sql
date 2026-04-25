CREATE DATABASE IF NOT EXISTS `bwai3`;
USE `bwai3`;

CREATE TABLE IF NOT EXISTS users (
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
);

CREATE TABLE IF NOT EXISTS `groups` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_user_id INT NOT NULL,
  group_name VARCHAR(100) NOT NULL,
  invite_code VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_owner_group (owner_user_id, group_name),
  CONSTRAINT fk_groups_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  is_opted_in BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_group_member_email (group_id, email),
  CONSTRAINT fk_group_members_group FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submitted_by_user_id INT NOT NULL,
  announcement_text TEXT NOT NULL,
  source_name VARCHAR(150),
  source_url TEXT,
  source_type VARCHAR(50) DEFAULT 'unknown',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_announcements_user FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_analysis_results (
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
);

CREATE TABLE IF NOT EXISTS alerts (
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
  CONSTRAINT fk_alert_group FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS alert_recipients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  alert_id INT NOT NULL,
  recipient_name VARCHAR(100) NOT NULL,
  recipient_email VARCHAR(150) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  sent_count INT NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_alert_recipient_alert FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS community_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  announcement_id INT NOT NULL,
  group_id INT NOT NULL,
  voter_name VARCHAR(100) NOT NULL,
  voter_email VARCHAR(150) NOT NULL,
  vote_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vote_announcement FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  CONSTRAINT fk_vote_group FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE
);

INSERT INTO users (
  id,
  full_name,
  email,
  school_name,
  city,
  education_level,
  section_or_group,
  alert_intensity,
  panic_personality
) VALUES (
  1,
  'Juan Dela Cruz',
  'juan.delacruz@example.com',
  'UST',
  'Manila',
  'college',
  '3ITE',
  'panic',
  'oa_barkada'
) ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  school_name = VALUES(school_name),
  city = VALUES(city),
  education_level = VALUES(education_level),
  section_or_group = VALUES(section_or_group),
  alert_intensity = VALUES(alert_intensity),
  panic_personality = VALUES(panic_personality);

INSERT INTO `groups` (
  id,
  owner_user_id,
  group_name,
  invite_code
) VALUES (
  1,
  1,
  '3ITE Alert Circle',
  '3ITE-PANIC'
) ON DUPLICATE KEY UPDATE
  group_name = VALUES(group_name),
  invite_code = VALUES(invite_code);

INSERT INTO group_members (
  group_id,
  name,
  email,
  role,
  is_opted_in
) VALUES
  (1, 'Ana Santos', 'ana.santos@example.com', 'member', TRUE),
  (1, 'Mark Reyes', 'mark.reyes@example.com', 'member', TRUE),
  (1, 'Bea Cruz', 'bea.cruz@example.com', 'member', TRUE)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  role = VALUES(role),
  is_opted_in = VALUES(is_opted_in);

INSERT INTO announcements (
  id,
  submitted_by_user_id,
  announcement_text,
  source_name,
  source_url,
  source_type
) VALUES (
  1,
  1,
  'Due to continuous heavy rainfall, classes in all levels, public and private schools in the City of Manila are suspended today.',
  'City of Manila',
  'https://example.com/manila-suspension',
  'lgu_page'
) ON DUPLICATE KEY UPDATE
  announcement_text = VALUES(announcement_text),
  source_name = VALUES(source_name),
  source_url = VALUES(source_url),
  source_type = VALUES(source_type);

INSERT INTO ai_analysis_results (
  id,
  announcement_id,
  user_id,
  is_class_suspension,
  is_relevant_to_user,
  is_likely_official,
  confidence_score,
  alert_level,
  affected_location,
  affected_schools,
  affected_levels,
  date_covered,
  reason_text,
  summary_for_student,
  why_relevant,
  possible_issues,
  recommended_action,
  alert_message,
  raw_json
) VALUES (
  1,
  1,
  1,
  TRUE,
  TRUE,
  TRUE,
  94,
  'panic',
  'Manila',
  'All schools in Manila',
  'All levels',
  'Today',
  'Continuous heavy rainfall',
  'Classes are suspended today in Manila for all levels.',
  'The announcement matches Manila and applies to college students.',
  '[]',
  'Trigger Panic Alert',
  'GISING!!! WALANG PASOK ATA. ''WAG KA NA MALIGO, CHECK MO MUNA!',
  JSON_OBJECT(
    'isClassSuspension', TRUE,
    'isRelevantToUser', TRUE,
    'isLikelyOfficial', TRUE,
    'confidenceScore', 94,
    'alertLevel', 'panic',
    'affectedLocation', 'Manila',
    'affectedSchools', 'All schools in Manila',
    'affectedLevels', 'All levels',
    'dateCovered', 'Today',
    'reason', 'Continuous heavy rainfall',
    'summaryForStudent', 'Classes are suspended today in Manila for all levels.',
    'whyRelevant', 'The announcement matches Manila and applies to college students.',
    'possibleIssues', JSON_ARRAY(),
    'recommendedAction', 'Trigger Panic Alert',
    'alertMessage', 'GISING!!! WALANG PASOK ATA. ''WAG KA NA MALIGO, CHECK MO MUNA!'
  )
) ON DUPLICATE KEY UPDATE
  confidence_score = VALUES(confidence_score),
  alert_level = VALUES(alert_level),
  summary_for_student = VALUES(summary_for_student),
  alert_message = VALUES(alert_message),
  raw_json = VALUES(raw_json);
