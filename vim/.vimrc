set nocompatible " Use Vim settings

filetype off

set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()

Plugin 'VundleVim/Vundle.vim'

" Essential plugins
Plugin 'tpope/vim-commentary'           " Comment toggling (gcc)
Plugin 'tpope/vim-fugitive'             " Git integration
Plugin 'christoomey/vim-tmux-navigator' " Seamless tmux/vim navigation
Plugin 'preservim/vimux'                " Tmux integration

call vundle#end()

filetype plugin indent on
syntax on " Enable syntax highlighting

:let mapleader = ","

set tabstop=4 "4 spaces for tabs
set shiftwidth=4 "for when <TAB> is pressed at the beginning at a line
set expandtab "expands tab into spaces

set mouse=a

set backspace=indent,eol,start
"set switchbuf+=usetab,newtab

" Incremental search and highlight search
set incsearch
set hlsearch
set pastetoggle=<F3>

set hidden

"-----------Vimux---------------"
map <Leader>vp :VimuxPromptCommand<CR>
map <Leader>vl :VimuxRunLastCommand<CR>
map <Leader>vi :VimuxInspectRunner<CR>
map <Leader>vz :VimuxZoomRunner<CR>


"-----------tmux-navigator---------------"
let g:tmux_navigator_disable_when_zoomed = 1
" Default keybindings (Ctrl-h/j/k/l) work automatically when plugin is installed
" No need to manually map - the plugin handles it
