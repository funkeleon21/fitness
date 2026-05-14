'use client';

import { DEFAULT_TARGETS, type TargetSpec, formatTodayHeading } from '@/lib/nutrition';
import { Icon, type IconName } from '../Icon';
import type { MealDayTotals } from '../types';

interface MacroDetailSheetProps {
  totals: MealDayTotals;
  onClose: () => void;
}

export function MacroDetailSheet({ totals, onClose }: MacroDetailSheetProps) {
  return (
    <button
      type="button"
      className="sheet-backdrop"
      onClick={onClose}
      aria-label="Schließen"
      style={{ border: 'none', cursor: 'default', padding: 0 }}
    >
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        // biome-ignore lint/a11y/useSemanticElements: bottom-sheet without native <dialog> lifecycle
        role="dialog"
        aria-modal="true"
      >
        <div className="sheet-handle" />
        <div className="row-between" style={{ marginBottom: 14 }}>
          <div>
            <div className="h-card" style={{ fontSize: 22 }}>
              Tagesnährwerte
            </div>
            <div style={{ marginTop: 2, color: 'var(--ink-3)', fontSize: 13 }}>
              {formatTodayHeading()}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="pressable"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--surface-2)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-3)',
              cursor: 'pointer',
            }}
          >
            <Icon name="x" size={14} strokeWidth={2} />
          </button>
        </div>

        <KcalBlock value={totals.kcal} target={DEFAULT_TARGETS.kcal} />

        <SectionHeading>Makronährstoffe</SectionHeading>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <NutrientRow
            icon="leaf"
            label="Protein"
            value={totals.protein_g}
            target={DEFAULT_TARGETS.protein_g}
            unit="g"
          />
          <NutrientRow
            icon="wheat"
            label="Kohlenhydrate"
            value={totals.carbs_g}
            target={DEFAULT_TARGETS.carbs_g}
            unit="g"
          />
          <NutrientRow
            icon="droplet"
            label="Fett"
            value={totals.fat_g}
            target={DEFAULT_TARGETS.fat_g}
            unit="g"
          />
        </div>

        <SectionHeading>Energie-Verteilung</SectionHeading>
        <EnergyDistribution totals={totals} />

        <SectionHeading>Weitere Nährwerte</SectionHeading>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <NutrientRow
            icon="droplet"
            label="Zucker"
            value={totals.sugar_g}
            target={DEFAULT_TARGETS.sugar_g}
            unit="g"
          />
          <NutrientRow
            icon="leaf"
            label="Ballaststoffe"
            value={totals.fiber_g}
            target={DEFAULT_TARGETS.fiber_g}
            unit="g"
          />
          <NutrientRow
            icon="droplet"
            label="ges. Fettsäuren"
            value={totals.saturated_fat_g}
            target={DEFAULT_TARGETS.saturated_fat_g}
            unit="g"
          />
          <NutrientRow
            icon="droplet"
            label="Salz"
            value={totals.salt_g}
            target={DEFAULT_TARGETS.salt_g}
            unit="g"
            precision={1}
          />
        </div>

        <div
          style={{
            marginTop: 18,
            padding: '10px 12px',
            background: 'var(--surface-2)',
            borderRadius: 10,
            fontSize: 11,
            color: 'var(--ink-4)',
            lineHeight: 1.45,
          }}
        >
          Detail-Werte sind optional pro Mahlzeit erfassbar. Wenn unbekannt, lass sie weg —
          Schätzungen sind nichts wert.
        </div>
      </div>
    </button>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 18,
        marginBottom: 10,
        fontFamily: 'var(--mono)',
        fontSize: 10.5,
        letterSpacing: '0.08em',
        color: 'var(--ink-4)',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  );
}

function KcalBlock({ value, target }: { value: number; target: TargetSpec }) {
  const pct = target.value > 0 ? (value / target.value) * 100 : 0;
  const clamped = Math.min(100, pct);
  const remaining = Math.max(0, target.value - value);
  return (
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: 14,
        padding: '18px 18px',
        border: '0.5px solid var(--hairline)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Icon name="flame" size={16} stroke="var(--sage-deep)" strokeWidth={1.6} />
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '0.06em',
            color: 'var(--ink-3)',
          }}
        >
          KALORIEN
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 36,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {value.toLocaleString('de-DE')}
        </div>
        <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>
          / {target.value.toLocaleString('de-DE')} kcal
        </div>
      </div>
      <div className="progress" style={{ height: 6, marginTop: 12 }}>
        <span style={{ width: `${clamped}%` }} />
      </div>
      <div
        style={{
          marginTop: 8,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'var(--ink-3)',
        }}
      >
        <span>{Math.round(pct)}% des Ziels</span>
        <span>{remaining.toLocaleString('de-DE')} kcal verbleibend</span>
      </div>
    </div>
  );
}

function NutrientRow({
  icon,
  label,
  value,
  target,
  unit,
  precision = 0,
}: {
  icon: IconName;
  label: string;
  value: number;
  target: TargetSpec;
  unit: string;
  precision?: number;
}) {
  const factor = 10 ** precision;
  const displayValue = Math.round(value * factor) / factor;
  const pct = target.value > 0 ? (value / target.value) * 100 : 0;
  const clamped = Math.min(100, pct);
  const over = target.kind === 'limit' && pct > 100;
  const barColor = over ? 'var(--amber)' : 'var(--sage)';
  const prefix = target.kind === 'limit' ? 'max. ' : '';

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name={icon} size={14} stroke="var(--sage-deep)" strokeWidth={1.6} />
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{label}</span>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>
          <span style={{ color: over ? 'var(--amber)' : 'var(--ink)' }}>
            {displayValue.toLocaleString('de-DE')} {unit}
          </span>
          <span style={{ color: 'var(--ink-4)' }}>
            {' / '}
            {prefix}
            {target.value.toLocaleString('de-DE')} {unit}
          </span>
        </div>
      </div>
      <div className="progress" style={{ height: 4 }}>
        <span style={{ width: `${clamped}%`, background: barColor }} />
      </div>
    </div>
  );
}

function EnergyDistribution({ totals }: { totals: MealDayTotals }) {
  const proteinKcal = totals.protein_g * 4;
  const carbsKcal = totals.carbs_g * 4;
  const fatKcal = totals.fat_g * 9;
  const sum = proteinKcal + carbsKcal + fatKcal;

  if (sum <= 0) {
    return (
      <div
        style={{
          padding: '12px',
          background: 'var(--surface-2)',
          borderRadius: 10,
          color: 'var(--ink-4)',
          fontSize: 12,
        }}
      >
        Noch keine Makro-Werte erfasst.
      </div>
    );
  }

  const pP = (proteinKcal / sum) * 100;
  const pC = (carbsKcal / sum) * 100;
  const pF = (fatKcal / sum) * 100;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          height: 8,
          borderRadius: 4,
          overflow: 'hidden',
          background: 'var(--surface-3)',
        }}
      >
        <div style={{ width: `${pP}%`, background: 'var(--sage-deep)' }} />
        <div style={{ width: `${pC}%`, background: 'var(--sage)' }} />
        <div style={{ width: `${pF}%`, background: 'var(--amber)' }} />
      </div>
      <div
        style={{
          marginTop: 8,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          fontFamily: 'var(--mono)',
          color: 'var(--ink-3)',
          letterSpacing: '0.02em',
        }}
      >
        <span>
          <DotMarker color="var(--sage-deep)" /> {Math.round(pP)}% Protein
        </span>
        <span>
          <DotMarker color="var(--sage)" /> {Math.round(pC)}% Carbs
        </span>
        <span>
          <DotMarker color="var(--amber)" /> {Math.round(pF)}% Fett
        </span>
      </div>
    </div>
  );
}

function DotMarker({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color,
        marginRight: 4,
        verticalAlign: 'middle',
      }}
    />
  );
}
