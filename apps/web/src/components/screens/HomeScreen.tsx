'use client';

import { signOut } from '@/app/(auth)/login/actions';
import { logWeightAction } from '@/app/actions';
import { useState, useTransition } from 'react';
import { ConfidenceBar, Sparkline } from '../Charts';
import { Icon, type IconName } from '../Icon';
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

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function formatDateBadge(now: Date): string {
  const weekday = WEEKDAYS[now.getDay()] ?? 'Heute';
  const day = now.getDate();
  const month = MONTHS[now.getMonth()] ?? '';
  return `${weekday.toUpperCase()} · ${day}. ${month.toUpperCase()}`;
}

function greetingFor(now: Date, name: string): string {
  const hour = now.getHours();
  if (hour < 11) return `Guten Morgen, ${name}.`;
  if (hour < 18) return `Hallo, ${name}.`;
  return `Guten Abend, ${name}.`;
}

export function HomeScreen({
  data,
  userName,
  initials,
  onNavigate,
  onOpenLog,
  onOpenInsight,
}: HomeScreenProps) {
  const now = new Date();
  const greeting = greetingFor(now, userName);
  const dateBadge = formatDateBadge(now);

  const sparkData =
    data.series.length > 1
      ? data.series.slice(-21).map((p) => p.kg)
      : data.series.length === 1
        ? [data.series[0]?.kg ?? 0, data.series[0]?.kg ?? 0]
        : [];

  const latestKg = data.latest?.kg;
  const deltaKg = data.trend7dChangeKg;
  const deltaLabel =
    deltaKg === null || deltaKg === undefined
      ? null
      : `${deltaKg > 0 ? '+' : ''}${deltaKg.toFixed(2)} kg · 7 T`;
  const trendBadge =
    deltaKg === null || deltaKg === undefined
      ? 'NEU'
      : Math.abs(deltaKg) < 0.2
        ? 'STABIL'
        : deltaKg < 0
          ? 'SINKEND'
          : 'STEIGEND';
  const trendColor = deltaKg && deltaKg > 0.2 ? 'var(--amber)' : 'var(--sage-deep)';

  return (
    <div className="screen-content scroll">
      <TopBar initials={initials} />

      <HeroGreeting greeting={greeting} dateBadge={dateBadge} />

      {/* New insight card — dark contrast */}
      <div className="pad-x" style={{ marginTop: 14 }}>
        <SectionLabel n="01" label="Neue Erkenntnis" />
        {/* TODO: live data — currently placeholder */}
        <button
          type="button"
          className="pressable rise"
          onClick={() => onOpenInsight('protein-consistency')}
          style={{
            marginTop: 10,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 20,
            padding: 22,
            background: 'linear-gradient(160deg, #2A2A22 0%, #1F1E18 100%)',
            color: '#F4EFE3',
            border: '0.5px solid rgba(255,255,255,0.06)',
            width: '100%',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'block',
          }}
        >
          <DotPattern />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#C8B98E',
              position: 'relative',
            }}
          >
            <Icon name="sparkle" size={14} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em' }}>
              NEU · 6:04 UHR
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 22,
              lineHeight: 1.22,
              marginTop: 16,
              letterSpacing: '-0.01em',
              maxWidth: '88%',
              position: 'relative',
            }}
          >
            An Tagen mit höherem Protein erreichst du deine Trainingsziele konsistenter.
          </div>
          <div
            style={{
              marginTop: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ConfidenceBar value={0.78} light />
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.04em',
                  color: 'rgba(244,239,227,0.55)',
                }}
              >
                KONFIDENZ 78%
              </span>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 500,
                color: '#F4EFE3',
              }}
            >
              Mehr dazu <Icon name="arrow-right" size={14} strokeWidth={2} />
            </span>
          </div>
        </button>
      </div>

      {/* Trend card — live weight data */}
      <div className="pad-x" style={{ marginTop: 28 }}>
        <SectionLabel n="02" label="Aktueller Trend" />
        <button
          type="button"
          className="card pressable rise"
          onClick={() => onNavigate('body')}
          style={{
            marginTop: 10,
            animationDelay: '60ms',
            padding: 0,
            overflow: 'hidden',
            width: '100%',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'block',
            fontFamily: 'inherit',
            color: 'inherit',
          }}
        >
          <div style={{ padding: '20px 22px 8px' }}>
            <div
              style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    letterSpacing: '0.10em',
                    color: 'var(--ink-4)',
                  }}
                >
                  GEWICHT
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                  <span
                    style={{
                      fontFamily: 'var(--serif)',
                      fontSize: 30,
                      lineHeight: 1,
                      color: 'var(--ink)',
                    }}
                  >
                    {data.trend7d !== null
                      ? data.trend7d.toFixed(1).replace('.', ',')
                      : latestKg !== undefined
                        ? latestKg.toFixed(1).replace('.', ',')
                        : '—'}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                    kg · 7d-Ø
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    color: trendColor,
                    fontWeight: 600,
                  }}
                >
                  {trendBadge}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: 'var(--ink-4)',
                    marginTop: 4,
                  }}
                >
                  {deltaLabel ?? `${data.series.length} Einträge`}
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 6, padding: '0 6px 14px' }}>
            {sparkData.length > 0 ? (
              <Sparkline
                data={sparkData}
                height={70}
                color="var(--sage-deep)"
                title="Gewichtsverlauf"
              />
            ) : (
              <div
                style={{
                  height: 70,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink-4)',
                  fontSize: 13,
                }}
              >
                Noch keine Einträge — trag dein Gewicht ein, um den Verlauf zu sehen.
              </div>
            )}
          </div>
          <div
            style={{
              padding: '14px 22px',
              borderTop: '0.5px solid var(--hairline)',
              background: 'var(--surface-2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: 'var(--ink-2)',
                fontFamily: 'var(--serif)',
                fontStyle: 'italic',
              }}
            >
              {data.series.length === 0
                ? '"Beginne mit deinem ersten Eintrag."'
                : trendBadge === 'STABIL'
                  ? '"Dein Gewicht entwickelt sich aktuell stabil."'
                  : trendBadge === 'SINKEND'
                    ? '"Sanfter Abwärtstrend über die letzten 7 Tage."'
                    : '"Leichter Anstieg — Wasser oder mehr Kalorien?"'}
            </span>
            <Icon name="chevron-right" size={16} strokeWidth={1.8} />
          </div>
        </button>
      </div>

      {/* Quick weight entry — REAL */}
      <div className="pad-x" style={{ marginTop: 16 }}>
        <QuickWeightEntry />
      </div>

      {/* Two lever cards */}
      <div className="pad-x" style={{ marginTop: 28 }}>
        <SectionLabel n="03" label="Sinnvolle Hebel · heute" />
        {/* TODO: live data — currently placeholder */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 8, marginTop: 10 }}>
          <button
            type="button"
            className="card pressable rise"
            onClick={() => onNavigate('insights')}
            style={{
              animationDelay: '100ms',
              padding: 18,
              background: 'var(--sage-wash)',
              border: '0.5px solid rgba(110,122,78,0.22)',
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: 'inherit',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--sage-deep)',
                marginBottom: 14,
              }}
            >
              <Icon name="moon" size={16} strokeWidth={1.5} />
            </div>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 15,
                lineHeight: 1.3,
                color: 'var(--ink)',
              }}
            >
              Mehr Schlafkonsistenz statt weniger Kalorien.
            </div>
            <div
              style={{
                marginTop: 14,
                fontFamily: 'var(--mono)',
                fontSize: 10,
                letterSpacing: '0.06em',
                color: 'var(--sage-deep)',
                fontWeight: 600,
              }}
            >
              EFFEKT · HOCH
            </div>
          </button>
          <button
            type="button"
            className="card pressable rise"
            onClick={() => onNavigate('training')}
            style={{
              animationDelay: '140ms',
              padding: 18,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: 'inherit',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'var(--surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--amber)',
                marginBottom: 14,
              }}
            >
              <Icon name="muscle" size={16} strokeWidth={1.5} />
            </div>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 14,
                lineHeight: 1.3,
                color: 'var(--ink)',
              }}
            >
              Beintag nachholen — fällig.
            </div>
            <div
              style={{
                marginTop: 14,
                fontFamily: 'var(--mono)',
                fontSize: 10,
                letterSpacing: '0.06em',
                color: 'var(--amber)',
                fontWeight: 600,
              }}
            >
              SEIT 6 TAGEN
            </div>
          </button>
        </div>
      </div>

      {/* Open question */}
      <div className="pad-x" style={{ marginTop: 28 }}>
        <SectionLabel n="04" label="Hilf mir verstehen" />
        {/* TODO: live data — currently placeholder */}
        <div className="card rise" style={{ marginTop: 10, animationDelay: '200ms', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 28,
                lineHeight: 0.7,
                color: 'var(--sage-deep)',
                marginTop: 6,
              }}
              aria-hidden="true"
            >
              &ldquo;
            </span>
            <div>
              <div
                className="h-card"
                style={{ fontSize: 16, lineHeight: 1.4, letterSpacing: '-0.005em' }}
              >
                Deine besten Trainingswochen lagen alle nach Phasen mit weniger Reisen. Ist Reisen
                für dich ein wiederkehrender Bremsklotz?
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  color: 'var(--ink-4)',
                }}
              >
                HILFT MIR, LANGFRISTIGE MUSTER ZU EINORDNEN
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              type="button"
              onClick={() => onOpenLog('answer')}
              className="pressable"
              style={{
                flex: 1,
                background: 'var(--ink)',
                color: 'var(--bg)',
                border: 'none',
                borderRadius: 999,
                padding: '11px',
                fontFamily: 'var(--sans)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Antworten
            </button>
            <button
              type="button"
              className="pressable"
              style={{
                flex: 1,
                background: 'transparent',
                color: 'var(--ink-3)',
                border: '0.5px solid var(--hairline-strong)',
                borderRadius: 999,
                padding: '11px',
                fontFamily: 'var(--sans)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Später
            </button>
          </div>
        </div>
      </div>

      {/* Quick capture footer */}
      <div className="pad-x" style={{ marginTop: 28, marginBottom: 24 }}>
        {/* TODO: live data — currently placeholder (Sprache/Foto sind UI-Demos, Text öffnet Gewicht) */}
        <div
          style={{
            padding: 6,
            background: 'var(--surface)',
            borderRadius: 18,
            border: '0.5px solid var(--hairline)',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 4,
          }}
        >
          {(
            [
              { id: 'voice', icon: 'mic', label: 'Sprache' },
              { id: 'photo', icon: 'camera', label: 'Foto' },
              { id: 'text', icon: 'text', label: 'Text' },
            ] as { id: LogMode; icon: IconName; label: string }[]
          ).map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onOpenLog(b.id)}
              className="pressable"
              style={{
                background: 'transparent',
                border: 'none',
                borderRadius: 14,
                padding: '14px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                color: 'var(--ink-2)',
                cursor: 'pointer',
              }}
            >
              <Icon name={b.icon} size={18} strokeWidth={1.5} />
              <span style={{ fontSize: 12, fontWeight: 500 }}>{b.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopBar({ initials }: { initials: string }) {
  return (
    <div
      style={{
        padding: '60px 22px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Avatar initials={initials} />
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 14,
          color: 'var(--ink-2)',
          fontWeight: 500,
        }}
      >
        Heute <Icon name="chevron-down" size={13} strokeWidth={2} />
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

function HeroGreeting({ greeting, dateBadge }: { greeting: string; dateBadge: string }) {
  return (
    <div className="pad-x" style={{ marginTop: 22 }}>
      <div
        className="rise"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 22,
          padding: '26px 22px 24px',
          background:
            'radial-gradient(130% 100% at 100% 0%, rgba(178,188,142,0.55) 0%, rgba(178,188,142,0) 55%), linear-gradient(170deg, #E6E9D2 0%, #D9DEBF 100%)',
          border: '0.5px solid rgba(110,122,78,0.18)',
        }}
      >
        <svg
          width="150"
          height="150"
          viewBox="0 0 150 150"
          style={{ position: 'absolute', right: -28, top: -22, opacity: 0.85 }}
          role="img"
          aria-label="Sage-Schmuckform"
        >
          <title>Sage-Schmuckform</title>
          <defs>
            <radialGradient id="sage-g" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#A6B385" stopOpacity="0.65" />
              <stop offset="60%" stopColor="#A6B385" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#A6B385" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="75" cy="75" r="72" fill="url(#sage-g)" />
          <path d="M40 110c0-32 22-58 56-58 0 32-22 58-56 58z" fill="#8A9466" opacity="0.32" />
          <path
            d="M52 102c2-22 14-38 36-44"
            stroke="#6E7A4E"
            strokeWidth="0.9"
            fill="none"
            opacity="0.5"
          />
        </svg>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 10px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.55)',
              border: '0.5px solid rgba(110,122,78,0.22)',
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: '0.10em',
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
            {dateBadge}
          </div>

          <h1
            className="h-display"
            style={{ fontSize: 36, margin: '22px 0 0', lineHeight: 1.05, maxWidth: '88%' }}
          >
            {greeting}
          </h1>
          <p
            style={{
              marginTop: 14,
              marginBottom: 0,
              color: 'var(--ink-2)',
              fontSize: 15,
              lineHeight: 1.5,
              maxWidth: '78%',
            }}
          >
            Über Nacht ist mir{' '}
            <em style={{ fontFamily: 'var(--serif)', fontStyle: 'italic' }}>etwas Neues</em>{' '}
            aufgefallen.
          </p>
        </div>
      </div>
    </div>
  );
}

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

function DotPattern() {
  const rows = 7;
  const cols = 7;
  return (
    <svg
      width="120"
      height="110"
      viewBox="0 0 120 110"
      style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.55 }}
      aria-hidden="true"
      role="presentation"
    >
      {Array.from({ length: rows * cols }).map((_, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        const cx = 10 + c * 16;
        const cy = 10 + r * 16;
        return (
          <circle
            key={`dot-${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={1.2}
            fill={r + c < 6 ? '#8A9466' : '#3D3A30'}
          />
        );
      })}
    </svg>
  );
}

function QuickWeightEntry() {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await logWeightAction(formData);
        setValue('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Fehler beim Speichern');
      }
    });
  }

  return (
    <form
      action={onSubmit}
      style={{
        background: 'var(--surface)',
        borderRadius: 14,
        border: '0.5px solid var(--hairline)',
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.10em',
          color: 'var(--ink-4)',
          paddingLeft: 4,
        }}
      >
        KG
      </div>
      <input
        type="text"
        inputMode="decimal"
        name="kg"
        placeholder="z.B. 89,4"
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={isPending}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontFamily: 'var(--serif)',
          fontSize: 20,
          color: 'var(--ink)',
          padding: '6px 4px',
        }}
      />
      <button
        type="submit"
        className="btn-primary"
        disabled={isPending || !value.trim()}
        style={{ borderRadius: 999, padding: '10px 16px' }}
      >
        {isPending ? 'Speichere…' : 'Eintragen'}
      </button>
      {error && <div style={{ color: 'var(--amber)', fontSize: 12, marginLeft: 8 }}>{error}</div>}
    </form>
  );
}
