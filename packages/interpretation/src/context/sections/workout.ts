import type { WorkoutMood } from '@fitness/core';
import { getWorkoutProjection, listWorkoutTemplates } from '@fitness/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserContextSection } from '../types';

function formatDate(d: Date): string {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function moodLabel(mood: WorkoutMood): string {
  switch (mood) {
    case 'happy':
      return 'gut';
    case 'neutral':
      return 'okay';
    case 'sad':
      return 'schlecht';
  }
}

function summarizeExercises(
  exercises: Array<{ name: string; sets: Array<unknown> }> | null,
): string {
  if (!exercises || exercises.length === 0) return '';
  // Kompakt: „Bankdrücken (3 S.), Schulterdrücken (3 S.)". Bei >3 Übungen
  // gekürzt mit „+ N weitere", damit der System-Prompt nicht explodiert.
  const parts = exercises.slice(0, 3).map((ex) => `${ex.name} (${ex.sets.length} S.)`);
  if (exercises.length > 3) parts.push(`+ ${exercises.length - 3} weitere`);
  return parts.join(', ');
}

export async function getWorkoutContext(
  client: SupabaseClient,
  userId: string,
): Promise<UserContextSection> {
  const [projection, templates] = await Promise.all([
    getWorkoutProjection(client, userId),
    listWorkoutTemplates(client, userId),
  ]);

  if (projection.recent.length === 0 && templates.length === 0) {
    return {
      domain: 'training.workouts',
      label: 'Training',
      available: false,
      summary: 'Noch keine Trainings-Einträge.',
    };
  }

  const lines: string[] = [];

  // 7-Tage-Fenster — wichtigster Status-Block, weil Trainings selten genug sind,
  // dass ein Tages-Aggregat oft leer wäre.
  const t = projection.thisWeekTotals;
  if (t.count > 0) {
    const tail: string[] = [`${t.totalSets} ${t.totalSets === 1 ? 'Satz' : 'Sätze'}`];
    if (t.totalDurationMin > 0) tail.push(`${t.totalDurationMin} min`);
    lines.push(
      `- Diese Woche (letzte 7 Tage): ${t.count} ${t.count === 1 ? 'Einheit' : 'Einheiten'} · ${tail.join(' · ')}`,
    );
  } else {
    lines.push('- Diese Woche: noch keine Einheit erfasst.');
  }

  // Letzte Einheiten (max 4) — gibt dem Chat Kontext für „gestern", „letzte
  // Push-Day". Stimmung und Notiz werden mitgeführt, weil sie die KI-Aussage
  // („deine letzten Push-Days fühlten sich schwerer an") überhaupt erst möglich
  // machen — ohne sie wäre die Domäne für den Chat halbblind.
  if (projection.recent.length > 0) {
    lines.push('- Letzte Einheiten:');
    for (const w of projection.recent.slice(0, 4)) {
      const exSummary = summarizeExercises(w.exercises);
      const duration = w.duration_min ? `, ${w.duration_min} min` : '';
      const exSuffix = exSummary ? ` — ${exSummary}` : '';
      const moodSuffix = w.mood ? ` · Stimmung: ${moodLabel(w.mood)}` : '';
      const noteSuffix = w.note ? ` · Notiz: „${w.note}"` : '';
      lines.push(
        `  - ${formatDate(w.occurred_at)} ${formatTime(w.occurred_at)} ${w.label}${duration}${exSuffix}${moodSuffix}${noteSuffix}`,
      );
    }
  }

  // Workout-Memory / Templates — gibt dem Chat das Vokabular für „mein Push-Day".
  if (templates.length > 0) {
    const top = templates
      .slice(0, 6)
      .map((tpl) => `„${tpl.label}"`)
      .join(', ');
    lines.push(`- Bekannte Workout-Vorlagen (${templates.length}): ${top}`);
  }

  lines.push(`- Datenbasis: ${projection.recent.length} erfasste Trainings-Einträge (letzte 20).`);
  lines.push(
    '- Hinweis: Aussagen über typische Wochenvolumen erst ab mehreren Wochen Daten zurückhaltend formulieren.',
  );

  return {
    domain: 'training.workouts',
    label: 'Training',
    available: true,
    summary: lines.join('\n'),
  };
}
