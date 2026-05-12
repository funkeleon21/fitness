# Roadmap

Diese Roadmap ist **kein Zeitplan** — sondern eine Reihenfolge, die der Architektur und den Prinzipien folgt. Phasen werden abgeschlossen, wenn sie sich gut anfühlen, nicht nach Wochenplan.

Das Grundprinzip: **Vertikale Durchstiche durch alle Schichten** mit jeweils einer neuen Domäne, statt alle Schichten gleichzeitig in die Breite zu treiben. Jeder Durchstich validiert die Architektur an einem realen Anwendungsfall.

---

## Phase 0 — Fundament

**Ziel:** Solide, ehrliche Grundlage.

- [x] Vision, Prinzipien, Architektur-Docs
- [x] Monorepo-Setup (pnpm workspaces, TS Project References)
- [x] Ordnerstruktur
- [x] CLAUDE.md (knapp, mit Verweisen auf docs/)
- [x] Supabase-Projekt angelegt (`cjwgisdobzztljizrnfn`, eu-west-1), Connection-Strings + publishable Key gesichert
- [ ] Vercel-Projekt mit Repo verknüpfen, Preview-Deployments aktiv
- [x] Drizzle eingerichtet (Schema + Migrations gegen Supabase Postgres)
- [x] RLS-Default-Policy konfiguriert (eigene-Zeilen-Only auf `events`)
- [x] Erste ADRs schriftlich (0001–0009)

**Abschlusskriterium:** Repo lässt sich klonen, `pnpm install`, `pnpm typecheck`, `pnpm test` und `pnpm build` laufen durch. Migration auf Supabase angewendet. Vercel-Preview steht noch aus.

---

## Phase 1 — Erster vertikaler Durchstich: Gewicht

**Ziel:** Eine einzige Domäne komplett durch alle Schichten. Beweist die Architektur.

- [x] Event-Envelope-Schema in `packages/core` (TypeScript-Typen + Zod-Validierung)
- [x] Postgres-Schema (`events`-Tabelle) in `packages/db`, mit Drizzle
- [x] Ingestion: `weight_logged` aus Zahleneingabe (NL kommt in Phase 2)
- [x] Projection: aktueller Stand + Zeitreihe + 7d/14d Bewegungsdurchschnitt
- [x] Minimal-UI: Eingabe + Chart (Trend default; Sparkline mit 7d-SMA-Overlay)
- [x] Korrektur-Flow (`event_corrected`, `event_retracted`)

**Offen für echte Abnahme:** Erstes Gewicht über die UI eintragen, Trend prüfen, einen Eintrag korrigieren und einen zurückziehen — verifiziert end-to-end mit RLS.

**Abschlusskriterium:** Ich kann täglich mein Gewicht eintragen, sehe den Trend, kann korrigieren — und der Event-Log zeigt eine ehrliche Geschichte.

---

## Phase 2 — Natural Language Ingestion

**Ziel:** Die KI als Übersetzungsschicht etablieren.

- [ ] LLM-Integration mit strukturierten Outputs
- [ ] Sprache/Freitext → `weight_logged` (z.B. „heute morgen 84,3")
- [ ] Konfidenz-Handling im UI (niedrige Konfidenz = Nachfrage)
- [ ] `raw_input` immer mit gespeichert (Provenance)

**Abschlusskriterium:** Ich kann per Sprachnotiz mein Gewicht eintragen und das Event speichert sowohl die strukturierte Information als auch den Originaltext.

---

## Phase 3 — Domäne Training

**Ziel:** Zweiter vertikaler Durchstich. Komplexerer Event-Typ, validiert Erweiterbarkeit.

- [ ] Event-Typ `training_logged` (Übungen, Sätze, Gewicht, Reps)
- [ ] NL-Extraktion („Heute: Bankdrücken 85kg x5, Schrägbank 32kg x8")
- [ ] Projektion: Volumen pro Muskelgruppe, PRs, Progression pro Übung
- [ ] Chart-UI

**Abschlusskriterium:** Ich kann ein Training in einem Satz eingeben, das System extrahiert es und ich sehe Progressions-Charts.

---

## Phase 4 — Domäne Ernährung (Text-First)

**Ziel:** Bewusst ohne Foto-AI starten — erst die Datenstruktur, dann die Eingabemodalitäten.

- [ ] Event-Typ `meal_logged` (Items mit Menge, Makros, Quelle der Schätzung)
- [ ] Lebensmittel-Stammdaten (eigene Tabelle, nicht im Event)
- [ ] Eingabe per Freitext, KI sucht Lebensmittel + extrahiert Mengen
- [ ] Tagesaggregation: Kalorien, Makros
- [ ] Verbindung zu Körper-Trends sichtbar machen

**Abschlusskriterium:** Tägliche Mahlzeiten landen strukturiert, Tagessummen sind sichtbar.

---

## Phase 5 — Personal Food Memory

**Ziel:** Das Alleinstellungsmerkmal der Ernährungs-Domäne.

- [ ] Gerichte als wiederverwendbare Entitäten speichern (User-spezifisch)
- [ ] Erkennung: „mein Standard-Frühstück"
- [ ] Validierungs-Flow für neue Gerichte
- [ ] Vorschlags-System auf Basis Tagesverlauf

**Abschlusskriterium:** Wiederkehrende Mahlzeiten werden in <5 Sekunden erfasst.

---

## Phase 6 — Erste KI-Interpretation

**Ziel:** Der eigentliche Produktkern. Bis hier war alles Tracking — jetzt beginnt Interpretation.

- [ ] `ai_interpretation`-Event-Typ
- [ ] Erste Analyse-Module:
  - Gewichts-Stagnation erkennen
  - Kalorien/Trend-Diskrepanz
  - Volumen-Plateaus im Training
- [ ] Begründungsketten im UI sichtbar (zugrundeliegende Events anklickbar)
- [ ] Feedback-Loop (hilfreich/nicht hilfreich) als Event

**Abschlusskriterium:** Das System erzählt mir mindestens eine Sache pro Woche, die ich selbst nicht in den Daten gesehen hätte — und ich kann der Begründung folgen.

---

## Phase 7 — Adaptive Rückfragen

**Ziel:** Das System fragt nur, wenn es etwas gewinnt.

- [ ] Trigger-Engine für kontextbezogene Fragen
- [ ] Antworten als `subjective_feedback`-Events
- [ ] Sichtbare Verknüpfung in späteren Interpretationen

---

## Phase 8 — Körpermessungen + Bilder

- [ ] Maße, Körperfett-Schätzungen
- [ ] Foto-Upload mit Datum/Lichtverhältnissen
- [ ] Trends, optionale Vergleichs-UI

---

## Spätere Phasen (nicht jetzt planen)

- Foto-basierte Mahlzeitenerkennung
- Apple Health / Wearable-Integrationen
- Schlaf-Tracking-Integration
- React Native App
- Erweiterte Domänen: Koffein, Supplements, Stress, Fokus, Hautbild
- Geteilte Daten (Trainer/Arzt-Sicht)

---

## Was wir bewusst NICHT bauen (Anti-Roadmap)

- Tagesziel-Push-Notifications („Du hast nur 8.000 Schritte!")
- Streaks und tägliche Belohnungs-Mechaniken
- „Heute fühle ich mich..."-Mood-Slider als Pflichtfeld
- Community-Features, Sharing, Social
- Generische Trainingspläne ohne Personalisierung
- Premium-Pricing-Logik
