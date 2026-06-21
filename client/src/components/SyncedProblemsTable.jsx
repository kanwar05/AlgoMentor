import { Check, Edit3, ExternalLink, X } from "lucide-react";
import { Fragment, useState } from "react";
import StatusPill from "./StatusPill";

const annotationDraft = (problem) => ({
  status: problem?.status === "Solved" ? "Strong" : problem?.status || "Strong",
  notes: problem?.notes || "",
  confidence: problem?.confidence ?? "",
  lastReviewedAt: problem?.lastReviewedAt ? new Date(problem.lastReviewedAt).toISOString().slice(0, 10) : ""
});

export default function SyncedProblemsTable({ problems = [], onSaveAnnotations }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const edit = (problem) => {
    setEditingId(problem._id);
    setDraft(annotationDraft(problem));
    setError("");
  };

  const save = async () => {
    if (!editingId || !onSaveAnnotations) return;
    setSaving(true);
    setError("");
    try {
      await onSaveAnnotations(editingId, {
        ...draft,
        confidence: draft.confidence === "" ? null : Number(draft.confidence),
        lastReviewedAt: draft.lastReviewedAt || null
      });
      setEditingId(null);
      setDraft(null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Could not save annotations");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card overflow-hidden p-0">
      <div className="p-5">
        <p className="font-display text-lg font-bold">Recently synced</p>
        <p className="text-xs text-slate-400">Newest accepted problems across connected platforms.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-y bg-slate-50 text-xs uppercase tracking-wider text-slate-400 dark:bg-white/[.03]">
            <tr><th className="px-5 py-3">Problem</th><th className="px-5 py-3">Platform</th><th className="px-5 py-3">Difficulty</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Reviewed</th><th className="px-5 py-3" /></tr>
          </thead>
          <tbody>
            {problems.map((problem) => (
              <Fragment key={problem._id}>
                <tr className="border-b last:border-0">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{problem.problemUrl ? <a href={problem.problemUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-violet-500">{problem.title}<ExternalLink size={13} /></a> : problem.title}</p>
                    <p className="mt-1 max-w-xs truncate text-xs text-slate-400">{problem.notes || problem.topics?.slice(0, 3).join(" · ") || "No notes yet"}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{problem.platform}</td>
                  <td className="px-5 py-4">{problem.difficulty}</td>
                  <td className="px-5 py-4"><StatusPill>{problem.status === "Solved" ? "Strong" : problem.status || "Strong"}</StatusPill>{problem.confidence !== null && problem.confidence !== undefined && <span className="ml-2 text-xs text-slate-400">{problem.confidence}%</span>}</td>
                  <td className="px-5 py-4 text-xs text-slate-400">{problem.lastReviewedAt ? new Date(problem.lastReviewedAt).toLocaleDateString() : "Not reviewed"}</td>
                  <td className="px-5 py-4 text-right"><button type="button" aria-label={`Annotate ${problem.title}`} onClick={() => edit(problem)} className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-violet-500 dark:hover:bg-violet-400/10"><Edit3 size={16} /></button></td>
                </tr>
                {editingId === problem._id && draft && (
                  <tr className="border-b bg-slate-50/80 dark:bg-white/[.025]">
                    <td colSpan="6" className="px-5 py-4">
                      <div className="grid gap-3 md:grid-cols-[140px_120px_160px_1fr_auto] md:items-end">
                        <div><label className="label" htmlFor={`status-${problem._id}`}>Status</label><select id={`status-${problem._id}`} className="input py-2" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option>Strong</option><option>Revision</option><option>Weak</option></select></div>
                        <div><label className="label" htmlFor={`confidence-${problem._id}`}>Confidence</label><input id={`confidence-${problem._id}`} type="number" min="0" max="100" className="input py-2" value={draft.confidence} onChange={(event) => setDraft({ ...draft, confidence: event.target.value })} placeholder="0–100" /></div>
                        <div><label className="label" htmlFor={`reviewed-${problem._id}`}>Last reviewed</label><input id={`reviewed-${problem._id}`} type="date" className="input py-2" value={draft.lastReviewedAt} onChange={(event) => setDraft({ ...draft, lastReviewedAt: event.target.value })} /></div>
                        <div><label className="label" htmlFor={`notes-${problem._id}`}>Notes</label><input id={`notes-${problem._id}`} className="input py-2" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Key insight or mistake to revisit…" /></div>
                        <div className="flex gap-1">
                          <button type="button" aria-label="Save annotations" onClick={save} disabled={saving} className="rounded-lg bg-violet-500 p-2.5 text-white disabled:opacity-50"><Check size={16} /></button>
                          <button type="button" aria-label="Cancel annotations" onClick={() => { setEditingId(null); setDraft(null); setError(""); }} className="rounded-lg border bg-white p-2.5 dark:bg-white/5"><X size={16} /></button>
                        </div>
                      </div>
                      {error && <p className="mt-2 text-xs font-semibold text-rose-500">{error}</p>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!problems.length && <tr><td colSpan="6" className="px-5 py-10 text-center text-slate-400">No synced problems yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
