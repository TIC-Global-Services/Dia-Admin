import { useEffect, useRef, useState } from 'react';

interface Point { day: string; value: number }

const nice = (max: number) => {
  if (max <= 4) return 4; // small counts: 0..4, integers only
  const step = Math.pow(10, Math.floor(Math.log10(max / 4)));
  const unit = [1, 2, 5, 10].find((m) => m * step * 4 >= max) ?? 10;
  return unit * step * 4;
};

/** Columns per day, one hue, square corners, 4 horizontal gridlines, no y axis line. Empty days are drawn as empty. */
export function Columns({ points, label }: { points: Point[]; label: (p: Point) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  // Drawn at the real pixel size of its box, so text is never stretched; the box fills the card.
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 220 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.max(320, Math.round(e.contentRect.width)), h: Math.max(200, Math.round(e.contentRect.height)) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = size.w, H = size.h, L = 34, R = 4, T = 8, B = 24;
  const top = nice(Math.max(...points.map((p) => p.value), 0));
  const iw = W - L - R, ih = H - T - B;
  const slot = iw / points.length;
  const bw = Math.max(4, slot - 6);
  const y = (v: number) => T + ih - (v / top) * ih;
  const ticks = [0, 1, 2, 3, 4].map((i) => (top / 4) * i);
  const every = Math.ceil(points.length / 6);
  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <div ref={box} className="plot-box">
    <svg className="plot" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Orders per day, last 30 days">
      {ticks.map((t) => (
        <g key={t}>
          <line className={t === 0 ? 'base' : 'grid'} x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
          <text x={L - 8} y={y(t) + 4} textAnchor="end">{Number.isInteger(t) ? t : t.toFixed(1)}</text>
        </g>
      ))}
      {points.map((p, i) => {
        const x = L + i * slot + (slot - bw) / 2;
        return (
          <g key={p.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect x={L + i * slot} y={T} width={slot} height={ih} fill="transparent" />
            {p.value > 0 && <rect className={`bar${hover === i ? ' hover' : ''}`} x={x} y={y(p.value)} width={bw} height={y(0) - y(p.value)} />}
            {i % every === 0 && i + every <= points.length + 1 && <text x={x + bw / 2} y={H - 6} textAnchor="middle">{fmt(p.day)}</text>}
          </g>
        );
      })}
      {hover !== null && (
        <text x={Math.min(W - R, Math.max(L + 60, L + hover * slot))} y={T + 12} textAnchor="middle" style={{ fill: 'var(--text)', fontWeight: 500 }}>
          {label(points[hover])}
        </text>
      )}
    </svg>
    </div>
  );
}