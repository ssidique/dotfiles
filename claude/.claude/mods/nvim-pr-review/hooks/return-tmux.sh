#!/bin/sh
# Bring tmux back to the pane Claude Code runs in, once a review is decided.
[ -n "$TMUX_PANE" ] || exit 0
tmux switch-client -t "$TMUX_PANE" 2>/dev/null
tmux select-window -t "$TMUX_PANE" && tmux select-pane -t "$TMUX_PANE"
