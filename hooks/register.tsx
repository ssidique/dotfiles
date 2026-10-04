import type { EngineInterface, Register } from 'claude-code'

import { scan } from './scan'

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

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'nvim-review-scan', description: 'temporary: scan as JSON' })
    return next(e)
  })

  on('command.run', { command: 'nvim-review-scan' }, async $ => ({
    text: JSON.stringify(await scan((args, cwd) => git($, args, cwd))),
  }))
}
