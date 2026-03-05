import { bin, max, min, scaleLinear } from "d3";
import { useMemo, useState } from "react";

interface DistributionHistogramProps {
  values: number[];
  width?: number;
  height?: number;
  bins?: number;
}

export function DistributionHistogram({ values, width = 760, height = 320, bins = 24 }: DistributionHistogramProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const margin = { top: 20, right: 20, bottom: 30, left: 52 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const minVal = min(values) ?? 0;
  const maxVal = max(values) ?? 1;
  const x = scaleLinear().domain([minVal, maxVal]).nice().range([0, innerW]);

  const binsData = useMemo(() => bin().domain(x.domain() as [number, number]).thresholds(bins)(values), [values, bins, x]);
  const y = scaleLinear().domain([0, max(binsData, (d) => d.length) ?? 1]).nice().range([innerH, 0]);

  const p10 = values.length ? values.slice().sort((a, b) => a - b)[Math.floor(values.length * 0.9)] : 0;
  const p50 = values.length ? values.slice().sort((a, b) => a - b)[Math.floor(values.length * 0.5)] : 0;
  const p90 = values.length ? values.slice().sort((a, b) => a - b)[Math.floor(values.length * 0.1)] : 0;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto rounded-lg bg-slate-900/60 border border-slate-800">
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#334155" />
          <line x1={0} y1={0} x2={0} y2={innerH} stroke="#334155" />

          {binsData.map((b, i) => {
            const barX = x(b.x0 ?? 0) + 1;
            const barW = Math.max(0, x(b.x1 ?? 0) - x(b.x0 ?? 0) - 2);
            const barY = y(b.length);
            const barH = innerH - barY;
            return (
              <rect
                key={`${b.x0}-${b.x1}`}
                x={barX}
                y={barY}
                width={barW}
                height={barH}
                fill={hoverIndex === i ? "#23D18B" : "#2FA7FF"}
                opacity={0.8}
                className="transition-colors duration-150"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            );
          })}

          {[{ label: "P10", v: p10 }, { label: "P50", v: p50 }, { label: "P90", v: p90 }].map((lineDef) => (
            <g key={lineDef.label}>
              <line x1={x(lineDef.v)} x2={x(lineDef.v)} y1={0} y2={innerH} stroke="#F59E0B" strokeDasharray="4 4" />
              <text x={x(lineDef.v) + 4} y={12} fill="#FCD34D" fontSize={10}>
                {lineDef.label}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {hoverIndex !== null ? (
        <div className="absolute right-3 top-3 rounded bg-slate-950/95 border border-slate-700 px-3 py-2 text-xs">
          <div className="text-slate-300">
            Range: {Math.round(binsData[hoverIndex].x0 ?? 0).toLocaleString()} to {Math.round(binsData[hoverIndex].x1 ?? 0).toLocaleString()}
          </div>
          <div className="text-slate-100 font-semibold">Count: {binsData[hoverIndex].length}</div>
        </div>
      ) : null}
    </div>
  );
}