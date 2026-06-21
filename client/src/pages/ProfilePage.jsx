import { Building2, Check, Flag, Mail, Save, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import api from "../api/client";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const { user, updateUser, demoMode } = useAuth();
  const [form, setForm] = useState(user || {});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = demoMode ? null : await api.put("/auth/me", form);
      const next = demoMode ? form : response?.data?.user;
      if (!next) throw new Error("Profile data was not returned");
      updateUser(next);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not save your profile");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <PageHeader eyebrow="Personalize the mentor" title="Profile & goals" description="Your target shapes company weighting, while your weekly goal calibrates consistency." />
      <form onSubmit={submit} className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div className="card space-y-5">
          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-400/10 dark:text-rose-300">{error}</p>}
          <div className="flex items-center gap-4 border-b pb-5"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-violet-500 font-display text-2xl font-extrabold text-white">{user?.name?.[0] || "A"}</span><div><p className="font-display text-xl font-extrabold">{user?.name || "AlgoMentor user"}</p><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400"><Mail size={14} /> {user?.email || "Email unavailable"}</p></div></div>
          <div><label className="label">Full name</label><div className="relative"><UserRound className="absolute left-3 top-3 text-slate-400" size={18}/><input className="input pl-10" name="name" value={form?.name || ""} onChange={update} /></div></div>
          <div><label className="label">Coding goal</label><div className="relative"><Flag className="absolute left-3 top-3 text-slate-400" size={18}/><input className="input pl-10" name="codingGoal" value={form?.codingGoal || ""} onChange={update} /></div></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Target company</label><div className="relative"><Building2 className="absolute left-3 top-3 text-slate-400" size={18}/><select className="input pl-10" name="targetCompany" value={form?.targetCompany || "Other"} onChange={update}>{["Google", "Amazon", "Microsoft", "Meta", "Other"].map((item) => <option key={item}>{item}</option>)}</select></div></div><div><label className="label">Problems per week</label><input type="number" min="1" max="50" className="input" name="weeklyGoal" value={form?.weeklyGoal || 1} onChange={update} /></div></div>
          <button className="btn-primary" disabled={saving}>{saved ? <><Check size={17} /> Saved</> : <><Save size={17} /> {saving ? "Saving…" : "Save profile"}</>}</button>
        </div>
        <div className="space-y-4">
          <div className="card bg-ink text-white"><ShieldCheck className="text-lime-400" size={28}/><h2 className="mt-5 font-display text-xl font-extrabold">Your data, your edge.</h2><p className="mt-2 text-sm leading-6 text-white/50">Passwords are hashed with bcrypt. API routes use signed JWT authentication, and every problem query is scoped to your user ID.</p></div>
          <div className="card"><p className="font-display text-lg font-bold">Workspace details</p><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-400">Plan</dt><dd className="font-bold">Student</dd></div><div className="flex justify-between"><dt className="text-slate-400">Mode</dt><dd className="font-bold">{demoMode ? "Interactive demo" : "Live database"}</dd></div><div className="flex justify-between"><dt className="text-slate-400">Analytics</dt><dd className="font-bold text-emerald-500">Active</dd></div></dl></div>
        </div>
      </form>
    </>
  );
}
