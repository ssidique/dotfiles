# nerd-fonts-install

> Guide to installing Nerd Fonts for icon support in LazyVim, Powerlevel10k, and eza.
> Nerd Fonts are patched fonts with additional glyphs and icons.

## Windows Terminal (WSL)

- Download a Nerd Font from the official website:

`https://www.nerdfonts.com/font-downloads`

- Popular recommended fonts for developers:

`JetBrainsMono Nerd Font, FiraCode Nerd Font, Hack Nerd Font, Meslo Nerd Font`

- Extract the downloaded .zip file:

`Right-click → Extract All`

- Install fonts (select all .ttf or .otf files):

`Right-click → Install or Install for all users`

- Open Windows Terminal settings:

`Ctrl + , (or click dropdown arrow → Settings)`

- Navigate to your WSL profile (e.g., "Ubuntu"):

`Profiles → Ubuntu (or your distro name)`

- Under "Appearance", set Font face:

`"JetBrainsMono Nerd Font" (or your chosen Nerd Font)`

- Save and restart Windows Terminal:

`Ctrl + S, then close and reopen`

## Verify Installation

- Check if icons display correctly in terminal:

`echo "  "`

- Test with eza (if installed):

`eza --icons`

- Test with Powerlevel10k:

`p10k configure`

- Check LazyVim icons:

`nvim (icons should display in file explorer and statusline)`

## Recommended Nerd Fonts

- JetBrainsMono Nerd Font (best for coding, ligatures):

`https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/JetBrainsMono.zip`

- FiraCode Nerd Font (popular, ligatures):

`https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/FiraCode.zip`

- Hack Nerd Font (clean, readable):

`https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/Hack.zip`

- Meslo Nerd Font (recommended by Powerlevel10k):

`https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/Meslo.zip`

- CascadiaCode Nerd Font (Windows Terminal default, patched):

`https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/CascadiaCode.zip`

## Quick Install (All Variants)

- Download specific font variant:

`wget https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/{{FontName}}.zip`

- Extract zip file:

`unzip {{FontName}}.zip -d ~/Downloads/{{FontName}}`

## Troubleshooting

- Icons show as boxes or question marks:

`Font is not properly installed or not selected in terminal`

- Icons are misaligned:

`Try a different Nerd Font or adjust font size`

- Font not appearing in Windows Terminal dropdown:

`Restart Windows Terminal after installing fonts`

- Some icons still missing:

`Ensure you downloaded Nerd Font (not regular font), version 3.0+`

## Alternative: Oh My Posh Font (Windows only)

- Install with Windows package manager:

`winget install --id=JanDeDobbeleer.OhMyPoshFont.CascadiaCode -e`

## VSCode Configuration (Bonus)

- Set terminal font in VSCode settings.json:

`"terminal.integrated.fontFamily": "JetBrainsMono Nerd Font"`

- Set editor font (optional):

`"editor.fontFamily": "JetBrainsMono Nerd Font"`
