-- Opens a branch review: <base> against the working tree, in diffview when it
-- loads, else one diff tab per file plus a quickfix list. :ClaudeAccept,
-- :ClaudeReject and :ClaudeReview answer it by writing <dir>/decision, which
-- the hook is waiting on. Returns nothing; --remote-expr prints that as vim.NIL.
return function(o)
  local decided, tabs, scratch = false, {}, {}
  _G.claude_reviews = _G.claude_reviews or {}

  local function decide(lines)
    if decided then return end
    vim.fn.mkdir(o.dir, 'p')
    vim.fn.writefile(lines, o.dir .. '/decision')
    decided = true
  end

  local function close()
    _G.claude_reviews[o.dir] = nil
    if _G.claude_pr_review and _G.claude_pr_review.dir == o.dir then _G.claude_pr_review = nil end
    for _, tab in ipairs(tabs) do
      if vim.api.nvim_tabpage_is_valid(tab) then
        vim.api.nvim_set_current_tabpage(tab)
        if vim.t.claude_diffview and vim.fn.exists(':DiffviewClose') == 2 then
          vim.cmd('DiffviewClose')
        else
          vim.cmd('tabclose')
        end
      end
    end
    for _, buf in ipairs(scratch) do
      if vim.api.nvim_buf_is_valid(buf) then vim.api.nvim_buf_delete(buf, { force = true }) end
    end
  end

  -- Save what the user edited in this repo, so the hook sees it on disk.
  local function save_repo_buffers()
    for _, buf in ipairs(vim.api.nvim_list_bufs()) do
      local name = vim.api.nvim_buf_get_name(buf)
      if vim.bo[buf].modified and vim.bo[buf].buftype == '' and vim.startswith(name, o.repo .. '/') then
        vim.api.nvim_buf_call(buf, function() vim.cmd('silent write') end)
      end
    end
  end

  local function finish(lines)
    save_repo_buffers()
    decide(lines)
    close()
  end

  _G.claude_reviews[o.dir] = function()
    decided = true
    close()
  end
  _G.claude_pr_review = { dir = o.dir, finish = finish }

  for name, verdict in pairs({ ClaudeAccept = 'accept', ClaudeReject = 'reject', ClaudeReview = 'review' }) do
    vim.api.nvim_create_user_command(name, function(a)
      if not _G.claude_pr_review then return vim.notify('No Claude review is waiting', vim.log.levels.WARN) end
      _G.claude_pr_review.finish({ verdict, a.args })
    end, { nargs = '*', force = true })
  end

  pcall(function() require('lazy').load({ plugins = { 'diffview.nvim' } }) end)
  local files = table.concat(vim.tbl_map(vim.fn.fnameescape, o.paths), ' ')

  if vim.fn.exists(':DiffviewOpen') == 2 then
    vim.cmd(('DiffviewOpen -C%s %s -- %s'):format(vim.fn.fnameescape(o.repo), o.base, files))
    vim.t.claude_diffview = true
    table.insert(tabs, vim.api.nvim_get_current_tabpage())
  else
    -- Code first, then tests, then docs: the order a reviewer wants to read them.
    local function rank(p)
      if p:match('%.md$') or p:match('%.rst$') or p:match('^docs/') then return 2 end
      if p:match('^tests?/') or p:match('test_[^/]*$') or p:match('_test%.') then return 1 end
      return 0
    end
    local paths = vim.deepcopy(o.paths)
    table.sort(paths, function(a, b)
      if rank(a) ~= rank(b) then return rank(a) < rank(b) end
      return a < b
    end)
    local qf = {}
    for _, p in ipairs(paths) do
      local full = o.repo .. '/' .. p
      vim.cmd('tabnew')
      table.insert(tabs, vim.api.nvim_get_current_tabpage())
      local base = vim.api.nvim_get_current_buf()
      table.insert(scratch, base)
      local old = vim.fn.systemlist({ 'git', '-C', o.repo, 'show', o.base .. ':' .. p })
      if vim.v.shell_error ~= 0 then old = {} end
      vim.api.nvim_buf_set_lines(base, 0, -1, false, old)
      vim.bo[base].buftype, vim.bo[base].modifiable = 'nofile', false
      vim.bo[base].filetype = vim.filetype.match({ filename = p }) or ''
      vim.cmd('diffthis')
      vim.wo.winbar = '%#DiffDelete# base %* ' .. p
      vim.cmd('vertical rightbelow split ' .. vim.fn.fnameescape(full))
      vim.cmd('diffthis')
      vim.wo.winbar = '%#DiffAdd# working tree %* :ClaudeAccept · :ClaudeReject [why] · :ClaudeReview [note]'
      table.insert(qf, { filename = full, lnum = 1, text = ({ 'code', 'test', 'docs' })[rank(p) + 1] })
    end
    vim.fn.setqflist({}, ' ', { title = o.title, items = qf })
    if #tabs > 0 then vim.api.nvim_set_current_tabpage(tabs[1]) end
  end

  local group = vim.api.nvim_create_augroup('claude-pr-review', { clear = true })
  vim.api.nvim_create_autocmd('TabClosed', {
    group = group,
    callback = function()
      for _, tab in ipairs(tabs) do
        if vim.api.nvim_tabpage_is_valid(tab) then return end
      end
      vim.api.nvim_del_augroup_by_id(group)
      decide({ 'closed' })
      vim.schedule(close)
    end,
  })

  vim.notify(o.title .. '\n:ClaudeAccept  ·  :ClaudeReject [why]  ·  :ClaudeReview [note]', vim.log.levels.INFO)
end
