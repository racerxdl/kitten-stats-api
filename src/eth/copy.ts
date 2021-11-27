// Copied from ethersproject because buggy on Typescript

export interface Log {
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;

  removed: boolean;

  address: string;
  data: string;

  topics: Array<string>;

  transactionHash: string;
  logIndex: number;
}

export type AccessList = Array<{ address: string, storageKeys: Array<string> }>;

export interface Transaction {
  hash?: string;

  blockNumber?: string;
  to?: string;
  from?: string;
  nonce: number;

  gasLimit: string;
  gasPrice?: string;

  data: string;
  value: string;
  chainId: number;

  r?: string;
  s?: string;
  v?: number;

  // Typed-Transaction features
  type?: number | null;

  // EIP-2930; Type 1 & EIP-1559; Type 2
  accessList?: AccessList;

  // EIP-1559; Type 2
  maxPriorityFeePerGas?: string;
  maxFeePerGas?: string;
}

export interface TransactionReceipt {
  to: string;
  from: string;
  contractAddress: string,
  transactionIndex: number,
  root?: string,
  gasUsed: string,
  logsBloom: string,
  blockHash: string,
  transactionHash: string,
  logs: Array<Log>,
  blockNumber: number,
  confirmations: number,
  cumulativeGasUsed: string,
  effectiveGasPrice: string,
  byzantium: boolean,
  type: number;
  status?: number
}
