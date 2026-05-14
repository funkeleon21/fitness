'use client';

import { useSheetDismissDrag } from '@/lib/useSheetDismissDrag';
import { Icon } from '../Icon';
import { Chat } from '../chat/Chat';
import { COACH_AGENT } from '../chat/agent-configs';

interface NutritionCoachSheetProps {
  userName: string;
  onClose: () => void;
}

export function NutritionCoachSheet({ userName, onClose }: NutritionCoachSheetProps) {
  const { ref, style } = useSheetDismissDrag({ onClose });

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
        style={{
          textAlign: 'left',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '90dvh',
          maxHeight: '90dvh',
          overflow: 'hidden',
          ...style,
        }}
      >
        <div style={{ padding: '14px 18px 8px', flexShrink: 0 }}>
          <div className="sheet-handle" />
          <div className="row-between" style={{ marginBottom: 4 }}>
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
                Tagesziele berechnen
              </div>
              <div style={{ marginTop: 2, color: 'var(--ink-3)', fontSize: 13 }}>
                Mit deinem Coach
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
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Chat userName={userName} config={COACH_AGENT} />
        </div>
      </div>
    </button>
  );
}
