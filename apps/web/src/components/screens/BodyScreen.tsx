'use client';

import { correctWeightAction, retractWeightAction } from '@/app/actions';
import { useState, useTransition } from 'react';
import { CompositionRow, LineChart } from '../Charts';
import { Icon } from '../Icon';
import type { DashboardData, WeightPoint } from '../types';
import { SectionLabel } from './HomeScreen';

type TabId = 'overview' | 'history' | 'composition';
type RangeId = '1M' | '3M' | '1Y';

interface BodyScreenProps {
  data: DashboardData;
  onNavigate: (screen: 'home' | 'body' | 'nutrition' | 'training' | 'insights') => void;
}

export function BodyScreen({ data, onNavigate }: BodyScreenProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [range, setRange] = useState<RangeId>('3M');

  const chartData = (() => {
    if (data.series.length === 0) return [];
    const cutoffDays = range === '1M' ? 30 : range === '3M' ? 90 : 365;
    const cutoff = Date.now() - cutoffDays * 24 * 60 * 60 * 1000;
    return data.series.filter((p) => new Date(p.occurred_at).getTime() >= cutoff).map((p) => p.kg);
  })();

  return (
    <div className="screen-content scroll">
      {/* Header */}
      <div
        style={{
          padding: '64px 14px 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="icon-button surface pressable"
          aria-label="Zurück zur Startseite"
        >
          <Icon name="chevron-left" size={18} />
        </button>
        <div
          style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 15, color: 'var(--ink)' }}
        >
          Körper
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Tabs */}
      <div className="pad-x" style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
        <div
          className="segmented"
          style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' }}
        >
          {(
            [
              { id: 'overview', label: 'Übersicht' },
              { id: 'history', label: 'Verlauf' },
              { id: 'composition', label: 'Körpermodell' },
            ] as { id: TabId; label: string }[]
          ).map((t) => (
            <button
              type="button"
              key={t.id}
              className={`seg ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <>
          {/* Weight chart */}
          <div className="pad-x" style={{ marginTop: 18 }}>
            <div className="card rise">
              <div className="row-between" style={{ marginBottom: 4 }}>
                <div>
                  <div className="h-card" style={{ fontSize: 18 }}>
                    Gewichtsentwicklung
                  </div>
                  <div style={{ color: 'var(--ink-4)', fontSize: 12, marginTop: 4 }}>
                    {range === '1M'
                      ? 'Die letzten 4 Wochen'
                      : range === '3M'
                        ? 'Die letzten 3 Monate'
                        : 'Die letzten 12 Monate'}
                  </div>
                </div>
                <RangePicker value={range} onChange={setRange} />
              </div>
              <div style={{ marginTop: 12, marginLeft: -8, marginRight: -8 }}>
                {chartData.length > 1 ? (
                  <LineChart
                    data={chartData}
                    height={170}
                    color="var(--sage)"
                    dots={false}
                    padX={18}
                    padY={22}
                    title="Gewichtsentwicklung"
                  />
                ) : (
                  <div
                    style={{
                      height: 170,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--ink-4)',
                      fontSize: 13,
                      padding: 14,
                      textAlign: 'center',
                    }}
                  >
                    Noch nicht genug Daten für diesen Zeitraum.
                  </div>
                )}
              </div>

              {/* Live trend stats */}
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 14,
                  borderTop: '0.5px solid var(--hairline)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                }}
              >
                <Stat label="7d-Ø" value={data.trend7d} unit="kg" />
                <Stat label="14d-Ø" value={data.trend14d} unit="kg" />
                <Stat label="Δ 7d" value={data.trend7dChangeKg} unit="kg" signed />
              </div>
            </div>
          </div>

          {/* Reasoning card */}
          <div className="pad-x" style={{ marginTop: 12 }}>
            {/* TODO: live data — currently placeholder */}
            <div
              className="card rise"
              style={{ background: 'var(--surface-2)', animationDelay: '60ms' }}
            >
              <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'rgba(196,152,85,0.18)',
                    color: 'var(--amber)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="sparkle" size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: 'var(--ink-2)',
                      fontSize: 16,
                      lineHeight: 1.4,
                      fontFamily: 'var(--serif)',
                    }}
                  >
                    Dein Gewicht schwankt aktuell wahrscheinlich stärker durch Wasser als durch
                    Fettveränderung.
                  </div>
                  <div
                    className="row gap-2"
                    style={{ marginTop: 12, color: 'var(--ink-2)', fontSize: 13, fontWeight: 500 }}
                  >
                    Mehr erfahren <Icon name="arrow-right" size={14} strokeWidth={2} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Composition — placeholder */}
          <div className="pad-x" style={{ marginTop: 12 }}>
            {/* TODO: live data — currently placeholder */}
            <div className="card rise" style={{ animationDelay: '120ms' }}>
              <div className="row-between" style={{ marginBottom: 2 }}>
                <div className="h-card" style={{ fontSize: 18 }}>
                  Körperzusammensetzung
                </div>
              </div>
              <div style={{ color: 'var(--ink-4)', fontSize: 12, marginTop: 4, marginBottom: 8 }}>
                Letzte Messung: 12. Apr.
              </div>
              <CompositionRow
                icon={<Icon name="body-fat" size={16} />}
                label="Körperfett"
                value="15,2"
                unit="%"
                pct={56}
                color="var(--sage)"
              />
              <CompositionRow
                icon={<Icon name="muscle" size={16} />}
                label="Muskeln"
                value="41,0"
                unit="kg"
                pct={78}
                color="var(--sage)"
              />
              <CompositionRow
                icon={<Icon name="water" size={16} />}
                label="Wasser"
                value="55,0"
                unit="%"
                pct={66}
                color="var(--sage-soft)"
              />
            </div>
          </div>

          {/* Photos placeholder */}
          <div className="pad-x" style={{ marginTop: 12, marginBottom: 32 }}>
            {/* TODO: live data — currently placeholder */}
            <div className="card pressable rise" style={{ animationDelay: '180ms' }}>
              <div className="row-between">
                <div>
                  <div className="h-card" style={{ fontSize: 17 }}>
                    Fotos &amp; Verlauf
                  </div>
                  <div style={{ color: 'var(--ink-4)', fontSize: 12, marginTop: 4 }}>
                    Letztes Foto vor 4 Tagen
                  </div>
                </div>
                <Icon name="chevron-right" size={18} />
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'history' && (
        <div className="pad-x" style={{ marginTop: 18, marginBottom: 32 }}>
          <SectionLabel n="01" label={`Verlauf · ${data.series.length} Einträge`} />
          <div className="card rise" style={{ marginTop: 10, padding: 0, overflow: 'hidden' }}>
            {data.series.length === 0 && (
              <div
                style={{
                  padding: 22,
                  textAlign: 'center',
                  color: 'var(--ink-3)',
                  fontSize: 14,
                }}
              >
                Noch keine Einträge.
              </div>
            )}
            {[...data.series].reverse().map((p, i, arr) => (
              <HistoryRow key={p.event_id} point={p} isLast={i === arr.length - 1} />
            ))}
          </div>
        </div>
      )}

      {tab === 'composition' && (
        <div className="pad-x" style={{ marginTop: 22 }}>
          {/* TODO: live data — currently placeholder */}
          <div className="card rise" style={{ textAlign: 'center', padding: 28 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--surface-2)',
                color: 'var(--ink-3)',
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="pulse" size={20} />
            </div>
            <div className="h-card" style={{ fontSize: 18 }}>
              Dein Körpermodell
            </div>
            <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 8, lineHeight: 1.45 }}>
              Geschätzte TDEE, FFM, P-Ratio – inkl. Konfidenzintervall. Die App lernt diese Werte
              über Zeit.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  signed = false,
}: {
  label: string;
  value: number | null;
  unit: string;
  signed?: boolean;
}) {
  let display = '—';
  if (value !== null && value !== undefined) {
    if (signed) {
      const sign = value > 0 ? '+' : '';
      display = `${sign}${value.toFixed(2).replace('.', ',')}`;
    } else {
      display = value.toFixed(2).replace('.', ',');
    }
  }
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '10px 12px' }}>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          letterSpacing: '0.06em',
        }}
      >
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 17,
          color: 'var(--ink)',
          marginTop: 2,
        }}
      >
        {display}{' '}
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
          {unit}
        </span>
      </div>
    </div>
  );
}

function HistoryRow({ point, isLast }: { point: WeightPoint; isLast: boolean }) {
  const [editing, setEditing] = useState(false);
  const [kg, setKg] = useState(point.kg.toString().replace('.', ','));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const date = new Date(point.occurred_at);
  const dateStr = date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  function doCorrect(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await correctWeightAction(formData);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Fehler');
      }
    });
  }

  function doRetract(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await retractWeightAction(formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Fehler');
      }
    });
  }

  return (
    <div
      style={{
        padding: '14px 18px',
        borderBottom: isLast ? 'none' : '0.5px solid var(--hairline)',
      }}
    >
      <div className="row-between">
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
            }}
          >
            <span style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)' }}>
              {point.kg.toFixed(1).replace('.', ',')}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
              kg
            </span>
            {point.corrected && (
              <span className="pill pill-amber" style={{ fontSize: 10, padding: '2px 8px' }}>
                korrigiert
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--ink-4)',
              marginTop: 2,
            }}
          >
            {dateStr} · {timeStr}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="icon-button pressable"
            aria-label="Korrigieren"
            title="Korrigieren"
            style={{ background: 'var(--surface-2)', width: 32, height: 32 }}
          >
            <Icon name="edit" size={14} />
          </button>
          <form action={doRetract}>
            <input type="hidden" name="event_id" value={point.event_id} />
            <button
              type="submit"
              className="icon-button pressable"
              aria-label="Zurückziehen"
              title="Zurückziehen"
              disabled={isPending}
              style={{ background: 'var(--surface-2)', width: 32, height: 32 }}
            >
              <Icon name="x" size={14} />
            </button>
          </form>
        </div>
      </div>
      {editing && (
        <form
          action={doCorrect}
          style={{
            marginTop: 10,
            display: 'flex',
            gap: 6,
            alignItems: 'center',
          }}
        >
          <input type="hidden" name="event_id" value={point.event_id} />
          <input
            type="text"
            inputMode="decimal"
            name="kg"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            required
            style={{
              flex: 1,
              background: 'var(--surface-2)',
              border: '0.5px solid var(--hairline-strong)',
              borderRadius: 10,
              padding: '8px 12px',
              fontFamily: 'var(--mono)',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={isPending}
            style={{ padding: '8px 14px' }}
          >
            {isPending ? '…' : 'OK'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="btn-secondary"
            style={{ padding: '8px 12px' }}
          >
            Abbruch
          </button>
        </form>
      )}
      {error && <div style={{ color: 'var(--amber)', fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}

function RangePicker({ value, onChange }: { value: RangeId; onChange: (v: RangeId) => void }) {
  const [open, setOpen] = useState(false);
  const opts: { id: RangeId; label: string }[] = [
    { id: '1M', label: '4 Wochen' },
    { id: '3M', label: '3 Monate' },
    { id: '1Y', label: '12 Monate' },
  ];
  const current = opts.find((o) => o.id === value) ?? opts[1];
  if (!current) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="pressable"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          borderRadius: 12,
          background: 'var(--surface-2)',
          border: '0.5px solid var(--hairline)',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--ink-2)',
          cursor: 'pointer',
        }}
      >
        {current.label} <Icon name="chevron-down" size={14} strokeWidth={2} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '110%',
            right: 0,
            zIndex: 20,
            background: 'var(--surface)',
            borderRadius: 14,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: 6,
            border: '0.5px solid var(--hairline)',
            minWidth: 140,
          }}
        >
          {opts.map((o) => (
            <button
              type="button"
              key={o.id}
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
              className="pressable"
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                background: o.id === value ? 'var(--surface-2)' : 'transparent',
                color: o.id === value ? 'var(--ink)' : 'var(--ink-2)',
                border: 'none',
                fontFamily: 'inherit',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
