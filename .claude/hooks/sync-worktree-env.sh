#!/usr/bin/env bash
# SessionStart hook. Symlinkt `.env.local` aus dem Haupt-Repo in den aktuellen
# Worktree, damit Dev-Server + Drizzle in jedem Worktree direkt laufen.
#
# Quelle: `git rev-parse --git-common-dir` zeigt auf das `.git` des Hauptrepos,
# dessen Parent ist der Hauptrepo-Pfad. So bleibt das Script portabel und
# hardcoded keinen absoluten Pfad.
#
# Verhalten:
# - Hauptrepo selbst: no-op (CLAUDE_PROJECT_DIR == Hauptrepo).
# - Worktree: legt fehlende `.env.local`-Symlinks an. Existierende Datei
#   (Symlink ODER reale Datei) wird nicht angefasst — keine Überraschungen.
# - Fehlt die Quelle im Hauptrepo, gibt's eine Warnung an stderr, kein Block.
#
# Exit 0 in allen Fällen; SessionStart-Hooks sollen Sessions nie blockieren.

set -euo pipefail

# CLAUDE_PROJECT_DIR ist gesetzt von Claude Code (Worktree-Root).
project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$project_dir"

# Hauptrepo finden. `git rev-parse --git-common-dir` zeigt im Worktree auf
# `<main>/.git`, im Hauptrepo selbst auf `.git`.
git_common_dir=$(git rev-parse --git-common-dir 2>/dev/null || echo "")
if [[ -z "$git_common_dir" ]]; then
  echo "[sync-worktree-env] kein git-Repo erkannt, übersprungen" >&2
  exit 0
fi

# Auflösen zu absolutem Pfad, dann Parent von `.git` = Hauptrepo-Wurzel.
git_common_abs=$(cd "$git_common_dir" && pwd)
main_repo="$(dirname "$git_common_abs")"

# No-op falls wir bereits im Hauptrepo sitzen.
if [[ "$main_repo" == "$project_dir" ]]; then
  exit 0
fi

link_env() {
  local rel_path="$1"
  local src="$main_repo/$rel_path"
  local dst="$project_dir/$rel_path"

  if [[ ! -f "$src" ]]; then
    echo "[sync-worktree-env] Quelle fehlt: $src — überspringe $rel_path" >&2
    return 0
  fi

  if [[ -e "$dst" || -L "$dst" ]]; then
    return 0
  fi

  mkdir -p "$(dirname "$dst")"
  ln -s "$src" "$dst"
  echo "[sync-worktree-env] verlinkt: $rel_path -> $src" >&2
}

link_env ".env.local"
link_env "apps/web/.env.local"

exit 0
