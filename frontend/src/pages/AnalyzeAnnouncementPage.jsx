import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { analyzeAnnouncement, createVote, getUserGroups, startAlert } from "../services/api";

const demoAnnouncement =
  "Due to continuous heavy rainfall, classes in all levels, public and private schools in the City of Manila are suspended today.";

export default function AnalyzeAnnouncementPage({ user }) {
  const [groups, setGroups] = useState([]);
  const [photoName, setPhotoName] = useState("");
  const [form, setForm] = useState({
    announcementText: demoAnnouncement,
    sourceName: "City of Manila",
    sourceUrl: "",
    sourceType: "lgu_page"
  });
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    getUserGroups(user.id).then(setGroups);
  }, [user?.id]);

  const canAlertEveryone = useMemo(() => Boolean(groups[0]?.id && result?.analysis), [groups, result]);

  async function handleAnalyze(event) {
    event.preventDefault();
    setStatus("Checking announcement with AI...");

    try {
      const data = await analyzeAnnouncement({
        userId: user.id,
        ...form
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

    const data = await startAlert({
      userId: user.id,
      announcementId: result.announcementId,
      groupId: groups[0]?.id || null,
      alertLevel: result.analysis.alertLevel
    });

    setStatus(`Alert #${data.alertId} sent.`);
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
          <Link
            to="/setup"
            className="mt-8 inline-flex rounded-xl bg-stone-900 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white"
          >
            Go to Setup Profile & Group
          </Link>
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
          className="rounded-3xl border border-stone-200 bg-white p-8 shadow-card"
        >
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-stone-500">Run panic check</p>
          <h1 className="mt-4 font-display text-5xl leading-none text-stone-900">
            Upload the photo, then run the AI check.
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            This is the second main button in the app. The order is simple: upload photo, run AI, vote if needed, alert everybody.
          </p>

          <div className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Upload photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setPhotoName(event.target.files?.[0]?.name || "")}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700"
              />
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-stone-500">
                {photoName || "Optional screenshot for reference"}
              </p>
            </label>

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
          </div>

          <button className="mt-8 rounded-xl bg-stone-900 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white">
            Check with AI
          </button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl border border-stone-200 bg-white p-8 shadow-card"
        >
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-stone-500">AI result</p>
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
                  onClick={handleAlertEverybody}
                  disabled={!canAlertEveryone}
                  className="mt-3 rounded-xl bg-lime-300 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-stone-900 disabled:opacity-50"
                >
                  Alert Everybody
                </button>
              </div>
            </>
          )}

          {status ? <p className="mt-6 text-sm font-semibold text-stone-700">{status}</p> : null}
        </motion.div>
      </div>
    </div>
  );
}
