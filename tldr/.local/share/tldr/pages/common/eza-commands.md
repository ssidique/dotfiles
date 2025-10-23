# eza-commands

> Modern replacement for ls with colors, icons, and git integration.
> Custom aliases configured in .zshrc.

- List files with icons (alias: ls):

`eza --icons`

- Long listing with git status and icons (alias: ll):

`eza -la --icons --git`

- List all files including hidden (alias: la):

`eza -a --icons`

- Tree view with 2 levels (alias: lt):

`eza --tree --level=2 --icons`

- Long format with git info (alias: l):

`eza -lbF --git --icons`

- Tree view all levels (alias: tree):

`eza --tree --icons`

- Sort by modified time, newest first:

`eza -la --sort=modified --reverse --icons`

- Sort by size:

`eza -la --sort=size --icons`

- Show only directories:

`eza -D --icons`

- Show file sizes in human readable format with total:

`eza -la --total-size --icons`

- Group directories first:

`eza -la --group-directories-first --icons`

- Show extended attributes and permissions:

`eza -la@ --icons`

- Filter by file extension:

`eza --icons *.md`

- Show git ignored files:

`eza -la --git-ignore --icons`
