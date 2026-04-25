import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import AlarmOverlay from "../components/AlarmOverlay";
import BarkadaVotePanel from "../components/BarkadaVotePanel";
import ConfidenceMeter from "../components/ConfidenceMeter";
import RecipientStatusList from "../components/RecipientStatusList";
import AlertLevelBadge from "../components/AlertLevelBadge";
import { acknowledgeAlert, getAlert, getVotesByAnnouncement, stopAlert } from "../services/api";
import { requestBrowserNotificationPermission, showBrowserNotification } from "../utils/browserNotifications";
import { startAlarmLoop, stopAlarmLoop } from "../utils/alarmSound";

function aggregateVotes(votes = []) {
  return votes.reduce((accumulator, vote) => {
    accumulator[vote.vote_type] = Number(vote.total);
    return accumulator;
  }, {});
}

export default function AlertRoomPage({ user }) {
  const { alertId } = useParams();
  const [searchParams] = useSearchParams();
  const [alert, setAlert] = useState(null);
  const [votes, setVotes] = useState([]);
  const [now, setNow] = useState(Date.now());
  const recipientEmail = searchParams.get("recipient") || user?.email || "";

  async function load() {
    const alertData = await getAlert(alertId);
    setAlert(alertData);
    const voteData = await getVotesByAnnouncement(alertData.announcement_id);
    setVotes(voteData);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [alertId]);

  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    if (!alert) return;

    let notifyInterval;
    const shouldPanic = alert.status === "active" && alert.alert_level === "panic";

    async function armPanicMode() {
      const permission = await requestBrowserNotificationPermission();
      if (permission === "granted") {
        showBrowserNotification({
          title: "Walang Pasok Panic Agent",
          body: alert.analysis?.alertMessage || "Panic mode armed."
        });
        notifyInterval = setInterval(() => {
          showBrowserNotification({
            title: "Panic follow-up",
            body: "Someone please acknowledge the alert before commute mode activates."
          });
        }, 30000);
      }
      startAlarmLoop();
    }

    if (shouldPanic) {
      armPanicMode();
    } else {
      stopAlarmLoop();
    }

    return () => {
      if (notifyInterval) clearInterval(notifyInterval);
      stopAlarmLoop();
    };
  }, [alert]);

  const countdown = useMemo(() => {
    if (!alert?.started_at || alert.status !== "active") {
      return "00:00";
    }

    const end = new Date(alert.started_at).getTime() + 5 * 60 * 1000;
    const diff = Math.max(0, end - Date.now());
    const minutes = String(Math.floor(diff / 60000)).padStart(2, "0");
    const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [alert, now]);

  const voteSummary = aggregateVotes(votes);
  const barkadaBoost = Math.min(
    10,
    (voteSummary.legit || 0) * 2 + (voteSummary.applies || 0) - (voteSummary.fake || 0) * 2
  );
  const finalConfidence = Math.max(0, Math.min(100, (alert?.analysis?.confidenceScore || 0) + barkadaBoost));

  async function handleAcknowledge() {
    await acknowledgeAlert(alertId, recipientEmail);
    await load();
  }

  async function handleStop() {
    await stopAlert(alertId);
    await load();
  }

  if (!alert) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-stone-600">
        Loading alert room...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 md:px-6">
      <AlarmOverlay
        active={alert.status === "active" && alert.alert_level === "panic"}
        title="Gising check in progress"
        subtitle="Persistent opt-in alerts only. No spam gremlin behavior allowed."
      />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2.5rem] border border-white/80 bg-white/88 p-6 shadow-card">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">Alert room</p>
            <h1 className="mt-3 font-display text-6xl leading-[0.95] text-stone-900">
              {alert.analysis?.isClassSuspension ? "Walang Pasok detected." : "Alert still under review."}
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-600">{alert.analysis?.summaryForStudent}</p>
          </div>
          <div className="space-y-3 rounded-[1.8rem] border border-stone-200 bg-stone-50/90 px-5 py-4">
            <AlertLevelBadge level={alert.alert_level} />
            <p className="text-sm text-stone-600">Countdown: {countdown}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Legend: alert auto-stops after the max duration.</p>
          </div>
        </div>
      </motion.div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <ConfidenceMeter value={finalConfidence} label="Barkada Confidence Meter" />

          <div className="rounded-[2rem] border border-white/80 bg-white/88 p-6 shadow-glow">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Vote snapshot</p>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              `Legit` and `Applies` raise the final confidence. `Fake` lowers it. This makes the community logic easy to explain during the demo.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {["legit", "fake", "unsure", "applies", "not_applies"].map((type) => (
                <div key={type} className="rounded-[1.6rem] border border-stone-200 bg-stone-50/90 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">{type.replaceAll("_", " ")}</p>
                  <p className="mt-2 font-display text-4xl leading-none text-stone-900">{voteSummary[type] || 0}</p>
                </div>
              ))}
            </div>
          </div>

          <BarkadaVotePanel
            announcementId={alert.announcement_id}
            groupId={alert.group_id || 1}
            defaultName={user?.full_name}
            defaultEmail={recipientEmail}
            onVote={load}
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/80 bg-white/88 p-6 shadow-glow">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Primary actions</p>
            <p className="mt-3 text-xl leading-8 text-stone-900">{alert.analysis?.alertMessage}</p>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              Use `I'm Awake / I Saw It` when the student or recipient has confirmed the alert. Use `Stop Alarm` when the situation is handled and the sound should end.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleAcknowledge}
                className="rounded-full bg-stone-900 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white"
              >
                I'm Awake / I Saw It
              </button>
              <button
                onClick={handleStop}
                className="rounded-full bg-lime-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-stone-900"
              >
                Stop Alarm
              </button>
            </div>
          </div>

          <RecipientStatusList recipients={alert.recipients} />
        </div>
      </div>
    </div>
  );
}
