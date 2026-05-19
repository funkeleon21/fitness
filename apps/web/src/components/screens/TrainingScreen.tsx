'use client';

import { useState } from 'react';
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

  return (
    <div className="screen-content scroll">
      <TrainingHeader onOpenLog={onOpenLog} />

      <div className="pad-x" style={{ marginTop: 18 }}>
        <WeekCard
          allWorkouts={training.allWorkouts}
          weekOffset={weekOffset}
          onChange={setWeekOffset}
        />
      </div>

      {hasAny && (
        <>
          <div className="pad-x" style={{ marginTop: 32, marginBottom: 16 }}>
            <div
              className="h-display"
              style={{
                fontSize: 26,
                letterSpacing: '-0.015em',
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

      <div className="pad-x" style={{ marginTop: hasAny ? 22 : 18, marginBottom: 32 }}>
        <WorkoutMemoryRow
          templates={workoutTemplates}
          onCreate={onCreateTemplate}
          onEdit={onEditTemplate}
        />
      </div>
    </div>
  );
}
