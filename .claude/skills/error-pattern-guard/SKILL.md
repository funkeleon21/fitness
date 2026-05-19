---
name: error-pattern-guard
description: Use ONLY when there is a concrete recurrence signal — NOT for ordinary one-off bug fixes. Trigger if at least one applies: (1) user uses recurrence language ("schon wieder", "das hatten wir doch", "warum immer X", "nicht zum ersten Mal") — plain "da ist ein Bug" / "repariere X" is NOT a recurrence signal; (2) `git log --grep` or `docs/lessons-learned.md` already shows a very similar fix; (3) the failure class is structurally VibeCoding-typical (merge conflict between parallel branches touching the same file, Drizzle migration name/number drift, doc-drift between parallel PRs, two agents implementing the same thing, missing RLS policy on a new table, CI workflow race). If none match: just fix and move on — overtriggering creates ceremony for nothing. When triggered: propose 2–3 safeguards with pros/cons and a recommendation, user decides, log lesson to `docs/lessons-learned.md`, implement on a dedicated branch.
---

# Error-Pattern-Guard

Einzelne Fehler sind unvermeidlich. Wiederkehrende Fehler sind ein Prozess-Bug. Dieser Skill übersetzt **wiederkehrende** Schmerzen in strukturelle Vorbeugung — mit Empfehlung, Entscheidung beim Nutzer.

Kontext: **VibeCoding-Setup** (ein Mensch, mehrere Claude-Agents in parallelen Worktrees). Fehler-Klassen wie Parallel-Kollisionen, Schema-Drift, Konventions-Drift und übersehene Disziplinen treten hier strukturell öfter auf als im 1-Dev-1-Agent-Setup — der Skill zielt genau auf diese.

## Wann anwenden

**Default: NICHT anwenden.** Die meisten Bugs sind Einzelfälle.

**Anwenden, wenn mindestens eines klar erfüllt ist:**

1. **Nutzer-Sprache:** „schon wieder", „das hatten wir doch", „warum macht das immer", „nicht zum ersten Mal", „das passiert ständig".
2. **Repo-Beleg:** ähnlicher Fix in `git log --grep=<keyword> -30` oder in `docs/lessons-learned.md`.
3. **VibeCoding-strukturell:** Klasse, bei der Wiederholung mit ≥2 parallelen Agents quasi sicher ist — Merge-Konflikt am selben File, Drizzle-Migration-Drift, Doc-Drift in parallelen PRs, Duplicate-Work, neue Tabelle ohne RLS-Policy, CI-Race mit `auto-update-prs`, parallele Edits am gleichen Hook/Skill/Konfig.

**NICHT anwenden bei** „da ist ein Bug, fix das" ohne Recurrence-Sprache, Tippfehlern, Logik-Bugs in erstmaligem Code, externen Ausfällen, Style-Diffs (Biome regelt), explorativem Refactor, einzelnen Stil-Korrekturen am Agent-Output. **Im Zweifel: nicht anwenden** — beim nächsten Vorfall greift Signal 2 sauber.

## Ablauf

### 1. Stärke und Root Cause einordnen

- **Was war der Fehler? Root Cause?** Ein bis zwei Sätze, nicht Symptom.
- **Recurrence-Stärke:**
  - **stark** — ≥2 frühere Vorkommen im Repo **oder** strukturell garantiert bei parallelen Agents → strukturelle Maßnahme (Hook, CI-Check, neuer Skill, Test).
  - **mittel** — 1 früheres Vorkommen oder plausibler Wiederholungsweg → mittlere Maßnahme (Skill-Update, Lint-Regel, CLAUDE.md-Disziplin).
  - **schwach** — nur Nutzer-Aussage, kein Repo-Beleg, kein struktureller Pfad → wahrscheinlich reicht ein lessons-learned-Eintrag. Auch „kein Pattern, Skill bricht hier ab" ist ein valides Ergebnis — kurz beim Nutzer rückfragen.

### 2. Safeguard-Optionen erarbeiten

Werkzeugkasten:

| Werkzeug | Wann sinnvoll | Aufwand |
|---|---|---|
| **CLAUDE.md-Disziplin / ADR** | Verhaltensregel mit Begründung, statisch nicht prüfbar | niedrig |
| **Eintrag in bestehenden Skill** | Themenfeld ist bereits abgedeckt, nur ein Schritt fehlt | niedrig |
| **Neuer Skill** | Komplexer Workflow, triggert bei bestimmten Aufgaben | hoch |
| **PreToolUse-Hook** | vor Tool-Aufruf blockieren/warnen | mittel |
| **Biome-Regel / Test / Schema-Constraint** | Pattern statisch oder zur Test-Zeit prüfbar | mittel |
| **CI-Workflow** | Vor-Merge-Check | mittel |

**Heuristik:** statisch im Code prüfbar → Lint/Test. Nur zur Tool-Zeit erkennbar → Hook/CI. Urteilsvermögen nötig → Skill oder Disziplin. **VibeCoding-spezifisch** (passiert nur bei parallelen Agents) → CI/Hook bevorzugen, damit der andere Agent es nicht übersieht.

Pro Option: 1–2 Sätze was es tut, was es nicht abfängt, Aufwand, Alltags-Reibung.

Dann **Empfehlung mit Begründung**, warum diese Option **in unserem Setup** der beste Tradeoff ist. Kurz benennen, warum die anderen weniger passen — keine generische „am sichersten"-Begründung.

### 3. Entscheidung beim Nutzer einholen

**Nichts implementieren, bis der Nutzer einen Weg gewählt hat.** Auch „nur dokumentieren, keine Tooling-Maßnahme" ist eine valide Entscheidung, wenn die Reibung größer wäre als der Pattern-Schaden.

### 4. Umsetzung

1. **Branch** `chore/postmortem-<kurzname>` oder `docs/lesson-<kurzname>` — nie auf `main`.
2. **`docs/lessons-learned.md`-Eintrag** im bestehenden Format (Datum + Titel, Situation, Symptom, Lösung, Vorbeugung mit Verweis auf die Datei der Schutzmaßnahme). Reverse-chronologisch, neuester oben.
3. **Schutzmaßnahme implementieren.** Bei neuem Skill: `skill-creator` nutzen. Bei Hook: `update-config` nutzen. Bei CLAUDE.md: keine Doppel-Disziplin in der nummerierten Liste anlegen.
4. **Commit + PR.** `doc-keeper` und auto-merge laufen automatisch.

### 5. Verifizieren

- **Ausführbare Maßnahme** (Hook/Lint/Test/CI): einmal lokal gegen den Fehler-Zustand fahren, sehen dass sie greift. Ohne diesen Schritt ist die Maßnahme nur Hoffnung.
- **Doku-Maßnahme:** an einer Stelle ablegen, die Agents wirklich lesen — `CLAUDE.md` oder ein Skill, dessen Trigger passt. Ein Eintrag tief in einem nie referenzierten ADR fängt nichts.

Wenn beim Lauf etwas fehlte (Werkzeug nicht in der Tabelle, Klasse nicht abgedeckt) → diesen Skill im selben PR erweitern. Er lebt mit dem Projekt.

## Anti-Muster

- **Bei jedem normalen Bug triggern.** Häufigster Fehler-Modus: „Nutzer sagt 'da ist ein Bug'" reicht **nicht** — eines der drei Signale muss explizit zutreffen. Im Zweifel: fixen, weiterziehen.
- **„MUST" / „NEVER" ohne Begründung.** Der Agent kann eine Regel nur klug anwenden, wenn er das Warum versteht — immer „weil X passiert ist" mitliefern.
- **Implementieren vor Nutzer-Entscheidung.** Bricht die Arbeitsweise „Empfehlung + Optionen, Nutzer entscheidet".
- **Nur lessons-learned-Eintrag ohne Schutzmaßnahme** bei starkem Pattern. Stille Doku reicht nicht — der nächste Agent liest sie nicht aus eigenem Antrieb.
- **Maßnahme so streng, dass legitime Workflows brechen.** Lieber Warn-Hook (unaufdringlich, häufig korrekt) als Block-Hook (laut, manchmal falsch).

## Beispiel

Vorfall: `0005_solid_random.sql` mit erfundenem Slug via `apply_migration` → Drift-Check rot.
**Trigger:** Signal 3 (Migration-Drift ist VibeCoding-typisch). **Stärke:** stark (strukturell garantiert, sobald irgendein Agent Migrations anfasst).
**Optionen:** (1) CLAUDE.md-Disziplin, (2) `db-migration`-Skill um Bash-One-Liner erweitern, der den Namen aus der Datei ableitet, (3) PreToolUse-Hook auf `apply_migration`.
**Empfehlung:** Option 2 — Pattern ist eng (nur Migrations), Skill triggert genau dort, Bash-One-Liner schließt die Lücke ohne neue Hook-Infrastruktur. Option 1 zu vage, Option 3 overengineered.

## Verwandte Skills

- `skill-creator` — wenn die Maßnahme ein neuer Skill ist.
- `update-config` — wenn die Maßnahme ein Hook in `.claude/settings.json` ist.
- `db-migration`, `chat-domain-integration` — wenn das Pattern in deren Themenfeld liegt, lieber den existierenden Skill erweitern.
- `doc-keeper` — feuert auto bei `gh pr create` und sorgt dafür, dass Doku im selben PR landet.
