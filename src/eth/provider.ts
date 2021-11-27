import { HttpProviderOptions, JsonRpcPayload, JsonRpcResponse } from 'web3-core-helpers'

// The HTTPProvider from web3.js is NOT compatible with cloudflare workers
// This should do the job

export class FetchProvider {
  private readonly headers: { [key: string]: string }
  private timeout: number | undefined

  constructor(host: string, options?: HttpProviderOptions) {
    this.host = host
    this.connected = false
    this.headers = {}
    if (options && options.headers) {
      options.headers.forEach((h) => {
        this.headers[h.name] = h.value
      })
    }
    this.timeout = options?.timeout
  }

  host: string
  connected: boolean

  supportsSubscriptions = (): boolean => false

  send(payload: JsonRpcPayload, callback: (error: Error | null, result?: JsonRpcResponse) => void): void {
    fetch(this.host, {
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      method: 'POST',
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((res) => callback(null, res as JsonRpcResponse))
      .catch((err) => callback(err))
  }

  disconnect = (): boolean => true
}
