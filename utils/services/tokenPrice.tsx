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
const MISS_TTL_MS = 30 * 1000 // retry misses quickly

const TOKENLIST_CACHE_NAME = 'tokenlist-v3' // Cache Storage bucket

export type TokenInfoJupiter = TokenInfo

type MintLike = string | { toBase58: () => string }
const asMintStr = (m: MintLike) =>
  typeof m === 'string' ? m.trim() : m.toBase58()

const isValidPriceNumber = (v: unknown): v is number =>
  typeof v === 'number' && isFinite(v) && v > 0 && v < 1e12

// normalize several possible shapes that getJupiterPricesByMintStrings might return
function normalizePriceResponse(resp: any): Record<string, number> {
  if (!resp) return {}
  // object keyed by mint
  if (typeof resp === 'object' && !Array.isArray(resp)) {
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(resp)) {
      const maybe =
        (v as any)?.usdPrice ??
        (v as any)?.price ??
        (v as any)?.data?.usdPrice ??
        (v as any)?.data?.price
      if (isValidPriceNumber(maybe)) out[k] = Number(maybe)
    }
    return out
  }
  // array of entries
  if (Array.isArray(resp)) {
    const out: Record<string, number> = {}
    for (const item of resp) {
      const id = item?.id ?? item?.mint ?? item?.address
      const maybe = item?.usdPrice ?? item?.price
      if (typeof id === 'string' && isValidPriceNumber(maybe)) {
        out[id] = Number(maybe)
      }
    }
    return out
  }
  return {}
}

// helpers for token list cache
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
      if (Date.now() < Number(parsed.ttl) && parsed.prices) {
        // do not hydrate zeros, treat as misses
        for (const [k, v] of Object.entries(parsed.prices)) {
          if (isValidPriceNumber(v.usdPrice)) {
            this._tokenPriceToUSDlist[k] = v
          }
        }
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

  // token list with Cache Storage and TTL in localStorage
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
      }

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

    const cachedData = storage.getItem(PRICE_STORAGE_KEY)
    const cached: { prices: Record<string, Price>; ttl: string } = cachedData
      ? JSON.parse(cachedData)
      : { prices: {}, ttl: '0' }

    await this.fetchSolanaTokenListV2()

    const wsol = asMintStr(WSOL_MINT as unknown as MintLike)
    const normalized = Array.from(
      new Set(mintAddresses.map(asMintStr).concat(wsol)),
    )

    for (const mintChunk of chunks(normalized, 100)) {
      const toProcess = mintChunk.filter(
        (mint) => !this._tokenPriceToUSDlist[mint],
      )
      if (!toProcess.length) continue

      const now = Date.now()
      const toFetch = toProcess.filter((mint) => {
        const hit = now < Number(cached.ttl) && cached.prices[mint]
        if (hit && isValidPriceNumber(cached.prices[mint].usdPrice)) {
          this._tokenPriceToUSDlist[mint] = cached.prices[mint]
          return false
        }
        // purge zero or invalid entries so they do not linger
        if (hit && !isValidPriceNumber(cached.prices[mint].usdPrice)) {
          delete cached.prices[mint]
        }
        return true
      })

      if (!toFetch.length) continue

      const uniqueToFetch = toFetch.filter((m) => {
        if (this._inFlight.has(m)) return false
        this._inFlight.add(m)
        return true
      })
      if (!uniqueToFetch.length) continue

      try {
        const raw = await getJupiterPricesByMintStrings(uniqueToFetch)
        const parsed = normalizePriceResponse(raw)

        let wroteAny = false

        for (const id of uniqueToFetch) {
          const val = parsed[id]
          if (isValidPriceNumber(val)) {
            const priceData: Price = { id, usdPrice: val }
            this._tokenPriceToUSDlist[id] = priceData
            cached.prices[id] = priceData
            wroteAny = true
          }
          // do not write zero or invalid values to cache
        }

        // set TTL, success keeps normal TTL, partial or complete miss shortens TTL so we retry soon
        const missing = uniqueToFetch.filter(
          (m) => !isValidPriceNumber(parsed[m]),
        )
        if (missing.length && !wroteAny) {
          cached.ttl = String(Date.now() + MISS_TTL_MS)
        } else {
          cached.ttl = String(Date.now() + PRICE_CACHE_TTL_MS)
        }

        storage.setItem(PRICE_STORAGE_KEY, JSON.stringify(cached))
      } catch (e) {
        console.error(e)
        notify({ type: 'error', message: 'unable to fetch token prices' })
      } finally {
        uniqueToFetch.forEach((m) => this._inFlight.delete(m))
      }
    }

    // ensure USDC is present at 1, this is a safe constant
    const USDC_MINT_BASE = asMintStr(USDC_MINT as unknown as MintLike)
    if (!this._tokenPriceToUSDlist[USDC_MINT_BASE]) {
      const usdcPrice: Price = { id: USDC_MINT_BASE, usdPrice: 1 }
      this._tokenPriceToUSDlist[USDC_MINT_BASE] = usdcPrice
      cached.prices[USDC_MINT_BASE] = usdcPrice
      if (!cached.ttl || Number(cached.ttl) < Date.now()) {
        cached.ttl = String(Date.now() + PRICE_CACHE_TTL_MS)
      }
      storage.setItem(PRICE_STORAGE_KEY, JSON.stringify(cached))
    }
  }

  async fetchTokenPrice(mintAddress: string): Promise<number | null> {
    try {
      const addr = asMintStr(mintAddress)
      if (!addr) return null
      const storage = useLocalStorage()

      this._warmFromLocalStorage()

      const mem = this._tokenPriceToUSDlist[addr]
      if (mem && isValidPriceNumber(mem.usdPrice)) return mem.usdPrice

      const cachedData = storage.getItem(PRICE_STORAGE_KEY)
      const cached: { prices: Record<string, Price>; ttl: string } = cachedData
        ? JSON.parse(cachedData)
        : { prices: {}, ttl: '0' }

      if (Date.now() < Number(cached.ttl)) {
        const p = cached.prices[addr]
        if (p && isValidPriceNumber(p.usdPrice)) {
          this._tokenPriceToUSDlist[addr] = p
          return p.usdPrice
        }
        // purge zero or invalid from cache
        if (p && !isValidPriceNumber(p.usdPrice)) {
          delete cached.prices[addr]
          storage.setItem(PRICE_STORAGE_KEY, JSON.stringify(cached))
        }
      }

      // fallback to network
      const raw = await getJupiterPricesByMintStrings([addr])
      const parsed = normalizePriceResponse(raw)
      const val = parsed[addr]

      if (isValidPriceNumber(val)) {
        const priceData: Price = { id: addr, usdPrice: val }
        this._tokenPriceToUSDlist[addr] = priceData
        cached.prices[addr] = priceData
        cached.ttl = String(Date.now() + PRICE_CACHE_TTL_MS)
        storage.setItem(PRICE_STORAGE_KEY, JSON.stringify(cached))
        void this.getTokenInfoAsync(addr)
        return priceData.usdPrice
      }

      // no valid price, do not write zero as truth, write short lived miss guard only if you want
      cached.ttl = String(Date.now() + MISS_TTL_MS)
      storage.setItem(PRICE_STORAGE_KEY, JSON.stringify(cached))
      return null
    } catch (e) {
      console.error('Error fetching token price:', e)
      return null
    }
  }

  getUSDTokenPrice(mintAddress: string): number {
    // only return positive values, zero means unknown
    const p = mintAddress
      ? this._tokenPriceToUSDlist[mintAddress]?.usdPrice
      : undefined
    return isValidPriceNumber(p) ? p : 0
  }

  getTokenInfo(mintAddress: string): TokenInfoJupiter | undefined {
    const tokenListRecord = this._tokenList?.find(
      (x) => x.address === mintAddress,
    )
    return tokenListRecord
  }

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

    return undefined
  }

  getTokenInfoFromCoingeckoId(
    coingeckoId: string,
  ): TokenInfoJupiter | undefined {
    const tokenListRecord = this._tokenList?.find(
      (x) => x.extensions?.coingeckoId === coingeckoId,
    )
    return tokenListRecord
  }
}

// sticky singleton across HMR
declare global {
  // eslint-disable-next-line no-var
  var __tokenPriceService: TokenPriceService | undefined
}

const tokenPriceService =
  globalThis.__tokenPriceService ?? new TokenPriceService()
globalThis.__tokenPriceService = tokenPriceService

export default tokenPriceService
