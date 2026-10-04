import type { On } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const ROOT = '/repo'

const DIFF = [
  'diff --git a/src/a.py b/src/a.py',
  '--- a/src/a.py',
  '+++ b/src/a.py',
  '@@ -1,0 +2,1 @@',
  '+x = 1  # CLAUDE: rename x',
  '',
].join('\n')

const REVIEW = {
  command: 'nvim-review',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 120 },
} as const

type Answers = Record<string, string | null>

// Answers each `git -c core.quotePath=false <args>` by the LAST key its args start with, so an
// override spread after ...REPO beats REPO's own key; null or no key → exit 1. Records every call's argv and cwd.
type GitCall = { args: string; cwd?: string }

function fakeGit(on: On, answers: Answers): { calls: GitCall[] } {
  const calls: GitCall[] = []
  on('process.run', (_$, e) => {
    const args = e.argv.slice(3).join(' ')
    calls.push({ args, cwd: e.init?.cwd })
    const key = Object.keys(answers).filter(k => args.startsWith(k)).at(-1)
    const out = key === undefined ? null : answers[key]
    if (out === 'THROW') throw new Error('spawn failed')
    return {
      value: {
        exitCode: out === null || out === undefined ? 1 : 0,
        stdout: out ?? '',
        stderr: '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }
  })
  return { calls }
}

const REPO: Answers = {
  'rev-parse --show-toplevel HEAD': `${ROOT}\nhead1\n`,
  'symbolic-ref --short refs/remotes/origin/HEAD': 'origin/main\n',
  'merge-base HEAD origin/main': 'abc123\n',
  'diff-index': DIFF,
  'ls-files': 'new.py\0',
  grep: 'new.py\x001\x00# CLAUDE: add tests\n',
}

// Runs /nvim-review; returns the prompt it submitted, or undefined if it submitted none.
async function reviewText($: Engine, on: On): Promise<string | undefined> {
  let submitted: string | undefined
  on('prompt.submit', (_$, e) => {
    submitted = e.text
    return { drop: 'captured by test' }
  })
  const clock = mock.clock(on)
  await $.command.run(REVIEW)
  await clock.advance(1) // the submit is deferred past the command's own hook
  return submitted
}

describe('scan', () => {
  test('tracked and untracked markers, all from the repo root', async ($, on) => {
    const git = fakeGit(on, REPO)
    const prompt = await reviewText($, on)
    expect(prompt).toContain('- `new.py:1` — add tests')
    expect(prompt).toContain('- `src/a.py:2` — rename x (on: `x = 1`)')
    expect(git.calls.slice(1).every(c => c.cwd === ROOT)).toBe(true)
  })

  test('falls back to main when origin/HEAD is unset', async ($, on) => {
    const git = fakeGit(on, {
      ...REPO,
      'symbolic-ref': null,
      'merge-base HEAD origin/main': null,
      'merge-base HEAD main': 'def456\n',
    })
    expect(await reviewText($, on)).toContain('src/a.py:2')
    expect(git.calls.some(c => c.args.startsWith('diff-index') && c.args.endsWith(' def456'))).toBe(true)
  })

  test('falls back to HEAD when no base is found', async ($, on) => {
    const git = fakeGit(on, { ...REPO, 'symbolic-ref': null, 'merge-base': null })
    expect(await reviewText($, on)).toContain('src/a.py:2')
    expect(git.calls.some(c => c.args.startsWith('diff-index') && c.args.endsWith(' HEAD'))).toBe(true)
  })

  test('not a git repo → says so, submits nothing', async ($, on) => {
    fakeGit(on, {})
    let submitted = false
    on('prompt.submit', () => {
      submitted = true
      return { drop: 'x' }
    })
    const { text } = await $.command.run(REVIEW)
    expect(text).toBe('No CLAUDE: comments found in changed files.')
    expect(submitted).toBe(false)
  })

  test('repo with no commits (diff fails) → submits nothing', async ($, on) => {
    fakeGit(on, { ...REPO, 'symbolic-ref': null, 'merge-base': null, 'diff-index': null })
    expect(await reviewText($, on)).toBe(undefined)
  })
})

describe('scan robustness', () => {
  test('reads tracked changes with plumbing diff-index, never porcelain diff', async ($, on) => {
    const git = fakeGit(on, REPO)
    await reviewText($, on)
    expect(git.calls.map(c => c.args)).toContain(
      'diff-index -p -U1 -M -GCLAUDE: --no-color --src-prefix=a/ --dst-prefix=b/ abc123',
    )
    expect(git.calls.some(c => c.args.startsWith('diff '))).toBe(false)
  })

  test('a failed untracked search keeps the tracked markers', async ($, on) => {
    fakeGit(on, { ...REPO, grep: 'THROW' })
    const prompt = await reviewText($, on)
    expect(prompt).toContain('src/a.py:2')
    expect(prompt).not.toContain('new.py')
  })

  test('untracked files are searched in batches', async ($, on) => {
    const files = Array.from({ length: 250 }, (_, i) => `f${i}.py`)
    const git = fakeGit(on, { ...REPO, 'ls-files': files.join('\0') + '\0' })
    await reviewText($, on)
    expect(git.calls.filter(c => c.args.startsWith('grep')).length).toBe(3)
  })

  test('a failed submit is reported, not swallowed', async ($, on) => {
    fakeGit(on, REPO)
    const toasts: string[] = []
    on('ui.toast', (_$, e) => {
      toasts.push(e.text)
      return { value: undefined }
    })
    on('prompt.submit', () => {
      throw new Error('refused')
    })
    const clock = mock.clock(on)
    await $.command.run(REVIEW)
    await clock.advance(1)
    expect(toasts.some(t => t.startsWith('nvim-review: could not send'))).toBe(true)
  })
})

describe('rescanning', () => {
  const START = { cwd: ROOT, surface: 'terminal', isInteractive: true } as const
  const scans = (git: { calls: { args: string }[] }) =>
    git.calls.filter(c => c.args.startsWith('diff-index')).length

  // the engine's own session start and command registry, beneath the plugin
  function engineStart(on: On) {
    on('session.start', (_$, e) => ({ cwd: e.cwd }))
    on('command.register', (_$, e) => ({ value: { command: e.name } }))
  }

  test('scans once at session start, then never while idle', async ($, on) => {
    const git = fakeGit(on, REPO)
    const clock = mock.clock(on)
    engineStart(on)
    await $.session.start(START)
    await clock.advance(1)
    expect(scans(git)).toBe(1)
    await clock.advance(10 * 60 * 1000)
    expect(scans(git)).toBe(1)
  })

  test('a submitted prompt rescans', async ($, on) => {
    const git = fakeGit(on, REPO)
    const clock = mock.clock(on)
    engineStart(on)
    on('prompt.submit', () => ({ drop: 'x' }))
    await $.session.start(START)
    await clock.advance(1)
    await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })
    await clock.advance(1)
    expect(scans(git)).toBe(2)
  })

  test('a finished turn rescans', async ($, on) => {
    const git = fakeGit(on, REPO)
    const clock = mock.clock(on)
    engineStart(on)
    on('turn.complete', () => ({ text: '' }))
    await $.session.start(START)
    await clock.advance(1)
    await $.turn.complete({ turnId: 't1', answer: '', durationMs: 1, isAborted: false, reason: 'answer' })
    await clock.advance(1)
    expect(scans(git)).toBe(2)
  })

  test('non-interactive sessions never scan in the background', async ($, on) => {
    const git = fakeGit(on, REPO)
    const clock = mock.clock(on)
    engineStart(on)
    on('prompt.submit', () => ({ drop: 'x' }))
    await $.session.start({ ...START, isInteractive: false })
    await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })
    await clock.advance(60000)
    expect(scans(git)).toBe(0)
  })

  test('the branch base is looked up once per HEAD', async ($, on) => {
    const git = fakeGit(on, REPO)
    on('prompt.submit', () => ({ drop: 'x' }))
    const clock = mock.clock(on)
    await $.command.run(REVIEW)
    await clock.advance(1)
    await $.command.run(REVIEW)
    expect(git.calls.filter(c => c.args.startsWith('merge-base')).length).toBe(1)
  })
})

describe('commit guard', () => {
  test('denies git commit while markers are pending', async ($, on) => {
    fakeGit(on, REPO)
    const ran = await $.tool.call({ tool: 'Bash', command: 'git commit -m wip' })
    expect(ran.deny).toContain('2 CLAUDE: review comments unaddressed (new.py:1, src/a.py:2)')
  })

  test('lets other commands through without scanning', async ($, on) => {
    const git = fakeGit(on, REPO)
    on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: 'ok', stderr: '', interrupted: false } }))
    const ran = await $.tool.call({ tool: 'Bash', command: 'git status' })
    expect(ran.isError).not.toBe(true)
    expect(git.calls.some(c => c.args.startsWith('diff'))).toBe(false)
  })

  test('lets git commit through with no markers', async ($, on) => {
    fakeGit(on, {})
    on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: 'ok', stderr: '', interrupted: false } }))
    const ran = await $.tool.call({ tool: 'Bash', command: 'git commit -m x' })
    expect(ran.isError).not.toBe(true)
  })
})

describe('band', () => {
  const BAND = {
    plugin: 'nvim-review',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: {
      hasSurvey: false,
      isWorking: false,
      maxRows: 10,
      bodyColumns: 120,
      scroll: { offset: 0, bodyRows: 10 },
      view: {},
    },
  } as const

  test('shows the count once a scan found markers', async ($, on) => {
    fakeGit(on, REPO)
    mock.clock(on)
    await $.command.run(REVIEW) // the command's rescan fills the state
    const ui = await $.ui.mount(BAND)
    expect(await ui.find({ type: 'Text', text: 'review: 2 comments in 2 files — /nvim-review' })).toBeDefined()
    await ui.unmount()
  })

  test('draws nothing with no markers', async ($, on) => {
    fakeGit(on, {})
    // stands in for the engine's own band, which the plugin hands over to
    on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
      const { Text } = $.ui.resolve(e)
      return <Text>engine band</Text>
    })
    const ui = await $.ui.mount(BAND)
    expect(await ui.find({ type: 'Text', text: /review:/ })).toBe(undefined)
    expect(await ui.find({ type: 'Text', text: 'engine band' })).toBeDefined()
    await ui.unmount()
  })
})
