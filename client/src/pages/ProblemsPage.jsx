import { ChevronLeft, ChevronRight, CloudDownload, Edit3, ExternalLink, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import PageHeader from "../components/PageHeader";
import StatusPill from "../components/StatusPill";
import { useAuth } from "../context/AuthContext";
import { demoProblems } from "../data/demoData";

export default function ProblemsPage() {
  const { demoMode } = useAuth();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  useEffect(() => {
    if (demoMode) {
      const filtered = demoProblems.filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase()) &&
        (!difficulty || item.difficulty === difficulty)
      );
      setProblems(filtered);
      setPagination({ total: filtered.length, pages: 1 });
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      api.get("/problems", { params: { search, difficulty, page, limit: 50 } })
        .then((res) => {
          setProblems(res.data.problems);
          setPagination(res.data.pagination);
        })
        .catch((err) => setError(err.response?.data?.message || "Could not load solved problems"))
        .finally(() => setLoading(false));
    }, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [demoMode, search, difficulty, page]);

  useEffect(() => { setPage(1); }, [search, difficulty]);

  const remove = async (id) => {
    if (!window.confirm("Remove this problem from your tracker?")) return;
    if (!demoMode) await api.delete(`/problems/${id}`);
    setProblems((items) => items.filter((item) => item._id !== id));
    setPagination((current) => ({ ...current, total: Math.max(current.total - 1, 0) }));
  };
  if (loading) return <LoadingState />;
  return (
    <>
      <PageHeader eyebrow="Practice library" title="Solved problems" description={`${pagination.total} manual and synced problems are shaping your personal roadmap.`} action={<Link to="/app/problems/new" className="btn-primary"><Plus size={17} /> Add problem</Link>} />
      <div className="card mb-4 flex flex-col gap-3 p-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input className="input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by problem title…" /></div>
        <select className="input sm:w-44" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="">All difficulties</option><option>Easy</option><option>Medium</option><option>Hard</option></select>
      </div>
      {error && <p className="card mb-4 text-rose-500">{error}</p>}
      {!problems.length ? <EmptyState title={pagination.total ? "No matching problems" : undefined} description={pagination.total ? "Try a different search or difficulty filter." : undefined} /> : <div className="card overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="border-b bg-slate-50 text-xs uppercase tracking-wider text-slate-400 dark:bg-white/[.03]"><tr><th className="px-5 py-4">Problem</th><th className="px-5 py-4">Difficulty</th><th className="px-5 py-4">Topics</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Solved</th><th className="px-5 py-4" /></tr></thead><tbody>{problems.map((problem) => <tr key={`${problem.source || "manual"}-${problem._id}`} className="border-b last:border-0 hover:bg-slate-50/70 dark:hover:bg-white/[.02]"><td className="px-5 py-4"><p className="font-bold">{problem.title}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">{problem.platform}{problem.source === "synced" && <><span>·</span><CloudDownload size={12} /> Synced</>}</p></td><td className="px-5 py-4"><StatusPill>{problem.difficulty}</StatusPill></td><td className="px-5 py-4"><div className="flex max-w-xs flex-wrap gap-1.5">{problem.topics.map((topic) => <StatusPill key={topic}>{topic}</StatusPill>)}</div></td><td className="px-5 py-4"><StatusPill>{problem.status}</StatusPill></td><td className="px-5 py-4 text-sm text-slate-500">{problem.solvedDate ? new Date(problem.solvedDate).toLocaleDateString() : <span className="text-amber-600">Date unavailable</span>}</td><td className="px-5 py-4"><div className="flex justify-end gap-1">{problem.link && <a href={problem.link} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-violet-500"><ExternalLink size={16} /></a>}{problem.editable !== false && <><Link to={`/app/problems/${problem._id}/edit`} state={{ problem }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-violet-500"><Edit3 size={16} /></Link><button onClick={() => remove(problem._id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={16} /></button></>}</div></td></tr>)}</tbody></table></div></div>}
      {pagination.pages > 1 && <div className="mt-4 flex items-center justify-between"><p className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages}</p><div className="flex gap-2"><button className="btn-secondary" onClick={() => setPage((current) => current - 1)} disabled={page <= 1}><ChevronLeft size={16} /> Previous</button><button className="btn-secondary" onClick={() => setPage((current) => current + 1)} disabled={page >= pagination.pages}>Next <ChevronRight size={16} /></button></div></div>}
    </>
  );
}
