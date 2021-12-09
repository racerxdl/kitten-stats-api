const apiURL = `https://pro-api.coinmarketcap.com/v1`

interface Status {
  timestamp: string
  error_code: number
  error_message: string
}

interface CoinMarketCapQuote {
  price: number
  last_updated: string
}

interface CoinMarketCapCoin {
  id: number
  name: string
  symbol: string
  slug: string
  quote: { [key: string]: CoinMarketCapQuote }
}

interface CoinMarketCapResult {
  status: Status
  data: Array<CoinMarketCapCoin>
}

const getCoinMarketCapRates = async (apiToken: string): Promise<Array<CoinMarketCapCoin>> => {
  const result = await fetch(`${apiURL}/cryptocurrency/listings/latest`, {
    headers: {
      'X-CMC_PRO_API_KEY': apiToken,
    },
  })
  if (result.status != 200) {
    throw new Error(`got ${result.status} from coin market cap`)
  }
  const data = (await result.json()) as CoinMarketCapResult

  if (data.status.error_code !== 0) {
    throw new Error(`Error fetching from CoinMarketCap: ${data.status.error_message}`)
  }

  return data.data
}


export {
  getCoinMarketCapRates,
}