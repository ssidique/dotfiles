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

describe('CRLF files', () => {
  test('parseDiff drops the carriage return', () => {
    const diff = 'diff --git a/w.py b/w.py\r\n--- a/w.py\r\n+++ b/w.py\r\n@@ -0,0 +1 @@\r\n+# CLAUDE: crlf\r\n'
    expect(collectMarkers(parseDiff(diff))).toEqual([{ file: 'w.py', line: 1, text: 'crlf', code: '' }])
  })

  test('parseGrep drops the carriage return', () => {
    expect(parseGrep('w.py\x001\x00x = 1  # CLAUDE: crlf\r\n')[0]?.content).toBe('x = 1  # CLAUDE: crlf')
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
