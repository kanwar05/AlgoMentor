import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function EmptyState({
  title = "Your practice data starts here",
  description = "Add your first solved problem to unlock personalized analytics.",
  link = "/app/problems/new",
  actionLabel = "Add a problem"
}) {
  return (
    <div className="card grid min-h-72 place-items-center text-center">
      <div>
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-lime-400/30"><Sparkles /></span>
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{description}</p>
        {link && <Link to={link} className="btn-primary mt-5">{actionLabel}</Link>}
      </div>
    </div>
  );
}
