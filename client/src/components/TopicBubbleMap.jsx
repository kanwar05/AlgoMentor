import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const WIDTH = 900;
const HEIGHT = 500;

const palette = {
  strong: { fill: "#34d399", stroke: "#059669" },
  revision: { fill: "#fbbf24", stroke: "#d97706" },
  weak: { fill: "#fb7185", stroke: "#e11d48" },
  lowData: { fill: "#94a3b8", stroke: "#64748b" }
};

export function getTopicTone(topic) {
  if (topic.solved < 3) return "lowData";
  if (topic.strengthScore >= 75) return "strong";
  if (topic.strengthScore >= 45) return "revision";
  return "weak";
}

export function getTopicProblemsPath(name) {
  return `/app/problems?topic=${encodeURIComponent(name)}`;
}

export function layoutTopicBubbles(topics) {
  if (!topics.length) return [];
  const maxSolved = Math.max(...topics.map((topic) => topic.solved), 1);
  const ordered = [...topics].sort((a, b) => b.solved - a.solved || a.name.localeCompare(b.name));
  const columns = Math.max(1, Math.ceil(Math.sqrt(topics.length * (WIDTH / HEIGHT))));
  const rows = Math.ceil(topics.length / columns);
  const cellWidth = WIDTH / columns;
  const cellHeight = HEIGHT / rows;
  const maxRadius = Math.max(24, Math.min(82, (Math.min(cellWidth, cellHeight) / 2) - 8));
  const minRadius = Math.max(16, maxRadius * 0.42);
  const cells = Array.from({ length: topics.length }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = (column + 0.5) * cellWidth;
    const y = (row + 0.5) * cellHeight;
    return { x, y, centerDistance: Math.hypot(x - WIDTH / 2, y - HEIGHT / 2) };
  }).sort((a, b) => a.centerDistance - b.centerDistance || a.y - b.y || a.x - b.x);

  return ordered.map((topic, index) => ({
    ...topic,
    x: cells[index].x,
    y: cells[index].y,
    r: minRadius + Math.sqrt(topic.solved / maxSolved) * (maxRadius - minRadius)
  }));
}

function BubbleLabel({ name, r }) {
  const words = name.split(" ");
  const lines = name.length > 13 && words.length > 1
    ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")]
    : [name];
  const fontSize = Math.max(9, Math.min(15, r / 4.3));

  return (
    <text textAnchor="middle" className="pointer-events-none select-none fill-white font-bold" style={{ fontSize }}>
      {lines.map((line, index) => (
        <tspan key={line} x="0" dy={index === 0 ? (lines.length > 1 ? "-0.2em" : "0.35em") : "1.15em"}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

export default function TopicBubbleMap({ topics = [] }) {
  const navigate = useNavigate();
  const [activeTopic, setActiveTopic] = useState(null);
  const bubbles = useMemo(() => layoutTopicBubbles(topics), [topics]);

  if (!topics.length) {
    return (
      <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:bg-white/[.025]">
        Solve problems to build your topic mastery map.
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="min-h-[320px] w-full overflow-visible"
        role="img"
        aria-label="Solved topic mastery bubble map"
        onMouseLeave={() => setActiveTopic(null)}
      >
        {bubbles.map((topic) => {
          const tone = getTopicTone(topic);
          const color = palette[tone];
          return (
            <g
              key={topic.name}
              transform={`translate(${topic.x} ${topic.y})`}
              role="button"
              tabIndex="0"
              aria-label={`${topic.name}: ${topic.solved} solved, strength ${topic.strengthScore}`}
              className="cursor-pointer outline-none transition-opacity hover:opacity-90 focus:opacity-90"
              onMouseEnter={() => setActiveTopic(topic)}
              onFocus={() => setActiveTopic(topic)}
              onBlur={() => setActiveTopic(null)}
              onClick={() => navigate(getTopicProblemsPath(topic.name))}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(getTopicProblemsPath(topic.name));
                }
              }}
            >
              <circle r={topic.r} fill={color.fill} fillOpacity={0.88} stroke={color.stroke} strokeWidth="3" />
              <BubbleLabel name={topic.name} r={topic.r} />
              {topic.r >= 45 && <text y={topic.r * 0.48} textAnchor="middle" className="pointer-events-none fill-white/80 text-[10px] font-semibold">{topic.solved} solved</text>}
            </g>
          );
        })}
      </svg>

      {activeTopic && (
        <div role="tooltip" className="pointer-events-none absolute left-3 top-3 z-10 w-64 rounded-2xl border bg-white/95 p-4 text-xs shadow-soft backdrop-blur dark:bg-[#202228]/95">
          <div className="flex items-start justify-between gap-3">
            <div><p className="font-display text-sm font-extrabold">{activeTopic.name}</p><p className="mt-0.5 text-slate-400">{activeTopic.solved} solved</p></div>
            <span className="rounded-full bg-violet-100 px-2 py-1 font-extrabold text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">{activeTopic.strengthScore}%</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">Easy<br /><b>{activeTopic.easy}</b></span>
            <span className="rounded-lg bg-amber-50 p-2 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">Medium<br /><b>{activeTopic.medium}</b></span>
            <span className="rounded-lg bg-rose-50 p-2 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">Hard<br /><b>{activeTopic.hard}</b></span>
          </div>
          <p className="mt-3 text-slate-500">Strong {activeTopic.strong} · Revision {activeTopic.revision} · Weak {activeTopic.weak}</p>
          {activeTopic.averageConfidence !== null && <p className="mt-1 text-slate-500">Average confidence {activeTopic.averageConfidence}%</p>}
        </div>
      )}
    </div>
  );
}
