'use client';

import { retractMealAction } from '@/app/actions';
import type { MealSlotMeta } from '@/lib/nutrition';
import { type PointerEvent as ReactPointerEvent, useRef, useState, useTransition } from 'react';
import { Icon, type IconName } from '../Icon';
import { Sheet, SheetCloseButton } from '../Sheet';
import type { MealPoint } from '../types';
import { MealEditSheet } from './MealEditSheet';

interface SlotDetailSheetProps {
  slot: MealSlotMeta;
  meals: MealPoint[];
  onClose: () => void;
  onAdd: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function sourceIcon(source: string): IconName {
  if (source === 'voice') return 'mic';
  if (source === 'photo') return 'camera';
  return 'text';
}

export function SlotDetailSheet({ slot, meals, onClose, onAdd }: SlotDetailSheetProps) {
  const totalKcal = meals.reduce((s, m) => s + m.kcal, 0);
  const [editing, setEditing] = useState<MealPoint | null>(null);

  return (
    <Sheet
      onClose={onClose}
      header={
        <div className="row-between" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: slot.tint,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: slot.iconColor,
                flexShrink: 0,
              }}
            >
              <Icon name={slot.icon} size={20} strokeWidth={1.6} stroke="currentColor" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 26,
                  lineHeight: 1.05,
                  color: 'var(--ink)',
                  letterSpacing: '-0.02em',
                }}
              >
                {slot.label}
              </div>
              <div style={{ marginTop: 2, color: 'var(--ink-3)', fontSize: 13 }}>
                {meals.length} {meals.length === 1 ? 'Eintrag' : 'Einträge'} · {totalKcal} kcal
              </div>
            </div>
          </div>
          <SheetCloseButton onClose={onClose} />
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {meals.map((m) => (
          <MealDetailCard key={m.event_id} meal={m} onEdit={() => setEditing(m)} />
        ))}
      </div>

      {editing && <MealEditSheet meal={editing} onClose={() => setEditing(null)} />}

      <button
        type="button"
        onClick={onAdd}
        className="pressable"
        style={{
          marginTop: 14,
          width: '100%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '12px',
          borderRadius: 12,
          background: 'var(--sage-wash)',
          color: 'var(--sage-deep)',
          border: 'none',
          fontFamily: 'var(--sans)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        <Icon name="plus" size={14} strokeWidth={2} /> Weitere Mahlzeit hinzufügen
      </button>
    </Sheet>
  );
}

// Schwellen für die Swipe-Geste. Unter REVEAL_THRESHOLD federt die Karte zurück,
// dazwischen rastet sie im "Reveal"-Zustand ein (Lösch-Button sichtbar),
// jenseits von COMMIT_THRESHOLD wird direkt zurückgezogen.
const REVEAL_THRESHOLD = 48;
const REVEAL_OFFSET = 88;
const COMMIT_THRESHOLD = 180;

function MealDetailCard({ meal, onEdit }: { meal: MealPoint; onEdit: () => void }) {
  const macros: string[] = [];
  if (meal.protein_g !== null && meal.protein_g > 0)
    macros.push(`${Math.round(meal.protein_g)} g Protein`);
  if (meal.carbs_g !== null && meal.carbs_g > 0)
    macros.push(`${Math.round(meal.carbs_g)} g Kohlenhydrate`);
  if (meal.fat_g !== null && meal.fat_g > 0) macros.push(`${Math.round(meal.fat_g)} g Fett`);

  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const isHorizontalDrag = useRef(false);

  function commitRetract() {
    const fd = new FormData();
    fd.append('event_id', meal.event_id);
    startTransition(async () => {
      await retractMealAction(fd);
    });
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    isHorizontalDrag.current = false;
    setDragging(true);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartX.current === null || dragStartY.current === null) return;
    const dx = e.clientX - dragStartX.current;
    const dy = e.clientY - dragStartY.current;
    // Erst nach klarem horizontalen Anteil capturen, sonst frisst die Geste das
    // vertikale Scrollen des Sheets.
    if (!isHorizontalDrag.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dx) <= Math.abs(dy)) {
        // Wahrscheinlich vertikales Scroll — Geste abbrechen.
        dragStartX.current = null;
        dragStartY.current = null;
        setDragging(false);
        return;
      }
      isHorizontalDrag.current = true;
      if (e.currentTarget.setPointerCapture) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // setPointerCapture kann werfen, wenn der Pointer schon released ist.
        }
      }
    }
    // Nur nach links ziehen darf einen Offset erzeugen.
    setOffset(Math.min(0, dx));
  }

  function endDrag() {
    setDragging(false);
    dragStartX.current = null;
    dragStartY.current = null;
    isHorizontalDrag.current = false;
    if (offset <= -COMMIT_THRESHOLD) {
      // Full-Swipe: Karte fliegt weiter raus, dann Retract.
      setOffset(-COMMIT_THRESHOLD - 60);
      commitRetract();
      return;
    }
    if (offset <= -REVEAL_THRESHOLD) {
      setOffset(-REVEAL_OFFSET);
      return;
    }
    setOffset(0);
  }

  function onPointerUp() {
    endDrag();
  }

  function onPointerCancel() {
    endDrag();
  }

  const revealed = offset <= -REVEAL_THRESHOLD;

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 14,
        overflow: 'hidden',
        opacity: pending ? 0.5 : 1,
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (revealed) {
            commitRetract();
          } else {
            setOffset(-REVEAL_OFFSET);
          }
        }}
        disabled={pending}
        aria-label={`${meal.label} zurückziehen`}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--amber)',
          color: 'white',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 22px',
          gap: 8,
          fontFamily: 'var(--sans)',
          fontSize: 13,
          fontWeight: 500,
          cursor: pending ? 'wait' : 'pointer',
        }}
      >
        <Icon name="x" size={16} strokeWidth={2} stroke="currentColor" />
        Zurückziehen
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{
          padding: '12px 14px',
          background: 'var(--surface-2)',
          borderRadius: 14,
          border: '0.5px solid var(--hairline)',
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.2, 0.7, 0.2, 1)',
          touchAction: 'pan-y',
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (offset < 0) {
              setOffset(0);
              return;
            }
            onEdit();
          }}
          aria-label={`${meal.label} bearbeiten`}
          className="pressable"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            width: '100%',
            background: 'transparent',
            border: 'none',
            padding: 0,
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-3)',
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <Icon name={sourceIcon(meal.source)} size={14} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: 'var(--ink)',
                lineHeight: 1.3,
                wordBreak: 'break-word',
              }}
            >
              {meal.label}
            </div>
            <div className="mono-sm" style={{ marginTop: 4, fontSize: 11 }}>
              {formatTime(meal.occurred_at)} · {meal.kcal} kcal
              {meal.corrected ? ' · korrigiert' : ''}
            </div>
            {macros.length > 0 && (
              <div
                style={{
                  marginTop: 6,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                }}
              >
                {macros.map((m) => (
                  <span
                    key={m}
                    style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: 'var(--surface)',
                      color: 'var(--ink-3)',
                      border: '0.5px solid var(--hairline)',
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {meal.confidence !== null && meal.confidence < 0.9 && (
              <span
                className="pill"
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  background: 'rgba(196,152,85,0.14)',
                  color: 'var(--amber)',
                }}
              >
                ungefähr
              </span>
            )}
            <Icon name="chevron-right" size={16} strokeWidth={1.6} stroke="var(--ink-4)" />
          </div>
        </button>
      </div>
    </div>
  );
}
