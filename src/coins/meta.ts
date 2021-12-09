interface CoinData {
  name: string
  unit: string
}

interface CoinPair {
  from: string
  to: string
  rate: number
}

export {
  CoinData,
  CoinPair,
}