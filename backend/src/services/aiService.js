require("dotenv").config();

const VALID_ALERT_LEVELS = new Set(["none", "chill", "normal", "panic"]);

function env(...keys) {
  for (const key of keys) {
    if (process.env[key] !== undefined && process.env[key] !== "") {
      return process.env[key];
    }
  }

  return undefined;
}

function getTodayString() {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila"
  }).format(new Date());
}

function getPersonalityMessage(personality, summary, urgent) {
  const variants = {
    calm_classmate: urgent
      ? "Classes appear to be suspended today. Please check the announcement and confirm."
      : "May nakita akong update. Double-check natin bago ka bumiyahe.",
    oa_barkada: urgent
      ? "GISING!!! WALANG PASOK ATA. 'WAG KA NA MALIGO, CHECK MO MUNA!"
      : "Beh may chika about class suspension. Check mo muna bago ka mag-commute.",
    strict_registrar: urgent
      ? "Official class suspension detected. Please acknowledge this notice immediately."
      : "Announcement requires verification. Review the notice before leaving for school.",
    tita_mode: urgent
      ? "Anak, mukhang walang pasok. Pakicheck bago ka umalis ha."
      : "Anak, may announcement na kailangang i-confirm. Ingat bago bumiyahe."
  };

  return variants[personality] || `${summary} Please verify this announcement before leaving.`;
}

function normalizeLevel(level = "") {
  return String(level).toLowerCase().replace(/\s+/g, "_");
}

function buildPrompt({ user, announcementText, sourceName, sourceUrl, sourceType }) {
  return `You are an AI announcement verification agent for students in the Philippines.

Your task is to analyze a possible class suspension announcement and decide if it is relevant to the user.

User profile:
- School: ${user.school_name}
- City: ${user.city}
- Education level: ${user.education_level}
- Alert intensity preference: ${user.alert_intensity}
- Alert personality: ${user.panic_personality}
- Today’s date: ${getTodayString()}

Announcement:
${announcementText}

Source:
- Source name: ${sourceName || ""}
- Source URL: ${sourceUrl || ""}
- Source type: ${sourceType || "unknown"}

Analyze the announcement carefully.

You must determine:
1. Is this about class suspension or no classes?
2. Does it apply to the user’s city, school, or education level?
3. Does it appear official or suspicious?
4. What date is covered?
5. What alert level should be triggered?
6. What short message should be shown to the student?
7. Generate the alert message based on the chosen alert personality.

Return JSON only. Do not include markdown. Do not include explanations outside the JSON.

JSON format:
{
  "isClassSuspension": true,
  "isRelevantToUser": true,
  "isLikelyOfficial": true,
  "confidenceScore": 95,
  "alertLevel": "panic",
  "affectedLocation": "Manila",
  "affectedSchools": "All schools",
  "affectedLevels": "All levels",
  "dateCovered": "Today",
  "reason": "Heavy rainfall",
  "summaryForStudent": "Classes are suspended today in your area.",
  "whyRelevant": "The announcement covers your city and education level.",
  "possibleIssues": [],
  "recommendedAction": "Trigger Panic Alert",
  "alertMessage": "GISING!!! WALANG PASOK ATA. 'WAG KA NA MALIGO, CHECK MO MUNA!"
}

Rules:
- alertLevel must be one of: none, chill, normal, panic.
- If not class suspension, use alertLevel none.
- If relevant but unclear, use normal.
- If official, relevant, and urgent, use panic.
- If confidence is below 60, do not use panic.
- possibleIssues must be an array of strings.
- alertMessage must match the user’s selected panic_personality.
- Do not make claims that the announcement is 100% official unless the source strongly supports it.`;
}

function heuristicAnalysis({ user, announcementText, sourceName, sourceType }) {
  const text = `${announcementText || ""} ${sourceName || ""}`.toLowerCase();
  const city = String(user.city || "").toLowerCase();
  const school = String(user.school_name || "").toLowerCase();
  const level = normalizeLevel(user.education_level);
  const issues = [];

  const isClassSuspension =
    /(walang pasok|class(?:es)?\s+(?:are\s+)?suspend|no classes|suspension)/i.test(text);
  const cityMatch = city && text.includes(city);
  const schoolMatch = school && text.includes(school);
  const allLevels = /(all levels|all students|public and private schools)/i.test(text);
  const levelMatch =
    allLevels ||
    (level && text.includes(level.replace(/_/g, " "))) ||
    (level === "college" && /(college|universit|tertiary)/i.test(text));
  const relevant = Boolean(isClassSuspension && (cityMatch || schoolMatch || levelMatch));
  const officialSource = ["school_page", "lgu_page"].includes(sourceType);
  const maybeOfficialName = /(city|municipality|university|college|official|deped|ust)/i.test(text);
  const likelyOfficial = Boolean(officialSource || maybeOfficialName);

  if (!sourceType || sourceType === "unknown" || sourceType === "forwarded_message") {
    issues.push("Source is unclear or forwarded.");
  }

  if (!cityMatch && !schoolMatch) {
    issues.push("Location or school match is weak.");
  }

  let confidence = 25;
  if (isClassSuspension) confidence += 30;
  if (relevant) confidence += 20;
  if (likelyOfficial) confidence += 20;
  if (issues.length) confidence -= issues.length * 7;
  confidence = Math.max(15, Math.min(97, confidence));

  let alertLevel = "none";
  if (isClassSuspension && relevant && likelyOfficial && confidence >= 60) {
    alertLevel = "panic";
  } else if (isClassSuspension && relevant) {
    alertLevel = confidence >= 45 ? "normal" : "chill";
  } else if (isClassSuspension) {
    alertLevel = "chill";
  }

  if (confidence < 60 && alertLevel === "panic") {
    alertLevel = "normal";
  }

  const reasonMatch =
    announcementText.match(/due to ([^.]+)/i) ||
    announcementText.match(/because of ([^.]+)/i) ||
    announcementText.match(/reason[:\-]\s*([^.]+)/i);
  const reason = reasonMatch ? reasonMatch[1].trim() : "Unspecified local disruption";
  const summaryForStudent = isClassSuspension
    ? relevant
      ? "Walang Pasok detected for your setup. Please confirm before leaving."
      : "A class suspension was mentioned, but it may not apply to you."
    : "This announcement does not look like a class suspension notice.";

  const urgent = alertLevel === "panic";

  return sanitizeResult({
    isClassSuspension,
    isRelevantToUser: relevant,
    isLikelyOfficial: likelyOfficial,
    confidenceScore: confidence,
    alertLevel,
    affectedLocation: cityMatch ? user.city : "Unclear",
    affectedSchools: schoolMatch ? user.school_name : allLevels ? "All schools" : "Unclear",
    affectedLevels: allLevels ? "All levels" : user.education_level,
    dateCovered: /today/i.test(announcementText) ? "Today" : "Check announcement text",
    reason,
    summaryForStudent,
    whyRelevant: relevant
      ? "The notice appears to match your city, school, or education level."
      : "The notice does not clearly match your city, school, or education level.",
    possibleIssues: issues,
    recommendedAction:
      alertLevel === "panic"
        ? "Trigger Panic Alert"
        : alertLevel === "normal"
          ? "Review manually before alerting the barkada."
          : "No automatic alert recommended.",
    alertMessage: getPersonalityMessage(user.panic_personality, summaryForStudent, urgent)
  }, user);
}

function sanitizeResult(raw, user = {}) {
  const result = raw || {};
  const isClassSuspension = Boolean(result.isClassSuspension);
  const confidenceScore = Math.max(0, Math.min(100, Number(result.confidenceScore || 0)));
  let alertLevel = VALID_ALERT_LEVELS.has(result.alertLevel) ? result.alertLevel : "none";

  if (!isClassSuspension) {
    alertLevel = "none";
  }

  if (alertLevel === "panic" && confidenceScore < 60) {
    alertLevel = "normal";
  }

  return {
    isClassSuspension,
    isRelevantToUser: Boolean(result.isRelevantToUser),
    isLikelyOfficial: Boolean(result.isLikelyOfficial),
    confidenceScore,
    alertLevel,
    affectedLocation: result.affectedLocation || "",
    affectedSchools: result.affectedSchools || "",
    affectedLevels: result.affectedLevels || "",
    dateCovered: result.dateCovered || "",
    reason: result.reason || "",
    summaryForStudent: result.summaryForStudent || "",
    whyRelevant: result.whyRelevant || "",
    possibleIssues: Array.isArray(result.possibleIssues) ? result.possibleIssues : [],
    recommendedAction: result.recommendedAction || "",
    alertMessage:
      result.alertMessage ||
      getPersonalityMessage(
        user.panic_personality,
        result.summaryForStudent || "Possible class suspension detected.",
        alertLevel === "panic"
      )
  };
}

async function analyzeAnnouncementWithModel(payload) {
  const apiKey = env("OPENAI_API_KEY");
  const baseUrl = env("OPENAI_BASE_URL") || "https://api.openai.com/v1";
  const model = env("OPENAI_MODEL") || "gpt-4o-mini";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "Return valid JSON only."
        },
        {
          role: "user",
          content: buildPrompt(payload)
        }
      ],
      response_format: {
        type: "json_object"
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI provider error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  return sanitizeResult(JSON.parse(content), payload.user);
}

async function analyzeAnnouncementWithGemini(payload) {
  const apiKey = env("GEMINI_API_KEY", "GOOGLE_API_KEY", "OPENAI_API_KEY");
  const model = env("GEMINI_MODEL") || "gemini-2.5-flash";
  const baseUrl = env("GEMINI_API_URL") || "https://generativelanguage.googleapis.com/v1beta";

  const response = await fetch(`${baseUrl}/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: buildPrompt(payload)
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini provider error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!content) {
    throw new Error("Gemini returned an empty response.");
  }

  return sanitizeResult(JSON.parse(content), payload.user);
}

async function analyzeAnnouncement(payload) {
  const provider = (env("AI_PROVIDER") || "").toLowerCase();
  const hasGeminiKey = Boolean(env("GEMINI_API_KEY", "GOOGLE_API_KEY"));
  const hasOpenAiCompatibleConfig = Boolean(env("OPENAI_API_KEY"));
  const shouldMock =
    process.env.USE_MOCK_AI === "true" || (!hasGeminiKey && !hasOpenAiCompatibleConfig);

  if (shouldMock) {
    return {
      result: heuristicAnalysis(payload),
      mode: "mock"
    };
  }

  try {
    if (provider === "gemini" || (hasGeminiKey && !env("OPENAI_BASE_URL"))) {
      return {
        result: await analyzeAnnouncementWithGemini(payload),
        mode: "gemini"
      };
    }

    return {
      result: await analyzeAnnouncementWithModel(payload),
      mode: "openai-compatible"
    };
  } catch (error) {
    return {
      result: heuristicAnalysis(payload),
      mode: "fallback",
      error: error.message
    };
  }
}

module.exports = {
  analyzeAnnouncement,
  buildPrompt
};
