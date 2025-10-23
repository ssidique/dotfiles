# lazygit-commands

> Terminal UI for git commands (alias: lg).
> Interactive git interface with vim-style keybindings.

- Launch lazygit:

`lazygit`

- Launch lazygit with custom alias:

`lg`

- Launch lazygit in specific directory:

`lazygit -p {{/path/to/repo}}`

- Launch and filter commits by author:

`lazygit --filter={{author-name}}`

## Navigation (within lazygit)

- Switch between panels:

`1-5 or Tab/Shift+Tab`

- Move up/down in lists:

`j/k or ↑/↓`

- Scroll preview:

`Ctrl-d/Ctrl-u`

## Files Panel

- Stage/unstage file:

`Space`

- Stage all files:

`a`

- Commit staged files:

`c`

- Amend last commit:

`A`

- Discard changes:

`d`

- Ignore file:

`i`

- Refresh files:

`r`

## Branches Panel

- Checkout branch:

`Space or Enter`

- Create new branch:

`n`

- Delete branch:

`d`

- Merge branch into current:

`M`

- Rebase current branch onto selected:

`r`

- Rename branch:

`R`

- Pull from remote:

`p`

- Push to remote:

`P`

- Force push:

`Shift+P`

## Commits Panel

- Revert commit:

`t`

- Cherry-pick commit:

`c`

- Copy commit hash:

`Ctrl+y`

- View commit files:

`Enter`

- Reword commit:

`r`

- Interactive rebase:

`e`

- Squash commits:

`s`

## Stash Panel

- Stash all changes:

`s`

- Pop stash:

`g`

- Apply stash:

`Space`

- Drop stash:

`d`

## General

- Push:

`P`

- Pull:

`p`

- Fetch:

`f`

- Open command log:

`:`

- Quit:

`q or Ctrl+c`

- Toggle help:

`?`

- Universal quit:

`Esc`
