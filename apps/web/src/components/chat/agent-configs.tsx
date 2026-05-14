import type { AgentConfig } from './types';

export const LABOR_AGENT: AgentConfig = {
  apiPath: '/api/chat',
  agentLabel: 'Labor',
  bubbleSpeakerLabel: 'Labor',
  emptyStateChip: 'LABOR · DEIN PERSÖNLICHER ASSISTENT',
  greetingHeadline: (userName) => `Hallo ${userName}.`,
  greetingSubtitle: (
    <>
      Frag mich nach{' '}
      <em style={{ fontFamily: 'var(--serif)', fontStyle: 'italic' }}>Interpretation</em>, nicht
      nach Tagessummen.
    </>
  ),
  suggestions: [
    {
      label: 'Wie deutest du meinen Gewichtstrend?',
      prompt:
        'Schau dir meine Gewichtsdaten an. Was siehst du im 7- und 14-Tage-Schnitt — eher Trend oder eher Rauschen?',
    },
    {
      label: 'Was ist Signal, was ist Rauschen?',
      prompt:
        'Wie unterscheide ich bei meinem Gewicht echte Veränderung von normalen Tages- und Wochenschwankungen?',
    },
    {
      label: 'Was sollte ich heute beobachten?',
      prompt:
        'Was wäre — auf Basis dessen, was du über mich weißt — heute besonders wert zu beobachten?',
    },
  ],
  placeholder: 'Frag dein Labor…',
  modelHint: 'Sonnet 4.6 · liest und schreibt Gewicht und Mahlzeiten',
  emptyStateTip: (
    <>
      Tipp: Du kannst dein Gewicht auch direkt im Chat eintragen — z.B.{' '}
      <em style={{ fontFamily: 'var(--serif)', fontStyle: 'italic' }}>„heute morgen 84,1"</em>.
    </>
  ),
};

export const COACH_AGENT: AgentConfig = {
  apiPath: '/api/nutrition-coach',
  agentLabel: 'Coach',
  bubbleSpeakerLabel: 'Coach',
  emptyStateChip: 'COACH · DEIN ERNÄHRUNGS-COACH',
  greetingHeadline: (userName) => `Hi ${userName}.`,
  greetingSubtitle: (
    <>
      Lass uns deine <em style={{ fontFamily: 'var(--serif)', fontStyle: 'italic' }}>Tagesziele</em>{' '}
      berechnen — basierend auf deinem Gewicht und deinem Aktivitätsniveau.
    </>
  ),
  suggestions: [
    {
      label: 'Berechne meine Tagesziele',
      prompt:
        'Bitte berechne meine persönlichen Tagesziele (kcal, Protein, Carbs, Fett, Limits). Frag mich nach den Daten, die du brauchst.',
    },
    {
      label: 'Erkläre Mifflin-St Jeor',
      prompt:
        'Erkläre mir kurz die Mifflin-St-Jeor-Formel und welche Aktivitätsfaktoren du verwendest.',
    },
    {
      label: 'Ich will abnehmen',
      prompt:
        'Ich will langsam abnehmen. Berechne meine Tagesziele mit moderatem Defizit. Frag nach den Daten, die du brauchst.',
    },
  ],
  placeholder: 'Sag dem Coach was du brauchst…',
  modelHint: 'Sonnet 4.6 · rechnet BMR/TDEE, setzt Tagesziele',
  emptyStateTip: (
    <>
      Tipp: Der Coach fragt nach Größe, Alter, Geschlecht und Aktivität. Diese Daten werden nicht
      gespeichert — sie dienen nur der einmaligen Berechnung.
    </>
  ),
};
