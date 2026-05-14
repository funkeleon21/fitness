'use client';

import { Sheet, SheetCloseButton } from '../Sheet';
import { Chat } from '../chat/Chat';
import { COACH_AGENT } from '../chat/agent-configs';

interface NutritionCoachSheetProps {
  userName: string;
  onClose: () => void;
}

export function NutritionCoachSheet({ userName, onClose }: NutritionCoachSheetProps) {
  return (
    <Sheet
      onClose={onClose}
      flex
      header={
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
          <SheetCloseButton onClose={onClose} />
        </div>
      }
    >
      <div className="sheet-flex-body">
        <Chat userName={userName} config={COACH_AGENT} />
      </div>
    </Sheet>
  );
}
