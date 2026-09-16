#!/bin/sh
# Windows toast when a Claude session needs you, unless its tmux window is already on screen.
input=$(cat)
title="Claude Code"
if [ -n "$TMUX_PANE" ]; then
  [ "$(tmux display -p -t "$TMUX_PANE" '#{&&:#{window_active},#{session_attached}}')" = 1 ] && exit 0
  title=$(tmux display -p -t "$TMUX_PANE" '#W')
fi
body=$(printf '%s' "$input" | jq -r '
  (.tool_input.questions[0].question // .message // .last_assistant_message // "Waiting for your input")
  | split("\n")[0] | .[0:200]')

# powershell.exe needs a Windows path; resolve the stow symlink first.
ps1=$(wslpath -w "$(readlink -f "$(dirname "$0")/toast.ps1")")
CN_TITLE=$title CN_BODY=$body WSLENV=CN_TITLE/u:CN_BODY/u \
  /mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe \
  -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$ps1"
