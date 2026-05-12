'use client';

import { useState } from 'react';
import { ConfidenceBar } from '../Charts';
import { Icon, type IconName } from '../Icon';

type InsightKind = 'pattern' | 'insight' | 'lever';
type FilterId = 'all' | 'insights' | 'patterns' | 'levers';

interface InsightItem {
  id: string;
  kind: InsightKind;
  age: string;
  icon: IconName;
  title: string;
  text: string;
  conf: number;
}

interface InsightsScreenProps {
  onOpenInsight: (id: string) => void;
}

// Demo content. Real ai_interpretation events follow in Phase 3.
const ITEMS: InsightItem[] = [
  {
    id: 'sleep-training',
    kind: 'pattern',
    age: 'vor 2 Tagen',
    icon: 'moon',
    title: 'Muster erkannt',
    text: 'Dein Schlaf hat einen starken Einfluss auf deine Trainingsleistung.',
    conf: 0.82,
  },
  {
    id: 'steps-recovery',
    kind: 'insight',
    age: 'vor 3 Tagen',
    icon: 'footprints',
    title: 'Neue Erkenntnis',
    text: 'An Tagen mit mehr Schritten ist deine Regeneration besser.',
    conf: 0.74,
  },
  {
    id: 'sleep-consistency',
    kind: 'lever',
    age: 'vor 5 Tagen',
    icon: 'sun',
    title: 'Hebel identifiziert',
    text: 'Mehr Konsistenz bei der Schlafenszeit könnte deinen Fortschritt beschleunigen.',
    conf: 0.69,
  },
  {
    id: 'protein-window',
    kind: 'pattern',
    age: 'vor 7 Tagen',
    icon: 'pulse',
    title: 'Muster erkannt',
    text: 'Frühes Frühstück mit Protein korreliert mit weniger Heißhunger am Abend.',
    conf: 0.71,
  },
  {
    id: 'cardio-mood',
    kind: 'insight',
    age: 'vor 11 Tagen',
    icon: 'flame',
    title: 'Neue Erkenntnis',
    text: 'Kurzes Cardio (10–15 Min) am Morgen scheint dein Stresslevel zu senken.',
    conf: 0.66,
  },
];

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'insights', label: 'Erkenntnisse' },
  { id: 'patterns', label: 'Muster' },
  { id: 'levers', label: 'Hebel' },
];

export function InsightsScreen({ onOpenInsight }: InsightsScreenProps) {
  const [filter, setFilter] = useState<FilterId>('all');

  const filtered = ITEMS.filter((i) => {
    if (filter === 'all') return true;
    if (filter === 'insights') return i.kind === 'insight';
    if (filter === 'patterns') return i.kind === 'pattern';
    if (filter === 'levers') return i.kind === 'lever';
    return true;
  });

  return (
    <div className="screen-content scroll">
      <div
        style={{
          padding: '64px 22px 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ width: 24 }} />
        <div
          style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 15, color: 'var(--ink)' }}
        >
          Insights
        </div>
        <div style={{ color: 'var(--ink-3)', fontSize: 18, letterSpacing: '0.1em' }}>···</div>
      </div>

      {/* Filter pills */}
      <div
        className="pad-x"
        style={{
          marginTop: 16,
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {FILTERS.map((f) => (
          <button
            type="button"
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`filter-pill pressable ${filter === f.id ? 'active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {/* TODO: live data — currently placeholder */}
      <div className="pad-x" style={{ marginTop: 12 }}>
        {filtered.map((it, i) => (
          <InsightCard key={it.id} item={it} idx={i} onClick={() => onOpenInsight(it.id)} />
        ))}
      </div>

      {/* Confidence note */}
      <div className="pad-x" style={{ marginTop: 6, marginBottom: 32 }}>
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 16,
            background: 'var(--surface-2)',
            border: '0.5px dashed var(--hairline-strong)',
            color: 'var(--ink-3)',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          Hinweis · Erkenntnisse basieren auf deinen eigenen Daten. Konfidenz steigt, je länger die
          App lernt.
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  item,
  idx,
  onClick,
}: {
  item: InsightItem;
  idx: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="card pressable rise"
      onClick={onClick}
      style={{
        marginBottom: 10,
        animationDelay: `${idx * 50}ms`,
        padding: 18,
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
        color: 'inherit',
      }}
    >
      <div className="row-between" style={{ marginBottom: 10 }}>
        <div className="row gap-2" style={{ color: 'var(--ink-3)' }}>
          <KindDot kind={item.kind} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>{item.title}</span>
        </div>
        <span className="mono-sm" style={{ color: 'var(--ink-4)' }}>
          {item.age}
        </span>
      </div>
      <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
        <div
          style={{
            flex: 1,
            fontFamily: 'var(--serif)',
            fontSize: 17,
            lineHeight: 1.3,
            color: 'var(--ink)',
          }}
        >
          {item.text}
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--surface-2)',
            color: 'var(--ink-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name={item.icon} size={20} strokeWidth={1.5} />
        </div>
      </div>
      <div className="row-between" style={{ marginTop: 12 }}>
        <div className="row gap-2" style={{ color: 'var(--ink-2)', fontSize: 13, fontWeight: 500 }}>
          Mehr dazu <Icon name="arrow-right" size={14} strokeWidth={2} />
        </div>
        <div
          className="row gap-2"
          style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}
        >
          <ConfidenceBar value={item.conf} /> {Math.round(item.conf * 100)}%
        </div>
      </div>
    </button>
  );
}

function KindDot({ kind }: { kind: InsightKind }) {
  const colors: Record<InsightKind, string> = {
    pattern: 'var(--sage)',
    insight: 'var(--amber)',
    lever: 'var(--sage-deep)',
  };
  return (
    <span
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: 3,
        background: colors[kind],
      }}
    />
  );
}
