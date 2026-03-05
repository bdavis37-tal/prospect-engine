import { max, scaleLinear, scaleBand } from "d3";
import { useMemo, useState } from "react";

export interface TornadoItem {
  variable: string;
  lowNpv: number;
  highNpv: number;
}

interface TornadoChartProps {
  items: TornadoItem[];
  baseCaseNpv: number;
  width?: number;
  height?: number;
}

export function TornadoChart({ items, baseCaseNpv, width = 760, height = 360 }: TornadoChartProps) {
  const [hover, setHover] = useState<TornadoItem | null>(null);
  const margin = { top: 20, right: 20, bottom: 20, left: 160 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const ranked = useMemo(
    () => [...items].sort((a, b) => Math.abs(b.highNpv - b.lowNpv) - Math.abs(a.highNpv - a.lowNpv)).slice(0, 10),
    [items],
  );

  const extent = max(ranked.flatMap((d) => [Math.abs(d.lowNpv - baseCaseNpv), Math.abs(d.highNpv - baseCaseNpv)])) ?? 1;
  const x = scaleLinear().domain([baseCaseNpv - extent, baseCaseNpv + extent]).range([0, innerW]);
  const y = scaleBand().domain(ranked.map((d) => d.variable)).range([0, innerH]).padding(0.18);

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto rounded-lg bg-slate-900/60 border border-slate-800">
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          <line x1={x(baseCaseNpv)} x2={x(baseCaseNpv)} y1={0} y2={innerH} stroke="#94A3B8" strokeDasharray="4 4" />

          {ranked.map((item) => {
            const yPos = y(item.variable) ?? 0;
            const start = x(Math.min(item.lowNpv, item.highNpv));
            const end = x(Math.max(item.lowNpv, item.highNpv));
            return (
              <g key={item.variable} onMouseEnter={() => setHover(item)} onMouseLeave={() => setHover(null)}>
                <rect
                  x={start}
                  y={yPos}
                  width={Math.max(end - start, 1)}
                  height={y.bandwidth()}
                  fill="#2FA7FF"
                  opacity={hover?.variable === item.variable ? 0.95 : 0.75}
                  className="transition-all duration-150"
                />
                <text x={-8} y={yPos + y.bandwidth() / 2 + 4} textAnchor="end" fill="#CBD5E1" fontSize={11}>
                  {item.variable}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {hover ? (
        <div className="absolute right-3 top-3 rounded bg-slate-950/95 border border-slate-700 px-3 py-2 text-xs">
          <div className="font-semibold">{hover.variable}</div>
          <div className="text-slate-300">Low case NPV: {hover.lowNpv.toLocaleString()}</div>
          <div className="text-slate-300">High case NPV: {hover.highNpv.toLocaleString()}</div>
          <div className="text-slate-300">Swing: {Math.abs(hover.highNpv - hover.lowNpv).toLocaleString()}</div>
        </div>
      ) : null}
    </div>
  );
}