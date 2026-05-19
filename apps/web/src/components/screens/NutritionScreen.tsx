'use client';

import { logMealFromTemplateAction } from '@/app/actions';
import {
  MEAL_SLOTS,
  type MealSlotId,
  type MealSlotMeta,
  type NutritionTargets,
  effectiveSlot,
  formatTodayHeading,
  slotMeta,
} from '@/lib/nutrition';
import { useMemo, useState, useTransition } from 'react';
import { Icon, type IconName } from '../Icon';
import type { MealPoint, MealTemplateView, NutritionData } from '../types';
import { MacroDetailSheet } from './MacroDetailSheet';
import { NutritionCoachSheet } from './NutritionCoachSheet';
import { PantrySheet } from './PantrySheet';
import { SlotDetailSheet } from './SlotDetailSheet';
import { TemplatePickerSheet } from './TemplatePickerSheet';

interface NutritionScreenProps {
  nutrition: NutritionData;
  nutritionTargets: NutritionTargets;
  mealTemplates: MealTemplateView[];
  userName: string;
  onOpenComposer: () => void;
  onCreateTemplate: () => void;
  onEditTemplate: (template: MealTemplateView) => void;
}

export function NutritionScreen({
  nutrition,
  nutritionTargets,
  mealTemplates,
  userName,
  onOpenComposer,
  onCreateTemplate,
  onEditTemplate,
}: NutritionScreenProps) {
  const { today, todayTotals } = nutrition;
  const [pickerSlot, setPickerSlot] = useState<MealSlotId | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [pantryOpen, setPantryOpen] = useState(false);
  const [slotDetail, setSlotDetail] = useState<MealSlotId | null>(null);

  const mealsBySlot = useMemo(() => {
    const grouped = new Map<MealSlotId, MealPoint[]>();
    for (const m of today) {
      const slot = effectiveSlot(m);
      const arr = grouped.get(slot) ?? [];
      arr.push(m);
      grouped.set(slot, arr);
    }
    return grouped;
  }, [today]);

  const slotDetailMeta = slotDetail ? MEAL_SLOTS.find((s) => s.id === slotDetail) : null;
  const slotDetailMeals = slotDetail ? (mealsBySlot.get(slotDetail) ?? []) : [];

  return (
    <div className="screen-content scroll">
      <Header onOpenCoach={() => setCoachOpen(true)} onOpenPantry={() => setPantryOpen(true)} />

      <div className="pad-x" style={{ marginTop: 14 }}>
        <MacroSummaryCard
          totals={todayTotals}
          targets={nutritionTargets}
          onOpen={() => setDetailOpen(true)}
        />
      </div>

      <div className="pad-x" style={{ marginTop: 14 }}>
        <MealSlotsCard
          mealsBySlot={mealsBySlot}
          onOpenComposer={onOpenComposer}
          onSlotPlus={(slot) => setPickerSlot(slot)}
          onOpenSlot={(slot) => setSlotDetail(slot)}
        />
      </div>

      <div className="pad-x" style={{ marginTop: 14, marginBottom: 32 }}>
        <FoodMemoryCard
          templates={mealTemplates}
          onCreate={onCreateTemplate}
          onEdit={onEditTemplate}
        />
      </div>

      {detailOpen && (
        <MacroDetailSheet
          totals={todayTotals}
          targets={nutritionTargets}
          onClose={() => setDetailOpen(false)}
        />
      )}
      {coachOpen && <NutritionCoachSheet userName={userName} onClose={() => setCoachOpen(false)} />}
      {pantryOpen && <PantrySheet onClose={() => setPantryOpen(false)} />}

      {pickerSlot && (
        <TemplatePickerSheet
          slot={pickerSlot}
          templates={mealTemplates}
          onClose={() => setPickerSlot(null)}
          onCreateNew={() => {
            setPickerSlot(null);
            onOpenComposer();
          }}
        />
      )}

      {slotDetailMeta && (
        <SlotDetailSheet
          slot={slotDetailMeta}
          meals={slotDetailMeals}
          onClose={() => setSlotDetail(null)}
          onAdd={() => {
            setSlotDetail(null);
            setPickerSlot(slotDetailMeta.id);
          }}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Header
 * ──────────────────────────────────────────────────────────── */

function Header({
  onOpenCoach,
  onOpenPantry,
}: {
  onOpenCoach: () => void;
  onOpenPantry: () => void;
}) {
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
          Ernährung
        </div>
        <div style={{ marginTop: 4, color: 'var(--ink-3)', fontSize: 14 }}>
          {formatTodayHeading()}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button
          type="button"
          onClick={onOpenCoach}
          aria-label="Tagesziele berechnen"
          title="Tagesziele berechnen"
          className="pressable"
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'var(--sage-wash)',
            border: '0.5px solid rgba(110,122,78,0.22)',
            color: 'var(--sage-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Icon name="sparkle" size={16} />
        </button>
        <button
          type="button"
          onClick={onOpenPantry}
          aria-label="Vorrat öffnen"
          title="Vorrat"
          className="pressable"
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'var(--surface)',
            border: '0.5px solid var(--hairline)',
            color: 'var(--ink-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Icon name="leaf" size={16} />
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Macro Summary
 * ──────────────────────────────────────────────────────────── */

function MacroSummaryCard({
  totals,
  targets,
  onOpen,
}: {
  totals: NutritionData['todayTotals'];
  targets: NutritionTargets;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Detail-Ansicht öffnen"
      className="card rise pressable"
      style={{
        padding: '18px 16px',
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        border: '0.5px solid var(--hairline)',
        background: 'var(--surface)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <MacroStat
          icon="flame"
          value={totals.kcal}
          unit=""
          label="kcal"
          target={targets.kcal.value}
          targetUnit="kcal"
        />
        <MacroStat
          icon="leaf"
          value={Math.round(totals.protein_g)}
          unit="g"
          label="Protein"
          target={targets.protein_g.value}
          targetUnit="g"
        />
        <MacroStat
          icon="wheat"
          value={Math.round(totals.carbs_g)}
          unit="g"
          label="Kohlenhydrate"
          target={targets.carbs_g.value}
          targetUnit="g"
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginTop: 14,
          paddingTop: 14,
          borderTop: '0.5px solid var(--hairline)',
        }}
      >
        <MacroStat
          icon="droplet"
          value={Math.round(totals.fat_g)}
          unit="g"
          label="Fett"
          target={targets.fat_g.value}
          targetUnit="g"
          targetKind={targets.fat_g.kind}
        />
        <MacroStat
          icon="droplet"
          value={Math.round(totals.sugar_g)}
          unit="g"
          label="Zucker"
          target={targets.sugar_g.value}
          targetUnit="g"
          targetKind={targets.sugar_g.kind}
        />
        <MacroStat
          icon="leaf"
          value={Math.round(totals.fiber_g)}
          unit="g"
          label="Ballaststoffe"
          target={targets.fiber_g.value}
          targetUnit="g"
          targetKind={targets.fiber_g.kind}
        />
      </div>
    </button>
  );
}

function MacroStat({
  icon,
  value,
  unit,
  label,
  target,
  targetUnit,
  targetKind = 'goal',
}: {
  icon: IconName;
  value: number;
  unit: string;
  label: string;
  target: number;
  targetUnit: string;
  targetKind?: 'goal' | 'limit';
}) {
  const rawPct = target > 0 ? (value / target) * 100 : 0;
  const pct = Math.min(100, rawPct);
  const over = targetKind === 'limit' && rawPct > 100;
  const barColor = over ? 'var(--amber)' : undefined;
  const targetPrefix = targetKind === 'limit' ? 'max. ' : 'von ';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <Icon name={icon} size={18} stroke="var(--sage-deep)" strokeWidth={1.6} />
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 22,
          color: over ? 'var(--amber)' : 'var(--ink)',
          lineHeight: 1.1,
          letterSpacing: '-0.01em',
        }}
      >
        {value.toLocaleString('de-DE')}
        {unit && <span style={{ fontSize: 14, marginLeft: 2 }}>{` ${unit}`}</span>}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--ink-3)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </div>
      <div className="progress" style={{ height: 4 }}>
        <span style={{ width: `${pct}%`, ...(barColor ? { background: barColor } : {}) }} />
      </div>
      <div style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
        {targetPrefix}
        {target.toLocaleString('de-DE')} {targetUnit}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Meal Slots
 * ──────────────────────────────────────────────────────────── */

function MealSlotsCard({
  mealsBySlot,
  onOpenComposer,
  onSlotPlus,
  onOpenSlot,
}: {
  mealsBySlot: Map<MealSlotId, MealPoint[]>;
  onOpenComposer: () => void;
  onSlotPlus: (slot: MealSlotId) => void;
  onOpenSlot: (slot: MealSlotId) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="card rise" style={{ animationDelay: '60ms', padding: '20px 18px 8px' }}>
      <div className="row-between" style={{ marginBottom: 6 }}>
        <div className="h-card" style={{ fontSize: 19 }}>
          Deine Mahlzeiten
        </div>
        <button
          type="button"
          onClick={onOpenComposer}
          className="pressable"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            background: 'var(--sage-wash)',
            color: 'var(--sage-deep)',
            border: 'none',
            borderRadius: 999,
            fontFamily: 'var(--sans)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Icon name="plus" size={14} strokeWidth={2} /> Mahlzeit hinzufügen
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {MEAL_SLOTS.map((slot, i) => (
          <SlotRow
            key={slot.id}
            slot={slot}
            meals={mealsBySlot.get(slot.id) ?? []}
            collapsed={!expanded && i >= 2}
            onPlus={() => onSlotPlus(slot.id)}
            onOpen={() => onOpenSlot(slot.id)}
            isLast={i === MEAL_SLOTS.length - 1}
          />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4, paddingBottom: 4 }}>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? 'Einklappen' : 'Ausklappen'}
          className="pressable"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--surface-2)',
            border: '0.5px solid var(--hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-3)',
            cursor: 'pointer',
          }}
        >
          <Icon name="chevrons-up-down" size={14} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
}

function SlotRow({
  slot,
  meals,
  collapsed,
  onPlus,
  onOpen,
  isLast,
}: {
  slot: MealSlotMeta;
  meals: MealPoint[];
  collapsed: boolean;
  onPlus: () => void;
  onOpen: () => void;
  isLast: boolean;
}) {
  if (collapsed) return null;
  const hasMeals = meals.length > 0;
  const totalKcal = meals.reduce((s, m) => s + m.kcal, 0);

  const borderBottom = isLast ? 'none' : '0.5px solid var(--hairline)';

  if (!hasMeals) {
    return (
      <div
        style={{
          padding: '12px 0',
          borderBottom,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <SlotIcon slot={slot} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 17,
              lineHeight: 1.1,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
            }}
          >
            {slot.label}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              color: 'var(--ink-3)',
            }}
          >
            Noch nichts hinzugefügt
          </div>
        </div>
        <button
          type="button"
          onClick={onPlus}
          aria-label={`${slot.label} hinzufügen`}
          className="pressable"
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'transparent',
            border: '1px dashed var(--hairline-strong)',
            color: 'var(--ink-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Icon name="plus" size={16} strokeWidth={2} />
        </button>
      </div>
    );
  }

  // Gefüllter Slot: zusammenfassende Zeile, beim Tap öffnet das SlotDetailSheet.
  // Erste Mahlzeit + "+ N weitere", kcal-Pill, Chevron statt Plus.
  const firstMeal = meals[0];
  if (!firstMeal) {
    // unreachable wegen hasMeals, aber TS will einen narrow.
    return null;
  }
  const rest = meals.length - 1;
  const subtitle = rest > 0 ? `${firstMeal.label} + ${rest} weitere` : firstMeal.label;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${slot.label} Details öffnen`}
      className="pressable"
      style={{
        padding: '14px 0',
        borderBottom,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: 'transparent',
        border: 'none',
        borderBottomStyle: isLast ? undefined : 'solid',
        borderBottomWidth: isLast ? undefined : '0.5px',
        borderBottomColor: isLast ? undefined : 'var(--hairline)',
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <SlotIcon slot={slot} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 17,
            lineHeight: 1.1,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {slot.label}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 13,
            color: 'var(--ink-3)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {subtitle}
        </div>
        <div style={{ marginTop: 8 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: 999,
              background: slot.tint,
              fontSize: 12,
              color: slot.iconColor,
              fontWeight: 500,
            }}
          >
            {totalKcal} kcal
          </span>
        </div>
      </div>
      <Icon name="chevron-right" size={18} strokeWidth={1.6} stroke="var(--ink-4)" />
    </button>
  );
}

function SlotIcon({ slot }: { slot: MealSlotMeta }) {
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        background: slot.tint,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: slot.iconColor,
        flexShrink: 0,
      }}
    >
      <Icon name={slot.icon} size={18} strokeWidth={1.6} stroke="currentColor" />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Food Memory
 * ──────────────────────────────────────────────────────────── */

const INITIAL_VISIBLE = 4;

function FoodMemoryCard({
  templates,
  onCreate,
  onEdit,
}: {
  templates: MealTemplateView[];
  onCreate: () => void;
  onEdit: (t: MealTemplateView) => void;
}) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [_, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => t.label.toLowerCase().includes(q));
  }, [templates, search]);

  const visible = showAll ? filtered : filtered.slice(0, INITIAL_VISIBLE);
  const hasMore = filtered.length > INITIAL_VISIBLE;

  function logFromTemplate(id: string) {
    setPendingId(id);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append('template_id', id);
        await logMealFromTemplateAction(fd);
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="card rise" style={{ animationDelay: '120ms', padding: '20px 18px' }}>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div className="h-card" style={{ fontSize: 19 }}>
          Food Memory
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="pressable"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--sage-deep)',
            fontFamily: 'var(--sans)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Verwalten
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--surface-2)',
            borderRadius: 12,
            padding: '10px 12px',
            border: '0.5px solid var(--hairline)',
          }}
        >
          <Icon name="search" size={14} stroke="var(--ink-4)" strokeWidth={1.8} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Gerichten"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              fontFamily: 'var(--sans)',
              color: 'var(--ink-2)',
            }}
          />
        </div>
        <button
          type="button"
          aria-label="Filter"
          className="pressable"
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'var(--surface-2)',
            border: '0.5px solid var(--hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-3)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Icon name="filter" size={16} strokeWidth={1.8} />
        </button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '14px 0 4px' }}>
          {templates.length === 0
            ? 'Noch keine Vorlagen. Tippe „Verwalten" für die erste.'
            : 'Keine passenden Gerichte gefunden.'}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
          }}
        >
          {visible.map((t) => (
            <FoodMemoryCardItem
              key={t.id}
              template={t}
              pending={pendingId === t.id}
              onLog={() => logFromTemplate(t.id)}
              onEdit={() => onEdit(t)}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="pressable"
          style={{
            marginTop: 14,
            width: '100%',
            background: 'var(--surface-2)',
            color: 'var(--sage-deep)',
            border: 'none',
            borderRadius: 12,
            padding: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontFamily: 'var(--sans)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {showAll ? 'Weniger anzeigen' : 'Mehr anzeigen'}
          <Icon
            name="chevron-down"
            size={14}
            strokeWidth={2}
            style={{
              transform: showAll ? 'rotate(180deg)' : 'none',
              transition: 'transform 160ms',
            }}
          />
        </button>
      )}
    </div>
  );
}

function FoodMemoryCardItem({
  template,
  pending,
  onLog,
  onEdit,
}: {
  template: MealTemplateView;
  pending: boolean;
  onLog: () => void;
  onEdit: () => void;
}) {
  const protein = template.protein_g !== null && template.protein_g > 0 ? template.protein_g : null;
  const meta = slotMeta(template.slot);

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: 14,
        border: '0.5px solid var(--hairline)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        opacity: pending ? 0.6 : 1,
        position: 'relative',
      }}
    >
      <button
        type="button"
        onClick={onLog}
        disabled={pending}
        aria-label={`${template.label} loggen`}
        className="pressable"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          textAlign: 'left',
          cursor: pending ? 'wait' : 'pointer',
          width: '100%',
        }}
      >
        <FoodPlaceholder label={template.label} slot={meta} />
        <div style={{ padding: '10px 12px 12px' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ink)',
              lineHeight: 1.25,
              minHeight: 32,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {template.label}
          </div>
          <div className="mono-sm" style={{ marginTop: 6, fontSize: 10.5 }}>
            {template.kcal} kcal
          </div>
          {protein !== null && (
            <div className="mono-sm" style={{ marginTop: 2, fontSize: 10.5 }}>
              {Math.round(protein)} g Protein
            </div>
          )}
        </div>
      </button>
      <button
        type="button"
        onClick={onEdit}
        disabled={pending}
        aria-label={`${template.label} bearbeiten`}
        className="pressable"
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.85)',
          border: '0.5px solid var(--hairline)',
          color: 'var(--ink-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: pending ? 'wait' : 'pointer',
          backdropFilter: 'blur(4px)',
        }}
      >
        <Icon name="edit" size={12} strokeWidth={1.8} />
      </button>
    </div>
  );
}

// Platzhalter-Tile: Slot-Akzent (wenn vorhanden) sonst deterministischer Hash-Tint.
// Bild-Upload kommt später.
function FoodPlaceholder({ label, slot }: { label: string; slot: MealSlotMeta | null }) {
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  // Slot-Farbe gewinnt, damit Food-Memory- und Mahlzeiten-Liste die gleiche
  // Akzent-Sprache sprechen.
  let bg: string;
  let fg: string;
  if (slot) {
    bg = `linear-gradient(135deg, ${slot.tint}, color-mix(in srgb, ${slot.tint} 55%, transparent))`;
    fg = slot.iconColor;
  } else {
    const hue = Array.from(label).reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) % 360, 0);
    bg = `linear-gradient(135deg, hsl(${hue}, 30%, 78%), hsl(${(hue + 40) % 360}, 28%, 88%))`;
    fg = 'rgba(20,18,12,0.55)';
  }
  return (
    <div
      style={{
        height: 96,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: fg,
        fontFamily: 'var(--serif)',
        fontSize: 28,
        letterSpacing: '0.04em',
      }}
    >
      {initials || '·'}
    </div>
  );
}
