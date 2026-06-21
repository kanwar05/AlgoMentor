import { RefreshCw, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import api from "../api/client";
import ErrorState from "../components/ErrorState";
import Loader from "../components/Loader";
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
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);

  const notify = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4500);
  };

  const load = useCallback(async () => {
    if (demoMode) {
      setLoadError(null);
      setLoading({});
      return;
    }
    setLoading((state) => ({ ...state, initial: true }));
    setLoadError(null);
    try {
      const [statusResponse, problemsResponse] = await Promise.all([
        api.get("/sync/status"),
        api.get("/sync/problems?limit=20")
      ]);
      const nextStatus = statusResponse?.data;
      if (!nextStatus) {
        setStatus({ platforms: {}, counts: {}, history: [] });
        setProblems([]);
        setHandles({ leetcodeUsername: "", codeforcesHandle: "" });
        return;
      }
      setStatus(nextStatus);
      setProblems(problemsResponse?.data?.problems || []);
      setHandles(nextStatus?.platforms || { leetcodeUsername: "", codeforcesHandle: "" });
    } catch (error) {
      setLoadError(error.response?.data?.message || error.message || "Could not load platform sync");
      setStatus({ platforms: {}, counts: {}, history: [] });
      setProblems([]);
    } finally {
      setLoading((state) => ({ ...state, initial: false }));
    }
  }, [demoMode]);

  useEffect(() => { load(); }, [load]);

  const saveHandles = async () => {
    if (demoMode) return notify("Platform connections are disabled in demo mode", "error");
    setLoading((state) => ({ ...state, save: true }));
    try {
      const response = await api.put("/profile/platforms", handles);
      const platforms = response?.data?.platforms || {};
      setStatus((state) => ({ ...state, platforms }));
      updateUser({ ...user, ...platforms });
      notify("Platform handles saved");
    } catch (error) {
      notify(error.response?.data?.message || error.message || "Could not save handles", "error");
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
      const payload = response?.data || {};
      notify(
        payload.complete === false
          ? `${platform}: ${payload.imported || 0} imported; ${payload.missing || 0} older solved problems still need manual import`
          : `${platform}: ${payload.imported || 0} imported, ${payload.skipped || 0} already synced`,
        payload.complete === false ? "error" : "success"
      );
      await load();
    } catch (error) {
      notify(error.response?.data?.message || error.message || `${platform} sync failed`, "error");
    } finally {
      setLoading((state) => ({ ...state, [key]: false }));
    }
  };

  const syncAll = async () => {
    if (demoMode) return notify("Live sync is disabled in demo mode", "error");
    setLoading((state) => ({ ...state, all: true }));
    try {
      const response = await api.post("/sync/all");
      const payload = response?.data || {};
      const failed = payload.results?.filter((item) => !item?.success) || [];
      notify(
        failed.length
          ? `Sync completed with ${failed.length} platform error`
          : payload.complete === false
            ? `Imported ${payload.imported || 0}; ${payload.missing || 0} LeetCode problems still need manual import`
            : `Imported ${payload.imported || 0} new problems`,
        failed.length || payload.complete === false ? "error" : "success"
      );
      await load();
    } catch (error) {
      notify(error.response?.data?.message || error.message || "Platform sync failed", "error");
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
      notify(`${response?.data?.imported || 0} problems imported`);
      setManualOpen(false);
      await load();
    } catch (error) {
      notify(error.response?.data?.message || error.message || "Manual import failed", "error");
    } finally {
      setLoading((state) => ({ ...state, manual: false }));
    }
  };

  const saveAnnotations = async (problemId, annotations) => {
    if (demoMode) {
      setProblems((items) => items.map((problem) =>
        problem._id === problemId ? { ...problem, ...annotations } : problem
      ));
      notify("Synced problem annotations saved");
      return;
    }
    const response = await api.patch(`/sync/problems/${problemId}/annotations`, annotations);
    const updated = response?.data?.problem;
    if (!updated) throw new Error("Updated problem data was not returned");
    setProblems((items) => items.map((problem) => problem._id === problemId ? updated : problem));
    notify("Synced problem annotations saved");
  };

  const header = <PageHeader eyebrow="Automatic tracking" title="Platform Sync" description="Bring accepted submissions into the same analytics, roadmap, and recommendation loop." action={<div className="flex gap-2"><button className="btn-secondary" onClick={() => setManualOpen(true)}><Upload size={16} /> Manual import</button><button className="btn-primary" onClick={syncAll} disabled={loading.all}><RefreshCw size={16} className={loading.all ? "animate-spin" : ""} /> Sync all</button></div>} />;
  if (loading.initial) return <>{header}<Loader message="Loading platform connections…" /></>;
  if (loadError) return <>{header}<ErrorState message={loadError} onRetry={load} /></>;
  const leetcodeCoverage = status?.coverage?.LeetCode;

  return (
    <>
      {toast && <div className={`fixed right-5 top-5 z-[60] max-w-sm rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${toast.type === "error" ? "bg-rose-500" : "bg-emerald-500"}`}>{toast.message}</div>}
      {header}
      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
        Codeforces sync imports the complete accepted history. LeetCode’s public profile API exposes only the latest 20 accepted submissions and the full solved count—not every older problem identity. Use manual import for the remainder; AlgoMentor will deduplicate everything automatically.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PlatformConnectCard platform="LeetCode" value={handles?.leetcodeUsername || ""} onChange={(value) => setHandles({ ...handles, leetcodeUsername: value })} onSave={saveHandles} saving={loading.save} placeholder="your_username" connected={Boolean(status?.platforms?.leetcodeUsername)} />
        <PlatformConnectCard platform="Codeforces" value={handles?.codeforcesHandle || ""} onChange={(value) => setHandles({ ...handles, codeforcesHandle: value })} onSave={saveHandles} saving={loading.save} placeholder="tourist" connected={Boolean(status?.platforms?.codeforcesHandle)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SyncStatusCard platform="LeetCode" count={status?.counts?.LeetCode} lastSync={status?.platforms?.lastLeetCodeSync} onSync={() => sync("LeetCode")} loading={loading.leetcode} disabled={!status?.platforms?.leetcodeUsername} warning={leetcodeCoverage && !leetcodeCoverage.complete ? `${leetcodeCoverage.missing} solved problems remain. Use “Manual import” once to export and upload your complete LeetCode history.` : ""} />
        <SyncStatusCard platform="Codeforces" count={status?.counts?.Codeforces} lastSync={status?.platforms?.lastCodeforcesSync} onSync={() => sync("Codeforces")} loading={loading.codeforces} disabled={!status?.platforms?.codeforcesHandle} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_.8fr]">
        <SyncedProblemsTable problems={problems} onSaveAnnotations={saveAnnotations} />
        <SyncHistoryCard history={status?.history || []} />
      </div>
      <ManualImportModal open={manualOpen} onClose={() => setManualOpen(false)} onImport={manualImport} loading={loading.manual} />
    </>
  );
}
