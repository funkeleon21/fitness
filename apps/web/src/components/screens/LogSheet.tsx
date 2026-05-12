'use client';

import { useEffect, useState } from 'react';
import { Icon } from '../Icon';

export type LogMode = 'voice' | 'photo' | 'text' | 'meal' | 'answer';

interface LogSheetProps {
  mode: LogMode;
  onClose: () => void;
}

type Stage = 'recording' | 'capturing' | 'input' | 'processing' | 'review';

interface ParsedMeal {
  label: string;
  kcal: number;
  protein: number;
  source: LogMode;
  confidence: number;
  time: string;
}

export function LogSheet({ mode, onClose }: LogSheetProps) {
  const initialStage: Stage =
    mode === 'voice' ? 'recording' : mode === 'photo' ? 'capturing' : 'input';
  const [stage, setStage] = useState<Stage>(initialStage);
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedMeal | null>(null);

  useEffect(() => {
    if (mode === 'voice' && stage === 'recording') {
      const t = setTimeout(() => {
        setText('Mittagessen — Hähnchen, Reis und Brokkoli, ungefähr 600 Kalorien geschätzt');
        setStage('processing');
      }, 2200);
      return () => clearTimeout(t);
    }
    if (mode === 'photo' && stage === 'capturing') {
      const t = setTimeout(() => setStage('processing'), 1400);
      return () => clearTimeout(t);
    }
    if (stage === 'processing') {
      const t = setTimeout(() => {
        setParsed({
          label: mode === 'photo' ? 'Bowl mit Reis, Hähnchen & Gemüse' : text || 'Mahlzeit',
          kcal: 612,
          protein: 48,
          source: mode,
          confidence: 0.78,
          time: 'Jetzt',
        });
        setStage('review');
      }, 1400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [mode, stage, text]);

  return (
    <button
      type="button"
      className="sheet-backdrop"
      onClick={onClose}
      aria-label="Schließen"
      style={{ border: 'none', cursor: 'default', padding: 0 }}
    >
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        // biome-ignore lint/a11y/useSemanticElements: bottom-sheet without native <dialog> lifecycle
        role="dialog"
        aria-modal="true"
      >
        <div className="sheet-handle" />
        <div className="row-between" style={{ marginBottom: 8 }}>
          <div className="h-card" style={{ fontSize: 22 }}>
            {mode === 'voice' && 'Sprach-Log'}
            {mode === 'photo' && 'Foto-Log'}
            {mode === 'text' && 'Text-Log'}
            {mode === 'meal' && 'Mahlzeit hinzufügen'}
            {mode === 'answer' && 'Kurze Rückfrage'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pressable"
            aria-label="Schließen"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--surface-2)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-3)',
              cursor: 'pointer',
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {mode === 'voice' && stage === 'recording' && <VoiceRecording />}
        {mode === 'photo' && stage === 'capturing' && <PhotoCapture />}
        {stage === 'processing' && <Processing />}
        {(mode === 'text' || mode === 'meal') && stage === 'input' && (
          <TextInputBlock
            value={text}
            onChange={setText}
            onContinue={() => setStage('processing')}
          />
        )}
        {mode === 'answer' && stage === 'input' && (
          <AnswerInput value={text} onChange={setText} onContinue={onClose} />
        )}
        {stage === 'review' && parsed && (
          <ReviewParsed parsed={parsed} onConfirm={onClose} onEdit={() => setStage('input')} />
        )}

        {/* Hint footer for placeholder flows */}
        <div
          style={{
            marginTop: 14,
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--ink-4)',
            letterSpacing: '0.06em',
            textAlign: 'center',
          }}
        >
          {/* TODO: live data — currently placeholder. Ingestion-Pipeline (Phase 2) folgt. */}
          DEMO · INGESTION FOLGT IN PHASE 2
        </div>
      </div>
    </button>
  );
}

function VoiceRecording() {
  return (
    <div style={{ textAlign: 'center', padding: '28px 8px 14px' }}>
      <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'var(--sage)',
            opacity: 0.18,
            animation: 'pulse-glow 1.4s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 10,
            borderRadius: '50%',
            background: 'var(--sage)',
            opacity: 0.28,
            animation: 'pulse-glow 1.4s ease-in-out 0.2s infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 22,
            borderRadius: '50%',
            background: 'var(--sage-deep)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="mic" size={26} />
        </div>
      </div>
      <div
        style={{
          marginTop: 18,
          color: 'var(--ink-2)',
          fontFamily: 'var(--serif)',
          fontSize: 17,
        }}
      >
        Ich höre zu…
      </div>
      <div style={{ marginTop: 6, color: 'var(--ink-4)', fontSize: 12 }}>
        "Mittagessen war Hähnchen mit Reis…"
      </div>
      <Waveform />
    </div>
  );
}

function Waveform() {
  const bars = Array.from({ length: 32 }, (_, i) => 8 + Math.abs(Math.sin(i * 0.7) * 18) + 6);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        marginTop: 24,
        height: 36,
      }}
    >
      {bars.map((h, i) => (
        <span
          key={`wf-${i}-${h.toFixed(0)}`}
          style={{
            width: 3,
            borderRadius: 2,
            height: h,
            background: 'var(--sage)',
            opacity: 0.4 + (i % 3) * 0.2,
            animation: `waveform 0.9s ease-in-out ${i * 0.04}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

function PhotoCapture() {
  return (
    <div style={{ padding: '14px 8px 18px' }}>
      <div
        style={{
          height: 220,
          borderRadius: 18,
          overflow: 'hidden',
          position: 'relative',
          background: 'linear-gradient(135deg, #D7CDA0 0%, #B2BC8E 60%, #8A9466 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 14,
            border: '0.5px dashed rgba(255,255,255,0.5)',
            borderRadius: 14,
          }}
        />
        <div
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '0.06em',
          }}
        >
          BILD AUFGENOMMEN
        </div>
      </div>
      <div
        style={{
          marginTop: 14,
          color: 'var(--ink-2)',
          fontFamily: 'var(--serif)',
          fontSize: 16,
          textAlign: 'center',
        }}
      >
        Analysiere Bild…
      </div>
    </div>
  );
}

function Processing() {
  return (
    <div style={{ padding: '24px 8px 18px', textAlign: 'center' }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          margin: '0 auto',
          background: 'var(--surface-2)',
          color: 'var(--sage-deep)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'spin 1.6s linear infinite',
        }}
      >
        <Icon name="sparkle" size={24} />
      </div>
      <div
        style={{
          marginTop: 14,
          color: 'var(--ink-2)',
          fontFamily: 'var(--serif)',
          fontSize: 16,
        }}
      >
        Strukturiere Daten…
      </div>
      <div style={{ marginTop: 4, color: 'var(--ink-4)', fontSize: 12 }}>
        Ich erkenne Mahlzeit, Menge und Makros
      </div>
    </div>
  );
}

function TextInputBlock({
  value,
  onChange,
  onContinue,
}: {
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
}) {
  return (
    <div style={{ padding: '8px 0 14px' }}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="z.B. Mittag: Skyr mit Beeren und Mandeln…"
        className="text-input"
        style={{ minHeight: 110, resize: 'none' }}
      />
      <button
        type="button"
        onClick={onContinue}
        disabled={!value.trim()}
        className="pressable btn-primary"
        style={{ width: '100%', marginTop: 12, padding: '14px' }}
      >
        Strukturieren
      </button>
    </div>
  );
}

function AnswerInput({
  value,
  onChange,
  onContinue,
}: {
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
}) {
  return (
    <div style={{ padding: '4px 0 14px' }}>
      <div
        style={{
          color: 'var(--ink-2)',
          fontFamily: 'var(--serif)',
          fontSize: 17,
          lineHeight: 1.35,
          marginBottom: 12,
        }}
      >
        Deine besten Trainingswochen lagen alle nach Phasen mit weniger Reisen. Ist Reisen für dich
        ein wiederkehrender Bremsklotz?
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        {['Ja, klarer Bremsklotz', 'Eher selten'].map((t) => (
          <button
            type="button"
            key={t}
            onClick={onContinue}
            className="pressable"
            style={{
              padding: '12px 10px',
              borderRadius: 12,
              background: 'var(--surface)',
              border: '0.5px solid var(--hairline-strong)',
              color: 'var(--ink-2)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Optional: kurze Notiz…"
        className="text-input"
        style={{ minHeight: 70, resize: 'none' }}
      />
      <button
        type="button"
        onClick={onContinue}
        className="pressable btn-primary"
        style={{ width: '100%', marginTop: 10, padding: '13px' }}
      >
        Speichern
      </button>
    </div>
  );
}

function ReviewParsed({
  parsed,
  onConfirm,
  onEdit,
}: {
  parsed: ParsedMeal;
  onConfirm: () => void;
  onEdit: () => void;
}) {
  return (
    <div style={{ padding: '6px 0 8px' }}>
      <div style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 10 }}>
        So habe ich das verstanden — bitte kurz prüfen:
      </div>
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 18,
          padding: 18,
          border: '0.5px solid var(--hairline)',
        }}
      >
        <div style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink)' }}>
          {parsed.label}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 8,
            marginTop: 14,
          }}
        >
          <Stat label="Kcal" value={String(parsed.kcal)} />
          <Stat label="Protein" value={`${parsed.protein} g`} />
          <Stat label="Sicherheit" value={`${Math.round(parsed.confidence * 100)}%`} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginTop: 12 }}>
        <button type="button" onClick={onEdit} className="pressable btn-secondary">
          Anpassen
        </button>
        <button type="button" onClick={onConfirm} className="pressable btn-primary">
          Bestätigen &amp; speichern
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '10px 12px' }}>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          letterSpacing: '0.06em',
        }}
      >
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 17,
          color: 'var(--ink)',
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}
