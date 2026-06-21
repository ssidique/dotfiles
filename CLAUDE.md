# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a personal dotfiles repository for managing Linux development environment configurations using GNU Stow. The repository uses a directory-based structure where each configuration type (vim, tmux, i3) has its own directory containing the respective config files. Each directory follows the Stow package format, where files are placed in the same relative path structure as they would appear in the home directory.

## Repository Structure

The dotfiles are organized by tool/application as Stow packages:
- `git/` - Contains `.gitconfig` with custom aliases (brd, note) and delta configuration
- `nvim/` - Neovim configuration at `.config/nvim/`, provided as a **git submodule** pointing to the [`ssidique/nvim-config`](https://github.com/ssidique/nvim-config) repo (the canonical Neovim config)
- `tmux/` - Contains `.tmux.conf` with TPM (Tmux Plugin Manager) setup
- `vim/` - Contains `.vimrc` with Vundle plugin manager configuration
- `zsh/` - Contains `.zshrc` with Oh My Zsh, Powerlevel10k, and vi-mode configuration
- `i3/` - Contains i3 window manager configuration with custom keybindings
- `install.sh` - Automated bootstrap script for complete environment setup

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

### Neovim Submodule (nvim-config)

The `nvim/` package is a git submodule tracking [`ssidique/nvim-config`](https://github.com/ssidique/nvim-config). Stow symlinks `~/.config/nvim` to it as usual, but editing and updating differ from the other packages:

```bash
# Edit the nvim config (this dir IS the nvim-config checkout):
cd ~/.config/nvim
# ...make changes...
git add -A && git commit && git push   # commits go to the nvim-config repo

# Pull the latest nvim-config and record the new pointer in dotfiles:
git submodule update --remote nvim/.config/nvim
git add nvim/.config/nvim && git commit -m "nvim: bump submodule"
```

Note: dotfiles pins a specific `nvim-config` commit. Pushing changes to `nvim-config` does **not** update dotfiles until you bump the pointer as shown above.

## Quick Start: Setting Up a New Environment

### Automated Installation (Recommended)

The `install.sh` script automates the entire setup process. Simply run:

```bash
# --recurse-submodules pulls in the nvim config (ssidique/nvim-config)
git clone --recurse-submodules https://github.com/yourusername/dotfiles.git ~/dotfiles
cd ~/dotfiles
chmod +x install.sh
./install.sh
```

> If you cloned without `--recurse-submodules`, run `git submodule update --init --recursive` before stowing (`install.sh` does this automatically).

This script will:
1. Update package lists
2. Install all required dependencies and tools
3. Set up Oh My Zsh with plugins and Powerlevel10k theme
4. Install plugin managers (TPM, Vundle)
5. Install git delta for better diffs
6. Automatically stow all dotfiles
7. Set Zsh as the default shell

After installation, follow the post-installation steps displayed by the script.

### Manual Installation

If you prefer to install components individually, the `install.sh` file contains the complete setup process. Key dependencies installed:

The script installs:
- **Build tools**: build-essential, clang
- **GNU Stow**: For dotfile management
- **Editors**: Neovim (config pulled from the `nvim-config` submodule)
- **Shell**: Zsh with Oh My Zsh, Powerlevel10k theme
- **CLI utilities**: ripgrep, fd, bat, fzf, zoxide, tldr
- **Git tools**: delta (enhanced diffs)
- **Plugin managers**: TPM (tmux), Vundle (vim)
- **Zsh plugins**: autosuggestions, syntax-highlighting, completions
- **fzf-git.sh**: Git fuzzy finder integration

The script is idempotent - it checks if tools are already installed before attempting installation.

### Post-Installation Steps

After running `install.sh`, complete the setup with these steps:

1. **Restart your terminal** or run `source ~/.zshrc`
2. **Tmux plugins**: In tmux, press `Ctrl+a I` (capital I) to install plugins
3. **Vim plugins**: In vim, run `:PluginInstall` to install all Vundle plugins
4. **Powerlevel10k**: Run `p10k configure` to customize your prompt
5. **Neovim**: plugins auto-install on first `nvim` launch (config comes from the `nvim-config` submodule)
6. **Shell change**: Log out and back in for Zsh to become default shell

## Useful Command Discovery

### tldr - Simplified Man Pages

Use `tldr` to get quick, practical examples for commands:

```bash
tldr tar        # See common tar usage examples
tldr docker     # Docker command examples
tldr git        # Git command examples
tldr fzf        # fzf usage examples
```

### Searchable Command History with Comments

The `.zshrc` has `setopt interactivecomments` enabled, allowing you to add comments to commands that become searchable:

```bash
# Add comments to your commands
docker ps -a  # show all containers including stopped ones
git log --oneline --graph  # pretty git log with branches

# Later, press Ctrl-R and type "show all containers" to find the docker command!
```

This makes your command history self-documenting and easily searchable with fzf.

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
