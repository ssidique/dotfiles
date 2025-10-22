# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a personal dotfiles repository for managing Linux development environment configurations using GNU Stow. The repository uses a directory-based structure where each configuration type (vim, tmux, i3) has its own directory containing the respective config files. Each directory follows the Stow package format, where files are placed in the same relative path structure as they would appear in the home directory.

## Repository Structure

The dotfiles are organized by tool/application as Stow packages:
- `vim/` - Contains `.vimrc` with Vundle plugin manager configuration
- `tmux/` - Contains `.tmux.conf` with TPM (Tmux Plugin Manager) setup
- `i3/` - Contains i3 window manager configuration with custom keybindings
- `install.sh` - Bootstrap script for installing dependencies and setting up the environment

## Using GNU Stow

GNU Stow creates symlinks from this repository to your home directory. Each subdirectory is a "package" that Stow can install.

### Deploying Dotfiles

From the repository root, use Stow to symlink configurations:

```bash
# Install all configurations
stow vim tmux i3

# Install individual packages
stow vim
stow tmux
stow i3

# Preview what Stow would do (dry-run)
stow -n vim
stow -nv vim  # verbose dry-run
```

This will create symlinks like:
- `~/dotfiles/vim/.vimrc` → `~/.vimrc`
- `~/dotfiles/tmux/.tmux.conf` → `~/.tmux.conf`
- `~/dotfiles/i3/config` → `~/.config/i3/config` (if structured under `.config/i3/`)

### Removing Dotfiles

To unlink/remove symlinked configurations:

```bash
# Remove all
stow -D vim tmux i3

# Remove individual packages
stow -D vim
```

### Restowing (Update Symlinks)

After modifying the repository structure:

```bash
stow -R vim  # Restow to update symlinks
```

## Installation and Setup

### Initial Environment Setup

The `install.sh` file contains the complete setup process for a new system. Key dependencies installed:

```bash
# Core build tools
sudo apt-get install build-essential
sudo apt install clang

# Package manager for dotfiles
apt-get install stow

# Editor and related tools
apt-get install nvim
git clone https://github.com/LazyVim/starter ~/.config/nvim

# Shell
apt install zsh
chsh -s $(which zsh) $USER
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# CLI utilities
apt-get install ripgrep
apt install fd-find
sudo apt install bat
git clone --depth 1 https://github.com/junegunn/fzf.git ~/.fzf && ~/.fzf/install

# Zsh plugins
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
git clone https://github.com/zsh-users/zsh-completions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-completions
git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/themes/powerlevel10k

# Tmux plugin manager
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
```

### Plugin Installation

**Vim**: First-time setup requires installing Vundle and plugins:
```bash
git clone https://github.com/VundleVim/Vundle.vim.git ~/.vim/bundle/Vundle.vim
# Then in vim, run: :PluginInstall
```

**Tmux**: After installing TPM, install plugins:
```bash
# In tmux, press: prefix + I (capital i)
# Default prefix in this config is C-a (not C-b)
```

## Configuration Architecture

### Vim Setup (vim/.vimrc)

Uses Vundle for plugin management with the following key plugins:
- **File navigation**: NERDTree, CtrlP (fuzzy finder)
- **Git integration**: vim-fugitive, vim-gitgutter
- **Code quality**: Syntastic (configured for C++ with cppcheck/clang_check)
- **Tmux integration**: vim-tmux-navigator, Vimux
- **Productivity**: vim-multiple-cursors, vim-easymotion, vim-commentary

Key customizations:
- Leader key: `,` (comma)
- Tab settings: 4 spaces, expandtab enabled
- Custom keybindings for NERDTree (`<Leader>f`), CtrlP buffers, and Vimux integration

### Tmux Setup (tmux/.tmux.conf)

Key configuration details:
- Prefix remapped from `C-b` to `C-a`
- Split bindings: `|` for horizontal, `-` for vertical (both open in current path)
- Vi mode keys enabled
- Reload config: `prefix + r`

Plugins via TPM:
- tmux-sensible (sensible defaults)
- vim-tmux-navigator (seamless vim/tmux pane navigation)
- tmux-sidebar (directory tree)

### i3 Window Manager (i3/config)

Custom keybindings (uses Mod4/Super key):
- Vim-style focus navigation: `$mod+h/j/k/l`
- Custom workspace navigation: `$mod+o/p` (prev/next), `$mod+semicolon` (back_and_forth)
- Multi-monitor: `$mod+comma/period` (focus/move between outputs)
- Split bindings: `$mod+z` (horizontal), `$mod+v` (vertical)
- Caps Lock remapped to Escape via xmodmap on startup

Workspace layouts are auto-loaded from `~/monitor/workspace-*.json` on startup (workspaces 1-5).

## Key Integration Points

**Vim + Tmux Navigation**: The configs use `christoomey/vim-tmux-navigator` in both Vim and Tmux, allowing seamless navigation between vim splits and tmux panes using the same keybindings.

**Vimux Integration**: Allows running commands in a tmux pane from within vim:
- `<Leader>vp` - Prompt for command
- `<Leader>vl` - Run last command
- `<Leader>vi` - Inspect runner
- `<Leader>vz` - Zoom runner

## Git Configuration

The install script includes delta configuration for better git diffs:
```bash
git config --global core.pager delta
git config --global interactive.diffFilter 'delta --color-only'
git config --global delta.navigate true
git config --global merge.conflictStyle zdiff3
```

Note: Delta itself needs to be installed separately (TODO in install.sh).

## Managing This Repository

When modifying configurations:
- Edit files in their respective directories (vim/, tmux/, i3/)
- Changes are immediately reflected in the home directory since Stow creates symlinks
- Use `stow -R <package>` if you need to restow after structural changes
- Test changes before committing
- When adding new dotfiles, ensure they follow the Stow package structure (place files in the same relative path as they would appear from `~/`)

### Adding New Configurations

To add a new dotfile to this repository:

1. Create a new directory for the package (e.g., `zsh/`)
2. Place config files in their expected path structure:
   ```bash
   # For files that go in ~/
   mkdir zsh
   cp ~/.zshrc zsh/.zshrc

   # For files that go in ~/.config/
   mkdir -p packagename/.config/packagename
   cp ~/.config/packagename/config packagename/.config/packagename/config
   ```
3. Stow the new package: `stow zsh`
4. Commit the changes to the repository
