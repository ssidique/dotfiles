local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not (vim.uv or vim.loop).fs_stat(lazypath) then
  local lazyrepo = "https://github.com/folke/lazy.nvim.git"
  local out = vim.fn.system({ "git", "clone", "--filter=blob:none", "--branch=stable", lazyrepo, lazypath })
  if vim.v.shell_error ~= 0 then
    vim.api.nvim_echo({
      { "Failed to clone lazy.nvim:\n", "ErrorMsg" },
      { out, "WarningMsg" },
      { "\nPress any key to exit..." },
    }, true, {})
    vim.fn.getchar()
    os.exit(1)
  end
end
vim.opt.rtp:prepend(lazypath)

require("lazy").setup({
  spec = {
    -- add LazyVim and import its plugins
    { "LazyVim/LazyVim", import = "lazyvim.plugins" },

    -- Recommended Extras for productivity

    -- UI improvements (must come before outline)
    { import = "lazyvim.plugins.extras.ui.edgy" },            -- Better window management

    -- Editor enhancements
    { import = "lazyvim.plugins.extras.editor.outline" },     -- Better code outline/navigation
    { import = "lazyvim.plugins.extras.editor.telescope" },   -- Telescope fuzzy finder (if not default)

    -- Coding enhancements
    { import = "lazyvim.plugins.extras.coding.luasnip" },     -- Snippet engine
    { import = "lazyvim.plugins.extras.coding.yanky" },       -- Better yank/paste management

    -- Git integration
    { import = "lazyvim.plugins.extras.util.project" },       -- Project management

    -- Formatting
    { import = "lazyvim.plugins.extras.formatting.prettier" }, -- Prettier for JS/TS/etc

    -- Language support (add languages you use)
    { import = "lazyvim.plugins.extras.lang.json" },          -- JSON support
    { import = "lazyvim.plugins.extras.lang.markdown" },      -- Enhanced markdown
    { import = "lazyvim.plugins.extras.lang.python" },        -- Python support (example)
    { import = "lazyvim.plugins.extras.lang.docker" },        -- Docker support
    { import = "lazyvim.plugins.extras.lang.git" },           -- Git file support

    -- import/override with your plugins
    { import = "plugins" },
  },
  defaults = {
    -- By default, only LazyVim plugins will be lazy-loaded. Your custom plugins will load during startup.
    -- If you know what you're doing, you can set this to `true` to have all your custom plugins lazy-loaded by default.
    lazy = false,
    -- It's recommended to leave version=false for now, since a lot the plugin that support versioning,
    -- have outdated releases, which may break your Neovim install.
    version = false, -- always use the latest git commit
    -- version = "*", -- try installing the latest stable version for plugins that support semver
  },
  install = { colorscheme = { "tokyonight", "habamax" } },
  checker = {
    enabled = true, -- check for plugin updates periodically
    notify = false, -- notify on update
  }, -- automatically check for plugin updates
  performance = {
    rtp = {
      -- disable some rtp plugins
      disabled_plugins = {
        "gzip",
        -- "matchit",
        -- "matchparen",
        -- "netrwPlugin",
        "tarPlugin",
        "tohtml",
        "tutor",
        "zipPlugin",
      },
    },
  },
})
