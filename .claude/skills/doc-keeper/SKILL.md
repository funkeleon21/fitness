---
name: doc-keeper
description: ALWAYS use before creating a pull request with `gh pr create`. Audits whether the code changes on this branch require corresponding doc updates (CLAUDE.md, docs/*, ADR index, skill references), applies them with the Edit tool, and commits them on the same branch — so the doc update lives in the same PR as the code change. Returns a one-line status (drift fixed / no drift) so the calling agent can proceed with PR creation. A PreToolUse hook on `gh pr create` injects a reminder to invoke this skill, so the workflow stays automatic.
---

# Doc-Keeper

Doc-Drift-Check vor jeder PR-Erstellung. Ziel: Doc-Updates landen im **gleichen** PR wie der Code-Change.

## Ablauf

1. **Branch-Diff feststellen.** `git diff --stat origin/main...HEAD` und die Pfadliste sammeln.
2. **Trigger-Tabelle abklopfen.** Für jeden geänderten Pfad: matched er eine Regel unten?
3. **Pro Match: Doc lesen → mit Code-Realität abgleichen.** Wenn das Doc eine falsche/fehlende Aussage trifft, knappen Fix mit dem Edit-Tool anwenden. Wenn das Doc passt → nichts tun.
4. **Doc-Änderungen committen** mit `docs: ...`-Prefix auf dem aktuellen Branch.
5. **Eine Zeile Status zurückgeben** (entweder „Doc-Audit: Drift in X gefixt." oder „Doc-Audit: keine Drift, alles aktuell."). Danach darf der Caller mit `gh pr create` fortfahren.

Wenn nichts matched: **keinen leeren Commit**, einfach „keine Drift" melden.

## Scope: nur strukturelle Drift

Nur strukturelle Drift fixen — neue Domäne, neuer Endpoint, neues ADR, neuer Skill, Auth-Behauptung wird falsch. **Capability-Verfeinerungen einer bereits erwähnten Zeile sind kein Doc-Trigger.** Beispiele für Drift, die du *nicht* fixt:

- `/api/recognize-meal` ist im Stand erwähnt und kann jetzt zusätzlich Pantry-Items matchen → nicht ergänzen.
- `PantrySheet` ist erwähnt und hat jetzt einen neuen Filter/Tab → nicht ergänzen.
- Eine Domäne ist erwähnt und bekommt einen zusätzlichen Sub-Feature-Bullet im UI → nicht ergänzen.

Warum: solche Updates machen jede PR zu einem CLAUDE.md-Edit und produzieren parallel-PR-Konflikte. Drift, die wirklich erwähnenswert ist, fängt der Code-Review ein.

## Trigger-Regeln

| Code-Pfad geändert | Doc-Stelle prüfen |
|---|---|
| neue Datei `packages/core/src/events/<bereich>/<name>.ts` | [CLAUDE.md](../../../CLAUDE.md) „Aktueller Stand" — neue Domäne erwähnt? |
| Datei in `packages/db/src/projections/` | [ADR-0010](../../../docs/decisions/0010-projektionen-replay-pattern.md) Referenz-Implementierungen + [chat-domain-integration Skill](../chat-domain-integration/SKILL.md) Vorlagen-Links |
| Schema-Änderung in `packages/db/src/schema/` | [docs/event-model.md](../../../docs/event-model.md) Envelope-Tabelle |
| `package.json` (Dependency oder Stack-Tool hinzu/raus) | [CLAUDE.md](../../../CLAUDE.md) „Stack"-Zeile |
| neue Datei in `docs/decisions/NNNN-*.md` | [docs/decisions/README.md](../../../docs/decisions/README.md) Index |
| neue Datei in `apps/web/src/app/api/` | [CLAUDE.md](../../../CLAUDE.md) „Aktueller Stand" — neuer Endpoint relevant für den Stand? |
| neuer Ordner in `.claude/skills/<name>/` | [CLAUDE.md](../../../CLAUDE.md) Skills-Sektion |
| Auth-Logik in `apps/web/src/app/auth/` oder `apps/web/src/lib/auth*` | [CLAUDE.md](../../../CLAUDE.md) „Aktueller Stand" — Auth-Behauptung noch wahr? |

Die Liste ist nicht vollständig, sondern die Punkte, an denen wir bisher Drift erlebt haben. Wenn dir beim Audit eine Stelle auffällt, die hier fehlt, **ergänze die Regel in einem Folge-Commit** — die Liste wächst mit der Erfahrung.

## Was Doc-Updates NICHT enthalten dürfen

- **Spekulationen** über zukünftige Phasen oder geplante Features (Vorrats-Doku — siehe deleted `docs/roadmap.md` aus PR #20).
- **Wiederholungen von ADR-Inhalt.** [CLAUDE.md](../../../CLAUDE.md) ist Navigations-Index, nicht zweite Quelle.
- **Detail-Listen, die per `grep` auffindbar sind** (Funktions-Namen, File-Pfade, exakte Zeilennummern).
- **Zeit-Stempel oder „Stand: …"-Datum** in Prosa — Git-Log ist die Autorität.
- **Capability-Verfeinerungen** einer bereits erwähnten Zeile (siehe oben „Scope: nur strukturelle Drift").
- **Bullet-Block-Strukturen zu Prosa zusammenfassen.** Wenn der „Aktueller Stand" als Bullet-Liste pro Bereich strukturiert ist, eine Bereichs-Zeile editieren, niemals den Block zu Prosa kollabieren.

## Was wenn der PR rein Doku ist?

Dann läuft der Skill kurz durch, findet vermutlich keinen Trigger-Match (`docs/*.md`-Änderungen sind selbst nicht in der Trigger-Tabelle) und sagt „keine Drift". Genau richtig.

## Beispiel-Output

```
Doc-Audit:
- packages/core/src/events/training/training.ts → CLAUDE.md „Aktueller Stand": Training-Domain noch nicht erwähnt.
  → Edit angewendet, Commit `docs: Aktueller Stand um Training erweitern` auf feat/training-domain.
PR-Erstellung kann fortfahren.
```

oder

```
Doc-Audit: keine Drift, alles aktuell.
```
