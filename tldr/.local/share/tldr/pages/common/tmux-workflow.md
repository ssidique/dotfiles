# tmux-workflow

> Common tmux workflows (prefix is Ctrl-a in this config).
> Custom page for tmux operations.

- Create new named session:

`tmux new -s {{session-name}}`

- Attach to existing session:

`tmux attach -t {{session-name}}`

- List all sessions:

`tmux list-sessions`

- Kill specific session:

`tmux kill-session -t {{session-name}}`

- Split window horizontally (custom: prefix + |):

`Ctrl-a |`

- Split window vertically (custom: prefix + -):

`Ctrl-a -`

- Navigate between panes (vim-style):

`Ctrl-h/j/k/l`

- Resize pane left:

`Ctrl-a Ctrl-Left`

- Resize pane right:

`Ctrl-a Ctrl-Right`

- Resize pane up:

`Ctrl-a Ctrl-Up`

- Resize pane down:

`Ctrl-a Ctrl-Down`

- Toggle pane zoom (full screen):

`Ctrl-a z`

- Create new window:

`Ctrl-a c`

- Switch to next window:

`Ctrl-a n`

- Switch to previous window:

`Ctrl-a p`

- Rename current session:

`Ctrl-a $`

- Rename current window:

`Ctrl-a ,`

- Detach from session:

`Ctrl-a d`

- Reload tmux config (custom):

`Ctrl-a r`

- Install tmux plugins (TPM):

`Ctrl-a I`

- Update tmux plugins (TPM):

`Ctrl-a U`

- Show all key bindings:

`Ctrl-a ?`

- Enter copy mode (vi-mode):

`Ctrl-a [`

- Toggle sidebar file tree:

`Ctrl-a Tab`
