-- Opens one review in a new tab: original (left, read-only) vs proposed (right,
-- editable). The answer lands in <dir>/decision, which the hook is waiting on.
return function(dir, name, title)
  -- Returns nothing; --remote-expr prints that as vim.NIL.
  local a_path, b_path = dir .. '/a/' .. name, dir .. '/b/' .. name
  local decided = false

  local function decide(lines)
    if decided then return end
    vim.fn.mkdir(dir, 'p')
    vim.fn.writefile(lines, dir .. '/decision')
    decided = true
  end

  vim.cmd('tabnew ' .. vim.fn.fnameescape(a_path))
  local a_buf = vim.api.nvim_get_current_buf()
  vim.bo[a_buf].readonly, vim.bo[a_buf].modifiable = true, false
  vim.cmd('diffthis')
  vim.wo.winbar = '%#DiffDelete# current %* ' .. title

  vim.cmd('vertical rightbelow split ' .. vim.fn.fnameescape(b_path))
  local b_buf = vim.api.nvim_get_current_buf()
  local tab = vim.api.nvim_get_current_tabpage()
  vim.cmd('diffthis')
  vim.wo.winbar = '%#DiffAdd# proposed %* :ClaudeAccept  ·  :ClaudeReject [reason]  (edit freely before accepting)'

  _G.claude_reviews = _G.claude_reviews or {}

  local function close()
    _G.claude_reviews[dir] = nil
    for _, buf in ipairs({ a_buf, b_buf }) do
      if vim.api.nvim_buf_is_valid(buf) then vim.api.nvim_buf_delete(buf, { force = true }) end
    end
  end

  -- The hook calls this when Claude Code cancels the wait, so no tab is left behind.
  _G.claude_reviews[dir] = function()
    decided = true
    close()
  end

  local group = vim.api.nvim_create_augroup('claude-review-' .. tab, { clear = true })
  vim.api.nvim_create_autocmd('TabClosed', {
    group = group,
    callback = function()
      if vim.api.nvim_tabpage_is_valid(tab) then return end
      vim.api.nvim_del_augroup_by_id(group)
      decide({ 'reject', 'closed the review without deciding' })
      vim.schedule(close)
    end,
  })

  for _, buf in ipairs({ a_buf, b_buf }) do
    vim.api.nvim_buf_create_user_command(buf, 'ClaudeAccept', function()
      vim.api.nvim_buf_call(b_buf, function() vim.cmd('silent write!') end)
      decide({ 'accept' })
      close()
    end, { desc = 'Accept the proposed change (with your edits)' })
    vim.api.nvim_buf_create_user_command(buf, 'ClaudeReject', function(opts)
      decide({ 'reject', opts.args })
      close()
    end, { nargs = '*', desc = 'Reject the proposed change, optionally saying why' })
    vim.api.nvim_create_autocmd('BufUnload', {
      buffer = buf,
      once = true,
      callback = function() decide({ 'reject', 'closed the review without deciding' }) end,
    })
  end
end
