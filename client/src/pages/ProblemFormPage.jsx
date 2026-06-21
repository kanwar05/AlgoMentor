import { ArrowLeft, Check, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import ErrorState from "../components/ErrorState";
import Loader from "../components/Loader";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";

const topics = ["Array", "String", "Hashing", "Two Pointers", "Sliding Window", "Binary Search", "Linked List", "Stack", "Queue", "Recursion", "Backtracking", "Tree", "BST", "Heap", "Graph", "BFS/DFS", "Dijkstra", "MST", "Dynamic Programming", "Greedy", "Bit Manipulation"];
const emptyForm = () => ({
  title: "",
  platform: "LeetCode",
  difficulty: "Medium",
  topics: [],
  status: "Solved",
  confidence: "",
  link: "",
  solvedDate: new Date().toISOString().slice(0, 10),
  notes: ""
});

export default function ProblemFormPage() {
  const { id } = useParams();
  const existing = useLocation().state?.problem;
  const { demoMode } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(id && !existing));
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState({ ...emptyForm(), ...(existing || {}) });

  const loadProblem = useCallback(async () => {
    if (!id || existing) return;
    setLoading(true);
    setLoadError(null);
    try {
      const response = await api.get(`/problems/${id}`);
      const problem = response?.data?.problem || response?.data;
      if (!problem?._id) throw new Error("Problem data was not returned");
      setForm({ ...emptyForm(), ...problem });
    } catch (err) {
      setLoadError(err.response?.data?.message || err.message || "Could not load the problem");
    } finally {
      setLoading(false);
    }
  }, [existing, id]);

  useEffect(() => {
    loadProblem();
  }, [loadProblem]);

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const toggleTopic = (topic) => {
    const selectedTopics = form?.topics || [];
    setForm({ ...form, topics: selectedTopics.includes(topic) ? selectedTopics.filter((item) => item !== topic) : [...selectedTopics, topic] });
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!form?.topics?.length) { setError("Select at least one topic."); return; }
    setError(null);
    setSaving(true);
    try {
      if (!demoMode) await (id ? api.put(`/problems/${id}`, form) : api.post("/problems", form));
      navigate("/app/problems");
    } catch (err) { setError(err.response?.data?.message || err.message || "Could not save the problem."); }
    finally { setSaving(false); }
  };
  const header = <PageHeader eyebrow={id ? "Update practice log" : "Capture a win"} title={id ? "Edit problem" : "Add solved problem"} description="Accurate metadata gives your mentor engine a stronger signal." action={<Link to="/app/problems" className="btn-secondary"><ArrowLeft size={16} /> Back</Link>} />;
  if (loading) return <>{header}<Loader message="Loading problem…" /></>;
  if (loadError) return <>{header}<ErrorState title="Could not load problem" message={loadError} onRetry={loadProblem} /><div className="mt-4 text-center"><Link to="/app/problems" className="btn-secondary"><ArrowLeft size={16} /> Back to problems</Link></div></>;

  return (
    <>
      {header}
      <form onSubmit={submit} className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
        <div className="card space-y-5">
          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
          <div><label className="label" htmlFor="problem-title">Problem title</label><input id="problem-title" name="title" className="input" value={form.title} onChange={update} placeholder="e.g. Longest Substring Without Repeating Characters" required /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="problem-platform">Platform</label><select id="problem-platform" name="platform" className="input" value={form.platform} onChange={update}>{["LeetCode", "GeeksforGeeks", "Codeforces", "HackerRank", "InterviewBit", "Other"].map((p) => <option key={p}>{p}</option>)}</select></div><div><label className="label" htmlFor="problem-difficulty">Difficulty</label><select id="problem-difficulty" name="difficulty" className="input" value={form.difficulty} onChange={update}><option>Easy</option><option>Medium</option><option>Hard</option></select></div></div>
          <div><label className="label">Topics</label><div className="flex flex-wrap gap-2">{topics.map((topic) => <button type="button" key={topic} onClick={() => toggleTopic(topic)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${(form?.topics || []).includes(topic) ? "border-violet-500 bg-violet-500 text-white" : "bg-white text-slate-500 dark:bg-white/5"}`}>{(form?.topics || []).includes(topic) && <Check size={12} className="mr-1 inline" />}{topic}</button>)}</div></div>
          <div><label className="label" htmlFor="problem-link">Problem link</label><input id="problem-link" type="url" name="link" className="input" value={form.link} onChange={update} placeholder="https://leetcode.com/problems/…" /></div>
          <div><label className="label" htmlFor="problem-notes">Notes (optional)</label><textarea id="problem-notes" name="notes" className="input min-h-28 resize-y" value={form.notes} onChange={update} placeholder="Key insight, complexity, or mistake to revisit…" /></div>
        </div>
        <div className="space-y-4">
          <div className="card space-y-5"><div><label className="label">Learning status</label><div className="space-y-2">{["Solved", "Revision", "Weak"].map((status) => <label key={status} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${form.status === status ? "border-violet-400 bg-violet-50 dark:bg-violet-400/10" : ""}`}><input type="radio" name="status" value={status} checked={form.status === status} onChange={update} /><div><p className="text-sm font-bold">{status}</p><p className="text-xs text-slate-400">{status === "Solved" ? "Comfortable with the approach" : status === "Revision" ? "Understood, but needs another pass" : "Could not solve independently"}</p></div></label>)}</div></div><div><label className="label" htmlFor="problem-confidence">Confidence (optional)</label><input id="problem-confidence" type="number" name="confidence" className="input" min="0" max="100" value={form.confidence ?? ""} onChange={update} placeholder="0–100" /><p className="mt-1.5 text-xs text-slate-400">Used as a supporting signal in topic strength.</p></div><div><label className="label" htmlFor="problem-solved-date">Solved date</label><input id="problem-solved-date" type="date" name="solvedDate" className="input" value={form.solvedDate?.slice(0, 10)} onChange={update} required /></div></div>
          {demoMode && <div className="rounded-2xl border border-lime-400/40 bg-lime-400/15 p-4 text-sm"><p className="font-bold">Demo workspace</p><p className="mt-1 text-slate-500">The form works normally, but demo changes stay local to this visit.</p></div>}
          <button disabled={saving} className="btn-primary w-full py-3.5">{saving ? "Saving…" : id ? "Save changes" : "Add to tracker"} <Plus size={17} /></button>
        </div>
      </form>
    </>
  );
}
