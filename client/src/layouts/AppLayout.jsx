import { useEffect, useState } from "react";
import { BarChart3, BookOpenCheck, BrainCircuit, ChevronRight, ClipboardList, CloudDownload, LayoutDashboard, LogOut, Menu, Moon, Route, Sparkles, Sun, UserRound, X } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { useAuth } from "../context/AuthContext";

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/problems", label: "Problems", icon: BookOpenCheck },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/roadmap", label: "Roadmap", icon: Route },
  { to: "/app/revision", label: "Revision plan", icon: ClipboardList },
  { to: "/app/recommendations", label: "Recommended", icon: Sparkles },
  { to: "/app/sync", label: "Platform Sync", icon: CloudDownload },
  { to: "/app/profile", label: "Profile", icon: UserRound }
];

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("algomentor_theme") === "dark");
  const { user, logout, demoMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("algomentor_theme", dark ? "dark" : "light");
  }, [dark]);

  const signOut = () => { logout(); navigate("/"); };
  return (
    <div className="min-h-screen">
      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-white p-5 transition-transform dark:bg-[#14161a] lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between">
          <Brand />
          <button onClick={() => setMobileOpen(false)} className="lg:hidden"><X size={20} /></button>
        </div>
        <div className="mt-8 rounded-2xl bg-ink p-4 text-white dark:bg-white/5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime-400 font-display font-bold text-ink">{user?.name?.[0] || "A"}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{user?.name}</p>
              <p className="truncate text-xs text-white/55">{user?.targetCompany} track</p>
            </div>
          </div>
          {demoMode && <p className="mt-3 rounded-lg bg-lime-400/15 px-2 py-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-lime-400">Demo workspace</p>}
        </div>
        <nav className="mt-6 space-y-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300" : "text-slate-500 hover:bg-slate-100 hover:text-ink dark:hover:bg-white/5 dark:hover:text-white"}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-1 border-t pt-4">
          <button onClick={() => setDark(!dark)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">
            {dark ? <Sun size={18} /> : <Moon size={18} />} {dark ? "Light mode" : "Dark mode"}
          </button>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-400/10">
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-canvas/85 px-4 backdrop-blur-xl dark:bg-[#101114]/85 md:px-8">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 lg:hidden"><Menu /></button>
          <div className="hidden items-center gap-2 text-sm text-slate-400 lg:flex"><BrainCircuit size={17} /> Adaptive practice workspace <ChevronRight size={14} /> <span className="text-ink dark:text-white">{user?.targetCompany}</span></div>
          <NavLink to="/app/problems/new" className="btn-primary ml-auto">Log problem <span className="text-lg leading-none">+</span></NavLink>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
