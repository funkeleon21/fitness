'use client';

import { useSheetDismissDrag } from '@/lib/useSheetDismissDrag';
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';

interface SheetProps {
  onClose: () => void;
  /**
   * Inhalt der Drag-Zone nach dem Handle (typisch: Titel + SheetCloseButton in
   * einer row-between). Optional — Sheets ohne Header rendern nur das Handle.
   */
  header?: ReactNode;
  /**
   * "flex"-Modus: sticky Header + scrollende Body. Body muss vom Caller mit
   * `<div className="sheet-flex-body">` gewrappt werden. Aktuell genutzt
   * vom Coach-Sheet, dessen Chat-Verlauf intern scrollt.
   */
  flex?: boolean;
  /**
   * Style-Override für den .sheet Container (z.B. eigene maxHeight). Wird
   * über das vom Drag-Hook gelieferte Transform-Style gemerged.
   */
  style?: CSSProperties;
  /**
   * Style-Override für den .sheet-backdrop (z.B. zIndex, wenn das Sheet über
   * einem anderen offenen Sheet liegt — siehe PortionDialog im MealComposer).
   */
  backdropStyle?: CSSProperties;
  children: ReactNode;
}

/**
 * Bottom-Sheet mit iOS-Style-Pull-to-Dismiss. Kapselt das gemeinsame Boilerplate:
 * backdrop-div, sheet-div, drag-zone, sheet-handle plus die zwei biome-ignore-Kommentare.
 * Jeder konkrete Sheet liefert nur noch sein eigenes Header- und Body-Markup.
 */
export function Sheet({
  onClose,
  header,
  flex = false,
  style,
  backdropStyle,
  children,
}: SheetProps) {
  const { ref, handleRef, backdropRef, style: dragStyle } = useSheetDismissDrag({ onClose });
  const sheetClass = flex ? 'sheet sheet--flex' : 'sheet';
  const dragZoneClass = flex ? 'sheet-flex-header sheet-drag-zone' : 'sheet-drag-zone';
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop is a presentational click target; sheet has its own X-button + Escape via document listener
    <div
      ref={backdropRef}
      className="sheet-backdrop"
      onClick={onClose}
      role="presentation"
      style={backdropStyle}
    >
      <div
        ref={ref}
        className={sheetClass}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        // biome-ignore lint/a11y/useSemanticElements: bottom-sheet without native <dialog> lifecycle
        role="dialog"
        aria-modal="true"
        style={style ? { ...dragStyle, ...style } : dragStyle}
      >
        <div ref={handleRef} className={dragZoneClass}>
          <div className="sheet-handle" />
          {header}
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Runder 32x32 X-Button — Standard-Schließer rechts in der Sheet-Header-Zeile.
 * 13 Zeilen Inline-Styles lebten zuvor in 4–5 Sheets parallel.
 */
export function SheetCloseButton({ onClose }: { onClose: () => void }) {
  return (
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
  );
}
