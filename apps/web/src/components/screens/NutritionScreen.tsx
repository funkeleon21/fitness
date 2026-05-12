'use client';

import { Icon } from '../Icon';
import type { LogMode } from './LogSheet';

interface NutritionScreenProps {
  onOpenLog: (mode: LogMode) => void;
}

// Static demo meals — replaced once Phase 2 (ingestion) goes live
const DEMO_MEALS: {
  label: string;
  time: string;
  kcal: number;
  protein: number;
  source: 'voice' | 'photo' | 'text';
  confidence: number;
}[] = [
  {
    label: 'Haferflocken mit Beeren und Skyr',
    time: '08:12',
    kcal: 420,
    protein: 32,
    source: 'text',
    confidence: 0.92,
  },
  {
    label: 'Hähnchen-Reis-Bowl mit Brokkoli',
    time: '12:45',
    kcal: 612,
    protein: 48,
    source: 'voice',
    confidence: 0.78,
  },
];

export function NutritionScreen({ onOpenLog }: NutritionScreenProps) {
  const total = DEMO_MEALS.reduce((s, m) => s + m.kcal, 0);
  const proteinTotal = DEMO_MEALS.reduce((s, m) => s + m.protein, 0);
  const proteinTarget = 145;

  return (
    <div className="screen-content scroll">
      <Header title="Ernährung" />

      {/* Pattern card */}
      {/* TODO: live data — currently placeholder */}
      <div className="pad-x" style={{ marginTop: 18 }}>
        <div className="card pressable rise" style={{ overflow: 'hidden', position: 'relative' }}>
          <svg
            width="110"
            height="110"
            style={{ position: 'absolute', right: -4, bottom: -6, opacity: 0.9 }}
            viewBox="0 0 120 120"
            fill="none"
            role="img"
            aria-label="Bowl-Illustration"
          >
            <title>Bowl</title>
            <ellipse cx="60" cy="86" rx="44" ry="14" fill="#D8CFA5" opacity="0.5" />
            <path d="M16 78c0 18 20 28 44 28s44-10 44-28H16z" fill="#E2D8AC" />
            <path
              d="M16 78c0 18 20 28 44 28s44-10 44-28H16z"
              stroke="#9C8E5A"
              strokeOpacity="0.3"
              strokeWidth="0.8"
            />
            <circle cx="44" cy="74" r="6" fill="#8A9466" />
            <circle cx="62" cy="70" r="7" fill="#6E7A4E" />
            <circle cx="78" cy="74" r="5" fill="#B2BC8E" />
            <path
              d="M50 64c2-4 6-6 10-4"
              stroke="#6E7A4E"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          <div style={{ maxWidth: '62%' }}>
            <div className="label" style={{ marginBottom: 6 }}>
              Ernährungsmuster
            </div>
            <div className="h-card" style={{ fontSize: 19, lineHeight: 1.22 }}>
              Du isst sehr ausgewogen und erreichst dein Protein-Ziel an 80&nbsp;% der Tage.
            </div>
            <div
              className="row gap-2"
              style={{ marginTop: 16, color: 'var(--ink-2)', fontSize: 13, fontWeight: 500 }}
            >
              Analyse ansehen <Icon name="arrow-right" size={14} strokeWidth={2} />
            </div>
          </div>
        </div>
      </div>

      {/* Today summary */}
      <div className="pad-x" style={{ marginTop: 12 }}>
        {/* TODO: live data — currently placeholder */}
        <div className="card rise" style={{ animationDelay: '60ms' }}>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div className="h-card" style={{ fontSize: 17 }}>
              Heute
            </div>
            <span className="mono-sm" style={{ color: 'var(--ink-3)' }}>
              {total.toLocaleString('de-DE')} KCAL
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <Macro
              label="Protein"
              value={`${proteinTotal} g`}
              pct={(proteinTotal / proteinTarget) * 100}
              color="var(--sage)"
            />
            <Macro label="Kohlenh." value="187 g" pct={62} color="var(--amber-soft)" />
            <Macro label="Fett" value="64 g" pct={48} color="var(--sage-soft)" />
          </div>
        </div>
      </div>

      {/* Meals list */}
      <div className="pad-x" style={{ marginTop: 12 }}>
        {/* TODO: live data — currently placeholder */}
        <div className="card rise" style={{ animationDelay: '120ms' }}>
          <div className="row-between" style={{ marginBottom: 4 }}>
            <div className="h-card" style={{ fontSize: 17 }}>
              Deine Mahlzeiten
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            {DEMO_MEALS.map((m, i) => (
              <div
                key={`${m.label}-${m.time}`}
                style={{
                  padding: '12px 0',
                  borderBottom: i < DEMO_MEALS.length - 1 ? '0.5px solid var(--hairline)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'var(--surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ink-3)',
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    name={m.source === 'photo' ? 'camera' : m.source === 'voice' ? 'mic' : 'text'}
                    size={16}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>
                    {m.label}
                  </div>
                  <div className="mono-sm" style={{ marginTop: 2 }}>
                    {m.time} · {m.kcal} kcal · {m.protein}g P
                  </div>
                </div>
                {m.confidence < 0.9 && (
                  <span
                    className="pill"
                    style={{
                      fontSize: 11,
                      padding: '4px 8px',
                      background: 'rgba(196,152,85,0.14)',
                      color: 'var(--amber)',
                    }}
                  >
                    ungefähr
                  </span>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onOpenLog('meal')}
            className="pressable"
            style={{
              marginTop: 14,
              width: '100%',
              background: 'transparent',
              color: 'var(--ink-2)',
              border: '0.5px dashed var(--hairline-strong)',
              borderRadius: 12,
              padding: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontFamily: 'var(--sans)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Icon name="plus" size={16} strokeWidth={2} /> Mahlzeit hinzufügen
          </button>
        </div>
      </div>

      {/* Food memory */}
      <div className="pad-x" style={{ marginTop: 12, marginBottom: 32 }}>
        {/* TODO: live data — currently placeholder */}
        <div className="card rise" style={{ animationDelay: '180ms' }}>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div>
              <div className="h-card" style={{ fontSize: 17 }}>
                Food Memory
              </div>
              <div style={{ color: 'var(--ink-4)', fontSize: 12, marginTop: 4 }}>
                Dinge, die du oft isst
              </div>
            </div>
            <Icon name="chevron-right" size={18} />
          </div>
          <div className="chip-row" style={{ marginTop: 4 }}>
            {[
              'Haferflocken mit Beeren',
              'Skyr 500g',
              'Hähnchen-Reis-Bowl',
              'Lachs & Brokkoli',
              'Magerquark',
            ].map((c) => (
              <span
                key={c}
                className="pill"
                style={{ background: 'var(--surface-2)', fontSize: 12 }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
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
        {title}
      </div>
      <div style={{ color: 'var(--ink-3)', fontSize: 18, letterSpacing: '0.1em' }}>···</div>
    </div>
  );
}

function Macro({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '12px' }}>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-4)',
          letterSpacing: '0.04em',
        }}
      >
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 18,
          color: 'var(--ink)',
          marginTop: 4,
        }}
      >
        {value}
      </div>
      <div className="progress" style={{ height: 4, marginTop: 8 }}>
        <span style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
    </div>
  );
}
