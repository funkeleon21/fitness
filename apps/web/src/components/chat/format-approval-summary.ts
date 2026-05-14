export function formatApprovalSummary(toolName: string, input: unknown): string {
  if (typeof input !== 'object' || input === null) return `${toolName} ausführen?`;
  const obj = input as {
    kg?: unknown;
    occurred_at?: unknown;
    label?: unknown;
    kcal?: unknown;
    protein_g?: unknown;
    carbs_g?: unknown;
    fat_g?: unknown;
    sugar_g?: unknown;
    fiber_g?: unknown;
    saturated_fat_g?: unknown;
    salt_g?: unknown;
    template_id?: unknown;
  };
  const kg = typeof obj.kg === 'number' ? `${obj.kg.toFixed(1).replace('.', ',')} kg` : null;
  const when = formatApprovalTime(obj.occurred_at);

  if (toolName === 'log_weight' && kg) {
    return when ? `${kg} eintragen — ${when}` : `${kg} eintragen — jetzt`;
  }
  if (toolName === 'correct_weight' && kg) {
    return `Eintrag korrigieren auf ${kg}`;
  }
  if (toolName === 'retract_weight') {
    return 'Gewichts-Eintrag zurückziehen';
  }

  if (toolName === 'log_meal' && typeof obj.label === 'string') {
    const parts: string[] = [obj.label];
    if (typeof obj.kcal === 'number') parts.push(`${Math.round(obj.kcal)} kcal`);
    if (typeof obj.protein_g === 'number') parts.push(`${Math.round(obj.protein_g)} g P`);
    const head = parts.join(' · ');
    return when ? `${head} — ${when}` : `${head} — jetzt`;
  }
  if (toolName === 'log_meal_from_template') {
    return when ? `Vorlage eintragen — ${when}` : 'Vorlage eintragen — jetzt';
  }
  if (toolName === 'retract_meal') {
    return 'Mahlzeit-Eintrag zurückziehen';
  }

  if (toolName === 'set_nutrition_targets') {
    const parts: string[] = [];
    if (typeof obj.kcal === 'number') parts.push(`${obj.kcal.toLocaleString('de-DE')} kcal`);
    if (typeof obj.protein_g === 'number') parts.push(`${obj.protein_g} g Protein`);
    if (typeof obj.carbs_g === 'number') parts.push(`${obj.carbs_g} g Carbs`);
    if (typeof obj.fat_g === 'number') parts.push(`${obj.fat_g} g Fett`);
    if (typeof obj.sugar_g === 'number') parts.push(`max. ${obj.sugar_g} g Zucker`);
    if (typeof obj.fiber_g === 'number') parts.push(`${obj.fiber_g} g Ballaststoffe`);
    if (typeof obj.saturated_fat_g === 'number')
      parts.push(`max. ${obj.saturated_fat_g} g ges. Fett`);
    if (typeof obj.salt_g === 'number') parts.push(`max. ${obj.salt_g} g Salz`);
    if (parts.length === 0) return 'Tagesziele setzen';
    return `Tagesziele setzen — ${parts.join(', ')}`;
  }

  return `${toolName} ausführen?`;
}

function formatApprovalTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

export const TOOL_LABELS: Record<string, { running: string; done: string }> = {
  log_weight: { running: 'Gewicht speichern…', done: 'Gewicht gespeichert' },
  correct_weight: { running: 'Eintrag korrigieren…', done: 'Eintrag korrigiert' },
  retract_weight: { running: 'Eintrag zurückziehen…', done: 'Eintrag zurückgezogen' },
  log_meal: { running: 'Mahlzeit speichern…', done: 'Mahlzeit gespeichert' },
  log_meal_from_template: { running: 'Vorlage speichern…', done: 'Mahlzeit gespeichert' },
  retract_meal: { running: 'Mahlzeit zurückziehen…', done: 'Mahlzeit zurückgezogen' },
  set_nutrition_targets: { running: 'Tagesziele speichern…', done: 'Tagesziele gespeichert' },
};

export const INTERNAL_READ_TOOL_LABELS: Record<string, string> = {
  list_recent_weight_entries: 'Letzte Gewichts-Einträge lesen…',
  list_recent_meal_entries: 'Letzte Mahlzeiten lesen…',
  list_meal_templates: 'Mahlzeit-Vorlagen lesen…',
  get_nutrition_targets: 'Aktuelle Tagesziele lesen…',
};

export function formatToolDetail(toolName: string, input: unknown): string {
  if (typeof input !== 'object' || input === null) return '';
  const obj = input as { kg?: unknown; kcal?: unknown; label?: unknown };

  if ((toolName === 'log_weight' || toolName === 'correct_weight') && typeof obj.kg === 'number') {
    return `${obj.kg.toFixed(1).replace('.', ',')} kg`;
  }
  if (toolName === 'log_meal' && typeof obj.label === 'string') {
    const kcal = typeof obj.kcal === 'number' ? ` · ${Math.round(obj.kcal)} kcal` : '';
    return `${obj.label}${kcal}`;
  }
  if (toolName === 'set_nutrition_targets' && typeof obj.kcal === 'number') {
    return `${obj.kcal.toLocaleString('de-DE')} kcal`;
  }
  return '';
}
