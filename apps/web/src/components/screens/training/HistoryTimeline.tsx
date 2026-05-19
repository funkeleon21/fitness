'use client';

import type { WorkoutPoint } from '../../types';
import { WorkoutCard } from './WorkoutCard';

interface HistoryTimelineProps {
  workouts: WorkoutPoint[];
}

interface DayGroup {
  key: string;
  label: string;
  diffDays: number;
  workouts: WorkoutPoint[];
}

function groupByDay(workouts: WorkoutPoint[]): DayGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const groups = new Map<string, DayGroup>();

  for (const w of workouts) {
    const d = new Date(w.occurred_at);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
    const key = d.toISOString().slice(0, 10);
    let label: string;
    if (diff === 0) label = 'Heute';
    else if (diff === 1) label = 'Gestern';
    else if (diff > 1 && diff < 7) label = `vor ${diff} Tagen`;
    else label = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' });

    const existing = groups.get(key);
    if (existing) existing.workouts.push(w);
    else groups.set(key, { key, label, diffDays: diff, workouts: [w] });
  }

  return Array.from(groups.values()).sort((a, b) => a.diffDays - b.diffDays);
}

export function HistoryTimeline({ workouts }: HistoryTimelineProps) {
  if (workouts.length === 0) return null;
  const groups = groupByDay(workouts);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {groups.map((group) => (
        <DayGroupBlock key={group.key} group={group} />
      ))}
    </div>
  );
}

function DayGroupBlock({ group }: { group: DayGroup }) {
  const isToday = group.diffDays === 0;
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          paddingLeft: 2,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isToday ? 'var(--sage-deep)' : 'transparent',
            border: isToday ? 'none' : '1.5px solid var(--hairline-strong)',
            flexShrink: 0,
          }}
        />
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>{group.label}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {group.workouts.map((w) => (
          <WorkoutCard key={w.event_id} workout={w} isToday={isToday} />
        ))}
      </div>
    </div>
  );
}
