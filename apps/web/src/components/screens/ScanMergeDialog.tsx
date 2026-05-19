'use client';

import type { PantrySimilarItem } from '@/app/api/lookup-barcode/route';
import { Sheet } from '../Sheet';

// Rückfrage nach Barcode-Scan, wenn ein neues OFF-Item angelegt wurde und es
// im Vorrat schon ähnlich benannte Einträge gibt. Wird sowohl vom MealComposer
// als auch vom PantrySheet (manuelles Vorrat-Füllen) verwendet.
export function ScanMergeDialog({
  newLabel,
  newBrand,
  candidates,
  onConfirm,
  onDecline,
}: {
  newLabel: string;
  newBrand: string | null;
  candidates: PantrySimilarItem[];
  onConfirm: (target: PantrySimilarItem) => void;
  onDecline: () => void;
}) {
  return (
    <Sheet onClose={onDecline} backdropStyle={{ zIndex: 100 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="h-card" style={{ fontSize: 18 }}>
          Ist das dasselbe Produkt?
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
          Du hast gerade <b>{newLabel}</b>
          {newBrand ? ` (${newBrand})` : ''} gescannt. Diese aktiven Einträge in deinem Vorrat
          klingen ähnlich:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {candidates.map((cand) => (
            <button
              key={cand.id}
              type="button"
              onClick={() => onConfirm(cand)}
              className="card pressable"
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 14px',
                background: 'var(--surface)',
                border: '0.5px solid var(--hairline)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500 }}>{cand.label}</div>
              {cand.brand && (
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{cand.brand}</div>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onDecline}
          className="filter-pill"
          style={{ alignSelf: 'flex-start', padding: '10px 16px' }}
        >
          Nein, neuer Eintrag
        </button>
      </div>
    </Sheet>
  );
}
