import React from 'react'
import cx from 'classnames'
import { useDefi } from '@hooks/useDefi'
import { Wallet } from '@models/treasury/Wallet'
import { formatNumber } from '@utils/formatNumber'
import { aggregateStats, Plan } from '@hub/providers/Defi'
import PlansList from '@components/TreasuryAccount/PlansList'
import Header from './Header'
import StickyScrolledContainer from '../StickyScrolledContainer'

interface Props {
  className?: string
  wallet: Wallet
  isStickied?: boolean
}

export default function DefiDetails(props: Props) {
  const { plans, positions: unfilteredPositions } = useDefi()

  const positions = unfilteredPositions.filter(
    (position) => position.walletAddress === props.wallet.address
  )

  const plansGroupedByType = plans.reduce((acc, plan) => {
    acc[plan.type] = acc[plan.type] || []
    acc[plan.type].push(plan)
    return acc
  }, {})

  const { totalDepositedUsd, averageApr, totalEarnings } = aggregateStats(
    plans,
    positions
  )

  return (
    <div className={cx(props.className, 'rounded', 'overflow-hidden')}>
      <StickyScrolledContainer
        className="h-full"
        isAncestorStickied={props.isStickied}
      >
        <Header
          walletAddress={props.wallet.address}
          totalBalance={totalDepositedUsd}
        />
        <section className="p-6 bg-bkg-3 flex flex-col gap-2">
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
          {Object.entries(plansGroupedByType).map(
            ([type, plans]: [string, Plan[]]) => {
              return (
                <div key={type} className="flex flex-col gap-2">
                  <p className="text-fgd-3 text-sm">{type}</p>
                  <PlansList
                    plans={plans}
                    positions={positions}
                    detailsView={true}
                    wallet={props.wallet}
                  />
                </div>
              )
            }
          )}
        </section>
      </StickyScrolledContainer>
    </div>
  )
}
