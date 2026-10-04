import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

const prGate = atom({ plugin: 'nvim-pr-review', key: 'prGate' } as const, true)
const perEdit = atom({ plugin: 'nvim-pr-review', key: 'perEdit' } as const, false)
const reviewed = atom({ plugin: 'nvim-pr-review', key: 'reviewed' } as const, {})
const approved = atom({ plugin: 'nvim-pr-review', key: 'approved' } as const, {})

const WORK_DIR = '/tmp/claude-nvim-review'
const ROUND_SECONDS = 540
const DIFF_CAP = 20_000
const PR_CREATE = /\bgh\s+pr\s+create\b/
const COMMANDS = ':ClaudeAccept · :ClaudeReject [why] · :ClaudeReview [note]'

type $ = EngineInterface
type Verdict = 'accept' | 'reject' | 'review' | 'closed' | 'dead' | 'cancel'
type Answer = { verdict: Verdict; text: string }

/** A branch under review: where it is, what it's compared to, and each changed file's fingerprint. */
type Branch = { repo: string; key: string; baseSha: string; prints: Map<string, string> }

/** An on-demand review open in nvim; module-local, so a reload forgets it (nvim keeps the tab). */
let pending: { dir: string; socket: string; timer: { cancel: () => void } } | undefined

const scriptPath = ($: $, name: string) => `${$.plugin.root}/hooks/${name}`

async function run($: $, argv: readonly string[], cwd?: string) {
  const { exitCode, stdout } = await $.process.run(argv, cwd ? { cwd } : undefined)
  return { ok: exitCode === 0, out: stdout.trim() }
}

const git = ($: $, repo: string, ...args: string[]) => run($, ['git', '-C', repo, ...args])

/** The nvim to review in: the live one whose cwd holds `path`, else the first live one. */
async function findNvim($: $, path: string): Promise<string | undefined> {
  const { out } = await run($, ['sh', scriptPath($, 'find-nvim.sh')])
  const servers = out
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [socket = '', cwd = ''] = line.split('\t')
      return { socket, cwd: cwd.endsWith('/') ? cwd : `${cwd}/` }
    })
  const owner = servers.filter(s => path.startsWith(s.cwd)).sort((x, y) => y.cwd.length - x.cwd.length)[0]

  return (owner ?? servers[0])?.socket
}

/** A fresh folder for one review; created here, since nvim writes the decision into it. */
async function newDir($: $) {
  const dir = `${WORK_DIR}/${(await $.clock.now()).toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  await $.fs.write(`${dir}/request`, '')

  return dir
}

/** Calls `dofile(lua)(...args)` inside nvim; args go over as a vimscript list literal (JSON, no booleans). */
async function luaCall($: $, socket: string, lua: string, args: unknown[]) {
  const list = JSON.stringify([lua, ...args])
  const call = `dofile(_A[1])(${args.map((_, i) => `_A[${i + 2}]`).join(', ')})`
  const opened = await $.process.run(['nvim', '--server', socket, '--remote-expr', `luaeval('${call}', ${list})`])
  if (opened.exitCode !== 0) throw new Error(`nvim refused the review: ${opened.stderr.trim()}`)
}

function closeInNvim($: $, socket: string, dir: string) {
  return $.process
    .run(['nvim', '--server', socket, '--remote-expr', `luaeval('(_G.claude_reviews or {})[_A] and _G.claude_reviews[_A]()', ${JSON.stringify(dir)})`])
    .catch(() => undefined)
}

function parse(stdout: string): Answer {
  const [verdict = '', ...rest] = stdout.split('\n')
  const known: Verdict[] = ['accept', 'reject', 'review', 'closed', 'dead', 'cancel']

  return { verdict: known.includes(verdict as Verdict) ? (verdict as Verdict) : 'dead', text: rest.join('\n').trim() }
}

/** Waits for the decision with no deadline: only the user, nvim exiting, or Claude Code cancelling ends it. */
async function waitFor($: $, dir: string, socket: string, signal: AbortSignal): Promise<Answer> {
  const cancel = () => {
    void $.fs.write(`${dir}/decision`, 'cancel\n').catch(() => undefined)
    void closeInNvim($, socket, dir)
    $.ui.status(undefined)
  }
  signal.addEventListener('abort', cancel, { once: true })
  try {
    for (;;) {
      const { stdout } = await $.process.run(['sh', scriptPath($, 'wait-decision.sh'), dir, socket, String(ROUND_SECONDS)], {
        timeoutMs: (ROUND_SECONDS + 30) * 1000,
      })
      if (stdout.trim() !== 'again') {
        const answer = parse(stdout)
        if (answer.verdict !== 'cancel') await returnToClaude($)
        return answer
      }
      if (signal.aborted) return { verdict: 'cancel', text: '' }
    }
  } finally {
    signal.removeEventListener('abort', cancel)
    $.ui.status(undefined)
  }
}

async function returnToClaude($: $) {
  await $.process.run(['sh', scriptPath($, 'return-tmux.sh')]).catch(() => undefined)
}

async function focus($: $, socket: string, label: string) {
  await $.process.run(['sh', scriptPath($, 'focus-tmux.sh'), socket]).catch(() => undefined)
  $.ui.status(`nvim-pr-review: waiting on ${label}`)
}

// ---- the branch under review ----------------------------------------------

function baseFromCommand(command: string) {
  return command.match(/(?:--base|-B)[=\s]+(['"]?)([^\s'"]+)\1/)?.[2]
}

async function branchContext($: $, command = ''): Promise<Branch | undefined> {
  const top = await git($, await $.session.cwd(), 'rev-parse', '--show-toplevel')
  if (!top.ok) return undefined
  const repo = top.out
  const named = baseFromCommand(command)
  let baseRef = named
  if (named && (await git($, repo, 'rev-parse', '--verify', '-q', `origin/${named}`)).ok) baseRef = `origin/${named}`
  if (!baseRef) {
    const head = await git($, repo, 'symbolic-ref', '-q', '--short', 'refs/remotes/origin/HEAD')
    baseRef = head.ok ? head.out : 'origin/main'
  }
  const base = await git($, repo, 'merge-base', 'HEAD', baseRef)
  if (!base.ok) return undefined
  const branch = (await git($, repo, 'rev-parse', '--abbrev-ref', 'HEAD')).out

  return { repo, key: `${repo}@${branch}`, baseSha: base.out, prints: await fingerprints($, repo, base.out) }
}

async function fingerprints($: $, repo: string, baseSha: string) {
  const { out } = await run($, ['sh', scriptPath($, 'fingerprints.sh'), repo, baseSha])
  const prints = new Map<string, string>()
  for (const line of out.split('\n').filter(Boolean)) {
    const [path = '', hash = ''] = line.split('\t')
    prints.set(path, hash)
  }

  return prints
}

/** The working tree as a commit, without touching it or the index; HEAD when nothing is uncommitted. */
async function snapshot($: $, repo: string) {
  const stash = await git($, repo, 'stash', 'create')
  return stash.out || (await git($, repo, 'rev-parse', 'HEAD')).out
}

const treeOf = async ($: $, repo: string, rev: string) => (await git($, repo, 'rev-parse', `${rev}^{tree}`)).out

function cap(diff: string) {
  return diff.length > DIFF_CAP ? `${diff.slice(0, DIFF_CAP)}\n… (cut at ${DIFF_CAP} chars; run git diff yourself for the rest)` : diff
}

type Outcome = Answer & { edits: string; editedFiles: string[]; shown: number; total: number }

/** Opens the branch in nvim and waits; afterwards records what was reviewed and what the user changed. */
async function reviewBranch($: $, socket: string, b: Branch, title: string, signal?: AbortSignal): Promise<Outcome> {
  const all = [...b.prints.keys()]
  const before = (await read($, reviewed))[b.key]
  const since = before ? all.filter(p => before[p] !== b.prints.get(p)) : []
  const paths = since.length > 0 && since.length < all.length ? since : all
  const heading = paths === all ? title : `${title} — ${since.length} of ${all.length} files changed since your last review`

  const snap = await snapshot($, b.repo)
  const dir = await newDir($)
  await luaCall($, socket, scriptPath($, 'pr-review.lua'), [{ dir, repo: b.repo, base: b.baseSha, paths, title: heading }])
  await focus($, socket, `${paths.length} file${paths.length === 1 ? '' : 's'}`)

  const answer = signal
    ? await waitFor($, dir, socket, signal)
    : await waitFor($, dir, socket, new AbortController().signal)

  return { ...answer, ...(await afterReview($, b, snap, answer)), shown: paths.length, total: all.length }
}

async function afterReview($: $, b: Branch, snap: string, answer: Answer) {
  if (answer.verdict === 'dead' || answer.verdict === 'cancel') return { edits: '', editedFiles: [] }
  const now = await fingerprints($, b.repo, b.baseSha)
  await update($, reviewed, all => ({ ...all, [b.key]: Object.fromEntries(now) }))
  const edits = (await git($, b.repo, 'diff', snap)).out
  const editedFiles = (await git($, b.repo, 'diff', '--name-only', snap)).out.split('\n').filter(Boolean)
  if (answer.verdict === 'accept') {
    const tree = await treeOf($, b.repo, await snapshot($, b.repo))
    await update($, approved, all => ({ ...all, [b.key]: tree }))
  }

  return { edits, editedFiles }
}

/** What Claude reads after a review that doesn't simply let the PR through. */
function explain(o: Outcome, when: 'pr' | 'now'): string {
  const gate = when === 'pr' ? 'The PR was not created. ' : ''
  const yours = o.editedFiles.length
    ? `\n\nThe user edited ${o.editedFiles.join(', ')} during the review:\n${cap(o.edits)}`
    : ''
  const retry = when === 'pr' ? ' then run gh pr create again' : ''

  switch (o.verdict) {
    case 'accept':
      if (o.editedFiles.length === 0) {
        return `The user approved the branch in their nvim review with no changes. Acknowledge it in a line and carry on with what you were doing; gh pr create will go through without another review while HEAD stays where it is.`
      }
      return `The user approved the branch with edits of their own. ${gate}Commit their edits exactly as they are (don't change them), in their own commit, ${retry || 'and carry on'}${when === 'pr' ? '; it goes through without another review once HEAD matches what they approved' : ''}.${yours}`
    case 'reject':
      return `The user rejected the branch in their nvim review. ${gate}${o.text ? `Their reason: ${o.text}` : 'They gave no reason; ask what they want changed.'}${yours}`
    case 'review':
      return `The user made changes during their nvim review and wants you to review them before the PR. ${gate}${o.text ? `Their note: ${o.text}\n` : ''}Check their edits for anything they break (call sites, tests, types, consistency with the rest of the branch); fix what needs fixing or ask if unsure, commit,${retry || ' and tell them what you found'}. The next review shows only the files changed since this one.${yours}`
    case 'closed':
      return `The user closed the nvim review without deciding. ${gate}Ask them how they want to proceed; don't treat it as a rejection.${yours}`
    case 'dead':
      return `nvim exited before the user decided. ${gate}Ask them how they want to proceed.`
    case 'cancel':
      return `The review was cancelled. ${gate}`
  }
}

// ---- per-edit review (opt-in) ----------------------------------------------

function applyEdit(original: string, e: { old_string: string; new_string: string; replace_all?: boolean }) {
  const at = original.indexOf(e.old_string)
  if (e.old_string === '' || at < 0) return undefined
  if (e.replace_all) return original.split(e.old_string).join(e.new_string)
  if (original.indexOf(e.old_string, at + 1) >= 0) return undefined

  return original.slice(0, at) + e.new_string + original.slice(at + e.old_string.length)
}

async function reviewEdit($: $, socket: string, filePath: string, original: string, proposed: string, title: string, signal: AbortSignal) {
  const name = filePath.split('/').pop() || 'file'
  const dir = await newDir($)
  await $.fs.write(`${dir}/a/${name}`, original)
  await $.fs.write(`${dir}/b/${name}`, proposed)
  await $.fs.write(`${dir}/proposed/${name}`, proposed)
  await luaCall($, socket, scriptPath($, 'review.lua'), [dir, name, title])
  await focus($, socket, name)
  const answer = await waitFor($, dir, socket, signal)
  const final = answer.verdict === 'accept' ? await $.fs.read(`${dir}/b/${name}`) : proposed

  return { answer, final, dir, name }
}

// ---- hooks ------------------------------------------------------------------

async function startNow($: $): Promise<string> {
  const b = await branchContext($)
  if (!b) return 'Not in a git repo with a base branch to compare against.'
  if (b.prints.size === 0) return 'Nothing differs from the base branch yet.'
  const socket = await findNvim($, `${b.repo}/`)
  if (!socket) return 'No running nvim found. Open nvim in this repo and try again.'
  if (pending) {
    pending.timer.cancel()
    await closeInNvim($, pending.socket, pending.dir)
  }

  const all = [...b.prints.keys()]
  const before = (await read($, reviewed))[b.key]
  const since = before ? all.filter(p => before[p] !== b.prints.get(p)) : []
  const paths = since.length > 0 && since.length < all.length ? since : all
  const snap = await snapshot($, b.repo)
  const dir = await newDir($)
  await luaCall($, socket, scriptPath($, 'pr-review.lua'), [
    { dir, repo: b.repo, base: b.baseSha, paths, title: `Mid-task review (${paths.length} of ${all.length} files)` },
  ])
  await focus($, socket, 'mid-task review')

  let ticks = 0
  const timer = $.clock.every(1000, () => {
    void (async () => {
      ticks += 1
      const raw = await $.fs.read(`${dir}/decision`).catch(() => '')
      let answer: Answer | undefined = raw ? parse(raw) : undefined
      if (!answer && ticks % 5 === 0) {
        const alive = await $.process.run(['nvim', '--server', socket, '--remote-expr', '1']).catch(() => undefined)
        if (!alive || alive.exitCode !== 0) answer = { verdict: 'dead', text: '' }
      }
      if (!answer || pending?.dir !== dir) return
      timer.cancel()
      pending = undefined
      $.ui.status(undefined)
      const outcome: Outcome = { ...answer, ...(await afterReview($, b, snap, answer)), shown: paths.length, total: all.length }
      if (answer.verdict === 'dead' || answer.verdict === 'cancel') {
        $.ui.toast('nvim-pr-review: mid-task review ended without a decision')
        return
      }
      await returnToClaude($)
      await $.prompt.submit({ text: explain(outcome, 'now') })
    })()
  })
  pending = { dir, socket, timer }

  return `Opened ${paths.length} file${paths.length === 1 ? '' : 's'} in nvim. ${COMMANDS} — I'll hear about it when you decide.`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'nvim-pr-review',
      description: 'Review this branch in nvim now; also: status | on | off | edits on|off',
    })

    return next(e)
  })

  on('command.run', { command: 'nvim-pr-review' }, async ($, e) => {
    const [sub = '', value] = e.args.trim().split(/\s+/)
    if (sub === '' || sub === 'now') return { text: await startNow($) }
    if (sub === 'on' || sub === 'off') await update($, prGate, () => sub === 'on')
    else if (sub === 'edits' && (value === 'on' || value === 'off')) await update($, perEdit, () => value === 'on')
    else if (sub !== 'status') return { text: 'Usage: /nvim-pr-review [now] | status | on | off | edits on|off' }

    const gate = await read($, prGate)
    const edits = await read($, perEdit)
    const socket = await findNvim($, `${await $.session.cwd()}/`)

    return {
      text: [
        `PR gate: ${gate ? 'on (gh pr create waits for your nvim review)' : 'off'}`,
        `Per-edit review: ${edits ? 'on' : 'off'}`,
        `nvim: ${socket ?? 'none running'}`,
      ].join('\n'),
    }
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    if (!PR_CREATE.test(e.command) || !(await read($, prGate))) return next(e)
    const b = await branchContext($, e.command)
    if (!b || b.prints.size === 0) return next(e)

    const ok = (await read($, approved))[b.key]
    if (ok && ok === (await treeOf($, b.repo, 'HEAD'))) return next(e)

    const socket = await findNvim($, `${b.repo}/`)
    if (!socket) {
      return {
        deny: 'nvim-pr-review: no running nvim to review this PR in, so it was not created. Ask the user to open nvim in the repo (or turn the gate off with /nvim-pr-review off), then retry.',
      }
    }
    if (pending) {
      pending.timer.cancel()
      await closeInNvim($, pending.socket, pending.dir)
      pending = undefined
    }

    const outcome = await reviewBranch($, socket, b, 'Before PR', next.signal)
    if (outcome.verdict === 'accept' && outcome.editedFiles.length === 0) return next(e)

    return { deny: explain(outcome, 'pr') }
  })

  on('tool.call', { tool: ['Edit', 'Write'] }, async ($, e, next) => {
    if (!(await read($, perEdit))) return next(e)

    const filePath = e.file_path
    const original = await $.fs.read(filePath).catch(() => '')
    const proposed = e.tool === 'Write' ? e.content : applyEdit(original, e)
    if (proposed === undefined || proposed === original) return next(e)

    const socket = await findNvim($, filePath)
    if (!socket) {
      $.ui.toast('nvim-pr-review: no running nvim found, applying without review')
      return next(e)
    }

    const cwd = await $.session.cwd()
    const rel = filePath.startsWith(`${cwd}/`) ? filePath.slice(cwd.length + 1) : filePath
    const { answer, final, dir, name } = await reviewEdit($, socket, filePath, original, proposed, `${e.tool} ${rel}`, next.signal)

    if (answer.verdict === 'dead') return { deny: `nvim exited before the user reviewed this ${e.tool} of ${rel}; it was not applied. Ask them before retrying.` }
    if (answer.verdict !== 'accept') {
      return {
        deny: `The user rejected this ${e.tool} of ${rel} in their editor review.` +
          (answer.text ? ` Their reason: ${answer.text}` : ' They gave no reason; ask what they want instead.'),
      }
    }

    const ran = await next(e)
    if ('deny' in ran && ran.deny !== undefined) return ran
    if (ran.isError || final === proposed) return ran

    await $.fs.write(filePath, final)
    const { stdout: diff } = await $.process
      .run(['diff', '-u', '--label', 'your-proposal', '--label', 'accepted', `${dir}/proposed/${name}`, `${dir}/b/${name}`])
      .catch(() => ({ stdout: '' }))

    return {
      ...ran,
      context: [
        ...(ran.context ?? []),
        `The user edited your proposed change to ${rel} before accepting it, so the file now differs from what you wrote. Re-read it before editing it again.` +
          (diff ? `\n\nTheir changes on top of your proposal:\n${diff}` : ''),
      ],
    }
  })
}
