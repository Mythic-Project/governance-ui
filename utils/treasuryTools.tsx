import { getAccountName, WSOL_MINT } from '@components/instructions/tools'
import { BN } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { getMintDecimalAmountFromNatural } from '@tools/sdk/units'
import BigNumber from 'bignumber.js'
import { abbreviateAddress } from './formatting'
import tokenPriceService, {
  TokenInfoWithoutDecimals,
} from './services/tokenPrice'
import { AccountType, AssetAccount } from './uiTypes/assets'

interface TreasuryAccountInfo {
  accountName: string
  amountFormatted: string
  logo: string
  name: string
  displayPrice: string
  info: TokenInfoWithoutDecimals | undefined
  symbol: string
  totalPrice: number
}

export const getTreasuryAccountItemInfoV2 = (account: AssetAccount) => {
  const mintAddress =
    account.type === AccountType.SOL
      ? WSOL_MINT
      : account.extensions.mint?.publicKey.toBase58()

  const amount =
    account.extensions.amount && account.extensions.mint
      ? getMintDecimalAmountFromNatural(
          account.extensions.mint.account,
          new BN(
            account.isSol
              ? account.extensions.solAccount!.lamports
              : account.extensions.amount,
          ),
        ).toNumber()
      : 0
  const price = tokenPriceService.getUSDTokenPrice(mintAddress!)
  const totalPrice = amount * price
  const totalPriceFormatted = amount
    ? new BigNumber(totalPrice).toFormat(0)
    : ''
  const info = tokenPriceService.getTokenInfo(mintAddress!)
  const symbol =
    account.type === AccountType.NFT
      ? 'NFTS'
      : account.type === AccountType.SOL
      ? 'SOL'
      : info?.symbol
      ? info.address === WSOL_MINT
        ? 'wSOL'
        : info?.symbol
      : account.extensions.mint
      ? abbreviateAddress(account.extensions.mint.publicKey)
      : ''
  const amountFormatted = new BigNumber(amount).toFormat()

  const logo = info?.logoURI || ''
  const accountName = account.pubkey ? getAccountName(account.pubkey) : ''
  const name = accountName
    ? accountName
    : account.extensions.transferAddress
    ? abbreviateAddress(account.extensions.transferAddress as PublicKey)
    : ''

  const displayPrice =
    totalPriceFormatted && totalPriceFormatted !== '0'
      ? totalPriceFormatted
      : ''

  return {
    accountName,
    amountFormatted,
    logo,
    name,
    displayPrice,
    info,
    symbol,
    totalPrice,
  }
}
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes in milliseconds

export const getTreasuryAccountItemInfoV2Async = async (
  account: AssetAccount,
) => {
  const cacheKey = `tokenAccountInfoItem_${account.pubkey.toString()}`

  // Check cache first
  const cachedData = localStorage.getItem(cacheKey)
  const cacheTTL = localStorage.getItem('tokenAccountInfoItem_ttl')

  // If we have valid cached data, return it
  if (cachedData && cacheTTL && Date.now() < Number(cacheTTL)) {
    return JSON.parse(cachedData) as TreasuryAccountInfo
  }

  // If no cache or expired, fetch fresh data
  // this is safe because we are using a browser local storage
  await tokenPriceService.fetchSolanaTokenListV2()

  const mintAddress =
    account.type === AccountType.SOL
      ? WSOL_MINT
      : account.extensions.mint?.publicKey.toBase58()

  const amount =
    account.extensions.amount && account.extensions.mint
      ? getMintDecimalAmountFromNatural(
          account.extensions.mint.account,
          new BN(
            account.isSol
              ? account.extensions.solAccount!.lamports
              : account.extensions.amount,
          ),
        ).toNumber()
      : 0

  let price = tokenPriceService.getUSDTokenPrice(mintAddress!) || null
  if (!price) {
    price = (await tokenPriceService.fetchTokenPrice(mintAddress!)) || 0
  }

  const totalPrice = amount * price
  const totalPriceFormatted = amount
    ? new BigNumber(totalPrice).toFormat(0)
    : ''

  let info = tokenPriceService.getTokenInfo(mintAddress!)
  if (!info) {
    info = await tokenPriceService.getTokenInfoAsync(mintAddress!)
  }

  const symbol =
    account.type === AccountType.NFT
      ? 'NFTS'
      : account.type === AccountType.SOL
      ? 'SOL'
      : info?.symbol
      ? info.address === WSOL_MINT
        ? 'wSOL'
        : info?.symbol
      : account.extensions.mint
      ? abbreviateAddress(account.extensions.mint.publicKey)
      : ''

  const amountFormatted = new BigNumber(amount).toFormat()
  const logo = info?.logoURI || ''
  const accountName = account.pubkey ? getAccountName(account.pubkey) : ''
  const name = accountName
    ? accountName
    : account.extensions.transferAddress
    ? abbreviateAddress(account.extensions.transferAddress as PublicKey)
    : ''

  const displayPrice =
    totalPriceFormatted && totalPriceFormatted !== '0'
      ? totalPriceFormatted
      : ''

  const result: TreasuryAccountInfo = {
    accountName,
    amountFormatted,
    logo,
    name,
    displayPrice,
    info,
    symbol,
    totalPrice,
  }

  try {
    // Store in cache with TTL
    localStorage.setItem(cacheKey, JSON.stringify(result))
    localStorage.setItem(
      `tokenAccountInfoItem_ttl`,
      String(Date.now() + CACHE_TTL_MS),
    )
  } catch (e) {
    console.warn('Failed to cache treasury account info:', e)
  }

  return result
}
