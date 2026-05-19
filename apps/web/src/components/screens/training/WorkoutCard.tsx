'use client';

import { retractWorkoutAction } from '@/app/actions';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../Icon';
import type { WorkoutPoint } from '../../types';

interface WorkoutCardProps {
  workout: WorkoutPoint;
  isToday: boolean;
}

const COLLAPSED_LIMIT = 3;

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function countSets(w: WorkoutPoint): number {
  if (!w.exercises) return 0;
  return w.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
}

function summarizeSets(sets: Array<{ reps?: number; weight_kg?: number }>): string {
  return sets
    .map((s) => {
      if (s.weight_kg !== undefined && s.reps !== undefined) return `${s.weight_kg}×${s.reps}`;
      if (s.weight_kg !== undefined) return `${s.weight_kg} kg`;
      if (s.reps !== undefined) return `${s.reps} Wdh.`;
      return '–';
    })
    .filter((s) => s !== '–')
    .join(', ');
}

export function WorkoutCard({ workout, isToday }: WorkoutCardProps) {
  const sets = countSets(workout);
  const exerciseCount = workout.exercises?.length ?? 0;
  const canExpand = exerciseCount > COLLAPSED_LIMIT;
  const [expanded, setExpanded] = useState(false);
  const visibleExercises =
    canExpand && !expanded
      ? (workout.exercises?.slice(0, COLLAPSED_LIMIT) ?? [])
      : (workout.exercises ?? []);
  const hidden = canExpand && !expanded ? exerciseCount - COLLAPSED_LIMIT : 0;

  return (
    <div
      className={canExpand ? 'card pressable' : 'card'}
      onClick={canExpand ? () => setExpanded((v) => !v) : undefined}
      onKeyDown={
        canExpand
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setExpanded((v) => !v);
              }
            }
          : undefined
      }
      role={canExpand ? 'button' : undefined}
      tabIndex={canExpand ? 0 : undefined}
      aria-expanded={canExpand ? expanded : undefined}
      style={{
        padding: '16px 18px',
        position: 'relative',
        borderLeft: isToday ? '4px solid var(--sage-deep)' : undefined,
        cursor: canExpand ? 'pointer' : undefined,
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'var(--sage-wash)',
            color: 'var(--sage-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            // Avatar zur Title-Höhe alignen (Title fontSize 20, lineHeight 1.15 → ~23
            // sichtbare Höhe). Mit marginTop -2 sitzt das Icon mittig zum Title statt
            // oben bündig — wirkt eher wie Bullet zum Title als wie eigener Block.
            marginTop: -2,
          }}
        >
          <Icon name="dumbbell" size={24} strokeWidth={1.7} />
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingRight: canExpand ? 32 : 28 }}>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 20,
              lineHeight: 1.15,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
            }}
          >
            {workout.label}
          </div>
          <div className="mono-sm" style={{ marginTop: 4, fontSize: 11, color: 'var(--ink-3)' }}>
            {formatTime(workout.occurred_at)}
            {workout.duration_min ? ` · ${workout.duration_min} min` : ''}
            {workout.corrected ? ' · korrigiert' : ''}
          </div>

          {visibleExercises.length > 0 && (
            <div
              style={{
                marginTop: 10,
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                columnGap: 12,
                rowGap: 4,
              }}
            >
              {visibleExercises.map((ex, idx) => (
                <ExerciseRow key={`${workout.event_id}-${idx}`} exercise={ex} />
              ))}
              {hidden > 0 && (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    fontSize: 12,
                    color: 'var(--ink-4)',
                    marginTop: 2,
                  }}
                >
                  + {hidden} weitere Übungen
                </div>
              )}
            </div>
          )}
        </div>

        <div
          style={{ position: 'absolute', top: 12, right: 10 }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <RowMenu eventId={workout.event_id} />
        </div>

        {canExpand && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 160ms ease',
              transformOrigin: 'center',
            }}
          >
            <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={16} strokeWidth={1.7} />
          </div>
        )}
      </div>

      {sets > 0 && (
        <div style={{ marginTop: 12 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: 999,
              background: 'var(--surface-2)',
              fontSize: 12,
              color: 'var(--ink-2)',
            }}
          >
            {sets} {sets === 1 ? 'Satz' : 'Sätze'}
          </span>
        </div>
      )}
    </div>
  );
}

function ExerciseRow({
  exercise,
}: {
  exercise: { name: string; sets: Array<{ reps?: number; weight_kg?: number }> };
}) {
  const summary = summarizeSets(exercise.sets);
  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{exercise.name}</div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--ink-3)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {summary}
      </div>
    </>
  );
}

function RowMenu({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Aktionen"
        aria-expanded={open}
        className="pressable"
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          border: 'none',
          background: 'transparent',
          color: 'var(--ink-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <Icon name="more-vertical" size={18} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 36,
            right: 0,
            minWidth: 160,
            background: 'var(--surface)',
            border: '0.5px solid var(--hairline-strong)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-card)',
            padding: 4,
            zIndex: 10,
          }}
        >
          <form action={retractWorkoutAction}>
            <input type="hidden" name="event_id" value={eventId} />
            <button
              type="submit"
              role="menuitem"
              className="pressable"
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                color: 'var(--ink-2)',
                cursor: 'pointer',
              }}
            >
              Zurückziehen
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
