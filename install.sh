#!/bin/bash

# ==============================================================================
# Dotfiles Installation Script
# ==============================================================================
# This script automates the setup of a new development environment
# Run this script from the dotfiles directory: ./install.sh
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}"
}

print_info() {
    echo -e "${BLUE}  ->${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}  WARNING:${NC} $1"
}

print_error() {
    echo -e "${RED}  ERROR:${NC} $1"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ==============================================================================
# Step 1: Update package lists
# ==============================================================================
print_header "Updating package lists"
sudo apt-get update

# ==============================================================================
# Step 2: Install core build tools
# ==============================================================================
print_header "Installing core build tools"
sudo apt-get install -y build-essential clang

# ==============================================================================
# Step 3: Install GNU Stow
# ==============================================================================
print_header "Installing GNU Stow"
if ! command_exists stow; then
    sudo apt-get install -y stow
    print_info "GNU Stow installed"
else
    print_info "GNU Stow already installed"
fi

# ==============================================================================
# Step 4: Install CLI utilities
# ==============================================================================
print_header "Installing CLI utilities"

# Neovim
if ! command_exists nvim; then
    sudo apt-get install -y neovim
    print_info "Neovim installed"
else
    print_info "Neovim already installed"
fi

# ripgrep
if ! command_exists rg; then
    sudo apt-get install -y ripgrep
    print_info "ripgrep installed"
else
    print_info "ripgrep already installed"
fi

# fd
if ! command_exists fd; then
    sudo apt-get install -y fd-find
    # Create symlink for fd-find -> fd
    if [ ! -e "$HOME/.local/bin/fd" ]; then
        mkdir -p "$HOME/.local/bin"
        ln -s $(which fdfind) "$HOME/.local/bin/fd"
    fi
    print_info "fd installed"
else
    print_info "fd already installed"
fi

# bat
if ! command_exists bat; then
    sudo apt-get install -y bat
    # Create symlink for batcat -> bat
    if [ ! -e "$HOME/.local/bin/bat" ]; then
        mkdir -p "$HOME/.local/bin"
        ln -s $(which batcat) "$HOME/.local/bin/bat"
    fi
    print_info "bat installed"
else
    print_info "bat already installed"
fi

# fzf
if [ ! -d "$HOME/.fzf" ]; then
    print_info "Installing fzf"
    git clone --depth 1 https://github.com/junegunn/fzf.git ~/.fzf
    ~/.fzf/install --all --no-bash --no-fish
    print_info "fzf installed"
else
    print_info "fzf already installed"
fi

# zoxide
if ! command_exists zoxide; then
    print_info "Installing zoxide"
    curl -sS https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | bash
    print_info "zoxide installed"
else
    print_info "zoxide already installed"
fi

# tldr (simplified man pages)
if ! command_exists tldr; then
    print_info "Installing tldr"
    sudo apt-get install -y tldr
    # Update tldr cache
    tldr --update 2>/dev/null || true
    print_info "tldr installed"
else
    print_info "tldr already installed"
fi

# eza (modern ls replacement)
if ! command_exists eza; then
    print_info "Installing eza"
    sudo mkdir -p /etc/apt/keyrings
    wget -qO- https://raw.githubusercontent.com/eza-community/eza/main/deb.asc | sudo gpg --dearmor -o /etc/apt/keyrings/gierens.gpg
    echo "deb [signed-by=/etc/apt/keyrings/gierens.gpg] http://deb.gierens.de stable main" | sudo tee /etc/apt/sources.list.d/gierens.list
    sudo chmod 644 /etc/apt/keyrings/gierens.gpg /etc/apt/sources.list.d/gierens.list
    sudo apt-get update
    sudo apt-get install -y eza
    print_info "eza installed"
else
    print_info "eza already installed"
fi

# lazygit (TUI for git)
if ! command_exists lazygit; then
    print_info "Installing lazygit"
    LAZYGIT_VERSION=$(curl -s "https://api.github.com/repos/jesseduffield/lazygit/releases/latest" | grep -Po '"tag_name": "v\K[^"]*')
    curl -Lo /tmp/lazygit.tar.gz "https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_${LAZYGIT_VERSION}_Linux_x86_64.tar.gz"
    tar xf /tmp/lazygit.tar.gz -C /tmp lazygit
    sudo install /tmp/lazygit /usr/local/bin
    rm /tmp/lazygit.tar.gz /tmp/lazygit
    print_info "lazygit installed"
else
    print_info "lazygit already installed"
fi

# GitHub CLI
if ! command_exists gh; then
    print_info "Installing GitHub CLI (gh)"
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y gh
    print_info "GitHub CLI installed"
else
    print_info "GitHub CLI already installed"
fi

# tmuxinator (tmux session manager)
if ! command_exists tmuxinator; then
    print_info "Installing tmuxinator"
    sudo apt-get install -y tmuxinator
    print_info "tmuxinator installed"
else
    print_info "tmuxinator already installed"
fi

# tree-sitter-cli (for nvim-treesitter)
if ! command_exists tree-sitter; then
    print_info "Installing tree-sitter-cli"
    npm install -g tree-sitter-cli
    print_info "tree-sitter-cli installed"
else
    print_info "tree-sitter-cli already installed"
fi

# ==============================================================================
# Step 5: Install and configure Zsh
# ==============================================================================
print_header "Setting up Zsh"

if ! command_exists zsh; then
    sudo apt-get install -y zsh
    print_info "Zsh installed"
else
    print_info "Zsh already installed"
fi

# Install Oh My Zsh
if [ ! -d "$HOME/.oh-my-zsh" ]; then
    print_info "Installing Oh My Zsh"
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
    print_info "Oh My Zsh installed"
else
    print_info "Oh My Zsh already installed"
fi

# Install Zsh plugins
ZSH_CUSTOM="${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}"

if [ ! -d "$ZSH_CUSTOM/plugins/zsh-autosuggestions" ]; then
    git clone https://github.com/zsh-users/zsh-autosuggestions "$ZSH_CUSTOM/plugins/zsh-autosuggestions"
    print_info "zsh-autosuggestions installed"
fi

if [ ! -d "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting" ]; then
    git clone https://github.com/zsh-users/zsh-syntax-highlighting.git "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting"
    print_info "zsh-syntax-highlighting installed"
fi

if [ ! -d "$ZSH_CUSTOM/plugins/zsh-completions" ]; then
    git clone https://github.com/zsh-users/zsh-completions "$ZSH_CUSTOM/plugins/zsh-completions"
    print_info "zsh-completions installed"
fi

# Install Powerlevel10k theme
if [ ! -d "$ZSH_CUSTOM/themes/powerlevel10k" ]; then
    git clone --depth=1 https://github.com/romkatv/powerlevel10k.git "$ZSH_CUSTOM/themes/powerlevel10k"
    print_info "Powerlevel10k installed"
fi

# ==============================================================================
# Step 6: Install fzf-git.sh
# ==============================================================================
print_header "Installing fzf-git.sh"
if [ ! -d "$HOME/fzf-git.sh" ]; then
    git clone https://github.com/junegunn/fzf-git.sh.git "$HOME/fzf-git.sh"
    print_info "fzf-git.sh installed"
else
    print_info "fzf-git.sh already installed"
fi

# ==============================================================================
# Step 7: Install Tmux Plugin Manager (TPM)
# ==============================================================================
print_header "Installing Tmux Plugin Manager"
if [ ! -d "$HOME/.tmux/plugins/tpm" ]; then
    git clone https://github.com/tmux-plugins/tpm "$HOME/.tmux/plugins/tpm"
    print_info "TPM installed"
else
    print_info "TPM already installed"
fi

# ==============================================================================
# Step 8: Install Vim Plugin Manager (Vundle)
# ==============================================================================
print_header "Installing Vundle for Vim"
if [ ! -d "$HOME/.vim/bundle/Vundle.vim" ]; then
    git clone https://github.com/VundleVim/Vundle.vim.git "$HOME/.vim/bundle/Vundle.vim"
    print_info "Vundle installed"
else
    print_info "Vundle already installed"
fi

# ==============================================================================
# Step 9: Install git delta (better git diffs)
# ==============================================================================
print_header "Installing git delta"
if ! command_exists delta; then
    DELTA_VERSION="0.17.0"
    DELTA_URL="https://github.com/dandavison/delta/releases/download/${DELTA_VERSION}/git-delta_${DELTA_VERSION}_amd64.deb"

    print_info "Downloading delta ${DELTA_VERSION}"
    wget -q "$DELTA_URL" -O /tmp/git-delta.deb
    sudo dpkg -i /tmp/git-delta.deb
    rm /tmp/git-delta.deb
    print_info "git delta installed"
else
    print_info "git delta already installed"
fi

# ==============================================================================
# Step 10: Stow dotfiles
# ==============================================================================
print_header "Stowing dotfiles"

DOTFILES_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DOTFILES_DIR"

# Pull in submodules (nvim config lives in the ssidique/nvim-config repo)
if [ -f .gitmodules ]; then
    print_info "Initializing git submodules (nvim config)"
    git submodule update --init --recursive
fi

# List of packages to stow
PACKAGES=("git" "tmux" "vim" "nvim" "zsh" "tldr")

for package in "${PACKAGES[@]}"; do
    if [ -d "$package" ]; then
        print_info "Stowing $package"
        # Use --adopt to handle conflicts by adopting existing files
        stow --adopt "$package" 2>/dev/null || stow -R "$package" 2>/dev/null || true
    else
        print_warning "Package directory '$package' not found, skipping"
    fi
done

print_info "Dotfiles stowed successfully"
print_info "Custom tldr pages are now available"

# ==============================================================================
# Step 11: Set Zsh as default shell
# ==============================================================================
print_header "Setting Zsh as default shell"
if [ "$SHELL" != "$(which zsh)" ]; then
    chsh -s $(which zsh)
    print_info "Default shell changed to Zsh (restart required)"
else
    print_info "Zsh is already the default shell"
fi

# ==============================================================================
# Step 12: Post-installation instructions
# ==============================================================================
print_header "Installation complete!"
echo ""
print_info "Next steps:"
echo "  1. Restart your terminal or run: source ~/.zshrc"
echo "  2. In tmux, press 'Ctrl+a I' (capital i) to install tmux plugins"
echo "  3. In vim, run ':PluginInstall' to install vim plugins"
echo "  4. Run 'p10k configure' to customize your Powerlevel10k prompt"
echo "  5. LazyVim plugins will auto-install on first nvim launch"
echo "  6. Install a Nerd Font for icons: https://www.nerdfonts.com/"
echo "  7. Authenticate GitHub CLI: gh auth login"
echo ""
print_warning "You may need to log out and log back in for Zsh to become the default shell"
echo ""
