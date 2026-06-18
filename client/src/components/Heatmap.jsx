export default function Heatmap({ activity = [] }) {
  const data = activity.slice(-105);
  return (
    <div>
      <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-2">
        {data.map((day) => (
          <div
            key={day.date}
            title={`${day.date}: ${day.count} solved`}
            data-level={Math.min(day.count, 4)}
            className="heat-cell h-3.5 w-3.5 rounded-[3px] bg-slate-100"
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>15 weeks of practice</span>
        <span className="flex items-center gap-1.5">Less {[0, 1, 2, 3, 4].map((level) => <i key={level} data-level={level} className="heat-cell h-3 w-3 rounded-[3px] bg-slate-100" />)} More</span>
      </div>
    </div>
  );
}
