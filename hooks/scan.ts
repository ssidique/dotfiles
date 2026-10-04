import type { Marker } from '../types'
import { collectMarkers, parseDiff, parseGrep } from './markers'

const GREP_BATCH = 100

// Runs `git <args>` (in `cwd` when given); stdout on exit 0, otherwise undefined.
// The branch base for one HEAD, so a quiet poll skips the merge-base lookup.
export type BaseCache = { head?: string; base?: string }

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

export async function scan(git: Git, cache: BaseCache): Promise<Marker[]> {
  try {
    const [root, head] = (await git(['rev-parse', '--show-toplevel', 'HEAD']))?.trim().split('\n') ?? []
    if (!root || !head) return []

    if (cache.head !== head || cache.base === undefined) {
      cache.base = await findBase(git, root)
      cache.head = head
    }
    const base = cache.base
    // plumbing diff-index never refreshes the index, so polling can't hold .git/index.lock
    // against the user's own commits; -G keeps only files whose changes mention a marker
    const diff = await git(
      ['diff-index', '-p', '-U1', '-M', '-GCLAUDE:', '--no-color', '--src-prefix=a/', '--dst-prefix=b/', base],
      root,
    )
    if (diff === undefined) return []
    const lines = parseDiff(diff)

    const untracked = (await git(['ls-files', '--others', '--exclude-standard', '-z'], root))
      ?.split('\0')
      .filter(Boolean)
    try {
      // batched so a large untracked tree can't overflow the argument list
      for (let i = 0; i < (untracked?.length ?? 0); i += GREP_BATCH) {
        const batch = untracked?.slice(i, i + GREP_BATCH) ?? []
        const found = await git(
          ['grep', '-n', '-z', '-I', '-A1', '--untracked', '-e', 'CLAUDE:', '--', ...batch],
          root,
        )
        lines.push(...parseGrep(found ?? ''))
      }
    } catch {
      // keep the tracked markers when the untracked search fails
    }

    return collectMarkers(lines)
  } catch {
    // the runner rejects when git can't start or times out
    return []
  }
}
