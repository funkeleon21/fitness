'use client';

import { signOut } from '@/app/(auth)/login/actions';
import { Chat } from '../Chat';
import { Icon } from '../Icon';
import type { DashboardData } from '../types';
import type { LogMode } from './LogSheet';

interface HomeScreenProps {
  data: DashboardData;
  userName: string;
  initials: string;
  onNavigate: (screen: 'home' | 'body' | 'nutrition' | 'training' | 'insights') => void;
  onOpenLog: (mode: LogMode) => void;
  onOpenInsight: (id: string) => void;
}

// `data`, `onNavigate`, `onOpenLog`, `onOpenInsight` werden in dieser Iteration auf Home
// nicht genutzt — Home ist ab jetzt nur noch der Assistent. Props bleiben in der Signature,
// damit der Dashboard-Container nicht angefasst werden muss.
export function HomeScreen({
  data: _data,
  userName,
  initials,
  onNavigate: _onNavigate,
  onOpenLog: _onOpenLog,
  onOpenInsight: _onOpenInsight,
}: HomeScreenProps) {
  // Volle Viewport-Höhe, unten Platz für die fixed TabBar (≈80px) plus iOS-Safe-Area.
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: 460,
        margin: '0 auto',
        height: '100dvh',
        minHeight: 0,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
        boxSizing: 'border-box',
      }}
    >
      <TopBar initials={initials} />
      <Chat userName={userName} />
    </div>
  );
}

function TopBar({ initials }: { initials: string }) {
  return (
    <div
      style={{
        padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 22px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '0.5px solid var(--hairline)',
        flexShrink: 0,
      }}
    >
      <Avatar initials={initials} />
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 10px',
          borderRadius: 999,
          background: 'var(--sage-wash)',
          border: '0.5px solid rgba(110,122,78,0.22)',
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
          color: 'var(--ink-2)',
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            background: 'var(--sage-deep)',
          }}
        />
        LABOR
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="icon-button"
          aria-label="Abmelden"
          title="Abmelden"
          style={{ color: 'var(--ink-2)' }}
        >
          <Icon name="logout" size={20} strokeWidth={1.5} />
        </button>
      </form>
    </div>
  );
}

function Avatar({ initials, size = 36 }: { initials: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #D8C99A 0%, #8A9466 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--sans)',
        fontWeight: 500,
        fontSize: 13,
        letterSpacing: '0.02em',
        boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 6px rgba(60,50,30,0.10)',
      }}
    >
      {initials}
    </div>
  );
}

// Re-export for compatibility falls jemand SectionLabel von hier importiert
export function SectionLabel({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '0 2px' }}>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          letterSpacing: '0.08em',
        }}
      >
        {n}
      </span>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.16em',
          color: 'var(--ink-3)',
          fontWeight: 500,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  );
}
