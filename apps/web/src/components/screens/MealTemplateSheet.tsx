'use client';

import {
  createMealTemplateAction,
  deleteMealTemplateAction,
  updateMealTemplateAction,
} from '@/app/actions';
import { useId, useState, useTransition } from 'react';
import { Icon } from '../Icon';
import type { MealTemplateView } from '../types';

type Mode = { kind: 'new' } | { kind: 'edit'; template: MealTemplateView };

interface MealTemplateSheetProps {
  mode: Mode;
  onClose: () => void;
}

export function MealTemplateSheet({ mode, onClose }: MealTemplateSheetProps) {
  const [pending, startTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const labelId = useId();
  const kcalId = useId();

  const tpl = mode.kind === 'edit' ? mode.template : null;
  const title = mode.kind === 'edit' ? 'Mahlzeit bearbeiten' : 'Mahlzeit speichern';

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
        <div className="row-between" style={{ marginBottom: 8 }}>
          <div className="h-card" style={{ fontSize: 22 }}>
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pressable"
            aria-label="Schließen"
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
            <Icon name="x" size={16} />
          </button>
        </div>

        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              try {
                if (mode.kind === 'edit') {
                  formData.append('id', mode.template.id);
                  await updateMealTemplateAction(formData);
                } else {
                  await createMealTemplateAction(formData);
                }
                onClose();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Konnte nicht speichern.');
              }
            });
          }}
          style={{ padding: '4px 0 8px', display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <Field htmlFor={labelId} label="Name">
            <input
              id={labelId}
              name="label"
              type="text"
              required
              maxLength={200}
              defaultValue={tpl?.label ?? ''}
              placeholder="z.B. Standard-Frühstück"
              className="text-input"
              style={{ fontSize: 15 }}
            />
          </Field>

          <Field htmlFor={kcalId} label="Kalorien (kcal)">
            <input
              id={kcalId}
              name="kcal"
              type="text"
              inputMode="decimal"
              required
              defaultValue={tpl?.kcal !== undefined ? String(tpl.kcal) : ''}
              placeholder="z.B. 420"
              className="text-input"
              style={{ fontSize: 15 }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <MacroField name="protein_g" label="Protein g" defaultValue={tpl?.protein_g ?? null} />
            <MacroField name="carbs_g" label="Kohlenh. g" defaultValue={tpl?.carbs_g ?? null} />
            <MacroField name="fat_g" label="Fett g" defaultValue={tpl?.fat_g ?? null} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <MacroField name="sugar_g" label="Zucker g" defaultValue={tpl?.sugar_g ?? null} />
            <MacroField
              name="fiber_g"
              label="Ballaststoffe g"
              defaultValue={tpl?.fiber_g ?? null}
            />
            <MacroField
              name="saturated_fat_g"
              label="ges. Fett g"
              defaultValue={tpl?.saturated_fat_g ?? null}
            />
            <MacroField name="salt_g" label="Salz g" defaultValue={tpl?.salt_g ?? null} />
          </div>

          {error && (
            <div
              style={{
                color: 'var(--amber)',
                fontSize: 12,
                fontFamily: 'var(--mono)',
                letterSpacing: '0.04em',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending || deletePending}
            className="pressable btn-primary"
            style={{
              width: '100%',
              marginTop: 4,
              padding: '14px',
              opacity: pending || deletePending ? 0.6 : 1,
            }}
          >
            {pending ? 'Speichere…' : mode.kind === 'edit' ? 'Aktualisieren' : 'Speichern'}
          </button>
        </form>

        {mode.kind === 'edit' && (
          <form
            action={(formData) => {
              setError(null);
              startDeleteTransition(async () => {
                try {
                  formData.append('id', mode.template.id);
                  await deleteMealTemplateAction(formData);
                  onClose();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Konnte nicht löschen.');
                }
              });
            }}
            style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }}
          >
            <button
              type="submit"
              disabled={pending || deletePending}
              className="pressable"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ink-3)',
                fontSize: 12,
                fontFamily: 'var(--mono)',
                letterSpacing: '0.06em',
                padding: '8px 12px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                opacity: pending || deletePending ? 0.5 : 1,
              }}
            >
              {deletePending ? 'Lösche…' : 'Vorlage löschen'}
            </button>
          </form>
        )}

        <div
          style={{
            marginTop: 8,
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--ink-4)',
            letterSpacing: '0.06em',
            textAlign: 'center',
          }}
        >
          PERSONAL FOOD MEMORY
        </div>
      </div>
    </button>
  );
}

function Field({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={htmlFor}
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-3)',
          letterSpacing: '0.06em',
        }}
      >
        {label.toUpperCase()}
      </label>
      {children}
    </div>
  );
}

function MacroField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number | null;
}) {
  const id = useId();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label
        htmlFor={id}
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          letterSpacing: '0.04em',
        }}
      >
        {label.toUpperCase()}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        defaultValue={defaultValue !== null ? String(defaultValue) : ''}
        placeholder="–"
        className="text-input"
        style={{ fontSize: 14, padding: '10px 12px' }}
      />
    </div>
  );
}
