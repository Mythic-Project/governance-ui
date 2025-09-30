import { toUiDecimals } from '@blockworks-foundation/mango-v4'
import { abbreviateAddress } from './formatting'
import tokenPriceService from './services/tokenPrice'
import { AssetAccount } from './uiTypes/assets'
import { PublicKey } from '@solana/web3.js'
import { TokenInfo } from './services/types'

export type SideMode = 'Sell' | 'Buy'

export const getTokenLabels = (assetAccount: AssetAccount | null) => {
  const tokenList = tokenPriceService._tokenList
  const foundByNameToken = tokenList.find(
    (x) =>
      x.address === assetAccount?.extensions.token?.account.mint.toBase58(),
  )
  const symbol = assetAccount?.isToken
    ? foundByNameToken?.symbol ||
      (assetAccount.extensions.token &&
        abbreviateAddress(assetAccount.extensions.token.account.mint))
    : assetAccount?.isSol
    ? 'SOL'
    : ''

  const img = assetAccount?.isToken
    ? foundByNameToken?.logoURI
    : assetAccount?.isSol
    ? 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
    : ''
  const uiAmount = assetAccount?.isToken
    ? toUiDecimals(
        assetAccount.extensions.token!.account.amount,
        assetAccount.extensions.mint!.account.decimals,
      )
    : assetAccount?.isSol
    ? toUiDecimals(assetAccount.extensions.amount!, 9)
    : 0

  return { img, uiAmount, symbol }
}

export const getTokenLabelsFromInfo = (assetAccount: TokenInfo | null) => {
  const symbol = assetAccount?.symbol

  const img = assetAccount?.logoURI
  const uiAmount = null

  return { img, uiAmount, symbol }
}

export const tryGetNumber = (val: string) => {
  try {
    return Number(val)
  } catch (e) {
    return 0
  }
}

export const FEE_WALLET = new PublicKey(
  '4GbrVmMPYyWaHsfRw7ZRnKzb98McuPovGqr27zmpNbhh',
)

export const fetchLastPriceForMints = async (
  mints: string[],
): Promise<LastPrice[]> => {
  const url = new URL(
    `https://services.cabana-exchange.cloud/tnthieloh3ge/last-price`,
  )
  const requestConfig: RequestInit = {}
  if (mints.length <= 20) {
    const params = new URLSearchParams({
      mints: mints.join(','),
    })
    url.search = params.toString()
  } else {
    requestConfig.method = 'POST'
    requestConfig.headers = { 'Content-Type': 'application/json' }
    requestConfig.body = JSON.stringify({ mints })
  }

  try {
    const response = await fetch(url, requestConfig)
    const data: LastPriceData = await response.json()
    return data?.data?.length ? data.data : []
  } catch (e) {
    console.error('failed to fetch last price for mints', e)
    return []
  }
}

export type LastPrice = {
  mint: string
  price: number
}

type LastPriceData = {
  data: LastPrice[]
}

export const MANIFEST_PROGRAM_ID = new PublicKey(
  'MNFSTqtC93rEfYHB6hF82sKdZpUDFWkViLByLd1k1Ms',
)
