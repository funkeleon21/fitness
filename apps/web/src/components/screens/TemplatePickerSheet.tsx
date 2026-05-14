'use client';

import { logMealFromTemplateAction } from '@/app/actions';
import { MEAL_SLOTS, type MealSlotId } from '@/lib/nutrition';
import { useSheetDismissDrag } from '@/lib/useSheetDismissDrag';
import { useState, useTransition } from 'react';
import { Icon } from '../Icon';
import type { MealTemplateView } from '../types';

interface TemplatePickerSheetProps {
  slot: MealSlotId;
  templates: MealTemplateView[];
  onClose: () => void;
  onCreateNew: () => void;
}

// Sheet, das beim Klick auf "+" neben einem Slot aufgeht. Zeigt Templates,
// deren slot === slot ist (oder slot === null, also "beliebig"). Tap auf eine
// Karte loggt direkt mit meal_type, schließt das Sheet.
export function TemplatePickerSheet({
  slot,
  templates,
  onClose,
  onCreateNew,
}: TemplatePickerSheetProps) {
  const { ref, style } = useSheetDismissDrag({ onClose });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [_, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const slotMeta = MEAL_SLOTS.find((s) => s.id === slot);
  if (!slotMeta) return null;

  const matching = templates.filter((t) => t.slot === slot || t.slot === null);

  function logFromTemplate(template: MealTemplateView) {
    setPendingId(template.id);
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append('template_id', template.id);
        // Wenn das Template selbst keinen Slot hat, schreiben wir den aktiven
        // Picker-Slot als Override mit, damit die Mahlzeit korrekt einsortiert wird.
        if (!template.slot) fd.append('meal_type', slot);
        await logMealFromTemplateAction(fd);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Konnte nicht loggen.');
      } finally {
        setPendingId(null);
      }
    });
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
        ref={ref}
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        // biome-ignore lint/a11y/useSemanticElements: bottom-sheet without native <dialog> lifecycle
        role="dialog"
        aria-modal="true"
        style={{ textAlign: 'left', ...style }}
      >
        <div className="sheet-handle" />
        <div className="row-between" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: slotMeta.tint,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: slotMeta.iconColor,
                flexShrink: 0,
              }}
            >
              <Icon name={slotMeta.icon} size={18} strokeWidth={1.6} stroke="currentColor" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 24,
                  color: 'var(--ink)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                }}
              >
                {slotMeta.label}
              </div>
              <div style={{ marginTop: 2, color: 'var(--ink-3)', fontSize: 13 }}>
                {matching.length === 0
                  ? 'Keine Vorlagen — neu erfassen'
                  : `${matching.length} ${matching.length === 1 ? 'Vorlage' : 'Vorlagen'}`}
              </div>
            </div>
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

        {matching.length === 0 ? (
          <EmptyState slotLabel={slotMeta.label} onCreateNew={onCreateNew} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {matching.map((t) => (
              <TemplateRow
                key={t.id}
                template={t}
                pending={pendingId === t.id}
                onTap={() => logFromTemplate(t)}
              />
            ))}
            <button
              type="button"
              onClick={onCreateNew}
              className="pressable"
              style={{
                marginTop: 6,
                padding: '12px 14px',
                background: 'transparent',
                border: '0.5px dashed var(--hairline-strong)',
                borderRadius: 12,
                color: 'var(--ink-3)',
                fontSize: 13,
                fontFamily: 'var(--sans)',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Icon name="plus" size={14} strokeWidth={2} /> Neu erfassen
            </button>
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 10,
              color: 'var(--amber)',
              fontSize: 12,
              fontFamily: 'var(--mono)',
              letterSpacing: '0.04em',
            }}
          >
            {error}
          </div>
        )}
      </div>
    </button>
  );
}

function TemplateRow({
  template,
  pending,
  onTap,
}: {
  template: MealTemplateView;
  pending: boolean;
  onTap: () => void;
}) {
  const macros: string[] = [];
  if (template.protein_g !== null && template.protein_g > 0)
    macros.push(`${Math.round(template.protein_g)}g P`);
  if (template.carbs_g !== null && template.carbs_g > 0)
    macros.push(`${Math.round(template.carbs_g)}g K`);
  if (template.fat_g !== null && template.fat_g > 0)
    macros.push(`${Math.round(template.fat_g)}g F`);

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={pending}
      className="pressable"
      style={{
        padding: '12px 14px',
        background: 'var(--surface-2)',
        border: '0.5px solid var(--hairline)',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: pending ? 'wait' : 'pointer',
        textAlign: 'left',
        opacity: pending ? 0.6 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {template.label}
        </div>
        <div className="mono-sm" style={{ marginTop: 3 }}>
          {template.kcal} kcal
          {macros.length > 0 ? ` · ${macros.join(' · ')}` : ''}
          {template.usage_count > 0 ? ` · ${template.usage_count}×` : ''}
        </div>
      </div>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'var(--sage-wash)',
          color: 'var(--sage-deep)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name="plus" size={14} strokeWidth={2} />
      </div>
    </button>
  );
}

function EmptyState({
  slotLabel,
  onCreateNew,
}: {
  slotLabel: string;
  onCreateNew: () => void;
}) {
  return (
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: 14,
        border: '0.5px solid var(--hairline)',
        padding: '24px 18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div style={{ fontSize: 14, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.5 }}>
        Noch keine Vorlagen für {slotLabel}.
        <br />
        Fotografiere oder beschreibe eine Mahlzeit — sie kann als Vorlage gespeichert werden.
      </div>
      <button
        type="button"
        onClick={onCreateNew}
        className="pressable btn-primary"
        style={{ padding: '12px 18px' }}
      >
        Neu erfassen
      </button>
    </div>
  );
}
