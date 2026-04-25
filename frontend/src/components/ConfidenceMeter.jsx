import { motion } from "framer-motion";

export default function ConfidenceMeter({ value = 0, label = "AI Confidence" }) {
  const tone =
    value >= 80 ? "from-lime-300 via-lime-200 to-emerald-300" : value >= 60 ? "from-amber-200 via-yellow-200 to-lime-200" : "from-rose-200 via-orange-200 to-amber-200";

  return (
    <div className="rounded-[2rem] border border-stone-200 bg-white/88 p-6 shadow-glow">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">{label}</p>
          <p className="mt-2 font-display text-5xl leading-none text-stone-900">{value}%</p>
        </div>
        <p className="max-w-[13rem] text-right text-sm leading-6 text-stone-600">
          {value >= 80 ? "High confidence. Clear enough to escalate." : value >= 60 ? "Moderate confidence. Review the source and scope." : "Low confidence. Ask for human confirmation first."}
        </p>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-stone-200">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full bg-gradient-to-r ${tone}`}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-500">
        <span className="rounded-full bg-stone-100 px-3 py-1">0-59 Check manually</span>
        <span className="rounded-full bg-stone-100 px-3 py-1">60-79 Use caution</span>
        <span className="rounded-full bg-stone-100 px-3 py-1">80-100 Safe to act faster</span>
      </div>
    </div>
  );
}
