'use client';

import { saveComposedMealAction } from '@/app/actions';
import type { RecognizedMeal } from '@/app/api/recognize-meal/route';
import { MEAL_SLOTS, type MealSlotId, mealSlotFromIso } from '@/lib/nutrition';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Icon } from '../Icon';

type Stage = 'capture' | 'analyzing' | 'review' | 'saving';

interface CapturedImage {
  id: string;
  dataUrl: string;
}

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface MealComposerSheetProps {
  onClose: () => void;
}

const MAX_IMAGES = 3;
const MAX_IMAGE_DIMENSION = 1024;

export function MealComposerSheet({ onClose }: MealComposerSheetProps) {
  const [stage, setStage] = useState<Stage>('capture');
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [result, setResult] = useState<RecognizedMeal | null>(null);
  const [chatLog, setChatLog] = useState<ChatTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);

  async function runAnalysis(imgs: CapturedImage[]) {
    setStage('analyzing');
    setError(null);
    try {
      const res = await fetch('/api/recognize-meal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ images: imgs.map((i) => i.dataUrl) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'KI-Erkennung fehlgeschlagen');
      setResult(body.result as RecognizedMeal);
      setStage('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
      setStage('capture');
    }
  }

  function skipToManualReview() {
    const empty: RecognizedMeal = {
      label: '',
      items: [
        { label: '', amount_g: null, kcal: null, protein_g: null, carbs_g: null, fat_g: null },
      ],
      totals: {
        kcal: 0,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        sugar_g: null,
        fiber_g: null,
        saturated_fat_g: null,
        salt_g: null,
      },
      confidence: 1,
      hint: null,
    };
    setResult(empty);
    setStage('review');
  }

  async function refineWithChat(message: string) {
    if (!result) return;
    setRefining(true);
    setChatLog((log) => [...log, { id: crypto.randomUUID(), role: 'user', text: message }]);
    try {
      const res = await fetch('/api/recognize-meal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          images: images.map((i) => i.dataUrl),
          previous_result: result,
          chat_message: message,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Refinement fehlgeschlagen');
      const updated = body.result as RecognizedMeal;
      setResult(updated);
      setChatLog((log) => [
        ...log,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: updated.hint ?? 'Aktualisiert.',
        },
      ]);
    } catch (e) {
      setChatLog((log) => [
        ...log,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: e instanceof Error ? e.message : 'Konnte nicht verfeinern.',
        },
      ]);
    } finally {
      setRefining(false);
    }
  }

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
        style={{ maxHeight: '92vh' }}
      >
        <div className="sheet-handle" />
        <SheetHeader stage={stage} onClose={onClose} />

        {stage === 'capture' && (
          <CaptureStage
            images={images}
            onAddImage={(img) => setImages((cur) => [...cur, img].slice(0, MAX_IMAGES))}
            onRemoveImage={(id) => setImages((cur) => cur.filter((i) => i.id !== id))}
            onAnalyze={() => runAnalysis(images)}
            onSkip={skipToManualReview}
            error={error}
          />
        )}

        {stage === 'analyzing' && <AnalyzingStage />}

        {stage === 'review' && result && (
          <ReviewStage
            result={result}
            onChange={setResult}
            chatLog={chatLog}
            onChat={refineWithChat}
            refining={refining}
            onNext={() => setStage('saving')}
            onBackToCapture={() => setStage('capture')}
          />
        )}

        {stage === 'saving' && result && (
          <SaveStage result={result} onBack={() => setStage('review')} onDone={onClose} />
        )}
      </div>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Header
 * ──────────────────────────────────────────────────────────── */

function SheetHeader({ stage, onClose }: { stage: Stage; onClose: () => void }) {
  const title =
    stage === 'capture'
      ? 'Mahlzeit erfassen'
      : stage === 'analyzing'
        ? 'KI analysiert…'
        : stage === 'review'
          ? 'Prüfen & verfeinern'
          : 'Speichern';
  return (
    <div className="row-between" style={{ marginBottom: 14 }}>
      <div className="h-card" style={{ fontSize: 22 }}>
        {title}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Schließen"
        className="pressable"
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
        <Icon name="x" size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Stage 1 — Capture
 * ──────────────────────────────────────────────────────────── */

function CaptureStage({
  images,
  onAddImage,
  onRemoveImage,
  onAnalyze,
  onSkip,
  error,
}: {
  images: CapturedImage[];
  onAddImage: (img: CapturedImage) => void;
  onRemoveImage: (id: string) => void;
  onAnalyze: () => void;
  onSkip: () => void;
  error: string | null;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (images.length >= MAX_IMAGES) break;
      try {
        const resized = await resizeImageFile(file);
        onAddImage({ id: crypto.randomUUID(), dataUrl: resized });
      } catch {
        // Ignoriere defekte Dateien still — Nutzer kann andere wählen.
      }
    }
  }

  const canAddMore = images.length < MAX_IMAGES;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 12 }}>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
        Fotografiere den Teller — oder zusätzlich eine Verpackung für genaue Werte. Bis zu{' '}
        {MAX_IMAGES} Bilder.
      </div>

      {images.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {images.map((img) => (
            <div
              key={img.id}
              style={{
                position: 'relative',
                width: 92,
                height: 92,
                borderRadius: 12,
                overflow: 'hidden',
                background: 'var(--surface-2)',
              }}
            >
              <div
                aria-label="Aufnahme"
                role="img"
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundImage: `url(${img.dataUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <button
                type="button"
                onClick={() => onRemoveImage(img.id)}
                aria-label="Bild entfernen"
                className="pressable"
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'rgba(20,18,12,0.7)',
                  border: 'none',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Icon name="x" size={12} strokeWidth={2.4} />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: 'none' }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: 'none' }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <CaptureTile
          icon="camera"
          label="Foto aufnehmen"
          disabled={!canAddMore}
          onClick={() => cameraRef.current?.click()}
        />
        <CaptureTile
          icon="photo-stack"
          label="Aus Galerie"
          disabled={!canAddMore}
          onClick={() => galleryRef.current?.click()}
        />
      </div>

      {error && (
        <div
          style={{
            color: 'var(--amber)',
            fontSize: 12,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.04em',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={images.length === 0}
        onClick={onAnalyze}
        className="pressable btn-primary"
        style={{
          padding: '14px',
          opacity: images.length === 0 ? 0.5 : 1,
        }}
      >
        {images.length === 0
          ? 'Erst ein Bild auswählen'
          : `Analyse starten (${images.length} Bild${images.length === 1 ? '' : 'er'})`}
      </button>

      <button
        type="button"
        onClick={onSkip}
        className="pressable"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--ink-3)',
          fontSize: 13,
          fontFamily: 'var(--sans)',
          cursor: 'pointer',
          padding: 4,
        }}
      >
        Lieber selbst beschreiben →
      </button>
    </div>
  );
}

function CaptureTile({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: 'camera' | 'photo-stack';
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="pressable"
      style={{
        background: 'var(--surface-2)',
        border: '0.5px solid var(--hairline)',
        borderRadius: 14,
        padding: '22px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Icon name={icon} size={28} stroke="var(--ink-2)" strokeWidth={1.4} />
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>{label}</span>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Stage 2 — Analyzing
 * ──────────────────────────────────────────────────────────── */

function AnalyzingStage() {
  return (
    <div
      style={{
        padding: '40px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: '3px solid var(--surface-3)',
          borderTopColor: 'var(--sage-deep)',
          borderRadius: '50%',
          animation: 'spin 900ms linear infinite',
        }}
      />
      <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>
        KI analysiert dein Bild — einen Moment.
      </div>
      <div
        style={{
          width: '100%',
          height: 80,
          background: 'var(--surface-2)',
          borderRadius: 14,
          opacity: 0.6,
          animation: 'labor-skeleton 1.4s ease-in-out infinite',
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Stage 3 — Review
 * ──────────────────────────────────────────────────────────── */

function ReviewStage({
  result,
  onChange,
  chatLog,
  onChat,
  refining,
  onNext,
  onBackToCapture,
}: {
  result: RecognizedMeal;
  onChange: (r: RecognizedMeal) => void;
  chatLog: ChatTurn[];
  onChat: (message: string) => void;
  refining: boolean;
  onNext: () => void;
  onBackToCapture: () => void;
}) {
  const [chatInput, setChatInput] = useState('');

  function sendChat() {
    const trimmed = chatInput.trim();
    if (!trimmed || refining) return;
    setChatInput('');
    onChat(trimmed);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <ConfidenceBanner confidence={result.confidence} hint={result.hint} />

      <Field label="Bezeichnung">
        <input
          type="text"
          value={result.label}
          onChange={(e) => onChange({ ...result, label: e.target.value })}
          placeholder="z.B. Hähnchen-Reis-Bowl"
          className="text-input"
          style={{ fontSize: 15 }}
          maxLength={200}
        />
      </Field>

      <Field label="Komponenten">
        <ItemsChips result={result} onChange={onChange} />
      </Field>

      <MacrosBlock result={result} onChange={onChange} />

      <Field label="Mahlzeitslot">
        <SlotPicker
          value={pickInitialSlot(result)}
          onChange={(slot) => {
            // Slot ist Anzeige-only — kein Persistenz-Feld. Wir leiten es spaeter aus occurred_at ab.
            // Hier sammeln wir es in result.label nicht, sondern in einem ref. Vorerst no-op.
            void slot;
          }}
        />
      </Field>

      <ChatPanel
        chatLog={chatLog}
        chatInput={chatInput}
        setChatInput={setChatInput}
        refining={refining}
        sendChat={sendChat}
      />

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button
          type="button"
          onClick={onBackToCapture}
          className="pressable btn-secondary"
          style={{ flex: '0 0 auto', padding: '12px 18px' }}
        >
          Zurück
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={result.label.trim().length === 0 || result.totals.kcal <= 0}
          className="pressable btn-primary"
          style={{
            flex: 1,
            padding: '12px 16px',
            opacity: result.label.trim().length === 0 || result.totals.kcal <= 0 ? 0.5 : 1,
          }}
        >
          Weiter
        </button>
      </div>
    </div>
  );
}

function ConfidenceBanner({
  confidence,
  hint,
}: {
  confidence: number;
  hint: string | null;
}) {
  if (confidence >= 0.85 && !hint) return null;
  const level = confidence >= 0.85 ? 'hoch' : confidence >= 0.6 ? 'mittel' : 'niedrig';
  const bg =
    confidence >= 0.85
      ? 'var(--sage-wash)'
      : confidence >= 0.6
        ? 'rgba(196,152,85,0.16)'
        : 'rgba(196,152,85,0.24)';
  const color = confidence >= 0.85 ? 'var(--sage-deep)' : 'var(--amber)';

  return (
    <div
      style={{
        background: bg,
        color,
        borderRadius: 12,
        padding: '10px 12px',
        fontSize: 12,
        lineHeight: 1.45,
      }}
    >
      <strong style={{ fontWeight: 600 }}>Konfidenz: {level}</strong>
      {hint ? ` · ${hint}` : ' · verfeinere im Chat unten, wenn etwas nicht stimmt.'}
    </div>
  );
}

function ItemsChips({
  result,
  onChange,
}: {
  result: RecognizedMeal;
  onChange: (r: RecognizedMeal) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  function removeItem(idx: number) {
    onChange({ ...result, items: result.items.filter((_, i) => i !== idx) });
  }

  function addItem() {
    const t = draft.trim();
    if (!t) {
      setAdding(false);
      return;
    }
    onChange({
      ...result,
      items: [
        ...result.items,
        { label: t, amount_g: null, kcal: null, protein_g: null, carbs_g: null, fat_g: null },
      ],
    });
    setDraft('');
    setAdding(false);
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {result.items.map((item, idx) => (
        <div
          key={`${idx}-${item.label}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 4px 6px 10px',
            background: 'var(--surface-2)',
            borderRadius: 999,
            border: '0.5px solid var(--hairline)',
            fontSize: 12,
            color: 'var(--ink-2)',
          }}
        >
          <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.label}
            {item.amount_g !== null && (
              <span style={{ color: 'var(--ink-4)', marginLeft: 4 }}>
                {Math.round(item.amount_g)}g
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => removeItem(idx)}
            aria-label="Item entfernen"
            className="pressable"
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Icon name="x" size={10} strokeWidth={2.4} />
          </button>
        </div>
      ))}
      {adding ? (
        <input
          ref={(el) => {
            // Fokus beim Erscheinen ohne autoFocus-Prop (a11y-Konform).
            el?.focus();
          }}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={addItem}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addItem();
            if (e.key === 'Escape') {
              setDraft('');
              setAdding(false);
            }
          }}
          placeholder="Komponente"
          style={{
            background: 'var(--surface)',
            border: '0.5px solid var(--hairline-strong)',
            borderRadius: 999,
            padding: '6px 12px',
            fontSize: 12,
            outline: 'none',
            width: 140,
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="pressable"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 10px',
            background: 'transparent',
            border: '0.5px dashed var(--hairline-strong)',
            borderRadius: 999,
            color: 'var(--ink-3)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <Icon name="plus" size={11} strokeWidth={2} /> Komponente
        </button>
      )}
    </div>
  );
}

function MacrosBlock({
  result,
  onChange,
}: {
  result: RecognizedMeal;
  onChange: (r: RecognizedMeal) => void;
}) {
  function setTotal<K extends keyof RecognizedMeal['totals']>(
    key: K,
    value: RecognizedMeal['totals'][K],
  ) {
    onChange({ ...result, totals: { ...result.totals, [key]: value } });
  }

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: 14,
        padding: '14px',
        border: '0.5px solid var(--hairline)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <NumberInput
          ariaLabel="Kalorien"
          value={result.totals.kcal}
          onChange={(v) => setTotal('kcal', v ?? 0)}
          large
        />
        <span style={{ color: 'var(--ink-3)', fontSize: 14 }}>kcal</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <MacroNumberField
          label="Protein g"
          value={result.totals.protein_g}
          onChange={(v) => setTotal('protein_g', v)}
        />
        <MacroNumberField
          label="Kohlenh. g"
          value={result.totals.carbs_g}
          onChange={(v) => setTotal('carbs_g', v)}
        />
        <MacroNumberField
          label="Fett g"
          value={result.totals.fat_g}
          onChange={(v) => setTotal('fat_g', v)}
        />
      </div>
    </div>
  );
}

function MacroNumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.04em',
          color: 'var(--ink-4)',
        }}
      >
        {label.toUpperCase()}
      </span>
      <NumberInput value={value} onChange={onChange} ariaLabel={label} />
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  ariaLabel,
  large = false,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  ariaLabel: string;
  large?: boolean;
}) {
  const [draft, setDraft] = useState(value === null ? '' : String(value));
  useEffect(() => {
    setDraft(value === null ? '' : String(value));
  }, [value]);
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const normalized = draft.replace(',', '.').trim();
        if (normalized === '') {
          onChange(null);
          return;
        }
        const n = Number(normalized);
        if (Number.isFinite(n) && n >= 0) onChange(Math.round(n * 10) / 10);
        else setDraft(value === null ? '' : String(value));
      }}
      style={{
        width: '100%',
        background: 'var(--surface)',
        border: '0.5px solid var(--hairline)',
        borderRadius: 10,
        padding: large ? '8px 12px' : '8px 10px',
        fontFamily: large ? 'var(--serif)' : 'var(--sans)',
        fontSize: large ? 22 : 14,
        color: 'var(--ink)',
        outline: 'none',
      }}
    />
  );
}

function SlotPicker({
  value,
  onChange,
}: {
  value: MealSlotId;
  onChange: (slot: MealSlotId) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {MEAL_SLOTS.map((slot) => {
        const active = slot.id === value;
        return (
          <button
            key={slot.id}
            type="button"
            onClick={() => onChange(slot.id)}
            className={`filter-pill ${active ? 'active' : ''}`}
            style={{ fontSize: 12 }}
          >
            {slot.label}
          </button>
        );
      })}
    </div>
  );
}

function ChatPanel({
  chatLog,
  chatInput,
  setChatInput,
  refining,
  sendChat,
}: {
  chatLog: ChatTurn[];
  chatInput: string;
  setChatInput: (v: string) => void;
  refining: boolean;
  sendChat: () => void;
}) {
  return (
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: 14,
        padding: '12px',
        border: '0.5px solid var(--hairline)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10.5,
          letterSpacing: '0.06em',
          color: 'var(--ink-4)',
          marginBottom: chatLog.length > 0 ? 8 : 6,
        }}
      >
        VERFEINERN
      </div>
      {chatLog.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginBottom: 10,
            maxHeight: 140,
            overflowY: 'auto',
          }}
        >
          {chatLog.map((turn) => (
            <div
              key={turn.id}
              style={{
                alignSelf: turn.role === 'user' ? 'flex-end' : 'flex-start',
                background: turn.role === 'user' ? 'var(--sage-wash)' : 'var(--surface)',
                color: turn.role === 'user' ? 'var(--sage-deep)' : 'var(--ink-2)',
                fontSize: 12,
                padding: '6px 10px',
                borderRadius: 12,
                maxWidth: '85%',
                lineHeight: 1.4,
              }}
            >
              {turn.text}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendChat();
            }
          }}
          placeholder={
            refining ? 'Aktualisiere…' : 'z.B. "war doppelte Portion" oder "mit extra Käse"'
          }
          disabled={refining}
          style={{
            flex: 1,
            background: 'var(--surface)',
            border: '0.5px solid var(--hairline)',
            borderRadius: 10,
            padding: '8px 10px',
            fontSize: 13,
            outline: 'none',
            color: 'var(--ink)',
          }}
        />
        <button
          type="button"
          onClick={sendChat}
          disabled={refining || chatInput.trim().length === 0}
          aria-label="Senden"
          className="pressable"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--sage-deep)',
            color: '#fff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: refining ? 'wait' : 'pointer',
            opacity: chatInput.trim().length === 0 ? 0.4 : 1,
          }}
        >
          <Icon name="arrow-right" size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Stage 4 — Save
 * ──────────────────────────────────────────────────────────── */

function SaveStage({
  result,
  onBack,
  onDone,
}: {
  result: RecognizedMeal;
  onBack: () => void;
  onDone: () => void;
}) {
  const [asTemplate, setAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState(result.label);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append('label', result.label);
        fd.append('kcal', String(result.totals.kcal));
        for (const [key, value] of Object.entries(result.totals)) {
          if (key === 'kcal') continue;
          if (value !== null && value !== undefined) {
            fd.append(key, String(value));
          }
        }
        if (asTemplate) {
          fd.append('save_as_template', 'true');
          fd.append('template_name', templateName.trim() || result.label);
        }
        await saveComposedMealAction(fd);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Konnte nicht speichern.');
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: 14,
          padding: '14px',
          border: '0.5px solid var(--hairline)',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{result.label}</div>
        <div className="mono-sm" style={{ marginTop: 4 }}>
          {result.totals.kcal} kcal
          {result.totals.protein_g !== null && ` · ${Math.round(result.totals.protein_g)}g P`}
          {result.totals.carbs_g !== null && ` · ${Math.round(result.totals.carbs_g)}g K`}
          {result.totals.fat_g !== null && ` · ${Math.round(result.totals.fat_g)}g F`}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SaveOption
          active={!asTemplate}
          title="Nur loggen"
          description="Einmalig für heute eintragen."
          onClick={() => setAsTemplate(false)}
        />
        <SaveOption
          active={asTemplate}
          title="Als Vorlage speichern + loggen"
          description="Bleibt im Food Memory für schnelles Wiederlogen."
          onClick={() => setAsTemplate(true)}
        />
      </div>

      {asTemplate && (
        <Field label="Vorlagen-Name">
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder={result.label}
            className="text-input"
            style={{ fontSize: 15 }}
            maxLength={200}
          />
        </Field>
      )}

      {error && (
        <div
          style={{
            color: 'var(--amber)',
            fontSize: 12,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.04em',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button
          type="button"
          onClick={onBack}
          disabled={pending}
          className="pressable btn-secondary"
          style={{ flex: '0 0 auto', padding: '12px 18px' }}
        >
          Zurück
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="pressable btn-primary"
          style={{ flex: 1, padding: '12px 16px', opacity: pending ? 0.6 : 1 }}
        >
          {pending ? 'Speichere…' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}

function SaveOption({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable"
      style={{
        background: active ? 'var(--sage-wash)' : 'var(--surface-2)',
        border: active ? '1px solid var(--sage-deep)' : '0.5px solid var(--hairline)',
        borderRadius: 12,
        padding: '12px 14px',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{title}</span>
      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{description}</span>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10.5,
          letterSpacing: '0.06em',
          color: 'var(--ink-4)',
        }}
      >
        {label.toUpperCase()}
      </span>
      {children}
    </div>
  );
}

function pickInitialSlot(_result: RecognizedMeal): MealSlotId {
  return mealSlotFromIso(new Date().toISOString());
}

// Resize/komprimiert ein Bild im Browser bevor wir es zur Vision-API senden.
// Verhindert sowohl Mobile-Upload-Stalls als auch zu fette Anthropic-Payloads.
async function resizeImageFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas-Kontext nicht verfuegbar');
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    bitmap.close();
  }
}
