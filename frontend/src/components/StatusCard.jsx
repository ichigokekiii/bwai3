import { motion } from "framer-motion";

export default function StatusCard({ title, value, hint, tone = "default", children }) {
  const tones = {
    default: "border-stone-200 bg-white/88",
    warning: "border-amber-200 bg-amber-50/90",
    success: "border-emerald-200 bg-emerald-50/90",
    danger: "border-rose-200 bg-rose-50/90"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-[2rem] border p-6 shadow-glow backdrop-blur ${tones[tone] || tones.default}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">{title}</p>
      <p className="mt-3 font-display text-[2.1rem] leading-none text-stone-900">{value}</p>
      {hint ? <p className="mt-3 max-w-md text-sm leading-6 text-stone-600">{hint}</p> : null}
      {children}
    </motion.div>
  );
}
