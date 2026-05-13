'use client';

import { logMealFromTemplateAction, retractMealAction } from '@/app/actions';
import { useState, useTransition } from 'react';
import { Icon } from '../Icon';
import type { MealPoint, MealTemplateView, NutritionData } from '../types';
import type { LogMode } from './LogSheet';

interface NutritionScreenProps {
  nutrition: NutritionData;
  mealTemplates: MealTemplateView[];
  onOpenLog: (mode: LogMode) => void;
  onCreateTemplate: () => void;
  onEditTemplate: (template: MealTemplateView) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function sourceIcon(source: string): 'mic' | 'camera' | 'text' {
  if (source === 'voice') return 'mic';
  if (source === 'photo') return 'camera';
  return 'text';
}

export function NutritionScreen({
  nutrition,
  mealTemplates,
  onOpenLog,
  onCreateTemplate,
  onEditTemplate,
}: NutritionScreenProps) {
  const { today, todayTotals } = nutrition;

  return (
    <div className="screen-content scroll">
      <Header title="Ernährung" />

      <div className="pad-x" style={{ marginTop: 18 }}>
        <TodayCard totals={todayTotals} />
      </div>

      <div className="pad-x" style={{ marginTop: 12 }}>
        <MealsCard meals={today} onOpenLog={onOpenLog} />
      </div>

      <div className="pad-x" style={{ marginTop: 12 }}>
        <FoodMemoryCard
          templates={mealTemplates}
          onCreate={onCreateTemplate}
          onEdit={onEditTemplate}
        />
      </div>

      <div className="pad-x" style={{ marginTop: 12, marginBottom: 32 }}>
        <PrincipleHint />
      </div>
    </div>
  );
}

function FoodMemoryCard({
  templates,
  onCreate,
  onEdit,
}: {
  templates: MealTemplateView[];
  onCreate: () => void;
  onEdit: (t: MealTemplateView) => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [_, startTransition] = useTransition();

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
    <div className="card rise" style={{ animationDelay: '120ms' }}>
      <div className="row-between" style={{ marginBottom: 4 }}>
        <div>
          <div className="h-card" style={{ fontSize: 17 }}>
            Food Memory
          </div>
          <div style={{ color: 'var(--ink-4)', fontSize: 12, marginTop: 4 }}>
            Wiederkehrende Mahlzeiten — einmal speichern, schnell wieder loggen
          </div>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="pressable"
          aria-label="Neue Vorlage anlegen"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--surface-2)',
            border: '0.5px solid var(--hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-2)',
            cursor: 'pointer',
          }}
        >
          <Icon name="plus" size={16} strokeWidth={2} />
        </button>
      </div>

      {templates.length === 0 ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '14px 0 4px' }}>
          Noch keine Vorlagen. Tippe das „+", um deine erste anzulegen.
        </div>
      ) : (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {templates.map((t) => (
            <TemplateRow
              key={t.id}
              template={t}
              pending={pendingId === t.id}
              onLog={() => logFromTemplate(t.id)}
              onEdit={() => onEdit(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateRow({
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
  const macros: string[] = [];
  if (template.protein_g !== null && template.protein_g > 0)
    macros.push(`${Math.round(template.protein_g)}g P`);
  if (template.carbs_g !== null && template.carbs_g > 0)
    macros.push(`${Math.round(template.carbs_g)}g K`);
  if (template.fat_g !== null && template.fat_g > 0)
    macros.push(`${Math.round(template.fat_g)}g F`);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        background: 'var(--surface-2)',
        borderRadius: 12,
        opacity: pending ? 0.6 : 1,
      }}
    >
      <button
        type="button"
        onClick={onEdit}
        className="pressable"
        style={{
          flex: 1,
          minWidth: 0,
          background: 'transparent',
          border: 'none',
          padding: 0,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--ink-2)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {template.label}
        </div>
        <div className="mono-sm" style={{ marginTop: 2 }}>
          {template.kcal} kcal
          {macros.length > 0 ? ` · ${macros.join(' · ')}` : ''}
          {template.usage_count > 0 ? ` · ${template.usage_count}×` : ''}
        </div>
      </button>
      <button
        type="button"
        onClick={onLog}
        disabled={pending}
        className="pressable"
        aria-label={`${template.label} loggen`}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'var(--sage-wash)',
          border: '0.5px solid rgba(110,122,78,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--sage-deep)',
          cursor: pending ? 'wait' : 'pointer',
          flexShrink: 0,
        }}
      >
        <Icon name="plus" size={16} strokeWidth={2} />
      </button>
    </div>
  );
}

function TodayCard({ totals }: { totals: NutritionData['todayTotals'] }) {
  const hasMacros = totals.protein_g > 0 || totals.carbs_g > 0 || totals.fat_g > 0;
  return (
    <div className="card rise">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div className="h-card" style={{ fontSize: 17 }}>
          Heute
        </div>
        <span className="mono-sm" style={{ color: 'var(--ink-3)' }}>
          {totals.kcal.toLocaleString('de-DE')} KCAL
        </span>
      </div>
      {totals.count === 0 ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '6px 0' }}>
          Noch keine Mahlzeit erfasst.
        </div>
      ) : hasMacros ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <Macro label="Protein" value={`${Math.round(totals.protein_g)} g`} />
          <Macro label="Kohlenh." value={`${Math.round(totals.carbs_g)} g`} />
          <Macro label="Fett" value={`${Math.round(totals.fat_g)} g`} />
        </div>
      ) : (
        <div
          style={{
            color: 'var(--ink-4)',
            fontSize: 12,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.04em',
          }}
        >
          {totals.count} {totals.count === 1 ? 'Mahlzeit' : 'Mahlzeiten'} · keine Makros erfasst
        </div>
      )}
    </div>
  );
}

function MealsCard({
  meals,
  onOpenLog,
}: {
  meals: MealPoint[];
  onOpenLog: (mode: LogMode) => void;
}) {
  return (
    <div className="card rise" style={{ animationDelay: '60ms' }}>
      <div className="row-between" style={{ marginBottom: 4 }}>
        <div className="h-card" style={{ fontSize: 17 }}>
          Deine Mahlzeiten
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        {meals.length === 0 ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '14px 0 6px' }}>
            Heute noch leer. Trag deine erste Mahlzeit ein.
          </div>
        ) : (
          meals.map((m, i) => <MealRow key={m.event_id} meal={m} isLast={i === meals.length - 1} />)
        )}
      </div>

      <button
        type="button"
        onClick={() => onOpenLog('meal')}
        className="pressable"
        style={{
          marginTop: 14,
          width: '100%',
          background: 'transparent',
          color: 'var(--ink-2)',
          border: '0.5px dashed var(--hairline-strong)',
          borderRadius: 12,
          padding: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontFamily: 'var(--sans)',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        <Icon name="plus" size={16} strokeWidth={2} /> Mahlzeit hinzufügen
      </button>
    </div>
  );
}

function MealRow({ meal, isLast }: { meal: MealPoint; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const macros: string[] = [];
  if (meal.protein_g !== null && meal.protein_g > 0)
    macros.push(`${Math.round(meal.protein_g)}g P`);
  if (meal.carbs_g !== null && meal.carbs_g > 0) macros.push(`${Math.round(meal.carbs_g)}g K`);
  if (meal.fat_g !== null && meal.fat_g > 0) macros.push(`${Math.round(meal.fat_g)}g F`);

  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: isLast ? 'none' : '0.5px solid var(--hairline)',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pressable"
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-3)',
            flexShrink: 0,
          }}
        >
          <Icon name={sourceIcon(meal.source)} size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--ink-2)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {meal.label}
          </div>
          <div className="mono-sm" style={{ marginTop: 2 }}>
            {formatTime(meal.occurred_at)} · {meal.kcal} kcal
            {macros.length > 0 ? ` · ${macros.join(' · ')}` : ''}
          </div>
        </div>
        {meal.corrected && (
          <span
            className="pill"
            style={{
              fontSize: 10,
              padding: '3px 7px',
              background: 'var(--surface-2)',
              color: 'var(--ink-4)',
            }}
          >
            korr.
          </span>
        )}
        {meal.confidence !== null && meal.confidence < 0.9 && (
          <span
            className="pill"
            style={{
              fontSize: 11,
              padding: '4px 8px',
              background: 'rgba(196,152,85,0.14)',
              color: 'var(--amber)',
            }}
          >
            ungefähr
          </span>
        )}
      </button>
      {open && (
        <form
          action={retractMealAction}
          style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}
        >
          <input type="hidden" name="event_id" value={meal.event_id} />
          <button
            type="submit"
            className="pressable"
            style={{
              background: 'transparent',
              border: '0.5px solid var(--hairline-strong)',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 12,
              color: 'var(--ink-3)',
              cursor: 'pointer',
            }}
          >
            Eintrag zurückziehen
          </button>
        </form>
      )}
    </div>
  );
}

function PrincipleHint() {
  return (
    <div
      className="card"
      style={{
        background: 'var(--surface-2)',
        border: '0.5px solid var(--hairline)',
      }}
    >
      <div
        className="label"
        style={{ marginBottom: 6, color: 'var(--ink-4)', letterSpacing: '0.06em' }}
      >
        HINWEIS
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
        Tagessumme ist eine Momentaufnahme — Aussagekräftig wird sie im Wochen­schnitt. Trends und
        Personal Food Memory kommen in nächsten Schritten.
      </div>
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div
      style={{
        padding: '64px 22px 6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ width: 24 }} />
      <div
        style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 15, color: 'var(--ink)' }}
      >
        {title}
      </div>
      <div style={{ color: 'var(--ink-3)', fontSize: 18, letterSpacing: '0.1em' }}>···</div>
    </div>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '12px' }}>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-4)',
          letterSpacing: '0.04em',
        }}
      >
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 18,
          color: 'var(--ink)',
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}
