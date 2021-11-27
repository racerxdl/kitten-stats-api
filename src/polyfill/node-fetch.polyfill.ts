// fetch-polyfill.js
import fetch from 'node-fetch-commonjs';

if (!globalThis.fetch) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  globalThis.fetch = fetch;
}