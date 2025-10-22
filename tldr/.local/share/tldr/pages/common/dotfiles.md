# dotfiles

> Managing dotfiles with GNU Stow.
> Custom page for this dotfiles repository.

- Stow all dotfiles from dotfiles directory:

`cd ~/dotfiles && stow git tmux vim nvim zsh`

- Stow individual package:

`cd ~/dotfiles && stow {{package-name}}`

- Unstow (remove symlinks) for a package:

`cd ~/dotfiles && stow -D {{package-name}}`

- Restow (update symlinks) after changes:

`cd ~/dotfiles && stow -R {{package-name}}`

- Dry-run to see what would be stowed:

`cd ~/dotfiles && stow -n {{package-name}}`

- Verbose dry-run:

`cd ~/dotfiles && stow -nv {{package-name}}`

- Run full installation script:

`cd ~/dotfiles && ./install.sh`

- Edit zsh config:

`nvim ~/dotfiles/zsh/.zshrc`

- Edit tmux config:

`nvim ~/dotfiles/tmux/.tmux.conf`

- Edit git config:

`nvim ~/dotfiles/git/.gitconfig`

- Edit nvim config:

`nvim ~/dotfiles/nvim/.config/nvim/init.lua`

- Reload zsh config:

`source ~/.zshrc`

- Reload tmux config:

`tmux source-file ~/.tmux.conf`

- Add custom tldr page:

`nvim ~/dotfiles/tldr/.local/share/tldr/pages/common/{{page-name}}.md`
