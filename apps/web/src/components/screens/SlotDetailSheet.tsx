'use client';

import { retractMealAction } from '@/app/actions';
import type { MealSlotMeta } from '@/lib/nutrition';
import { Icon, type IconName } from '../Icon';
import { Sheet, SheetCloseButton } from '../Sheet';
import type { MealPoint } from '../types';

interface SlotDetailSheetProps {
  slot: MealSlotMeta;
  meals: MealPoint[];
  onClose: () => void;
  onAdd: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function sourceIcon(source: string): IconName {
  if (source === 'voice') return 'mic';
  if (source === 'photo') return 'camera';
  return 'text';
}

export function SlotDetailSheet({ slot, meals, onClose, onAdd }: SlotDetailSheetProps) {
  const totalKcal = meals.reduce((s, m) => s + m.kcal, 0);

  return (
    <Sheet
      onClose={onClose}
      header={
        <div className="row-between" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: slot.tint,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: slot.iconColor,
                flexShrink: 0,
              }}
            >
              <Icon name={slot.icon} size={20} strokeWidth={1.6} stroke="currentColor" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 26,
                  lineHeight: 1.05,
                  color: 'var(--ink)',
                  letterSpacing: '-0.02em',
                }}
              >
                {slot.label}
              </div>
              <div style={{ marginTop: 2, color: 'var(--ink-3)', fontSize: 13 }}>
                {meals.length} {meals.length === 1 ? 'Eintrag' : 'Einträge'} · {totalKcal} kcal
              </div>
            </div>
          </div>
          <SheetCloseButton onClose={onClose} />
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {meals.map((m) => (
          <MealDetailCard key={m.event_id} meal={m} />
        ))}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="pressable"
        style={{
          marginTop: 14,
          width: '100%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '12px',
          borderRadius: 12,
          background: 'var(--sage-wash)',
          color: 'var(--sage-deep)',
          border: 'none',
          fontFamily: 'var(--sans)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        <Icon name="plus" size={14} strokeWidth={2} /> Weitere Mahlzeit hinzufügen
      </button>
    </Sheet>
  );
}

function MealDetailCard({ meal }: { meal: MealPoint }) {
  const macros: string[] = [];
  if (meal.protein_g !== null && meal.protein_g > 0)
    macros.push(`${Math.round(meal.protein_g)} g Protein`);
  if (meal.carbs_g !== null && meal.carbs_g > 0)
    macros.push(`${Math.round(meal.carbs_g)} g Kohlenhydrate`);
  if (meal.fat_g !== null && meal.fat_g > 0) macros.push(`${Math.round(meal.fat_g)} g Fett`);

  return (
    <div
      style={{
        padding: '12px 14px',
        background: 'var(--surface-2)',
        borderRadius: 14,
        border: '0.5px solid var(--hairline)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-3)',
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <Icon name={sourceIcon(meal.source)} size={14} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--ink)',
              lineHeight: 1.3,
              wordBreak: 'break-word',
            }}
          >
            {meal.label}
          </div>
          <div className="mono-sm" style={{ marginTop: 4, fontSize: 11 }}>
            {formatTime(meal.occurred_at)} · {meal.kcal} kcal
          </div>
          {macros.length > 0 && (
            <div
              style={{
                marginTop: 6,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              {macros.map((m) => (
                <span
                  key={m}
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: 'var(--surface)',
                    color: 'var(--ink-3)',
                    border: '0.5px solid var(--hairline)',
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
        {meal.confidence !== null && meal.confidence < 0.9 && (
          <span
            className="pill"
            style={{
              fontSize: 10,
              padding: '2px 6px',
              background: 'rgba(196,152,85,0.14)',
              color: 'var(--amber)',
              flexShrink: 0,
            }}
          >
            ungefähr
          </span>
        )}
      </div>
      <form
        action={retractMealAction}
        style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}
      >
        <input type="hidden" name="event_id" value={meal.event_id} />
        <button
          type="submit"
          className="pressable"
          style={{
            background: 'transparent',
            border: '0.5px solid var(--hairline-strong)',
            borderRadius: 8,
            padding: '5px 10px',
            fontSize: 12,
            color: 'var(--ink-3)',
            cursor: 'pointer',
          }}
        >
          Eintrag zurückziehen
        </button>
      </form>
    </div>
  );
}
