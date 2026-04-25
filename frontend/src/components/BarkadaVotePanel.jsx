import { useState } from "react";
import { motion } from "framer-motion";
import { createVote } from "../services/api";

const voteOptions = [
  { label: "Legit", value: "legit" },
  { label: "Fake", value: "fake" },
  { label: "Not Sure", value: "unsure" },
  { label: "Applies", value: "applies" },
  { label: "Does Not Apply", value: "not_applies" }
];

export default function BarkadaVotePanel({
  announcementId,
  groupId,
  defaultName = "",
  defaultEmail = "",
  onVote
}) {
  const [form, setForm] = useState({
    voter_name: defaultName,
    voter_email: defaultEmail
  });
  const [submitting, setSubmitting] = useState("");

  async function handleVote(voteType) {
    setSubmitting(voteType);
    try {
      await createVote({
        announcement_id: announcementId,
        group_id: groupId,
        voter_name: form.voter_name || "Anonymous Barkada",
        voter_email: form.voter_email || "anon@example.com",
        vote_type: voteType
      });
      onVote?.();
    } finally {
      setSubmitting("");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2rem] border border-stone-200 bg-white/88 p-6 shadow-glow"
    >
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Community check</p>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Vote only after reading the announcement. `Legit` checks source trust. `Applies` checks whether your barkada is actually covered.
        </p>
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        <input
          value={form.voter_name}
          onChange={(event) => setForm((current) => ({ ...current, voter_name: event.target.value }))}
          placeholder="Your name"
          className="flex-1 rounded-[1.3rem] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 outline-none transition focus:border-lime-300"
        />
        <input
          value={form.voter_email}
          onChange={(event) => setForm((current) => ({ ...current, voter_email: event.target.value }))}
          placeholder="Your email"
          className="flex-1 rounded-[1.3rem] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 outline-none transition focus:border-lime-300"
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {voteOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleVote(option.value)}
            disabled={Boolean(submitting)}
            className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:border-lime-300 hover:bg-lime-100 disabled:opacity-50"
          >
            {submitting === option.value ? "Sending..." : option.label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-stone-500">
        Barkada meter works best when the circle votes honestly, not just because everyone wants more tulog.
      </p>
    </motion.div>
  );
}
