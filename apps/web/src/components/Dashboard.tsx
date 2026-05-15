'use client';

import type { NutritionTargets } from '@/lib/nutrition';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Icon, type IconName } from './Icon';
import { HomeScreen } from './screens/HomeScreen';
import type {
  DashboardData,
  MealTemplateView,
  NutritionData,
  TrainingData,
  WorkoutTemplateView,
} from './types';

const BodyScreen = dynamic(() =>
  import('./screens/BodyScreen').then((m) => ({ default: m.BodyScreen })),
);
const NutritionScreen = dynamic(() =>
  import('./screens/NutritionScreen').then((m) => ({ default: m.NutritionScreen })),
);
const TrainingScreen = dynamic(() =>
  import('./screens/TrainingScreen').then((m) => ({ default: m.TrainingScreen })),
);
const InsightsScreen = dynamic(() =>
  import('./screens/InsightsScreen').then((m) => ({ default: m.InsightsScreen })),
);
const InsightDetailSheet = dynamic(() =>
  import('./screens/InsightDetailSheet').then((m) => ({ default: m.InsightDetailSheet })),
);
const MealTemplateSheet = dynamic(() =>
  import('./screens/MealTemplateSheet').then((m) => ({ default: m.MealTemplateSheet })),
);
const MealComposerSheet = dynamic(() =>
  import('./screens/MealComposerSheet').then((m) => ({ default: m.MealComposerSheet })),
);
const WorkoutLogSheet = dynamic(() =>
  import('./screens/WorkoutLogSheet').then((m) => ({ default: m.WorkoutLogSheet })),
);
const WorkoutTemplateSheet = dynamic(() =>
  import('./screens/WorkoutTemplateSheet').then((m) => ({ default: m.WorkoutTemplateSheet })),
);
const WorkoutTemplatePickerSheet = dynamic(() =>
  import('./screens/WorkoutTemplatePickerSheet').then((m) => ({
    default: m.WorkoutTemplatePickerSheet,
  })),
);

type ScreenId = 'home' | 'body' | 'nutrition' | 'training' | 'insights';
type TemplateEdit = { kind: 'new' } | { kind: 'edit'; template: MealTemplateView };
type WorkoutTemplateEdit = { kind: 'new' } | { kind: 'edit'; template: WorkoutTemplateView };
type WorkoutLogState = { mode: 'empty' } | { mode: 'fromTemplate'; template: WorkoutTemplateView };

interface DashboardProps {
  data: DashboardData;
  nutrition: NutritionData;
  nutritionTargets: NutritionTargets;
  mealTemplates: MealTemplateView[];
  training: TrainingData;
  workoutTemplates: WorkoutTemplateView[];
  userName: string;
  initials: string;
}

export function Dashboard({
  data,
  nutrition,
  nutritionTargets,
  mealTemplates,
  training,
  workoutTemplates,
  userName,
  initials,
}: DashboardProps) {
  const [screen, setScreen] = useState<ScreenId>('home');
  const [insightId, setInsightId] = useState<string | null>(null);
  const [templateEdit, setTemplateEdit] = useState<TemplateEdit | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [workoutLog, setWorkoutLog] = useState<WorkoutLogState | null>(null);
  const [workoutTemplateEdit, setWorkoutTemplateEdit] = useState<WorkoutTemplateEdit | null>(null);
  const [workoutPickerOpen, setWorkoutPickerOpen] = useState(false);

  // Plus-Knopf auf der Trainings-Seite: bei vorhandenen Vorlagen Picker, sonst
  // direkt das leere Log-Sheet. Vermeidet einen unnötigen Klick im Empty-State.
  const openWorkoutLog = () => {
    if (workoutTemplates.length > 0) setWorkoutPickerOpen(true);
    else setWorkoutLog({ mode: 'empty' });
  };

  const navigate = (next: ScreenId) => setScreen(next);

  return (
    <div className="app-canvas">
      <ScreenWrapper active={screen === 'home'}>
        <HomeScreen
          data={data}
          userName={userName}
          initials={initials}
          onNavigate={navigate}
          onOpenInsight={setInsightId}
        />
      </ScreenWrapper>
      <ScreenWrapper active={screen === 'body'}>
        <BodyScreen data={data} onNavigate={navigate} />
      </ScreenWrapper>
      <ScreenWrapper active={screen === 'nutrition'}>
        <NutritionScreen
          nutrition={nutrition}
          nutritionTargets={nutritionTargets}
          mealTemplates={mealTemplates}
          userName={userName}
          onOpenComposer={() => setComposerOpen(true)}
          onCreateTemplate={() => setTemplateEdit({ kind: 'new' })}
          onEditTemplate={(t) => setTemplateEdit({ kind: 'edit', template: t })}
        />
      </ScreenWrapper>
      <ScreenWrapper active={screen === 'training'}>
        <TrainingScreen
          training={training}
          workoutTemplates={workoutTemplates}
          onOpenLog={openWorkoutLog}
          onCreateTemplate={() => setWorkoutTemplateEdit({ kind: 'new' })}
          onEditTemplate={(t) => setWorkoutTemplateEdit({ kind: 'edit', template: t })}
        />
      </ScreenWrapper>
      <ScreenWrapper active={screen === 'insights'}>
        <InsightsScreen onOpenInsight={setInsightId} />
      </ScreenWrapper>

      <TabBar current={screen} onChange={navigate} />

      {insightId && <InsightDetailSheet id={insightId} onClose={() => setInsightId(null)} />}
      {templateEdit && (
        <MealTemplateSheet mode={templateEdit} onClose={() => setTemplateEdit(null)} />
      )}
      {composerOpen && (
        <MealComposerSheet templates={mealTemplates} onClose={() => setComposerOpen(false)} />
      )}
      {workoutPickerOpen && (
        <WorkoutTemplatePickerSheet
          templates={workoutTemplates}
          onClose={() => setWorkoutPickerOpen(false)}
          onPickTemplate={(tpl) => {
            setWorkoutPickerOpen(false);
            setWorkoutLog({ mode: 'fromTemplate', template: tpl });
          }}
          onPickEmpty={() => {
            setWorkoutPickerOpen(false);
            setWorkoutLog({ mode: 'empty' });
          }}
        />
      )}
      {workoutLog && (
        <WorkoutLogSheet
          fromTemplate={workoutLog.mode === 'fromTemplate' ? workoutLog.template : undefined}
          onClose={() => setWorkoutLog(null)}
        />
      )}
      {workoutTemplateEdit && (
        <WorkoutTemplateSheet
          mode={workoutTemplateEdit}
          onClose={() => setWorkoutTemplateEdit(null)}
        />
      )}
    </div>
  );
}

function ScreenWrapper({ active, children }: { active: boolean; children: React.ReactNode }) {
  if (!active) return null;
  return <>{children}</>;
}

interface TabBarProps {
  current: ScreenId;
  onChange: (id: ScreenId) => void;
}

function TabBar({ current, onChange }: TabBarProps) {
  const items: { id: ScreenId; icon: IconName; label: string }[] = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'body', icon: 'body', label: 'Körper' },
    { id: 'nutrition', icon: 'leaf', label: 'Ernährung' },
    { id: 'training', icon: 'dumbbell', label: 'Training' },
    { id: 'insights', icon: 'insights', label: 'Insights' },
  ];

  return (
    <nav className="tabbar" aria-label="Hauptnavigation">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          className={`tabbar-item ${current === it.id ? 'active' : ''}`}
          onClick={() => onChange(it.id)}
          aria-current={current === it.id ? 'page' : undefined}
        >
          <Icon name={it.icon} size={22} strokeWidth={current === it.id ? 1.8 : 1.4} />
          <span>{it.label}</span>
          <span className="dot" />
        </button>
      ))}
    </nav>
  );
}
