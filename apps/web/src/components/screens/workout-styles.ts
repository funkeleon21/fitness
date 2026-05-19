// Geteilte Inline-Styles für WorkoutLogSheet und WorkoutTemplateSheet. Beide
// Sheets rendern dieselben Input/Icon/Add-Button-Affordances; Duplikat
// wurde nicht zentral gepflegt und ist deshalb hierhin gezogen.
import type { CSSProperties } from 'react';

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '0.5px solid var(--hairline-strong)',
  background: 'var(--surface)',
  fontFamily: 'var(--sans)',
  fontSize: 14,
  color: 'var(--ink)',
  outline: 'none',
};

export const iconButtonStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background: 'transparent',
  border: '0.5px solid var(--hairline)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
};

export const addButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 10px',
  borderRadius: 999,
  background: 'var(--sage-wash)',
  color: 'var(--sage-deep)',
  border: 'none',
  fontFamily: 'var(--sans)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};
