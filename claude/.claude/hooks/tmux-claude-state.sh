#!/bin/sh
# Tag this pane's tmux window with Claude's state (~/.tmux.conf colors the tab from
# @claude_state) and name the window repo:branch.
input=$(cat)
[ -n "$TMUX_PANE" ] || exit 0
if [ "$1" = clear ]; then
  tmux set-option -wu -t "$TMUX_PANE" @claude_state \; \
       set-option -w -t "$TMUX_PANE" automatic-rename on
  exit 0
fi
tmux set-option -w -t "$TMUX_PANE" @claude_state "$1"

# Renamed on every state change so a branch switch mid-session shows up.
cwd=$(printf '%s' "$input" | jq -r '.cwd // empty')
dir=$(git -C "${cwd:-.}" rev-parse --show-toplevel 2>/dev/null) || dir=${cwd:-$PWD}
name=$(basename "$dir")
branch=$(git -C "$dir" branch --show-current 2>/dev/null)
[ -n "$branch" ] && name="$name:$(printf '%s' "$branch" | cut -c1-24)"
tmux rename-window -t "$TMUX_PANE" "$name"
