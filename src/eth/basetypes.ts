import { AbiItem } from 'web3-utils'
import { Transaction, TransactionReceipt } from './copy'

interface SignedABIItem extends AbiItem {
  signature: string
}

interface ParsedLog {
  event: AbiItem;
  parsedData: { [key: string]: string }
}

interface ParsedTransaction extends Transaction {
  blockNumber?: string
  transactionIndex?: string
  input?: string
  method?: DecodedMethod
}

interface ParsedTransactionReceipt extends TransactionReceipt {
  parsedLogs?: Array<ParsedLog>
}

interface FullTransaction {
  transaction: Transaction
  receipt: TransactionReceipt
}

interface DecodedMethod {
  method: SignedABIItem
  params: { [key: string]: string }
}

interface ParsedFullTransaction {
  hash?: string
  contract?: string
  transaction: ParsedTransaction
  receipt: ParsedTransactionReceipt
}

interface ContractUpdateState {
  lastUpdate: number
  lastBlock: string
  lastError?: string
  enabled: boolean
}

interface ContextState {
  lastCronRun?: number
  lastBatchTime?: number,
  contractUpdates: { [key: string]: ContractUpdateState }
}

interface ContractUpdateResult {
  block?: string
  error?: string
}

export {
  SignedABIItem,
  ParsedLog,
  ParsedTransaction,
  ParsedTransactionReceipt,
  FullTransaction,
  ParsedFullTransaction,
  DecodedMethod,
  ContextState,
  ContractUpdateState,
  ContractUpdateResult,
}