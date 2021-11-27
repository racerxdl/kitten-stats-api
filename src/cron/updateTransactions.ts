import { Context } from '../ctx/context'


/**
 * Handles cron scheduled updates
 * @param event
 */
const handleScheduled = async (event: ScheduledEvent) : Promise<void> => {
  const ctx = new Context(
    RPC_URL,
    API_URL,
    API_TOKEN,
  )
  await ctx.updateLastTransactions()
}

export {
  handleScheduled
}