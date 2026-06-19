import { ExternalLink } from "lucide-react";

export default function SyncedProblemsTable({ problems = [] }) {
  return (
    <section className="card overflow-hidden p-0">
      <div className="p-5">
        <p className="font-display text-lg font-bold">Recently synced</p>
        <p className="text-xs text-slate-400">Newest accepted problems across connected platforms.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-y bg-slate-50 text-xs uppercase tracking-wider text-slate-400 dark:bg-white/[.03]">
            <tr><th className="px-5 py-3">Problem</th><th className="px-5 py-3">Platform</th><th className="px-5 py-3">Difficulty</th><th className="px-5 py-3">Topics</th><th className="px-5 py-3">Solved</th></tr>
          </thead>
          <tbody>
            {problems.map((problem) => (
              <tr key={problem._id} className="border-b last:border-0">
                <td className="px-5 py-4 font-semibold">
                  {problem.problemUrl ? <a href={problem.problemUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-violet-500">{problem.title}<ExternalLink size={13} /></a> : problem.title}
                </td>
                <td className="px-5 py-4 text-slate-500">{problem.platform}</td>
                <td className="px-5 py-4">{problem.difficulty}</td>
                <td className="max-w-xs px-5 py-4 text-xs text-slate-500">{problem.topics?.slice(0, 3).join(" · ") || "Uncategorized"}</td>
                <td className="px-5 py-4 text-xs text-slate-400">{problem.solvedAt ? new Date(problem.solvedAt).toLocaleDateString() : "Date unavailable"}</td>
              </tr>
            ))}
            {!problems.length && <tr><td colSpan="5" className="px-5 py-10 text-center text-slate-400">No synced problems yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
