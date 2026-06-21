import { ArrowUpRight, BrainCircuit, BriefcaseBusiness, CheckCircle2, Clock3, Play, RotateCcw, Sparkles, Target, Timer } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import ErrorState from "../components/ErrorState";
import Loader from "../components/Loader";
import PageHeader from "../components/PageHeader";
import StatusPill from "../components/StatusPill";
import { useAuth } from "../context/AuthContext";
import { demoRecommendations } from "../data/demoData";

const ACTIVE_KEY = "algomentor_active_mock_interview";
const resultOptions = [
  ["solved", "Solved", "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"],
  ["hint", "Used hint", "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"],
  ["failed", "Couldn’t solve", "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"]
];

const formatTime = (seconds) => {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
};

function demoInterview(config) {
  const count = Number(config.duration) >= 60 ? 3 : 2;
  const matching = demoRecommendations.filter((problem) => problem.difficulty === config.difficulty);
  const fallback = matching.length >= count ? matching : demoRecommendations;
  const startedAt = new Date();
  return {
    _id: "demo-mock",
    ...config,
    duration: Number(config.duration),
    status: "active",
    startedAt: startedAt.toISOString(),
    expiresAt: new Date(startedAt.getTime() + Number(config.duration) * 60_000).toISOString(),
    problems: fallback.slice(0, count).map((problem) => ({ ...problem, result: "skipped" }))
  };
}

export default function MockInterviewPage() {
  const { demoMode, user } = useAuth();
  const [config, setConfig] = useState({
    company: user?.targetCompany || "Google",
    difficulty: "Medium",
    duration: 45
  });
  const [interview, setInterview] = useState(null);
  const [attempts, setAttempts] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadInterview = useCallback(async (id) => {
    if (!id || demoMode) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/mock-interviews/${id}`);
      const next = response?.data?.interview;
      if (!next) throw new Error("Mock interview data was not returned");
      setInterview(next);
      setAttempts(Object.fromEntries((next.problems || []).map((problem) => [problem.problemId, problem.result])));
      if (next.status === "completed") localStorage.removeItem(ACTIVE_KEY);
    } catch (requestError) {
      localStorage.removeItem(ACTIVE_KEY);
      setError(requestError.response?.data?.message || requestError.message || "Could not load the mock interview");
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  useEffect(() => {
    const activeId = localStorage.getItem(ACTIVE_KEY);
    if (activeId) loadInterview(activeId);
  }, [loadInterview]);

  useEffect(() => {
    if (!interview || interview.status === "completed") return undefined;
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((new Date(interview.expiresAt).getTime() - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [interview]);

  const start = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const next = demoMode
        ? demoInterview(config)
        : (await api.post("/mock-interviews", { ...config, duration: Number(config.duration) }))?.data?.interview;
      if (!next) throw new Error("Mock interview could not be generated");
      setInterview(next);
      setAttempts({});
      if (!demoMode) localStorage.setItem(ACTIVE_KEY, next._id);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Could not generate the mock interview");
    } finally {
      setLoading(false);
    }
  };

  const complete = async () => {
    if (!interview) return;
    setLoading(true);
    setError("");
    const payload = (interview.problems || []).map((problem) => ({
      problemId: problem.problemId,
      result: attempts[problem.problemId] || "skipped"
    }));
    try {
      let completed;
      if (demoMode) {
        const weights = { solved: 100, hint: 60, failed: 0, skipped: 0 };
        const problems = interview.problems.map((problem) => ({ ...problem, result: attempts[problem.problemId] || "skipped" }));
        const weakTopics = [...new Set(problems.filter((problem) => problem.result !== "solved").flatMap((problem) => problem.topics || []))].slice(0, 5);
        completed = {
          ...interview,
          problems,
          score: Math.round(problems.reduce((sum, problem) => sum + weights[problem.result], 0) / problems.length),
          weakTopics,
          nextPracticePlan: demoRecommendations.filter((problem) => problem.topics?.some((topic) => weakTopics.includes(topic))).slice(0, 3),
          status: "completed",
          completedAt: new Date().toISOString()
        };
      } else {
        completed = (await api.patch(`/mock-interviews/${interview._id}/complete`, { attempts: payload }))?.data?.interview;
      }
      if (!completed) throw new Error("Mock interview result was not returned");
      setInterview(completed);
      localStorage.removeItem(ACTIVE_KEY);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Could not complete the mock interview");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    localStorage.removeItem(ACTIVE_KEY);
    setInterview(null);
    setAttempts({});
    setError("");
  };

  const answered = useMemo(
    () => Object.values(attempts).filter((result) => result && result !== "skipped").length,
    [attempts]
  );
  const header = <PageHeader eyebrow="Interview simulation" title="Mock interview mode" description="Practice under pressure, capture the result honestly, and turn every miss into a focused next plan." />;
  if (loading && !interview) return <>{header}<Loader message="Preparing your interview…" /></>;

  if (!interview) {
    return (
      <>
        {header}
        {error && <ErrorState message={error} />}
        <form onSubmit={start} className="mx-auto max-w-3xl">
          <div className="card">
            <div className="grid gap-5 md:grid-cols-3">
              <div><label className="label" htmlFor="mock-company">Company</label><select id="mock-company" className="input" value={config.company} onChange={(event) => setConfig({ ...config, company: event.target.value })}>{["Google", "Amazon", "Microsoft", "Meta", "Other"].map((company) => <option key={company}>{company}</option>)}</select></div>
              <div><label className="label" htmlFor="mock-difficulty">Difficulty</label><select id="mock-difficulty" className="input" value={config.difficulty} onChange={(event) => setConfig({ ...config, difficulty: event.target.value })}>{["Easy", "Medium", "Hard"].map((difficulty) => <option key={difficulty}>{difficulty}</option>)}</select></div>
              <div><label className="label" htmlFor="mock-duration">Duration</label><select id="mock-duration" className="input" value={config.duration} onChange={(event) => setConfig({ ...config, duration: Number(event.target.value) })}><option value="30">30 minutes · 2 problems</option><option value="45">45 minutes · 2 problems</option><option value="60">60 minutes · 3 problems</option><option value="90">90 minutes · 3 problems</option></select></div>
            </div>
            <div className="mt-6 rounded-2xl bg-ink p-5 text-white">
              <div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lime-400 text-ink"><BrainCircuit /></span><div><p className="font-display text-lg font-bold">Interview rules</p><p className="mt-1 text-sm leading-6 text-white/55">Open each problem, work without notes, then record whether you solved it independently, needed a hint, or couldn’t finish. The timer keeps running across the whole set.</p></div></div>
            </div>
            <button className="btn-primary mt-6 w-full py-3.5" disabled={loading}><Play size={17} /> {loading ? "Generating…" : "Start mock interview"}</button>
          </div>
        </form>
      </>
    );
  }

  if (interview.status === "completed") {
    const weakTopics = interview.weakTopics || [];
    const plan = interview.nextPracticePlan || [];
    return (
      <>
        {header}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card"><Target className="text-violet-500" /><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Score</p><p className="mt-1 font-display text-4xl font-extrabold">{interview.score || 0}%</p></div>
          <div className="card"><BriefcaseBusiness className="text-amber-500" /><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Interview</p><p className="mt-1 font-display text-xl font-extrabold">{interview.company} · {interview.difficulty}</p></div>
          <div className="card"><Clock3 className="text-emerald-500" /><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Duration</p><p className="mt-1 font-display text-xl font-extrabold">{interview.duration} minutes</p></div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
          <section className="card"><p className="font-display text-lg font-bold">Problem results</p><div className="mt-4 space-y-3">{(interview.problems || []).map((problem) => <div key={problem.problemId} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[.04]"><CheckCircle2 size={18} className={problem.result === "solved" ? "text-emerald-500" : problem.result === "hint" ? "text-amber-500" : "text-rose-500"} /><span className="min-w-0 flex-1 truncate font-semibold">{problem.title}</span><StatusPill>{problem.result === "solved" ? "Solved" : problem.result === "hint" ? "Revision" : "Weak"}</StatusPill></div>)}</div></section>
          <section className="card"><p className="font-display text-lg font-bold">Weak topics</p><div className="mt-4 flex flex-wrap gap-2">{weakTopics.length ? weakTopics.map((topic) => <StatusPill key={topic}>{topic}</StatusPill>) : <p className="text-sm text-emerald-600">No weak topic signal—clean sweep.</p>}</div></section>
        </div>
        <section className="card mt-4"><div className="flex items-center gap-2"><Sparkles className="text-violet-500" /><p className="font-display text-lg font-bold">Next practice plan</p></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{plan.length ? plan.map((problem) => <article key={problem.problemId || problem.title} className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><p className="font-bold">{problem.title}</p><StatusPill>{problem.difficulty}</StatusPill></div><p className="mt-2 text-xs text-slate-400">{(problem.topics || []).join(" · ")}</p>{problem.link && <a href={problem.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-violet-500">Practice now <ArrowUpRight size={14} /></a>}</article>) : <p className="text-sm text-slate-500">Review the weak topics above before your next timed set.</p>}</div></section>
        <button type="button" onClick={reset} className="btn-primary mt-4"><RotateCcw size={16} /> Start another interview</button>
      </>
    );
  }

  return (
    <>
      {header}
      {error && <p className="card mb-4 border-rose-200 text-sm text-rose-500">{error}</p>}
      <div className="sticky top-20 z-10 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink px-5 py-4 text-white shadow-lg">
        <div><p className="text-xs font-bold uppercase tracking-wider text-white/45">{interview.company} · {interview.difficulty}</p><p className="mt-1 text-sm font-semibold">{answered} / {interview.problems.length} results recorded</p></div>
        <div className={`flex items-center gap-2 font-display text-3xl font-extrabold ${secondsLeft <= 300 ? "text-rose-400" : "text-lime-400"}`}><Timer /> {formatTime(secondsLeft)}</div>
      </div>
      <div className="space-y-4">
        {(interview.problems || []).map((problem, index) => <article key={problem.problemId} className="card"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-violet-500">Problem {index + 1}</p><h2 className="mt-1 font-display text-xl font-extrabold">{problem.title}</h2><div className="mt-3 flex flex-wrap gap-2"><StatusPill>{problem.difficulty}</StatusPill>{(problem.topics || []).map((topic) => <StatusPill key={topic}>{topic}</StatusPill>)}</div></div>{problem.link && <a href={problem.link} target="_blank" rel="noreferrer" className="btn-secondary">Open problem <ArrowUpRight size={15} /></a>}</div><div className="mt-5 flex flex-wrap gap-2 border-t pt-4">{resultOptions.map(([result, label, style]) => <button key={result} type="button" onClick={() => setAttempts({ ...attempts, [problem.problemId]: result })} className={`rounded-xl border px-3 py-2 text-sm font-bold ${attempts[problem.problemId] === result ? style : "bg-white text-slate-500 dark:bg-white/5"}`}>{label}</button>)}</div></article>)}
      </div>
      <div className="mt-4 flex justify-end"><button type="button" onClick={complete} disabled={loading} className="btn-primary px-6 py-3">{loading ? "Scoring…" : secondsLeft === 0 ? "Submit expired interview" : "Finish and score interview"}</button></div>
    </>
  );
}
