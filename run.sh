#!/usr/bin/env bash
# Convenience wrapper — adds pnpm to PATH then runs any pnpm command
export PATH="$PATH:$HOME/Library/pnpm"
PNPM_BIN=$(find "$HOME/Library/pnpm/store" -name "pnpm" -path "*/bin/pnpm" 2>/dev/null | head -1)
exec "$PNPM_BIN" "$@"
