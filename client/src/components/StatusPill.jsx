const styles = {
  Easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
  Hard: "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
  Solved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  Revision: "bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300",
  Weak: "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"
};

export default function StatusPill({ children }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[children] || "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>{children}</span>;
}
