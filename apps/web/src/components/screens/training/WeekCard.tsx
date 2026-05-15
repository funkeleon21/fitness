'use client';

import { Icon, type IconName } from '../../Icon';
import type { WorkoutPoint } from '../../types';
import { type CalendarWeek, formatWeekRange, getCalendarWeek } from './week-aggregation';

interface WeekCardProps {
  allWorkouts: WorkoutPoint[];
  weekOffset: number;
  onChange: (next: number) => void;
}

export function WeekCard({ allWorkouts, weekOffset, onChange }: WeekCardProps) {
  const week = getCalendarWeek(allWorkouts, weekOffset);
  const label = week.isCurrent ? 'Diese Woche' : formatWeekRange(week.start, week.end);
  const canForward = weekOffset < 0;

  return (
    <div className="card rise" style={{ padding: '20px 18px' }}>
      <div className="row-between" style={{ marginBottom: 16 }}>
        <div className="h-card" style={{ fontSize: 20 }}>
          Diese Woche
        </div>
        <WeekNav
          label={label}
          onBack={() => onChange(weekOffset - 1)}
          onForward={canForward ? () => onChange(weekOffset + 1) : null}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 4,
          marginBottom: 18,
        }}
      >
        <IconStat icon="dumbbell" value={String(week.totals.count)} label="Einheiten" />
        <IconStat icon="sets-stack" value={String(week.totals.totalSets)} label="Sätze" />
        <IconStat
          icon="clock"
          value={week.totals.totalDurationMin > 0 ? String(week.totals.totalDurationMin) : '—'}
          unit={week.totals.totalDurationMin > 0 ? 'min' : undefined}
          label="Dauer"
        />
      </div>

      <WeekStrip week={week} />
    </div>
  );
}

function WeekNav({
  label,
  onBack,
  onForward,
}: {
  label: string;
  onBack: () => void;
  onForward: (() => void) | null;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--surface-2)',
        border: '0.5px solid var(--hairline)',
        borderRadius: 999,
        padding: 2,
      }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Eine Woche zurück"
        className="pressable"
        style={navBtn()}
      >
        <Icon name="chevron-left" size={14} strokeWidth={2} stroke="var(--ink-3)" />
      </button>
      <div
        style={{
          padding: '0 10px',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--ink-2)',
          whiteSpace: 'nowrap',
          minWidth: 92,
          textAlign: 'center',
        }}
      >
        {label}
      </div>
      <button
        type="button"
        onClick={onForward ?? undefined}
        aria-label="Eine Woche vor"
        disabled={onForward === null}
        className={onForward ? 'pressable' : undefined}
        style={{
          ...navBtn(),
          cursor: onForward ? 'pointer' : 'default',
          opacity: onForward ? 1 : 0.35,
        }}
      >
        <Icon name="chevron-right" size={14} strokeWidth={2} stroke="var(--ink-3)" />
      </button>
    </div>
  );
}

function navBtn() {
  return {
    width: 28,
    height: 28,
    border: 'none',
    background: 'transparent',
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--ink-3)',
    padding: 0,
  } as const;
}

function IconStat({
  icon,
  value,
  unit,
  label,
}: {
  icon: IconName;
  value: string;
  unit?: string;
  label: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'var(--sage-wash)',
          color: 'var(--sage-deep)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={17} strokeWidth={1.7} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 3,
            fontFamily: 'var(--serif)',
            fontSize: 22,
            color: 'var(--ink)',
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
          }}
        >
          {value}
          {unit && (
            <span
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--ink-3)',
              }}
            >
              {unit}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--ink-3)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;

function WeekStrip({ week }: { week: CalendarWeek }) {
  const todayIndex = (() => {
    if (!week.isCurrent) return -1;
    const now = new Date();
    const day = now.getDay();
    return day === 0 ? 6 : day - 1;
  })();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
      }}
    >
      {DAY_LABELS.map((label, idx) => (
        <DayCell
          key={label}
          label={label}
          hasWorkout={week.daysWithWorkout.has(idx)}
          isToday={idx === todayIndex}
        />
      ))}
    </div>
  );
}

function DayCell({
  label,
  hasWorkout,
  isToday,
}: {
  label: string;
  hasWorkout: boolean;
  isToday: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '8px 0',
        borderRadius: 10,
        background: isToday ? 'var(--sage-wash)' : 'transparent',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: isToday ? 'var(--ink)' : 'var(--ink-3)',
        }}
      >
        {label}
      </div>
      <DayMarker hasWorkout={hasWorkout} isToday={isToday} />
    </div>
  );
}

function DayMarker({ hasWorkout, isToday }: { hasWorkout: boolean; isToday: boolean }) {
  if (hasWorkout) {
    return (
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: 'var(--sage-deep)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="check" size={14} strokeWidth={2.4} />
      </div>
    );
  }
  if (isToday) {
    return (
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--sage-deep)',
          }}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        border: '1px solid var(--hairline-strong)',
        opacity: 0.5,
      }}
    />
  );
}
