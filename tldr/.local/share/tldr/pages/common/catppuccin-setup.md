# catppuccin-setup

> Catppuccin theme configuration across all tools in dotfiles.
> Available flavours: latte (light), frappe, macchiato, mocha (darkest).

## Already Configured

- Neovim/LazyVim with Catppuccin Mocha:

`Already configured in nvim/.config/nvim/lua/plugins/catppuccin.lua`

- Tmux with Catppuccin Mocha:

`Already configured in tmux/.tmux.conf`

- Bat with Catppuccin Mocha:

`Already configured - BAT_THEME set in .zshrc`

- FZF with Catppuccin Mocha colors:

`Already configured - FZF_DEFAULT_OPTS set in .zshrc`

## Activation Steps

- Open Neovim to auto-install theme:

`nvim`

- Install tmux plugins (includes Catppuccin):

`Ctrl+a I (in tmux)`

- Reload zsh configuration:

`source ~/.zshrc`

- Verify bat theme:

`bat --list-themes | grep Catppuccin`

- Test bat with theme:

`bat ~/.zshrc`

- Test fzf colors:

`fzf`

## Change Flavour

- Change Neovim flavour (edit file):

`nvim ~/dotfiles/nvim/.config/nvim/lua/plugins/catppuccin.lua`

```lua
flavour = "mocha", -- Change to: latte, frappe, macchiato, or mocha
```

- Change tmux flavour (edit file):

`nvim ~/dotfiles/tmux/.tmux.conf`

```bash
set -g @catppuccin_flavour 'mocha' # Change flavour here
```

- Change bat flavour:

`wget -P ~/.config/bat/themes https://github.com/catppuccin/bat/raw/main/themes/Catppuccin%20{{Flavour}}.tmTheme`

Then update .zshrc:

```bash
export BAT_THEME="Catppuccin {{Flavour}}"
```

- Rebuild bat cache after adding new theme:

`bat cache --build`

## Windows Terminal (Optional)

- Download Catppuccin for Windows Terminal:

`https://github.com/catppuccin/windows-terminal`

- Copy JSON theme to Windows Terminal settings:

`Ctrl+, → Open JSON file → Add theme to "schemes"`

- Apply theme to profile:

`Settings → Profiles → Ubuntu → Appearance → Color scheme`

## Verify All Themes

- Check Neovim theme:

`nvim (should show Catppuccin colors)`

- Check tmux theme:

`tmux (status bar should be Catppuccin themed)`

- Check bat theme:

`bat ~/.zshrc (syntax highlighting in Catppuccin)`

- Check fzf theme:

`fzf (interface should use Catppuccin colors)`

## Available Catppuccin Flavours

- Latte (light theme):

`Light background with dark text`

- Frappé (dark, warm):

`Dark theme with warm tones`

- Macchiato (dark, balanced):

`Dark theme, balanced contrast`

- Mocha (darkest):

`Darkest theme, highest contrast (default in this setup)`

## Additional Applications

- lazygit theme (manual setup):

`https://github.com/catppuccin/lazygit`

- GitHub theme (browser extension):

`https://github.com/catppuccin/github`

- VSCode theme:

`Install "Catppuccin for VSCode" extension`
