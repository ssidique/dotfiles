# nvim-review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Claude Code mod that finds `CLAUDE:` review markers in changed files, shows their count above the prompt, sends them to Claude with `/nvim-review`, and blocks Claude's `git commit` while any are pending.

**Architecture:** Pure parsing lives in `hooks/markers.ts` (diff text and git-grep text → source lines → markers, plus every user-facing string). `hooks/scan.ts` makes the git calls through `$.process.run` and feeds the parsers. `hooks/register.tsx` wires four hooks: a 2 s poll into a `$.state` atom, the `AbovePrompt` band that reads it, the `/nvim-review` command, and a `tool.call` guard on Bash.

**Tech Stack:** Claude Code function-hooks plugin API (TypeScript/TSX, `claude-code` + `claude-code/testing`), git.

**Spec:** `SPEC.md` beside this file.

## Global Constraints

- Mod folder: `/home/ssidique/.claude/dev-mods/bacc20aa-99aa-4ce4-9224-55c3d204bdee/nvim-review/` (called `$MOD` below). Hot reloading is enabled for this session: every saved file reloads the mod when the turn ends.
- Plugin name `nvim-review`, version `0.1.0`; the `$.state` key is `nvim-review` / `markers`.
- Marker: `CLAUDE:` uppercase, after one of `#`, `//`, `--`, `;`, `/*`, `<!--`, `*`.
- Poll period 2000 ms. Command name `nvim-review`.
- Every git call: `git -c core.quotePath=false …`, run from the repo root.
- The module runs with no Node and no DOM; everything external goes through `$`. No `import()`.
- API reference (grep it, don't read it whole): `$MOD/.claude-plugin/types/claude-code/index.d.ts` once the mod has loaded, before that `/tmp/claude-1000/bundled-skills/2.1.289/99639a35a2a0f87cd93aabc54f094a27/plugin-authoring/types/claude-code.d.ts`.

## Review Focus

1. **A removed line that starts `-- ` or an added line that starts `++ `** prints as `--- …` / `+++ …` inside a hunk. It must not be read as a file header. Pinned in Task 1 (`parseDiff` ignores header-shaped lines inside hunks).
2. **A file name with a space**: git ends its `+++ b/name` line with a TAB. The path must come out without it. Pinned in Task 1.
3. **A session started in a subdirectory**: `git diff` prints root-relative paths, while `ls-files`/`grep` print cwd-relative ones. Everything must run from the toplevel so the paths agree. Pinned in Task 2 (the fake asserts `cwd`).
4. **Not a git repo, or a repo with no commits**: the band stays hidden, `/nvim-review` says "No CLAUDE: comments", and commits are never blocked. Pinned in Task 2 and Task 3.
5. **A marker in a deleted line or an unchanged context line** must not count, since only `+` lines are new comments. Pinned in Task 1.

---

### Task 1: Scaffold + pure marker parsing

**Files:**
- Create: `$MOD/.claude-plugin/plugin.json`, `$MOD/hooks/hooks.json`, `$MOD/types/index.d.ts`, `$MOD/hooks/markers.ts`, `$MOD/hooks/register.tsx` (empty register for now)
- Test: `$MOD/tests/markers.test.ts`

**Interfaces:**
- Produces (from `hooks/markers.ts`):
  - `type SourceLine = { file: string; line: number; content: string; isAdded: boolean }`
  - `parseMarkerLine(line: string): { text: string; code: string; isOwnLine: boolean } | undefined`
  - `parseDiff(diff: string): SourceLine[]`
  - `parseGrep(out: string): SourceLine[]`
  - `collectMarkers(lines: readonly SourceLine[]): Marker[]` (sorted by file, then line)
  - `isCommit(command: string): boolean`
  - `countLabel(markers: readonly Marker[]): string`, e.g. `3 comments in 2 files`
  - `bandLabel(markers: readonly Marker[]): string`
  - `buildReviewPrompt(markers: readonly Marker[]): string`
  - `commitDenial(markers: readonly Marker[]): string`
- Produces (from `types/index.d.ts`): `type Marker = { file: string; line: number; text: string; code: string }`

- [ ] **Step 1: Scaffold and put the folder under git**

`$MOD/.claude-plugin/plugin.json`:
```json
{
  "name": "nvim-review",
  "version": "0.1.0",
  "description": "Address CLAUDE: review comments left in changed files",
  "types": "./types/index.d.ts"
}
```

`$MOD/hooks/hooks.json`:
```json
{ "modules": ["./register.tsx"] }
```

`$MOD/types/index.d.ts`:
```ts
export type Marker = { file: string; line: number; text: string; code: string }

declare module 'claude-code' {
  interface PluginState {
    'nvim-review': { markers: Marker[] }
  }
}
```

`$MOD/hooks/register.tsx` (placeholder until Task 3):
```tsx
import type { Register } from 'claude-code'

export const register: Register = () => {}
```

```bash
cd $MOD && git init -q && printf '.claude-plugin/types/\ntsconfig.json\n' > .gitignore
```
(The engine writes `.claude-plugin/types/` and the generated `tsconfig.json`, so neither belongs in git.)

- [ ] **Step 2: Write the failing tests**

`$MOD/tests/markers.test.ts`:
```ts
import { describe, expect, test } from 'claude-code/testing'

import {
  bandLabel,
  buildReviewPrompt,
  collectMarkers,
  commitDenial,
  countLabel,
  isCommit,
  parseDiff,
  parseGrep,
  parseMarkerLine,
} from '../hooks/markers'

describe('parseMarkerLine', () => {
  test('every comment leader', () => {
    for (const leader of ['#', '//', '--', ';', '/*', '<!--', '*']) {
      expect(parseMarkerLine(`    ${leader} CLAUDE: fix it`)).toEqual({
        text: 'fix it',
        code: '',
        isOwnLine: true,
      })
    }
  })

  test('trailing marker keeps the code before it', () => {
    expect(parseMarkerLine('return parse(data)  # CLAUDE: handle empty file')).toEqual({
      text: 'handle empty file',
      code: 'return parse(data)',
      isOwnLine: false,
    })
  })

  test('strips closing */ and -->', () => {
    expect(parseMarkerLine('/* CLAUDE: one */')?.text).toBe('one')
    expect(parseMarkerLine('<!-- CLAUDE: two -->')?.text).toBe('two')
  })

  test('ignores lowercase, empty text, and no comment leader', () => {
    expect(parseMarkerLine('# claude: nope')).toBe(undefined)
    expect(parseMarkerLine('# CLAUDE:   ')).toBe(undefined)
    expect(parseMarkerLine('x = "CLAUDE: not a comment"')).toBe(undefined)
  })
})

const DIFF = [
  'diff --git a/src/a.py b/src/a.py',
  'index 1111111..2222222 100644',
  '--- a/src/a.py',
  '+++ b/src/a.py',
  '@@ -10,2 +10,4 @@ def load(path):',
  ' def load(path):',
  '+    # CLAUDE: use model_loader',
  '+    # CLAUDE: instead of open()',
  '     data = open(path).read()',
  '@@ -40 +42,2 @@',
  '--- removed sql comment # CLAUDE: deleted',
  '+++ added line starting with plus plus',
  '+    return parse(data)  # CLAUDE: handle empty file',
  'diff --git a/my notes.md b/my notes.md',
  'new file mode 100644',
  '--- /dev/null',
  '+++ b/my notes.md\t',
  '@@ -0,0 +1,1 @@',
  '+<!-- CLAUDE: reword -->',
  '',
].join('\n')

describe('parseDiff', () => {
  test('numbers new-side lines and marks additions', () => {
    const lines = parseDiff(DIFF)
    expect(lines.slice(0, 3)).toEqual([
      { file: 'src/a.py', line: 10, content: 'def load(path):', isAdded: false },
      { file: 'src/a.py', line: 11, content: '    # CLAUDE: use model_loader', isAdded: true },
      { file: 'src/a.py', line: 12, content: '    # CLAUDE: instead of open()', isAdded: true },
    ])
  })

  test('header-shaped lines inside a hunk are content, not headers', () => {
    const lines = parseDiff(DIFF)
    expect(lines.find(l => l.line === 42)).toEqual({
      file: 'src/a.py',
      line: 42,
      content: '++ added line starting with plus plus',
      isAdded: true,
    })
    expect(lines.some(l => l.content.includes('deleted'))).toBe(false)
  })

  test('strips the tab git appends to a path with a space', () => {
    expect(parseDiff(DIFF).at(-1)?.file).toBe('my notes.md')
  })
})

describe('parseGrep', () => {
  test('reads -z output with context lines and separators', () => {
    const out = 'new file.py\x002\x00# CLAUDE: one\nnew file.py\x003\x00code()\n--\nnew file.py\x005\x00# CLAUDE: two\n'
    expect(parseGrep(out)).toEqual([
      { file: 'new file.py', line: 2, content: '# CLAUDE: one', isAdded: true },
      { file: 'new file.py', line: 3, content: 'code()', isAdded: true },
      { file: 'new file.py', line: 5, content: '# CLAUDE: two', isAdded: true },
    ])
  })
})

describe('collectMarkers', () => {
  test('merges an own-line run and quotes the code below it', () => {
    expect(collectMarkers(parseDiff(DIFF))).toEqual([
      { file: 'my notes.md', line: 1, text: 'reword', code: '' },
      { file: 'src/a.py', line: 11, text: 'use model_loader instead of open()', code: 'data = open(path).read()' },
      { file: 'src/a.py', line: 43, text: 'handle empty file', code: 'return parse(data)' },
    ])
  })

  test('a plain comment after a run is its code line, not more text', () => {
    const at = (line: number, content: string) => ({ file: 'a.py', line, content, isAdded: true })
    expect(collectMarkers([at(1, '# CLAUDE: why'), at(2, '# plain note')])).toEqual([
      { file: 'a.py', line: 1, text: 'why', code: '# plain note' },
    ])
  })

  test('a marker in an unchanged line does not count', () => {
    expect(
      collectMarkers([{ file: 'a.py', line: 1, content: '# CLAUDE: old', isAdded: false }]),
    ).toEqual([])
  })

  test('adjacent markers merge; a gap splits them', () => {
    const at = (line: number, content: string) => ({ file: 'a.py', line, content, isAdded: true })
    expect(
      collectMarkers([at(1, '# CLAUDE: one'), at(2, '# CLAUDE: two'), at(5, '# CLAUDE: three')]),
    ).toEqual([
      { file: 'a.py', line: 1, text: 'one two', code: '' },
      { file: 'a.py', line: 5, text: 'three', code: '' },
    ])
  })
})

describe('isCommit', () => {
  test('matches commits in any position', () => {
    expect(isCommit('git commit -m x')).toBe(true)
    expect(isCommit('git -C . commit --amend')).toBe(true)
    expect(isCommit('pytest && git commit -am y')).toBe(true)
  })

  test('ignores other git commands', () => {
    expect(isCommit('git status')).toBe(false)
    expect(isCommit('echo commit; git diff')).toBe(false)
  })
})

describe('strings', () => {
  const two = [
    { file: 'a.py', line: 3, text: 'x', code: 'y = 1' },
    { file: 'b.py', line: 9, text: 'why?', code: '' },
  ]

  test('labels pluralize', () => {
    expect(countLabel(two)).toBe('2 comments in 2 files')
    expect(countLabel(two.slice(0, 1))).toBe('1 comment in 1 file')
    expect(bandLabel(two)).toBe('review: 2 comments in 2 files — /nvim-review')
  })

  test('prompt lists each marker with its code', () => {
    const prompt = buildReviewPrompt(two)
    expect(prompt).toContain('- `a.py:3` — x (on: `y = 1`)')
    expect(prompt).toContain('- `b.py:9` — why?')
    expect(prompt).toContain('Do not commit')
  })

  test('commit denial names the locations', () => {
    expect(commitDenial(two)).toBe(
      '2 CLAUDE: review comments unaddressed (a.py:3, b.py:9) — address them or ask the user before committing.',
    )
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `claude plugin test $MOD`
Expected: FAIL. `../hooks/markers` does not exist.

- [ ] **Step 4: Implement `hooks/markers.ts`**

```ts
import type { Marker } from '../types'

export type SourceLine = { file: string; line: number; content: string; isAdded: boolean }

const MARKER = /(?:^|\s)(?:#|\/\/|--|;|\/\*|<!--|\*)\s*CLAUDE:(.*)$/
const HUNK = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/
const COMMIT = /\bgit\b[^\n;&|]*\bcommit\b/

export function parseMarkerLine(
  line: string,
): { text: string; code: string; isOwnLine: boolean } | undefined {
  const match = MARKER.exec(line)
  if (match === null) return undefined

  const text = (match[1] ?? '').replace(/\s*(\*\/|-->)\s*$/, '').trim()
  if (text === '') return undefined

  const code = line.slice(0, match.index).trim()
  return { text, code, isOwnLine: code === '' }
}

export function parseDiff(diff: string): SourceLine[] {
  const lines: SourceLine[] = []
  let file: string | undefined
  let next = 0
  let isInHeader = false

  for (const raw of diff.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      isInHeader = true
      file = undefined
      continue
    }
    const hunk = HUNK.exec(raw)
    if (hunk !== null) {
      isInHeader = false
      next = Number(hunk[1])
      continue
    }
    if (isInHeader) {
      if (raw.startsWith('+++ ')) {
        file = raw === '+++ /dev/null' ? undefined : raw.slice('+++ b/'.length).replace(/\t$/, '')
      }
      continue
    }
    if (file === undefined) continue
    if (raw.startsWith('+')) lines.push({ file, line: next++, content: raw.slice(1), isAdded: true })
    else if (raw.startsWith(' ')) lines.push({ file, line: next++, content: raw.slice(1), isAdded: false })
  }

  return lines
}

export function parseGrep(out: string): SourceLine[] {
  const lines: SourceLine[] = []

  for (const raw of out.split('\n')) {
    const [file, line, ...rest] = raw.split('\0')
    // '--' group separators and the trailing empty line have no \0 fields
    if (file === undefined || line === undefined || rest.length === 0) continue
    lines.push({ file, line: Number(line), content: rest.join('\0'), isAdded: true })
  }

  return lines
}

export function collectMarkers(lines: readonly SourceLine[]): Marker[] {
  const markers: Marker[] = []
  // an own-line marker run, waiting for the code line that follows it
  let run: Marker | undefined
  let runEnd = 0

  for (const l of lines) {
    const hit = l.isAdded ? parseMarkerLine(l.content) : undefined
    const isNextToRun = run !== undefined && run.file === l.file && l.line === runEnd + 1

    if (hit?.isOwnLine) {
      if (run !== undefined && isNextToRun) {
        run.text += ` ${hit.text}`
      } else {
        if (run !== undefined) markers.push(run)
        run = { file: l.file, line: l.line, text: hit.text, code: '' }
      }
      runEnd = l.line
      continue
    }

    if (run !== undefined) {
      if (isNextToRun) run.code = hit?.code ?? l.content.trim()
      markers.push(run)
      run = undefined
    }
    if (hit !== undefined) {
      markers.push({ file: l.file, line: l.line, text: hit.text, code: hit.code })
    }
  }
  if (run !== undefined) markers.push(run)

  return markers.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
}

export function isCommit(command: string): boolean {
  return COMMIT.test(command)
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function countLabel(markers: readonly Marker[]): string {
  const files = new Set(markers.map(m => m.file)).size
  return `${plural(markers.length, 'comment')} in ${plural(files, 'file')}`
}

export function bandLabel(markers: readonly Marker[]): string {
  return `review: ${countLabel(markers)} — /nvim-review`
}

export function buildReviewPrompt(markers: readonly Marker[]): string {
  const items = markers.map(
    m => `- \`${m.file}:${m.line}\` — ${m.text}${m.code === '' ? '' : ` (on: \`${m.code}\`)`}`,
  )
  return [
    "Address these review comments I left in the code as `CLAUDE:` markers (paths are relative to the repo root). For each: make the change — or if it's a question, answer it in chat instead of in code — then delete the marker (the whole line if it stands alone, just the trailing comment otherwise). Do not commit; I'll re-review the diff.",
    '',
    ...items,
  ].join('\n')
}

export function commitDenial(markers: readonly Marker[]): string {
  const where = markers.slice(0, 5).map(m => `${m.file}:${m.line}`)
  if (markers.length > 5) where.push('…')
  return `${plural(markers.length, 'CLAUDE: review comment')} unaddressed (${where.join(', ')}) — address them or ask the user before committing.`
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `claude plugin test $MOD`
Expected: every `markers.test.ts` test PASSES.

- [ ] **Step 6: Validate and commit**

Run: `claude plugin validate $MOD`. Expected: no errors.
```bash
cd $MOD && git add -A && git commit -qm "feat: marker parsing"
```

---

### Task 2: Git scanning

**Files:**
- Create: `$MOD/hooks/scan.ts`
- Test: `$MOD/tests/register.test.ts` (scan is exercised through the guard in Task 3, so this task writes the fake-git helper and one direct scenario per git edge)

**Interfaces:**
- Consumes: `parseDiff`, `parseGrep`, `collectMarkers` from Task 1.
- Produces: `scan($: EngineInterface): Promise<Marker[]>`. It never rejects; any git failure yields `[]`.

`scan` can't be called from a test directly, because tests drive the plugin through `$`. So this task adds a temporary command, `nvim-review-scan`, which answers `{ text: JSON.stringify(await scan($)) }`. Task 3 removes it once the guard and command cover scanning.

- [ ] **Step 1: Write the failing tests**

`$MOD/tests/register.test.ts`:
```ts
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
      exitCode: out === null || out === undefined ? 1 : 0,
      stdout: out ?? '',
      stderr: '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
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
```

- [ ] **Step 2: Run them to verify they fail**

Run: `claude plugin test $MOD`
Expected: the `scan` tests FAIL (unknown command `nvim-review-scan`).

- [ ] **Step 3: Implement `hooks/scan.ts`**

```ts
import type { EngineInterface } from 'claude-code'

import type { Marker } from '../types'
import { collectMarkers, parseDiff, parseGrep } from './markers'

async function git(
  $: EngineInterface,
  args: readonly string[],
  cwd?: string,
): Promise<string | undefined> {
  const ran = await $.process.run(
    ['git', '-c', 'core.quotePath=false', ...args],
    cwd === undefined ? undefined : { cwd },
  )
  return ran.exitCode === 0 ? ran.stdout : undefined
}

async function findBase($: EngineInterface, root: string): Promise<string> {
  const head = (await git($, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], root))?.trim()
  const refs = head
    ? [head, head.replace(/^origin\//, '')]
    : ['origin/main', 'main', 'origin/master', 'master']

  for (const ref of refs) {
    const base = await git($, ['merge-base', 'HEAD', ref], root)
    if (base !== undefined) return base.trim()
  }
  return 'HEAD'
}

export async function scan($: EngineInterface): Promise<Marker[]> {
  try {
    const root = (await git($, ['rev-parse', '--show-toplevel']))?.trim()
    if (!root) return []

    const base = await findBase($, root)
    const diff = await git(
      $,
      ['diff', base, '-U1', '--no-color', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/'],
      root,
    )
    if (diff === undefined) return []
    const lines = parseDiff(diff)

    const untracked = (await git($, ['ls-files', '--others', '--exclude-standard', '-z'], root))
      ?.split('\0')
      .filter(Boolean)
    if (untracked !== undefined && untracked.length > 0) {
      const found = await git(
        $,
        ['grep', '-n', '-z', '-I', '-A1', '--untracked', '-e', 'CLAUDE:', '--', ...untracked],
        root,
      )
      lines.push(...parseGrep(found ?? ''))
    }

    return collectMarkers(lines)
  } catch {
    // $.process.run rejects when git can't start or times out
    return []
  }
}
```

Replace the placeholder `hooks/register.tsx` with:
```tsx
import type { Register } from 'claude-code'

import { scan } from './scan'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'nvim-review-scan', description: 'temporary: scan as JSON' })
    return next(e)
  })

  on('command.run', { command: 'nvim-review-scan' }, async $ => ({
    text: JSON.stringify(await scan($)),
  }))
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `claude plugin test $MOD`
Expected: all tests PASS.

- [ ] **Step 5: Check against a real repo**

In a scratch repo, put the real git through the same code path. Run the mod's own tests first, then exercise it by hand:
```bash
S=/tmp/claude-1000/-home-ssidique-baby-fund/bacc20aa-99aa-4ce4-9224-55c3d204bdee/scratchpad/realgit
rm -rf $S && mkdir -p $S && cd $S && git init -q -b main && printf 'a = 1\n' > a.py && git add . && git commit -qm init
git checkout -qb feat && printf 'b = 2\n' >> a.py && git commit -qam c1 && printf 'c = 3\n' >> a.py && git commit -qam c2
sed -i '3i # CLAUDE: why three?' a.py
printf 'z = 0  # CLAUDE: delete me\n' > new.py
git -c core.quotePath=false diff $(git merge-base HEAD main) -U1 --src-prefix=a/ --dst-prefix=b/
```
Expected: the diff shows `+# CLAUDE: why three?` at new-side line 3 with `+c = 3` after it. This confirms the input shape the tests assume, and that the marker counts as added even though the line below it came from commit c2.

- [ ] **Step 6: Commit**

```bash
cd $MOD && git add -A && git commit -qm "feat: scan changed files for markers"
```

---

### Task 3: Commit guard, band, `/nvim-review`

**Files:**
- Modify: `$MOD/hooks/register.tsx` (rewrite)
- Test: `$MOD/tests/register.test.ts` (add to it)

**Interfaces:**
- Consumes: `scan` (Task 2); `bandLabel`, `buildReviewPrompt`, `commitDenial`, `countLabel`, `isCommit` (Task 1).
- Produces: the `nvim-review` command; the `AbovePrompt` band; the state atom `{ plugin: 'nvim-review', key: 'markers' }`.

- [ ] **Step 1: Add the failing tests**

Append to `$MOD/tests/register.test.ts`. Also delete the `scanned` helper and the `describe('scan')` block's use of `nvim-review-scan`: switch those five tests from `await scanned($)` to the `reviewText` helper below, which goes through the real command, and assert on the prompt text instead of JSON. Concretely, replace the `scanned` helper with:

```ts
// Runs /nvim-review; returns the prompt it submitted, or undefined if it submitted none.
async function reviewText($: Engine, on: On): Promise<string | undefined> {
  let submitted: string | undefined
  on('prompt.submit', (_$, e) => {
    submitted = e.text
    return { drop: 'captured by test' }
  })
  await $.command.run({ command: 'nvim-review' })
  return submitted
}
```
Then rewrite the scan tests:

```ts
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
    expect(ran.isError).toBe(true)
    expect(ran.text).toContain('2 CLAUDE: review comments unaddressed (new.py:1, src/a.py:2)')
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
    on('prompt.submit', () => ({ drop: 'x' }))
    await $.command.run({ command: 'nvim-review' }) // the command's rescan fills the state
    const ui = await $.ui.mount(BAND)
    expect(await ui.find({ type: 'Text', text: 'review: 2 comments in 2 files — /nvim-review' })).toBeDefined()
    await ui.unmount()
  })

  test('draws nothing with no markers', async ($, on) => {
    fakeGit(on, {})
    const ui = await $.ui.mount(BAND)
    expect(await ui.find({ type: 'Text', text: /review:/ })).toBe(undefined)
    await ui.unmount()
  })
})
```

The Bash result shape (`{ stdout, stderr, interrupted }`) and the `AbovePrompt` props are checked against the types. If `tsc` (Task 4) or the test kit names other required fields, grep `claude-code-tools/index.d.ts` for the Bash output type and `AbovePrompt: {` in the API file, and fill in the missing fields.

- [ ] **Step 2: Run them to verify they fail**

Run: `claude plugin test $MOD`
Expected: FAIL. The `nvim-review` command doesn't exist, and nothing denies the commit.

- [ ] **Step 3: Rewrite `hooks/register.tsx`**

```tsx
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Marker } from '../types'
import { bandLabel, buildReviewPrompt, commitDenial, countLabel, isCommit } from './markers'
import { scan } from './scan'

const POLL_MS = 2000
const markers = atom({ plugin: 'nvim-review', key: 'markers' } as const, [])

export const register: Register = on => {
  let isScanning = false

  // Rescans and stores the result, writing only on change so the band redraws only then.
  async function refresh($: EngineInterface): Promise<Marker[]> {
    const found = await scan($)
    if (JSON.stringify(found) !== JSON.stringify(await read($, markers))) {
      await update($, markers, () => found)
    }
    return found
  }

  async function sendReview($: EngineInterface): Promise<string> {
    const found = await refresh($)
    if (found.length === 0) return 'No CLAUDE: comments found in changed files.'
    void $.prompt.submit({ text: buildReviewPrompt(found) })
    return `Sending ${countLabel(found)} to Claude.`
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'nvim-review',
      description: 'Have Claude address the CLAUDE: comments in changed files',
    })
    $.clock.every(POLL_MS, () => {
      if (isScanning) return
      isScanning = true
      void refresh($).finally(() => {
        isScanning = false
      })
    })
    return next(e)
  })

  on('command.run', { command: 'nvim-review' }, async $ => ({ text: await sendReview($) }))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    if (!isCommit(e.command)) return next(e)
    const found = await refresh($)
    return found.length === 0 ? next(e) : { deny: commitDenial(found) }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const found = await read($, markers)
    if (e.props.hasSurvey || found.length === 0) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    return (
      <Box>
        <Text>{bandLabel(found)} </Text>
        <Button
          key="send"
          label="Send to Claude"
          onPress={async () => $.ui.toast(await sendReview($))}
        />
      </Box>
    )
  })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `claude plugin test $MOD`
Expected: every test in both files PASSES.

- [ ] **Step 5: Commit**

```bash
cd $MOD && git add -A && git commit -qm "feat: band, /nvim-review, commit guard"
```

---

### Task 4: Type-check, validate, and try it live

**Files:** none new. Fix whatever the checks report in the files above.

- [ ] **Step 1: Type-check and validate**

Run: `claude plugin validate $MOD && tsc -p $MOD`
Expected: no errors. (`tsc -p` uses the engine-generated `tsconfig.json`, which exists once the mod has loaded at least once. If it's missing, end the turn so the hot reload writes it.)

- [ ] **Step 2: End the turn and confirm the load**

The mod reloads when the turn ends. The next turn's notice, or the transcript, names any load failure. Fix it, then repeat.

- [ ] **Step 3: Manual check in baby-fund (with the user)**

1. On a scratch branch of `/home/ssidique/baby-fund`, the user adds `# CLAUDE: test marker` to any `.py` file in nvim and saves.
2. Within about 2 s the band reads `review: 1 comment in 1 file — /nvim-review`.
3. Claude runs `git commit -am test` through Bash. Expected: denied, and the message names the file and line.
4. The user runs `/nvim-review`. Expected: Claude gets the prompt and removes the marker, and the band disappears once it's gone.
5. Clean up: `git checkout -- <file>`, and delete the scratch branch.

- [ ] **Step 4: Commit any fixes**

```bash
cd $MOD && git add -A && git commit -qm "fix: issues from live check"
```
(Skip this if nothing changed.)
