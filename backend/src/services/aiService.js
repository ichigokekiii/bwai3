require("dotenv").config();

const VALID_ALERT_LEVELS = new Set(["none", "chill", "normal", "panic"]);
const VALID_CONTINUITY_MODES = new Set([
  "none",
  "suspended",
  "online",
  "asynchronous",
  "evm"
]);

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

function getPersonalityMessage(personality, summary, urgent, continuityMode = "suspended") {
  const remoteReminder =
    continuityMode === "online" || continuityMode === "asynchronous" || continuityMode === "evm"
      ? " Do not go to school. Classes continue remotely."
      : "";

  const variants = {
    calm_classmate: urgent
      ? `Do not go to school yet. Please check the announcement and confirm.${remoteReminder}`
      : "May nakita akong update. Double-check natin bago ka bumiyahe.",
    oa_barkada: urgent
      ? continuityMode === "online" || continuityMode === "asynchronous" || continuityMode === "evm"
        ? "GISING!!! HUWAG KA MUNA PUMASOK. ONLINE O EVM LANG ATA TODAY, CHECK MO AGAD!"
        : "GISING!!! WALANG PASOK ATA. 'WAG KA NA MALIGO, CHECK MO MUNA!"
      : "Beh may chika about class suspension. Check mo muna bago ka mag-commute.",
    strict_registrar: urgent
      ? continuityMode === "online" || continuityMode === "asynchronous" || continuityMode === "evm"
        ? "On-campus classes are suspended. Do not report to school; continue classes through the announced remote mode."
        : "Official class suspension detected. Please acknowledge this notice immediately."
      : "Announcement requires verification. Review the notice before leaving for school.",
    tita_mode: urgent
      ? continuityMode === "online" || continuityMode === "asynchronous" || continuityMode === "evm"
        ? "Anak, huwag ka munang pumasok sa school. Mukhang online o EVM ang classes, pakicheck agad."
        : "Anak, mukhang walang pasok. Pakicheck bago ka umalis ha."
      : "Anak, may announcement na kailangang i-confirm. Ingat bago bumiyahe."
  };

  return variants[personality] || `${summary} Please verify this announcement before leaving.`;
}

function normalizeLevel(level = "") {
  return String(level).toLowerCase().replace(/\s+/g, "_");
}

function hasImagePayload(payload = {}) {
  return Boolean(payload.imageBase64 && payload.imageMimeType);
}

function buildGeminiParts(promptText, payload = {}) {
  const parts = [{ text: promptText }];

  if (hasImagePayload(payload)) {
    parts.push({
      inlineData: {
        mimeType: payload.imageMimeType,
        data: payload.imageBase64
      }
    });
  }

  return parts;
}

function buildPrompt({ user, announcementText, sourceName, sourceUrl, sourceType, imageBase64 }) {
  return `You are an AI announcement verification agent for students in the Philippines.

Your task is to analyze a possible school disruption announcement and decide if it is relevant to the user.

User profile:
- School: ${user.school_name}
- City: ${user.city}
- Education level: ${user.education_level}
- Alert intensity preference: ${user.alert_intensity}
- Alert personality: ${user.panic_personality}
- Today’s date: ${getTodayString()}

Announcement:
${announcementText}

Attached image:
${imageBase64 ? "Yes. Read the announcement text from the image too and use it in your decision." : "No image attached."}

Source:
- Source name: ${sourceName || ""}
- Source URL: ${sourceUrl || ""}
- Source type: ${sourceType || "unknown"}

Analyze the announcement carefully.

You must determine:
1. Is this about class suspension, no on-campus classes, asynchronous learning, online class, or EVM?
2. Does it apply to the user’s city, school, or education level?
3. Does it appear official or suspicious?
4. What date is covered?
5. What alert level should be triggered?
6. If students should stay home but continue classes online/asynchronously/EVM, make that explicit.
7. What short message should be shown to the student?
8. Generate the alert message based on the chosen alert personality.

Return JSON only. Do not include markdown. Do not include explanations outside the JSON.

JSON format:
{
  "isClassSuspension": true,
  "isRelevantToUser": true,
  "isLikelyOfficial": true,
  "confidenceScore": 95,
  "alertLevel": "panic",
  "classContinuityMode": "suspended",
  "attendanceAdvice": "Do not go to school today.",
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
- classContinuityMode must be one of: none, suspended, online, asynchronous, evm.
- If the notice says students should not physically report to school but should continue learning online, asynchronously, or through EVM, treat it as relevant disruption and explain that they should stay home.
- If not class suspension or no-campus disruption, use alertLevel none.
- If relevant but unclear, use normal.
- If official, relevant, and urgent, use panic.
- If confidence is below 60, do not use panic.
- possibleIssues must be an array of strings.
- alertMessage must match the user’s selected panic_personality.
- Do not make claims that the announcement is 100% official unless the source strongly supports it.`;
}

function buildImageExtractionPrompt() {
  return `You are extracting text from a screenshot or image of a school announcement.

Read the image carefully and extract the readable text as accurately as possible.
Keep line breaks when they help readability.

Return JSON only in this format:
{
  "extractedText": "..."
}`;
}

function parseJsonFromModelContent(content) {
  const normalized = String(content || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(normalized);
}

function heuristicAnalysis({ user, announcementText, sourceName, sourceType }) {
  const text = `${announcementText || ""} ${sourceName || ""}`.toLowerCase();
  const city = String(user.city || "").toLowerCase();
  const school = String(user.school_name || "").toLowerCase();
  const level = normalizeLevel(user.education_level);
  const issues = [];

  const mentionsAsync = /(asynchronous|async(?:hronous)? learning|modules?|modular)/i.test(text);
  const mentionsOnline = /(online class(?:es)?|online learning|remote class(?:es)?|distance learning|virtual class(?:es)?)/i.test(text);
  const mentionsEvm = /\bevm\b|enriched virtual mode/i.test(text);
  const remoteMode =
    mentionsEvm ? "evm" : mentionsAsync ? "asynchronous" : mentionsOnline ? "online" : "none";

  const isClassSuspension =
    /(walang pasok|class(?:es)?\s+(?:are\s+)?suspend|no classes|suspension)/i.test(text) ||
    remoteMode !== "none";
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

  const continuityMode = remoteMode !== "none" ? remoteMode : "suspended";
  const attendanceAdvice =
    continuityMode === "asynchronous"
      ? "Do not go to school. Classes continue through asynchronous learning."
      : continuityMode === "online"
        ? "Do not go to school. Classes continue online."
        : continuityMode === "evm"
          ? "Do not go to school. Classes continue through EVM or another virtual setup."
          : "Do not go to school if this suspension applies to you.";

  const reasonMatch =
    announcementText.match(/due to ([^.]+)/i) ||
    announcementText.match(/because of ([^.]+)/i) ||
    announcementText.match(/reason[:\-]\s*([^.]+)/i);
  const reason = reasonMatch ? reasonMatch[1].trim() : "Unspecified local disruption";
  const summaryForStudent = isClassSuspension
    ? relevant
      ? continuityMode === "suspended"
        ? "No on-campus classes detected for your setup. Please confirm before leaving."
        : `${attendanceAdvice} Please confirm the announcement before leaving.`
      : "A class suspension was mentioned, but it may not apply to you."
    : "This announcement does not look like a class suspension notice.";

  const urgent = alertLevel === "panic";

  return sanitizeResult({
    isClassSuspension,
    isRelevantToUser: relevant,
    isLikelyOfficial: likelyOfficial,
    confidenceScore: confidence,
    alertLevel,
    classContinuityMode: continuityMode,
    attendanceAdvice,
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
    alertMessage: getPersonalityMessage(
      user.panic_personality,
      summaryForStudent,
      urgent,
      continuityMode
    )
  }, user);
}

function sanitizeResult(raw, user = {}) {
  const result = raw || {};
  const isClassSuspension = Boolean(result.isClassSuspension);
  const confidenceScore = Math.max(0, Math.min(100, Number(result.confidenceScore || 0)));
  let alertLevel = VALID_ALERT_LEVELS.has(result.alertLevel) ? result.alertLevel : "none";
  const classContinuityMode = VALID_CONTINUITY_MODES.has(result.classContinuityMode)
    ? result.classContinuityMode
    : isClassSuspension
      ? "suspended"
      : "none";

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
    classContinuityMode,
    attendanceAdvice:
      result.attendanceAdvice ||
      (classContinuityMode === "asynchronous"
        ? "Do not go to school. Classes continue through asynchronous learning."
        : classContinuityMode === "online"
          ? "Do not go to school. Classes continue online."
          : classContinuityMode === "evm"
            ? "Do not go to school. Classes continue through EVM or another virtual setup."
            : isClassSuspension
              ? "Do not go to school if this announcement applies to you."
              : ""),
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
        alertLevel === "panic",
        classContinuityMode
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
  return sanitizeResult(parseJsonFromModelContent(content), payload.user);
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
          parts: buildGeminiParts(buildPrompt(payload), payload)
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

async function extractTextFromImageWithGemini(payload) {
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
          parts: buildGeminiParts(buildImageExtractionPrompt(), payload)
        }
      ],
      generationConfig: {
        temperature: 0.1
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini OCR error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!content) {
    throw new Error("Gemini OCR returned an empty response.");
  }

  const parsed = parseJsonFromModelContent(content);
  return {
    extractedText: String(parsed.extractedText || "").trim()
  };
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

async function extractTextFromImage(payload) {
  const provider = (env("AI_PROVIDER") || "").toLowerCase();
  const hasGeminiKey = Boolean(env("GEMINI_API_KEY", "GOOGLE_API_KEY"));
  const shouldMock = process.env.USE_MOCK_AI === "true" || !hasGeminiKey;

  if (shouldMock) {
    return {
      extractedText: "",
      mode: "mock",
      warning: "Image OCR needs a live Gemini key."
    };
  }

  try {
    if (provider === "gemini" || hasGeminiKey) {
      return {
        ...(await extractTextFromImageWithGemini(payload)),
        mode: "gemini"
      };
    }

    return {
      extractedText: "",
      mode: "unsupported",
      warning: "Image OCR is currently enabled for Gemini mode."
    };
  } catch (error) {
    return {
      extractedText: "",
      mode: "fallback",
      warning: error.message
    };
  }
}

module.exports = {
  analyzeAnnouncement,
  buildPrompt,
  extractTextFromImage
};
