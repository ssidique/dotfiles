#!/bin/sh
# Print live nvim server sockets, one per line, as "<socket>\t<cwd>".
for s in "${XDG_RUNTIME_DIR:-/tmp}"/nvim.*.0 /tmp/nvim."$USER"/*/nvim.*.0; do
  [ -S "$s" ] || continue
  cwd=$(timeout 2 nvim --server "$s" --remote-expr 'getcwd()' 2>/dev/null) || continue
  printf '%s\t%s\n' "$s" "$cwd"
done
