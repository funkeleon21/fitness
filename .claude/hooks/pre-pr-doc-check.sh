#!/usr/bin/env bash
# PreToolUse hook (matcher: Bash). Fires a reminder to invoke the doc-keeper
# skill when the agent is about to run `gh pr create`. Reads the tool input
# from stdin (Claude Code hook contract), inspects the .tool_input.command,
# and emits an additionalContext block when the command contains `gh pr create`.
#
# Exit 0 in all cases — we only want to suggest, not block.

set -euo pipefail

input=$(cat)

# Extract the command string. Fall back to empty if jq is missing or parse fails.
command=$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

# Match `gh pr create` anywhere in the command, but ignore commented-out forms.
if printf '%s' "$command" | grep -qE '(^|[^#])(gh[[:space:]]+pr[[:space:]]+create)'; then
  cat <<'JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "Stop — bevor du `gh pr create` ausführst, MUSST du das doc-keeper Skill via Skill-Tool aufrufen (skill=\"doc-keeper\"). Es prüft die Branch-Änderungen gegen Doc-Trigger-Regeln und commitet ggf. Doc-Updates auf den gleichen Branch. Sobald doc-keeper „keine Drift\" oder „Drift gefixt\" meldet, fahre mit `gh pr create` fort."
  }
}
JSON
fi
