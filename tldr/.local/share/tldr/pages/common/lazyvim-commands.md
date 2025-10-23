# lazyvim-commands

> LazyVim keybindings and commands (leader key is Space).
> LazyVim is a Neovim configuration with sensible defaults.

## General

- Show key bindings:

`Space + ?`

- Command palette:

`Space + Space`

- Find files:

`Space + f + f`

- Recent files:

`Space + f + r`

- Find text (grep):

`Space + /`

- Find buffers:

`Space + ,`

- Switch buffer:

`Shift + h / Shift + l`

- Close buffer:

`Space + b + d`

- Save file:

`Ctrl + s`

- Quit:

`:q or Space + q + q`

## File Explorer (Neo-tree)

- Toggle file explorer:

`Space + e`

- Focus file explorer:

`Space + E`

## Navigation

- Go to definition:

`g + d`

- Go to references:

`g + r`

- Go to implementation:

`g + I`

- Go to type definition:

`g + y`

- Hover documentation:

`K`

- Jump back:

`Ctrl + o`

- Jump forward:

`Ctrl + i`

## Search (Telescope)

- Live grep (search in files):

`Space + s + g`

- Search word under cursor:

`Space + s + w`

- Search buffers:

`Space + f + b`

- Search help:

`Space + s + h`

- Search keymaps:

`Space + s + k`

- Search commands:

`Space + s + c`

- Search command history:

`Space + s + h`

## LSP (Code Intelligence)

- Rename symbol:

`Space + c + r`

- Code action:

`Space + c + a`

- Format document:

`Space + c + f`

- Show diagnostics:

`Space + x + x`

- Next diagnostic:

`] + d`

- Previous diagnostic:

`[ + d`

## Git Integration

- Git status (Neogit):

`Space + g + g`

- Git blame line:

`Space + g + b`

- Git file history:

`Space + g + h`

- Git branches:

`Space + g + B`

- Stage hunk:

`Space + h + s`

- Undo stage hunk:

`Space + h + u`

- Preview hunk:

`Space + h + p`

## Terminal

- Toggle terminal:

`Ctrl + /`

- New terminal:

`Space + f + t`

## Window Management

- Split window horizontally:

`Space + w + s or :split`

- Split window vertically:

`Space + w + v or :vsplit`

- Close window:

`Space + w + d`

- Navigate windows:

`Ctrl + h/j/k/l`

- Maximize/restore window:

`Space + w + m`

## Tabs

- New tab:

`Space + Tab + n`

- Close tab:

`Space + Tab + d`

- Next tab:

`] + Tab`

- Previous tab:

`[ + Tab`

## Code Editing

- Comment line:

`g + c + c`

- Comment selection (visual mode):

`g + c`

- Toggle comment:

`Space + /`

- Surround with (needs selection):

`S + {{char}}`

- Format:

`= (with motion or selection)`

## Flash (Quick Navigation)

- Jump to word:

`s + {{chars}}`

- Jump to line:

`S + {{chars}}`

## Session Management

- Restore last session:

`Space + q + s`

- Don't restore session:

`Space + q + d`

## Notifications

- Dismiss all notifications:

`Space + u + n`

## Mason (LSP/Tools Manager)

- Open Mason:

`Space + c + m`

## Lazy (Plugin Manager)

- Open Lazy plugin manager:

`Space + l`

- Update plugins:

`Space + l then U`

- Clean unused plugins:

`Space + l then X`

## Extra Features

- Toggle word wrap:

`Space + u + w`

- Toggle line numbers:

`Space + u + l`

- Toggle spell check:

`Space + u + s`

- Toggle conceallevel:

`Space + u + c`

- Colorscheme picker:

`Space + u + C`
