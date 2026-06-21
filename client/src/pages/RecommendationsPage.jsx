import { ArrowUpRight, Building2, Filter, Sparkles, Target } from "lucide-react";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import Loader from "../components/Loader";
import PageHeader from "../components/PageHeader";
import StatusPill from "../components/StatusPill";
import { demoRecommendations } from "../data/demoData";
import { useRemoteData } from "../hooks/useRemoteData";

export default function RecommendationsPage() {
  const demo = { targetCompany: "Google", recommendations: demoRecommendations };
  const { data, loading, error, refetch } = useRemoteData("/recommendations", demo);
  const header = <PageHeader eyebrow="Curated next moves" title="Recommended problems" description="Unsolved questions ranked by weak-topic match, target-company relevance, and a healthy difficulty balance." />;
  if (loading) return <>{header}<Loader /></>;
  if (error) return <>{header}<ErrorState message={error} onRetry={refetch} /></>;
  if (!data) return <>{header}<EmptyState title="No data available" description="Start solving problems to generate recommendations." /></>;

  const targetCompany = data?.targetCompany || "your target company";
  const recommendations = data?.recommendations || [];
  return (
    <>
      <PageHeader eyebrow="Curated next moves" title="Recommended problems" description="Unsolved questions ranked by weak-topic match, target-company relevance, and a healthy difficulty balance." action={<div className="btn-secondary cursor-default"><Building2 size={16} /> {targetCompany} track</div>} />
      <div className="mb-5 rounded-3xl bg-ink p-6 text-white md:flex md:items-center md:justify-between">
        <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime-400 text-ink"><Target /></span><div><p className="font-display text-xl font-extrabold">Your recommendation strategy</p><p className="mt-1 max-w-2xl text-sm text-white/50">Medium questions get a deliberate boost; weak-topic overlap and {targetCompany} relevance raise priority further. Already-solved titles are excluded.</p></div></div>
        <div className="mt-5 flex gap-2 md:mt-0"><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">{recommendations.length} matches</span><span className="rounded-full bg-violet-400 px-3 py-1.5 text-xs font-bold text-ink"><Filter size={12} className="mr-1 inline" /> Personalized</span></div>
      </div>
      {recommendations.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {recommendations.map((problem, index) => <article key={problem?.title || index} className="card group flex flex-col hover:-translate-y-1 hover:shadow-soft"><div className="flex items-start justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 font-display text-sm font-extrabold text-slate-500 dark:bg-white/10">{String(index + 1).padStart(2, "0")}</span><StatusPill>{problem?.difficulty || "Unknown"}</StatusPill></div><h2 className="mt-5 font-display text-lg font-extrabold leading-snug">{problem?.title || "Untitled problem"}</h2><p className="mt-1 text-xs text-slate-400">{problem?.platform || "Unknown platform"}</p><div className="mt-4 flex flex-wrap gap-1.5">{(problem?.topics || []).map((topic) => <StatusPill key={topic}>{topic}</StatusPill>)}</div><div className="mt-5 flex items-start gap-2 rounded-xl bg-violet-50 p-3 text-xs leading-5 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300"><Sparkles size={15} className="mt-0.5 shrink-0" />{problem?.reason || "Recommended from your current practice profile."}</div><div className="mt-auto flex items-center justify-between pt-5"><span className="text-xs font-semibold text-slate-400">{problem?.companies?.slice(0, 2).join(" · ")}</span>{problem?.link && <a href={problem.link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-bold text-violet-500">Solve now <ArrowUpRight size={16} /></a>}</div></article>)}
      </div> : <EmptyState title="No recommendations yet" description="Solve a few problems so AlgoMentor can identify the best next steps." />}
    </>
  );
}
