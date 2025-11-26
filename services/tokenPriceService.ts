// PATH: ./services/tokenPriceService.ts

import { TokenInfo, TokenListProvider } from '@solana/spl-token-registry'
import { Connection, clusterApiUrl } from '@solana/web3.js'

/**
 * Étend les métadonnées de token pour inclure notre propre prix USD.
 */
export type ExtendedTokenInfo = TokenInfo & {
    extensions?: TokenInfo['extensions'] & {
        usdPrice?: number
    }
}

class TokenPriceService {
    private _tokenList: ExtendedTokenInfo[] = []

    constructor(tokenList: ExtendedTokenInfo[] = []) {
        this._tokenList = tokenList
    }

    /** ✅ Retourne toujours un symbole, ou UNKNOWN si introuvable */
    getTokenSymbol(mint: string): string {
        const token = this._tokenList.find((t) => t.address === mint)
        return token?.symbol ?? 'UNKNOWN'
    }
    /**
     * ✅ Charge la liste des tokens SPL (Token 2022 inclus)
     * depuis le Solana Token Registry, puis récupère les prix USD
     * depuis CoinGecko. Prépare une future extension avec Pyth.
     */
    async fetchSolanaTokenListV2(): Promise<ExtendedTokenInfo[]> {
        console.log('[ORION] Fetching Solana token list...')

        try {
            const tokenListProvider = new TokenListProvider()
            const container = await tokenListProvider.resolve()
            const tokenList = container
                .filterByClusterSlug('mainnet-beta')
                .getList() as ExtendedTokenInfo[]

            console.log(`[ORION] ${tokenList.length} tokens loaded from registry.`)

            // --- récupération des prix depuis CoinGecko ---
            const geckoResp = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=solana,usd-coin,tether,bitcoin,ethereum&vs_currencies=usd'
            )
            const geckoData = await geckoResp.json()

            // --- mapping symboles -> prix USD ---
            const geckoMap: Record<string, number> = {
                SOL: geckoData.solana?.usd ?? 0,
                USDC: geckoData['usd-coin']?.usd ?? 1,
                USDT: geckoData.tether?.usd ?? 1,
                BTC: geckoData.bitcoin?.usd ?? 0,
                ETH: geckoData.ethereum?.usd ?? 0,
            }

            // --- enrichissement des tokens ---
            this._tokenList = tokenList.map((token) => {
                const symbol = token.symbol?.toUpperCase() ?? 'UNKNOWN'
                const price = geckoMap[symbol] ?? (symbol === 'SOL' ? geckoMap.SOL : 0)
                return {
                    ...token,
                    extensions: {
                        ...token.extensions,
                        usdPrice: price,
                    },
                }
            })

            console.log('[ORION] Token list enriched with USD prices.')
            return this._tokenList
        } catch (err) {
            console.error('[ORION] Failed to fetch Solana token list:', err)
            return this._tokenList
        }
    }

    /**
     * 🔧 Prépare la mise à jour des prix via RPC ou oracle (Pyth, Switchboard)
     */
    async initializePrices(connection?: Connection) {
        try {
            if (!connection) new Connection(clusterApiUrl('mainnet-beta'))
            console.log('[ORION] Initializing live prices via Solana connection...')
            // TODO: implémenter Pyth/Switchboard fetch
        } catch (e) {
            console.error('[ORION] initializePrices failed:', e)
        }
    }
}

const tokenPriceService = new TokenPriceService()
export default tokenPriceService
