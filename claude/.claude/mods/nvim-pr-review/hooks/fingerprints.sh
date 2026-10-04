#!/bin/sh
# fingerprints.sh <repo> <base-sha>
# One "<path>\t<hash of its diff vs base>" per file that differs from base
# (committed or not), so a later review can tell which files changed since.
cd "$1" || exit 1
git diff --name-only "$2" | while IFS= read -r p; do
  printf '%s\t%s\n' "$p" "$(git diff "$2" -- "$p" | git hash-object --stdin)"
done
