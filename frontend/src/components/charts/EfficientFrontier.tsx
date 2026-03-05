import { line, scaleLinear } from "d3";
import { useMemo, useState } from "react";

export interface FrontierPoint {
  id: string;
  risk: number;
  expectedNpv: number;
  capitalDeployed?: number;
}

interface EfficientFrontierProps {
  points: FrontierPoint[];
  width?: number;
  height?: number;
  onSelectPoint?: (point: FrontierPoint) => void;
}

export function EfficientFrontier({
  points,
  width = 760,
  height = 360,
  onSelectPoint,
}: EfficientFrontierProps) {
  const [hovered, setHovered] = useState<FrontierPoint | null>(null);
  const margin = { top: 24, right: 20, bottom: 36, left: 58 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const sorted = useMemo(() => [...points].sort((a, b) => a.risk - b.risk), [points]);

  const x = scaleLinear()
    .domain([Math.min(...sorted.map((p) => p.risk), 0), Math.max(...sorted.map((p) => p.risk), 1)])
    .nice()
    .range([0, innerW]);

  const y = scaleLinear()
    .domain([Math.min(...sorted.map((p) => p.expectedNpv), 0), Math.max(...sorted.map((p) => p.expectedNpv), 1)])
    .nice()
    .range([innerH, 0]);

  const frontierPath = line<FrontierPoint>()
    .x((d) => x(d.risk))
    .y((d) => y(d.expectedNpv))(sorted);

  if (sorted.length === 0) {
    return <div className="text-slate-400">No frontier data.</div>;
  }

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto rounded-lg bg-slate-900/60 border border-slate-800">
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#334155" />
          <line x1={0} y1={0} x2={0} y2={innerH} stroke="#334155" />

          <path d={frontierPath ?? ""} fill="none" stroke="#2FA7FF" strokeWidth={2.5} />

          {sorted.map((p) => (
            <circle
              key={p.id}
              cx={x(p.risk)}
              cy={y(p.expectedNpv)}
              r={hovered?.id === p.id ? 6 : 4}
              fill={hovered?.id === p.id ? "#23D18B" : "#38BDF8"}
              className="transition-all duration-150"
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelectPoint?.(p)}
            />
          ))}

          <text x={innerW / 2} y={innerH + 28} textAnchor="middle" fill="#94A3B8" fontSize={12}>
            Portfolio Risk (StdDev NPV)
          </text>
          <text x={-innerH / 2} y={-40} transform="rotate(-90)" textAnchor="middle" fill="#94A3B8" fontSize={12}>
            Expected Portfolio NPV
          </text>
        </g>
      </svg>

      {hovered ? (
        <div className="absolute right-3 top-3 rounded bg-slate-950/95 border border-slate-700 px-3 py-2 text-xs">
          <div className="font-semibold text-slate-100">{hovered.id}</div>
          <div className="text-slate-300">Risk: {hovered.risk.toLocaleString()}</div>
          <div className="text-slate-300">NPV: {hovered.expectedNpv.toLocaleString()}</div>
          {hovered.capitalDeployed !== undefined ? <div className="text-slate-300">Capital: {hovered.capitalDeployed.toLocaleString()}</div> : null}
        </div>
      ) : null}
    </div>
  );
}