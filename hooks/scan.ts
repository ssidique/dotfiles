import type { Marker } from '../types'
import { collectMarkers, parseDiff, parseGrep } from './markers'

// Runs `git <args>` (in `cwd` when given); stdout on exit 0, otherwise undefined.
export type Git = (args: readonly string[], cwd?: string) => Promise<string | undefined>

async function findBase(git: Git, root: string): Promise<string> {
  const head = (await git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], root))?.trim()
  const refs = head
    ? [head, head.replace(/^origin\//, '')]
    : ['origin/main', 'main', 'origin/master', 'master']

  for (const ref of refs) {
    const base = await git(['merge-base', 'HEAD', ref], root)
    if (base !== undefined) return base.trim()
  }
  return 'HEAD'
}

export async function scan(git: Git): Promise<Marker[]> {
  try {
    const root = (await git(['rev-parse', '--show-toplevel']))?.trim()
    if (!root) return []

    const base = await findBase(git, root)
    const diff = await git(
      ['diff', base, '-U1', '--no-color', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/'],
      root,
    )
    if (diff === undefined) return []
    const lines = parseDiff(diff)

    const untracked = (await git(['ls-files', '--others', '--exclude-standard', '-z'], root))
      ?.split('\0')
      .filter(Boolean)
    if (untracked !== undefined && untracked.length > 0) {
      const found = await git(
        ['grep', '-n', '-z', '-I', '-A1', '--untracked', '-e', 'CLAUDE:', '--', ...untracked],
        root,
      )
      lines.push(...parseGrep(found ?? ''))
    }

    return collectMarkers(lines)
  } catch {
    // the runner rejects when git can't start or times out
    return []
  }
}
