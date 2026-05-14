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
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop is a presentational click target; sheet has its own X-button
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        ref={ref}
        className="sheet sheet--flex"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        // biome-ignore lint/a11y/useSemanticElements: bottom-sheet without native <dialog> lifecycle
        role="dialog"
        aria-modal="true"
        style={style}
      >
        <div className="sheet-flex-header">
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
        <div className="sheet-flex-body">
          <Chat userName={userName} config={COACH_AGENT} />
        </div>
      </div>
    </div>
  );
}
