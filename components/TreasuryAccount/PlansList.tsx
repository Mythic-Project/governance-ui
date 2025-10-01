import { Plan, Position } from '@hub/providers/Defi'
import { formatNumber } from '@utils/formatNumber'
import { BigNumber } from 'bignumber.js'
import cx from 'classnames'
import Button from '@components/Button'
import { Wallet } from '@models/treasury/Wallet'
import Tooltip from '@components/Tooltip'
import DefiDepositModal from '@components/treasuryV2/Details/DefiDetails/DefiDepositModal'
import DefiWithdrawModal from '@components/treasuryV2/Details/DefiDetails/DefiWithdrawModal'
import { useState } from 'react'

const PlansList = ({
  plans,
  positions,
  detailsView,
  wallet,
}: {
  plans: Plan[]
  positions: Position[]
  detailsView?: boolean
  wallet?: Wallet
}) => {
  const [selectedDepositPlan, setSelectedDepositPlan] = useState<Plan | null>(
    null,
  )
  const [selectedWithdrawPlan, setSelectedWithdrawPlan] = useState<Plan | null>(
    null,
  )

  return (
    <>
      {!!selectedDepositPlan && wallet && (
        <DefiDepositModal
          wallet={wallet}
          positions={positions}
          plan={selectedDepositPlan}
          isOpen={!!selectedDepositPlan}
          onClose={() => setSelectedDepositPlan(null)}
        />
      )}
      {!!selectedWithdrawPlan && wallet && (
        <DefiWithdrawModal
          wallet={wallet}
          positions={positions}
          plan={selectedWithdrawPlan}
          isOpen={!!selectedWithdrawPlan}
          onClose={() => setSelectedWithdrawPlan(null)}
        />
      )}
      {plans.map((plan) => {
        const filteredPositions = positions.filter((p) => p.planId === plan.id)
        const planTotalBalance = filteredPositions.reduce(
          (acc, position) => acc.plus(position.amount),
          new BigNumber(0),
        )
        const planTotalBalanceUsd = filteredPositions.reduce(
          (acc, position) => acc.plus(position.amount.times(plan.price ?? 0)),
          new BigNumber(0),
        )
        return (
          <div
            className={cx(
              'flex items-center w-full p-3 border rounded-lg text-fgd-1 border-fgd-4 justify-between',
              detailsView ? undefined : 'group/plan',
            )}
            key={plan.id}
          >
            <div className="flex flex-col gap-2 w-[100px]">
              <div className="text-sm font-bold flex items-center gap-1">
                <img
                  className={`flex-shrink-0 h-4 w-4`}
                  src={plan.assets[0].logo}
                  onError={({ currentTarget }) => {
                    currentTarget.onerror = null // prevents looping
                    currentTarget.hidden = true
                  }}
                />
                {plan.name}
              </div>
              <div className="text-xs">via {plan.protocol}</div>
            </div>
            <div className="flex-1 flex justify-between">
              <div className="flex flex-col gap-2 justify-between flex-1">
                <Tooltip
                  content={`${planTotalBalance} ${plan.assets[0].symbol}`}
                >
                  <div className="text-sm font-bold">
                    {planTotalBalance
                      ? formatNumber(planTotalBalance, undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                          notation: 'compact',
                        })
                      : '-'}{' '}
                    {plan.assets[0].symbol}
                  </div>
                </Tooltip>
                <Tooltip content={`$${planTotalBalanceUsd}`}>
                  <div className="text-xs">
                    $
                    {planTotalBalanceUsd
                      ? formatNumber(planTotalBalanceUsd, undefined, {
                          maximumFractionDigits: 2,
                          notation: 'compact',
                        })
                      : '-'}
                  </div>
                </Tooltip>
              </div>
              <div
                className={cx(
                  'flex flex-col gap-2 justify-between',
                  wallet ? 'group-hover/plan:hidden' : '',
                )}
              >
                <div className="text-sm text-right text-green">{plan.apr}%</div>
                <div className="text-xs underline h-[16px]">
                  {filteredPositions.length > 1
                    ? `${filteredPositions.length} positions`
                    : ''}
                </div>
              </div>
              <div
                className={cx(
                  'text-sm gap-1 items-center justify-end',
                  wallet ? 'group-hover/plan:flex hidden' : 'hidden',
                )}
              >
                <Button onClick={() => setSelectedDepositPlan(plan)}>
                  Deposit
                </Button>
                <Button onClick={() => setSelectedWithdrawPlan(plan)}>
                  Withdraw
                </Button>
              </div>
            </div>
            {detailsView && (
              <div className="text-sm flex gap-1 items-center ml-4">
                <Button onClick={() => setSelectedDepositPlan(plan)}>
                  Deposit
                </Button>
                <Button onClick={() => setSelectedWithdrawPlan(plan)}>
                  Withdraw
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

export default PlansList
