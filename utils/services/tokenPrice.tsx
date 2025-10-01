import axios from 'axios'
import { mergeDeepRight } from 'ramda'

import { notify } from '@utils/notifications'
import { WSOL_MINT } from '@components/instructions/tools'
import overrides from 'public/realms/token-overrides.json'
import { Price, TokenInfo } from './types'
import { chunks } from '@utils/helpers'
import { USDC_MINT } from '@blockworks-foundation/mango-v4'
import { useLocalStorage } from '@hooks/useLocalStorage'
import { getJupiterPricesByMintStrings } from '@hooks/queries/jupiterPrice'

const tokenListUrl = 'https://lite-api.jup.ag/tokens/v2/tag?query=verified'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours
const PRICE_STORAGE_KEY = 'tokenPrices-v2'
const PRICE_CACHE_TTL_MS = 1000 * 60 * 5 // 5 minutes TTL

const TOKENLIST_CACHE_NAME = 'tokenlist-v3' // Cache Storage bucket

export type TokenInfoJupiter = TokenInfo

type MintLike = string | { toBase58: () => string }
const asMintStr = (m: MintLike) =>
  typeof m === 'string' ? m.trim() : m.toBase58()

// helpers to read and write the token list via Cache Storage API
async function readTokenListFromCache(): Promise<TokenInfo[] | null> {
  if (!('caches' in window)) return null
  const cache = await caches.open(TOKENLIST_CACHE_NAME)
  const hit = await cache.match(tokenListUrl)
  if (!hit) return null
  try {
    return (await hit.clone().json()) as TokenInfo[]
  } catch {
    return null
  }
}

async function writeTokenListToCache(res: Response) {
  if (!('caches' in window)) return
  const cache = await caches.open(TOKENLIST_CACHE_NAME)
  await cache.put(tokenListUrl, res.clone())
}

class TokenPriceService {
  _tokenList: TokenInfo[]
  _tokenPriceToUSDlist: Record<string, Price>
  _unverifiedTokenCache: Record<string, TokenInfoJupiter>
  _inFlight: Set<string>

  constructor() {
    this._tokenList = []
    this._tokenPriceToUSDlist = {}
    this._unverifiedTokenCache = {}
    this._inFlight = new Set()
  }

  private _warmFromLocalStorage() {
    try {
      const storage = useLocalStorage()
      const cached = storage.getItem(PRICE_STORAGE_KEY)
      if (!cached) return
      const parsed: { prices: Record<string, Price>; ttl: string } =
        JSON.parse(cached)
      if (Date.now() < Number(parsed.ttl)) {
        Object.assign(this._tokenPriceToUSDlist, parsed.prices)
      }
    } catch {
      // ignore
    }
  }

  async fetchSolanaTokenList() {
    try {
      const tokens = await axios.get(tokenListUrl)
      const tokenList = tokens.data as TokenInfo[]
      if (tokenList && tokenList.length) {
        this._tokenList = tokenList.map((token) => {
          const override = overrides[token.address]
          if (override) return mergeDeepRight(token, override)
          return token
        })
      }
    } catch (e) {
      console.log(e)
      notify({
        type: 'error',
        message: 'unable to fetch token list',
      })
    }
  }

  // simplified storage, TTL stays in localStorage, big JSON goes to Cache Storage
  async fetchSolanaTokenListV2(): Promise<TokenInfo[]> {
    const storage = useLocalStorage()
    const ttl = storage.getItem('tokenListTTL')

    let tokenList: TokenInfo[] = []

    try {
      const freshNeeded = !ttl || Date.now() > Number(ttl)

      if (!freshNeeded) {
        const cached = await readTokenListFromCache()
        if (cached && cached.length) {
          this._tokenList = cached
          return cached
        }
        // TTL ok but cache missing, fall through to network
      }

      // fetch from network then cache it
      const res = await fetch(tokenListUrl, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const tokens = (await res.clone().json()) as TokenInfo[]
      await writeTokenListToCache(res)

      if (tokens && tokens.length) {
        tokenList = tokens.map((t) =>
          overrides[t.address] ? mergeDeepRight(t, overrides[t.address]!) : t,
        )

        storage.setItem('tokenListTTL', String(Date.now() + CACHE_TTL_MS))
        this._tokenList = tokenList
        return tokenList
      }

      // network returned empty, try cache as fallback
      const fallback = await readTokenListFromCache()
      if (fallback) {
        this._tokenList = fallback
        return fallback
      }

      this._tokenList = []
      return []
    } catch (e) {
      console.log(e)
      const cached = await readTokenListFromCache()
      if (cached) {
        this._tokenList = cached
        notify({ type: 'warning', message: 'Using cached token list' })
        return cached
      }
      notify({
        type: 'error',
        message: 'Unable to fetch token list',
      })
      return []
    }
  }

  async fetchTokenPrices(mintAddresses: string[]) {
    if (!mintAddresses.length) return

    // normalize inputs and warm memory cache
    this._warmFromLocalStorage()
    const storage = useLocalStorage()

    const cachedPricesData = storage.getItem(PRICE_STORAGE_KEY)
    const cachedPrices: { prices: Record<string, Price>; ttl: string } =
      cachedPricesData
        ? JSON.parse(cachedPricesData)
        : {
            prices: {},
            ttl: '0',
          }

    // ensure token list is available, not strictly required for cache, kept for parity
    await this.fetchSolanaTokenListV2()

    // normalize all mints to strings and include WSOL as string
    const wsol = asMintStr(WSOL_MINT as unknown as MintLike)
    const normalized = Array.from(
      new Set(mintAddresses.map(asMintStr).concat(wsol)),
    )

    for (const mintChunk of chunks(normalized, 100)) {
      // skip ones already in memory
      const toProcess = mintChunk.filter(
        (mint) => !this._tokenPriceToUSDlist[mint],
      )
      if (!toProcess.length) continue

      // pull from localStorage if TTL valid
      const now = Date.now()
      const toFetch = toProcess.filter((mint) => {
        const hit = now < Number(cachedPrices.ttl) && cachedPrices.prices[mint]
        if (hit) {
          this._tokenPriceToUSDlist[mint] = cachedPrices.prices[mint]
          return false
        }
        return true
      })

      if (!toFetch.length) continue

      // avoid duplicate concurrent fetches
      const uniqueToFetch = toFetch.filter((m) => {
        if (this._inFlight.has(m)) return false
        this._inFlight.add(m)
        return true
      })
      if (!uniqueToFetch.length) continue

      try {
        const response = await getJupiterPricesByMintStrings(uniqueToFetch)
        if (response) {
          const priceToUsd: Price[] = Object.entries(response).map(
            ([address, data]: any) => ({
              id: address,
              usdPrice: data.usdPrice,
            }),
          )

          priceToUsd.forEach((priceData) => {
            this._tokenPriceToUSDlist[priceData.id] = priceData
            cachedPrices.prices[priceData.id] = priceData
          })

          cachedPrices.ttl = String(Date.now() + PRICE_CACHE_TTL_MS)
          storage.setItem(PRICE_STORAGE_KEY, JSON.stringify(cachedPrices))
        }
      } catch (e) {
        console.error(e)
        notify({
          type: 'error',
          message: 'unable to fetch token prices',
        })
      } finally {
        uniqueToFetch.forEach((m) => this._inFlight.delete(m))
      }
    }

    // ensure USDC is present at 1
    const USDC_MINT_BASE = asMintStr(USDC_MINT as unknown as MintLike)
    if (!this._tokenPriceToUSDlist[USDC_MINT_BASE]) {
      const usdcPrice: Price = {
        id: USDC_MINT_BASE,
        usdPrice: 1,
      }
      this._tokenPriceToUSDlist[USDC_MINT_BASE] = usdcPrice
      cachedPrices.prices[USDC_MINT_BASE] = usdcPrice
      storage.setItem(PRICE_STORAGE_KEY, JSON.stringify(cachedPrices))
    }
  }

  async fetchTokenPrice(mintAddress: string): Promise<number | null> {
    try {
      const addr = asMintStr(mintAddress)
      if (!addr) return null
      const storage = useLocalStorage()

      // warm then check memory
      this._warmFromLocalStorage()
      if (this._tokenPriceToUSDlist[addr]) {
        return this._tokenPriceToUSDlist[addr].usdPrice
      }

      const cachedData = storage.getItem(PRICE_STORAGE_KEY)
      const cachedPrices: { prices: Record<string, Price>; ttl: string } =
        cachedData
          ? JSON.parse(cachedData)
          : {
              prices: {},
              ttl: '0',
            }

      if (Date.now() < Number(cachedPrices.ttl) && cachedPrices.prices[addr]) {
        const p = cachedPrices.prices[addr]
        this._tokenPriceToUSDlist[addr] = p
        return p.usdPrice
      }

      const response = await getJupiterPricesByMintStrings([addr])

      if (!response || !response[addr]) {
        // cache a zero price guard to avoid refetch storms
        cachedPrices.prices[addr] = { id: addr, usdPrice: 0 }
        cachedPrices.ttl = String(Date.now() + PRICE_CACHE_TTL_MS)
        storage.setItem(PRICE_STORAGE_KEY, JSON.stringify(cachedPrices))
        return null
      }

      // optional info fetch, currently unused
      void this.getTokenInfoAsync(addr)

      const priceData: Price = {
        id: addr,
        usdPrice: response[addr].usdPrice,
      }

      this._tokenPriceToUSDlist[addr] = priceData
      cachedPrices.prices[addr] = priceData
      cachedPrices.ttl = String(Date.now() + PRICE_CACHE_TTL_MS)
      storage.setItem(PRICE_STORAGE_KEY, JSON.stringify(cachedPrices))

      return priceData.usdPrice
    } catch (e) {
      console.error('Error fetching token price:', e)
      return null
    }
  }

  /**
   * Can be used but not recommended
   */
  getUSDTokenPrice(mintAddress: string): number {
    return mintAddress
      ? this._tokenPriceToUSDlist[mintAddress]?.usdPrice || 0
      : 0
  }

  /**
   * For decimals use on chain tryGetMint
   */
  getTokenInfo(mintAddress: string): TokenInfoJupiter | undefined {
    const tokenListRecord = this._tokenList?.find(
      (x) => x.address === mintAddress,
    )
    return tokenListRecord
  }

  // async lookup for tokens that are not on the strict list, currently returns undefined
  async getTokenInfoAsync(
    mintAddress: string,
  ): Promise<TokenInfoJupiter | undefined> {
    const tokenInfo: TokenInfoJupiter | undefined =
      this._unverifiedTokenCache[mintAddress] || undefined

    if (tokenInfo) return tokenInfo
    if (!mintAddress || mintAddress.trim() === '') return undefined

    const tokenListRecord = this._tokenList?.find(
      (x) => x.address === mintAddress,
    )
    if (tokenListRecord) return tokenListRecord

    // logo not found so we return no data
    return undefined

    // if you decide to re enable remote metadata, wrap it in try catch here
  }

  /**
   * For decimals use on chain tryGetMint
   */
  getTokenInfoFromCoingeckoId(
    coingeckoId: string,
  ): TokenInfoJupiter | undefined {
    const tokenListRecord = this._tokenList?.find(
      (x) => x.extensions?.coingeckoId === coingeckoId,
    )
    return tokenListRecord
  }
}

// keep a true singleton across HMR
declare global {
  // eslint-disable-next-line no-var
  var __tokenPriceService: TokenPriceService | undefined
}

const tokenPriceService =
  globalThis.__tokenPriceService ?? new TokenPriceService()
globalThis.__tokenPriceService = tokenPriceService

export default tokenPriceService
