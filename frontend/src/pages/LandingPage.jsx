import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function LandingPage({ user, userState }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-stone-200 bg-white p-8 shadow-card"
        >
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-stone-500">Main workflow</p>
          <h1 className="mt-4 font-display text-6xl leading-[0.95] text-stone-900">
            One place to set up. One place to run the AI check.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
            This app is now simplified into two actions only so the AI flow is obvious and easy to demo.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Link
              to="/setup"
              className="rounded-3xl border border-stone-200 bg-stone-50 p-6 transition hover:border-stone-400"
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">Button 1</p>
              <h2 className="mt-3 font-display text-4xl text-stone-900">Setup Profile & Group</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                Create the student profile, create the barkada group, and add the email recipients there.
              </p>
            </Link>

            <Link
              to="/panic-check"
              className="rounded-3xl border border-lime-300 bg-lime-200 p-6 transition hover:bg-lime-300"
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-700">Button 2</p>
              <h2 className="mt-3 font-display text-4xl text-stone-900">Run Panic Check</h2>
              <p className="mt-3 text-sm leading-7 text-stone-700">
                Upload the photo, review the AI result, vote if needed, then alert everybody.
              </p>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl border border-stone-200 bg-white p-8 shadow-card"
        >
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-stone-500">Current status</p>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Profile</p>
              <p className="mt-2 text-base text-stone-800">
                {userState === "loading"
                  ? "Checking if a profile already exists..."
                  : user
                    ? `${user.full_name} • ${user.school_name} • ${user.city}`
                    : "No profile yet. Start with Setup Profile & Group."}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">AI flow legend</p>
              <ul className="mt-2 space-y-2 text-sm leading-7 text-stone-600">
                <li>1. Upload or paste the announcement</li>
                <li>2. AI checks if it is class suspension and if it applies</li>
                <li>3. Vote if needed</li>
                <li>4. Alert everybody in the group</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
