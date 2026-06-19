import { Check, Link2 } from "lucide-react";

export default function PlatformConnectCard({ platform, value, onChange, onSave, saving, placeholder, connected }) {
  return (
    <section className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-lg font-bold">{platform}</p>
          <p className="mt-1 text-xs text-slate-400">Connect your public profile handle.</p>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${connected ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/10" : "bg-slate-100 text-slate-400 dark:bg-white/5"}`}>
          {connected ? <Check size={19} /> : <Link2 size={19} />}
        </span>
      </div>
      <label className="label mt-5">{platform} {platform === "LeetCode" ? "username" : "handle"}</label>
      <div className="flex gap-2">
        <input className="input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
        <button className="btn-secondary shrink-0" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </section>
  );
}
