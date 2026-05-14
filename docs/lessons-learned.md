# Lessons Learned

Knapp dokumentierte Git-Konflikt-Lösungen, damit wiederkehrende Konflikt-Klassen beim nächsten Mal schneller erkannt werden.

Pro Eintrag: Datum + Titel, Situation, Symptom, Lösung, optional Vorbeugung. Reverse-chronologisch (neueste zuerst).

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
