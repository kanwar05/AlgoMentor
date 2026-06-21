export default function Loader({ message = "Building your insights…" }) {
  return (
    <div className="card grid min-h-[50vh] place-items-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" aria-hidden="true" />
        {message}
      </div>
    </div>
  );
}
