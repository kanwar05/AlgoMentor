import { CalendarDays, CheckCircle2, Clock3, Gauge, Sparkles } from "lucide-react";
import { useState } from "react";
import LoadingState from "../components/LoadingState";
import PageHeader from "../components/PageHeader";
import StatusPill from "../components/StatusPill";
import { demoRevisionPlan } from "../data/demoData";
import { useRemoteData } from "../hooks/useRemoteData";

export default function RevisionPlanPage() {
  const { data, loading } = useRemoteData("/revision-plan", demoRevisionPlan);
  const [done, setDone] = useState(new Set());
  if (loading) return <LoadingState />;
  const toggle = (id) => setDone((previous) => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const total = data.days.reduce((sum, day) => sum + day.tasks.length, 0);
  return (
    <>
      <PageHeader eyebrow="Priority revision sprint" title="Your next 7 days" description="A focused schedule weighted toward weak topics, medium problems, revision status, and time since last practice." />
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <div className="card flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-400/10"><CalendarDays /></span><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Sprint length</p><p className="font-display text-2xl font-extrabold">7 days</p></div></div>
        <div className="card flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-400/25 text-lime-700"><Gauge /></span><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total reps</p><p className="font-display text-2xl font-extrabold">{total} problems</p></div></div>
        <div className="card flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-400/10"><Clock3 /></span><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Estimated time</p><p className="font-display text-2xl font-extrabold">{Math.round(total * .6)} hours</p></div></div>
      </div>
      <div className="space-y-3">
        {data.days.map((day) => <div key={day.day} className="card p-0"><div className="grid md:grid-cols-[180px_1fr]"><div className={`border-b p-5 md:border-b-0 md:border-r ${day.day === 1 ? "bg-violet-500 text-white" : "bg-slate-50 dark:bg-white/[.03]"}`}><p className={`text-xs font-bold uppercase tracking-wider ${day.day === 1 ? "text-white/60" : "text-slate-400"}`}>Day {day.day}</p><p className="mt-1 font-display text-lg font-extrabold">{new Date(`${day.date}T12:00:00`).toLocaleDateString("en", { weekday: "long" })}</p><p className={`mt-3 text-xs ${day.day === 1 ? "text-white/60" : "text-slate-400"}`}>{day.theme}</p></div><div className="divide-y">{day.tasks.length ? day.tasks.map((task) => <label key={task.id} className="flex cursor-pointer items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-white/[.02]"><button type="button" onClick={() => toggle(task.id)} className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${done.has(task.id) ? "border-lime-400 bg-lime-400 text-ink" : ""}`}>{done.has(task.id) && <CheckCircle2 size={17} />}</button><div className={`min-w-0 flex-1 ${done.has(task.id) ? "opacity-45" : ""}`}><p className="truncate text-sm font-bold">{task.title}</p><p className="mt-1 truncate text-xs text-slate-400">{task.topics.join(" · ")}</p></div><StatusPill>{task.difficulty}</StatusPill><span className="hidden text-xs font-semibold text-slate-400 sm:block">P{task.priority}</span></label>) : <p className="p-6 text-sm text-slate-400">Concept review and flashcards — no logged problem available yet.</p>}</div></div></div>)}
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-violet-400/30 bg-violet-400/10 p-4 text-sm"><Sparkles size={18} className="mt-0.5 shrink-0 text-violet-500" /><p><strong>Scheduling strategy:</strong> {data.strategy}. The binary max-heap makes the highest-value revision the next item selected.</p></div>
    </>
  );
}
