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
