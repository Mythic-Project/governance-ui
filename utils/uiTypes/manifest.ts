import { RestingOrder, UiWrapperOpenOrder } from '@cks-systems/manifest-sdk'
import { PublicKey } from '@solana/web3.js'

export interface UiOpenOrder
  extends RestingOrder,
    Omit<UiWrapperOpenOrder, 'lastValidSlot' | 'orderType'> {
  baseMint: PublicKey
  quoteMint: PublicKey
  market: PublicKey
}
