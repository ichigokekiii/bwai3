import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  analyzeAnnouncement,
  createVote,
  extractImageText,
  getGroupMembers,
  getUserGroups,
  startAlert
} from "../services/api";

const demoAnnouncement =
  "Due to continuous heavy rainfall, classes in all levels, public and private schools in the City of Manila are suspended today.";
const durationOptions = [
  { label: "1 minute", value: 1 },
  { label: "3 minutes", value: 3 },
  { label: "5 minutes", value: 5 }
];

export default function AnalyzeAnnouncementPage({ user }) {
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [photoName, setPhotoName] = useState("");
  const [imagePayload, setImagePayload] = useState(null);
  const [imageText, setImageText] = useState("");
  const [ocrStatus, setOcrStatus] = useState("");
  const [form, setForm] = useState({
    announcementText: demoAnnouncement,
    sourceName: "City of Manila",
    sourceUrl: "",
    sourceType: "lgu_page"
  });
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [resultModal, setResultModal] = useState(null);
  const [alertSettings, setAlertSettings] = useState({
    maxMinutes: 5,
    repeatSeconds: 1
  });

  useEffect(() => {
    if (!user?.id) return;

    async function loadRecipients() {
      const data = await getUserGroups(user.id);
      setGroups(data);

      if (data[0]?.id) {
        const memberData = await getGroupMembers(data[0].id);
        setMembers(memberData);
      } else {
        setMembers([]);
      }
    }

    loadRecipients();
  }, [user?.id]);

  const canAlertEveryone = useMemo(() => Boolean(groups[0]?.id && result?.analysis), [groups, result]);
  const optedInMembers = useMemo(
    () => members.filter((member) => Boolean(member.is_opted_in)),
    [members]
  );
  const recipientPreview = useMemo(() => {
    const list = [];

    if (user?.email) {
      list.push({
        label: `${user.full_name} (profile owner)`,
        email: user.email
      });
    }

    for (const member of optedInMembers) {
      if (!list.some((entry) => entry.email === member.email)) {
        list.push({
          label: member.name,
          email: member.email
        });
      }
    }

    return list;
  }, [optedInMembers, user?.email, user?.full_name]);

  function mergeDetectedText(currentText, detectedText) {
    const marker = "\n\n[Detected from image]\n";
    const normalizedCurrent = currentText || "";

    if (!detectedText) {
      return normalizedCurrent;
    }

    if (!normalizedCurrent.trim() || normalizedCurrent.trim() === demoAnnouncement.trim()) {
      return detectedText;
    }

    if (normalizedCurrent.includes(marker)) {
      return `${normalizedCurrent.split(marker)[0].trimEnd()}${marker}${detectedText}`;
    }

    if (normalizedCurrent.includes(detectedText)) {
      return normalizedCurrent;
    }

    return `${normalizedCurrent}${marker}${detectedText}`;
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    setPhotoName(file?.name || "");

    if (!file) {
      setImagePayload(null);
      setImageText("");
      setOcrStatus("");
      return;
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read the selected image."));
      reader.readAsDataURL(file);
    });

    const imageBase64 = dataUrl.split(",")[1] || "";
    setImagePayload({
      imageBase64,
      imageMimeType: file.type || "image/jpeg"
    });

    setOcrStatus("Detecting text from image...");

    try {
      const data = await extractImageText({
        imageBase64,
        imageMimeType: file.type || "image/jpeg"
      });
      const detectedText = (data.extractedText || "").trim();

      setImageText(detectedText);
      setOcrStatus(
        detectedText
          ? "Text detected from image and added to the announcement box."
          : data.warning || "No readable text was detected from the image."
      );
      if (detectedText) {
        setForm((current) => ({
          ...current,
          announcementText: mergeDetectedText(current.announcementText, detectedText)
        }));
      }
    } catch (error) {
      console.error(error);
      setOcrStatus(error.response?.data?.message || error.message || "Image text detection failed.");
    }
  }

  async function handleAnalyze(event) {
    event.preventDefault();
    setStatus("Checking announcement with AI...");

    try {
      const data = await analyzeAnnouncement({
        userId: user.id,
        ...form,
        ...(imagePayload || {})
      });
      setResult(data);
      setStatus("AI check complete.");
    } catch (error) {
      console.error(error);
      setStatus("AI check failed.");
    }
  }

  async function handleVote(voteType) {
    if (!result || !groups[0]?.id) return;

    await createVote({
      announcement_id: result.announcementId,
      group_id: groups[0].id,
      voter_name: user?.full_name || "Student",
      voter_email: user?.email || "student@example.com",
      vote_type: voteType
    });
    setStatus(`Vote submitted: ${voteType}`);
  }

  async function handleAlertEverybody() {
    if (!result) return;
    try {
      const data = await startAlert({
        userId: user.id,
        announcementId: result.announcementId,
        groupId: groups[0]?.id || null,
        alertLevel: result.analysis.alertLevel,
        repeatSeconds: alertSettings.repeatSeconds,
        maxMinutes: alertSettings.maxMinutes
      });

      setShowAlertModal(false);
      setStatus(
        `Alert #${data.alertId} sent to ${data.sentCount}/${data.recipientCount} recipient(s). Browser/audio reminders repeat every ${data.repeatSeconds} second(s) until ${data.endsAtLabel}.`
      );
      setResultModal({
        type: data.deliveryStatus === "partial_success" ? "success" : "success",
        title: data.deliveryStatus === "partial_success" ? "Alert sent with some delivery issues" : "Alert sent successfully",
        body:
          data.deliveryStatus === "partial_success"
            ? `At least ${data.sentCount} email(s) were accepted, but ${data.failedCount} failed. The alert window stays active until ${data.endsAtLabel}.`
            : `Email delivery was accepted for ${data.sentCount} recipient(s). Browser/audio reminders repeat every ${data.repeatSeconds} second(s) until ${data.endsAtLabel}.`
      });
    } catch (error) {
      console.error(error);
      setShowAlertModal(false);
      setStatus(error.response?.data?.message || "Alert failed.");
      setResultModal({
        type: "error",
        title: "Alert failed",
        body:
          error.response?.data?.message ||
          error.message ||
          "No email was delivered. Check your SMTP settings and try again."
      });
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-card">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-stone-500">Run panic check</p>
          <h1 className="mt-4 font-display text-5xl leading-none text-stone-900">
            Save the profile first before running the AI.
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            The AI agent needs the student profile and barkada group before it can decide if the announcement applies and who should be alerted.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/setup"
              className="inline-flex rounded-xl bg-stone-900 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white"
            >
              Go to Setup Profile
            </Link>
            <Link
              to="/barkada"
              className="inline-flex rounded-xl border border-stone-300 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-stone-800"
            >
              Manage Barkada
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAnalyze}
          className="rounded-3xl border border-stone-200 bg-white p-8 shadow-card xl:flex xl:h-[calc(100vh-12rem)] xl:min-h-[760px] xl:flex-col xl:overflow-hidden"
        >
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-stone-500">Run panic check</p>
          <h1 className="mt-4 font-display text-5xl leading-none text-stone-900">
            Upload the photo, then run the AI check.
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            This is the second main button in the app. The order is simple: upload photo, run AI, vote if needed, alert everybody.
          </p>

          <div className="mt-8 space-y-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Upload photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700"
              />
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-stone-500">
                {photoName || "Optional screenshot for reference"}
              </p>
              {ocrStatus ? <p className="mt-2 text-sm text-stone-600">{ocrStatus}</p> : null}
            </label>

            {imageText ? (
              <div className="rounded-2xl border border-lime-300 bg-lime-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-600">Detected image text</p>
                <div className="mt-3 max-h-52 overflow-y-auto pr-2">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-stone-700">{imageText}</p>
                </div>
              </div>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Announcement text</span>
              <textarea
                rows="9"
                value={form.announcementText}
                onChange={(event) => setForm((current) => ({ ...current, announcementText: event.target.value }))}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 text-stone-900 outline-none focus:border-lime-300"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Source name</span>
              <input
                value={form.sourceName}
                onChange={(event) => setForm((current) => ({ ...current, sourceName: event.target.value }))}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none focus:border-lime-300"
              />
            </label>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Saved email recipients</p>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                This preview comes from the database: the saved profile owner plus barkada members marked as opted in.
              </p>
              <div className="mt-4 space-y-2">
                {recipientPreview.length ? (
                  recipientPreview.map((entry) => (
                    <div
                      key={entry.email}
                      className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between"
                    >
                      <p className="text-sm font-semibold text-stone-900">{entry.label}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{entry.email}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4">
                    <p className="text-sm text-stone-500">No opted-in recipients yet. Add barkada emails before sending alerts.</p>
                    <Link
                      to="/barkada"
                      className="mt-3 inline-flex rounded-full bg-lime-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-stone-900"
                    >
                      Open Barkada Page
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button className="mt-8 rounded-xl bg-stone-900 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white xl:mt-6 xl:shrink-0">
            Check with AI
          </button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl border border-stone-200 bg-white p-8 shadow-card xl:flex xl:h-[calc(100vh-12rem)] xl:min-h-[760px] xl:flex-col xl:overflow-hidden"
        >
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-stone-500">AI result</p>
          <div className="xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-2">
            {!result ? (
              <>
                <h2 className="mt-4 font-display text-5xl leading-none text-stone-900">
                  The AI verdict will appear here.
                </h2>
                <p className="mt-4 text-sm leading-7 text-stone-600">
                  This panel is intentionally simple so the AI is the focus. After checking, you will see the verdict, confidence, relevance, and the final alert message here.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-4 font-display text-5xl leading-none text-stone-900">
                  {result.analysis.isClassSuspension ? "AI says this looks like class suspension." : "AI says this is not a class suspension notice."}
                </h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Confidence</p>
                    <p className="mt-2 text-3xl font-semibold text-stone-900">{result.analysis.confidenceScore}%</p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Alert level</p>
                    <p className="mt-2 text-3xl font-semibold text-stone-900">{result.analysis.alertLevel}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-lime-300 bg-lime-100 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-600">AI message</p>
                  <p className="mt-3 text-lg leading-8 text-stone-900">{result.analysis.alertMessage}</p>
                </div>

                {result.analysis.attendanceAdvice ? (
                  <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-600">Commute advice</p>
                    <p className="mt-3 text-lg leading-8 text-stone-900">{result.analysis.attendanceAdvice}</p>
                    {result.analysis.classContinuityMode &&
                    result.analysis.classContinuityMode !== "suspended" &&
                    result.analysis.classContinuityMode !== "none" ? (
                      <p className="mt-2 text-sm leading-7 text-stone-700">
                        Learning mode detected:{" "}
                        <span className="font-semibold capitalize text-stone-900">
                          {result.analysis.classContinuityMode.replace("_", " ")}
                        </span>
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Why the AI decided this</p>
                  <p className="mt-3 text-sm leading-7 text-stone-700">{result.analysis.summaryForStudent}</p>
                  <p className="mt-2 text-sm leading-7 text-stone-600">{result.analysis.whyRelevant}</p>
                </div>

                <div className="mt-6">
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-stone-500">Vote if needed</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      onClick={() => handleVote("legit")}
                      className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white"
                    >
                      Vote Legit
                    </button>
                    <button
                      onClick={() => handleVote("fake")}
                      className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-stone-800"
                    >
                      Vote Fake
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-stone-500">Final action</p>
                  <button
                    onClick={() => setShowAlertModal(true)}
                    disabled={!canAlertEveryone}
                    className="mt-3 rounded-xl bg-lime-300 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-stone-900 disabled:opacity-50"
                  >
                    Alert Everybody
                  </button>
                </div>
              </>
            )}

            {status ? <p className="mt-6 text-sm font-semibold text-stone-700">{status}</p> : null}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showAlertModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/35 px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="w-full max-w-xl rounded-3xl border border-stone-200 bg-white p-8 shadow-card"
            >
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-stone-500">Alert everybody</p>
              <h2 className="mt-4 font-display text-5xl leading-none text-stone-900">
                Choose how long panic mode should stay active.
              </h2>
              <p className="mt-4 text-sm leading-7 text-stone-600">
                Emails send immediately one time to avoid spam. Browser and sound reminders repeat every{" "}
                <span className="font-semibold text-stone-900">{alertSettings.repeatSeconds} seconds</span> until someone acknowledges or the selected duration ends.
              </p>

              <div className="mt-6">
                <p className="text-sm font-semibold text-stone-800">Alert duration</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {durationOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setAlertSettings((current) => ({
                          ...current,
                          maxMinutes: option.value
                        }))
                      }
                      className={`rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] transition ${
                        alertSettings.maxMinutes === option.value
                          ? "bg-stone-900 text-white"
                          : "border border-stone-300 bg-white text-stone-800"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Summary</p>
                <p className="mt-3 text-sm leading-7 text-stone-700">
                  The barkada gets the first email immediately. Browser and sound reminders then continue for{" "}
                  <span className="font-semibold text-stone-900">{alertSettings.maxMinutes} minute(s)</span>, repeating every{" "}
                  <span className="font-semibold text-stone-900">{alertSettings.repeatSeconds} seconds</span>.
                </p>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  Email targets right now: <span className="font-semibold text-stone-900">{recipientPreview.length}</span> saved recipient(s).
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={handleAlertEverybody}
                  className="rounded-xl bg-lime-300 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-stone-900"
                >
                  Confirm Alert
                </button>
                <button
                  onClick={() => setShowAlertModal(false)}
                  className="rounded-xl border border-stone-300 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-stone-800"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {resultModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/35 px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-8 shadow-card"
            >
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-stone-500">
                {resultModal.type === "error" ? "Alert result" : "Success"}
              </p>
              <h2 className="mt-4 font-display text-5xl leading-none text-stone-900">
                {resultModal.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-stone-600">{resultModal.body}</p>
              <div className="mt-8">
                <button
                  onClick={() => setResultModal(null)}
                  className={`rounded-xl px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] ${
                    resultModal.type === "error"
                      ? "bg-stone-900 text-white"
                      : "bg-lime-300 text-stone-900"
                  }`}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
