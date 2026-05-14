'use client';

import type { NutritionTargets } from '@/lib/nutrition';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Icon, type IconName } from './Icon';
import { HomeScreen } from './screens/HomeScreen';
import type { LogMode } from './screens/LogSheet';
import type { DashboardData, MealTemplateView, NutritionData } from './types';

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
const LogSheet = dynamic(() => import('./screens/LogSheet').then((m) => ({ default: m.LogSheet })));
const InsightDetailSheet = dynamic(() =>
  import('./screens/InsightDetailSheet').then((m) => ({ default: m.InsightDetailSheet })),
);
const MealTemplateSheet = dynamic(() =>
  import('./screens/MealTemplateSheet').then((m) => ({ default: m.MealTemplateSheet })),
);
const MealComposerSheet = dynamic(() =>
  import('./screens/MealComposerSheet').then((m) => ({ default: m.MealComposerSheet })),
);

type ScreenId = 'home' | 'body' | 'nutrition' | 'training' | 'insights';
type TemplateEdit = { kind: 'new' } | { kind: 'edit'; template: MealTemplateView };

interface DashboardProps {
  data: DashboardData;
  nutrition: NutritionData;
  nutritionTargets: NutritionTargets;
  mealTemplates: MealTemplateView[];
  userName: string;
  initials: string;
}

export function Dashboard({
  data,
  nutrition,
  nutritionTargets,
  mealTemplates,
  userName,
  initials,
}: DashboardProps) {
  const [screen, setScreen] = useState<ScreenId>('home');
  const [logMode, setLogMode] = useState<LogMode | null>(null);
  const [insightId, setInsightId] = useState<string | null>(null);
  const [templateEdit, setTemplateEdit] = useState<TemplateEdit | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const navigate = (next: ScreenId) => setScreen(next);
  const openLog = (mode: LogMode) => setLogMode(mode);
  const closeLog = () => setLogMode(null);

  return (
    <div className="app-canvas">
      <ScreenWrapper active={screen === 'home'}>
        <HomeScreen
          data={data}
          userName={userName}
          initials={initials}
          onNavigate={navigate}
          onOpenLog={openLog}
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
          onOpenLog={openLog}
          onOpenComposer={() => setComposerOpen(true)}
          onCreateTemplate={() => setTemplateEdit({ kind: 'new' })}
          onEditTemplate={(t) => setTemplateEdit({ kind: 'edit', template: t })}
        />
      </ScreenWrapper>
      <ScreenWrapper active={screen === 'training'}>
        <TrainingScreen />
      </ScreenWrapper>
      <ScreenWrapper active={screen === 'insights'}>
        <InsightsScreen onOpenInsight={setInsightId} />
      </ScreenWrapper>

      <TabBar current={screen} onChange={navigate} />

      {logMode && <LogSheet mode={logMode} mealTemplates={mealTemplates} onClose={closeLog} />}
      {insightId && <InsightDetailSheet id={insightId} onClose={() => setInsightId(null)} />}
      {templateEdit && (
        <MealTemplateSheet mode={templateEdit} onClose={() => setTemplateEdit(null)} />
      )}
      {composerOpen && <MealComposerSheet onClose={() => setComposerOpen(false)} />}
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
