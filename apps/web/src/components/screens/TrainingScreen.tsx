'use client';

import { retractWorkoutAction } from '@/app/actions';
import { Icon } from '../Icon';
import type { TrainingData, WorkoutPoint, WorkoutTemplateView } from '../types';

interface TrainingScreenProps {
  training: TrainingData;
  workoutTemplates: WorkoutTemplateView[];
  onOpenLog: () => void;
  onCreateTemplate: () => void;
  onEditTemplate: (template: WorkoutTemplateView) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDay = new Date(d);
  eventDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - eventDay.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Gestern';
  if (diffDays > 1 && diffDays < 7) return `vor ${diffDays} Tagen`;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function countSets(w: WorkoutPoint): number {
  if (!w.exercises) return 0;
  return w.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
}

export function TrainingScreen({
  training,
  workoutTemplates,
  onOpenLog,
  onCreateTemplate,
  onEditTemplate,
}: TrainingScreenProps) {
  const hasAny = training.recent.length > 0;
  const hasTemplates = workoutTemplates.length > 0;

  return (
    <div className="screen-content scroll">
      <Header onOpenLog={onOpenLog} />

      {!hasAny && !hasTemplates ? (
        <div className="pad-x" style={{ marginTop: 18, marginBottom: 32 }}>
          <EmptyState onOpenLog={onOpenLog} />
        </div>
      ) : (
        <>
          {hasAny && (
            <div className="pad-x" style={{ marginTop: 18 }}>
              <WeekSummaryCard totals={training.thisWeekTotals} />
            </div>
          )}

          <div className="pad-x" style={{ marginTop: 14 }}>
            <WorkoutMemoryCard
              templates={workoutTemplates}
              onCreate={onCreateTemplate}
              onEdit={onEditTemplate}
            />
          </div>

          {hasAny && (
            <div className="pad-x" style={{ marginTop: 14, marginBottom: 32 }}>
              <RecentList workouts={training.recent} />
            </div>
          )}

          {!hasAny && (
            <div className="pad-x" style={{ marginTop: 14, marginBottom: 32 }}>
              <FirstWorkoutHint onOpenLog={onOpenLog} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FirstWorkoutHint({ onOpenLog }: { onOpenLog: () => void }) {
  return (
    <div className="card rise" style={{ padding: '18px 18px' }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)' }}>
        Bereit zum ersten Training?
      </div>
      <div style={{ marginTop: 6, color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.5 }}>
        Wähle eine Vorlage oben oder tippe auf das Plus rechts oben.
      </div>
      <button
        type="button"
        onClick={onOpenLog}
        className="pressable"
        style={{
          marginTop: 12,
          padding: '10px 14px',
          borderRadius: 10,
          background: 'var(--sage-deep)',
          color: 'white',
          border: 'none',
          fontFamily: 'var(--sans)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Icon name="plus" size={12} strokeWidth={2} /> Training loggen
      </button>
    </div>
  );
}

function WorkoutMemoryCard({
  templates,
  onCreate,
  onEdit,
}: {
  templates: WorkoutTemplateView[];
  onCreate: () => void;
  onEdit: (t: WorkoutTemplateView) => void;
}) {
  return (
    <div className="card rise" style={{ animationDelay: '60ms', padding: '20px 18px' }}>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div className="h-card" style={{ fontSize: 19 }}>
          Workout Memory
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="pressable"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--sage-deep)',
            fontFamily: 'var(--sans)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Neue Vorlage
        </button>
      </div>

      {templates.length === 0 ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '8px 0 4px' }}>
          Noch keine Vorlagen. Tippe „Neue Vorlage" für deinen ersten Push-Day.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onEdit(t)}
              aria-label={`Vorlage ${t.label} bearbeiten`}
              className="pressable"
              style={{
                padding: '12px 14px',
                background: 'var(--surface-2)',
                border: '0.5px solid var(--hairline)',
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--ink)',
                  }}
                >
                  {t.label}
                </div>
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    color: 'var(--ink-3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {summarizeTemplate(t)}
                </div>
              </div>
              <Icon name="chevron-right" size={14} strokeWidth={1.6} stroke="var(--ink-4)" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function summarizeTemplate(tpl: WorkoutTemplateView): string {
  const exCount = tpl.exercises.length;
  const setCount = tpl.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const usageHint = tpl.usage_count > 0 ? `${tpl.usage_count}×` : 'noch nicht genutzt';
  const parts: string[] = [];
  if (exCount > 0) parts.push(`${exCount} ${exCount === 1 ? 'Übung' : 'Übungen'}`);
  if (setCount > 0) parts.push(`${setCount} ${setCount === 1 ? 'Satz' : 'Sätze'}`);
  parts.push(usageHint);
  return parts.join(' · ');
}

function Header({ onOpenLog }: { onOpenLog: () => void }) {
  return (
    <div
      style={{
        padding: '52px 22px 4px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div>
        <div
          className="h-display"
          style={{ fontFamily: 'var(--serif)', fontSize: 38, lineHeight: 1.04 }}
        >
          Training
        </div>
        <div style={{ marginTop: 4, color: 'var(--ink-3)', fontSize: 14 }}>
          Was hast du heute gemacht?
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenLog}
        aria-label="Training hinzufügen"
        className="pressable"
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: 'var(--sage-wash)',
          border: '0.5px solid rgba(110,122,78,0.22)',
          color: 'var(--sage-deep)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          marginTop: 6,
        }}
      >
        <Icon name="plus" size={16} strokeWidth={2} />
      </button>
    </div>
  );
}

function EmptyState({ onOpenLog }: { onOpenLog: () => void }) {
  return (
    <div
      className="card rise"
      style={{ padding: '28px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--sage-wash)',
          color: 'var(--sage-deep)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="dumbbell" size={26} strokeWidth={1.6} />
      </div>
      <div>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 22,
            lineHeight: 1.15,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
        >
          Noch keine Trainings erfasst
        </div>
        <div style={{ marginTop: 6, color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.45 }}>
          Sobald du eine Einheit loggst, entsteht hier dein Verlauf. Keine Schätzwerte, keine
          vorausgefüllten Volumen — nur was du wirklich gemacht hast.
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenLog}
        className="pressable"
        style={{
          padding: '12px 16px',
          borderRadius: 12,
          background: 'var(--sage-deep)',
          color: 'white',
          border: 'none',
          fontFamily: 'var(--sans)',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          alignSelf: 'flex-start',
        }}
      >
        <Icon name="plus" size={14} strokeWidth={2} /> Erste Einheit loggen
      </button>
    </div>
  );
}

function WeekSummaryCard({
  totals,
}: {
  totals: { count: number; totalSets: number; totalDurationMin: number };
}) {
  if (totals.count === 0) {
    return (
      <div className="card rise" style={{ padding: '20px 18px' }}>
        <div className="label" style={{ marginBottom: 6 }}>
          Diese Woche
        </div>
        <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>
          In den letzten 7 Tagen noch kein Training. Letzte Einheit weiter unten.
        </div>
      </div>
    );
  }

  return (
    <div className="card rise" style={{ padding: '20px 18px' }}>
      <div className="label" style={{ marginBottom: 6 }}>
        Diese Woche
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <Stat label="Einheiten" value={String(totals.count)} />
        <Stat label="Sätze" value={String(totals.totalSets)} />
        <Stat
          label="Dauer"
          value={totals.totalDurationMin > 0 ? `${totals.totalDurationMin} min` : '—'}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 22,
          color: 'var(--ink)',
          lineHeight: 1.1,
          letterSpacing: '-0.01em',
        }}
      >
        {value}
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
  );
}

function RecentList({ workouts }: { workouts: WorkoutPoint[] }) {
  return (
    <div className="card rise" style={{ animationDelay: '60ms', padding: '20px 18px 8px' }}>
      <div className="h-card" style={{ fontSize: 19, marginBottom: 10 }}>
        Verlauf
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {workouts.map((w, i) => (
          <WorkoutRow key={w.event_id} workout={w} isLast={i === workouts.length - 1} />
        ))}
      </div>
    </div>
  );
}

function WorkoutRow({ workout, isLast }: { workout: WorkoutPoint; isLast: boolean }) {
  const sets = countSets(workout);
  const exerciseCount = workout.exercises?.length ?? 0;

  return (
    <div
      style={{
        padding: '14px 0',
        borderBottom: isLast ? 'none' : '0.5px solid var(--hairline)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
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
          {formatDate(workout.occurred_at)} · {formatTime(workout.occurred_at)}
          {workout.duration_min ? ` · ${workout.duration_min} min` : ''}
          {workout.corrected ? ' · korrigiert' : ''}
        </div>
        {exerciseCount > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {workout.exercises?.slice(0, 4).map((ex, idx) => (
              <ExerciseLine key={`${workout.event_id}-${idx}`} exercise={ex} />
            ))}
            {exerciseCount > 4 && (
              <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>
                + {exerciseCount - 4} weitere Übungen
              </div>
            )}
          </div>
        )}
        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sets > 0 && (
            <span
              style={{
                display: 'inline-block',
                padding: '3px 8px',
                borderRadius: 999,
                background: 'var(--surface-2)',
                fontSize: 11,
                color: 'var(--ink-2)',
              }}
            >
              {sets} {sets === 1 ? 'Satz' : 'Sätze'}
            </span>
          )}
        </div>
        <form
          action={retractWorkoutAction}
          style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}
        >
          <input type="hidden" name="event_id" value={workout.event_id} />
          <button
            type="submit"
            className="pressable"
            style={{
              background: 'transparent',
              border: '0.5px solid var(--hairline-strong)',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 11,
              color: 'var(--ink-3)',
              cursor: 'pointer',
            }}
          >
            Zurückziehen
          </button>
        </form>
      </div>
    </div>
  );
}

function ExerciseLine({
  exercise,
}: {
  exercise: { name: string; sets: Array<{ reps?: number; weight_kg?: number }> };
}) {
  // Kompakte Zusammenfassung: „Bankdrücken — 80×8, 80×7, 75×6"
  const setSummaries = exercise.sets
    .map((s) => {
      if (s.weight_kg !== undefined && s.reps !== undefined) return `${s.weight_kg}×${s.reps}`;
      if (s.weight_kg !== undefined) return `${s.weight_kg} kg`;
      if (s.reps !== undefined) return `${s.reps} Wdh.`;
      return '–';
    })
    .filter((s) => s !== '–');

  return (
    <div
      style={{
        fontSize: 13,
        color: 'var(--ink-2)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontWeight: 500 }}>{exercise.name}</span>
      {setSummaries.length > 0 && (
        <span style={{ color: 'var(--ink-3)' }}>{` — ${setSummaries.join(', ')}`}</span>
      )}
    </div>
  );
}
