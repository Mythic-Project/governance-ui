import { Market, UiWrapper } from '@cks-systems/manifest-sdk'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import useLegacyConnectionContext from './useLegacyConnectionContext'

type Unsettled = {
  market: Market
  numBaseTokens: number
  numQuoteTokens: number
}

const fetchUnsettledBalances = async (
  publicKey: PublicKey | null,
  connection: Connection,
): Promise<Unsettled[]> => {
  if (!publicKey) {
    return []
  }
  try {
    const wrapperAcc = await UiWrapper.fetchFirstUserWrapper(
      connection,
      publicKey,
    )

    if (!wrapperAcc) {
      return []
    }

    const wrapper = UiWrapper.loadFromBuffer({
      address: wrapperAcc.pubkey,
      buffer: wrapperAcc.account.data,
    })

    const allMarketPks = wrapper.activeMarkets()
    const allMarketInfos =
      await connection.getMultipleAccountsInfo(allMarketPks)
    const allMarkets = allMarketPks.map((address, i) =>
      Market.loadFromBuffer({ address, buffer: allMarketInfos[i]!.data }),
    )
    const unsettled = wrapper.unsettledBalances(allMarkets)
    return unsettled
  } catch (e) {
    console.log('failed to fetch unsettled balances', e)
    return []
  }
}

export const useUnsettledBalances = (publicKey?: PublicKey) => {
  const connection = useLegacyConnectionContext()
  const {
    data: unsettledBalances,
    isInitialLoading: loadingUnsettledBalances,
    refetch: refetchUnsettledBalances,
  } = useQuery(
    ['unsettled', publicKey],
    () => fetchUnsettledBalances(publicKey!, connection.current),
    {
      cacheTime: 1000 * 60 * 30,
      staleTime: 1000 * 60 * 30,
      refetchInterval: 5000,
      retry: 3,
      refetchOnWindowFocus: false,
      enabled: !!publicKey && !!connection,
    },
  )
  const filteredUnsettledBalances = useMemo(() => {
    if (!unsettledBalances?.length) return []
    return unsettledBalances.filter((u) => u.numBaseTokens || u.numQuoteTokens)
  }, [unsettledBalances])

  return {
    unsettledBalances: filteredUnsettledBalances,
    loadingUnsettledBalances,
    refetchUnsettledBalances,
  }
}
