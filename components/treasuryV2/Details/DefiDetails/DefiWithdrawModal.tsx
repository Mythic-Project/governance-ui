import SaveWithdrawModal from '@components/treasuryV2/Plans/save/SaveWithdrawModal'
import { Plan, Position } from '@hub/providers/Defi'
import { PROTOCOL_SLUG as SAVE_PROTOCOL_SLUG } from '@hub/providers/Defi/plans/save'
import { Wallet } from '@models/treasury/Wallet'

export default function DefiWithdrawModal({
  plan,
  positions,
  isOpen,
  onClose,
  wallet,
}: {
  plan: Plan
  positions: Position[]
  isOpen: boolean
  onClose: () => void
  wallet: Wallet
}) {
  switch (plan.protocol) {
    case SAVE_PROTOCOL_SLUG:
      return (
        <SaveWithdrawModal
          wallet={wallet}
          plan={plan}
          positions={positions}
          isOpen={isOpen}
          onClose={onClose}
        />
      )
  }
  return null
}
