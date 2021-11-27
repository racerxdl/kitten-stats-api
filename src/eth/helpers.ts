import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { Contract, ContractOptions } from 'web3-eth-contract'
import { Log } from 'web3-core'
import { DecodedMethod, ParsedLog, SignedABIItem } from './basetypes'

/**
 * EasyContract is a wrapper over the Web3 Contract instance to facilitate
 * some operations such as decoding fields and logs
 */
class EasyContract {
  readonly eventMap: { [key: string]: SignedABIItem }
  readonly methodMap: { [key: string]: SignedABIItem }
  web3: Web3
  contract: Contract

  private readonly _jsonInterface: AbiItem[]

  constructor(web3: Web3, jsonInterface: AbiItem[], address?: string, options?: ContractOptions) {
    this.contract = new web3.eth.Contract(jsonInterface, address, options)

    this.eventMap = {}
    this.methodMap = {}
    this.web3 = web3
    // Copy parsed ABI from web3 instance
    this._jsonInterface = (this.contract as any)._jsonInterface

    // Cache Event signatures
    this._jsonInterface
      .filter((i: AbiItem) => i.type == 'event')
      .forEach((eb: AbiItem) => {
        const e = eb as SignedABIItem
        this.eventMap[e.signature] = e
        if (e.name) {
          this.eventMap[e.name] = e
        }
      })

    // Cache non-event signatures
    this._jsonInterface
      .filter((i: AbiItem) => i.type !== 'event')
      .forEach((eb: AbiItem) => {
        const e = eb as SignedABIItem
        this.methodMap[e.signature] = e
        if (e.name) {
          this.methodMap[e.name] = e
        }
      })
  }

  /**
   * Decode inputData from a contract call transaction
   * @param inputData hex content of the transaction input field
   */
  decodeMethod(inputData: string): DecodedMethod | undefined {
    if (inputData.length < 3) {
      return
    }

    const methodId = inputData.substr(0, 10)
    const method = this.methodMap[methodId]
    if (!method) {
      throw Error(`No such method ${methodId}`)
    }
    const result = {
      method,
      params: {},
    }
    if (method.inputs && method.inputs.length) {
      // parse methods
      result.params = this.web3.eth.abi.decodeParameters(method.inputs, inputData.substr(10))
    }
    return result
  }

  /**
   * Parses contract transaction log
   * @param log log data
   */
  parseLog(log: Log): ParsedLog {
    if (log.topics.length === 0) {
      throw Error('invalid log. no topics')
    }
    const eventId = log.topics.splice(0, 1)[0]
    const eventABI = this.eventMap[eventId]
    if (!eventABI) {
      throw Error(`unknown event ${eventId}`)
    }

    const data = log.data || ''
    const topics = log.topics || []
    const abiInputs = eventABI.inputs || []
    return {
      event: eventABI,
      parsedData: this.web3.eth.abi.decodeLog(abiInputs, data.replace('0x', ''), topics),
    }
  }
}

export { EasyContract, ParsedLog }
