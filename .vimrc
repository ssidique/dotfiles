set nocompatible " Use Vim settings

filetype off

set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()

Plugin 'VundleVim/Vundle.vim'
Plugin 'scrooloose/nerdtree'
Plugin 'Xuyuanp/nerdtree-git-plugin'
Plugin 'vim-syntastic/syntastic'
Plugin 'ctrlpvim/ctrlp.vim'

Plugin 'airblade/vim-gitgutter'
Plugin 'tpope/vim-fugitive'

Plugin 'lyuts/vim-rtags'
Plugin 'fatih/vim-go'

Plugin 'vim-airline/vim-airline'
Plugin 'vim-airline/vim-airline-themes'
Plugin 'vim-scripts/argtextobj.vim'

call vundle#end()

hi clear SignColumn " Clear Columns for syntastic
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
" View and search through open buffers
nnoremap gb :ls<CR>:b<Space>

":Ggrep quickfix window
autocmd QuickFixCmdPost *grep* cwindow

"---------------Vim Airline ----------"
let g:airline#extensions#tabline#enabled = 1
:nnoremap <C-h> :bprev<CR>
:nnoremap <C-l> :bnext<CR>

"-----------CTRL+P-----------------"
nmap <leader>bb :CtrlPBuffer<cr>
nmap <leader>bm :CtrlPMixed<cr>
nmap <leader>bs :CtrlPMRU<cr>
let g:ctrlp_user_command = ['.git', 'cd %s && git ls-files . --cached --exclude-standard']

"-----------NerdTree--------------"
nnoremap <Leader>f :NERDTreeToggle<Enter>
nnoremap <silent> <Leader>v :NERDTreeFind<CR>

"-----------SYNTASTIC---------------"
set statusline+=%#warningmsg#
set statusline+=%{SyntasticStatuslineFlag()}
set statusline+=%*

let g:syntastic_always_populate_loc_list = 1
let g:syntastic_auto_loc_list = 1
let g:syntastic_check_on_wq = 0
let g:syntastic_error_symbol='✘'
let g:syntastic_warning_symbol="▲"
let g:syntastic_cpp_checkers= ["cppcheck"]
let g:syntastic_mode_map = {"mode" : "passive"}
"let g:syntastic_cpp_checkers= ["clang_check"]
"let g:syntastic_cpp_include_dirs = ["/home/ssidique/memsql/debug"]
"let b:syntastic_cpp_clang_check_args = get(g:, 'syntastic_cpp_clang_check_args', '') .
let g:syntastic_cpp_clang_check_args = "-p /home/ssidique/memsql/debug"
let g:syntastic_cpp_clang_check_post_args = ""

