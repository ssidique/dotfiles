import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Marker } from '../types'
import { bandLabel, buildReviewPrompt, commitDenial, countLabel, isCommit } from './markers'
import { scan } from './scan'
import type { BaseCache } from './scan'

const markers = atom({ plugin: 'nvim-review', key: 'markers' } as const, [])

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

const baseCache: BaseCache = {}
let isInteractive = false

// Rescans and stores the result, writing only on change so the band redraws only then.
async function refresh($: EngineInterface): Promise<Marker[]> {
  const found = await scan((args, cwd) => git($, args, cwd), baseCache)
  if (JSON.stringify(found) !== JSON.stringify(await read($, markers))) {
    await update($, markers, () => found)
  }
  return found
}

// Activity in the session refreshes the band; nothing scans while it's idle. Deferred so the
// event isn't held up by git, and the base is looked up again since a fetch may have moved it.
function rescan($: EngineInterface) {
  if (!isInteractive) return
  baseCache.head = undefined
  $.clock.after(0, () => void refresh($))
}

async function sendReview($: EngineInterface): Promise<string> {
  const found = await refresh($)
  if (found.length === 0) return 'No CLAUDE: comments found in changed files.'
  // submitting from inside the command's hook would wait on the turn that hook holds
  $.clock.after(0, () => {
    $.prompt
      .submit({ text: buildReviewPrompt(found) })
      .catch((err: unknown) => $.ui.toast(`nvim-review: could not send the comments: ${String(err)}`))
  })
  return `Sending ${countLabel(found)} to Claude.`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'nvim-review',
      description: 'Have Claude address the CLAUDE: comments in changed files',
    })
    // a -p or SDK session has no band to keep fresh
    isInteractive = e.isInteractive
    rescan($)
    return next(e)
  })

  on('prompt.submit', ($, e, next) => {
    rescan($)
    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    rescan($)
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
