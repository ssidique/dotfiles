#!/bin/sh
# Tag this pane's tmux window with Claude's state; ~/.tmux.conf colors the tab from it.
cat >/dev/null  # drain hook JSON so Claude Code never blocks writing it
[ -n "$TMUX_PANE" ] || exit 0
if [ "$1" = clear ]; then
  tmux set-option -wu -t "$TMUX_PANE" @claude_state
else
  tmux set-option -w -t "$TMUX_PANE" @claude_state "$1"
fi
