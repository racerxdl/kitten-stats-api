import { ContextState, ParsedFullTransaction } from '../eth/basetypes'
import Web3 from 'web3'
import { AbiItem } from 'web3-utils'

interface IndexMetadata {
  hash: string
}

const transactionExpiration = 60 * 24 * 3600 // 2 months
const max64 = Web3.utils.toBN('0xFFFFFFFFFFFFFFFF')
const max32 = Web3.utils.toBN('0xFFFFFFFF')
const transactionKeyPrefix = 'trx-'
const transactionIndexKeyPrefix = 'trxidx-'
const transactionReverseIndexKeyPrefix = 'trxrevidx-'
const transactionIndexFromKeyPrefix = 'trxfromidx-'
const transactionIndexToKeyPrefix = 'trxtoidx-'
const transactionReverseIndexFromKeyPrefix = 'trxfromrevidx-'
const transactionReverseIndexToKeyPrefix = 'trxtorevidx-'
const contractKeyPrefix = 'contract-'
const contextStateKey = 'contextState'

const transactionKey = (hash: string) => `${transactionKeyPrefix}${hash}`
const transactionIndexNumber = (block: string, index: string) => `${transactionIndexKeyPrefix}${block}-${index}`
const transactionReverseIndexNumber = (block: string, index: string) => `${transactionReverseIndexKeyPrefix}${block}-${index}`
const contractKey = (address: string) => `${contractKeyPrefix}${address}`

const transactionIndexFromNumber = (from: string, block: string, index: string) =>
  `${transactionIndexFromKeyPrefix}${from}-${block}-${index}`
const transactionIndexToNumber = (to: string, block: string, index: string) => `${transactionIndexToKeyPrefix}${to}-${block}-${index}`

const transactionReverseIndexFromNumber = (from: string, block: string, index: string) =>
  `${transactionReverseIndexFromKeyPrefix}${from}-${block}-${index}`
const transactionReverseIndexToNumber = (to: string, block: string, index: string) =>
  `${transactionReverseIndexToKeyPrefix}${to}-${block}-${index}`

/**
 * Returns a ParsedFullTransaction from FantomProdTransactions KV
 * @param hash transaction hash
 */
const getTransaction = async (hash: string): Promise<ParsedFullTransaction | null> => {
  const trx = await FantomProdTransactions.get(transactionKey(hash))
  if (trx && trx !== '') {
    return JSON.parse(trx) as ParsedFullTransaction
  }

  return null
}

/**
 * Saves ParsedFullTransaction to FantomProdTransactions KV
 * @param trx transaction
 */
const putTransaction = async (trx: ParsedFullTransaction): Promise<void> => {
  if (!trx.hash || trx.hash === '') {
    return // Just ignore
  }

  const serialized = JSON.stringify(trx)
  await FantomProdTransactions.put(transactionKey(trx.hash), serialized, {
    expirationTtl: transactionExpiration,
  })
  if (trx.transaction.blockNumber === undefined || trx.transaction.transactionIndex === undefined) {
    throw Error(`Invalid transaction with no blockNumber or no transactionIndex!!!: ${JSON.stringify(trx)}`)
  }
  await putOrderedIndex(
    trx.transaction.blockNumber!.toString(),
    trx.hash,
    trx.transaction.transactionIndex!.toString(),
    trx.transaction.from || '0',
    trx.transaction.to || '0',
  )
}

/**
 * Fetches all specified transactions from KV
 * @param hashes
 */
const getTransactions = async (hashes: Array<string>): Promise<Array<ParsedFullTransaction | null>> => {
  return Promise.all(hashes.map(getTransaction))
}

/**
 * Creates ordered indexes in KV for listing transactions
 *
 * @param blockNumber number of the transaction block
 * @param hash hash of the transaction
 * @param trxIdx index of the transaction inside the block
 * @param from transaction from address
 * @param to transaction to address
 */
const putOrderedIndex = async (blockNumber: string, hash: string, trxIdx: string, from: string, to: string): Promise<void> => {
  const block = Web3.utils.toBN(blockNumber)
  const trxId = Web3.utils.toBN(trxIdx)
  const reverseBlock = max64.sub(block).toString(10)
  const reverseTrxId = max32.sub(trxId).toString(10)

  const blockN = block.toString(10)
  const trxN = trxId.toString(10)

  from = from.toLowerCase()
  to = to.toLowerCase()

  const metadata = {
    from,
    to,
    hash,
  }

  await Promise.all([
    // Full index
    FantomProdTransactions.put(transactionIndexNumber(blockN, trxN), 'metadata', { metadata }),
    FantomProdTransactions.put(transactionReverseIndexNumber(reverseBlock, reverseTrxId), 'metadata', { metadata }),

    // Direction Index
    FantomProdTransactions.put(transactionIndexFromNumber(from, blockN, trxN), 'metadata', { metadata }),
    FantomProdTransactions.put(transactionIndexToNumber(to, blockN, trxN), 'metadata', { metadata }),

    FantomProdTransactions.put(transactionReverseIndexFromNumber(from, reverseBlock, reverseTrxId), 'metadata', { metadata }),
    FantomProdTransactions.put(transactionReverseIndexToNumber(to, reverseBlock, reverseTrxId), 'metadata', { metadata }),
  ])
}

/**
 * Get list of hashes of the last N transactions from the FantomProdTransactions
 * The block prefix can be used for filtering transactions from a specific block
 *
 * @param n limit of transactions to return
 * @param blockPrefix optional block prefix
 */
const getLastNTransactions = async (n: number, blockPrefix = ''): Promise<Array<string>> => {
  const prefix = `${transactionReverseIndexKeyPrefix}${blockPrefix}`
  const result = await FantomProdTransactions.list<IndexMetadata>({
    prefix,
    limit: n,
  })

  return result.keys
    .map((k: KVNamespaceListKey<IndexMetadata>) => k.metadata?.hash)
    .filter((k) => k !== null && k !== undefined) as Array<string>
}

/**
 * Get list of hashes of the last N transactions from the FantomProdTransactions
 * The block prefix can be used for filtering transactions from a specific block
 *
 * @param from address from
 * @param n limit of transactions to return
 */
const getFromLastNTransactions = async (from: string, n: number): Promise<Array<string>> => {
  const prefix = `${transactionReverseIndexFromKeyPrefix}${from}`
  const result = await FantomProdTransactions.list<IndexMetadata>({
    prefix,
    limit: n,
  })

  return result.keys
    .map((k: KVNamespaceListKey<IndexMetadata>) => k.metadata?.hash)
    .filter((k) => k !== null && k !== undefined) as Array<string>
}

/**
 * Get list of hashes of the last N transactions from the FantomProdTransactions
 * The block prefix can be used for filtering transactions from a specific block
 *
 * @param to address to
 * @param n limit of transactions to return
 */
const getToLastNTransactions = async (to: string, n: number): Promise<Array<string>> => {
  console.log(`getToLastNTransactions(${to}, ${n})`)
  const prefix = `${transactionReverseIndexToKeyPrefix}${to}`
  const result = await FantomProdTransactions.list<IndexMetadata>({
    prefix,
    limit: n,
  })

  return result.keys
    .map((k: KVNamespaceListKey<IndexMetadata>) => k.metadata?.hash)
    .filter((k) => k !== null && k !== undefined) as Array<string>
}

/**
 * Saves a list of transactions to FantomProdTransactions creating the indexes
 *
 * @param trxs list of parsed full transactions
 */
const saveTransactions = async (trxs: Array<ParsedFullTransaction>): Promise<void> => {
  const cleanTransactions = trxs
    .filter((trx) => trx.hash !== undefined && trx.hash !== '')
    .filter((trx) => trx.transaction.blockNumber !== undefined && trx.transaction.blockNumber !== '')
    .filter((trx) => trx.transaction.transactionIndex !== undefined && trx.transaction.transactionIndex !== '')

  await Promise.all(
    cleanTransactions.map((trx) =>
      putOrderedIndex(
        trx.transaction.blockNumber!,
        trx.hash!,
        trx.transaction.transactionIndex!,
        trx.transaction.from || '0',
        trx.transaction.to || '0',
      ),
    ),
  )
  await Promise.all(cleanTransactions.map(putTransaction))
}

/**
 * Saves Contract ABI from FantomProdTransactions KV
 * @param contractAddress contract address
 * @param abi ABI content
 */
const putContractABI = async (contractAddress: string, abi: Array<AbiItem>): Promise<void> => {
  await FantomProdTransactions.put(contractKey(contractAddress), JSON.stringify(abi))
}

/**
 * Reads a cached Contract ABI from FantomProdTransactions KV
 * @param contractAddress contract address
 */
const getContractABI = async (contractAddress: string): Promise<Array<AbiItem> | null> => {
  const abi = await FantomProdTransactions.get(contractKey(contractAddress))
  return abi ? JSON.parse(abi) : null
}

/**
 * Saves the context state to the FantomProdTransactions KV instance
 * @param state context state
 */
const putContextState = async (state: ContextState): Promise<void> => {
  await FantomProdTransactions.put(contextStateKey, JSON.stringify(state), {
    metadata: { lastUpdate: Date.now() },
  })
}

/**
 * Reads the context state from the FantomProdTransactions KV instance
 */
const getContextState = async (): Promise<ContextState> => {
  let state = { contractUpdates: {} }

  const s = await FantomProdTransactions.get(contextStateKey)
  if (s !== null) {
    state = JSON.parse(s)
  }

  return state
}

export {
  getTransaction,
  putTransaction,
  putOrderedIndex,
  getLastNTransactions,
  saveTransactions,
  getContractABI,
  putContractABI,
  putContextState,
  getContextState,
  getToLastNTransactions,
  getFromLastNTransactions,
}
