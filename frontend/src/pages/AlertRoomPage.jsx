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
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const [browserMuted, setBrowserMuted] = useState(false);
  const [actionStatus, setActionStatus] = useState("");
  const [isActing, setIsActing] = useState(false);
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
    const shouldPanic =
      alert.status === "active" && alert.alert_level === "panic" && !browserMuted;

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
        }, Number(alert.repeat_seconds || 30) * 1000);
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
  }, [alert, browserMuted]);

  useEffect(() => {
    if (!alert) return;

    if (alert.status !== "active") {
      setOverlayDismissed(true);
      setBrowserMuted(true);
      stopAlarmLoop();
      return;
    }

    setOverlayDismissed(false);
    setBrowserMuted(false);
  }, [alert?.id, alert?.status]);

  const countdown = useMemo(() => {
    if (!alert?.started_at || alert.status !== "active") {
      return "00:00";
    }

    const end =
      new Date(alert.started_at).getTime() + Number(alert.max_minutes || 5) * 60 * 1000;
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
    setIsActing(true);
    setActionStatus("Acknowledging alert...");
    setOverlayDismissed(true);
    setBrowserMuted(true);
    stopAlarmLoop();

    setAlert((current) =>
      current
        ? {
            ...current,
            status: "acknowledged"
          }
        : current
    );

    try {
      await acknowledgeAlert(alertId, recipientEmail);
      await load();
      setActionStatus("Alert acknowledged. Panic mode is now off.");
    } catch (error) {
      console.error(error);
      setActionStatus(error.response?.data?.message || error.message || "Could not acknowledge alert.");
      await load();
    } finally {
      setIsActing(false);
    }
  }

  async function handleStop() {
    setIsActing(true);
    setActionStatus("Stopping alarm...");
    setOverlayDismissed(true);
    setBrowserMuted(true);
    stopAlarmLoop();

    setAlert((current) =>
      current
        ? {
            ...current,
            status: "stopped"
          }
        : current
    );

    try {
      await stopAlert(alertId);
      await load();
      setActionStatus("Alarm stopped. Panic mode is now off.");
    } catch (error) {
      console.error(error);
      setActionStatus(error.response?.data?.message || error.message || "Could not stop alarm.");
      await load();
    } finally {
      setIsActing(false);
    }
  }

  function handleMuteBrowser() {
    setBrowserMuted(true);
    setOverlayDismissed(true);
    stopAlarmLoop();
    setActionStatus("Browser sound and overlay muted on this device. The alert stays active until acknowledged or expired.");
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
        active={alert.status === "active" && alert.alert_level === "panic" && !overlayDismissed}
        title="Gising check in progress"
        subtitle="Open from email, confirm you saw it, then turn off the panic mode here."
        actions={
          <>
            <button
              onClick={handleAcknowledge}
              disabled={isActing}
              className="rounded-full bg-lime-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-stone-900 disabled:opacity-50"
            >
              I Saw It, Turn It Off
            </button>
            <button
              onClick={handleMuteBrowser}
              disabled={isActing}
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-stone-800 disabled:opacity-50"
            >
              Mute This Browser
            </button>
          </>
        }
      />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2.5rem] border border-white/80 bg-white/88 p-6 shadow-card">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">Alert room</p>
            <h1 className="mt-3 font-display text-6xl leading-[0.95] text-stone-900">
              {alert.analysis?.classContinuityMode &&
              alert.analysis.classContinuityMode !== "suspended" &&
              alert.analysis.classContinuityMode !== "none"
                ? "No on-campus classes. Remote mode detected."
                : alert.analysis?.isClassSuspension
                  ? "Walang Pasok detected."
                  : "Alert still under review."}
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-600">{alert.analysis?.summaryForStudent}</p>
            {alert.analysis?.attendanceAdvice ? (
              <p className="mt-3 max-w-3xl text-base leading-7 text-amber-700">
                {alert.analysis.attendanceAdvice}
              </p>
            ) : null}
            {recipientEmail ? (
              <p className="mt-3 inline-flex rounded-full bg-stone-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
                Opened from email: {recipientEmail}
              </p>
            ) : null}
          </div>
          <div className="space-y-3 rounded-[1.8rem] border border-stone-200 bg-stone-50/90 px-5 py-4">
            <AlertLevelBadge level={alert.alert_level} />
            <p className="text-sm text-stone-600">Countdown: {countdown}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
              Legend: browser/audio reminders repeat every {alert.repeat_seconds || 30}s and auto-stop after {alert.max_minutes || 5} min.
            </p>
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
            {actionStatus ? <p className="mt-3 text-sm font-semibold text-stone-700">{actionStatus}</p> : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleAcknowledge}
                disabled={isActing}
                className="rounded-full bg-lime-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-stone-900 disabled:opacity-50"
              >
                I've Seen It, Turn Off Alerts
              </button>
              <button
                onClick={handleStop}
                disabled={isActing}
                className="rounded-full bg-stone-900 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white disabled:opacity-50"
              >
                Stop Alarm Only
              </button>
              <button
                onClick={handleMuteBrowser}
                disabled={isActing || browserMuted}
                className="rounded-full border border-stone-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-stone-800 disabled:opacity-50"
              >
                Mute This Browser
              </button>
            </div>
          </div>

          <RecipientStatusList recipients={alert.recipients} />
        </div>
      </div>
    </div>
  );
}
