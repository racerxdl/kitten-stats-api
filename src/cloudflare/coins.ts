import { CoinData, CoinPair } from '../coins/meta'

/**
 * Saves coin pair data to KV
 * @param pair
 */
const putCoinPair = async (pair: CoinPair): Promise<void> => {
  await CryptoCoins.put(`${pair.from.toUpperCase()}_${pair.to.toUpperCase()}`, pair.rate.toString())
}

/**
 * Saves list coin pair data to KV
 * @param pairs
 */
const putCoinPairs = async (pairs: Array<CoinPair>): Promise<void> => {
  await Promise.all(pairs.map(putCoinPair));
}

/**
 * Saves coin data to KV
 * @param meta
 */
const putCoinMeta = async (meta: CoinData): Promise<void> => {
  await CryptoCoins.put(`${meta.unit.toLowerCase()}`, JSON.stringify(meta))
  await CryptoCoins.put(`${meta.name.toLowerCase()}`, JSON.stringify(meta))
}

/**
 * Put array of coindata to KV
 * @param metas
 */
const putCoinMetas = async (metas: Array<CoinData>) : Promise<void> => {
  await Promise.all(metas.map(putCoinMeta));
}

/**
 * Reads coin pair data from KV. Returns the rate from -> to
 * @param from source coin
 * @param to to coin
 */
const getCoinPair = async (from: string, to: string): Promise<CoinPair | undefined> => {
  const data = await CryptoCoins.get(`${from.toUpperCase()}_${to.toUpperCase()}`)
  if (!data || data.length === 0) {
    return
  }

  return {
    from,
    to,
    rate: parseFloat(data),
  }
}

/**
 * Reads coin data from KV
 * @param symbol
 */
const getCoinMeta = async (symbol: string): Promise<CoinData|undefined> => {
  const data = await CryptoCoins.get(`${symbol.toLowerCase()}`)
  if (!data || data.length === 0) {
    return
  }

  return JSON.parse(data) as CoinData
}

export {
  putCoinPairs,
  putCoinMetas,
  putCoinMeta,
  putCoinPair,
  getCoinPair,
  getCoinMeta,
}