import { Context } from '../ctx/context'

/**
 * Handles cron scheduled updates
 */
const handleScheduled = async (): Promise<void> => {
  const ctx = new Context(RPC_URL, API_URL, API_TOKEN, COINMARKETCAP_API_TOKEN, COINS)
  await ctx.updateLastTransactions()
  await ctx.updateCoinsFromMarketCap()
  await ctx.updateCoinList()
}

export { handleScheduled }
