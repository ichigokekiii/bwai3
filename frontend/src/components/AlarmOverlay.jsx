import { AnimatePresence, motion } from "framer-motion";

export default function AlarmOverlay({ active, title, subtitle, actions }) {
  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-rose-500/8 backdrop-blur-[2px]"
        >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: [0.96, 1.02, 0.98] }}
          transition={{ repeat: Infinity, duration: 1.1 }}
            className="max-w-2xl rounded-[2rem] border border-rose-200 bg-white/95 px-8 py-6 text-center shadow-[0_0_80px_rgba(244,63,94,0.15)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-rose-500">Panic Mode Armed</p>
            <h2 className="mt-3 font-display text-4xl text-stone-900">{title}</h2>
            <p className="mt-2 text-sm text-stone-600">{subtitle}</p>
            {actions ? <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
