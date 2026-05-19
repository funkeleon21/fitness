'use client';

import { retractWorkoutAction } from '@/app/actions';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../Icon';
import type { WorkoutPoint } from '../../types';

interface WorkoutCardProps {
  workout: WorkoutPoint;
  isToday: boolean;
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

        <div
          style={{
            flex: 1,
            minWidth: 0,
            paddingRight: 28,
            fontFamily: 'var(--serif)',
            fontSize: 20,
            lineHeight: 1.15,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {workout.label}
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
