import { ArrowRight, BookOpenCheck, BrainCircuit, CircleCheck, CircleDashed, Code2, Flame, Sprout, Target, TrendingUp, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import Heatmap from "../components/Heatmap";
import LoadingState from "../components/LoadingState";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { demoAnalytics } from "../data/demoData";
import { useRemoteData } from "../hooks/useRemoteData";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error } = useRemoteData("/analytics", demoAnalytics);
  if (loading) return <LoadingState />;
  if (error) return <p className="card text-rose-500">{error}</p>;
  const {
    summary,
    weeklyActivity,
    weakTopics = [],
    practicingTopics = [],
    untouchedTopics = [],
    strongTopics = [],
    activity
  } = data;
  const priorityTopics = [...weakTopics, ...practicingTopics, ...untouchedTopics];
  const distribution = [
    { name: "Strong", value: strongTopics.length, color: "#34d399" },
    { name: "Weak", value: weakTopics.length, color: "#fb7185" },
    { name: "Practicing", value: practicingTopics.length, color: "#a78bfa" },
    { name: "Untouched", value: untouchedTopics.length, color: "#cbd5e1" }
  ];
  const topicSections = [
    { title: "Strong Topics", items: strongTopics, icon: CircleCheck, color: "text-emerald-500", empty: "No mastered topics yet" },
    { title: "Weak Topics", items: weakTopics, icon: TriangleAlert, color: "text-rose-500", empty: "No confirmed weak topics" },
    { title: "Practicing Topics", items: practicingTopics, icon: Sprout, color: "text-violet-500", empty: "No topics in early practice" },
    { title: "Untouched Topics", items: untouchedTopics, icon: CircleDashed, color: "text-slate-400", empty: "Full topic coverage achieved" }
  ];
  const cards = [
    { label: "Problems solved", value: summary.totalSolved, note: `${summary.solvedThisWeek} this week`, icon: BookOpenCheck, color: "bg-violet-100 text-violet-600 dark:bg-violet-400/10" },
    { label: "LeetCode solved", value: summary.leetcodeSolved || 0, note: "Synced + manually logged", icon: Code2, color: "bg-amber-100 text-amber-600 dark:bg-amber-400/10" },
    { label: "Codeforces solved", value: summary.codeforcesSolved || 0, note: "Unique accepted problems", icon: Code2, color: "bg-blue-100 text-blue-600 dark:bg-blue-400/10" },
    { label: "Current streak", value: `${summary.streak.current} days`, note: `Personal best: ${summary.streak.longest}`, icon: Flame, color: "bg-orange-100 text-orange-600 dark:bg-orange-400/10" },
    { label: "Interview ready", value: `${summary.readinessScore}%`, note: summary.readinessScore >= 70 ? "Strong momentum" : "Keep building coverage", icon: Target, color: "bg-lime-400/30 text-lime-700 dark:text-lime-400" }
  ];
  return (
    <>
      <PageHeader eyebrow="Your command center" title={`Good ${new Date().getHours() < 12 ? "morning" : "work"}, ${user?.name?.split(" ")[0]}.`} description="Here’s the signal beneath your latest practice." action={<Link to="/app/recommendations" className="btn-secondary">What should I solve? <ArrowRight size={16} /></Link>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ label, value, note, icon: Icon, color }) => <div key={label} className="card"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 font-display text-3xl font-extrabold">{value}</p><p className="mt-2 text-xs text-slate-400">{note}</p></div><span className={`grid h-11 w-11 place-items-center rounded-2xl ${color}`}><Icon size={21} /></span></div></div>)}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="card">
          <div className="flex items-center justify-between"><div><p className="font-display text-lg font-bold">Practice rhythm</p><p className="text-xs text-slate-400">Problems solved over the past week</p></div><span className="flex items-center gap-1 text-xs font-bold text-emerald-500"><TrendingUp size={15} /> On track</span></div>
          <div className="mt-5 h-52">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={weeklyActivity}><defs><linearGradient id="practice" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7f68e8" stopOpacity={.35}/><stop offset="100%" stopColor="#7f68e8" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => new Date(v).toLocaleDateString("en", { weekday: "short" })}/><Tooltip contentStyle={{ borderRadius: 12, border: 0 }}/><Area type="monotone" dataKey="count" stroke="#7f68e8" strokeWidth={3} fill="url(#practice)" /></AreaChart></ResponsiveContainer>
          </div>
          <div className="mt-2"><div className="mb-2 flex justify-between text-xs font-semibold"><span>Weekly goal</span><span>{summary.solvedThisWeek} / {summary.weeklyGoal}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-lime-400" style={{ width: `${summary.weeklyProgress}%` }} /></div></div>
        </div>
        <div className="card bg-ink text-white dark:bg-[#181a1f]">
          <div className="flex items-center justify-between"><div><p className="font-display text-lg font-bold">Mentor signal</p><p className="text-xs text-white/40">Highest-leverage focus</p></div><BrainCircuit className="text-lime-400" /></div>
          <div className="mt-6 rounded-2xl bg-white/[.07] p-4"><p className="text-xs font-bold uppercase tracking-wider text-lime-400">Focus next</p><p className="mt-2 font-display text-2xl font-extrabold">{priorityTopics[0]?.topic || "Build consistency"}</p><p className="mt-2 text-sm leading-6 text-white/55">{priorityTopics[0]?.reasons?.[0] || (priorityTopics[0]?.status === "practicing" ? "Keep building exposure until the signal becomes reliable." : priorityTopics[0]?.status === "untouched" ? "Start this topic to close an important coverage gap." : "Log more practice to unlock a sharper recommendation.")}</p></div>
          <Link to="/app/roadmap" className="mt-4 flex items-center justify-between rounded-2xl bg-violet-400 p-4 font-bold text-ink">Open learning path <ArrowRight size={18} /></Link>
        </div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="card"><div className="mb-5 flex items-center justify-between"><div><p className="font-display text-lg font-bold">Consistency map</p><p className="text-xs text-slate-400">Small squares, compounding wins</p></div><Flame size={20} className="text-orange-500" /></div><Heatmap activity={activity} /></div>
        <div className="card"><div><p className="font-display text-lg font-bold">Topic distribution</p><p className="text-xs text-slate-400">Mastery, active learning, weakness, and coverage gaps</p></div><div className="mt-2 h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="value" innerRadius={48} outerRadius={75} paddingAngle={3}>{distribution.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="grid grid-cols-2 gap-2">{distribution.map((item) => <div key={item.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-white/[.04]"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.name}</span><strong>{item.value}</strong></div>)}</div></div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {topicSections.map(({ title, items, icon: Icon, color, empty }) => <section key={title} className="card"><div className="flex items-center justify-between"><div><p className="font-display font-bold">{title}</p><p className="text-xs text-slate-400">{items.length} topics</p></div><Icon size={20} className={color} /></div><div className="mt-4 space-y-2">{items.length ? items.slice(0, 5).map((item) => <div key={item.topic} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-white/[.04]"><span className="truncate font-semibold">{item.topic}</span><span className="ml-2 text-xs text-slate-400">{item.total}</span></div>) : <p className="text-sm text-slate-400">{empty}</p>}</div></section>)}
      </div>
    </>
  );
}
