import { Activity, CircleGauge, Layers3, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import Heatmap from "../components/Heatmap";
import Loader from "../components/Loader";
import PageHeader from "../components/PageHeader";
import TopicBubbleMap from "../components/TopicBubbleMap";
import { demoAnalytics } from "../data/demoData";
import { useRemoteData } from "../hooks/useRemoteData";

const readinessIcons = [Layers3, CircleGauge, Activity, TrendingUp];

export default function AnalyticsPage() {
  const { data, loading, error, refetch } = useRemoteData("/analytics", demoAnalytics);
  const header = <PageHeader eyebrow="Deep dive" title="Practice analytics" description="A transparent view of your coverage, balance, consistency, and readiness." />;
  if (loading) return <>{header}<Loader /></>;
  if (error) return <>{header}<ErrorState message={error} onRetry={refetch} /></>;
  if (!data) return <>{header}<EmptyState title="No data available" description="Start solving problems to generate analytics." /></>;

  const summary = data?.summary || {};
  const readinessBreakdown = data?.readiness?.breakdown || {};
  const difficulty = Object.entries(summary?.difficulty || {}).map(([name, value]) => ({ name, value }));
  const attemptedTopics = (data?.topicStats || []).filter((item) => item?.total > 0);
  const topics = data?.topics || [];
  const activity = data?.activity || [];
  const streak = summary?.streak || {};
  const colors = ["#63d6a3", "#f7bd5b", "#f27991"];
  return (
    <>
      {header}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(readinessBreakdown).map(([key, value], index) => {
          const Icon = readinessIcons[index] || CircleGauge;
          return <div className="card" key={key}><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-400">{key.replace(/([A-Z])/g, " $1")}</span><Icon size={18} className="text-violet-500" /></div><p className="mt-4 font-display text-3xl font-extrabold">{value}%</p><div className="mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-violet-400" style={{ width: `${value}%` }} /></div></div>;
        })}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="card"><p className="font-display text-lg font-bold">Topic coverage</p><p className="text-xs text-slate-400">Solved volume by attempted concept</p><div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={attemptedTopics} layout="vertical" margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" axisLine={false} tickLine={false}/><YAxis dataKey="topic" type="category" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 11 }}/><Tooltip contentStyle={{ borderRadius: 12 }}/><Bar dataKey="total" fill="#7f68e8" radius={[0, 8, 8, 0]} barSize={18} /></BarChart></ResponsiveContainer></div></div>
        <div className="card"><p className="font-display text-lg font-bold">Difficulty balance</p><p className="text-xs text-slate-400">Healthy prep leans toward medium</p><div className="relative mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={difficulty} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">{difficulty.map((_, i) => <Cell key={i} fill={colors[i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="font-display text-3xl font-extrabold">{summary?.totalSolved || 0}</p><p className="text-xs text-slate-400">total</p></div></div></div><div className="flex justify-center gap-5">{difficulty.map((item, i) => <span key={item.name} className="flex items-center gap-2 text-xs font-semibold"><i className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i] }} />{item.name} {item.value}</span>)}</div></div>
      </div>
      <section className="card mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="font-display text-lg font-bold">Topic Mastery Map</p><p className="text-xs text-slate-400">Bubble size shows solved volume; color shows mastery strength. Select a topic to view its problems.</p></div>
          <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500">
            {[["#34d399", "Strong"], ["#fbbf24", "Needs revision"], ["#fb7185", "Weak"], ["#94a3b8", "Low data"]].map(([color, label]) => <span key={label} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{label}</span>)}
          </div>
        </div>
        <div className="mt-4"><TopicBubbleMap topics={topics} /></div>
      </section>
      <div className="card mt-4"><div className="mb-5 flex items-center justify-between"><div><p className="font-display text-lg font-bold">Progress heatmap</p><p className="text-xs text-slate-400">Consistency across the last 15 weeks</p></div><span className="rounded-full bg-lime-400/25 px-3 py-1 text-xs font-bold">{streak?.current || 0}-day streak</span></div><Heatmap activity={activity} /></div>
      <div className="card mt-4"><p className="font-display text-lg font-bold">How the readiness score works</p><p className="mt-2 text-sm leading-6 text-slate-500">Topic coverage contributes 35%, difficulty balance 25%, recent consistency 20%, and total solved volume 20%. Strong topics receive full coverage credit, practicing topics partial credit, weak topics a heavy penalty, and untouched topics no coverage credit.</p></div>
    </>
  );
}
