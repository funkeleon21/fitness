'use client';

import { BarChart } from '../Charts';
import { Icon } from '../Icon';

export function TrainingScreen() {
  const volume = [22, 18, 26, 24, 28, 30, 32, 30];
  const muscles: { name: string; priority: string; pct: number; color: string }[] = [
    { name: 'Arme', priority: 'Hohe Priorität', pct: 86, color: 'var(--amber)' },
    { name: 'Rücken', priority: 'Mittel', pct: 58, color: 'var(--sage)' },
    { name: 'Brust', priority: 'Mittel', pct: 54, color: 'var(--sage)' },
    { name: 'Beine', priority: 'Im Plan', pct: 42, color: 'var(--sage-soft)' },
    { name: 'Waden', priority: 'Geringe Priorität', pct: 18, color: 'var(--sage-soft)' },
  ];

  return (
    <div className="screen-content scroll">
      <div
        style={{
          padding: '64px 22px 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ width: 24 }} />
        <div
          style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 15, color: 'var(--ink)' }}
        >
          Training
        </div>
        <div style={{ color: 'var(--ink-3)', fontSize: 18, letterSpacing: '0.1em' }}>···</div>
      </div>

      {/* Volume chart */}
      {/* TODO: live data — currently placeholder */}
      <div className="pad-x" style={{ marginTop: 18 }}>
        <div className="card rise">
          <div className="row-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>
                Trainingsentwicklung
              </div>
              <div style={{ color: 'var(--ink-4)', fontSize: 12 }}>In den letzten 4 Wochen</div>
            </div>
          </div>
          <div className="h-card" style={{ fontSize: 20, marginTop: 12 }}>
            Dein Trainingsvolumen ist konstant hoch.
          </div>
          <div
            className="row gap-2"
            style={{ marginTop: 6, color: 'var(--sage-deep)', fontSize: 13, fontWeight: 600 }}
          >
            Sehr gut!
          </div>
          <div style={{ marginTop: 14, marginLeft: -4, marginRight: -4 }}>
            <BarChart
              data={volume}
              height={130}
              color="var(--sage-deep)"
              muted="var(--sage-soft)"
              title="Trainingsvolumen pro Woche"
            />
          </div>
        </div>
      </div>

      {/* Muscle groups */}
      <div className="pad-x" style={{ marginTop: 12 }}>
        {/* TODO: live data — currently placeholder */}
        <div className="card rise" style={{ animationDelay: '60ms' }}>
          <div className="row-between" style={{ marginBottom: 4 }}>
            <div className="h-card" style={{ fontSize: 17 }}>
              Fokus-Muskelgruppen
            </div>
          </div>
          <div style={{ marginTop: 6 }}>
            {muscles.map((m, i) => (
              <div
                key={m.name}
                style={{
                  padding: '12px 0',
                  borderBottom: i < muscles.length - 1 ? '0.5px solid var(--hairline)' : 'none',
                }}
              >
                <div className="row-between" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
                    {m.name}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 11,
                      color: 'var(--ink-3)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {m.priority}
                  </span>
                </div>
                <div className="progress" style={{ height: 4 }}>
                  <span style={{ width: `${m.pct}%`, background: m.color }} />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="pressable"
            style={{
              marginTop: 16,
              width: '100%',
              background: 'var(--surface-2)',
              color: 'var(--ink-2)',
              border: 'none',
              borderRadius: 12,
              padding: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontFamily: 'var(--sans)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Prioritäten anpassen <Icon name="arrow-right" size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Constraints */}
      <div className="pad-x" style={{ marginTop: 12 }}>
        {/* TODO: live data — currently placeholder */}
        <div className="card rise" style={{ animationDelay: '120ms' }}>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div>
              <div className="h-card" style={{ fontSize: 17 }}>
                Einschränkungen
              </div>
              <div style={{ color: 'var(--ink-4)', fontSize: 12, marginTop: 4 }}>
                Vermerkt für aktuelle Programmierung
              </div>
            </div>
            <Icon name="chevron-right" size={18} />
          </div>
          <div className="chip-row">
            <span
              className="pill"
              style={{
                background: 'rgba(196,152,85,0.14)',
                color: 'var(--amber)',
                fontSize: 12,
              }}
            >
              Schulter rechts · leicht
            </span>
            <span className="pill" style={{ background: 'var(--surface-2)', fontSize: 12 }}>
              Knie OK seit 9 Wochen
            </span>
          </div>
        </div>
      </div>

      {/* Log training */}
      <div className="pad-x" style={{ marginTop: 12, marginBottom: 32 }}>
        {/* TODO: live data — currently placeholder */}
        <button
          type="button"
          className="card pressable rise"
          style={{
            animationDelay: '180ms',
            background: 'var(--ink)',
            color: 'var(--bg)',
            border: 'none',
            width: '100%',
            textAlign: 'left',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <div className="row" style={{ gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--bg)',
              }}
            >
              <Icon name="mic" size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17 }}>
                Training per Sprache loggen
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                "4 Sätze Bankdrücken, 80 Kilo, 8er Reihen…"
              </div>
            </div>
            <Icon name="arrow-right" size={18} />
          </div>
        </button>
      </div>
    </div>
  );
}
