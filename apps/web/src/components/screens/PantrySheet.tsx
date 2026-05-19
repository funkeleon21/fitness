'use client';

import type { BarcodeLookupResult, PantrySimilarItem } from '@/app/api/lookup-barcode/route';
import type { PantryItemDto } from '@/app/api/pantry/route';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Icon } from '../Icon';
import { Sheet, SheetCloseButton } from '../Sheet';
import { ScanMergeDialog } from './ScanMergeDialog';

const BarcodeScannerOverlay = dynamic(
  () => import('./BarcodeScannerOverlay').then((m) => ({ default: m.BarcodeScannerOverlay })),
  { ssr: false },
);

interface PantrySheetProps {
  onClose: () => void;
}

type Tab = 'active' | 'archive';

// Hinweis-Banner nach einem Scan. Zeigt knapp, was passiert ist, ohne den
// Edit-Sheet zu blockieren — der öffnet sich parallel.
type ScanBanner =
  | { kind: 'exists'; label: string; brand: string | null }
  | { kind: 'created'; label: string; brand: string | null }
  | { kind: 'merged'; targetLabel: string };

type FormState = {
  label: string;
  brand: string;
  kcal_per_100g: string;
  protein_g_per_100g: string;
  carbs_g_per_100g: string;
  fat_g_per_100g: string;
  sugar_g_per_100g: string;
  fiber_g_per_100g: string;
  saturated_fat_g_per_100g: string;
  salt_g_per_100g: string;
  serving_size_g: string;
};

const EMPTY_FORM: FormState = {
  label: '',
  brand: '',
  kcal_per_100g: '',
  protein_g_per_100g: '',
  carbs_g_per_100g: '',
  fat_g_per_100g: '',
  sugar_g_per_100g: '',
  fiber_g_per_100g: '',
  saturated_fat_g_per_100g: '',
  salt_g_per_100g: '',
  serving_size_g: '',
};

function toFormState(item: PantryItemDto): FormState {
  const num = (v: number | null) => (v === null ? '' : String(v));
  return {
    label: item.label,
    brand: item.brand ?? '',
    kcal_per_100g: num(item.kcal_per_100g),
    protein_g_per_100g: num(item.protein_g_per_100g),
    carbs_g_per_100g: num(item.carbs_g_per_100g),
    fat_g_per_100g: num(item.fat_g_per_100g),
    sugar_g_per_100g: num(item.sugar_g_per_100g),
    fiber_g_per_100g: num(item.fiber_g_per_100g),
    saturated_fat_g_per_100g: num(item.saturated_fat_g_per_100g),
    salt_g_per_100g: num(item.salt_g_per_100g),
    serving_size_g: num(item.serving_size_g),
  };
}

function parseNumber(s: string): number | null {
  const trimmed = s.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function formStateToPayload(form: FormState) {
  return {
    label: form.label.trim(),
    brand: form.brand.trim() === '' ? null : form.brand.trim(),
    kcal_per_100g: parseNumber(form.kcal_per_100g),
    protein_g_per_100g: parseNumber(form.protein_g_per_100g),
    carbs_g_per_100g: parseNumber(form.carbs_g_per_100g),
    fat_g_per_100g: parseNumber(form.fat_g_per_100g),
    sugar_g_per_100g: parseNumber(form.sugar_g_per_100g),
    fiber_g_per_100g: parseNumber(form.fiber_g_per_100g),
    saturated_fat_g_per_100g: parseNumber(form.saturated_fat_g_per_100g),
    salt_g_per_100g: parseNumber(form.salt_g_per_100g),
    serving_size_g: parseNumber(form.serving_size_g),
  };
}

export function PantrySheet({ onClose }: PantrySheetProps) {
  const [tab, setTab] = useState<Tab>('active');
  const [items, setItems] = useState<PantryItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PantryItemDto | null>(null);
  const [creating, setCreating] = useState<{ prefillBarcode?: string } | null>(null);
  const [mergingFrom, setMergingFrom] = useState<PantryItemDto | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanBanner, setScanBanner] = useState<ScanBanner | null>(null);
  const [scanMergeContext, setScanMergeContext] = useState<{
    lookup: BarcodeLookupResult;
    candidates: PantrySimilarItem[];
  } | null>(null);
  const [notFoundPrompt, setNotFoundPrompt] = useState<string | null>(null);

  async function reload(t: Tab = tab): Promise<PantryItemDto[]> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pantry?archived=${t === 'archive'}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Konnte Vorrat nicht laden');
      const next = body.items as PantryItemDto[];
      setItems(next);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Konnte Vorrat nicht laden');
      return [];
    } finally {
      setLoading(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload depends on tab; calling on tab change is the intent
  useEffect(() => {
    reload(tab);
  }, [tab]);

  async function openEditByLookup(lookup: BarcodeLookupResult) {
    // Aktiven Tab erzwingen — Lookup reaktiviert ein archiviertes Item, also
    // muss es jetzt in der Aktiv-Liste sichtbar sein.
    setTab('active');
    const next = await reload('active');
    const found = lookup.pantry_item_id
      ? next.find((it) => it.id === lookup.pantry_item_id)
      : undefined;
    if (found) setEditing(found);
  }

  async function handleBarcodeScanned(barcode: string) {
    setScannerOpen(false);
    setScanError(null);
    setScanBanner(null);
    try {
      const res = await fetch(`/api/lookup-barcode?code=${encodeURIComponent(barcode)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Lookup fehlgeschlagen');
      const lookup = body.result as BarcodeLookupResult;

      if (!lookup.found) {
        setNotFoundPrompt(barcode);
        return;
      }

      // Schon bekannt? (Cache-Hit im Pantry oder OFF-Treffer auf bestehendes Item).
      if (lookup.source === 'pantry' || lookup.source === 'off-alias') {
        setScanBanner({
          kind: 'exists',
          label: lookup.label ?? barcode,
          brand: lookup.brand,
        });
        await openEditByLookup(lookup);
        return;
      }

      // Neu angelegt, aber ähnliche Items vorhanden → Merge-Rückfrage.
      if (lookup.source === 'off' && lookup.similar_pantry_items.length > 0) {
        setScanMergeContext({ lookup, candidates: lookup.similar_pantry_items });
        return;
      }

      // Neu angelegt, ohne Duplikat-Verdacht.
      setScanBanner({
        kind: 'created',
        label: lookup.label ?? barcode,
        brand: lookup.brand,
      });
      await openEditByLookup(lookup);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Lookup fehlgeschlagen.');
    }
  }

  async function confirmMergeWithCandidate(target: PantrySimilarItem) {
    const ctx = scanMergeContext;
    if (!ctx || !ctx.lookup.pantry_item_id) {
      setScanMergeContext(null);
      return;
    }
    try {
      const res = await fetch('/api/pantry/merge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source_id: ctx.lookup.pantry_item_id, target_id: target.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Merge fehlgeschlagen');
      setScanBanner({ kind: 'merged', targetLabel: target.label });
      setTab('active');
      const next = await reload('active');
      const found = next.find((it) => it.id === target.id);
      if (found) setEditing(found);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Merge fehlgeschlagen.');
    } finally {
      setScanMergeContext(null);
    }
  }

  async function declineMerge() {
    const ctx = scanMergeContext;
    setScanMergeContext(null);
    if (!ctx) return;
    setScanBanner({
      kind: 'created',
      label: ctx.lookup.label ?? ctx.lookup.barcode,
      brand: ctx.lookup.brand,
    });
    await openEditByLookup(ctx.lookup);
  }

  return (
    <Sheet
      onClose={onClose}
      style={{ maxHeight: '92vh' }}
      header={
        <div className="row-between" style={{ marginBottom: 8 }}>
          <div className="h-card" style={{ fontSize: 22 }}>
            Vorrat
          </div>
          <SheetCloseButton onClose={onClose} />
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setTab('active')}
            className={`filter-pill ${tab === 'active' ? 'active' : ''}`}
          >
            Aktiv
          </button>
          <button
            type="button"
            onClick={() => setTab('archive')}
            className={`filter-pill ${tab === 'archive' ? 'active' : ''}`}
          >
            Archiv
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => {
              setScanError(null);
              setScannerOpen(true);
            }}
            className="filter-pill"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            aria-label="Barcode scannen"
          >
            <Icon name="pattern" size={12} />
            SCANNEN
          </button>
          <button
            type="button"
            onClick={() => setCreating({})}
            className="filter-pill"
            style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.06em' }}
          >
            + NEU
          </button>
        </div>

        {scanBanner && <ScanBannerView banner={scanBanner} onDismiss={() => setScanBanner(null)} />}

        {scanError && (
          <div
            style={{
              color: 'var(--amber)',
              fontSize: 12,
              fontFamily: 'var(--mono)',
              letterSpacing: '0.04em',
            }}
          >
            {scanError}
          </div>
        )}

        {error && (
          <div
            style={{
              color: 'var(--amber)',
              fontSize: 12,
              fontFamily: 'var(--mono)',
              letterSpacing: '0.04em',
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '24px 0' }}>Lade…</div>
        ) : items.length === 0 ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '24px 0' }}>
            {tab === 'active'
              ? 'Noch keine Einträge. Scanne einen Barcode oder lege ein Item manuell an.'
              : 'Keine archivierten Einträge.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item) => (
              <PantryRow key={item.id} item={item} onOpen={() => setEditing(item)} />
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: 8,
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--ink-4)',
            letterSpacing: '0.06em',
            textAlign: 'center',
          }}
        >
          PERSONAL PANTRY · ÜBER 90 TAGE INAKTIVE WERDEN ARCHIVIERT
        </div>
      </div>

      {editing && (
        <EditSheet
          item={editing}
          allItems={items}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload(tab);
          }}
          onRequestMerge={(itm) => {
            setEditing(null);
            setMergingFrom(itm);
          }}
        />
      )}

      {creating && (
        <CreateSheet
          prefillBarcode={creating.prefillBarcode}
          onClose={() => setCreating(null)}
          onCreated={() => {
            setCreating(null);
            reload('active');
            setTab('active');
          }}
        />
      )}

      {mergingFrom && (
        <MergeSheet
          source={mergingFrom}
          allItems={items.filter((i) => i.id !== mergingFrom.id && !i.is_archived)}
          onClose={() => setMergingFrom(null)}
          onMerged={() => {
            setMergingFrom(null);
            reload(tab);
          }}
        />
      )}

      {scannerOpen && (
        <BarcodeScannerOverlay
          onScan={handleBarcodeScanned}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {scanMergeContext && (
        <ScanMergeDialog
          newLabel={scanMergeContext.lookup.label ?? scanMergeContext.lookup.barcode}
          newBrand={scanMergeContext.lookup.brand}
          candidates={scanMergeContext.candidates}
          onConfirm={confirmMergeWithCandidate}
          onDecline={declineMerge}
        />
      )}

      {notFoundPrompt && (
        <NotFoundPrompt
          barcode={notFoundPrompt}
          onCancel={() => setNotFoundPrompt(null)}
          onCreateManually={() => {
            const code = notFoundPrompt;
            setNotFoundPrompt(null);
            setCreating({ prefillBarcode: code });
          }}
        />
      )}
    </Sheet>
  );
}

function ScanBannerView({ banner, onDismiss }: { banner: ScanBanner; onDismiss: () => void }) {
  const message =
    banner.kind === 'exists'
      ? `Schon im Vorrat: „${banner.label}"${banner.brand ? ` (${banner.brand})` : ''}`
      : banner.kind === 'created'
        ? `Hinzugefügt: „${banner.label}"${banner.brand ? ` (${banner.brand})` : ''}`
        : `Zugeordnet zu „${banner.targetLabel}"`;
  return (
    <output
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '10px 12px',
        background: 'var(--sage-wash)',
        border: '0.5px solid rgba(110,122,78,0.22)',
        color: 'var(--sage-deep)',
        fontSize: 12,
        fontFamily: 'var(--mono)',
        letterSpacing: '0.04em',
      }}
    >
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Hinweis schließen"
        className="pressable"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--sage-deep)',
          cursor: 'pointer',
          padding: 2,
          display: 'inline-flex',
        }}
      >
        <Icon name="x" size={12} />
      </button>
    </output>
  );
}

function NotFoundPrompt({
  barcode,
  onCancel,
  onCreateManually,
}: {
  barcode: string;
  onCancel: () => void;
  onCreateManually: () => void;
}) {
  return (
    <Sheet
      onClose={onCancel}
      backdropStyle={{ zIndex: 100 }}
      header={
        <div className="row-between" style={{ marginBottom: 8 }}>
          <div className="h-card" style={{ fontSize: 18 }}>
            Barcode unbekannt
          </div>
          <SheetCloseButton onClose={onCancel} />
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
          Für <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)' }}>{barcode}</span> gibt
          es weder in deinem Vorrat noch bei Open Food Facts einen Treffer. Du kannst das Produkt
          manuell anlegen — der Code wird als Alias gespeichert, sodass der nächste Scan direkt aus
          dem Vorrat trifft.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onCreateManually}
            className="pressable btn-primary"
            style={{ flex: 1, padding: '12px' }}
          >
            Manuell anlegen
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="filter-pill"
            style={{ flex: 1, padding: '12px' }}
          >
            Abbrechen
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function PantryRow({ item, onOpen }: { item: PantryItemDto; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="card pressable"
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '12px 14px',
        background: 'var(--surface)',
        border: '0.5px solid var(--hairline)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div className="row-between">
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{item.label}</div>
          {item.brand && <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{item.brand}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          {item.kcal_per_100g !== null && (
            <div style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>
              {Math.round(item.kcal_per_100g)}{' '}
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>kcal/100g</span>
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        <span>{item.barcode_count} Codes</span>
        <span>{item.use_count}× genutzt</span>
        {item.last_used_at && (
          <span>{new Date(item.last_used_at).toLocaleDateString('de-DE')}</span>
        )}
      </div>
    </button>
  );
}

function EditSheet({
  item,
  onClose,
  onSaved,
  onRequestMerge,
}: {
  item: PantryItemDto;
  allItems: PantryItemDto[];
  onClose: () => void;
  onSaved: () => void;
  onRequestMerge: (item: PantryItemDto) => void;
}) {
  const [form, setForm] = useState<FormState>(toFormState(item));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pantry/${item.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(formStateToPayload(form)),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Konnte nicht speichern');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Konnte nicht speichern');
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pantry/${item.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ is_archived: !item.is_archived }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Konnte nicht ändern');
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Konnte nicht ändern');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !confirm(
        `„${item.label}" wirklich löschen? Alle ${item.barcode_count} Barcode-Aliase werden mitentfernt.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pantry/${item.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Konnte nicht löschen');
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Konnte nicht löschen');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      onClose={onClose}
      backdropStyle={{ zIndex: 100 }}
      header={
        <div className="row-between" style={{ marginBottom: 8 }}>
          <div className="h-card" style={{ fontSize: 20 }}>
            {item.label}
          </div>
          <SheetCloseButton onClose={onClose} />
        </div>
      }
    >
      <PantryForm form={form} setForm={setForm} />

      {error && (
        <div
          style={{
            color: 'var(--amber)',
            fontSize: 12,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.04em',
            marginTop: 8,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        <button
          type="button"
          onClick={save}
          disabled={busy || form.label.trim() === ''}
          className="pressable btn-primary"
          style={{ width: '100%', padding: '14px', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'Speichere…' : 'Speichern'}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={toggleArchive}
            disabled={busy}
            className="filter-pill"
            style={{ flex: 1, padding: '10px' }}
          >
            {item.is_archived ? 'Reaktivieren' : 'Archivieren'}
          </button>
          <button
            type="button"
            onClick={() => onRequestMerge(item)}
            disabled={busy}
            className="filter-pill"
            style={{ flex: 1, padding: '10px' }}
          >
            Zusammenführen
          </button>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="pressable"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-3)',
            fontSize: 12,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.06em',
            padding: '8px',
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          Löschen
        </button>
      </div>
    </Sheet>
  );
}

function CreateSheet({
  prefillBarcode,
  onClose,
  onCreated,
}: {
  prefillBarcode?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = formStateToPayload(form);
      if (prefillBarcode) payload.barcode = prefillBarcode;
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Konnte nicht anlegen');
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Konnte nicht anlegen');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      onClose={onClose}
      backdropStyle={{ zIndex: 100 }}
      header={
        <div className="row-between" style={{ marginBottom: 8 }}>
          <div className="h-card" style={{ fontSize: 20 }}>
            Neuer Vorrat-Eintrag
          </div>
          <SheetCloseButton onClose={onClose} />
        </div>
      }
    >
      {prefillBarcode && (
        <div
          style={{
            marginBottom: 12,
            padding: '8px 10px',
            background: 'var(--surface)',
            border: '0.5px solid var(--hairline)',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Icon name="pattern" size={12} />
          <span>BARCODE: {prefillBarcode}</span>
        </div>
      )}

      <PantryForm form={form} setForm={setForm} />

      {error && (
        <div
          style={{
            color: 'var(--amber)',
            fontSize: 12,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.04em',
            marginTop: 8,
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={busy || form.label.trim() === ''}
        className="pressable btn-primary"
        style={{ width: '100%', padding: '14px', marginTop: 14, opacity: busy ? 0.6 : 1 }}
      >
        {busy ? 'Speichere…' : 'Anlegen'}
      </button>
    </Sheet>
  );
}

function MergeSheet({
  source,
  allItems,
  onClose,
  onMerged,
}: {
  source: PantryItemDto;
  allItems: PantryItemDto[];
  onClose: () => void;
  onMerged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function merge(targetId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/pantry/merge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source_id: source.id, target_id: targetId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Merge fehlgeschlagen');
      onMerged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Merge fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      onClose={onClose}
      backdropStyle={{ zIndex: 100 }}
      header={
        <div className="row-between" style={{ marginBottom: 8 }}>
          <div className="h-card" style={{ fontSize: 18 }}>
            „{source.label}" zusammenführen mit …
          </div>
          <SheetCloseButton onClose={onClose} />
        </div>
      }
    >
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>
        Alle {source.barcode_count} Barcode-Aliase werden auf das Ziel übertragen, danach wird „
        {source.label}" gelöscht.
      </div>

      {error && (
        <div
          style={{
            color: 'var(--amber)',
            fontSize: 12,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.04em',
            marginBottom: 8,
          }}
        >
          {error}
        </div>
      )}

      {allItems.length === 0 ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
          Keine anderen aktiven Items zum Zusammenführen vorhanden.
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxHeight: '52vh',
            overflow: 'auto',
          }}
        >
          {allItems.map((cand) => (
            <button
              key={cand.id}
              type="button"
              onClick={() => merge(cand.id)}
              disabled={busy}
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
      )}
    </Sheet>
  );
}

function PantryForm({
  form,
  setForm,
}: {
  form: FormState;
  setForm: (next: FormState) => void;
}) {
  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm({ ...form, [key]: value });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <FormLabel label="Name">
        <input
          type="text"
          value={form.label}
          onChange={(e) => set('label', e.target.value)}
          maxLength={200}
          placeholder="z.B. Kölln Müsli Schoko"
          className="text-input"
          style={{ fontSize: 15 }}
        />
      </FormLabel>
      <FormLabel label="Marke">
        <input
          type="text"
          value={form.brand}
          onChange={(e) => set('brand', e.target.value)}
          maxLength={120}
          placeholder="z.B. Kölln"
          className="text-input"
          style={{ fontSize: 15 }}
        />
      </FormLabel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <NumberField
          label="kcal/100g"
          value={form.kcal_per_100g}
          onChange={(v) => set('kcal_per_100g', v)}
        />
        <NumberField
          label="Protein g"
          value={form.protein_g_per_100g}
          onChange={(v) => set('protein_g_per_100g', v)}
        />
        <NumberField
          label="Kohlenh. g"
          value={form.carbs_g_per_100g}
          onChange={(v) => set('carbs_g_per_100g', v)}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <NumberField
          label="Fett g"
          value={form.fat_g_per_100g}
          onChange={(v) => set('fat_g_per_100g', v)}
        />
        <NumberField
          label="Zucker g"
          value={form.sugar_g_per_100g}
          onChange={(v) => set('sugar_g_per_100g', v)}
        />
        <NumberField
          label="Ballast. g"
          value={form.fiber_g_per_100g}
          onChange={(v) => set('fiber_g_per_100g', v)}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <NumberField
          label="ges. Fett g"
          value={form.saturated_fat_g_per_100g}
          onChange={(v) => set('saturated_fat_g_per_100g', v)}
        />
        <NumberField
          label="Salz g"
          value={form.salt_g_per_100g}
          onChange={(v) => set('salt_g_per_100g', v)}
        />
        <NumberField
          label="Portion g"
          value={form.serving_size_g}
          onChange={(v) => set('serving_size_g', v)}
        />
      </div>
    </div>
  );
}

function FormLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-3)',
          letterSpacing: '0.06em',
        }}
      >
        {label.toUpperCase()}
      </span>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          letterSpacing: '0.04em',
        }}
      >
        {label.toUpperCase()}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="–"
        className="text-input"
        style={{ fontSize: 14, padding: '10px 12px' }}
      />
    </div>
  );
}
