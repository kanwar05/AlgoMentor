import { Clock3, RefreshCw } from "lucide-react";

const formatTime = (value) => value
  ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
  : "Never synced";

export default function SyncStatusCard({ platform, count = 0, lastSync, onSync, loading, disabled, warning }) {
  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{platform}</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{count}</p>
          <p className="text-xs text-slate-400">unique solved problems</p>
        </div>
        <button className="btn-primary" onClick={onSync} disabled={loading || disabled}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {loading ? "Syncing…" : "Sync"}
        </button>
      </div>
      <p className="mt-4 flex items-center gap-2 border-t pt-4 text-xs text-slate-400"><Clock3 size={14} /> {formatTime(lastSync)}</p>
      {warning && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">{warning}</p>}
    </section>
  );
}
