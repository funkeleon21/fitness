'use client';

import { useState } from 'react';
import { Icon, type IconName } from './Icon';
import { BodyScreen } from './screens/BodyScreen';
import { HomeScreen } from './screens/HomeScreen';
import { InsightDetailSheet } from './screens/InsightDetailSheet';
import { InsightsScreen } from './screens/InsightsScreen';
import { type LogMode, LogSheet } from './screens/LogSheet';
import { NutritionScreen } from './screens/NutritionScreen';
import { TrainingScreen } from './screens/TrainingScreen';
import type { DashboardData } from './types';

type ScreenId = 'home' | 'body' | 'nutrition' | 'training' | 'insights';

interface DashboardProps {
  data: DashboardData;
  userName: string;
  initials: string;
}

export function Dashboard({ data, userName, initials }: DashboardProps) {
  const [screen, setScreen] = useState<ScreenId>('home');
  const [logMode, setLogMode] = useState<LogMode | null>(null);
  const [insightId, setInsightId] = useState<string | null>(null);

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
        <NutritionScreen onOpenLog={openLog} />
      </ScreenWrapper>
      <ScreenWrapper active={screen === 'training'}>
        <TrainingScreen />
      </ScreenWrapper>
      <ScreenWrapper active={screen === 'insights'}>
        <InsightsScreen onOpenInsight={setInsightId} />
      </ScreenWrapper>

      <TabBar current={screen} onChange={navigate} />

      {logMode && <LogSheet mode={logMode} onClose={closeLog} />}
      {insightId && <InsightDetailSheet id={insightId} onClose={() => setInsightId(null)} />}
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
