'use client';

import { useState } from 'react';
import { Icon } from '../Icon';
import type { TrainingData, WorkoutTemplateView } from '../types';
import { HistoryTimeline } from './training/HistoryTimeline';
import { TrainingHeader } from './training/TrainingHeader';
import { WeekCard } from './training/WeekCard';
import { WorkoutMemoryRow } from './training/WorkoutMemoryRow';

interface TrainingScreenProps {
  training: TrainingData;
  workoutTemplates: WorkoutTemplateView[];
  onOpenLog: () => void;
  onCreateTemplate: () => void;
  onEditTemplate: (template: WorkoutTemplateView) => void;
}

export function TrainingScreen({
  training,
  workoutTemplates,
  onOpenLog,
  onCreateTemplate,
  onEditTemplate,
}: TrainingScreenProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const hasAny = training.allWorkouts.length > 0;
  const hasTemplates = workoutTemplates.length > 0;

  return (
    <div className="screen-content scroll">
      <TrainingHeader onOpenLog={onOpenLog} />

      {!hasAny && !hasTemplates ? (
        <div className="pad-x" style={{ marginTop: 18, marginBottom: 32 }}>
          <EmptyState onOpenLog={onOpenLog} />
        </div>
      ) : (
        <>
          {hasAny && (
            <div className="pad-x" style={{ marginTop: 18 }}>
              <WeekCard
                allWorkouts={training.allWorkouts}
                weekOffset={weekOffset}
                onChange={setWeekOffset}
              />
            </div>
          )}

          {hasAny && (
            <>
              <div className="pad-x" style={{ marginTop: 28, marginBottom: 14 }}>
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 22,
                    color: 'var(--ink)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Dein Verlauf
                </div>
              </div>
              <div className="pad-x">
                <HistoryTimeline workouts={training.allWorkouts} />
              </div>
            </>
          )}

          <div className="pad-x" style={{ marginTop: 22, marginBottom: 32 }}>
            <WorkoutMemoryRow
              templates={workoutTemplates}
              onCreate={onCreateTemplate}
              onEdit={onEditTemplate}
            />
          </div>

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
