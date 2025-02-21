import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import queryClient from './queryClient'

const URL = 'https://price.jup.ag/v4/price'

/* example query
# Unit price of 1 JUP & 1 SOL based on the Derived Price in USDC
https://api.jup.ag/price/v2?ids=JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN,So11111111111111111111111111111111111111112

{
    "data": {
        "So11111111111111111111111111111111111111112": {
            "id": "So11111111111111111111111111111111111111112",
            "type": "derivedPrice",
            "price": "133.890945000"
        },
        "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": {
            "id": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
            "type": "derivedPrice",
            "price": "0.751467"
        }
    },
    "timeTaken": 0.00395219
}
*/
/* example intentionally broken query 
curl -X 'GET' 'https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112&showExtraInfo=true'
{
    "data": {
        "So11111111111111111111111111111111111111112": {
            "id": "So11111111111111111111111111111111111111112",
            "type": "derivedPrice",
            "price": "134.170633378"
        },
        "8agCopCHWdpj7mHk3JUWrzt8pHAxMiPX5hLVDJh9TXWv": null
    },
    "timeTaken": 0.003186833
}
*/

type Price = {
  id: string // pubkey,
  // price is in USD
  price: number
  // removed in v2 API
  // mintSymbol: string
  // vsToken: string // pubkey,
  // vsTokenSymbol: string
}
type Response = {
  data: Record<string, Price> //uses whatever you input (so, pubkey OR symbol). no entry if data not found
  timeTaken: number
}

function* chunks<T>(arr: T[], n: number): Generator<T[], void> {
  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n)
  }
}

export const jupiterPriceQueryKeys = {
  all: ['Jupiter Price API'],
  byMint: (mint: PublicKey) => [...jupiterPriceQueryKeys.all, mint.toString()],
  byMints: (mints: PublicKey[]) => [
    ...jupiterPriceQueryKeys.all,
    mints.map((x) => x.toString()).sort(),
  ],
}

const jupQueryFn = async (mint: PublicKey) => {
  const x = await fetch(`${URL}?ids=${mint?.toString()}`)
  const response = (await x.json()) as Response
  const result = response.data[mint.toString()]
  return result !== undefined
    ? ({ found: true, result } as const)
    : ({ found: false, result: undefined } as const)
}

export const useJupiterPriceByMintQuery = (mint: PublicKey | undefined) => {
  const enabled = mint !== undefined
  return useQuery({
    queryKey: enabled ? jupiterPriceQueryKeys.byMint(mint) : undefined,
    queryFn: async () => {
      if (!enabled) throw new Error()
      return jupQueryFn(mint)
    },
  })
}

export const fetchJupiterPrice = async (mint: PublicKey) =>
  queryClient.fetchQuery({
    queryKey: jupiterPriceQueryKeys.byMint(mint),
    queryFn: () => jupQueryFn(mint),
  })

/**
 * @deprecated
 * do not use this! it only exists to replace a previously existing synchronous function. use fetchJupiterPrice
 * */
export const getJupiterPriceSync = (mint: PublicKey) =>
  ((queryClient.getQueryData(jupiterPriceQueryKeys.byMint(mint)) as any)?.result
    ?.price as number) ?? 0

export const useJupiterPricesByMintsQuery = (mints: PublicKey[]) => {
  const enabled = mints.length > 0
  const deduped = new Set(mints)
  const dedupedMints = Array.from(deduped)

  return useQuery({
    enabled,
    queryKey: jupiterPriceQueryKeys.byMints(dedupedMints),
    queryFn: async () => {
      const batches = [...chunks(dedupedMints, 100)]
      const responses = await Promise.all(
        batches.map(async (batch) => {
          const x = await fetch(`${URL}?ids=${batch.join(',')}`)
          const response = (await x.json()) as Response
          return response
        }),
      )
      const data = responses.reduce(
        (acc, next) => ({ ...acc, ...next.data }),
        {} as Response['data'],
      )

      //override chai price if its broken
      const chaiMint = '3jsFX1tx2Z8ewmamiwSU851GzyzM2DJMq7KWW5DM8Py3'
      const chaiData = data[chaiMint]

      if (chaiData?.price && (chaiData.price > 1.3 || chaiData.price < 0.9)) {
        data[chaiMint] = {
          ...chaiData,
          price: 1,
        }
      }
      return data
    },
    onSuccess: (data) => {
      dedupedMints.forEach((mint) =>
        queryClient.setQueryData(
          jupiterPriceQueryKeys.byMint(mint),
          data[mint.toString()]
            ? ({ found: true, result: data[mint.toString()] } as const)
            : ({ found: false, result: undefined } as const),
        ),
      )
    },
  })
}

// function is used to get fresh token prices
export const getJupiterPricesByMintStrings = async (mints: string[]) => {
  if (mints.length === 0) return {}
  const deduped = new Set(mints)
  const dedupedMints = Array.from(deduped)
  try {
    const x = await fetch(`${URL}?ids=${dedupedMints.join(',')}`)
    const response = (await x.json()) as Response
    const data = response.data

    //override chai price if its broken
    const chaiMint = '3jsFX1tx2Z8ewmamiwSU851GzyzM2DJMq7KWW5DM8Py3'
    const chaiData = data[chaiMint]

    if (chaiData?.price && (chaiData.price > 1.3 || chaiData.price < 0.9)) {
      data[chaiMint] = {
        ...chaiData,
        price: 1,
      }
    }
    return data
  } catch (error) {
    console.error('Error fetching Jupiter prices:', error)
    throw error
  }
}
