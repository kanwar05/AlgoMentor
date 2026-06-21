import { ArrowDown, BookOpen, Clock3, GitBranch, Sparkles } from "lucide-react";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import Loader from "../components/Loader";
import PageHeader from "../components/PageHeader";
import { demoRoadmap } from "../data/demoData";
import { useRemoteData } from "../hooks/useRemoteData";

export default function RoadmapPage() {
  const { data, loading, error, refetch } = useRemoteData("/roadmap", demoRoadmap);
  const header = <PageHeader eyebrow="Dependency-aware learning" title="Your DSA roadmap" description="Weak topics come first, active practice follows, and untouched coverage gaps are introduced next." />;
  if (loading) return <>{header}<Loader /></>;
  if (error) return <>{header}<ErrorState message={error} onRetry={refetch} /></>;
  if (!data) return <>{header}<EmptyState title="No data available" description="Start solving problems to generate your learning roadmap." /></>;

  const path = data?.path || [];
  const focusTopics = data?.focusTopics || [];
  const focusDetails = data?.focusDetails || [];
  return (
    <>
      {header}
      <div className="grid gap-4 xl:grid-cols-[1.4fr_.6fr]">
        <div className="card">
          <div className="mb-6 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-400/10"><GitBranch size={20} /></span><div><p className="font-display text-lg font-bold">Recommended learning path</p><p className="text-xs text-slate-400">Generated using prerequisite graph traversal</p></div></div>
          <div className="relative mx-auto max-w-2xl">
            {path.map((step, index) => (
              <div key={step.topic}>
                <div className={`relative rounded-2xl border p-5 ${step.status === "focus" ? "border-violet-400 bg-violet-50 shadow-[0_10px_30px_rgba(127,104,232,.12)] dark:bg-violet-400/10" : "bg-white dark:bg-white/[.02]"}`}>
                  <div className="flex items-start gap-4"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display font-extrabold ${step.status === "focus" ? "bg-violet-500 text-white" : step.status === "start" ? "bg-lime-400 text-ink" : "bg-slate-100 text-slate-500 dark:bg-white/10"}`}>{step.order}</span><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-lg font-extrabold">{step.topic}</h3>{step.status === "focus" && <span className="rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Focus area</span>}</div><p className="mt-1.5 text-sm leading-6 text-slate-500">{step.description}</p><p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400"><Clock3 size={14} /> ~{step.estimatedHours} focused hours</p></div></div>
                </div>
                {index < path.length - 1 && <div className="grid h-10 place-items-center"><ArrowDown size={18} className="text-slate-300" /></div>}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="card bg-ink text-white"><Sparkles className="text-lime-400" /><p className="mt-5 font-display text-xl font-extrabold">Why this order?</p><p className="mt-3 text-sm leading-6 text-white/55">{data?.aiExplanation || "The path walks backward through prerequisites before moving forward through dependent concepts. That keeps advanced topics from becoming memorized tricks without a mental model underneath."}</p></div>
          <div className="card"><p className="font-display text-lg font-bold">Current focus</p><div className="mt-4 space-y-2">{focusTopics.length ? focusTopics.map((topic, index) => { const status = focusDetails.find((item) => item?.topic === topic)?.status; return <div key={topic} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[.04]"><span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-100 text-xs font-extrabold text-rose-600">{index + 1}</span><span className="text-sm font-bold">{topic}</span>{status && <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-slate-400">{status}</span>}</div>; }) : <p className="text-sm text-slate-500">Keep logging problems to personalize your focus.</p>}</div></div>
          <div className="card border-lime-400/50 bg-lime-400/15"><BookOpen size={20} /><p className="mt-3 font-bold">Roadmap rule</p><p className="mt-1 text-sm text-slate-500">Move ahead after solving at least 5 foundational problems with no more than one marked for revision.</p></div>
        </div>
      </div>
    </>
  );
}
