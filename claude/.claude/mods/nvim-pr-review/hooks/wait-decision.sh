#!/bin/sh
# wait-decision.sh <dir> <socket> <seconds>
# Prints the decision once nvim writes <dir>/decision, "dead" when that nvim
# stops answering, or "again" after <seconds> so the caller can wait another round.
i=0
while [ ! -s "$1/decision" ]; do
  if [ $((i % 8)) -eq 0 ] && ! timeout 2 nvim --server "$2" --remote-expr 1 >/dev/null 2>&1; then
    [ -s "$1/decision" ] || { echo dead; exit 0; }
  fi
  [ "$i" -ge "$(($3 * 4))" ] && { echo again; exit 0; }
  sleep 0.25; i=$((i + 1))
done
cat "$1/decision"
