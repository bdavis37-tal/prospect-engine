interface DemoBannerProps {
  scenarioName: string;
  onStartOwn: () => void;
  onSwitchDemo: () => void;
}

export function DemoBanner({ scenarioName, onStartOwn, onSwitchDemo }: DemoBannerProps) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-4 px-4 py-1.5 bg-slate-800/70 backdrop-blur border-b border-slate-700/50 text-xs text-slate-400">
      <span>
        Exploring: <strong className="text-slate-200">{scenarioName}</strong>
      </span>
      <span className="text-slate-600">·</span>
      <button onClick={onStartOwn} className="text-drill hover:underline">
        Start Your Own Analysis →
      </button>
      <span className="text-slate-600">·</span>
      <button onClick={onSwitchDemo} className="text-farm hover:underline">
        Switch Demo →
      </button>
    </div>
  );
}
