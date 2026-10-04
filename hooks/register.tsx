import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Marker } from '../types'
import { bandLabel, buildReviewPrompt, commitDenial, countLabel, isCommit } from './markers'
import { scan } from './scan'

const POLL_MS = 2000
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

// Rescans and stores the result, writing only on change so the band redraws only then.
async function refresh($: EngineInterface): Promise<Marker[]> {
  const found = await scan((args, cwd) => git($, args, cwd))
  if (JSON.stringify(found) !== JSON.stringify(await read($, markers))) {
    await update($, markers, () => found)
  }
  return found
}

async function sendReview($: EngineInterface): Promise<string> {
  const found = await refresh($)
  if (found.length === 0) return 'No CLAUDE: comments found in changed files.'
  // submitting from inside the command's hook would wait on the turn that hook holds
  $.clock.after(0, () => void $.prompt.submit({ text: buildReviewPrompt(found) }))
  return `Sending ${countLabel(found)} to Claude.`
}

export const register: Register = on => {
  let isScanning = false

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
