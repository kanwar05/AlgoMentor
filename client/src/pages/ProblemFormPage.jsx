import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";

const topics = ["Array", "String", "Hashing", "Two Pointers", "Sliding Window", "Binary Search", "Linked List", "Stack", "Queue", "Recursion", "Backtracking", "Tree", "BST", "Heap", "Graph", "BFS/DFS", "Dijkstra", "MST", "Dynamic Programming", "Greedy", "Bit Manipulation"];

export default function ProblemFormPage() {
  const { id } = useParams();
  const existing = useLocation().state?.problem;
  const { demoMode } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(existing || { title: "", platform: "LeetCode", difficulty: "Medium", topics: [], status: "Solved", link: "", solvedDate: new Date().toISOString().slice(0, 10), notes: "" });
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const toggleTopic = (topic) => setForm({ ...form, topics: form.topics.includes(topic) ? form.topics.filter((item) => item !== topic) : [...form.topics, topic] });
  const submit = async (event) => {
    event.preventDefault();
    if (!form.topics.length) { setError("Select at least one topic."); return; }
    setSaving(true);
    try {
      if (!demoMode) await (id ? api.put(`/problems/${id}`, form) : api.post("/problems", form));
      navigate("/app/problems");
    } catch (err) { setError(err.response?.data?.message || "Could not save the problem."); }
    finally { setSaving(false); }
  };
  return (
    <>
      <PageHeader eyebrow={id ? "Update practice log" : "Capture a win"} title={id ? "Edit problem" : "Add solved problem"} description="Accurate metadata gives your mentor engine a stronger signal." action={<Link to="/app/problems" className="btn-secondary"><ArrowLeft size={16} /> Back</Link>} />
      <form onSubmit={submit} className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
        <div className="card space-y-5">
          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
          <div><label className="label">Problem title</label><input name="title" className="input" value={form.title} onChange={update} placeholder="e.g. Longest Substring Without Repeating Characters" required /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Platform</label><select name="platform" className="input" value={form.platform} onChange={update}>{["LeetCode", "GeeksforGeeks", "Codeforces", "HackerRank", "InterviewBit", "Other"].map((p) => <option key={p}>{p}</option>)}</select></div><div><label className="label">Difficulty</label><select name="difficulty" className="input" value={form.difficulty} onChange={update}><option>Easy</option><option>Medium</option><option>Hard</option></select></div></div>
          <div><label className="label">Topics</label><div className="flex flex-wrap gap-2">{topics.map((topic) => <button type="button" key={topic} onClick={() => toggleTopic(topic)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${form.topics.includes(topic) ? "border-violet-500 bg-violet-500 text-white" : "bg-white text-slate-500 dark:bg-white/5"}`}>{form.topics.includes(topic) && <Check size={12} className="mr-1 inline" />}{topic}</button>)}</div></div>
          <div><label className="label">Problem link</label><input type="url" name="link" className="input" value={form.link} onChange={update} placeholder="https://leetcode.com/problems/…" /></div>
          <div><label className="label">Notes (optional)</label><textarea name="notes" className="input min-h-28 resize-y" value={form.notes} onChange={update} placeholder="Key insight, complexity, or mistake to revisit…" /></div>
        </div>
        <div className="space-y-4">
          <div className="card space-y-5"><div><label className="label">Learning status</label><div className="space-y-2">{["Solved", "Revision", "Weak"].map((status) => <label key={status} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${form.status === status ? "border-violet-400 bg-violet-50 dark:bg-violet-400/10" : ""}`}><input type="radio" name="status" value={status} checked={form.status === status} onChange={update} /><div><p className="text-sm font-bold">{status}</p><p className="text-xs text-slate-400">{status === "Solved" ? "Comfortable with the approach" : status === "Revision" ? "Understood, but needs another pass" : "Could not solve independently"}</p></div></label>)}</div></div><div><label className="label">Solved date</label><input type="date" name="solvedDate" className="input" value={form.solvedDate?.slice(0, 10)} onChange={update} required /></div></div>
          {demoMode && <div className="rounded-2xl border border-lime-400/40 bg-lime-400/15 p-4 text-sm"><p className="font-bold">Demo workspace</p><p className="mt-1 text-slate-500">The form works normally, but demo changes stay local to this visit.</p></div>}
          <button disabled={saving} className="btn-primary w-full py-3.5">{saving ? "Saving…" : id ? "Save changes" : "Add to tracker"} <Plus size={17} /></button>
        </div>
      </form>
    </>
  );
}
