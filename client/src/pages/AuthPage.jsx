import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { useAuth } from "../context/AuthContext";

export default function AuthPage({ mode }) {
  const isLogin = mode === "login";
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", targetCompany: "Google", codingGoal: "Crack product-based company interviews" });
  const { login, register, enterDemo } = useAuth();
  const navigate = useNavigate();
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError("");
    try { await (isLogin ? login(form) : register(form)); navigate("/app"); }
    catch (err) { setError(err.response?.data?.message || "Could not connect to the API. Try the demo workspace."); }
    finally { setLoading(false); }
  };
  const demo = () => { enterDemo(); navigate("/app"); };
  return (
    <div className="grid min-h-screen bg-white dark:bg-[#101114] lg:grid-cols-[.9fr_1.1fr]">
      <section className="flex min-h-screen flex-col px-6 py-6 md:px-12 lg:px-16">
        <div className="flex items-center justify-between"><Brand /><Link to="/" className="flex items-center gap-1.5 text-sm font-semibold text-slate-500"><ArrowLeft size={16} /> Home</Link></div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <p className="eyebrow">{isLogin ? "Welcome back" : "Start your growth loop"}</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">{isLogin ? "Pick up where you left off." : "Make every problem count."}</h1>
          <p className="mt-3 text-sm text-slate-500">{isLogin ? "Your roadmap and analytics are waiting." : "Create your workspace in under a minute."}</p>
          {error && <div className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">{error}</div>}
          <form onSubmit={submit} className="mt-7 space-y-4">
            {!isLogin && <div><label className="label">Full name</label><input className="input" name="name" value={form.name} onChange={update} placeholder="Alex Morgan" required /></div>}
            <div><label className="label">Email address</label><input className="input" type="email" name="email" value={form.email} onChange={update} placeholder="you@example.com" required /></div>
            <div><label className="label">Password</label><div className="relative"><input className="input pr-11" type={show ? "text" : "password"} name="password" value={form.password} onChange={update} placeholder="Minimum 8 characters" minLength={8} required /><button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-slate-400">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
            {!isLogin && <><div><label className="label">Target company</label><select className="input" name="targetCompany" value={form.targetCompany} onChange={update}>{["Google", "Amazon", "Microsoft", "Meta", "Other"].map((item) => <option key={item}>{item}</option>)}</select></div><div><label className="label">Coding goal</label><input className="input" name="codingGoal" value={form.codingGoal} onChange={update} /></div></>}
            <button disabled={loading} className="btn-primary w-full py-3.5">{loading ? "Please wait…" : isLogin ? "Log in" : "Create my workspace"} <ArrowRight size={17} /></button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs text-slate-400 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200">or</div>
          <button onClick={demo} className="btn-secondary w-full py-3">Explore with demo data</button>
          <p className="mt-6 text-center text-sm text-slate-500">{isLogin ? "New to AlgoMentor?" : "Already have an account?"} <Link className="font-bold text-violet-500" to={isLogin ? "/register" : "/login"}>{isLogin ? "Create an account" : "Log in"}</Link></p>
        </div>
      </section>
      <section className="grid-noise relative hidden overflow-hidden bg-ink p-16 text-white lg:flex lg:flex-col lg:justify-center">
        <div className="absolute -right-24 -top-20 h-80 w-80 rounded-full bg-violet-500/30 blur-3xl" /><div className="absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-lime-400/20 blur-3xl" />
        <div className="relative max-w-lg"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-400 text-ink"><Sparkles /></span><blockquote className="mt-8 font-display text-4xl font-extrabold leading-tight">“Clarity beats motivation. Know the next right problem, then solve it.”</blockquote><div className="mt-10 space-y-4">{["Personalized weak-topic detection", "Dependency-aware DSA roadmap", "A 7-day priority revision sprint"].map((text) => <p key={text} className="flex items-center gap-3 text-white/70"><CheckCircle2 className="text-lime-400" size={20} /> {text}</p>)}</div></div>
      </section>
    </div>
  );
}
