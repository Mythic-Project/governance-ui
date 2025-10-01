import { BN } from '@coral-xyz/anchor'
import { getMintDecimalAmountFromNatural } from '@tools/sdk/units'
import BigNumber from 'bignumber.js'
import useGovernanceAssets from './useGovernanceAssets'
import { useJupiterPricesByMintsQuery } from './queries/jupiterPrice'
import { PublicKey } from '@metaplex-foundation/js'
import { WSOL_MINT } from '@components/instructions/tools'
import { AccountType } from '@utils/uiTypes/assets'
import { useMangoAccountsTreasury } from './useMangoAccountsTreasury'
import tokenPriceService from '@utils/services/tokenPrice'
import { useEffect } from 'react'

export function useTotalTreasuryPrice() {
  const {
    governedTokenAccountsWithoutNfts,
    assetAccounts,
    auxiliaryTokenAccounts,
  } = useGovernanceAssets()

  const mintsToFetch = [
    ...governedTokenAccountsWithoutNfts,
    ...auxiliaryTokenAccounts,
  ]
    .filter((x) => typeof x.extensions.mint !== 'undefined')
    .map((x) => x.extensions.mint!.publicKey)

  useEffect(() => {
    tokenPriceService.fetchTokenPrices([
      ...mintsToFetch.map((x) => x.toBase58()),
      WSOL_MINT,
    ])
  }, [mintsToFetch])
  const prices = tokenPriceService._tokenPriceToUSDlist

  const totalTokensPrice = [
    ...governedTokenAccountsWithoutNfts,
    ...auxiliaryTokenAccounts,
  ]
    .filter((x) => typeof x.extensions.mint !== 'undefined')
    .map((x) => {
      return (
        getMintDecimalAmountFromNatural(
          x.extensions.mint!.account,
          new BN(
            x.isSol
              ? x.extensions.solAccount!.lamports
              : x.isToken || x.type === AccountType.AUXILIARY_TOKEN
              ? x.extensions.token!.account?.amount
              : 0,
          ),
        ).toNumber() *
        (prices?.[x.extensions.mint!.publicKey.toBase58()]?.usdPrice ?? 0)
      )
    })
    .reduce((acc, val) => acc + val, 0)

  const stakeAccountsTotalPrice = assetAccounts
    .filter((x) => x.extensions.stake)
    .map((x) => {
      return x.extensions.stake!.amount * (prices?.[WSOL_MINT]?.usdPrice ?? 0)
    })
    .reduce((acc, val) => acc + val, 0)

  const totalPrice = totalTokensPrice + stakeAccountsTotalPrice

  const totalPriceFormatted = governedTokenAccountsWithoutNfts.length
    ? new BigNumber(totalPrice)
    : new BigNumber(0)

  return {
    totalPriceFormatted,
  }
}
