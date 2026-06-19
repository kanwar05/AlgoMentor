import { CheckCircle2, CircleAlert, History } from "lucide-react";

export default function SyncHistoryCard({ history = [] }) {
  return (
    <section className="card">
      <div className="flex items-center gap-2"><History size={19} className="text-violet-500" /><p className="font-display text-lg font-bold">Sync history</p></div>
      <div className="mt-4 space-y-3">
        {history.slice(0, 6).map((item) => (
          <div key={item._id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[.03]">
            {item.status === "success" ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-500" /> : <CircleAlert size={17} className="mt-0.5 shrink-0 text-amber-500" />}
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2"><p className="text-sm font-bold">{item.platform}</p><span className="text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</span></div>
              <p className="mt-1 text-xs text-slate-500">{item.message || `${item.imported} imported · ${item.skipped} skipped`}</p>
            </div>
          </div>
        ))}
        {!history.length && <p className="py-6 text-center text-sm text-slate-400">Your sync activity will appear here.</p>}
      </div>
    </section>
  );
}
