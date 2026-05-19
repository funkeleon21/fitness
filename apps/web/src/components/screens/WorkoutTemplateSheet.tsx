'use client';

import {
  createWorkoutTemplateAction,
  deleteWorkoutTemplateAction,
  updateWorkoutTemplateAction,
} from '@/app/actions';
import { useState, useTransition } from 'react';
import { Icon, type IconName } from '../Icon';
import { Sheet, SheetCloseButton } from '../Sheet';
import type { WorkoutIconValue, WorkoutTemplateView } from '../types';
import {
  type DraftExercise,
  type DraftSet,
  emptyExercise,
  emptySet,
  newId,
  setToPayload,
} from './workout-draft';
import { addButtonStyle, iconButtonStyle, inputStyle } from './workout-styles';

// Kuratierte Auswahl, parallel zu workoutIconSchema in packages/core. Wer hier
// einen Wert hinzufügt, muss auch das Core-Enum erweitern — sonst greift die
// Server-side-Validierung.
const ICON_OPTIONS: ReadonlyArray<{ value: WorkoutIconValue; label: string }> = [
  { value: 'dumbbell', label: 'Krafttraining' },
  { value: 'biceps', label: 'Arme' },
  { value: 'back', label: 'Rücken' },
  { value: 'leg', label: 'Beine' },
  { value: 'body', label: 'Ganzkörper' },
  { value: 'pulse', label: 'HIIT' },
  { value: 'footprints', label: 'Lauf' },
  { value: 'flame', label: 'Intensiv' },
];

export type WorkoutTemplateSheetMode =
  | { kind: 'new' }
  | { kind: 'edit'; template: WorkoutTemplateView };

interface WorkoutTemplateSheetProps {
  mode: WorkoutTemplateSheetMode;
  onClose: () => void;
}

// Vorlage → Draft. Bestehende Werte (Default-Reps, Default-Gewicht) werden
// als Vorschlag übernommen, der Nutzer kann sie editieren oder leeren.
function templateToDrafts(tpl: WorkoutTemplateView): DraftExercise[] {
  if (tpl.exercises.length === 0) return [];
  return tpl.exercises.map((ex) => ({
    id: newId(),
    name: ex.name,
    sets:
      ex.sets.length > 0
        ? ex.sets.map((s) => ({
            id: newId(),
            reps: s.reps !== undefined ? String(s.reps) : '',
            weight_kg: s.weight_kg !== undefined ? String(s.weight_kg) : '',
          }))
        : [emptySet()],
  }));
}

export function WorkoutTemplateSheet({ mode, onClose }: WorkoutTemplateSheetProps) {
  const isEdit = mode.kind === 'edit';
  const initial = mode.kind === 'edit' ? mode.template : null;

  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [label, setLabel] = useState(initial?.label ?? '');
  const [icon, setIcon] = useState<WorkoutIconValue>(initial?.icon ?? 'dumbbell');
  const [duration, setDuration] = useState(
    initial?.default_duration_min !== null && initial?.default_duration_min !== undefined
      ? String(initial.default_duration_min)
      : '',
  );
  const [exercises, setExercises] = useState<DraftExercise[]>(
    initial ? templateToDrafts(initial) : [emptyExercise()],
  );
  const [error, setError] = useState<string | null>(null);

  const addExercise = () => setExercises((prev) => [...prev, emptyExercise()]);
  const removeExercise = (id: string) => setExercises((prev) => prev.filter((e) => e.id !== id));
  const updateExerciseName = (id: string, name: string) =>
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, name } : e)));
  const addSet = (exId: string) =>
    setExercises((prev) =>
      prev.map((e) => (e.id === exId ? { ...e, sets: [...e.sets, emptySet()] } : e)),
    );
  const removeSet = (exId: string, setId: string) =>
    setExercises((prev) =>
      prev.map((e) => (e.id === exId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e)),
    );
  const updateSet = (exId: string, setId: string, patch: Partial<DraftSet>) =>
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exId
          ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
          : e,
      ),
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedLabel = label.trim();
    if (trimmedLabel === '') {
      setError('Bitte gib der Vorlage einen Namen (z.B. „Push-Day").');
      return;
    }

    const serialized: Array<{
      name: string;
      sets: Array<{ reps?: number; weight_kg?: number }>;
    }> = [];
    for (const ex of exercises) {
      const trimmedName = ex.name.trim();
      if (trimmedName === '') continue;
      const sets = ex.sets.map(setToPayload);
      // Sätze in der Vorlage dürfen ohne reps/weight_kg sein — die Struktur
      // („3 Sätze") ist auch dann sinnvoll. Komplett-leere Sätze (kein Marker)
      // werden trotzdem behalten, weil sie die Satz-Anzahl prägen.
      serialized.push({ name: trimmedName, sets });
    }
    if (serialized.length === 0) {
      setError('Mindestens eine Übung mit Namen ist nötig.');
      return;
    }

    const fd = new FormData();
    fd.set('label', trimmedLabel);
    fd.set('icon', icon);
    fd.set('exercises', JSON.stringify(serialized));
    if (duration.trim() !== '') fd.set('default_duration_min', duration);
    if (isEdit && initial) fd.set('id', initial.id);

    startTransition(async () => {
      try {
        if (isEdit) await updateWorkoutTemplateAction(fd);
        else await createWorkoutTemplateAction(fd);
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
        setError(`Speichern fehlgeschlagen: ${message}`);
      }
    });
  };

  const onDelete = () => {
    if (!initial) return;
    if (!window.confirm(`Vorlage „${initial.label}" wirklich löschen?`)) return;
    const fd = new FormData();
    fd.set('id', initial.id);
    startDelete(async () => {
      try {
        await deleteWorkoutTemplateAction(fd);
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
        setError(`Löschen fehlgeschlagen: ${message}`);
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
              {isEdit ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
            </div>
            <div style={{ marginTop: 2, color: 'var(--ink-3)', fontSize: 13 }}>
              Nur die Struktur — Gewichte trägst du beim Loggen frisch ein.
            </div>
          </div>
          <SheetCloseButton onClose={onClose} />
        </div>
      }
    >
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Name">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Push-Day, Pull-Day, Beine…"
            maxLength={200}
            required
            style={inputStyle}
          />
        </Field>

        <IconPicker value={icon} onChange={setIcon} />

        <Field label="Default-Dauer (optional)">
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
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>Übungen</span>
            <button
              type="button"
              onClick={addExercise}
              className="pressable"
              style={addButtonStyle}
            >
              <Icon name="plus" size={12} strokeWidth={2} /> Übung
            </button>
          </div>
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
                showRemove={exercises.length > 1}
              />
            ))}
          </div>
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
          disabled={pending || deleting}
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
            cursor: pending || deleting ? 'wait' : 'pointer',
            opacity: pending || deleting ? 0.7 : 1,
          }}
        >
          {pending ? 'Speichern…' : isEdit ? 'Vorlage aktualisieren' : 'Vorlage speichern'}
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending || deleting}
            className="pressable"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 10,
              background: 'transparent',
              color: 'var(--amber)',
              border: '0.5px solid rgba(196,152,85,0.5)',
              fontFamily: 'var(--sans)',
              fontSize: 13,
              cursor: deleting ? 'wait' : 'pointer',
            }}
          >
            {deleting ? 'Löschen…' : 'Vorlage löschen'}
          </button>
        )}
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
  showRemove,
}: {
  exercise: DraftExercise;
  onNameChange: (name: string) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onUpdateSet: (setId: string, patch: Partial<DraftSet>) => void;
  onRemove: () => void;
  showRemove: boolean;
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
        {showRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Übung entfernen"
            className="pressable"
            style={iconButtonStyle}
          >
            <Icon name="x" size={14} strokeWidth={2} stroke="var(--ink-3)" />
          </button>
        )}
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
              placeholder="Default"
              step={1}
            />
            <NumberInput
              value={s.weight_kg}
              onChange={(v) => onUpdateSet(s.id, { weight_kg: v })}
              suffix="kg"
              placeholder="Default"
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

function IconPicker({
  value,
  onChange,
}: {
  value: WorkoutIconValue;
  onChange: (next: WorkoutIconValue) => void;
}) {
  return (
    <div>
      <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>
        Icon
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
        }}
      >
        {ICON_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              aria-label={opt.label}
              className="pressable"
              title={opt.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 0',
                borderRadius: 12,
                background: active ? 'var(--sage-wash)' : 'var(--surface)',
                border: `0.5px solid ${active ? 'var(--sage-deep)' : 'var(--hairline-strong)'}`,
                color: active ? 'var(--sage-deep)' : 'var(--ink-3)',
                cursor: 'pointer',
              }}
            >
              <Icon name={opt.value as IconName} size={22} strokeWidth={1.7} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: das input wird via children innerhalb des labels gerendert — Biome erkennt den dynamischen Slot statisch nicht.
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
