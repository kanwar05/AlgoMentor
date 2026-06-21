import { CircleAlert, RefreshCw } from "lucide-react";

export default function ErrorState({
  title = "Something went wrong",
  message = "Failed to load data",
  onRetry
}) {
  return (
    <div className="card grid min-h-72 place-items-center text-center" role="alert">
      <div>
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300">
          <CircleAlert />
        </span>
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{message}</p>
        {onRetry && (
          <button type="button" className="btn-primary mt-5" onClick={onRetry}>
            <RefreshCw size={16} /> Try again
          </button>
        )}
      </div>
    </div>
  );
}
