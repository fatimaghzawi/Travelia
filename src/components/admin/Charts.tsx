"use client";

import { Plane } from "lucide-react";

const RING_COLORS = ["#127E83", "#51A5D6", "#34BDAF"];

export function ProgressRing({
  percent,
  label,
  sublabel,
  colorIndex = 0,
}: {
  percent: number;
  label: string;
  sublabel?: string;
  colorIndex?: number;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;
  const color = RING_COLORS[colorIndex % RING_COLORS.length];

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex h-[104px] w-[104px] items-center justify-center">
        <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90">
          <circle cx="52" cy="52" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="9" />
          <circle
            cx="52"
            cy="52"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <Plane className="mb-0.5 h-4 w-4" style={{ color }} />
          <span className="text-lg font-semibold text-ink">{percent}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-ink">{label}</p>
        {sublabel ? <p className="text-xs text-ink-soft">{sublabel}</p> : null}
      </div>
    </div>
  );
}

export function MoodBars({ data }: { data: { name: string; percent: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-ink-soft">No mood tags assigned to destinations yet.</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((mood) => (
        <div key={mood.name}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-ink">{mood.name}</span>
            <span className="text-ink-muted">{mood.percent}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-muted">
            <div className="h-2 rounded-full bg-teal-500" style={{ width: `${mood.percent}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Compass "fan" gauge — a 180° arc split into wedges, one per mood, sized by percent.
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function wedgePath(cx: number, cy: number, rInner: number, rOuter: number, startDeg: number, endDeg: number) {
  const outerStart = polarToCartesian(cx, cy, rOuter, startDeg);
  const outerEnd = polarToCartesian(cx, cy, rOuter, endDeg);
  const innerStart = polarToCartesian(cx, cy, rInner, endDeg);
  const innerEnd = polarToCartesian(cx, cy, rInner, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
}

const MOOD_SHADES = ["#012A3E", "#127E83", "#34BDAF", "#51A5D6"];

export function MoodArcGauge({ data }: { data: { name: string; percent: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-ink-soft">No mood tags assigned to destinations yet.</p>;
  }

  const cx = 150;
  const cy = 140;
  const rOuter = 130;
  const rInner = 78;
  const total = data.reduce((sum, d) => sum + d.percent, 0) || 1;

  const segments = data.reduce<
    { name: string; percent: number; path: string; labelPoint: { x: number; y: number } }[]
  >((acc, mood) => {
    const cursor = acc.length > 0 ? -180 + acc.reduce((s, seg) => s + (seg.percent / total) * 180, 0) : -180;
    const sweep = (mood.percent / total) * 180;
    const start = cursor;
    const end = cursor + sweep;
    const mid = (start + end) / 2;
    const labelPoint = polarToCartesian(cx, cy, (rOuter + rInner) / 2, mid);
    acc.push({ ...mood, path: wedgePath(cx, cy, rInner, rOuter, start, end), labelPoint });
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 160" className="w-full max-w-[300px]">
        {segments.map((seg, i) => (
          <path key={seg.name} d={seg.path} fill={MOOD_SHADES[i % MOOD_SHADES.length]} />
        ))}
        {segments.map((seg) => (
          <text
            key={`${seg.name}-label`}
            x={seg.labelPoint.x}
            y={seg.labelPoint.y - 4}
            textAnchor="middle"
            className="fill-white text-[10px] font-medium"
          >
            {seg.name}
          </text>
        ))}
        {segments.map((seg) => (
          <text
            key={`${seg.name}-percent`}
            x={seg.labelPoint.x}
            y={seg.labelPoint.y + 10}
            textAnchor="middle"
            className="fill-white text-[11px] font-semibold"
          >
            {seg.percent}%
          </text>
        ))}
        <circle cx={cx} cy={cy} r={18} fill="var(--color-navy-900)" />
        <path
          d={`M ${cx - 6} ${cy} L ${cx} ${cy - 8} L ${cx + 6} ${cy} L ${cx} ${cy + 8} Z`}
          fill="var(--color-teal-400)"
        />
      </svg>
    </div>
  );
}
