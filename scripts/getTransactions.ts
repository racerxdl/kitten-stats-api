import { config } from 'dotenv'
import { Context } from '../src/ctx/context'
import '../src/polyfill/node-fetch.polyfill'
import { getCoinGeckoExchangeRates } from '../src/api/coingecko'
import { getCoinMarketCapRates } from '../src/api/coinmarketcap'

config();

(async () => {
  const ctx = new Context(
    process.env.RPC_URL || '',
    process.env.API_URL,
    process.env.API_TOKEN,
    process.env.COINMARKETCAP_API_TOKEN,
    process.env.COINS,
  )

  const v = await getCoinMarketCapRates(process.env.COINMARKETCAP_API_TOKEN||'')
  console.log(v)

  // const contract = '0x3C301c85B191B3eDADa11198ef1f5277C1eE1f87'
  // await ctx.initContract(contract)
  //
  // // const transactions = await ctx.getLastTransactions(contract) // , 1, 19713466
  // // console.log(transactions[0])
  //
  // const trx = ctx.parseFullTransaction(await ctx.getFullTransaction("0xa4fa5f9363a928c72238c4f9e90627df857ecae273c9ed45bb613fc15ffde917"), contract)
  // console.log(trx)
  // //
  // // console.log(JSON.stringify(ctx.parseFullTransaction('0x3C301c85B191B3eDADa11198ef1f5277C1eE1f87', trx), null, 2))
  //
  // // console.log(trx)
  // // console.log(ctx.parseLogFromContract('0x3C301c85B191B3eDADa11198ef1f5277C1eE1f87', trx.receipt.logs[0]))
  //
  process.exit(0)
})()