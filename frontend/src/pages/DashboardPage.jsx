import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AlertLevelBadge from "../components/AlertLevelBadge";
import ConfidenceMeter from "../components/ConfidenceMeter";
import StatusCard from "../components/StatusCard";
import { getUserAlerts, getUserAnnouncements, getUserGroups } from "../services/api";

export default function DashboardPage({ user }) {
  const [groups, setGroups] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!user?.id) return;

    async function load() {
      const [groupData, announcementData, alertData] = await Promise.all([
        getUserGroups(user.id),
        getUserAnnouncements(user.id),
        getUserAlerts(user.id)
      ]);

      setGroups(groupData);
      setAnnouncements(announcementData.slice(0, 4));
      setAlerts(alertData.slice(0, 3));
    }

    load();
  }, [user?.id]);

  const activeAlert = alerts.find((alert) => alert.status === "active") || alerts[0];
  const latestAnnouncement = announcements[0];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 md:px-6">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2.5rem] border border-white/80 bg-white/88 p-8 shadow-card"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">Student Control Panel</p>
          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-6xl leading-[0.95] text-stone-900">
                Good morning, {user?.full_name || "sleepy scholar"}.
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600">
                Your profile is tuned for <span className="font-semibold text-stone-900">{user?.school_name}</span> in{" "}
                <span className="font-semibold text-stone-900">{user?.city}</span>. Use the analyzer when a class suspension post feels unclear, late, or suspicious.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/analyze" className="rounded-full bg-stone-900 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white">
                Analyze Now
              </Link>
              <Link to="/profile" className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-stone-800">
                Edit Profile
              </Link>
            </div>
          </div>
        </motion.div>

        <StatusCard
          title="Live Alert Status"
          value={activeAlert ? `Alert #${activeAlert.id}` : "No active alert"}
          hint={
            activeAlert
              ? "Primary action: open the alert room if you need to acknowledge, stop the alarm, or review barkada responses."
              : "No urgent alert is running. You can analyze a new announcement anytime."
          }
          tone={activeAlert?.status === "active" ? "danger" : "success"}
        >
          {activeAlert ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <AlertLevelBadge level={activeAlert.alert_level} />
              <Link
                to={`/alerts/${activeAlert.id}`}
                className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Open Alert Room
              </Link>
            </div>
          ) : null}
        </StatusCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <StatusCard
          title="Profile Legend"
          value={user?.education_level?.replaceAll("_", " ") || "No profile"}
          hint={`Section: ${user?.section_or_group || "None"} • Email: ${user?.email || "Not set"}`}
        />
        <StatusCard
          title="Barkada Legend"
          value={groups[0]?.group_name || "No barkada circle yet"}
          hint={groups[0] ? `${groups[0].member_count} member(s) can receive opt-in alerts.` : "Create a circle so trusted contacts can help confirm the announcement."}
          tone="warning"
        />
        <StatusCard
          title="Latest Result"
          value={latestAnnouncement?.alert_level || "No analysis yet"}
          hint={latestAnnouncement?.summary_for_student || "Run an analysis to see a readable confidence summary here."}
          tone={latestAnnouncement?.confidence_score >= 80 ? "success" : "default"}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <ConfidenceMeter value={latestAnnouncement?.confidence_score || 0} label="Latest AI Confidence" />

        <div className="rounded-[2.5rem] border border-white/80 bg-white/88 p-6 shadow-card">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Recent announcements</p>
              <h2 className="mt-2 font-display text-4xl text-stone-900">Readable timeline for quick review</h2>
            </div>
            <Link to="/analyze" className="rounded-full bg-lime-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-stone-900">
              New Check
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="rounded-[1.8rem] border border-stone-200 bg-stone-50/90 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                      Source legend
                    </p>
                    <p className="mt-2 text-sm text-stone-500">{announcement.source_name || "Unknown source"}</p>
                    <p className="mt-3 text-base leading-7 text-stone-800">{announcement.announcement_text}</p>
                  </div>
                  <div className="space-y-2">
                    <AlertLevelBadge level={announcement.alert_level || "none"} />
                    <p className="text-sm text-stone-500">Confidence {announcement.confidence_score || 0}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
