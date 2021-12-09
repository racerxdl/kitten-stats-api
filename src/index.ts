import './polyfill/atob-btoa'
import './polyfill/window.polyfill'
import { Router } from 'cloudflare-router'
import { Context } from './ctx/context'
import { handleScheduled } from './cron/updateTransactions'

const router = new Router<Context>()
const api = new Router<Context>()
const cacheHeader = 's-maxage=300'
const failCacheHeader = 's-maxage=60'

router.get('/favicon.ico', (req, res) => {
  return res.statusCode(404).text('404')
})

router.get('/', (req, res) => {
  return res.setHeader('Location', 'https://lucasteske.dev').statusCode(302).text('Nothing to see here')
})

router.use('/api', api)

api.get('/time', (req, res) => {
  return res.statusCode(200).json({
    success: true,
    time: new Date().toISOString(),
  })
})

api.get('/last-transactions/*', async (req, res) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const cache = caches.default
  const cacheUrl = new URL(req.url)
  const cacheKey = new Request(cacheUrl.toString(), req.incomingRequest)
  const response = await cache.match(cacheKey)
  if (response) {
    return res.setCustomResponse(response)
  }

  const contract = req.path.substr('/api/last-transactions/'.length).replace('/', '')
  const ctx = req.additionalData!
  try {
    const trxs = await ctx.getLastTransactions(contract)
    res.setHeader('Cache-Control', cacheHeader).statusCode(200).json({
      success: true,
      data: trxs,
      timestamp: Date.now(),
      contract,
    })
  } catch (e) {
    res
      .setHeader('Cache-Control', failCacheHeader)
      .statusCode(500)
      .json({
        success: false,
        data: JSON.parse(JSON.stringify(e, Object.getOwnPropertyNames(e))),
        timestamp: Date.now(),
        contract,
      })
  }

  await cache.put(cacheKey, new Response(res.responseOptions.body, res.transformResponseOptions()))
  return res
})

api.get('/transaction/*', async (req, res) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const cache = caches.default
  const cacheUrl = new URL(req.url)
  const cacheKey = new Request(cacheUrl.toString(), req.incomingRequest)
  const response = await cache.match(cacheKey)
  if (response) {
    return res.setCustomResponse(response)
  }

  const ctx = req.additionalData!
  const trx = req.path.substr('/api/transaction/'.length).replace('/', '')
  try {
    let trxData
    const trxo = await ctx.getFullTransaction(trx)
    res.statusCode(200).json({
      success: true,
      data: trxData || trxo,
      hash: trx,
    })
  } catch (e) {
    res.statusCode(500).json({
      success: false,
      data: JSON.parse(JSON.stringify(e, Object.getOwnPropertyNames(e))),
      hash: trx,
    })
  }

  await cache.put(cacheKey, new Response(res.responseOptions.body, res.transformResponseOptions()))
})

// api.get('/update', async (req, res) => {
//   const ctx = req.additionalData!
//   await ctx.updateLastTransactions()
//   return res.statusCode(200).json({
//     success: true,
//   })
// })

// api.get('/updateCoins', async (req, res) => {
//   const ctx = req.additionalData!
//   // await ctx.updateCoinList()
//   await ctx.updateCoinsFromMarketCap()
//   return res.statusCode(200).json({
//     success: true,
//   })
// })

addEventListener('fetch', (event: FetchEvent) => {
  const ctx = new Context(RPC_URL, API_URL, API_TOKEN, COINMARKETCAP_API_TOKEN, COINS)
  return event.respondWith(router.serveRequest(event.request, ctx).then((built) => built.response))
})

addEventListener('scheduled', (event: ScheduledEvent) => {
  event.waitUntil(handleScheduled())
})
