// Gemeinsame Draft-Strukturen + Helper für WorkoutLogSheet und
// WorkoutTemplateSheet. UI-State hält Eingaben als Strings, damit leere Felder
// und Komma-Eingaben sauber von "0" unterschieden werden können.

export interface DraftSet {
  id: string;
  reps: string;
  weight_kg: string;
}

export interface DraftExercise {
  id: string;
  name: string;
  sets: DraftSet[];
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function emptySet(): DraftSet {
  return { id: newId(), reps: '', weight_kg: '' };
}

export function emptyExercise(): DraftExercise {
  return { id: newId(), name: '', sets: [emptySet()] };
}

// Wandelt einen Draft-Satz in das Schema-Format. Leere Strings → undefined,
// damit die optionalen Schema-Felder nicht mit NaN belegt werden.
export function setToPayload(s: DraftSet): { reps?: number; weight_kg?: number } {
  const out: { reps?: number; weight_kg?: number } = {};
  const reps = s.reps.trim();
  if (reps !== '') {
    const n = Number.parseInt(reps, 10);
    if (Number.isFinite(n) && n >= 0) out.reps = n;
  }
  const weight = s.weight_kg.replace(',', '.').trim();
  if (weight !== '') {
    const n = Number.parseFloat(weight);
    if (Number.isFinite(n) && n >= 0) out.weight_kg = Math.round(n * 10) / 10;
  }
  return out;
}
