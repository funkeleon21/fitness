import { useId } from 'react';
import type { ReactNode } from 'react';

interface LineChartProps {
  data: number[];
  height?: number;
  color?: string;
  fill?: boolean;
  dots?: boolean;
  labelsX?: string[] | null;
  labelsY?: string[] | null;
  padX?: number;
  padY?: number;
  title?: string;
}

export function LineChart({
  data,
  height = 160,
  color = 'var(--sage)',
  fill = true,
  dots = false,
  labelsX = null,
  labelsY = null,
  padX = 6,
  padY = 10,
  title = 'Verlauf',
}: LineChartProps) {
  const gradId = useId();
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-4)',
          fontSize: 13,
        }}
      >
        Noch keine Daten
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(0.0001, max - min);

  const W = 600;
  const H = 200;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const step = innerW / Math.max(1, data.length - 1);

  const pts = data.map((v, i) => {
    const x = padX + i * step;
    const y = padY + innerH - ((v - min) / range) * innerH;
    return [x, y] as const;
  });

  const firstPoint = pts[0];
  const lastPoint = pts[pts.length - 1];
  if (!firstPoint || !lastPoint) return null;

  const path = pts.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
    const p0 = arr[i - 2] ?? arr[i - 1];
    const p1 = arr[i - 1];
    const p2 = p;
    const p3 = arr[i + 1] ?? p;
    if (!p0 || !p1) return acc;
    const tension = 0.18;
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;
    return `${acc} C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }, '');

  const areaPath = `${path} L ${lastPoint[0].toFixed(2)} ${H - padY} L ${firstPoint[0].toFixed(2)} ${H - padY} Z`;

  const showYAxis = labelsY && labelsY.length > 0;
  const showXAxis = labelsX && labelsX.length > 0;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 8,
        paddingLeft: 4,
        paddingRight: showYAxis ? 0 : 4,
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', height }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            style={{ display: 'block', overflow: 'visible' }}
            role="img"
            aria-label={title}
          >
            <title>{title}</title>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {showYAxis &&
              labelsY.map((_l, i) => {
                const y = padY + (innerH / (labelsY.length - 1)) * i;
                return (
                  <line
                    key={`grid-${i}-${y}`}
                    x1={padX}
                    y1={y}
                    x2={W - padX}
                    y2={y}
                    stroke="rgba(60,50,30,0.07)"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            {fill && <path d={areaPath} fill={`url(#${gradId})`} />}
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {dots &&
              pts.map(([x, y], i) => (
                <circle
                  key={`dot-${i}-${x}`}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="var(--bg-soft)"
                  stroke={color}
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
          </svg>
        </div>
        {showXAxis && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 8,
              paddingLeft: 2,
              paddingRight: 2,
            }}
          >
            {labelsX.map((l, i) => (
              <span
                key={`x-${i}-${l}`}
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--ink-4)',
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                }}
              >
                {l}
              </span>
            ))}
          </div>
        )}
      </div>
      {showYAxis && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            paddingTop: padY * (height / H),
            paddingBottom: padY * (height / H) + (showXAxis ? 22 : 0),
            minWidth: 22,
          }}
        >
          {labelsY.map((l, i) => (
            <span
              key={`y-${i}-${l}`}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: 'var(--ink-4)',
                letterSpacing: '0.02em',
                textAlign: 'right',
                lineHeight: 1,
              }}
            >
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface SparklineProps {
  data: number[];
  height?: number;
  color?: string;
  title?: string;
}

export function Sparkline({
  data,
  height = 56,
  color = 'var(--sage)',
  title = 'Sparkline',
}: SparklineProps) {
  return (
    <LineChart
      data={data}
      height={height}
      color={color}
      fill={true}
      dots={false}
      padX={2}
      padY={4}
      title={title}
    />
  );
}

interface BarChartProps {
  data: number[];
  height?: number;
  color?: string;
  muted?: string;
  title?: string;
}

export function BarChart({
  data,
  height = 130,
  color = 'var(--sage-deep)',
  muted = 'var(--sage-soft)',
  title = 'Balkendiagramm',
}: BarChartProps) {
  const max = Math.max(...data);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height,
        gap: 6,
        padding: '4px 4px 0',
      }}
      role="img"
      aria-label={title}
    >
      {data.map((v, i) => {
        const h = Math.max(6, (v / max) * (height - 8));
        const isPeak = v === max;
        const recent = i > data.length - 4;
        return (
          <div
            key={`bar-${i}-${v}`}
            style={{
              flex: 1,
              height: h,
              background: isPeak || recent ? color : muted,
              opacity: isPeak ? 1 : 0.9,
              borderRadius: 6,
              transition: 'height 600ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          />
        );
      })}
    </div>
  );
}

interface CompositionRowProps {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  pct: number;
  color?: string;
}

export function CompositionRow({
  icon,
  label,
  value,
  unit,
  pct,
  color = 'var(--sage)',
}: CompositionRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0' }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: 'var(--surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-3)',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>{label}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)' }}>
            {value} <span style={{ color: 'var(--ink-4)' }}>{unit}</span>
          </span>
        </div>
        <div className="progress" style={{ height: 4 }}>
          <span style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

interface ConfidenceBarProps {
  value?: number;
  light?: boolean;
}

export function ConfidenceBar({ value = 0.7, light = false }: ConfidenceBarProps) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={`bar-${i}`}
          style={{
            width: 4,
            height: 10,
            borderRadius: 1,
            background:
              i < Math.round(value * 5)
                ? light
                  ? '#C8B98E'
                  : 'var(--sage-deep)'
                : light
                  ? 'rgba(244,239,227,0.18)'
                  : 'var(--surface-3)',
          }}
        />
      ))}
    </span>
  );
}
