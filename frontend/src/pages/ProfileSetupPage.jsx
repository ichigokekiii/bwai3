import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  createUser,
  updateUser
} from "../services/api";

const educationLevels = [
  { value: "elementary", label: "Elementary" },
  { value: "junior_high", label: "Junior High" },
  { value: "senior_high", label: "Senior High" },
  { value: "college", label: "College" },
  { value: "all_levels", label: "All Levels" }
];

const alertIntensities = [
  { value: "chill", label: "Chill" },
  { value: "normal", label: "Normal" },
  { value: "panic", label: "Panic" }
];

const panicPersonalities = [
  { value: "calm_classmate", label: "Calm Classmate" },
  { value: "oa_barkada", label: "OA Barkada" },
  { value: "strict_registrar", label: "Strict Registrar" },
  { value: "tita_mode", label: "Tita Mode" }
];

const defaultProfile = {
  full_name: "",
  email: "",
  school_name: "",
  city: "",
  education_level: "college",
  section_or_group: "",
  alert_intensity: "normal",
  panic_personality: "oa_barkada"
};

export default function ProfileSetupPage({ user, onUserUpdated }) {
  const [profile, setProfile] = useState(defaultProfile);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setProfile(user || defaultProfile);
  }, [user]);

  async function handleSaveProfile(event) {
    event.preventDefault();
    setStatus("Saving profile...");

    try {
      const saved = user?.id
        ? await updateUser(user.id, profile)
        : await createUser(profile);
      onUserUpdated(saved);
      setStatus(`Profile saved to database as user #${saved.id}.`);
    } catch (error) {
      console.error(error);
      setStatus(error.response?.data?.message || error.message || "Could not save profile.");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSaveProfile}
          className="rounded-3xl border border-stone-200 bg-white p-8 shadow-card"
        >
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-stone-500">Setup profile</p>
          <h1 className="mt-4 font-display text-5xl leading-none text-stone-900">
            Create the student profile first.
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            Save this first so the AI knows who the announcement applies to. After this, you can move to the separate barkada page to create the group and add recipients.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["full_name", "Full name"],
              ["email", "Email"],
              ["school_name", "School name"],
              ["city", "City"],
              ["section_or_group", "Section or group"]
            ].map(([key, label]) => (
              <label key={key} className="text-sm text-stone-700">
                <span className="mb-2 block font-semibold">{label}</span>
                <input
                  value={profile[key] || ""}
                  onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none focus:border-lime-300"
                />
              </label>
            ))}

            <label className="text-sm text-stone-700">
              <span className="mb-2 block font-semibold">Education level</span>
              <select
                value={profile.education_level || "college"}
                onChange={(event) => setProfile((current) => ({ ...current, education_level: event.target.value }))}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none focus:border-lime-300"
              >
                {educationLevels.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-stone-700">
              <span className="mb-2 block font-semibold">Alert intensity</span>
              <select
                value={profile.alert_intensity || "normal"}
                onChange={(event) => setProfile((current) => ({ ...current, alert_intensity: event.target.value }))}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none focus:border-lime-300"
              >
                {alertIntensities.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-stone-700 md:col-span-2">
              <span className="mb-2 block font-semibold">Panic personality</span>
              <select
                value={profile.panic_personality || "oa_barkada"}
                onChange={(event) => setProfile((current) => ({ ...current, panic_personality: event.target.value }))}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none focus:border-lime-300"
              >
                {panicPersonalities.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button className="mt-8 rounded-xl bg-stone-900 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white">
            Save Profile
          </button>

          {status ? <p className="mt-6 text-sm font-semibold text-stone-700">{status}</p> : null}
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl border border-stone-200 bg-white p-8 shadow-card"
        >
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-stone-500">Next step</p>
          <h2 className="mt-4 font-display text-5xl leading-none text-stone-900">
            Manage your barkada on its own page.
          </h2>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            Keeping this separate makes the flow easier: first save the profile, then create the group and add only people who agreed to receive alerts.
          </p>

          <div className="mt-8 rounded-2xl border border-lime-300 bg-lime-100 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-600">Recommended order</p>
            <ol className="mt-4 space-y-3 text-sm leading-7 text-stone-700">
              <li>1. Save or update your student profile here.</li>
              <li>2. Open the barkada page and create your alert circle.</li>
              <li>3. Add opted-in recipients before running the panic check.</li>
            </ol>
          </div>

          <Link
            to="/barkada"
            className="mt-8 inline-flex rounded-xl bg-lime-300 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-stone-900"
          >
            Go to Barkada Page
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
