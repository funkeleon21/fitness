'use client';

import { logWorkoutAction, logWorkoutFromTemplateAction } from '@/app/actions';
import { useState, useTransition } from 'react';
import { Icon } from '../Icon';
import { Sheet, SheetCloseButton } from '../Sheet';
import type { WorkoutTemplateView } from '../types';

interface DraftSet {
  id: string;
  reps: string;
  weight_kg: string;
}

interface DraftExercise {
  id: string;
  name: string;
  sets: DraftSet[];
}

interface WorkoutLogSheetProps {
  onClose: () => void;
  /**
   * Optionale Vorbelegung aus einer Workout-Vorlage. Wenn gesetzt:
   *  - Label + Default-Dauer + Übungen werden vorausgefüllt
   *  - Save geht über logWorkoutFromTemplateAction, damit usage_count steigt
   *    und template_id im Event landet.
   */
  fromTemplate?: WorkoutTemplateView;
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function newSet(): DraftSet {
  return { id: newId(), reps: '', weight_kg: '' };
}

function newExercise(): DraftExercise {
  return { id: newId(), name: '', sets: [newSet()] };
}

// Wandelt einen Draft-Satz in das Schema-Format. Leere Strings → undefined,
// damit die optionalen Schema-Felder nicht mit NaN belegt werden.
function setToPayload(s: DraftSet): { reps?: number; weight_kg?: number } {
  const out: { reps?: number; weight_kg?: number } = {};
  const reps = s.reps.trim();
  if (reps !== '') {
    const n = Number.parseInt(reps, 10);
    if (Number.isFinite(n) && n >= 0) out.reps = n;
  }
  const weight = s.weight_kg.replace(',', '.').trim();
  if (weight !== '') {
    const n = Number.parseFloat(weight);
    if (Number.isFinite(n) && n >= 0) out.weight_kg = Math.round(n * 10) / 10;
  }
  return out;
}

function templateToDrafts(tpl: WorkoutTemplateView): DraftExercise[] {
  return tpl.exercises.map((ex) => ({
    id: newId(),
    name: ex.name,
    sets:
      ex.sets.length > 0
        ? ex.sets.map((s) => ({
            id: newId(),
            // Default-Wdh. aus der Vorlage werden vorgeschlagen, der Nutzer
            // überschreibt sie mit dem heutigen Wert. Gewicht bewusst leer —
            // siehe Begründung in workout-templates.ts (Progressive Overload).
            reps: s.reps !== undefined ? String(s.reps) : '',
            weight_kg: '',
          }))
        : [newSet()],
  }));
}

export function WorkoutLogSheet({ onClose, fromTemplate }: WorkoutLogSheetProps) {
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState(fromTemplate?.label ?? '');
  const [duration, setDuration] = useState(
    fromTemplate?.default_duration_min !== null && fromTemplate?.default_duration_min !== undefined
      ? String(fromTemplate.default_duration_min)
      : '',
  );
  const [exercises, setExercises] = useState<DraftExercise[]>(
    fromTemplate ? templateToDrafts(fromTemplate) : [],
  );
  const [error, setError] = useState<string | null>(null);

  const addExercise = () => {
    setExercises((prev) => [...prev, newExercise()]);
  };

  const removeExercise = (id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const updateExerciseName = (id: string, name: string) => {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, name } : e)));
  };

  const addSet = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((e) => (e.id === exerciseId ? { ...e, sets: [...e.sets, newSet()] } : e)),
    );
  };

  const removeSet = (exerciseId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exerciseId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e,
      ),
    );
  };

  const updateSet = (exerciseId: string, setId: string, patch: Partial<DraftSet>) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exerciseId
          ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
          : e,
      ),
    );
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedLabel = label.trim();
    if (trimmedLabel === '') {
      setError('Bitte gib der Einheit eine Bezeichnung (z.B. „Push-Day", „5km Lauf").');
      return;
    }

    // Übungen serialisieren: leere Sätze rausfiltern, Übungen ohne validen Satz
    // ebenfalls. Falls am Ende nichts übrig bleibt, geht das Workout ohne
    // exercises-Feld raus (Cardio-Pfad).
    const serialized: Array<{
      name: string;
      sets: Array<{ reps?: number; weight_kg?: number }>;
    }> = [];
    for (const ex of exercises) {
      const trimmedName = ex.name.trim();
      if (trimmedName === '') continue;
      const sets = ex.sets
        .map(setToPayload)
        .filter((s) => s.reps !== undefined || s.weight_kg !== undefined);
      if (sets.length === 0) continue;
      serialized.push({ name: trimmedName, sets });
    }

    const fd = new FormData();
    fd.set('label', trimmedLabel);
    if (duration.trim() !== '') fd.set('duration_min', duration);
    if (serialized.length > 0) fd.set('exercises', JSON.stringify(serialized));
    if (fromTemplate) fd.set('template_id', fromTemplate.id);

    startTransition(async () => {
      try {
        if (fromTemplate) await logWorkoutFromTemplateAction(fd);
        else await logWorkoutAction(fd);
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
        setError(`Speichern fehlgeschlagen: ${message}`);
      }
    });
  };

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
              Training loggen
            </div>
            <div style={{ marginTop: 2, color: 'var(--ink-3)', fontSize: 13 }}>
              {fromTemplate
                ? `Aus „${fromTemplate.label}" — nur noch Gewichte eintragen.`
                : 'Bezeichnung reicht. Übungen + Sätze sind optional.'}
            </div>
          </div>
          <SheetCloseButton onClose={onClose} />
        </div>
      }
    >
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Bezeichnung">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Push-Day, 5km Lauf, Mobility…"
            maxLength={200}
            required
            style={inputStyle}
          />
        </Field>

        <Field label="Dauer (optional)">
          <NumberInput
            value={duration}
            onChange={setDuration}
            suffix="min"
            placeholder="z.B. 60"
            step={1}
          />
        </Field>

        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>
              Übungen (optional)
            </span>
            {exercises.length > 0 && (
              <button
                type="button"
                onClick={addExercise}
                className="pressable"
                style={addButtonStyle}
              >
                <Icon name="plus" size={12} strokeWidth={2} /> Übung
              </button>
            )}
          </div>
          {exercises.length === 0 ? (
            <button
              type="button"
              onClick={addExercise}
              className="pressable"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                border: '1px dashed var(--hairline-strong)',
                background: 'transparent',
                color: 'var(--ink-3)',
                fontFamily: 'var(--sans)',
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Icon name="plus" size={14} strokeWidth={2} /> Erste Übung hinzufügen
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {exercises.map((ex) => (
                <ExerciseBlock
                  key={ex.id}
                  exercise={ex}
                  onNameChange={(name) => updateExerciseName(ex.id, name)}
                  onAddSet={() => addSet(ex.id)}
                  onRemoveSet={(setId) => removeSet(ex.id, setId)}
                  onUpdateSet={(setId, patch) => updateSet(ex.id, setId, patch)}
                  onRemove={() => removeExercise(ex.id)}
                />
              ))}
            </div>
          )}
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(196,152,85,0.12)',
              color: 'var(--amber)',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="pressable"
          style={{
            marginTop: 4,
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
          {pending ? 'Speichern…' : 'Training speichern'}
        </button>
      </form>
    </Sheet>
  );
}

function ExerciseBlock({
  exercise,
  onNameChange,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onRemove,
}: {
  exercise: DraftExercise;
  onNameChange: (name: string) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onUpdateSet: (setId: string, patch: Partial<DraftSet>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        padding: '12px',
        background: 'var(--surface-2)',
        borderRadius: 12,
        border: '0.5px solid var(--hairline)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text"
          value={exercise.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Übung (z.B. Bankdrücken)"
          maxLength={200}
          style={{ ...inputStyle, flex: 1, background: 'var(--surface)' }}
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Übung entfernen"
          className="pressable"
          style={iconButtonStyle}
        >
          <Icon name="x" size={14} strokeWidth={2} stroke="var(--ink-3)" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {exercise.sets.map((s, idx) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 24,
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--ink-4)',
                textAlign: 'right',
              }}
            >
              {idx + 1}.
            </span>
            <NumberInput
              value={s.reps}
              onChange={(v) => onUpdateSet(s.id, { reps: v })}
              suffix="Wdh."
              placeholder="Wdh."
              step={1}
            />
            <NumberInput
              value={s.weight_kg}
              onChange={(v) => onUpdateSet(s.id, { weight_kg: v })}
              suffix="kg"
              placeholder="kg"
              step={0.5}
            />
            {exercise.sets.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveSet(s.id)}
                aria-label="Satz entfernen"
                className="pressable"
                style={iconButtonStyle}
              >
                <Icon name="x" size={12} strokeWidth={2} stroke="var(--ink-4)" />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAddSet}
        className="pressable"
        style={{ ...addButtonStyle, alignSelf: 'flex-start' }}
      >
        <Icon name="plus" size={12} strokeWidth={2} /> Satz
      </button>
    </div>
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

const iconButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background: 'transparent',
  border: '0.5px solid var(--hairline)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
};

const addButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 10px',
  borderRadius: 999,
  background: 'var(--sage-wash)',
  color: 'var(--sage-deep)',
  border: 'none',
  fontFamily: 'var(--sans)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: das input/control wird via children innerhalb des labels gerendert — Biome erkennt den dynamischen Slot statisch nicht.
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  suffix,
  placeholder,
  step,
}: {
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  placeholder?: string;
  step?: number;
}) {
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={0}
        step={step ?? 0.1}
        inputMode="decimal"
        placeholder={placeholder}
        style={{ ...inputStyle, paddingRight: 44 }}
      />
      <span
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 11,
          color: 'var(--ink-4)',
          pointerEvents: 'none',
        }}
      >
        {suffix}
      </span>
    </div>
  );
}
