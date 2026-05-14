'use client';

import type { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../Icon';

interface BarcodeScannerOverlayProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

// Fullscreen-Overlay mit Live-Kamera + ZXing-Decoder. Schliesst sich nach erstem
// erfolgreichem Scan oder per Schliessen-Button. ZXing wird lazy importiert,
// damit das Sheet-Bundle die Scanner-Lib nicht zieht solange niemand scannt.
export function BarcodeScannerOverlay({ onScan, onClose }: BarcodeScannerOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const handedOffRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scanner setup runs once at mount; onScan/onClose are stable callbacks
  useEffect(() => {
    let cancelled = false;
    let reader: BrowserMultiFormatReader | null = null;

    async function start() {
      try {
        const zxing = await import('@zxing/browser');
        if (cancelled) return;
        reader = new zxing.BrowserMultiFormatReader();
        const video = videoRef.current;
        if (!video) return;
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: { facingMode: { ideal: 'environment' } },
          },
          video,
          (result, _err, _ctrl) => {
            if (handedOffRef.current) return;
            if (result) {
              handedOffRef.current = true;
              controls.stop();
              onScan(result.getText());
            }
          },
        );
        controlsRef.current = controls;
        if (cancelled) controls.stop();
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Scanner konnte nicht starten.';
        setError(
          msg.includes('Permission') || msg.includes('NotAllowed')
            ? 'Kamera-Zugriff abgelehnt. Bitte in den Browser-Einstellungen erlauben.'
            : msg,
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, []);

  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Scanner schließen"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,8,4,0.92)',
        zIndex: 90,
        border: 'none',
        padding: 0,
        cursor: 'default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        // biome-ignore lint/a11y/useSemanticElements: overlay container, not a focusable widget
        role="dialog"
        aria-modal="true"
        aria-label="Barcode-Scanner"
        style={{
          width: '100%',
          maxWidth: 520,
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div className="row-between">
          <div style={{ color: '#fff', fontFamily: 'var(--serif)', fontSize: 22 }}>
            Barcode scannen
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="pressable"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.14)',
              border: 'none',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Icon name="x" size={16} strokeWidth={2} />
          </button>
        </div>

        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4 / 5',
            borderRadius: 18,
            overflow: 'hidden',
            background: '#000',
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          >
            <track kind="captions" />
          </video>
          <ScannerFrame />
          {error && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                textAlign: 'center',
                background: 'rgba(0,0,0,0.6)',
                color: '#fff',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center' }}>
          Halte den Barcode der Verpackung in den Rahmen.
        </div>
      </div>
    </button>
  );
}

function ScannerFrame() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '78%',
          height: '36%',
          border: '2px solid rgba(255,255,255,0.85)',
          borderRadius: 14,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
        }}
      />
    </div>
  );
}
