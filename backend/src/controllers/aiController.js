const { query } = require("../config/db");
const { analyzeAnnouncement, extractTextFromImage } = require("../services/aiService");

async function analyzeAnnouncementController(req, res, next) {
  try {
    const { userId, announcementText, sourceName, sourceUrl, sourceType, imageBase64, imageMimeType } = req.body;
    const [user] = await query("SELECT * FROM users WHERE id = ?", [userId]);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const announcementResult = await query(
      `INSERT INTO announcements (
        submitted_by_user_id,
        announcement_text,
        source_name,
        source_url,
        source_type
      ) VALUES (?, ?, ?, ?, ?)`,
      [userId, announcementText, sourceName || null, sourceUrl || null, sourceType || "unknown"]
    );

    const announcementId = announcementResult.insertId;
    const { result, mode, error } = await analyzeAnnouncement({
      user,
      announcementText,
      sourceName,
      sourceUrl,
      sourceType,
      imageBase64,
      imageMimeType
    });

    const analysisResult = await query(
      `INSERT INTO ai_analysis_results (
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        announcementId,
        userId,
        result.isClassSuspension,
        result.isRelevantToUser,
        result.isLikelyOfficial,
        result.confidenceScore,
        result.alertLevel,
        result.affectedLocation,
        result.affectedSchools,
        result.affectedLevels,
        result.dateCovered,
        result.reason,
        result.summaryForStudent,
        result.whyRelevant,
        JSON.stringify(result.possibleIssues || []),
        result.recommendedAction,
        result.alertMessage,
        JSON.stringify(result)
      ]
    );

    res.status(201).json({
      announcementId,
      analysisId: analysisResult.insertId,
      mode,
      warning: error || null,
      analysis: result
    });
  } catch (error) {
    next(error);
  }
}

async function extractImageTextController(req, res, next) {
  try {
    const { imageBase64, imageMimeType } = req.body;

    if (!imageBase64 || !imageMimeType) {
      return res.status(400).json({ message: "Image data is required." });
    }

    const result = await extractTextFromImage({
      imageBase64,
      imageMimeType
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  analyzeAnnouncementController,
  extractImageTextController
};
