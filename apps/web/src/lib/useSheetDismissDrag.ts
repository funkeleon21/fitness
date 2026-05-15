import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

/*
 * iOS-Style Drag-to-Dismiss für Bottom-Sheets.
 *
 * Verhalten (an Apples Modal-Sheets angelehnt):
 *  - Das Sheet folgt dem Finger/Pointer direkt nach unten. Backdrop dimmt parallel.
 *  - Loslassen unter einem Schwellenwert oder mit kleiner Velocity → snap-back.
 *  - Loslassen jenseits Schwelle (deltaY > threshold) oder schneller Flick → schließen.
 *  - Drag-Handle/Header (handleRef): wischen schließt IMMER, egal ob Inhalt scrollt.
 *  - Body (ref): wischen schließt nur am Top-Scroll (scrollTop === 0). Sonst normales Scrollen.
 *  - Pointer- + Touch-Events werden unterstützt (Maus/Trackpad/Touch).
 *
 * Was bewusst NICHT passiert:
 *  - Keine globalen Document-Listener — alle Listener hängen an den jeweiligen Elementen.
 *  - Kein preventDefault im Body, solange wir nicht aktiv ziehen (sonst leidet iOS-Scroll).
 *  - Keine externe Animation-Lib — alles via Transform/Opacity + CSS-Transition.
 */

interface Options {
  onClose: () => void;
  /** Drag-Distanz in px, ab der bei Release geschlossen wird. */
  threshold?: number;
  /** Velocity-Schwelle in px/ms für Flick-Dismiss. */
  velocityThreshold?: number;
}

interface DragState {
  pointerId: number | null;
  startY: number;
  startTime: number;
  startScrollTop: number;
  /** true sobald wir die Geste übernommen haben und das Sheet transformieren. */
  active: boolean;
  /** true wenn die Geste vom Handle/Header startet — dann ist Scroll irrelevant. */
  fromHandle: boolean;
  /** letzte Position für Velocity-Sampling (sliding window). */
  lastY: number;
  lastTime: number;
  prevY: number;
  prevTime: number;
}

export function useSheetDismissDrag({
  onClose,
  threshold = 100,
  velocityThreshold = 0.6,
}: Options) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const handleElRef = useRef<HTMLDivElement | null>(null);
  const backdropElRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [closing, setClosing] = useState(false);

  const setRef = useCallback((node: HTMLDivElement | null) => {
    elementRef.current = node;
  }, []);
  const setHandleRef = useCallback((node: HTMLDivElement | null) => {
    handleElRef.current = node;
  }, []);
  const setBackdropRef = useCallback((node: HTMLDivElement | null) => {
    backdropElRef.current = node;
  }, []);

  useEffect(() => {
    const sheet = elementRef.current;
    if (!sheet) return;

    /* Leichte „Gummiband"-Dämpfung für die ersten Pixel, damit der Pull weich wirkt
       — aber im aktiven Bereich (>~10px) praktisch linear, sonst fühlt sich's träge an. */
    const transform = (delta: number) => {
      if (delta <= 0) return 0;
      // Quasi-linear ab 0, ganz leichte Stauchung bei sehr großen Werten.
      return delta < 200 ? delta : 200 + (delta - 200) * 0.7;
    };

    /* DOM-Mutations werden auf rAF gebatched, damit pro Frame maximal einmal
       gerendert wird — sonst stockt es bei schnellem Wischen, weil mehrere
       move-Events pro Frame ankommen und jeder einen Layout-Paint triggert. */
    let rafId = 0;
    let pendingDeltaY = 0;
    let visualActive = false;

    const flushVisual = () => {
      rafId = 0;
      const t = transform(pendingDeltaY);
      sheet.style.transform = `translateY(${t}px)`;
      const backdrop = backdropElRef.current;
      if (backdrop) {
        // Backdrop fadet mit dem Drag — bei threshold etwa halb so opak wie Start.
        const progress = Math.min(1, pendingDeltaY / (threshold * 2));
        const opacity = Math.max(0.3, 1 - progress * 0.7);
        backdrop.style.opacity = String(opacity);
      }
    };

    const updateVisual = (deltaY: number) => {
      pendingDeltaY = deltaY;
      if (!visualActive) {
        visualActive = true;
        sheet.style.willChange = 'transform';
        // touch-action: none verhindert, dass iOS-Safari parallel zum Drag noch
        // einen nativen Scroll/Bounce versucht zu starten — sonst stockt das
        // Tracking, weil der Browser unsere Geste gleichzeitig auswerten will.
        sheet.style.touchAction = 'none';
        const backdrop = backdropElRef.current;
        if (backdrop) backdrop.style.willChange = 'opacity';
      }
      if (rafId === 0) rafId = requestAnimationFrame(flushVisual);
    };

    const resetTransition = () => {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      sheet.style.transition = 'transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)';
      sheet.style.transform = 'translateY(0)';
      const backdrop = backdropElRef.current;
      if (backdrop) {
        backdrop.style.transition = 'opacity 240ms cubic-bezier(0.2, 0.8, 0.2, 1)';
        backdrop.style.opacity = '';
      }
      window.setTimeout(() => {
        if (sheet) {
          sheet.style.transition = '';
          sheet.style.willChange = '';
          sheet.style.touchAction = '';
        }
        if (backdrop) {
          backdrop.style.transition = '';
          backdrop.style.willChange = '';
        }
        visualActive = false;
      }, 260);
    };

    const isInputTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false;
      return Boolean(target.closest('input, textarea, select, button, [contenteditable="true"]'));
    };

    // fromHandle wird über das tatsächliche Event-Target bestimmt, NICHT über
    // currentTarget — Listener läuft nur auf dem Sheet, Bubbling vom Handle
    // wäre sonst nicht erkennbar.
    const targetIsInHandle = (target: EventTarget | null): boolean => {
      const handle = handleElRef.current;
      if (!handle || !(target instanceof Node)) return false;
      return handle.contains(target);
    };

    /* ───── Touch-Path ───── */

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      // Tippen in Eingabe-Felder darf die Geste niemals starten.
      if (isInputTarget(e.target)) return;
      const fromHandle = targetIsInHandle(e.target);
      dragRef.current = {
        pointerId: null,
        startY: touch.clientY,
        startTime: performance.now(),
        startScrollTop: sheet.scrollTop,
        active: false,
        fromHandle,
        lastY: touch.clientY,
        lastTime: performance.now(),
        prevY: touch.clientY,
        prevTime: performance.now(),
      };
      sheet.style.transition = '';
      // slideUp-Keyframe-Animation (CSS, läuft 280ms beim Mount) hat höhere
      // Priorität als inline-Styles, solange sie aktiv ist. Wenn der User
      // direkt nach dem Öffnen anfängt zu draggen, würde unser transform
      // sonst verworfen — bzw. das spätere translateY(100%) springt statt
      // zu sliden. Sobald die Geste startet, können wir die Mount-Animation
      // abschalten: das Sheet ist sichtbar, sie hat ihre Arbeit getan.
      sheet.style.animation = 'none';
      const backdrop = backdropElRef.current;
      if (backdrop) backdrop.style.transition = '';
    };

    const onTouchMove = (e: TouchEvent) => {
      const drag = dragRef.current;
      const touch = e.touches[0];
      if (!drag || !touch) return;
      const deltaY = touch.clientY - drag.startY;
      // Velocity-Sampling (sliding window).
      drag.prevY = drag.lastY;
      drag.prevTime = drag.lastTime;
      drag.lastY = touch.clientY;
      drag.lastTime = performance.now();

      if (drag.fromHandle) {
        if (deltaY > 0) {
          drag.active = true;
          if (e.cancelable) e.preventDefault();
          updateVisual(deltaY);
        } else if (drag.active) {
          // Wenn man wieder hochzieht im Handle: nicht negativ versetzen.
          updateVisual(0);
        }
        return;
      }

      // Body-Drag: nur am Top-Scroll und nur bei Bewegung nach unten.
      if (!drag.active) {
        if (drag.startScrollTop > 0) return;
        if (sheet.scrollTop > 0) return;
        if (deltaY <= 0) return;
        drag.active = true;
      }
      if (e.cancelable) e.preventDefault();
      updateVisual(Math.max(0, deltaY));
    };

    const onTouchEnd = (_e: TouchEvent) => {
      finalize();
    };

    const onTouchCancel = (_e: TouchEvent) => {
      finalize(true);
    };

    /* ───── Pointer-Path (Maus / Pen / Trackpad) ───── */

    const onPointerDown = (e: PointerEvent) => {
      // Maus-Touch-Doppel-Events durch pointerType filtern: Touch wird oben behandelt.
      if (e.pointerType === 'touch') return;
      if (e.button !== 0) return;
      if (isInputTarget(e.target)) return;
      const fromHandle = targetIsInHandle(e.target);
      dragRef.current = {
        pointerId: e.pointerId,
        startY: e.clientY,
        startTime: performance.now(),
        startScrollTop: sheet.scrollTop,
        active: false,
        fromHandle,
        lastY: e.clientY,
        lastTime: performance.now(),
        prevY: e.clientY,
        prevTime: performance.now(),
      };
      sheet.style.transition = '';
      // Siehe Kommentar im Touch-Path: slideUp-Mount-Animation muss aus, sonst
      // gewinnt sie gegen den direkt gesetzten transform beim Schließen.
      sheet.style.animation = 'none';
      const backdrop = backdropElRef.current;
      if (backdrop) backdrop.style.transition = '';
    };

    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const deltaY = e.clientY - drag.startY;
      drag.prevY = drag.lastY;
      drag.prevTime = drag.lastTime;
      drag.lastY = e.clientY;
      drag.lastTime = performance.now();

      if (drag.fromHandle) {
        if (deltaY > 0) {
          if (!drag.active) {
            drag.active = true;
            // Pointer capturen, damit der Cursor das Element nicht „verliert".
            try {
              (e.currentTarget as Element | null)?.setPointerCapture?.(e.pointerId);
            } catch {
              /* ignorieren — manche Browser/Devices unterstützen das nicht. */
            }
          }
          updateVisual(deltaY);
        } else if (drag.active) {
          updateVisual(0);
        }
        return;
      }

      if (!drag.active) {
        if (drag.startScrollTop > 0) return;
        if (sheet.scrollTop > 0) return;
        if (deltaY <= 0) return;
        drag.active = true;
        // Auch im Body-Drag Pointer capturen, sonst verliert die Maus das
        // Element, sobald sie über die Sheet-Grenze bewegt wird → Tracking
        // reißt mitten in der Bewegung ab.
        try {
          (e.currentTarget as Element | null)?.setPointerCapture?.(e.pointerId);
        } catch {
          /* ignorieren — manche Browser/Devices unterstützen das nicht. */
        }
      }
      updateVisual(Math.max(0, deltaY));
    };

    const onPointerUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      finalize();
    };

    const onPointerCancel = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      finalize(true);
    };

    /* ───── Shared finalize ───── */

    const finalize = (forceReset = false) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      if (!drag.active || forceReset) {
        resetTransition();
        return;
      }
      const deltaY = drag.lastY - drag.startY;
      // Velocity über das letzte Sample-Fenster — robuster gegen Endschwanken.
      const elapsed = Math.max(1, drag.lastTime - drag.prevTime);
      const velocity = (drag.lastY - drag.prevY) / elapsed; // px/ms, positiv = nach unten
      const totalElapsed = drag.lastTime - drag.startTime;

      const flick = deltaY > 24 && velocity > velocityThreshold && totalElapsed > 16;
      if (deltaY > threshold || flick) {
        // rAF noch canceln, will-change aber für die GPU-beschleunigte
        // Schluss-Transition stehen lassen.
        if (rafId !== 0) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
        setClosing(true);
        sheet.style.transition = 'transform 220ms cubic-bezier(0.4, 0.0, 1, 1)';
        sheet.style.transform = 'translateY(100%)';
        const backdrop = backdropElRef.current;
        if (backdrop) {
          backdrop.style.transition = 'opacity 220ms cubic-bezier(0.4, 0.0, 1, 1)';
          backdrop.style.opacity = '0';
        }
        window.setTimeout(() => {
          onClose();
        }, 200);
      } else {
        resetTransition();
      }
    };

    /* ───── Wiring ───── */

    // Listener nur einmal am Sheet registrieren — Events aus dem Handle bubblen
    // hoch, und fromHandle wird via targetIsInHandle aus e.target ermittelt.
    // Doppelte Registrierung würde das Event zweimal feuern (einmal auf handle,
    // einmal nach Bubbling auf sheet) und das dragRef beim zweiten Mal mit
    // fromHandle: false + frischem startScrollTop überschreiben → Drag am
    // Handle wäre kaputt, sobald sheet.scrollTop > 0.
    sheet.addEventListener('touchstart', onTouchStart, { passive: true });
    sheet.addEventListener('touchmove', onTouchMove, { passive: false });
    sheet.addEventListener('touchend', onTouchEnd, { passive: true });
    sheet.addEventListener('touchcancel', onTouchCancel, { passive: true });
    sheet.addEventListener('pointerdown', onPointerDown);
    sheet.addEventListener('pointermove', onPointerMove);
    sheet.addEventListener('pointerup', onPointerUp);
    sheet.addEventListener('pointercancel', onPointerCancel);

    return () => {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      sheet.removeEventListener('touchstart', onTouchStart);
      sheet.removeEventListener('touchmove', onTouchMove);
      sheet.removeEventListener('touchend', onTouchEnd);
      sheet.removeEventListener('touchcancel', onTouchCancel);
      sheet.removeEventListener('pointerdown', onPointerDown);
      sheet.removeEventListener('pointermove', onPointerMove);
      sheet.removeEventListener('pointerup', onPointerUp);
      sheet.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [onClose, threshold, velocityThreshold]);

  const style: CSSProperties = closing ? { animation: 'none' } : {};

  return {
    ref: setRef,
    handleRef: setHandleRef,
    backdropRef: setBackdropRef,
    style,
  };
}
