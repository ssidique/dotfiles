import type { On } from 'claude-code'
import { describe, expect, test } from 'claude-code/testing'
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

async function scanned($: Engine) {
  const { text } = await $.command.run({ command: 'nvim-review-scan' })
  return JSON.parse(text ?? '[]')
}

describe('scan', () => {
  test('tracked and untracked markers, all from the repo root', async ($, on) => {
    const git = fakeGit(on, REPO)
    expect(await scanned($)).toEqual([
      { file: 'new.py', line: 1, text: 'add tests', code: '' },
      { file: 'src/a.py', line: 2, text: 'rename x', code: 'x = 1' },
    ])
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
    expect((await scanned($)).length).toBe(2)
    expect(git.calls.some(c => c.args.startsWith('diff def456'))).toBe(true)
  })

  test('falls back to HEAD when no base is found', async ($, on) => {
    const git = fakeGit(on, { ...REPO, 'symbolic-ref': null, 'merge-base': null, 'diff HEAD': DIFF })
    expect((await scanned($)).length).toBe(2)
  })

  test('not a git repo → no markers', async ($, on) => {
    fakeGit(on, {})
    expect(await scanned($)).toEqual([])
  })

  test('repo with no commits (diff fails) → no markers', async ($, on) => {
    fakeGit(on, { ...REPO, 'symbolic-ref': null, 'merge-base': null, diff: null })
    expect(await scanned($)).toEqual([])
  })
})
