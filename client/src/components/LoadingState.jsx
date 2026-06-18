export default function LoadingState() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
        Building your insights…
      </div>
    </div>
  );
}
