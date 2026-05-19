import { useEffect } from 'react';

/*
 * Sperrt das Body-Scrollen, solange mindestens ein Modal/Sheet mounted ist.
 *
 * Warum nicht reines CSS (`body:has(.sheet-backdrop) { overflow: hidden }`)?
 * Auf iOS-Safari verhindert `overflow: hidden` allein kein Touch-Scroll/Rubber-
 * Banding des Body — der Hintergrund scrollt trotzdem mit. Zuverlässig nur via
 * `position: fixed` auf dem Body. Dabei muss die aktuelle Scroll-Position
 * vorher gemerkt und beim Unmount restauriert werden, sonst springt die Seite
 * beim Schließen nach oben.
 *
 * Modul-globaler Ref-Counter: Wenn ein Sheet über einem anderen geöffnet wird
 * (z.B. PortionDialog im MealComposer), darf der innere Unmount den Lock nicht
 * vorzeitig lösen. Erst wenn der letzte Konsument abmeldet, wird der Body
 * wieder freigegeben.
 */

let lockCount = 0;
let savedScrollY = 0;
let savedBodyStyles: {
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  overflow: string;
} | null = null;

function lock() {
  if (lockCount === 0) {
    const body = document.body;
    savedScrollY = window.scrollY;
    savedBodyStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = 'fixed';
    body.style.top = `-${savedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0 && savedBodyStyles) {
    const body = document.body;
    body.style.position = savedBodyStyles.position;
    body.style.top = savedBodyStyles.top;
    body.style.left = savedBodyStyles.left;
    body.style.right = savedBodyStyles.right;
    body.style.width = savedBodyStyles.width;
    body.style.overflow = savedBodyStyles.overflow;
    savedBodyStyles = null;
    // Scroll-Position wiederherstellen — `position: fixed` hat den Body nach
    // oben verschoben, sonst springt die Seite jetzt sichtbar.
    window.scrollTo(0, savedScrollY);
  }
}

export function useBodyScrollLock() {
  useEffect(() => {
    lock();
    return unlock;
  }, []);
}
