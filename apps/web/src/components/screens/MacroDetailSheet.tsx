'use client';

import { type NutritionTargets, type TargetSpec, formatTodayHeading } from '@/lib/nutrition';
import { useSheetDismissDrag } from '@/lib/useSheetDismissDrag';
import { Icon, type IconName } from '../Icon';
import type { MealDayTotals } from '../types';

interface MacroDetailSheetProps {
  totals: MealDayTotals;
  targets: NutritionTargets;
  onClose: () => void;
}

export function MacroDetailSheet({ totals, targets, onClose }: MacroDetailSheetProps) {
  const { ref, handleRef, backdropRef, style } = useSheetDismissDrag({ onClose });

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop is a presentational click target; sheet has its own X-button + Escape via document listener
    <div ref={backdropRef} className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        ref={ref}
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        // biome-ignore lint/a11y/useSemanticElements: bottom-sheet without native <dialog> lifecycle
        role="dialog"
        aria-modal="true"
        style={style}
      >
        <div ref={handleRef} className="sheet-drag-zone">
          <div className="sheet-handle" />
          <div className="row-between" style={{ marginBottom: 18 }}>
            <div>
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 28,
                  color: 'var(--ink)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                }}
              >
                Tagesnährwerte
              </div>
              <div style={{ marginTop: 4, color: 'var(--ink-3)', fontSize: 14 }}>
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
        </div>

        <KcalBlock value={totals.kcal} target={targets.kcal} />

        <SectionHeading icon="leaf">Makronährstoffe</SectionHeading>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <NutrientCard
            icon="leaf"
            label="Protein"
            value={totals.protein_g}
            target={targets.protein_g}
            unit="g"
          />
          <NutrientCard
            icon="wheat"
            label="Kohlenhydrate"
            value={totals.carbs_g}
            target={targets.carbs_g}
            unit="g"
          />
          <NutrientCard
            icon="droplet"
            label="Fett"
            value={totals.fat_g}
            target={targets.fat_g}
            unit="g"
          />
        </div>

        <SectionHeading icon="star">Weitere Nährwerte</SectionHeading>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <NutrientCard
            icon="droplet"
            label="Zucker"
            value={totals.sugar_g}
            target={targets.sugar_g}
            unit="g"
          />
          <NutrientCard
            icon="leaf"
            label="Ballaststoffe"
            value={totals.fiber_g}
            target={targets.fiber_g}
            unit="g"
          />
          <NutrientCard
            icon="droplet"
            label="ges. Fettsäuren"
            value={totals.saturated_fat_g}
            target={targets.saturated_fat_g}
            unit="g"
          />
          <NutrientCard
            icon="droplet"
            label="Salz"
            value={totals.salt_g}
            target={targets.salt_g}
            unit="g"
            precision={1}
          />
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <div
      className="row-between"
      style={{
        marginTop: 22,
        marginBottom: 10,
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name={icon} size={16} stroke="var(--sage-deep)" strokeWidth={1.6} />
        <span
          style={{
            fontFamily: 'var(--sans)',
            fontSize: 16,
            color: 'var(--ink-2)',
            fontWeight: 500,
          }}
        >
          {children}
        </span>
      </div>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-4)',
          letterSpacing: '0.04em',
        }}
      >
        Tagesziel
      </span>
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
        borderRadius: 16,
        padding: '16px 16px',
        border: '0.5px solid var(--hairline)',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          background: 'var(--sage-wash)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name="flame" size={20} stroke="var(--sage-deep)" strokeWidth={1.6} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 2 }}>Kalorien</div>
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
          <span>{Math.round(pct)} % des Ziels</span>
          <span style={{ color: 'var(--sage-deep)' }}>
            {remaining.toLocaleString('de-DE')} kcal verbleibend
          </span>
        </div>
      </div>
    </div>
  );
}

function NutrientCard({
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
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: 14,
        padding: '12px 14px',
        border: '0.5px solid var(--hairline)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: 'var(--sage-wash)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={16} stroke="var(--sage-deep)" strokeWidth={1.6} />
        </div>
        <span style={{ fontSize: 15, color: 'var(--ink-2)', flex: 1, minWidth: 0 }}>{label}</span>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>
            <span style={{ color: over ? 'var(--amber)' : 'var(--ink)' }}>
              {displayValue.toLocaleString('de-DE')} {unit}
            </span>
            <span style={{ color: 'var(--ink-4)' }}>
              {' / '}
              {prefix}
              {target.value.toLocaleString('de-DE')} {unit}
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--ink-4)',
              marginTop: 2,
            }}
          >
            {Math.round(pct)} %
          </div>
        </div>
      </div>
      <div className="progress" style={{ height: 4, marginTop: 10 }}>
        <span style={{ width: `${clamped}%`, background: barColor }} />
      </div>
    </div>
  );
}
