import { toUiDecimals } from '@blockworks-foundation/mango-v4'
import {
  Market,
  orderTypeBeet,
  RestingOrder,
  UiWrapper,
  UiWrapperOpenOrder,
} from '@cks-systems/manifest-sdk'
import {
  PlaceOrderInstructionArgs,
  WrapperCancelOrderParams,
  WrapperPlaceOrderParams,
} from '@cks-systems/manifest-sdk/dist/types/src/ui_wrapper'
import * as beet from '@metaplex-foundation/beet'
import { AccountMetaData } from '@solana/spl-governance'
import { Connection, PublicKey } from '@solana/web3.js'
import { abbreviateAddress } from '@utils/formatting'
import tokenPriceService from '@utils/services/tokenPrice'
import { tryGetTokenMint } from '@utils/tokens'
import { UiOpenOrder } from '@utils/uiTypes/manifest'

export type CancelOrderInstructionArgs = {
  params: WrapperCancelOrderParams
}

export const wrapperCancelOrderParamsBeet =
  new beet.BeetArgsStruct<WrapperCancelOrderParams>(
    [['clientOrderId', beet.u64]],
    'WrapperCancelOrderParams',
  )

export const CancelOrderStruct = new beet.BeetArgsStruct<
  CancelOrderInstructionArgs & {
    instructionDiscriminator: number
  }
>(
  [
    ['instructionDiscriminator', beet.u8],
    ['params', wrapperCancelOrderParamsBeet],
  ],
  'CancelOrderInstructionArgs',
)

const wrapperPlaceOrderParamsBeet =
  new beet.BeetArgsStruct<WrapperPlaceOrderParams>(
    [
      ['clientOrderId', beet.u64],
      ['baseAtoms', beet.u64],
      ['priceMantissa', beet.u32],
      ['priceExponent', beet.i8],
      ['isBid', beet.bool],
      ['lastValidSlot', beet.u32],
      ['orderType', orderTypeBeet],
    ],
    'WrapperPlaceOrderParams',
  )

export const PlaceOrderStruct = new beet.BeetArgsStruct<
  PlaceOrderInstructionArgs & {
    instructionDiscriminator: number
  }
>(
  [
    ['instructionDiscriminator', beet.u8],
    ['params', wrapperPlaceOrderParamsBeet],
  ],
  'PlaceOrderInstructionArgs',
)

export const MANIFEST_INSTRUCTIONS = {
  UMnFStVeG1ecZFc2gc5K3vFy3sMpotq8C91mXBQDGwh: {
    2: {
      name: 'Place limit order',
      accounts: [
        { name: 'Wrapper State' },
        { name: 'Owner' },
        { name: 'Trader Token Account' },
        { name: 'Market' },
        { name: 'Vault' },
        { name: 'Mint' },
        { name: 'System Program' },
        { name: 'Token Program' },
        { name: 'Manifest Program' },
        { name: 'Payer' },
        { name: 'Base Mint' },
        { name: 'Base Global' },
        { name: 'Base Global Vault' },
        { name: 'Base Market Vault' },
        { name: 'Base Token Program' },
        { name: 'Quote Mint' },
        { name: 'Quote Global' },
        { name: 'Quote Global Vault' },
        { name: 'Quote Market Vault' },
        { name: 'Quote Token Program' },
      ],
      getDataUI: async (
        connection: Connection,
        data: Uint8Array,
        accounts: AccountMetaData[],
      ) => {
        const params = PlaceOrderStruct.deserialize(Buffer.from(data))[0].params

        const amount = params.baseAtoms

        const side = params.isBid ? 'Buy' : 'Sell'
        let quoteTokenInfo = tokenPriceService.getTokenInfo(
          accounts[15].pubkey.toBase58(),
        )
        let baseTokenInfo = tokenPriceService.getTokenInfo(
          accounts[10].pubkey.toBase58(),
        )
        console.log(
          accounts[15].pubkey.toBase58(),
          accounts[10].pubkey.toBase58(),
        )
        if (!baseTokenInfo) {
          const resp = await connection.getParsedAccountInfo(
            accounts[10].pubkey,
          )
          baseTokenInfo = {
            //@ts-ignore
            decimals: resp.value?.data.parsed.info.decimals,
            symbol: accounts[10].pubkey.toBase58(),
          } as any
        }
        if (!quoteTokenInfo) {
          const resp = await connection.getParsedAccountInfo(
            accounts[15].pubkey,
          )
          quoteTokenInfo = {
            //@ts-ignore
            decimals: resp.value?.data.parsed.info.decimals,
            symbol: accounts[15].pubkey.toBase58(),
          } as any
        }

        const market = accounts[3].pubkey

        const marketData = await Market.loadFromAddress({
          connection: connection,
          address: new PublicKey(market),
        })
        const mint = baseTokenInfo
        const currency = quoteTokenInfo

        const uiAmount = toUiDecimals(amount, mint!.decimals)
        const price =
          params.priceMantissa *
          Math.pow(
            10,
            -(quoteTokenInfo!.decimals - baseTokenInfo!.decimals) +
              params.priceExponent,
          )
        return (
          <div>
            <div>
              Market name:{' '}
              {`${
                tokenPriceService.getTokenInfo(marketData.baseMint().toBase58())
                  ?.symbol || abbreviateAddress(marketData.baseMint())
              }/${
                tokenPriceService.getTokenInfo(
                  marketData.quoteMint().toBase58(),
                )?.symbol || abbreviateAddress(marketData.quoteMint())
              }`}
            </div>
            <div>Side: {side}</div>
            <div>
              Quote Token:{' '}
              {quoteTokenInfo?.symbol ||
                abbreviateAddress(marketData.quoteMint())}
            </div>
            <div>
              Base Token:{' '}
              {baseTokenInfo?.symbol ||
                abbreviateAddress(marketData.baseMint())}
            </div>
            <div>
              {side} {uiAmount} {mint?.symbol} for {price * uiAmount}{' '}
              {currency?.symbol} ({price} {currency?.symbol} each)
            </div>
          </div>
        )
      },
    },
    4: {
      name: 'Cancel',
      accounts: [
        { name: 'Wrapper State' },
        { name: 'Owner' },
        { name: 'Trader Token Account' },
        { name: 'Market' },
        { name: 'Vault' },
        { name: 'Mint' },
        { name: 'System Program' },
        { name: 'Token Program' },
        { name: 'Manifest Program' },
      ],
      getDataUI: async (
        connection: Connection,
        data: Uint8Array,
        accounts: AccountMetaData[],
      ) => {
        const params = CancelOrderStruct.deserialize(Buffer.from(data))[0]
          .params

        const wrapperAcc = await UiWrapper.fetchFirstUserWrapper(
          connection,
          accounts[1].pubkey,
        )
        if (!wrapperAcc) {
          return null
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

        const openOrders = allMarkets.flatMap((m) => {
          const openOrdersForMarket = wrapper.openOrdersForMarket(m.address)!

          return m
            .openOrders()
            .filter((x) => x.trader.equals(accounts[1].pubkey))
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
        const openOrder = openOrders.find(
          (x) => x.clientOrderId.toString() === params.clientOrderId.toString(),
        )
        if (openOrder) {
          const quoteTokenInfo = tokenPriceService.getTokenInfo(
            openOrder.quoteMint.toBase58(),
          )
          const baseTokenInfo = tokenPriceService.getTokenInfo(
            openOrder.baseMint.toBase58(),
          )
          const side = openOrder.isBid ? 'Buy' : 'Sell'
          return (
            <div>
              <div>
                Market name:{' '}
                {`${
                  baseTokenInfo?.symbol || abbreviateAddress(openOrder.baseMint)
                }/${
                  quoteTokenInfo?.symbol ||
                  abbreviateAddress(openOrder.quoteMint)
                }`}
              </div>
              <div>Side: {side}</div>
              <div>
                Quote Token:{' '}
                {quoteTokenInfo?.symbol ||
                  abbreviateAddress(openOrder.quoteMint)}
              </div>
              <div>
                Base Token:{' '}
                {baseTokenInfo?.symbol || abbreviateAddress(openOrder.baseMint)}
              </div>
              <div>clientOrderId: {params.clientOrderId.toString()}</div>
            </div>
          )
        } else {
          return 'No order found'
        }
      },
    },
    5: {
      name: 'Settle',
      accounts: [
        { name: 'Wrapper State' },
        { name: 'Owner' },
        { name: 'Trader Token Account Base' },
        { name: 'Trader Token Account Quote' },
        { name: 'Market' },
        { name: 'Vault Base' },
        { name: 'Vault Quote' },
        { name: 'Mint Base' },
        { name: 'Mint Quote' },
        { name: 'Token Program Base' },
        { name: 'Token Program Quote' },
        { name: 'Manifest Program' },
        { name: 'Platform Token Account' },
        { name: 'Referrer Token Account' },
      ],
      getDataUI: async (
        connection: Connection,
        data: Uint8Array,
        accounts: AccountMetaData[],
      ) => {
        const wrapperAcc = await UiWrapper.fetchFirstUserWrapper(
          connection,
          accounts[1].pubkey!,
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
        const unsettled = await wrapper.unsettledBalances(allMarkets)
        const filteredUnsettled = (unsettled?.length ? unsettled : [])
          .filter((u) => u.numBaseTokens || u.numQuoteTokens)
          .filter((x) => x.market.address.equals(accounts[4].pubkey))
        const toSettle = filteredUnsettled.length ? filteredUnsettled[0] : null
        const quoteTokenInfo = tokenPriceService.getTokenInfo(
          accounts[8].pubkey.toBase58(),
        )
        const baseTokenInfo = tokenPriceService.getTokenInfo(
          accounts[7].pubkey.toBase58(),
        )

        return (
          <div>
            {quoteTokenInfo && (
              <div>
                {quoteTokenInfo?.symbol} to settle{' '}
                {toSettle?.numQuoteTokens || 0}
              </div>
            )}
            {baseTokenInfo && (
              <div>
                {baseTokenInfo?.symbol} to settle {toSettle?.numBaseTokens || 0}
              </div>
            )}
          </div>
        )
      },
    },
  },
}
