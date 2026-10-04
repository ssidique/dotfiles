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

type Answers = Record<string, string | null>

// Answers each `git -c core.quotePath=false <args>` by the LAST key its args start with, so an
// override spread after ...REPO beats REPO's own key; null or no key → exit 1. Records every call's argv and cwd.
function fakeGit(on: On, answers: Answers): { calls: { args: string; cwd?: string }[] } {
  const calls: { args: string; cwd?: string }[] = []
  on('process.run', (_$, e) => {
    const args = e.argv.slice(3).join(' ')
    calls.push({ args, cwd: e.init?.cwd })
    const key = Object.keys(answers).filter(k => args.startsWith(k)).at(-1)
    const out = key === undefined ? null : answers[key]
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
  'rev-parse --show-toplevel': `${ROOT}\n`,
  'symbolic-ref --short refs/remotes/origin/HEAD': 'origin/main\n',
  'merge-base HEAD origin/main': 'abc123\n',
  'diff abc123': DIFF,
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
  await $.command.run({ command: 'nvim-review' })
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
      'diff def456': DIFF,
    })
    expect(await reviewText($, on)).toContain('src/a.py:2')
    expect(git.calls.some(c => c.args.startsWith('diff def456'))).toBe(true)
  })

  test('falls back to HEAD when no base is found', async ($, on) => {
    fakeGit(on, { ...REPO, 'symbolic-ref': null, 'merge-base': null, 'diff HEAD': DIFF })
    expect(await reviewText($, on)).toContain('src/a.py:2')
  })

  test('not a git repo → says so, submits nothing', async ($, on) => {
    fakeGit(on, {})
    let submitted = false
    on('prompt.submit', () => {
      submitted = true
      return { drop: 'x' }
    })
    const { text } = await $.command.run({ command: 'nvim-review' })
    expect(text).toBe('No CLAUDE: comments found in changed files.')
    expect(submitted).toBe(false)
  })

  test('repo with no commits (diff fails) → submits nothing', async ($, on) => {
    fakeGit(on, { ...REPO, 'symbolic-ref': null, 'merge-base': null, diff: null })
    expect(await reviewText($, on)).toBe(undefined)
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
    props: { hasSurvey: false, isWorking: false },
  } as const

  test('shows the count once a scan found markers', async ($, on) => {
    fakeGit(on, REPO)
    mock.clock(on)
    await $.command.run({ command: 'nvim-review' }) // the command's rescan fills the state
    const ui = await $.ui.mount(BAND)
    expect(await ui.find({ type: 'Text', text: 'review: 2 comments in 2 files — /nvim-review' })).toBeDefined()
    await ui.unmount()
  })

  test('draws nothing with no markers', async ($, on) => {
    fakeGit(on, {})
    // stands in for the engine's own band, which the plugin hands over to
    on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
      const { Text } = $.ui.resolve(e)
      return h(Text, null, 'engine band')
    })
    const ui = await $.ui.mount(BAND)
    expect(await ui.find({ type: 'Text', text: /review:/ })).toBe(undefined)
    expect(await ui.find({ type: 'Text', text: 'engine band' })).toBeDefined()
    await ui.unmount()
  })
})
