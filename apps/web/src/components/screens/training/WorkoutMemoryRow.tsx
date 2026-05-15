'use client';

import { Icon } from '../../Icon';
import type { WorkoutTemplateView } from '../../types';

interface WorkoutMemoryRowProps {
  templates: WorkoutTemplateView[];
  onCreate: () => void;
  onEdit: (t: WorkoutTemplateView) => void;
}

function summarizeTemplate(tpl: WorkoutTemplateView): string {
  const exCount = tpl.exercises.length;
  const setCount = tpl.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const usageHint = tpl.usage_count > 0 ? `${tpl.usage_count}×` : 'noch nicht genutzt';
  const parts: string[] = [];
  if (exCount > 0) parts.push(`${exCount} ${exCount === 1 ? 'Übung' : 'Übungen'}`);
  if (setCount > 0) parts.push(`${setCount} ${setCount === 1 ? 'Satz' : 'Sätze'}`);
  parts.push(usageHint);
  return parts.join(' · ');
}

export function WorkoutMemoryRow({ templates, onCreate, onEdit }: WorkoutMemoryRowProps) {
  const hasTemplates = templates.length > 0;

  return (
    <div className="card rise" style={{ animationDelay: '60ms', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--sage-wash)',
            color: 'var(--sage-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="brain" size={22} strokeWidth={1.7} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="h-card"
            style={{
              fontSize: 15,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Workout Memory
          </div>
          {!hasTemplates && (
            <div
              style={{
                marginTop: 2,
                fontSize: 11,
                color: 'var(--ink-3)',
                lineHeight: 1.35,
              }}
            >
              Noch keine Vorlagen
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="pressable"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            padding: '6px 10px',
            borderRadius: 999,
            background: 'var(--surface)',
            border: '0.5px solid var(--hairline-strong)',
            color: 'var(--sage-deep)',
            fontFamily: 'var(--sans)',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Neue Vorlage
          <Icon name="chevron-right" size={12} strokeWidth={2} />
        </button>
      </div>

      {hasTemplates && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onEdit(t)}
              aria-label={`Vorlage ${t.label} bearbeiten`}
              className="pressable"
              style={{
                padding: '12px 14px',
                background: 'var(--surface-2)',
                border: '0.5px solid var(--hairline)',
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{t.label}</div>
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    color: 'var(--ink-3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {summarizeTemplate(t)}
                </div>
              </div>
              <Icon name="chevron-right" size={14} strokeWidth={1.6} stroke="var(--ink-4)" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
