import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  onClose: () => void;
  threshold?: number;
  velocityThreshold?: number;
}

interface DragState {
  startY: number;
  startTime: number;
  startScrollTop: number;
  active: boolean;
}

export function useSheetDismissDrag({
  onClose,
  threshold = 100,
  velocityThreshold = 0.6,
}: Options) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [closing, setClosing] = useState(false);

  const setRef = useCallback((node: HTMLDivElement | null) => {
    elementRef.current = node;
  }, []);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const damp = (delta: number) => (delta <= 0 ? 0 : delta ** 0.92);

    const reset = () => {
      el.style.transition = 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)';
      el.style.transform = 'translateY(0)';
      window.setTimeout(() => {
        if (el) el.style.transition = '';
      }, 240);
    };

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      dragRef.current = {
        startY: touch.clientY,
        startTime: performance.now(),
        startScrollTop: el.scrollTop,
        active: false,
      };
      el.style.transition = '';
    };

    const handleTouchMove = (e: TouchEvent) => {
      const drag = dragRef.current;
      const touch = e.touches[0];
      if (!drag || !touch) return;
      const deltaY = touch.clientY - drag.startY;

      if (drag.startScrollTop > 0 || deltaY <= 0) {
        if (!drag.active) return;
      }

      if (deltaY > 0 && el.scrollTop <= 0) {
        drag.active = true;
        if (e.cancelable) e.preventDefault();
        el.style.transform = `translateY(${damp(deltaY)}px)`;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      if (!drag.active) {
        reset();
        return;
      }
      const touch = e.changedTouches[0];
      const endY = touch ? touch.clientY : drag.startY;
      const deltaY = endY - drag.startY;
      const elapsed = performance.now() - drag.startTime;
      const velocity = elapsed > 0 ? deltaY / elapsed : 0;

      const flick = deltaY > 30 && velocity > velocityThreshold && elapsed > 16;
      if (deltaY > threshold || flick) {
        setClosing(true);
        el.style.transition = 'transform 240ms cubic-bezier(0.4, 0.0, 1, 1)';
        el.style.transform = 'translateY(100%)';
        window.setTimeout(() => {
          onClose();
        }, 220);
      } else {
        reset();
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onClose, threshold, velocityThreshold]);

  const style: CSSProperties = closing ? { animation: 'none' } : {};

  return { ref: setRef, style };
}
