'use client';

import { Icon } from '../Icon';
import { Sheet, SheetCloseButton } from '../Sheet';
import type { WorkoutTemplateView } from '../types';

interface WorkoutTemplatePickerSheetProps {
  templates: WorkoutTemplateView[];
  onClose: () => void;
  onPickTemplate: (template: WorkoutTemplateView) => void;
  onPickEmpty: () => void;
}

export function WorkoutTemplatePickerSheet({
  templates,
  onClose,
  onPickTemplate,
  onPickEmpty,
}: WorkoutTemplatePickerSheetProps) {
  return (
    <Sheet
      onClose={onClose}
      header={
        <div className="row-between" style={{ marginBottom: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 24,
                color: 'var(--ink)',
                letterSpacing: '-0.02em',
                lineHeight: 1.05,
              }}
            >
              Training loggen
            </div>
            <div style={{ marginTop: 2, color: 'var(--ink-3)', fontSize: 13 }}>
              Aus Vorlage oder leere Einheit
            </div>
          </div>
          <SheetCloseButton onClose={onClose} />
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onPickTemplate(tpl)}
            aria-label={`${tpl.label} aus Vorlage loggen`}
            className="pressable"
            style={{
              padding: '14px 16px',
              background: 'var(--surface-2)',
              border: '0.5px solid var(--hairline)',
              borderRadius: 14,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--sage-wash)',
                color: 'var(--sage-deep)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="dumbbell" size={18} strokeWidth={1.6} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 18,
                  color: 'var(--ink)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.01em',
                }}
              >
                {tpl.label}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: 'var(--ink-3)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {summarizeTemplate(tpl)}
              </div>
            </div>
            <Icon name="chevron-right" size={16} strokeWidth={1.6} stroke="var(--ink-4)" />
          </button>
        ))}

        <button
          type="button"
          onClick={onPickEmpty}
          aria-label="Leere Einheit loggen"
          className="pressable"
          style={{
            padding: '14px 16px',
            background: 'transparent',
            border: '1px dashed var(--hairline-strong)',
            borderRadius: 14,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: 'var(--ink-3)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--surface-2)',
              color: 'var(--ink-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="plus" size={16} strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>
              Leere Einheit
            </div>
            <div style={{ marginTop: 2, fontSize: 12, color: 'var(--ink-4)' }}>
              Komplett von Hand eintippen (Cardio, neue Übung, …)
            </div>
          </div>
        </button>
      </div>
    </Sheet>
  );
}

function summarizeTemplate(tpl: WorkoutTemplateView): string {
  const exCount = tpl.exercises.length;
  const setCount = tpl.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const parts: string[] = [];
  if (exCount > 0) {
    parts.push(`${exCount} ${exCount === 1 ? 'Übung' : 'Übungen'}`);
  }
  if (setCount > 0) {
    parts.push(`${setCount} ${setCount === 1 ? 'Satz' : 'Sätze'}`);
  }
  if (tpl.default_duration_min) {
    parts.push(`${tpl.default_duration_min} min`);
  }
  if (parts.length === 0) return 'Leere Vorlage';
  return parts.join(' · ');
}
