const { getConnection, query } = require("../config/db");
const { sendAlertEmail, verifyEmailTransport } = require("./emailService");

async function expireAlerts({ alertId, userId } = {}) {
  const defaultMaxMinutes = Number(process.env.ALERT_MAX_MINUTES || 5);
  const clauses = [
    "status = 'active'",
    "TIMESTAMPDIFF(MINUTE, started_at, NOW()) >= COALESCE(max_minutes, ?)"
  ];
  const params = [defaultMaxMinutes];

  if (alertId) {
    clauses.push("id = ?");
    params.push(alertId);
  }

  if (userId) {
    clauses.push("user_id = ?");
    params.push(userId);
  }

  await query(
    `UPDATE alerts
     SET status = 'expired', stopped_at = NOW()
     WHERE ${clauses.join(" AND ")}`,
    params
  );
}

async function getAnalysisByAnnouncementId(announcementId, userId) {
  const rows = await query(
    `SELECT *
     FROM ai_analysis_results
     WHERE announcement_id = ? AND user_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [announcementId, userId]
  );

  return rows[0];
}

async function getUserAndGroupRecipients(connection, userId, groupId, shouldNotifyGroup) {
  const [users] = await connection.execute(
    "SELECT id, full_name, email FROM users WHERE id = ? LIMIT 1",
    [userId]
  );

  const recipients = [];

  if (users[0]) {
    recipients.push({
      name: users[0].full_name,
      email: users[0].email,
      role: "owner"
    });
  }

  if (groupId && shouldNotifyGroup) {
    const [members] = await connection.execute(
      `SELECT name, email, role
       FROM group_members
       WHERE group_id = ? AND is_opted_in = TRUE`,
      [groupId]
    );

    for (const member of members) {
      if (!recipients.some((entry) => entry.email === member.email)) {
        recipients.push(member);
      }
    }
  }

  return recipients;
}

function mapAnalysisRecord(record) {
  return {
    isClassSuspension: Boolean(record.is_class_suspension),
    isRelevantToUser: Boolean(record.is_relevant_to_user),
    isLikelyOfficial: Boolean(record.is_likely_official),
    confidenceScore: record.confidence_score,
    alertLevel: record.alert_level,
    affectedLocation: record.affected_location,
    affectedSchools: record.affected_schools,
    affectedLevels: record.affected_levels,
    dateCovered: record.date_covered,
    reason: record.reason_text,
    summaryForStudent: record.summary_for_student,
    whyRelevant: record.why_relevant,
    possibleIssues: JSON.parse(record.possible_issues || "[]"),
    recommendedAction: record.recommended_action,
    alertMessage: record.alert_message
  };
}

function formatDeliveryError(error) {
  const parts = [];

  if (error?.message) {
    parts.push(error.message);
  }

  if (error?.code) {
    parts.push(`Code: ${error.code}`);
  }

  if (error?.response) {
    parts.push(`Provider response: ${error.response}`);
  }

  const detail = parts.filter(Boolean).join(" | ");

  if (!detail) {
    return "Email delivery failed. Check your SMTP configuration and try again.";
  }

  return `Email delivery failed. ${detail}`;
}

async function startAlertWorkflow({
  userId,
  announcementId,
  groupId,
  alertLevel,
  repeatSeconds,
  maxMinutes
}) {
  const analysisRecord = await getAnalysisByAnnouncementId(announcementId, userId);

  if (!analysisRecord) {
    throw new Error("No analysis result found for this announcement.");
  }

  const analysis = mapAnalysisRecord(analysisRecord);
  const shouldNotifyGroup =
    alertLevel === "panic" && analysis.confidenceScore >= 60 && Boolean(groupId);
  const safeRepeatSeconds = Math.max(15, Number(repeatSeconds || process.env.ALERT_REPEAT_SECONDS || 30));
  const safeMaxMinutes = Math.max(1, Math.min(10, Number(maxMinutes || process.env.ALERT_MAX_MINUTES || 5)));

  if (analysis.confidenceScore < 60 && groupId && alertLevel === "panic") {
    throw new Error("Low confidence announcements cannot trigger automatic barkada panic alerts.");
  }

  const connection = await getConnection();
  let committed = false;

  try {
    await connection.beginTransaction();

    const [alertResult] = await connection.execute(
      `INSERT INTO alerts (
        user_id,
        announcement_id,
        group_id,
        alert_level,
        repeat_seconds,
        max_minutes,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [userId, announcementId, groupId || null, alertLevel, safeRepeatSeconds, safeMaxMinutes]
    );

    const alertId = alertResult.insertId;
    const recipients = await getUserAndGroupRecipients(
      connection,
      userId,
      groupId,
      shouldNotifyGroup
    );

    for (const recipient of recipients) {
      await connection.execute(
        `INSERT INTO alert_recipients (
          alert_id,
          recipient_name,
          recipient_email,
          status,
          sent_count,
          last_sent_at
        ) VALUES (?, ?, ?, 'pending', 0, NULL)`,
        [alertId, recipient.name, recipient.email]
      );
    }

    await connection.commit();
    committed = true;

    try {
      await verifyEmailTransport();
    } catch (error) {
      const smtpError = new Error(formatDeliveryError(error));
      smtpError.status = 502;
      throw smtpError;
    }

    const sentRecipients = [];
    let sentCount = 0;
    let failedCount = 0;
    for (const recipient of recipients) {
      try {
        const emailResult = await sendAlertEmail({
          recipientName: recipient.name,
          recipientEmail: recipient.email,
          analysis,
          alertLevel,
          alertId
        });

        await query(
          `UPDATE alert_recipients
           SET status = 'sent', sent_count = sent_count + 1, last_sent_at = NOW()
           WHERE alert_id = ? AND recipient_email = ?`,
          [alertId, recipient.email]
        );

        sentRecipients.push({
          ...recipient,
          status: "sent",
          alertUrl: emailResult.alertUrl,
          accepted: emailResult.accepted
        });
        sentCount += 1;
      } catch (error) {
        const formattedError = formatDeliveryError(error);
        await query(
          `UPDATE alert_recipients
           SET status = 'failed'
           WHERE alert_id = ? AND recipient_email = ?`,
          [alertId, recipient.email]
        );

        sentRecipients.push({
          ...recipient,
          status: "failed",
          error: formattedError
        });
        failedCount += 1;
      }
    }

    if (recipients.length > 0 && sentCount === 0) {
      const error = new Error(
        sentRecipients[0]?.error || "All email deliveries failed. Check SMTP configuration and recipient addresses."
      );
      error.status = 502;
      throw error;
    }

    return {
      alertId,
      alertLevel,
      shouldNotifyGroup,
      recipients: sentRecipients,
      sentCount,
      failedCount,
      deliveryStatus: failedCount > 0 ? "partial_success" : "success",
      repeatSeconds: safeRepeatSeconds,
      maxMinutes: safeMaxMinutes
    };
  } catch (error) {
    if (!committed) {
      await connection.rollback();
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function stopAlertWorkflow(alertId) {
  await query(
    `UPDATE alerts
     SET status = 'stopped', stopped_at = NOW()
     WHERE id = ?`,
    [alertId]
  );

  return getAlertDetails(alertId);
}

async function acknowledgeAlert(alertId, recipientEmail) {
  if (recipientEmail) {
    await query(
      `UPDATE alert_recipients
       SET status = 'acknowledged'
       WHERE alert_id = ? AND recipient_email = ?`,
      [alertId, recipientEmail]
    );
  }

  await query(
    `UPDATE alerts
     SET status = 'acknowledged', stopped_at = NOW()
     WHERE id = ?`,
    [alertId]
  );

  return getAlertDetails(alertId);
}

async function getAlertDetails(alertId) {
  await expireAlerts({ alertId });

  const [alert] = await query(
    `SELECT a.*, an.announcement_text, an.source_name, an.source_type, an.source_url
     FROM alerts a
     JOIN announcements an ON an.id = a.announcement_id
     WHERE a.id = ?`,
    [alertId]
  );

  if (!alert) {
    return null;
  }

  const recipients = await query(
    `SELECT *
     FROM alert_recipients
     WHERE alert_id = ?
     ORDER BY created_at ASC`,
    [alertId]
  );

  const [analysis] = await query(
    `SELECT *
     FROM ai_analysis_results
     WHERE announcement_id = ? AND user_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [alert.announcement_id, alert.user_id]
  );

  const votes = await query(
    `SELECT vote_type, COUNT(*) AS total
     FROM community_votes
     WHERE announcement_id = ?
     GROUP BY vote_type`,
    [alert.announcement_id]
  );

  return {
    ...alert,
    recipients,
    analysis: analysis ? mapAnalysisRecord(analysis) : null,
    votes
  };
}

async function getUserAlerts(userId) {
  await expireAlerts({ userId });

  return query(
    `SELECT *
     FROM alerts
     WHERE user_id = ?
     ORDER BY started_at DESC`,
    [userId]
  );
}

module.exports = {
  startAlertWorkflow,
  stopAlertWorkflow,
  acknowledgeAlert,
  getAlertDetails,
  getUserAlerts
};
