import BN from 'bn.js'
import querystring from 'querystring'
import { AbiItem } from 'web3-utils'

interface APITransaction {
  blockNumber: string
  timeStamp: string
  hash: string
  from: BN
  to: BN
  value: BN
  contractAddress: BN
  input: string
  type: string
  gas: BN
  gasUsed: BN
  traceId: string
  isError: string
  errCode: string
}

interface APIResult {
  status: string
  message: string
}

interface APITransactionResult extends APIResult {
  result: Array<APITransaction>
}

interface ABIResult extends APIResult {
  result: string
}

/**
 * Makes a GET to the API using the specified params object as url-encoded query params
 * @param apiUrl target url to call
 * @param params javascript object to encode as query string
 */
const callApi = async (apiUrl: string, params: any): Promise<any> => {
  const paramsString = querystring.encode(params)
  return fetch(`${apiUrl}?${paramsString}`)
}

/**
 * Reads the transactions from a contract using the etherscan API
 * uses txlistinternal from account to list all transactions bound to the contract
 *
 * @param url target api url
 * @param token api token
 * @param contractAddress address of the contract to read
 * @param page number of the page <optional>
 * @param startblock starting block to read  <optional>
 * @param endblock ending block to read  <optional>
 * @param sort sorting order (default asc)
 */
const getLastContractTransactions = async (
  url: string,
  token: string,
  contractAddress: string,
  page?: number,
  startblock?: string,
  endblock?: string,
  sort = 'desc',
): Promise<Array<APITransaction>> => {
  console.log(`API::getLastContractTransactions(${url},(...),${contractAddress},${page},${startblock},${endblock},${sort})`)
  const result = await callApi(url, {
    module: 'account',
    action: 'txlistinternal',
    address: contractAddress,
    apikey: token,
    page: page || 1,
    sort,
    startblock,
    endblock,
  })

  const data = (await result.json()) as APITransactionResult

  if (data.status !== '1') {
    throw `API Error: ${data.message}`
  }

  return data.result
}

/**
 * Reads the contract ABI in JSON format from the API
 * The output format is compatible with web3.Contract and EasyContract
 *
 * @param url target api url
 * @param token api token
 * @param contractAddress address of the contract
 */
const getContractABI = async (url: string, token: string, contractAddress: string): Promise<Array<AbiItem>> => {
  console.log(`API::getContractABI(${url},(...),${contractAddress})`)
  const result = await callApi(url, {
    module: 'contract',
    action: 'getabi',
    address: contractAddress,
    apikey: token,
  })
  const data = (await result.json()) as ABIResult

  if (data.status !== '1') {
    throw `API Error: ${data.message}`
  }

  return JSON.parse(data.result)
}

export { getLastContractTransactions, getContractABI }
