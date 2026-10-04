#!/bin/sh
# Select the tmux pane that hosts the nvim behind socket $1 (nvim.<pid>.0).
[ -n "$TMUX" ] || command -v tmux >/dev/null || exit 0
pid=$(basename "$1" | sed -n 's/^nvim\.\([0-9]*\)\..*/\1/p')
[ -n "$pid" ] || exit 0
panes=$(tmux list-panes -a -F '#{pane_pid} #{pane_id}' 2>/dev/null) || exit 0
while [ -n "$pid" ] && [ "$pid" -gt 1 ]; do
  pane=$(printf '%s\n' "$panes" | awk -v p="$pid" '$1 == p { print $2 }')
  if [ -n "$pane" ]; then
    tmux switch-client -t "$pane" 2>/dev/null
    tmux select-window -t "$pane" && tmux select-pane -t "$pane"
    exit 0
  fi
  pid=$(awk '{ print $4 }' "/proc/$pid/stat" 2>/dev/null)
done
