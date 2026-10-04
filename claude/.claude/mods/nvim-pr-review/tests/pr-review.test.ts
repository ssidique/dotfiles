import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const SOCKET = '/run/user/1000/nvim.1.0'

type World = {
  prints: string
  stash: string
  headTree: string
  edits: string
  editedFiles: string
  decisions: string[]
  nvim?: boolean
  nowDecision?: string
  /** The test brings its own clock (mock.clock), for the timer the mid-task review polls on. */
  ownClock?: true
}

/** Git, nvim and the helper scripts, answered from `w`; records what reached nvim and whether bash ran. */
function fake(on: On, w: World) {
  const seen = { opened: [] as string[], bashRan: [] as string[], gitCalls: 0, events: [] as string[], prompts: [] as string[], returned: 0 }
  const out = (stdout: string, exitCode = 0) => ({
    value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  })

  on('session.cwd', () => ({ value: '/repo' }))
  if (!w.ownClock) on('clock.now', () => ({ value: 1_000 }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('prompt.submit', ($, e) => (seen.prompts.push(e.text), { text: e.text }))
  on('fs.read', ($, e) => {
    if (!e.path.endsWith('/decision')) return { value: 'x = 1\n' }
    if (!w.nowDecision) throw new Error(`ENOENT ${e.path}`)
    return { value: w.nowDecision }
  })
  on('fs.write', ($, e) => (seen.events.push(`write ${e.path}`), { value: undefined }))
  on('process.run', ($, e) => {
    const [cmd, a1 = '', ...rest] = e.argv
    const args = [a1, ...rest].join(' ')
    if (cmd === 'git') {
      seen.gitCalls += 1
      const g = rest.slice(1).join(' ')
      if (g === 'rev-parse --show-toplevel') return out('/repo\n')
      if (g.startsWith('rev-parse --verify')) return out('', 1)
      if (g.startsWith('symbolic-ref')) return out('origin/main\n')
      if (g.startsWith('merge-base')) return out('base1\n')
      if (g === 'rev-parse --abbrev-ref HEAD') return out('feat\n')
      if (g === 'stash create') return out(w.stash)
      if (g === 'rev-parse HEAD') return out('head1\n')
      if (g.endsWith('^{tree}')) return out(g.startsWith('rev-parse HEAD') ? w.headTree : 'tree-of-worktree\n')
      if (g.startsWith('diff --name-only')) return out(w.editedFiles)
      if (g.startsWith('diff')) return out(w.edits)
    }
    if (cmd === 'sh' && a1.endsWith('fingerprints.sh')) return out(w.prints)
    if (cmd === 'sh' && a1.endsWith('find-nvim.sh')) return out(w.nvim === false ? '' : `${SOCKET}\t/repo\n`)
    if (cmd === 'sh' && a1.endsWith('focus-tmux.sh')) return out('')
    if (cmd === 'sh' && a1.endsWith('return-tmux.sh')) {
      seen.returned += 1
      return out('')
    }
    if (cmd === 'sh' && a1.endsWith('wait-decision.sh')) return out(w.decisions.shift() ?? 'dead\n')
    if (cmd === 'nvim') {
      seen.opened.push(args)
      seen.events.push(`nvim ${args}`)
      return out('')
    }
    throw new Error(`unexpected command: ${e.argv.join(' ')}`)
  })
  on('tool.call', ($, e) => {
    seen.bashRan.push(String((e as { command?: string }).command ?? e.tool))
    return { result: { stdout: 'https://github.com/x/y/pull/1', stderr: '', interrupted: false } } as never
  })

  return seen
}

const base: World = {
  prints: 'src/a.py\th1\ntests/test_a.py\th2\n',
  stash: '',
  headTree: 'tree-head\n',
  edits: '',
  editedFiles: '',
  decisions: [],
}
const pr = { tool: 'Bash', command: 'git push -u origin feat && gh pr create --title t --body b' } as const

test('commands other than gh pr create run untouched', async ($, on) => {
  const seen = fake(on, { ...base })
  await $.tool.call({ tool: 'Bash', command: 'pytest -q' })

  expect(seen.bashRan).toEqual(['pytest -q'])
  expect(seen.gitCalls).toBe(0)
})

test('an accept with no edits lets the PR through and returns to Claude Code', async ($, on) => {
  const seen = fake(on, { ...base, decisions: ['accept\n\n'] })
  await $.tool.call(pr)

  expect(seen.bashRan).toEqual([pr.command])
  expect(seen.returned).toBe(1)
  expect(seen.opened.join()).toContain('src/a.py')
})

test('a rejection blocks the PR and passes the reason on', async ($, on) => {
  const seen = fake(on, { ...base, decisions: ['reject\nsplit this into two PRs\n'] })
  const ran = await $.tool.call(pr)

  expect(seen.bashRan).toEqual([])
  expect(String(ran.deny)).toContain('split this into two PRs')
})

test('a review hands Claude the note and the user’s diff', async ($, on) => {
  const seen = fake(on, {
    ...base,
    stash: 'snap1\n',
    edits: '-x = 1\n+x = 2\n',
    editedFiles: 'src/a.py\n',
    decisions: ['review\ncheck the callers\n'],
  })
  const ran = await $.tool.call(pr)

  expect(seen.bashRan).toEqual([])
  expect(String(ran.deny)).toContain('check the callers')
  expect(String(ran.deny)).toContain('+x = 2')
})

test('waiting has no deadline: rounds that end with "again" keep waiting', async ($, on) => {
  const seen = fake(on, { ...base, decisions: ['again\n', 'again\n', 'accept\n\n'] })
  await $.tool.call(pr)

  expect(seen.bashRan).toEqual([pr.command])
})

test('nvim exiting mid-review blocks the PR without calling it a rejection', async ($, on) => {
  fake(on, { ...base, decisions: ['dead\n'] })
  const ran = await $.tool.call(pr)

  expect(String(ran.deny)).toContain('nvim exited')
})

test('accepting with edits asks for a commit, then lets that exact tree through unreviewed', async ($, on) => {
  const w: World = { ...base, edits: '+y\n', editedFiles: 'src/a.py\n', decisions: ['accept\n\n'] }
  const seen = fake(on, w)
  const first = await $.tool.call(pr)
  expect(String(first.deny)).toContain('Commit their edits')

  w.headTree = 'tree-of-worktree\n'
  const opened = seen.opened.length
  await $.tool.call(pr)

  expect(seen.bashRan).toEqual([pr.command])
  expect(seen.opened.length).toBe(opened)
})

test('a second review opens only the files changed since the first', async ($, on) => {
  const w: World = { ...base, decisions: ['reject\nnot yet\n', 'accept\n\n'] }
  const seen = fake(on, w)
  await $.tool.call(pr)

  w.prints = 'src/a.py\th1-changed\ntests/test_a.py\th2\n'
  await $.tool.call(pr)

  const second = seen.opened.filter(a => a.includes('pr-review.lua')).at(-1) ?? ''
  expect(second).toContain('src/a.py')
  expect(second).not.toContain('tests/test_a.py')
  expect(second).toContain('1 of 2 files changed since your last review')
})

test('with no nvim running the PR is held, not created unreviewed', async ($, on) => {
  const seen = fake(on, { ...base, nvim: false })
  const ran = await $.tool.call(pr)

  expect(seen.bashRan).toEqual([])
  expect(String(ran.deny)).toContain('no running nvim')
})

test('per-edit review is off by default', async ($, on) => {
  const seen = fake(on, { ...base })
  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/a.py', old_string: 'x = 1', new_string: 'x = 2' })

  expect(seen.bashRan).toEqual(['Edit'])
  expect(seen.opened).toEqual([])
})

test('every review folder exists before nvim is asked to write into it', async ($, on) => {
  const seen = fake(on, { ...base, decisions: ['accept\n\n'] })
  const now = await $.command.run({ command: 'nvim-pr-review', args: 'now' } as never)
  await $.tool.call(pr)

  expect(String((now as { text?: string }).text)).toContain('Opened 2 files')
  const opens = seen.events.filter(ev => ev.includes('pr-review.lua'))
  expect(opens.length).toBe(2)
  for (const open of opens) {
    const dir = open.match(/"dir": ?"([^"]+)"/)?.[1] ?? 'missing'
    const madeAt = seen.events.findIndex(ev => ev.startsWith(`write ${dir}/`))
    expect(madeAt).toBeGreaterThanOrEqual(0)
    expect(madeAt).toBeLessThan(seen.events.indexOf(open))
  }
})

test('a bare /nvim-pr-review opens the review; status is its own subcommand', async ($, on) => {
  const seen = fake(on, { ...base })
  const bare = await $.command.run({ command: 'nvim-pr-review', args: '' } as never)
  const status = await $.command.run({ command: 'nvim-pr-review', args: 'status' } as never)

  expect(String((bare as { text?: string }).text)).toContain('Opened 2 files')
  expect(seen.opened.filter(a => a.includes('pr-review.lua')).length).toBe(1)
  expect(String((status as { text?: string }).text)).toContain('PR gate: on')
})

test('a mid-task accept reaches Claude by itself, back in the Claude Code pane', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000 })
  const seen = fake(on, { ...base, nowDecision: 'accept\n\n', ownClock: true })
  await $.command.run({ command: 'nvim-pr-review', args: '' } as never)
  await clock.advance(1_000)

  expect(seen.prompts.length).toBe(1)
  expect(seen.prompts[0]).toContain('approved the branch')
  expect(seen.returned).toBe(1)
})
