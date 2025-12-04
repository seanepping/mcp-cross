#!/usr/bin/env bash
set -euo pipefail

# wsl-runner.sh
# Removes Windows drive mount entries (e.g., /mnt/c/) from PATH then execs the given command.
# Usage: wsl-runner.sh <command> [args...]

# Build a new PATH that excludes /mnt/<letter>/ entries.
OLD_IFS="$IFS"
IFS=:
read -ra PARTS <<< "$PATH"
IFS="$OLD_IFS"

NEW_PATH_PARTS=()
for p in "${PARTS[@]}"; do
  # If the path begins with /mnt/<letter>/ or is exactly /mnt/<letter>, skip it
  if [[ "$p" =~ ^/mnt/[A-Za-z](/|$) ]]; then
    continue
  fi
  NEW_PATH_PARTS+=("$p")
done

# Reconstruct PATH
if [ ${#NEW_PATH_PARTS[@]} -eq 0 ]; then
  export PATH=""
else
  IFS=:
  export PATH="${NEW_PATH_PARTS[*]}"
  IFS="$OLD_IFS"
fi

# If debug flag is set (propagated via WSLENV), print new PATH to stderr
if [ -n "${MCP_CROSS_DEBUG-}" ]; then
  echo "DEBUG: FILTERED PATH=" >&2
  printenv PATH >&2
fi

# Exec the provided command
if [ "$#" -eq 0 ]; then
  echo "wsl-runner.sh: no command provided" >&2
  exit 2
fi

exec "$@"
