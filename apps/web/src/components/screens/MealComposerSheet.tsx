'use client';

import { logMealFromTemplateAction, saveComposedMealAction } from '@/app/actions';
import type { BarcodeLookupResult, PantrySimilarItem } from '@/app/api/lookup-barcode/route';
import type { RecognizedMeal } from '@/app/api/recognize-meal/route';
import { MEAL_SLOTS, type MealSlotId, mealSlotFromIso } from '@/lib/nutrition';
import { resizeImageFile } from '@/lib/resize-image';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Icon } from '../Icon';
import { Sheet, SheetCloseButton } from '../Sheet';
import type { MealTemplateView } from '../types';
import { ScanMergeDialog } from './ScanMergeDialog';

const BarcodeScannerOverlay = dynamic(
  () => import('./BarcodeScannerOverlay').then((m) => ({ default: m.BarcodeScannerOverlay })),
  { ssr: false },
);

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
  templates: MealTemplateView[];
  onClose: () => void;
}

const MAX_IMAGES = 3;

export function MealComposerSheet({ templates, onClose }: MealComposerSheetProps) {
  const [stage, setStage] = useState<Stage>('capture');
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [result, setResult] = useState<RecognizedMeal | null>(null);
  const [chatLog, setChatLog] = useState<ChatTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLookup, setScanLookup] = useState<BarcodeLookupResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  // Wenn der Lookup nach einem neuen OFF-Treffer ähnliche Pantry-Items findet,
  // zeigt das UI vor dem PortionDialog noch eine Rückfrage „Ist das dasselbe
  // wie …?" — bei „Ja" wird gemergt, bei „Nein" geht's normal weiter.
  const [scanMergeContext, setScanMergeContext] = useState<{
    lookup: BarcodeLookupResult;
    candidates: PantrySimilarItem[];
  } | null>(null);
  // Slot vorausgewählt per Uhrzeit, User kann ändern. Wird beim Save als
  // meal_type ans Event geschrieben — Vorrang vor occurred_at-Heuristik.
  const [slot, setSlot] = useState<MealSlotId>(mealSlotFromIso(new Date().toISOString()));

  // Knapp-Repräsentation der Templates für den Recognition-Endpoint.
  // LLM bekommt nur Label + kcal + Hauptmakros + Slot — reicht für Matching.
  const templatesPayload = templates.map((t) => ({
    id: t.id,
    label: t.label,
    kcal: t.kcal,
    protein_g: t.protein_g,
    carbs_g: t.carbs_g,
    fat_g: t.fat_g,
    slot: t.slot,
  }));

  async function runAnalysis(imgs: CapturedImage[]) {
    setStage('analyzing');
    setError(null);
    try {
      const res = await fetch('/api/recognize-meal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          images: imgs.map((i) => i.dataUrl),
          templates: templatesPayload,
        }),
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
        {
          label: '',
          amount_g: null,
          kcal: null,
          protein_g: null,
          carbs_g: null,
          fat_g: null,
          pantry_item_id: null,
        },
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
      suggested_template_id: null,
      suggested_template_reason: null,
    };
    setResult(empty);
    setStage('review');
  }

  async function logFromSuggestedTemplate(templateId: string) {
    setError(null);
    try {
      const fd = new FormData();
      fd.append('template_id', templateId);
      // Aktiver Slot-Picker-State überschreibt den Template-Default falls nötig.
      fd.append('meal_type', slot);
      await logMealFromTemplateAction(fd);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Konnte nicht loggen.');
    }
  }

  async function handleBarcodeScanned(barcode: string) {
    setScannerOpen(false);
    setScanError(null);
    try {
      const res = await fetch(`/api/lookup-barcode?code=${encodeURIComponent(barcode)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Lookup fehlgeschlagen');
      const lookup = body.result as BarcodeLookupResult;
      if (!lookup.found) {
        setScanError(`Barcode ${barcode} ist nicht in Open Food Facts hinterlegt.`);
        return;
      }
      // Neuer OFF-Eintrag + ähnliche Items vorhanden → Merge-Rückfrage zuerst.
      if (lookup.source === 'off' && lookup.similar_pantry_items.length > 0) {
        setScanMergeContext({ lookup, candidates: lookup.similar_pantry_items });
        return;
      }
      setScanLookup(lookup);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Lookup fehlgeschlagen.');
    }
  }

  async function confirmMergeWithCandidate(target: PantrySimilarItem) {
    const ctx = scanMergeContext;
    if (!ctx || !ctx.lookup.pantry_item_id) return;
    try {
      const res = await fetch('/api/pantry/merge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source_id: ctx.lookup.pantry_item_id, target_id: target.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Merge fehlgeschlagen');
      // Nach dem Merge zeigen wir den Ziel-Eintrag — wir haben dessen Nährwerte
      // hier nicht im Detail, also fragen wir den Lookup ein zweites Mal nach
      // dem Barcode; das trifft jetzt den Pantry-Cache.
      const refetch = await fetch(
        `/api/lookup-barcode?code=${encodeURIComponent(ctx.lookup.barcode)}`,
      );
      const refetchBody = await refetch.json();
      if (refetch.ok && refetchBody?.result) {
        setScanLookup(refetchBody.result as BarcodeLookupResult);
      } else {
        // Fallback: das ursprüngliche Lookup-Ergebnis weiterverwenden.
        setScanLookup(ctx.lookup);
      }
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Merge fehlgeschlagen.');
    } finally {
      setScanMergeContext(null);
    }
  }

  function declineMerge() {
    if (scanMergeContext) {
      setScanLookup(scanMergeContext.lookup);
    }
    setScanMergeContext(null);
  }

  function commitScannedItem(lookup: BarcodeLookupResult, portionG: number) {
    const updated = insertItemFromLookup(result, lookup, portionG);
    setResult(updated);
    setScanLookup(null);
    if (stage === 'capture') setStage('review');
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
    <>
      <Sheet
        onClose={onClose}
        style={{ maxHeight: '92vh' }}
        header={<SheetHeader stage={stage} onClose={onClose} />}
      >
        {stage === 'capture' && (
          <CaptureStage
            images={images}
            onAddImage={(img) => setImages((cur) => [...cur, img].slice(0, MAX_IMAGES))}
            onRemoveImage={(id) => setImages((cur) => cur.filter((i) => i.id !== id))}
            onAnalyze={() => runAnalysis(images)}
            onOpenScanner={() => setScannerOpen(true)}
            onSkip={skipToManualReview}
            error={error ?? scanError}
          />
        )}

        {stage === 'analyzing' && <AnalyzingStage />}

        {stage === 'review' && result && (
          <ReviewStage
            result={result}
            onChange={setResult}
            templates={templates}
            onLogFromTemplate={logFromSuggestedTemplate}
            slot={slot}
            onSlotChange={setSlot}
            chatLog={chatLog}
            onChat={refineWithChat}
            refining={refining}
            onOpenScanner={() => setScannerOpen(true)}
            scanError={scanError}
            onDismissScanError={() => setScanError(null)}
            onNext={() => setStage('saving')}
            onBackToCapture={() => setStage('capture')}
          />
        )}

        {stage === 'saving' && result && (
          <SaveStage
            result={result}
            slot={slot}
            onBack={() => setStage('review')}
            onDone={onClose}
          />
        )}
      </Sheet>

      {scannerOpen && (
        <BarcodeScannerOverlay
          onScan={handleBarcodeScanned}
          onClose={() => setScannerOpen(false)}
        />
      )}
      {scanMergeContext && (
        <ScanMergeDialog
          newLabel={scanMergeContext.lookup.label ?? scanMergeContext.lookup.barcode}
          newBrand={scanMergeContext.lookup.brand}
          candidates={scanMergeContext.candidates}
          onConfirm={confirmMergeWithCandidate}
          onDecline={declineMerge}
        />
      )}
      {scanLookup && (
        <PortionDialog
          lookup={scanLookup}
          onCancel={() => setScanLookup(null)}
          onConfirm={(grams) => commitScannedItem(scanLookup, grams)}
        />
      )}
    </>
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
      <SheetCloseButton onClose={onClose} />
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
  onOpenScanner,
  onSkip,
  error,
}: {
  images: CapturedImage[];
  onAddImage: (img: CapturedImage) => void;
  onRemoveImage: (id: string) => void;
  onAnalyze: () => void;
  onOpenScanner: () => void;
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
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
        <CaptureTile icon="pattern" label="Barcode" onClick={onOpenScanner} />
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
  disabled = false,
  onClick,
}: {
  icon: 'camera' | 'photo-stack' | 'pattern';
  label: string;
  disabled?: boolean;
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
  templates,
  onLogFromTemplate,
  slot,
  onSlotChange,
  chatLog,
  onChat,
  refining,
  onOpenScanner,
  scanError,
  onDismissScanError,
  onNext,
  onBackToCapture,
}: {
  result: RecognizedMeal;
  onChange: (r: RecognizedMeal) => void;
  templates: MealTemplateView[];
  onLogFromTemplate: (templateId: string) => void;
  slot: MealSlotId;
  onSlotChange: (slot: MealSlotId) => void;
  chatLog: ChatTurn[];
  onChat: (message: string) => void;
  refining: boolean;
  onOpenScanner: () => void;
  scanError: string | null;
  onDismissScanError: () => void;
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

  const matchedTemplate = result.suggested_template_id
    ? templates.find((t) => t.id === result.suggested_template_id)
    : null;

  function dismissMatch() {
    onChange({ ...result, suggested_template_id: null, suggested_template_reason: null });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {matchedTemplate && (
        <TemplateMatchBanner
          template={matchedTemplate}
          reason={result.suggested_template_reason}
          onLogFromTemplate={() => onLogFromTemplate(matchedTemplate.id)}
          onDismiss={dismissMatch}
        />
      )}

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
        <button
          type="button"
          onClick={onOpenScanner}
          className="pressable"
          style={{
            marginTop: 8,
            display: 'inline-flex',
            alignSelf: 'flex-start',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            background: 'var(--sage-wash)',
            color: 'var(--sage-deep)',
            border: 'none',
            borderRadius: 999,
            fontFamily: 'var(--sans)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Icon name="pattern" size={12} strokeWidth={1.8} /> Barcode für exakte Werte
        </button>
        {scanError && (
          <button
            type="button"
            onClick={onDismissScanError}
            className="pressable"
            style={{
              marginTop: 8,
              padding: '8px 10px',
              background: 'rgba(196,152,85,0.16)',
              color: 'var(--amber)',
              border: 'none',
              borderRadius: 10,
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {scanError} <span style={{ opacity: 0.7 }}>(tippen zum Ausblenden)</span>
          </button>
        )}
      </Field>

      <MacrosBlock result={result} onChange={onChange} />

      <Field label="Mahlzeitslot">
        <SlotPicker value={slot} onChange={onSlotChange} />
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

function TemplateMatchBanner({
  template,
  reason,
  onLogFromTemplate,
  onDismiss,
}: {
  template: MealTemplateView;
  reason: string | null;
  onLogFromTemplate: () => void;
  onDismiss: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    if (pending) return;
    startTransition(() => {
      onLogFromTemplate();
    });
  }

  return (
    <div
      style={{
        background: 'var(--sage-wash)',
        border: '0.5px solid rgba(110,122,78,0.3)',
        borderRadius: 14,
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.55)',
            color: 'var(--sage-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="sparkle" size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--sage-deep)' }}>Sieht aus wie deine Vorlage</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--ink)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {template.label}
          </div>
          <div className="mono-sm" style={{ marginTop: 2 }}>
            {template.kcal} kcal
            {template.protein_g !== null && template.protein_g > 0
              ? ` · ${Math.round(template.protein_g)}g P`
              : ''}
          </div>
          {reason && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.4 }}>
              {reason}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={onDismiss}
          disabled={pending}
          className="pressable"
          style={{
            flex: '0 0 auto',
            padding: '10px 14px',
            background: 'transparent',
            border: '0.5px solid rgba(110,122,78,0.32)',
            borderRadius: 12,
            color: 'var(--sage-deep)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Doch nicht
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className="pressable"
          style={{
            flex: 1,
            padding: '10px 16px',
            background: 'var(--sage-deep)',
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            cursor: pending ? 'wait' : 'pointer',
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? 'Logge…' : 'Direkt loggen'}
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
        {
          label: t,
          amount_g: null,
          kcal: null,
          protein_g: null,
          carbs_g: null,
          fat_g: null,
          pantry_item_id: null,
        },
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
          title={item.pantry_item_id ? 'Werte aus deinem Vorrat' : undefined}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 4px 6px 10px',
            background: item.pantry_item_id ? 'var(--sage-wash)' : 'var(--surface-2)',
            borderRadius: 999,
            border: `0.5px solid ${
              item.pantry_item_id ? 'rgba(110,122,78,0.32)' : 'var(--hairline)'
            }`,
            fontSize: 12,
            color: item.pantry_item_id ? 'var(--sage-deep)' : 'var(--ink-2)',
          }}
        >
          {item.pantry_item_id && <Icon name="leaf" size={11} strokeWidth={2} aria-hidden="true" />}
          <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.label}
            {item.amount_g !== null && (
              <span
                style={{
                  color: item.pantry_item_id ? 'var(--sage-deep)' : 'var(--ink-4)',
                  marginLeft: 4,
                  opacity: 0.8,
                }}
              >
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
  slot,
  onBack,
  onDone,
}: {
  result: RecognizedMeal;
  slot: MealSlotId;
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
        fd.append('meal_type', slot);
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

// Skaliert Per-100g-Nährwerte auf die gewählte Portionsgröße und fügt das
// neue Item in result.items ein. totals werden client-side neu summiert.
function insertItemFromLookup(
  prev: RecognizedMeal | null,
  lookup: BarcodeLookupResult,
  portionG: number,
): RecognizedMeal {
  const factor = portionG / 100;
  const scale = (per100: number | null): number | null =>
    per100 === null ? null : Math.round(per100 * factor * 10) / 10;

  const itemLabel = lookup.brand
    ? `${lookup.brand} ${lookup.label ?? ''}`.trim()
    : (lookup.label ?? lookup.barcode);
  const newItem = {
    label: itemLabel,
    amount_g: Math.round(portionG),
    kcal: scale(lookup.nutrients_per_100g.kcal),
    protein_g: scale(lookup.nutrients_per_100g.protein_g),
    carbs_g: scale(lookup.nutrients_per_100g.carbs_g),
    fat_g: scale(lookup.nutrients_per_100g.fat_g),
    // Barcode-Scan trifft den Pantry-Cache: das Item kommt direkt aus dem
    // Vorrat-Eintrag, also setzen wir pantry_item_id für die UI-Markierung.
    pantry_item_id: lookup.pantry_item_id,
  };
  const items = [...(prev?.items ?? []), newItem];

  // Bestehende Detail-Naehrwerte beibehalten + Scan-Werte addieren.
  // kcal/Makros werden komplett aus items[] rekomputiert, damit die Anzeige konsistent bleibt.
  const totalsBase = prev?.totals ?? {
    kcal: 0,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    sugar_g: null,
    fiber_g: null,
    saturated_fat_g: null,
    salt_g: null,
  };
  const totals = {
    kcal: items.reduce((s, it) => s + (it.kcal ?? 0), 0),
    protein_g: items.reduce<number | null>((s, it) => sumNullable(s, it.protein_g), null),
    carbs_g: items.reduce<number | null>((s, it) => sumNullable(s, it.carbs_g), null),
    fat_g: items.reduce<number | null>((s, it) => sumNullable(s, it.fat_g), null),
    sugar_g: addNullable(totalsBase.sugar_g, scale(lookup.nutrients_per_100g.sugar_g)),
    fiber_g: addNullable(totalsBase.fiber_g, scale(lookup.nutrients_per_100g.fiber_g)),
    saturated_fat_g: addNullable(
      totalsBase.saturated_fat_g,
      scale(lookup.nutrients_per_100g.saturated_fat_g),
    ),
    salt_g: addNullable(totalsBase.salt_g, scale(lookup.nutrients_per_100g.salt_g)),
  };

  return {
    label: prev?.label ?? itemLabel,
    items,
    totals,
    confidence: prev ? Math.min(1, prev.confidence + 0.1) : 0.95,
    hint: prev?.hint ?? null,
    suggested_template_id: prev?.suggested_template_id ?? null,
    suggested_template_reason: prev?.suggested_template_reason ?? null,
  };
}

function sumNullable(acc: number | null, v: number | null): number | null {
  if (v === null) return acc;
  return Math.round(((acc ?? 0) + v) * 10) / 10;
}

function addNullable(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  return Math.round(((a ?? 0) + (b ?? 0)) * 10) / 10;
}

function PortionDialog({
  lookup,
  onCancel,
  onConfirm,
}: {
  lookup: BarcodeLookupResult;
  onCancel: () => void;
  onConfirm: (grams: number) => void;
}) {
  const [grams, setGrams] = useState<string>(
    lookup.serving_size_g !== null ? String(lookup.serving_size_g) : '100',
  );
  const numericGrams = Number(grams.replace(',', '.'));
  const valid = Number.isFinite(numericGrams) && numericGrams > 0 && numericGrams <= 5000;
  const kcal100 = lookup.nutrients_per_100g.kcal;
  const previewKcal = valid && kcal100 !== null ? Math.round(kcal100 * (numericGrams / 100)) : null;

  // zIndex: 100 hebt diesen Dialog über das darunterliegende MealComposer-Sheet
  // (Backdrop default zIndex 80). Beide Sheets sind theoretisch nie gleichzeitig
  // offen, der Override ist Belt-and-Suspenders gegen Render-Race-Conditions.
  return (
    <Sheet onClose={onCancel} backdropStyle={{ zIndex: 100 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div className="h-card" style={{ fontSize: 20 }}>
            {lookup.brand ? `${lookup.brand} · ${lookup.label}` : lookup.label}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
            {kcal100 !== null ? `${kcal100} kcal / 100g` : 'kcal pro 100g unbekannt'}
            {lookup.serving_size_g !== null && ` · Verpackung: ${lookup.serving_size_g}g`}
          </div>
        </div>

        <div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10.5,
              letterSpacing: '0.06em',
              color: 'var(--ink-4)',
              marginBottom: 6,
            }}
          >
            WIE VIEL HAST DU GEGESSEN?
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              inputMode="decimal"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              aria-label="Menge in Gramm"
              className="text-input"
              style={{ fontSize: 18, fontFamily: 'var(--serif)', flex: 1 }}
            />
            <span style={{ color: 'var(--ink-3)', fontSize: 14 }}>g</span>
          </div>
          {previewKcal !== null && (
            <div className="mono-sm" style={{ marginTop: 6, color: 'var(--ink-3)' }}>
              ≈ {previewKcal} kcal in dieser Portion
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            type="button"
            onClick={onCancel}
            className="pressable btn-secondary"
            style={{ flex: '0 0 auto', padding: '12px 18px' }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => valid && onConfirm(Math.round(numericGrams))}
            disabled={!valid}
            className="pressable btn-primary"
            style={{ flex: 1, padding: '12px 16px', opacity: valid ? 1 : 0.5 }}
          >
            Hinzufügen
          </button>
        </div>
      </div>
    </Sheet>
  );
}

// Resize/komprimiert ein Bild im Browser bevor wir es zur Vision-API senden.
// Verhindert sowohl Mobile-Upload-Stalls als auch zu fette Anthropic-Payloads.
