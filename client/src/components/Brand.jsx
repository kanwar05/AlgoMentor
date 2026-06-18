import { Braces } from "lucide-react";
import { Link } from "react-router-dom";

export default function Brand({ compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-lime-400 dark:bg-lime-400 dark:text-ink">
        <Braces size={20} strokeWidth={2.5} />
      </span>
      {!compact && <span className="font-display text-lg font-extrabold tracking-tight">AlgoMentor</span>}
    </Link>
  );
}
