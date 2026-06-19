import { Upload, X } from "lucide-react";
import { useState } from "react";

const example = JSON.stringify([{
  platform: "LeetCode",
  title: "Two Sum",
  difficulty: "Easy",
  topics: ["array", "hash-table"],
  problemUrl: "https://leetcode.com/problems/two-sum/"
}], null, 2);

export default function ManualImportModal({ open, onClose, onImport, loading }) {
  const [value, setValue] = useState(example);
  const [error, setError] = useState("");
  if (!open) return null;

  const submit = () => {
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) throw new Error("Import data must be a JSON array");
      setError("");
      onImport(parsed);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="card w-full max-w-2xl">
        <div className="flex items-start justify-between"><div><p className="font-display text-xl font-bold">Manual import</p><p className="mt-1 text-sm text-slate-500">Paste a JSON array exported from your tracker.</p></div><button onClick={onClose}><X /></button></div>
        <textarea className="input mt-5 min-h-80 font-mono text-xs" value={value} onChange={(event) => setValue(event.target.value)} />
        {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
        <div className="mt-4 flex justify-end gap-2"><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit} disabled={loading}><Upload size={16} />{loading ? "Importing…" : "Import problems"}</button></div>
      </div>
    </div>
  );
}
