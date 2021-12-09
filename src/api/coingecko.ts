const apiURL = `https://api.coingecko.com/api/v3`

interface GeckoRate {
  name: string
  unit: string
  value: number
  type: string
}

interface GeckoRateResult {
  rates: Array<GeckoRate>
}

const getCoinGeckoExchangeRates = async (): Promise<Array<GeckoRate>> => {
  const result = await fetch(`${apiURL}/exchange_rates`)
  if (result.status != 200) {
    throw new Error(`got ${result.status} from gecko`)
  }
  const data = (await result.json()) as GeckoRateResult
  return data.rates
}


export {
  getCoinGeckoExchangeRates,
}