'use client';

import { Icon } from '../../Icon';

export function TrainingHeader({ onOpenLog }: { onOpenLog: () => void }) {
  return (
    <div
      style={{
        padding: '52px 22px 4px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div>
        <div
          className="h-display"
          style={{ fontFamily: 'var(--serif)', fontSize: 38, lineHeight: 1.04 }}
        >
          Training
        </div>
        <div style={{ marginTop: 4, color: 'var(--ink-3)', fontSize: 14 }}>
          Was hast du heute gemacht?
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenLog}
        aria-label="Training hinzufügen"
        className="pressable"
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'var(--sage-deep)',
          color: '#fff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          marginTop: 6,
          boxShadow: 'var(--shadow-pill)',
        }}
      >
        <Icon name="plus" size={20} strokeWidth={2.2} />
      </button>
    </div>
  );
}
