import { RefreshCw, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import api from "../api/client";
import ManualImportModal from "../components/ManualImportModal";
import PageHeader from "../components/PageHeader";
import PlatformConnectCard from "../components/PlatformConnectCard";
import SyncHistoryCard from "../components/SyncHistoryCard";
import SyncedProblemsTable from "../components/SyncedProblemsTable";
import SyncStatusCard from "../components/SyncStatusCard";
import { useAuth } from "../context/AuthContext";

export default function PlatformSyncPage() {
  const { user, updateUser, demoMode } = useAuth();
  const [handles, setHandles] = useState({ leetcodeUsername: user?.leetcodeUsername || "", codeforcesHandle: user?.codeforcesHandle || "" });
  const [status, setStatus] = useState({ platforms: {}, counts: {}, history: [] });
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState({ initial: true });
  const [toast, setToast] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);

  const notify = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4500);
  };

  const load = useCallback(async () => {
    if (demoMode) {
      setLoading({});
      return;
    }
    try {
      const [statusResponse, problemsResponse] = await Promise.all([
        api.get("/sync/status"),
        api.get("/sync/problems?limit=20")
      ]);
      setStatus(statusResponse.data);
      setProblems(problemsResponse.data.problems);
      setHandles(statusResponse.data.platforms);
    } catch (error) {
      notify(error.response?.data?.message || "Could not load platform sync", "error");
    } finally {
      setLoading({});
    }
  }, [demoMode]);

  useEffect(() => { load(); }, [load]);

  const saveHandles = async () => {
    if (demoMode) return notify("Platform connections are disabled in demo mode", "error");
    setLoading((state) => ({ ...state, save: true }));
    try {
      const response = await api.put("/profile/platforms", handles);
      setStatus((state) => ({ ...state, platforms: response.data.platforms }));
      updateUser({ ...user, ...response.data.platforms });
      notify("Platform handles saved");
    } catch (error) {
      notify(error.response?.data?.message || "Could not save handles", "error");
    } finally {
      setLoading((state) => ({ ...state, save: false }));
    }
  };

  const sync = async (platform) => {
    if (demoMode) return notify("Live sync is disabled in demo mode", "error");
    const key = platform.toLowerCase();
    setLoading((state) => ({ ...state, [key]: true }));
    try {
      const response = await api.post(`/sync/${key}`);
      notify(`${platform}: ${response.data.imported} imported, ${response.data.skipped} already synced`);
      await load();
    } catch (error) {
      notify(error.response?.data?.message || `${platform} sync failed`, "error");
    } finally {
      setLoading((state) => ({ ...state, [key]: false }));
    }
  };

  const syncAll = async () => {
    if (demoMode) return notify("Live sync is disabled in demo mode", "error");
    setLoading((state) => ({ ...state, all: true }));
    try {
      const response = await api.post("/sync/all");
      const failed = response.data.results?.filter((item) => !item.success) || [];
      notify(failed.length ? `Sync completed with ${failed.length} platform error` : `Imported ${response.data.imported} new problems`, failed.length ? "error" : "success");
      await load();
    } catch (error) {
      notify(error.response?.data?.message || "Platform sync failed", "error");
      await load();
    } finally {
      setLoading((state) => ({ ...state, all: false }));
    }
  };

  const manualImport = async (items) => {
    if (demoMode) return notify("Manual import is disabled in demo mode", "error");
    setLoading((state) => ({ ...state, manual: true }));
    try {
      const response = await api.post("/sync/manual-import", items);
      notify(`${response.data.imported} problems imported`);
      setManualOpen(false);
      await load();
    } catch (error) {
      notify(error.response?.data?.message || "Manual import failed", "error");
    } finally {
      setLoading((state) => ({ ...state, manual: false }));
    }
  };

  if (loading.initial) return <div className="card animate-pulse text-slate-400">Loading platform connections…</div>;

  return (
    <>
      {toast && <div className={`fixed right-5 top-5 z-[60] max-w-sm rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${toast.type === "error" ? "bg-rose-500" : "bg-emerald-500"}`}>{toast.message}</div>}
      <PageHeader eyebrow="Automatic tracking" title="Platform Sync" description="Bring accepted submissions into the same analytics, roadmap, and recommendation loop." action={<div className="flex gap-2"><button className="btn-secondary" onClick={() => setManualOpen(true)}><Upload size={16} /> Manual import</button><button className="btn-primary" onClick={syncAll} disabled={loading.all}><RefreshCw size={16} className={loading.all ? "animate-spin" : ""} /> Sync all</button></div>} />

      <div className="grid gap-4 lg:grid-cols-2">
        <PlatformConnectCard platform="LeetCode" value={handles.leetcodeUsername || ""} onChange={(value) => setHandles({ ...handles, leetcodeUsername: value })} onSave={saveHandles} saving={loading.save} placeholder="your_username" connected={Boolean(status.platforms?.leetcodeUsername)} />
        <PlatformConnectCard platform="Codeforces" value={handles.codeforcesHandle || ""} onChange={(value) => setHandles({ ...handles, codeforcesHandle: value })} onSave={saveHandles} saving={loading.save} placeholder="tourist" connected={Boolean(status.platforms?.codeforcesHandle)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SyncStatusCard platform="LeetCode" count={status.counts?.LeetCode} lastSync={status.platforms?.lastLeetCodeSync} onSync={() => sync("LeetCode")} loading={loading.leetcode} disabled={!status.platforms?.leetcodeUsername} />
        <SyncStatusCard platform="Codeforces" count={status.counts?.Codeforces} lastSync={status.platforms?.lastCodeforcesSync} onSync={() => sync("Codeforces")} loading={loading.codeforces} disabled={!status.platforms?.codeforcesHandle} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_.8fr]">
        <SyncedProblemsTable problems={problems} />
        <SyncHistoryCard history={status.history} />
      </div>
      <ManualImportModal open={manualOpen} onClose={() => setManualOpen(false)} onImport={manualImport} loading={loading.manual} />
    </>
  );
}
