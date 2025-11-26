
import { Connection } from '@solana/web3.js'
import type { EndpointInfo } from '../@types/types'
import { DEVNET_RPC, MAINNET_RPC } from '@constants/endpoints'
import {useConnection} from "@solana/wallet-adapter-react";

export const BACKUP_CONNECTIONS = [
  new Connection(`https://rpc.mngo.cloud/rlmk0lo5odee/`, 'recent'),
]

const ENDPOINTS: EndpointInfo[] = [
  {
    name: 'mainnet',
    url: MAINNET_RPC,
  },
  {
    name: 'devnet',
    url: DEVNET_RPC,
  },
  {
    name: 'localnet',
    url: 'http://127.0.0.1:8899',
  },
]

console.log('deployed ENDPOINTS:', ENDPOINTS)

export interface ConnectionContext {
  cluster: EndpointTypes
  current: Connection
  endpoint: string
}

export function getConnectionContext(cluster: string): ConnectionContext {
  const ENDPOINT = ENDPOINTS.find((e) => e.name === cluster) || ENDPOINTS[0]
  return {
    cluster: ENDPOINT!.name as EndpointTypes,
    current: new Connection(ENDPOINT!.url, 'recent'),
    endpoint: ENDPOINT!.url,
  }
}

/**
 * Given ConnectionContext, find the network.
 * @returns EndpointType
 * @param endpoint
 */
export function getNetworkFromEndpoint(endpoint: string) {
  const network = ENDPOINTS.find((e) => e.url === endpoint)
  if (!network) {
    console.log(endpoint, ENDPOINTS)
    throw new Error(`Network not found for endpoint: ${endpoint}`)
  }
  return network?.name
}
// Add these exports at the end of the file
export type EndpointTypes = 'mainnet' | 'devnet' | 'testnet' | 'localnet';

export interface ConnectionContext {
  current: ReturnType<typeof useConnection>['connection'];
  endpoint: string;
  cluster: EndpointTypes;
}
