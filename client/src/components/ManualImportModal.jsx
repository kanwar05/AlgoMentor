import { Check, Clipboard, FileJson, Upload, X } from "lucide-react";
import { useState } from "react";
import { leetcodeExporterScript } from "../utils/leetcodeExporter";

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
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const parseAndImport = (content) => {
    try {
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed) ? parsed : parsed.problems;
      if (!Array.isArray(items)) throw new Error("Import file must contain a JSON array or a problems array");
      setError("");
      onImport(items);
    } catch (err) {
      setError(err.message);
    }
  };

  const readFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Choose a JSON export file");
      return;
    }
    parseAndImport(await file.text());
    event.target.value = "";
  };

  const copyExporter = async () => {
    try {
      await navigator.clipboard.writeText(leetcodeExporterScript);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Clipboard access was blocked. Select and copy the script below.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
      <div className="card mx-auto my-4 w-full max-w-3xl">
        <div className="flex items-start justify-between"><div><p className="font-display text-xl font-bold">Import complete solved history</p><p className="mt-1 text-sm text-slate-500">Export every solved LeetCode problem locally, then upload one file.</p></div><button onClick={onClose}><X /></button></div>

        <div className="mt-5 rounded-2xl bg-violet-50 p-4 dark:bg-violet-400/10">
          <p className="font-bold">LeetCode full-history export</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
            <li>Log in to LeetCode and open <code>leetcode.com/problemset</code>.</li>
            <li>Open browser DevTools, choose Console, paste the exporter, and press Enter. If Chrome blocks pasting, type <code>allow pasting</code> first.</li>
            <li>Wait for <code>algomentor-leetcode-solved.json</code> to download, then upload it below.</li>
          </ol>
          <p className="mt-3 text-xs text-slate-500">The script runs on LeetCode, reads your solved list and submission timestamps, then downloads them to your computer. Cookies and credentials are never included in the file or sent to AlgoMentor.</p>
          <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">Re-importing is safe: existing problems are deduplicated and their incorrect sync-time dates are replaced with real acceptance dates.</p>
          <button className="btn-secondary mt-4" onClick={copyExporter}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? "Exporter copied" : "Copy LeetCode exporter"}</button>
          <details className="mt-3"><summary className="cursor-pointer text-xs font-bold text-violet-600">View exporter script</summary><textarea readOnly className="input mt-2 min-h-36 font-mono text-[11px]" value={leetcodeExporterScript} /></details>
        </div>

        <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-sm font-bold hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-400/5">
          <FileJson size={20} /> {loading ? "Importing…" : "Upload solved-problems JSON"}
          <input className="hidden" type="file" accept=".json,application/json" onChange={readFile} disabled={loading} />
        </label>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200">or paste JSON</div>
        <textarea className="input min-h-44 font-mono text-xs" value={value} onChange={(event) => setValue(event.target.value)} />
        {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
        <div className="mt-4 flex justify-end gap-2"><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => parseAndImport(value)} disabled={loading}><Upload size={16} />{loading ? "Importing…" : "Import pasted JSON"}</button></div>
      </div>
    </div>
  );
}
