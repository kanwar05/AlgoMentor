import { ChevronLeft, ChevronRight, CloudDownload, Edit3, ExternalLink, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import Loader from "../components/Loader";
import PageHeader from "../components/PageHeader";
import StatusPill from "../components/StatusPill";
import { useAuth } from "../context/AuthContext";
import { demoProblems } from "../data/demoData";

export default function ProblemsPage() {
  const { demoMode } = useAuth();
  const [searchParams] = useSearchParams();
  const topic = searchParams.get("topic") || "";
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const loadProblems = useCallback(async () => {
    if (demoMode) {
      const filtered = demoProblems.filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase()) &&
        (!difficulty || item.difficulty === difficulty) &&
        (!topic || item.topics.includes(topic))
      );
      setProblems(filtered);
      setPagination({ total: filtered.length, pages: 1 });
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/problems", { params: { search, difficulty, topic, page, limit: 50 } });
      setProblems(response?.data?.problems || []);
      setPagination(response?.data?.pagination || { total: 0, page: 1, pages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not load solved problems");
      setProblems([]);
      setPagination({ total: 0, page: 1, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [demoMode, search, difficulty, topic, page]);

  useEffect(() => {
    const timer = window.setTimeout(loadProblems, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadProblems, search]);

  useEffect(() => { setPage(1); }, [search, difficulty, topic]);

  const remove = async (id) => {
    if (!window.confirm("Remove this problem from your tracker?")) return;
    setError(null);
    try {
      if (!demoMode) await api.delete(`/problems/${id}`);
      setProblems((items) => items.filter((item) => item._id !== id));
      setPagination((current) => ({ ...current, total: Math.max((current?.total || 0) - 1, 0) }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not remove the problem");
    }
  };
  const header = <PageHeader eyebrow="Practice library" title="Solved problems" description={`${pagination?.total || 0} manual and synced problems are shaping your personal roadmap.`} action={<Link to="/app/problems/new" className="btn-primary"><Plus size={17} /> Add problem</Link>} />;
  if (loading) return <>{header}<Loader message="Loading solved problems…" /></>;
  if (error) return <>{header}<ErrorState message={error} onRetry={loadProblems} /></>;
  return (
    <>
      {header}
      <div className="card mb-4 flex flex-col gap-3 p-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input className="input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by problem title…" /></div>
        <select className="input sm:w-44" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="">All difficulties</option><option>Easy</option><option>Medium</option><option>Hard</option></select>
      </div>
      {topic && <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">Filtered by <span className="rounded-full bg-violet-100 px-3 py-1 font-bold text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">{topic}</span><Link to="/app/problems" className="font-semibold text-violet-500">Clear</Link></div>}
      {!problems.length ? <EmptyState title={pagination?.total ? "No matching problems" : undefined} description={pagination?.total ? "Try a different search or difficulty filter." : undefined} /> : <div className="card overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="border-b bg-slate-50 text-xs uppercase tracking-wider text-slate-400 dark:bg-white/[.03]"><tr><th className="px-5 py-4">Problem</th><th className="px-5 py-4">Difficulty</th><th className="px-5 py-4">Topics</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Solved</th><th className="px-5 py-4" /></tr></thead><tbody>{problems.map((problem, index) => <tr key={`${problem?.source || "manual"}-${problem?._id || index}`} className="border-b last:border-0 hover:bg-slate-50/70 dark:hover:bg-white/[.02]"><td className="px-5 py-4"><p className="font-bold">{problem?.title || "Untitled problem"}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">{problem?.platform || "Unknown"}{problem?.source === "synced" && <><span>·</span><CloudDownload size={12} /> Synced</>}</p></td><td className="px-5 py-4"><StatusPill>{problem?.difficulty || "Unknown"}</StatusPill></td><td className="px-5 py-4"><div className="flex max-w-xs flex-wrap gap-1.5">{(problem?.topics || []).map((topic) => <StatusPill key={topic}>{topic}</StatusPill>)}</div></td><td className="px-5 py-4"><StatusPill>{problem?.status || "Solved"}</StatusPill></td><td className="px-5 py-4 text-sm text-slate-500">{problem?.solvedDate ? new Date(problem.solvedDate).toLocaleDateString() : <span className="text-amber-600">Date unavailable</span>}</td><td className="px-5 py-4"><div className="flex justify-end gap-1">{problem?.link && <a aria-label={`Open ${problem.title || "problem"} externally`} href={problem.link} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-violet-500"><ExternalLink size={16} /></a>}{problem?.editable !== false && problem?._id && <><Link aria-label={`Edit ${problem.title || "problem"}`} to={`/app/problems/${problem._id}/edit`} state={{ problem }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-violet-500"><Edit3 size={16} /></Link><button aria-label={`Delete ${problem.title || "problem"}`} onClick={() => remove(problem._id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={16} /></button></>}</div></td></tr>)}</tbody></table></div></div>}
      {(pagination?.pages || 1) > 1 && <div className="mt-4 flex items-center justify-between"><p className="text-sm text-slate-500">Page {pagination?.page || page} of {pagination?.pages || 1}</p><div className="flex gap-2"><button className="btn-secondary" onClick={() => setPage((current) => current - 1)} disabled={page <= 1}><ChevronLeft size={16} /> Previous</button><button className="btn-secondary" onClick={() => setPage((current) => current + 1)} disabled={page >= (pagination?.pages || 1)}>Next <ChevronRight size={16} /></button></div></div>}
    </>
  );
}
