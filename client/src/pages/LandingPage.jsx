import { ArrowRight, BarChart3, BrainCircuit, Check, GitBranch, Menu, Sparkles, Target, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { useAuth } from "../context/AuthContext";

const features = [
  { icon: BarChart3, title: "Know what the data says", text: "See topic coverage, streaks, difficulty balance, and an honest interview-readiness score." },
  { icon: GitBranch, title: "Follow the right sequence", text: "Weak areas become dependency-aware learning paths built with graph traversal." },
  { icon: BrainCircuit, title: "Revise with intent", text: "A priority-queue planner places the highest-value revisions into a focused 7-day sprint." }
];

export default function LandingPage() {
  const { enterDemo } = useAuth();
  const navigate = useNavigate();
  const demo = () => { enterDemo(); navigate("/app"); };
  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f8f3] text-ink">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <Brand />
        <div className="hidden items-center gap-8 text-sm font-semibold text-slate-500 md:flex">
          <a href="#features">Features</a><a href="#how">How it works</a><a href="#score">Readiness score</a>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden px-3 py-2 text-sm font-bold sm:block">Log in</Link>
          <Link to="/register" className="btn-primary">Start tracking <ArrowRight size={16} /></Link>
        </div>
      </nav>
      <main>
        <section className="grid-noise relative px-5 pb-24 pt-16 md:pt-24">
          <div className="absolute left-[8%] top-16 h-36 w-36 rounded-full bg-lime-400/30 blur-3xl" />
          <div className="absolute right-[8%] top-36 h-48 w-48 rounded-full bg-violet-400/25 blur-3xl" />
          <div className="relative mx-auto max-w-5xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-bold shadow-sm"><Sparkles size={14} className="text-violet-500" /> Your practice should adapt to you</div>
            <h1 className="font-display text-5xl font-extrabold leading-[.98] tracking-[-.055em] sm:text-6xl md:text-8xl">
              Stop grinding.<br /><span className="text-violet-500">Start improving.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              AlgoMentor turns every solved problem into a clear signal—showing what to learn next, what to revise, and how close you are to interview ready.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/register" className="btn-primary px-6 py-3.5">Build my roadmap <ArrowRight size={17} /></Link>
              <button onClick={demo} className="btn-secondary px-6 py-3.5">Explore live demo</button>
            </div>
            <p className="mt-4 text-xs text-slate-400">No credit card · Your progress stays yours</p>
          </div>
          <div className="relative mx-auto mt-16 max-w-5xl rounded-[2rem] border bg-white p-3 shadow-[0_30px_100px_rgba(37,35,49,.16)]">
            <div className="rounded-[1.4rem] bg-ink p-5 text-white md:p-8">
              <div className="grid gap-4 md:grid-cols-4">
                {[["64", "Problems solved", "+9 this week"], ["72%", "Interview ready", "+6% this month"], ["6 days", "Current streak", "Best: 14 days"], ["3", "Focus topics", "DP · Graphs · Windows"]].map(([value, label, note], index) => (
                  <div key={label} className={`rounded-2xl p-4 ${index === 1 ? "bg-lime-400 text-ink" : "bg-white/[.07]"}`}>
                    <p className="font-display text-3xl font-extrabold">{value}</p><p className="mt-1 text-sm font-semibold">{label}</p><p className={`mt-3 text-xs ${index === 1 ? "text-ink/60" : "text-white/45"}`}>{note}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[1.6fr_1fr]">
                <div className="rounded-2xl bg-white/[.07] p-5">
                  <div className="flex justify-between"><span className="font-bold">Your activity</span><span className="text-xs text-white/45">Last 15 weeks</span></div>
                  <div className="mt-6 grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1.5">{Array.from({ length: 75 }, (_, i) => <span key={i} className={`aspect-square rounded-[3px] ${["bg-white/10", "bg-lime-400/30", "bg-lime-400/60", "bg-lime-400"][i % 4]}`} />)}</div>
                </div>
                <div className="rounded-2xl bg-violet-400 p-5 text-ink">
                  <Target size={22} /><p className="mt-4 text-sm font-bold">Next best move</p><p className="mt-1 font-display text-xl font-extrabold">Dynamic Programming</p><p className="mt-3 text-xs leading-5 text-ink/65">Start with 1D state transitions, then revisit Coin Change.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
          <p className="eyebrow">A smarter feedback loop</p>
          <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <h2 className="max-w-2xl font-display text-4xl font-extrabold tracking-tight md:text-5xl">Every problem makes your plan sharper.</h2>
            <p className="max-w-md text-slate-500">No generic 450-question sheet. Your roadmap responds to your actual practice history.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text }, index) => (
              <div key={title} className={`rounded-3xl border p-7 ${index === 1 ? "bg-violet-100" : "bg-white"}`}>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-lime-400"><Icon size={21} /></span>
                <h3 className="mt-7 font-display text-xl font-extrabold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="how" className="bg-ink px-5 py-24 text-white">
          <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-2 md:items-center">
            <div><p className="eyebrow text-lime-400">Built on real CS thinking</p><h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight md:text-5xl">Algorithms working on your algorithms.</h2><p className="mt-5 max-w-lg leading-7 text-white/55">Under the clean interface is a deliberate DSA engine: hash maps summarize your practice, graph traversal orders your roadmap, and a max-heap schedules revision.</p></div>
            <div className="space-y-3">
              {["Log solved problems in seconds", "Weak patterns surface automatically", "Get a sequenced path and daily revision plan", "Watch your readiness score move"].map((item, index) => <div key={item} className="flex items-center gap-4 rounded-2xl bg-white/[.06] p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-lime-400 font-display font-extrabold text-ink">{index + 1}</span><span className="font-semibold">{item}</span><Check className="ml-auto text-lime-400" size={18} /></div>)}
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-slate-500 md:flex-row md:px-8"><Brand /><span>Built for thoughtful, consistent problem solvers.</span><span>© 2026 AlgoMentor</span></footer>
    </div>
  );
}
