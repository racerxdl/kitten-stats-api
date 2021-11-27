import { Context } from '../ctx/context'

/**
 * Handles cron scheduled updates
 */
const handleScheduled = async (): Promise<void> => {
  const ctx = new Context(RPC_URL, API_URL, API_TOKEN)
  await ctx.updateLastTransactions()
}

export { handleScheduled }
