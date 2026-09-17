#!/bin/bash
# Claude Code statusLine, converted from the colored PS1 in ~/.bashrc:
#   PS1='${debian_chroot:+($debian_chroot)}\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
# (~/.zshrc has no plain PS1 string of its own - it drives the prompt through
# Powerlevel10k - so this falls back to the bash prompt definition.)
#
# \u -> $(whoami)      \h -> $(hostname -s)      \w -> current directory
# Trailing "\$ " is dropped per statusline conventions.

input=$(cat)
cwd=$(printf '%s' "$input" | jq -r '.cwd')

user=$(whoami)
host=$(hostname -s)

# Bold green user@host, bold blue cwd (dimmed automatically by the terminal
# footer, same relative contrast as the original PS1).
printf '\033[01;32m%s@%s\033[00m:\033[01;34m%s\033[00m' "$user" "$host" "$cwd"
