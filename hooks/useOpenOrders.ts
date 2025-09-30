import {
  Market,
  RestingOrder,
  UiWrapper,
  UiWrapperOpenOrder,
} from '@cks-systems/manifest-sdk'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import useLegacyConnectionContext from './useLegacyConnectionContext'

export interface UiOpenOrder
  extends RestingOrder,
    Omit<UiWrapperOpenOrder, 'lastValidSlot' | 'orderType'> {
  baseMint: PublicKey
  quoteMint: PublicKey
  market: PublicKey
}

const fetchOpenOrders = async (
  publicKey: PublicKey | null,
  connection: Connection,
) => {
  if (!publicKey) {
    return [] as UiOpenOrder[]
  }
  try {
    const wrapperAcc = await UiWrapper.fetchFirstUserWrapper(
      connection,
      publicKey,
    )

    if (!wrapperAcc) {
      return [] as UiOpenOrder[]
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

    return allMarkets.flatMap((m) => {
      const openOrdersForMarket = wrapper.openOrdersForMarket(m.address)!

      return m
        .openOrders()
        .filter((x) => x.trader.equals(publicKey))
        .map((oo) => ({
          ...oo,
          baseMint: m.baseMint(),
          quoteMint: m.quoteMint(),
          market: m.address,
          ...(openOrdersForMarket.find(
            (ooForMarket) =>
              ooForMarket.orderSequenceNumber.toString() ===
              oo.sequenceNumber.toString(),
          ) || {}),
        })) as UiOpenOrder[]
    })
  } catch (e) {
    console.log('failed to fetch open orders', e)
    return [] as UiOpenOrder[]
  }
}

export const useOpenOrders = (publicKey?: PublicKey) => {
  const connection = useLegacyConnectionContext()
  const {
    data: openOrders,
    isInitialLoading: loadingOpenOrders,
    refetch: refetchOpenOrders,
  } = useQuery(
    ['orders', publicKey],
    () => fetchOpenOrders(publicKey!, connection.current),
    {
      cacheTime: 1000 * 60 * 30,
      staleTime: 1000 * 60 * 30,
      retry: 3,
      refetchOnWindowFocus: false,
      enabled: !!publicKey && !!connection,
    },
  )
  return { openOrders, loadingOpenOrders, refetchOpenOrders }
}
