'use client';

import { Icon } from '../Icon';
import { Sheet, SheetCloseButton } from '../Sheet';

interface InsightDetailSheetProps {
  id: string;
  onClose: () => void;
}

interface InsightDetail {
  title: string;
  kind: string;
  conf: number;
  basis: string;
  reasoning: string[];
  uncertainty: string;
}

// TODO: live data — currently placeholder. Real ai_interpretation events follow in Phase 3.
const DETAILS: Record<string, InsightDetail> = {
  'protein-consistency': {
    title: 'An Tagen mit höherem Protein erreichst du deine Trainingsziele konsistenter.',
    kind: 'Erkenntnis',
    conf: 0.78,
    basis: '64 Trainingseinheiten · 9 Wochen',
    reasoning: [
      'An Tagen mit ≥ 1,9 g/kg Protein hast du 87 % deiner geplanten Sätze erreicht.',
      'An Tagen mit < 1,5 g/kg waren es 62 %.',
      'Schlaf und Schritte waren in beiden Gruppen vergleichbar — Protein bleibt als wahrscheinlichster Faktor.',
    ],
    uncertainty: 'Stichprobe ist klein, Confounder wie Kreatin nicht abschließend ausgeschlossen.',
  },
  'sleep-training': {
    title: 'Dein Schlaf hat einen starken Einfluss auf deine Trainingsleistung.',
    kind: 'Muster',
    conf: 0.82,
    basis: '42 Nächte · 38 Trainings',
    reasoning: [
      'Pearson-Korrelation von Schlafdauer und Tagesvolumen: r = 0,71.',
      'Nach Nächten < 6,5 h fielen 4 von 6 Trainings unter dein Ziel.',
      'Effekt setzt mit etwa 1 Tag Verzögerung ein.',
    ],
    uncertainty:
      'Wir sehen Korrelation, keine Kausalität. Mehr Datenpunkte stabilisieren die Aussage.',
  },
};

const FALLBACK: InsightDetail = {
  title: 'Detail',
  kind: 'Erkenntnis',
  conf: 0.7,
  basis: 'Auf Basis deiner Daten',
  reasoning: ['Die App fasst hier die zugrunde liegenden Datenpunkte zusammen.'],
  uncertainty: 'Konfidenz steigt mit der Zeit.',
};

export function InsightDetailSheet({ id, onClose }: InsightDetailSheetProps) {
  const d = DETAILS[id] ?? FALLBACK;

  return (
    <Sheet
      onClose={onClose}
      header={
        <div className="row-between" style={{ marginBottom: 10 }}>
          <div
            className="row gap-2"
            style={{
              color: 'var(--ink-3)',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.04em',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: 3,
                background: 'var(--amber)',
              }}
            />
            {d.kind.toUpperCase()} · KONFIDENZ {Math.round(d.conf * 100)}%
          </div>
          <SheetCloseButton onClose={onClose} />
        </div>
      }
    >
      <div className="h-card" style={{ fontSize: 24, lineHeight: 1.2 }}>
        {d.title}
      </div>
      <div className="mono-sm" style={{ marginTop: 8 }}>
        Grundlage · {d.basis}
      </div>

      <div style={{ marginTop: 18 }}>
        <div className="label" style={{ marginBottom: 8 }}>
          Begründung
        </div>
        {d.reasoning.map((r, i) => (
          <div
            key={r}
            style={{
              padding: '12px 14px',
              marginBottom: 6,
              borderRadius: 12,
              background: 'var(--surface)',
              border: '0.5px solid var(--hairline)',
              fontSize: 14,
              color: 'var(--ink-2)',
              lineHeight: 1.5,
              display: 'flex',
              gap: 10,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--mono)',
                color: 'var(--ink-4)',
                fontSize: 11,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              0{i + 1}
            </span>
            <span>{r}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 14,
          background: 'var(--surface-2)',
        }}
      >
        <div className="row gap-2" style={{ color: 'var(--ink-3)', marginBottom: 6 }}>
          <Icon name="pulse" size={14} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Unsicherheit</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{d.uncertainty}</div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginTop: 14,
        }}
      >
        <button type="button" onClick={onClose} className="pressable btn-secondary">
          Weniger relevant
        </button>
        <button type="button" onClick={onClose} className="pressable btn-primary">
          Als Hebel verfolgen
        </button>
      </div>
    </Sheet>
  );
}
