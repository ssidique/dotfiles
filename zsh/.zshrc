# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:$HOME/.local/bin:/usr/local/bin:$PATH

# Path to your Oh My Zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Set name of the theme to load --- if set to "random", it will
# load a random theme each time Oh My Zsh is loaded, in which case,
# to know which specific one was loaded, run: echo $RANDOM_THEME
# See https://github.com/ohmyzsh/ohmyzsh/wiki/Themes
ZSH_THEME="robbyrussell"

# Set list of themes to pick from when loading at random
# Setting this variable when ZSH_THEME=random will cause zsh to load
# a theme from this variable instead of looking in $ZSH/themes/
# If set to an empty array, this variable will have no effect.
# ZSH_THEME_RANDOM_CANDIDATES=( "robbyrussell" "agnoster" )

# Uncomment the following line to use case-sensitive completion.
# CASE_SENSITIVE="true"

# Uncomment the following line to use hyphen-insensitive completion.
# Case-sensitive completion must be off. _ and - will be interchangeable.
# HYPHEN_INSENSITIVE="true"

# Uncomment one of the following lines to change the auto-update behavior
# zstyle ':omz:update' mode disabled  # disable automatic updates
# zstyle ':omz:update' mode auto      # update automatically without asking
# zstyle ':omz:update' mode reminder  # just remind me to update when it's time

# Uncomment the following line to change how often to auto-update (in days).
# zstyle ':omz:update' frequency 13

# Uncomment the following line if pasting URLs and other text is messed up.
# DISABLE_MAGIC_FUNCTIONS="true"

# Uncomment the following line to disable colors in ls.
# DISABLE_LS_COLORS="true"

# Uncomment the following line to disable auto-setting terminal title.
# DISABLE_AUTO_TITLE="true"

# Uncomment the following line to enable command auto-correction.
# ENABLE_CORRECTION="true"

# Uncomment the following line to display red dots whilst waiting for completion.
# You can also set it to another string to have that shown instead of the default red dots.
# e.g. COMPLETION_WAITING_DOTS="%F{yellow}waiting...%f"
# Caution: this setting can cause issues with multiline prompts in zsh < 5.7.1 (see #5765)
# COMPLETION_WAITING_DOTS="true"

# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
# DISABLE_UNTRACKED_FILES_DIRTY="true"

# Uncomment the following line if you want to change the command execution time
# stamp shown in the history command output.
# You can set one of the optional three formats:
# "mm/dd/yyyy"|"dd.mm.yyyy"|"yyyy-mm-dd"
# or set a custom format using the strftime function format specifications,
# see 'man strftime' for details.
# HIST_STAMPS="mm/dd/yyyy"

# Would you like to use another custom folder than $ZSH/custom?
# ZSH_CUSTOM=/path/to/new-custom-folder

# Which plugins would you like to load?
# Standard plugins can be found in $ZSH/plugins/
# Custom plugins may be added to $ZSH_CUSTOM/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(
    git
    docker
    docker-compose
    node
    npm
    python
    pip
    golang
    rust
    fzf
    zsh-autosuggestions
    zsh-syntax-highlighting
)

source $ZSH/oh-my-zsh.sh

# User configuration

# export MANPATH="/usr/local/man:$MANPATH"

# You may need to manually set your language environment
# export LANG=en_US.UTF-8

# Preferred editor for local and remote sessions
# if [[ -n $SSH_CONNECTION ]]; then
#   export EDITOR='vim'
# else
#   export EDITOR='nvim'
# fi

# Compilation flags
# export ARCHFLAGS="-arch $(uname -m)"

# Set personal aliases, overriding those provided by Oh My Zsh libs,
# plugins, and themes. Aliases can be placed here, though Oh My Zsh
# users are encouraged to define aliases within a top-level file in
# the $ZSH_CUSTOM folder, with .zsh extension. Examples:
# - $ZSH_CUSTOM/aliases.zsh
# - $ZSH_CUSTOM/macos.zsh
# For a full list of active aliases, run `alias`.
#
# Example aliases
# alias zshconfig="mate ~/.zshrc"
# alias ohmyzsh="mate ~/.oh-my-zsh"

# ============================================
# Custom WSL Development Environment Setup
# ============================================

# PATH configuration
export PATH="/opt/nvim/bin:$HOME/.local/bin:$HOME/.cargo/bin:$HOME/go/bin:/usr/local/go/bin:$PATH"

# Load Rust environment
[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"

# Go environment
export GOPATH="$HOME/go"

# Default editor
export EDITOR='nvim'
export VISUAL='nvim'

# Modern CLI tool aliases
alias cat='batcat --paging=never'
alias bat='batcat'
alias fd='fdfind'
alias rg='rg --smart-case'

# Navigation aliases
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'

# Enhanced ls
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'

# Git aliases (supplementing oh-my-zsh git plugin)
alias glog='git log --oneline --graph --decorate -20'
alias gundo='git reset --soft HEAD~1'

# Docker aliases
alias dps='docker ps'
alias dpsa='docker ps -a'
alias di='docker images'
alias dex='docker exec -it'
alias dprune='docker system prune -af'

# System utilities
alias df='df -h'
alias du='du -h'
alias free='free -h'
alias top='htop'
alias ports='netstat -tulanp'
alias update='sudo apt update && sudo apt upgrade -y'
alias cleanup='sudo apt autoremove -y && sudo apt autoclean'

# Safety nets
alias rm='rm -i'
alias cp='cp -i'
alias mv='mv -i'
alias mkdir='mkdir -pv'

# Config shortcuts
alias zshrc='$EDITOR ~/.zshrc'
alias reload='source ~/.zshrc'

# Python
alias py='python3'
alias venv='python3 -m venv'
alias activate='source venv/bin/activate'

# Node.js
alias ni='npm install'
alias nr='npm run'
alias ns='npm start'
alias nt='npm test'

# fzf configuration
export FZF_DEFAULT_OPTS='--height 40% --layout=reverse --border --preview-window=right:50%'
if command -v fdfind &> /dev/null; then
    export FZF_DEFAULT_COMMAND='fdfind --type f --hidden --follow --exclude .git'
    export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"
    export FZF_ALT_C_COMMAND='fdfind --type d --hidden --follow --exclude .git'
fi

# ============================================
# FZF-powered functions and aliases
# ============================================

# fzf file finder with preview - open in editor
alias fe='fdfind --type f --hidden --follow --exclude .git | fzf --preview "batcat --color=always --style=numbers --line-range=:500 {}" | xargs -r $EDITOR'

# fzf directory navigation
alias fcd='cd $(fdfind --type d --hidden --follow --exclude .git | fzf --preview "tree -C {} | head -100")'

# fzf git log browser
fgl() {
    git log --oneline --color=always | fzf --ansi --preview 'git show --color=always {1}' | awk '{print $1}' | xargs -r git show
}

# fzf git branch checkout
fbr() {
    local branch
    branch=$(git branch -a --color=always | grep -v HEAD | fzf --ansi --preview 'git log --oneline --graph --color=always {1} | head -20' | sed 's/^[* ]*//' | sed 's#remotes/origin/##')
    [ -n "$branch" ] && git checkout "$branch"
}

# fzf git add (stage files interactively)
fga() {
    git status -s | fzf -m --preview 'git diff --color=always {2}' | awk '{print $2}' | xargs -r git add
}

# fzf process killer
fkill() {
    local pid
    pid=$(ps -ef | sed 1d | fzf -m --preview 'echo {}' | awk '{print $2}')
    [ -n "$pid" ] && echo "$pid" | xargs kill -${1:-9}
}

# fzf docker container management
fdocker() {
    local container
    container=$(docker ps -a --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Image}}" | sed 1d | fzf --preview 'docker logs --tail 50 {1}' | awk '{print $1}')
    [ -n "$container" ] && echo "$container"
}

# fzf docker exec into container
fdex() {
    local container
    container=$(docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Status}}" | sed 1d | fzf | awk '{print $1}')
    [ -n "$container" ] && docker exec -it "$container" /bin/sh
}

# fzf docker logs viewer (follow mode with tail)
fdlogs() {
    local container
    container=$(docker ps -a --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Image}}" | sed 1d | fzf --preview 'docker logs --tail 100 {1} 2>&1' | awk '{print $1}')
    [ -n "$container" ] && docker logs -f --tail 100 "$container"
}

# fzf history search with execution
fh() {
    local cmd
    cmd=$(history | fzf --tac | sed 's/^[ ]*[0-9]*[ ]*//')
    [ -n "$cmd" ] && print -z "$cmd"
}

# fzf environment variable viewer
fenv() {
    printenv | fzf --preview 'echo {}'
}

# fzf npm scripts runner
fnpm() {
    local script
    script=$(cat package.json 2>/dev/null | jq -r '.scripts | keys[]' 2>/dev/null | fzf --preview 'cat package.json | jq -r ".scripts.{}"')
    [ -n "$script" ] && npm run "$script"
}

# fzf ripgrep integration - search and open file at line
frg() {
    local result
    result=$(rg --color=always --line-number --no-heading "$@" | fzf --ansi --preview 'batcat --color=always --highlight-line {2} {1}' --delimiter ':' --preview-window '+{2}-10')
    if [ -n "$result" ]; then
        local file=$(echo "$result" | cut -d':' -f1)
        local line=$(echo "$result" | cut -d':' -f2)
        $EDITOR "+$line" "$file"
    fi
}

# fzf git grep integration - search git repo and open file at line
fgg() {
    local result
    result=$(git grep --color=always --line-number "${@:-.}" | fzf --ansi --preview 'batcat --color=always --highlight-line {2} {1}' --delimiter ':' --preview-window '+{2}-10')
    if [ -n "$result" ]; then
        local file=$(echo "$result" | cut -d':' -f1)
        local line=$(echo "$result" | cut -d':' -f2)
        $EDITOR "+$line" "$file"
    fi
}

# fzf man page browser
fman() {
    man -k . | fzf --preview 'man {1}' | awk '{print $1}' | xargs -r man
}

# History settings
HISTSIZE=50000
SAVEHIST=50000
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_SPACE
setopt SHARE_HISTORY

# ============================================
# General utility functions
# ============================================

# Quick directory creation and navigation
mkcd() { mkdir -p "$1" && cd "$1"; }

# Extract any archive
extract() {
    if [ -f "$1" ]; then
        case "$1" in
            *.tar.bz2)   tar xjf "$1"   ;;
            *.tar.gz)    tar xzf "$1"   ;;
            *.bz2)       bunzip2 "$1"   ;;
            *.rar)       unrar x "$1"   ;;
            *.gz)        gunzip "$1"    ;;
            *.tar)       tar xf "$1"    ;;
            *.tbz2)      tar xjf "$1"   ;;
            *.tgz)       tar xzf "$1"   ;;
            *.zip)       unzip "$1"     ;;
            *.Z)         uncompress "$1";;
            *.7z)        7z x "$1"      ;;
            *)           echo "'$1' cannot be extracted via extract()" ;;
        esac
    else
        echo "'$1' is not a valid file"
    fi
}

# Search for a process
psgrep() { ps aux | grep -v grep | grep -i "$1"; }

# Get public IP
myip() { curl -s ifconfig.me; echo; }

# Quick serve current directory
serve() { python3 -m http.server ${1:-8000}; }

# ============================================
# Neovim Distro Switcher (NVIM_APPNAME)
# ============================================
alias nvim-astro='NVIM_APPNAME=astro nvim'
alias nvim-lazy='NVIM_APPNAME=lazy nvim'
alias nvim-chad='NVIM_APPNAME=nvchad nvim'

# Default nvim to custom config (~/.config/nvim)
alias avim='NVIM_APPNAME=astro nvim'
alias vim='nvim'
alias vi='nvim'

# fzf neovim config switcher
nvims() {
    local configs=(astro lazy nvchad default)
    local config=$(printf '%s\n' "${configs[@]}" | fzf --prompt="Neovim Config > " --height=10 --layout=reverse --border)
    if [ -n "$config" ]; then
        if [ "$config" = "default" ]; then
            NVIM_APPNAME= nvim "$@"
        else
            NVIM_APPNAME=$config nvim "$@"
        fi
    fi
}

source ~/.anthropic_keys

# AWS aliases and fzf commands (sets AWS_PROFILE)
[ -f ~/.aws_aliases ] && source ~/.aws_aliases
