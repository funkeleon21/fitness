'use client';

import { retractWorkoutAction } from '@/app/actions';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../Icon';
import type { WorkoutPoint } from '../../types';

interface WorkoutCardProps {
  workout: WorkoutPoint;
  isToday: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function countSets(w: WorkoutPoint): number {
  if (!w.exercises) return 0;
  return w.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
}

// Eine kompakte Info-Zeile statt Übungs-Liste + Pill: Zeit, Dauer, Übungs- und
// Satz-Count auf einer Zeile zusammengefasst. Details kommen später im Detail-Sheet.
function buildMeta(workout: WorkoutPoint): string {
  const parts: string[] = [formatTime(workout.occurred_at)];
  if (workout.duration_min) parts.push(`${workout.duration_min} min`);
  const exCount = workout.exercises?.length ?? 0;
  if (exCount > 0) parts.push(`${exCount} ${exCount === 1 ? 'Übung' : 'Übungen'}`);
  const sets = countSets(workout);
  if (sets > 0) parts.push(`${sets} ${sets === 1 ? 'Satz' : 'Sätze'}`);
  if (workout.corrected) parts.push('korrigiert');
  return parts.join(' · ');
}

export function WorkoutCard({ workout, isToday }: WorkoutCardProps) {
  return (
    <div
      className="card"
      style={{
        padding: '14px 16px',
        position: 'relative',
        borderLeft: isToday ? '4px solid var(--sage-deep)' : undefined,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--sage-wash)',
            color: 'var(--sage-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="dumbbell" size={20} strokeWidth={1.7} />
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingRight: 28 }}>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 19,
              lineHeight: 1.15,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
            }}
          >
            {workout.label}
          </div>
          <div
            style={{
              marginTop: 3,
              fontSize: 12,
              color: 'var(--ink-3)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {buildMeta(workout)}
          </div>
        </div>

        <div style={{ position: 'absolute', top: 10, right: 8 }}>
          <RowMenu eventId={workout.event_id} />
        </div>
      </div>
    </div>
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
          width: 28,
          height: 28,
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
        <Icon name="more-vertical" size={16} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 32,
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
