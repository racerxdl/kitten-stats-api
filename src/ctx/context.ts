import { Log } from 'web3-core'
import { AbiItem } from 'web3-utils'
import { getLastContractTransactions } from '../api/scanapi'
import { EasyContract, ParsedLog } from '../eth/helpers'
import { ContractUpdateResult, FullTransaction, ParsedFullTransaction, ParsedTransaction, ParsedTransactionReceipt } from '../eth/basetypes'
import { Transaction, TransactionReceipt } from '../eth/copy'
import { FetchProvider } from '../eth/provider'

import {
  getContractABI as FTMgetContractABI,
  getTransaction as FTMgetTransaction,
  putTransaction,
  putContractABI,
  getContextState,
  putContextState,
  getToLastNTransactions,
} from '../cloudflare/ftm'

import { getContractABI as APIgetContractABI } from '../api/scanapi'

import Web3 from 'web3'
import BN from 'bn.js'

const maxWorkerRequests = 40

// Caching functions
const getContractABI = async (ctx: Context, contractAddress: string): Promise<Array<AbiItem>> => {
  let contract = await FTMgetContractABI(contractAddress)
  if (contract) {
    return contract
  }

  if (!ctx.API_URL) {
    throw Error('api url not set')
  }
  if (!ctx.API_TOKEN) {
    throw Error('api token not set')
  }

  contract = await APIgetContractABI(ctx.API_URL, ctx.API_TOKEN, contractAddress)
  await putContractABI(contractAddress, contract)

  return contract
}

const getTransaction = async (ctx: Context, hash: string): Promise<ParsedFullTransaction> => {
  let trx = await FTMgetTransaction(hash)
  if (trx) {
    return trx
  }

  const ntrx = await ctx.web3.eth.getTransaction(hash)
  trx = ctx.parseFullTransaction(
    {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      transaction: ntrx,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      receipt: await ctx.web3.eth.getTransactionReceipt(hash),
    },
    ntrx.to,
  )
  await putTransaction(trx)

  return trx
}

/**
 * Context for doing operations in worker
 */
class Context {
  readonly API_URL?: string
  readonly API_TOKEN?: string
  readonly RPC_URL: string

  private readonly _provider?: FetchProvider
  readonly web3: Web3
  _contracts: { [key: string]: EasyContract }
  private reqCount: number

  constructor(RPC_URL: string, API_URL?: string, API_TOKEN?: string) {
    this.API_URL = API_URL
    this.API_TOKEN = API_TOKEN
    this.RPC_URL = RPC_URL
    this._contracts = {}
    this._provider = new FetchProvider(this.RPC_URL)
    this.web3 = new Web3(this._provider)
    this.reqCount = 0
  }

  /**
   * Fetches the contract ABI from KV/API and initializes a EasyContract
   * @param contractAddress
   */
  async initContract(contractAddress: string): Promise<void> {
    console.log(`initContract(${contractAddress})`)
    const ABI = await getContractABI(this, contractAddress)
    return this.initContractFromABI(contractAddress, ABI)
  }

  /**
   * Initializes a EasyContract using the specified ABI
   * @param contractAddress
   * @param abi
   */
  initContractFromABI(contractAddress: string, abi: Array<AbiItem>): void {
    console.log(`initContractFromABI(${contractAddress}, ${abi.length})`)
    this._contracts[contractAddress.toLowerCase()] = new EasyContract(this.web3, abi, contractAddress)
  }

  /**
   * Fetches a pre-initialized EasyContract
   * @param contractAddress
   */
  getContract(contractAddress: string): EasyContract | undefined {
    return this._contracts[contractAddress.toLowerCase()]
  }

  /**
   * Parses a log from a specified contract
   * @param contractAddress
   * @param log
   */
  parseLogFromContract(contractAddress: string, log: Log): ParsedLog {
    console.log(`parseLogFromContract(${contractAddress}, ${log.logIndex})`)
    const contract = this.getContract(contractAddress)
    if (!contract) {
      console.log(`contract ${contractAddress} not found. Available contracts: ${Object.keys(this._contracts)}`)
      throw Error(`contract ${contractAddress} not initialized. call initContract`)
    }
    return contract.parseLog(log)
  }

  /**
   * Parses a transaction receipt from the specified contract
   * @param receipt
   * @param contractAddress
   */
  parseTransactionReceipt(receipt: TransactionReceipt, contractAddress?: string): ParsedTransactionReceipt {
    const preceipt = receipt as ParsedTransactionReceipt
    if (contractAddress) {
      preceipt.parsedLogs = preceipt.logs.map((l) => this.parseLogFromContract(contractAddress, l))
    }
    return preceipt
  }

  /**
   * Parses a transaction from the specified contract
   * @param trx
   * @param contractAddress
   */
  parseTransaction(trx: Transaction, contractAddress?: string): ParsedTransaction {
    console.log(`parseTrasaction(${trx.hash}, ${contractAddress})`)
    const ptrx = trx as ParsedTransaction
    if (contractAddress) {
      const contract = this.getContract(contractAddress)
      if (!contract) {
        console.log(`contract ${contractAddress} not found. Available contracts: ${Object.keys(this._contracts)}`)
        throw Error(`contract ${contractAddress} not initialized. call initContract`)
      }

      if (ptrx.to === contractAddress) {
        const input = (trx as any).input || ''
        ptrx.method = contract.decodeMethod(input)
      }
    }
    return ptrx
  }

  /**
   * Parses a full transaction from the specified contract
   * @param trx
   * @param contractAddress
   */
  parseFullTransaction(trx: FullTransaction, contractAddress?: string): ParsedFullTransaction {
    return {
      hash: trx.transaction.hash,
      receipt: this.parseTransactionReceipt(trx.receipt, contractAddress),
      transaction: this.parseTransaction(trx.transaction, contractAddress),
      contract: contractAddress,
    }
  }

  /**
   * Fetches a full transaction from either KV or API
   * @param transactionHash
   */
  getFullTransaction(transactionHash: string): Promise<ParsedFullTransaction> {
    console.log(`getFullTransaction(${transactionHash})`)
    this.reqCount++
    return getTransaction(this, transactionHash)
  }

  /**
   * Triggers a update to contract transactions in KV Space
   * @param contract
   * @param lastBlockNumber last block that has been updated
   */
  async updateContract(contract: string, lastBlockNumber: string): Promise<ContractUpdateResult> {
    console.log(`updateContract(${contract}, ${lastBlockNumber})`)
    let error
    let block
    const startingBlock = new BN(lastBlockNumber).addn(1).toString(10)
    try {
      await this.initContract(contract)
      const trxs = await getLastContractTransactions(this.API_URL!, this.API_TOKEN!, contract, 1, startingBlock, '99999999', 'asc')
      this.reqCount++

      if (trxs.length) {
        const ptrxs: Array<FullTransaction> = []
        const hashes = trxs.map((trx) => trx.hash).filter((hash) => hash !== '')

        for (let i = 0; i < hashes.length; i++) {
          ptrxs.push(await this.getFullTransaction(hashes[i]))
          if (this.reqCount > maxWorkerRequests) {
            // Cloudflare Worker Max
            break
          }
        }
        block = ptrxs
          .map((trx) => new BN(trx.transaction.blockNumber!))
          .reduce((a, b) => (a.gt(b) ? a : b))
          .toString(10)
      }
    } catch (e) {
      error = e.toString()
    }

    return {
      block,
      error,
    }
  }

  /**
   * Triggers update of ALL contracts specified in Context State
   */
  async updateLastTransactions(): Promise<void> {
    const start = Date.now()
    const state = await getContextState()

    // Get Enabled contracts
    const contracts = Object.keys(state.contractUpdates).filter((k) => state.contractUpdates[k].enabled)

    // Update all
    // We NEED to do this in a loop to await each one individually
    const blocks: Array<ContractUpdateResult> = []
    for (let i = 0; i < contracts.length; i++) {
      const c = contracts[i]
      blocks.push(await this.updateContract(c, state.contractUpdates[c].lastBlock))
      if (this.reqCount > maxWorkerRequests) {
        // Cloudflare Worker Max
        break
      }
    }

    // Update states
    blocks.forEach((blk, idx) => {
      const k = contracts[idx]
      state.contractUpdates[k].lastUpdate = Date.now()
      if (blk.block) {
        state.contractUpdates[k].lastBlock = blk.block!
      }
      state.contractUpdates[k].lastError = blk.error
    })

    state.lastCronRun = Date.now()
    state.lastBatchTime = Date.now() - start

    // Save
    await putContextState(state)
  }

  /**
   * Get last transactions for the specified contract
   * @param contractAddress
   * @param count
   */
  async getLastTransactions(contractAddress: string, count?: number): Promise<Array<ParsedFullTransaction>> {
    contractAddress = contractAddress.toLowerCase()
    console.log(`getLastTransactions(${contractAddress}, ${count || 10})`)
    const hashes = await getToLastNTransactions(contractAddress, count || 10)
    return Promise.all(hashes.map((trx) => this.getFullTransaction(trx)))
  }
}

export { Context }
