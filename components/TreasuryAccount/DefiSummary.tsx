import { useDefi } from '@hooks/useDefi'
import { aggregateStats, Plan } from '@hub/providers/Defi'
import { formatNumber } from '@utils/formatNumber'
import cx from 'classnames'
import { useState } from 'react'
import { useTreasurySelectState } from '@components/treasuryV2/Details/treasurySelectStore'
import { Wallet } from '@models/treasury/Wallet'
import DefiDepositModal from '@components/treasuryV2/Details/DefiDetails/DefiDepositModal'
import DefiWithdrawModal from '@components/treasuryV2/Details/DefiDetails/DefiWithdrawModal'
import PlansList from './PlansList'

const DefiSummary = ({
  wallet,
  firstWallet,
}: {
  wallet?: Wallet
  firstWallet?: boolean
}) => {
  const { plans, positions: unfilteredPositions } = useDefi()
  const [startDefiTreasury, setStartDefiTreasury] = useState(false)
  const [treasurySelect, setTreasurySelect] = useTreasurySelectState()
  const [selectedDepositPlan, setSelectedDepositPlan] = useState<Plan | null>(
    null
  )
  const [selectedWithdrawPlan, setSelectedWithdrawPlan] = useState<Plan | null>(
    null
  )

  const positions = wallet
    ? unfilteredPositions.filter((p) => p.walletAddress === wallet.address)
    : unfilteredPositions
  const { totalDepositedUsd, averageApr, totalEarnings } = aggregateStats(
    plans,
    positions
  )

  if (
    wallet &&
    positions.filter((position) => !position.new).length === 0 &&
    !firstWallet &&
    !startDefiTreasury
  ) {
    return (
      <div
        onClick={() => setStartDefiTreasury(true)}
        className={cx(
          'mb-3 px-4 py-2 rounded-md w-full flex flex-col gap-2',
          !wallet
            ? 'cursor-default'
            : 'cursor-pointer bg-bkg-2 hover:bg-bkg-1 text-fgd-3 text-sm'
        )}
      >
        Start Defi Treasury for this wallet
      </div>
    )
  }

  return (
    <>
      {!!selectedDepositPlan && wallet && (
        <DefiDepositModal
          wallet={wallet}
          positions={positions.filter(
            (p) => p.planId === selectedDepositPlan?.id
          )}
          plan={selectedDepositPlan}
          isOpen={!!selectedDepositPlan}
          onClose={() => setSelectedDepositPlan(null)}
        />
      )}
      {!!selectedWithdrawPlan && wallet && (
        <DefiWithdrawModal
          wallet={wallet}
          positions={positions.filter(
            (p) => p.planId === selectedWithdrawPlan?.id
          )}
          plan={selectedWithdrawPlan}
          isOpen={!!selectedWithdrawPlan}
          onClose={() => setSelectedWithdrawPlan(null)}
        />
      )}
      <div
        onClick={() => {
          if (wallet) {
            setTreasurySelect({
              _kind: 'Defi',
              selectedGovernance: wallet.governanceAddress ?? '',
              selectedWallet: wallet,
            })
          }
        }}
        className={cx(
          'mb-3 rounded-md w-full flex flex-col gap-2 relative overflow-hidden',
          !wallet
            ? 'cursor-default'
            : 'px-4 py-2 cursor-pointer bg-bkg-2 hover:bg-bkg-1'
        )}
      >
        <div
          className={cx(
            'absolute',
            'bottom-0',
            'left-0',
            'top-0',
            'transition-all',
            'w-1',
            treasurySelect?._kind === 'Defi' &&
              treasurySelect?.selectedGovernance ===
                wallet?.governanceAddress &&
              treasurySelect.selectedWallet.address === wallet?.address
              ? 'bg-gradient-to-r from-[#00C2FF] via-[#00E4FF] to-[#87F2FF]'
              : 'bg-transparent'
          )}
        />
        <div className="flex justify-between">
          <div className="bg-bkg-1 mb-3 px-4 py-2 rounded-md w-full">
            <p className="text-fgd-3">Defi Balance</p>
            <span className="hero-text">
              ${formatNumber(totalDepositedUsd)}
            </span>
          </div>
        </div>
        <div className="flex justify-between">
          <div>
            <div className="text-white/50 text-sm">APY</div>
            {positions.length > 0 ? (
              <div className="text-green">{averageApr.toFixed(2)}%</div>
            ) : (
              <div className="text-fgd-3">-</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-white/50 text-sm">Cumulative Earnings</div>
            {!totalEarnings.eq(0) ? (
              <div className="text-green">${formatNumber(totalEarnings)}</div>
            ) : (
              <div className="text-fgd-3">-</div>
            )}
          </div>
        </div>
        <PlansList plans={plans} positions={positions} wallet={wallet} />
      </div>
    </>
  )
}

export default DefiSummary
