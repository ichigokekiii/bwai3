const styles = {
  none: "border-stone-300 bg-white/80 text-stone-700",
  chill: "border-sky-200 bg-sky-50 text-sky-700",
  normal: "border-amber-200 bg-amber-50 text-amber-800",
  panic: "border-rose-200 bg-rose-50 text-rose-700"
};

export default function AlertLevelBadge({ level = "none" }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] ${styles[level] || styles.none}`}>
      {level}
    </span>
  );
}
