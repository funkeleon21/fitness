#!/usr/bin/env bash
# PreToolUse hook (matcher: Bash). Blockiert `git commit` und `git push` auf
# einem Branch, dessen letzter PR bereits MERGED oder CLOSED ist. Hintergrund:
# auto-merge ist hier so schnell, dass ein Folge-Commit unbemerkt auf einem
# verwaisten Branch landen kann — der Commit ist dann in keinem PR und nicht
# in main. Siehe Vorfall um PR #69 → #71.
#
# Hook liest den Tool-Input von stdin (Claude Code hook contract), prüft das
# .tool_input.command, fragt `gh pr list --head <branch>` und gibt bei
# merged/closed-State eine "deny" permissionDecision zurück.
#
# Bewusst KEIN Block bei:
# - Branch leer / main / master
# - Kein PR auf dem Branch existiert (= normaler Erst-Push)
# - PR-State OPEN / DRAFT (= aktiver PR, normaler Folge-Commit erlaubt)
# - `gh` oder Auth nicht verfügbar (Hook bleibt still, damit lokale Arbeit
#   ohne GitHub-Auth nicht blockiert wird)

set -euo pipefail

input=$(cat)

command=$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

# Nur git commit / git push interessieren uns.
if ! printf '%s' "$command" | grep -qE '(^|[^#])(git[[:space:]]+(commit|push))'; then
  exit 0
fi

branch=$(git branch --show-current 2>/dev/null || echo "")
if [ -z "$branch" ] || [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  exit 0
fi

# Neuester PR auf diesem Branch (jeder State).
pr_json=$(gh pr list --head "$branch" --state all --limit 1 --json state,number,url 2>/dev/null || echo "[]")
state=$(printf '%s' "$pr_json" | jq -r '.[0].state // ""' 2>/dev/null || echo "")
number=$(printf '%s' "$pr_json" | jq -r '.[0].number // ""' 2>/dev/null || echo "")
url=$(printf '%s' "$pr_json" | jq -r '.[0].url // ""' 2>/dev/null || echo "")

if [ "$state" != "MERGED" ] && [ "$state" != "CLOSED" ]; then
  exit 0
fi

state_de=$(printf '%s' "$state" | tr '[:upper:]' '[:lower:]')

reason="Branch '${branch}' hat einen bereits ${state_de}en PR #${number} (${url}). Auto-merge in diesem Repo ist sehr schnell — Folge-Commits auf demselben Branch landen verwaist (weder im PR noch in main). Bevor du committest oder pushst: neuen Branch von main erstellen, dann den geplanten Change dort committen und neuen PR öffnen. Beispiel: 'git fetch origin main && git checkout -b <neuer-name> origin/main'. Falls du den Commit schon lokal hast: erst neuen Branch, dann 'git cherry-pick <sha>'."

jq -n --arg reason "$reason" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $reason
  }
}'
