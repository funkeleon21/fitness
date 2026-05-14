# Lessons Learned

Knapp dokumentierte Git-Konflikt-Lösungen, damit wiederkehrende Konflikt-Klassen beim nächsten Mal schneller erkannt werden.

Pro Eintrag: Datum + Titel, Situation, Symptom, Lösung, optional Vorbeugung. Reverse-chronologisch (neueste zuerst).

---

## 2026-05-14 — Zwei Sheets nebeneinander in NutritionScreen (additiver Konflikt)

**Situation:** Auf `feat/nutrition-targets-agent` ein neues `NutritionCoachSheet` + State `coachOpen` im `NutritionScreen` hinzugefügt. Parallel wurde PR #31 (Slot-Picker) gemerged, der ein `TemplatePickerSheet` + State `pickerSlot` an exakt derselben Stelle (Import-Block + Sheet-Render-Section am Ende von `NutritionScreen.tsx`) einfügte.

**Symptom:** `mergeStateStatus: DIRTY`. Beide Branches haben strukturell identische Stellen modifiziert (neuer Import, neuer Sheet-Render-Block hinter `MacroDetailSheet`), Git konnte das nicht auto-resolven.

**Lösung:** Trivial additiv — beide Imports nebeneinander, beide Sheet-Blöcke nacheinander. Kein Code-Verlust, keine Refactor-Konflikte. `pickerSlot`-State und `coachOpen`-State sind unabhängig.

**Vorbeugend:** Bei UI-Screens, die viele Sheets nebeneinander rendern (NutritionScreen hat jetzt 4: Detail, Coach, TemplatePicker, dazu kommen aus Dashboard noch LogSheet/InsightDetail/MealTemplate/MealComposer), wachsen Import-Block und Render-Block parallel. Konflikte sind hier fast immer additiv — schnell mergen, statt darauf zu warten.

---

## 2026-05-14 — Paralleler PR fasste selbe Komponente an (Props-Signatur-Drift)

**Situation:** Auf `claude/admiring-brown-a53aa9` (Karten-Redesign des `MacroDetailSheet`) gearbeitet. Während dieser PR offen war, wurde PR #29 (persönliche Tagesziele) gemerged, der die Signatur derselben Komponente änderte: `DEFAULT_TARGETS`-Konstante → `targets: NutritionTargets`-Prop, plus parallele Schema-/Projection-/Ingestion-/Interpretation-Erweiterungen.

**Symptom:** GitHub meldete `mergeable: CONFLICTING` für PR #30. Auto-Merge im Worktree löste den Body der Komponente automatisch (das Innere referenziert ohnehin `targets.kcal` etc., was identisch ist), aber Imports (`DEFAULT_TARGETS` vs. `NutritionTargets`) und Funktions-Signatur (`{ totals, onClose }` vs. `{ totals, targets, onClose }`) blieben mit Konflikt-Markern stehen.

**Lösung:** Beide Konflikt-Blöcke manuell kombiniert:
- Import-Block: `NutritionTargets`-Typ aus main + `useSheetDismissDrag`-Hook aus dem eigenen Branch.
- Funktions-Signatur: `{ totals, targets, onClose }` aus main + Hook-Aufruf `useSheetDismissDrag({ onClose })` direkt davor.

Danach `pnpm typecheck && pnpm lint && pnpm test` plus visuelle Verifikation im Preview, weil der Konflikt eine reaktive Prop betraf.

**Vorbeugend:** Bei UI-Komponenten-Redesigns früh prüfen, ob parallele Branches die gleiche Komponente anfassen (`git log --all --oneline -- <pfad>`). Wenn ja: nicht auf den eigenen PR-Merge warten, sondern proaktiv `git fetch && git merge origin/main` ausführen, sobald der Nachbar-PR gemerged ist — Konflikte sind dort am billigsten, wenn der Kontext noch frisch ist.

---

## 2026-05-14 — Migrations-Drift durch Drizzle-Random-Namen

**Situation:** Drizzle generierte die Migration `0005_solid_random.sql`. Beim direkten Anwenden via Supabase-MCP `apply_migration` habe ich einen sprechenden `name` gewählt (`0005_meal_templates_detail_nutrients`) statt des Dateinamens.

**Symptom:** Im Folge-PR (#27) failte der `drift check`-Workflow:
```
::error::Migrationen lokal vorhanden, aber nicht in der Prod-DB angewandt:
  - 0005_solid_random
```
Die Schema-Änderung selbst war längst in Prod — nur der Tracking-Eintrag hieß anders, als der Vergleich erwartete.

**Lösung:** Manuell im Supabase-SQL-Editor:
```sql
UPDATE supabase_migrations.schema_migrations
SET name = '0005_solid_random'
WHERE name = '0005_meal_templates_detail_nutrients';
```
(Auto-Mode-Classifier blockt diesen Schreibzugriff für den Agenten — User muss es selbst ausführen oder explizit per Settings autorisieren.)

**Vorbeugend:** Bei `apply_migration` als `name` **immer** den Dateinamen ohne `.sql` verwenden, wie der Skill [.claude/skills/db-migration/SKILL.md](../.claude/skills/db-migration/SKILL.md#3-migration-anwenden) vorgibt. Wenn der Drizzle-Random-Name hässlich ist, die Datei vor dem Apply lokal umbenennen + `meta/_journal.json` aktualisieren — aber **dann konsistent**.

---

## 2026-05-14 — Folge-PR auf squash-gemergedem Branch

**Situation:** PR #24 wurde via `--squash` in `main` gemerged. Auf dem selben Feature-Branch (`feat/nutrition-redesign`) lagen bereits weitere Commits für PR #25 (Detail-Nährwerte + Foto-Erfassung).

**Symptom:** GitHub meldete `mergeable: CONFLICTING` / `mergeStateStatus: DIRTY` für PR #25. Lokaler Branch war zwar mit `origin` synchron, aber `origin/main` war seit Squash-Merge weitergezogen — der erste lokale Commit (`c6baeec`) war inhaltlich identisch zum Squash-Commit (`c378605`) auf main, hatte aber eine andere SHA.

**Lösung:**
```
git fetch origin
git rebase origin/main
```
Git erkennt die redundanten Patches per patch-id und überspringt sie automatisch:
```
warning: skipped previously applied commit c6baeec
Successfully rebased and updated refs/heads/feat/nutrition-redesign.
```
Danach `git push --force-with-lease`.

**Vorbeugend:** Nach einem Squash-Merge nicht auf dem alten Feature-Branch weiterarbeiten — frisch von `main` abzweigen. Wenn doch (weil schon Commits drauf sind): direkt nach dem Merge des Eltern-PRs proaktiv `git rebase origin/main` ausführen, nicht warten bis GitHub `CONFLICTING` meldet.
