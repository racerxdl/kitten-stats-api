const apiURL = `https://api.binance.com/api/v3`

interface BinanceExchangeRate {
  mins: number
  price: string
}

const getBinanceExchangeRate = async (from: string, to: string): Promise<BinanceExchangeRate> => {
  const result = await fetch(`${apiURL}/avgPrice?symbol=${from}${to}`)
  console.log(`${apiURL}/avgPrice?symbol=${from}${to}`)

  if (result.status != 200) {
    throw new Error(`got ${result.status} from binance`)
  }

  return (await result.json()) as BinanceExchangeRate
}


export {
  getBinanceExchangeRate,
}