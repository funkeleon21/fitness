'use client';

import { correctMealAction } from '@/app/actions';
import { MEAL_SLOTS, type MealSlotId } from '@/lib/nutrition';
import { useState, useTransition } from 'react';
import { Sheet, SheetCloseButton } from '../Sheet';
import type { MealPoint } from '../types';

interface MealEditSheetProps {
  meal: MealPoint;
  onClose: () => void;
}

export function MealEditSheet({ meal, onClose }: MealEditSheetProps) {
  const [pending, startTransition] = useTransition();
  const [slot, setSlot] = useState<MealSlotId>(meal.meal_type ?? 'breakfast');

  async function onSubmit(formData: FormData) {
    formData.set('event_id', meal.event_id);
    formData.set('meal_type', slot);
    startTransition(async () => {
      try {
        await correctMealAction(formData);
        onClose();
      } catch (err) {
        // Server-Action wirft eine deutsch formulierte Fehlermeldung — wir
        // zeigen sie als alert, damit der User den Fehler bemerkt. UI bleibt
        // offen, damit er korrigieren kann.
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
        window.alert(`Speichern fehlgeschlagen: ${message}`);
      }
    });
  }

  return (
    <Sheet
      onClose={onClose}
      header={
        <div className="row-between" style={{ marginBottom: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 24,
                color: 'var(--ink)',
                letterSpacing: '-0.02em',
                lineHeight: 1.05,
              }}
            >
              Mahlzeit bearbeiten
            </div>
            <div style={{ marginTop: 2, color: 'var(--ink-3)', fontSize: 13 }}>
              Nur diese Mahlzeit, nicht die Vorlage
            </div>
          </div>
          <SheetCloseButton onClose={onClose} />
        </div>
      }
    >
      <form action={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Bezeichnung">
          <input
            type="text"
            name="label"
            defaultValue={meal.label}
            maxLength={200}
            required
            style={inputStyle}
          />
        </Field>

        <Field label="Slot">
          <SlotSegmented value={slot} onChange={setSlot} />
        </Field>

        <Field label="Kalorien">
          <NumberInput name="kcal" defaultValue={meal.kcal} suffix="kcal" required step={1} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <Field label="Protein">
            <NumberInput
              name="protein_g"
              defaultValue={meal.protein_g ?? ''}
              suffix="g"
              step={0.1}
            />
          </Field>
          <Field label="Kohlenhydrate">
            <NumberInput name="carbs_g" defaultValue={meal.carbs_g ?? ''} suffix="g" step={0.1} />
          </Field>
          <Field label="Fett">
            <NumberInput name="fat_g" defaultValue={meal.fat_g ?? ''} suffix="g" step={0.1} />
          </Field>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="pressable"
          style={{
            marginTop: 6,
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            background: 'var(--sage-deep)',
            color: 'white',
            border: 'none',
            fontFamily: 'var(--sans)',
            fontSize: 14,
            fontWeight: 500,
            cursor: pending ? 'wait' : 'pointer',
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? 'Speichern…' : 'Änderungen speichern'}
        </button>
      </form>
    </Sheet>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '0.5px solid var(--hairline-strong)',
  background: 'var(--surface)',
  fontFamily: 'var(--sans)',
  fontSize: 14,
  color: 'var(--ink)',
  outline: 'none',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: das input/segmented-control wird via children innerhalb des labels gerendert — Biome erkennt den dynamischen Slot statisch nicht.
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontSize: 12,
          color: 'var(--ink-3)',
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function NumberInput({
  name,
  defaultValue,
  suffix,
  required,
  step,
}: {
  name: string;
  defaultValue: number | string;
  suffix: string;
  required?: boolean;
  step?: number;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue}
        required={required}
        min={0}
        step={step ?? 0.1}
        inputMode="decimal"
        style={{ ...inputStyle, paddingRight: 44 }}
      />
      <span
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 12,
          color: 'var(--ink-4)',
          pointerEvents: 'none',
        }}
      >
        {suffix}
      </span>
    </div>
  );
}

function SlotSegmented({
  value,
  onChange,
}: {
  value: MealSlotId;
  onChange: (v: MealSlotId) => void;
}) {
  return (
    <div
      className="segmented"
      style={{ display: 'flex', width: '100%', padding: 4, gap: 0 }}
      role="radiogroup"
    >
      {MEAL_SLOTS.map((s) => {
        const selected = s.id === value;
        return (
          <label
            key={s.id}
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: 9,
              fontSize: 12,
              fontWeight: 500,
              textAlign: 'center',
              color: selected ? 'var(--ink)' : 'var(--ink-3)',
              background: selected ? 'var(--surface)' : 'transparent',
              cursor: 'pointer',
              transition: 'background 120ms, color 120ms',
            }}
          >
            <input
              type="radio"
              name="meal_type"
              value={s.id}
              checked={selected}
              onChange={() => onChange(s.id)}
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: 'none',
              }}
            />
            {s.label}
          </label>
        );
      })}
    </div>
  );
}
