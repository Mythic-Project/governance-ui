import axios from 'axios'
import {mergeDeepRight} from 'ramda'

import {notify} from '@utils/notifications'
import {WSOL_MINT} from '@components/instructions/tools'
import overrides from 'public/realms/token-overrides.json'
import {Price, TokenInfo} from './types'
import {chunks} from '@utils/helpers'
import {USDC_MINT} from '@blockworks-foundation/mango-v4'
import {useLocalStorage} from '@hooks/useLocalStorage'
import {getJupiterPricesByMintStrings} from '@hooks/queries/jupiterPrice'
import {PublicKey} from "@solana/web3.js";

const tokenListUrl = 'https://tokens.jup.ag/tokens?tags=verified,lst'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours
const PRICE_STORAGE_KEY = 'tokenPrices'
const PRICE_CACHE_TTL_MS = 1000 * 60 * 5 // 5 minutes TTL

export type TokenInfoJupiter = TokenInfo

class TokenPriceService {
  _tokenList: TokenInfo[]
  _tokenPriceToUSDlist: {
    [mintAddress: string]: Price
  }
  _unverifiedTokenCache: { [mintAddress: string]: TokenInfoJupiter }

  constructor() {
    this._tokenList = []
    this._tokenPriceToUSDlist = {}
    this._unverifiedTokenCache = {}
  }

  async fetchSolanaTokenList() {
    try {
      const tokens = await axios.get(tokenListUrl)
      const tokenList = tokens.data as TokenInfo[]
      if (tokenList && tokenList.length) {
        this._tokenList = tokenList.map((token) => {
          const override = overrides[token.address]

          if (override) {
            return mergeDeepRight(token, override)
          }

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

  async fetchSolanaTokenListV2(): Promise<TokenInfo[]> {
    const storage = useLocalStorage()
    const tokenListRaw = storage.getItem('tokenList')
    const ttl = storage.getItem('tokenListTTL')

    let tokenList: TokenInfo[] = []

    try {
      if (!tokenListRaw || !ttl || Date.now() > Number(ttl)) {
        const response = await axios.get(tokenListUrl)
        const tokens = response.data as TokenInfo[]

        if (tokens && tokens.length) {
          tokenList = tokens.map((token) => {
            const override = overrides[token.address]

            if (override) {
              return mergeDeepRight(token, override)
            }

            return token
          })

          storage.setItem('tokenList', JSON.stringify(tokenList))
          storage.setItem('tokenListTTL', String(Date.now() + CACHE_TTL_MS))
        }
      } else {
        tokenList = JSON.parse(tokenListRaw)
      }

      this._tokenList = tokenList
      return tokenList
    } catch (e) {
      console.log(e)
      notify({
        type: 'error',
        message: 'Unable to fetch token list',
      })
      return []
    }
  }
  async fetchTokenPrices(mintAddresses: string[]) {
    if (!mintAddresses.length) return

    const storage = useLocalStorage()

    const cachedPricesData = storage.getItem(PRICE_STORAGE_KEY)
    const cachedPrices = cachedPricesData
      ? JSON.parse(cachedPricesData)
      : {
          prices: {},
          ttl: '0',
        }
    const tokenList = await this.fetchSolanaTokenListV2()
    const symbolMap = Object.fromEntries(
      tokenList.map((token) => [token.address, token.symbol]),
    )

    const mintAddressesWithSol = chunks([...mintAddresses, WSOL_MINT], 100)

    for (const mintChunk of mintAddressesWithSol) {
      const mintAddressesToProcess = mintChunk.filter(
        (mint) => !this._tokenPriceToUSDlist[mint],
      )

      if (mintAddressesToProcess.length > 0) {
        const mintAddressesToFetch = mintAddressesToProcess.filter((mint) => {
          if (
            Date.now() < Number(cachedPrices.ttl) &&
            cachedPrices.prices[mint]
          ) {
            this._tokenPriceToUSDlist[mint] = cachedPrices.prices[mint]
            return false
          }
          return true
        })

        if (mintAddressesToFetch.length > 0) {
          try {
            const response =
              await getJupiterPricesByMintStrings(mintAddressesToFetch)
            if (response) {
              const priceToUsd: Price[] = Object.entries(response).map(
                ([address, data]) => ({
                  ...data,
                  mintSymbol: symbolMap[address] || 'Unknown',
                  vsToken: USDC_MINT.toBase58(),
                  vsTokenSymbol: 'USDC',
                }),
              )

              priceToUsd.forEach((priceData) => {
                this._tokenPriceToUSDlist[priceData.id] = priceData

                if (cachedPrices.prices[priceData.id]) {
                  cachedPrices.prices[priceData.id] = priceData
                } else {
                  cachedPrices.prices = {
                    ...cachedPrices.prices,
                    [priceData.id]: priceData,
                  }
                }
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
          }
        }
      }
    }

    const USDC_MINT_BASE = USDC_MINT.toBase58()
    if (!this._tokenPriceToUSDlist[USDC_MINT_BASE]) {
      const usdcPrice: Price = {
        id: USDC_MINT_BASE,
        mintSymbol: 'USDC',
        price: 1,
        vsToken: USDC_MINT_BASE,
        vsTokenSymbol: 'USDC',
      }

      this._tokenPriceToUSDlist[USDC_MINT_BASE] = usdcPrice
      if (cachedPrices.prices) {
        cachedPrices.prices[USDC_MINT_BASE] = usdcPrice
      } else {
        cachedPrices.prices = {
          ...cachedPrices.prices,
          [USDC_MINT_BASE]: usdcPrice,
        }
      }

      storage.setItem(PRICE_STORAGE_KEY, JSON.stringify(cachedPrices))
    }

    const chaiMint = '3jsFX1tx2Z8ewmamiwSU851GzyzM2DJMq7KWW5DM8Py3'
    const chaiData = this._tokenPriceToUSDlist[chaiMint]
    if (chaiData?.price && (chaiData.price > 1.3 || chaiData.price < 0.9)) {
      const updatedChaiData: Price = {
        ...chaiData,
        price: 1,
      }
      this._tokenPriceToUSDlist[chaiMint] = updatedChaiData
      cachedPrices.prices[chaiMint] = updatedChaiData

      storage.setItem(PRICE_STORAGE_KEY, JSON.stringify(cachedPrices))
    }
  }

  async fetchTokenPrice(mintAddress: string): Promise<number | null> {
    try {
      if (!mintAddress) return null
      const storage = useLocalStorage()

      if (this._tokenPriceToUSDlist[mintAddress]) {
        return this._tokenPriceToUSDlist[mintAddress].price
      }

      let cachedPrices = {
        prices: {},
        ttl: '0',
      }
      const cachedPricesData = storage.getItem(PRICE_STORAGE_KEY)
      cachedPrices = cachedPricesData ? JSON.parse(cachedPricesData) : null
      if (
        Date.now() < Number(cachedPrices.ttl) &&
        cachedPrices.prices[mintAddress]
      ) {
        this._tokenPriceToUSDlist[mintAddress] =
          cachedPrices.prices[mintAddress]
        return cachedPrices.prices[mintAddress].price
      }

      const response = await getJupiterPricesByMintStrings([mintAddress])

      if (!response || !response[mintAddress]) {
        if (cachedPrices.prices[mintAddress]) {
          cachedPrices.prices[mintAddress] = {
            price: 0,
          }
        } else {
          cachedPrices.prices = {
            ...cachedPrices.prices,
            [mintAddress]: {
              price: 0,
            },
          }
        }
        cachedPrices.ttl = String(Date.now() + PRICE_CACHE_TTL_MS)

        storage.setItem(PRICE_STORAGE_KEY, JSON.stringify(cachedPrices))
        return null
      }

      const tokenInfo = (await this.getTokenInfoAsync(mintAddress)) || undefined

      const priceData: Price = {
        id: mintAddress,
        mintSymbol: tokenInfo?.symbol || 'Unknown',
        price: response[mintAddress].price,
        vsToken: USDC_MINT.toBase58(),
        vsTokenSymbol: 'USDC',
      }

      this._tokenPriceToUSDlist[mintAddress] = priceData
      if (cachedPrices.prices[mintAddress]) {
        cachedPrices.prices[mintAddress] = priceData
      } else {
        cachedPrices.prices = {
          ...cachedPrices.prices,
          [mintAddress]: priceData,
        }
      }

      cachedPrices.ttl = String(Date.now() + PRICE_CACHE_TTL_MS)

      storage.setItem(PRICE_STORAGE_KEY, JSON.stringify(cachedPrices))

      return priceData.price
    } catch (e) {
      console.error('Error fetching token price:', e)
      return null
    }
  }

  /**
   * Can be used but not recommended
   */
  getUSDTokenPrice(mintAddress: string): number {
    return mintAddress ? this._tokenPriceToUSDlist[mintAddress]?.price || 0 : 0
  }
  /**
   * For decimals use on chain tryGetMint
   */
  getTokenInfo(mintAddress: string): TokenInfoJupiter | undefined {
    return this._tokenList?.find(
        (x) => x.address === mintAddress,
    )
  }

  // This async method is used to lookup additional tokens not on JUP's strict list
  async getTokenInfoAsync(
    mintAddress: string,
  ): Promise<TokenInfoJupiter | undefined> {
    const tokenInfo: TokenInfoJupiter | undefined =
      this._unverifiedTokenCache[mintAddress] || undefined

    if (tokenInfo) {
      return tokenInfo
    }
    if (!mintAddress || mintAddress.trim() === '') {
      return undefined
    }
    // Check the strict token list first
    const tokenListRecord = this._tokenList?.find(
      (x) => x.address === mintAddress,
    )
    if (tokenListRecord) {
      return tokenListRecord
    }
    // Check the unverified token list cache next to avoid repeatedly loading token metadata
    if (this._unverifiedTokenCache[mintAddress]) {
      return this._unverifiedTokenCache[mintAddress]
    }

    // logo not found so we return no data.
    return undefined
    // Get the token data from JUP's api
    // try {
    //   const requestURL = `https://tokens.jup.ag/token/${mintAddress}`
    //   const response = await axios.get(requestURL)
    //   if (response.data) {
    //     // Remove decimals and add chainId to match the TokenInfoWithoutDecimals struct
    //     const { decimals, ...tokenInfoWithoutDecimals } = response.data

    //     const finalTokenInfo = {
    //       ...tokenInfoWithoutDecimals,
    //       chainId: 101,
    //     }
    //     // Add to unverified token cache
    //     this._unverifiedTokenCache[mintAddress] = finalTokenInfo
    //     return finalTokenInfo
    //   } else {
    //     return undefined
    //   }
    // } catch {
    //   console.error(`Metadata retrieving failed for ${mintAddress}`)
    //   return undefined
    // }
  }
  catch(e: any) {
    console.error(e)
    notify({
      type: 'error',
      message: 'Unable to fetch token information',
    })
    return undefined
  }

  /**
   * For decimals use on chain tryGetMint
   */
  getTokenInfoFromCoingeckoId(
    coingeckoId: string,
  ): TokenInfoJupiter | undefined {
    return this._tokenList?.find(
        (x) => x.extensions?.coingeckoId === coingeckoId,
    )
  }

  getTokenSymbol(_quoteMint: string) {
        Symbol()
    }
}

const tokenPriceService = new TokenPriceService()

export default tokenPriceService
