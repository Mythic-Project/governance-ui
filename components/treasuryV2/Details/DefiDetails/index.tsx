import React, { useState } from 'react'
import cx from 'classnames'
import Header from './Header'
import StickyScrolledContainer from '../StickyScrolledContainer'
import { useDefi } from '@hooks/useDefi'
import useTreasuryInfo from '@hooks/useTreasuryInfo'
import { Status } from '@utils/uiTypes/Result'
import { AssetType } from '@models/treasury/Asset'
import BigNumber from 'bignumber.js'
import { formatNumber } from '@utils/formatNumber'
import Button from '@components/Button'
import { Plan } from '@hub/providers/Defi'
import DepositModal from '@components/treasuryV2/Plans/save/DepositModal'
import WithdrawModal from '@components/treasuryV2/Plans/save/WithdrawModal'

interface Props {
  className?: string
  walletAddress: string
  isStickied?: boolean
}

export default function DefiDetails(props: Props) {
  const { plans: unfilteredPlans } = useDefi();
  const [selectedDepositPlan, setSelectedDepositPlan] = useState<Plan | null>(null);
  const [selectedWithdrawPlan, setSelectedWithdrawPlan] = useState<Plan | null>(null);
  const data = useTreasuryInfo();
  switch (data._tag) {
    case Status.Failed:
      return (
        <div className={props.className}>
          <div className="h-52 rounded bg-bkg-1 opacity-50" />
        </div>
      )
    case Status.Pending:
      return (
        <div className={props.className}>
          <div className="h-52 rounded bg-bkg-1 animate-pulse" />
        </div>
      )
    default:

  const wallet = data.data.wallets.find((wallet) => wallet.address === props.walletAddress);
  const plans = wallet ? unfilteredPlans.map((plan) => {
    const position = plan.positions.find((position) => wallet.assets.find((asset) => asset.type === AssetType.Token && asset.address === position.accountAddress));
    return {
      ...plan,
      positions: position ? [position] : [],
    };
  }) : unfilteredPlans;

  const plansGroupedByType = plans.reduce((acc, plan) => {
    acc[plan.type] = acc[plan.type] || [];
    acc[plan.type].push(plan);
    return acc;
  }, {});

  const totalBalance = plans.reduce((acc, plan) => acc.plus(plan.positions.reduce((acc, position) => acc.plus(position.amount), new BigNumber(0))), new BigNumber(0));
  const totalDeposited = plans.reduce((acc, plan) => acc.plus(plan.positions.reduce((acc, position) => acc.plus(position.amount), new BigNumber(0))), new BigNumber(0));
  const averageApr = totalDeposited.isZero() ? new BigNumber(0) : plans.reduce(
    (acc, plan) => {
      const totalDepositedInPlan = plan.positions.reduce((acc, position) => acc.plus(position.amount), new BigNumber(0));
      return acc.plus(
      totalDepositedInPlan.times(plan.apr)
    )}, new BigNumber(0)).dividedBy(totalDeposited);
    const totalEarnings = plans.reduce((acc, plan) => acc.plus(plan.positions.reduce((acc, position) => acc.plus(position.earnings ?? 0), new BigNumber(0))), new BigNumber(0));


    return (
      <div className={cx(props.className, 'rounded', 'overflow-hidden')}>
        {!!selectedDepositPlan && <DepositModal plan={selectedDepositPlan} isOpen={!!selectedDepositPlan} onClose={() => setSelectedDepositPlan(null)} />}
        {!!selectedWithdrawPlan && <WithdrawModal plan={selectedWithdrawPlan} isOpen={!!selectedWithdrawPlan} onClose={() => setSelectedWithdrawPlan(null)} />}
        <StickyScrolledContainer
          className="h-full"
          isAncestorStickied={props.isStickied}
        >
          <Header walletAddress={props.walletAddress} totalBalance={totalBalance}/>
          <section className="p-6 bg-bkg-3 flex flex-col gap-2">
            <div className='flex justify-between'>
              <div>
                <p>Cumulative Earnings</p>
                <p>${formatNumber(totalEarnings)}</p>
              </div>
              <div>
                <p>Overall APR</p>
                <p>{averageApr.toFixed(2)}%</p>
              </div>
            </div>
            {
        Object.entries(plansGroupedByType).map(([type, plans] : [string, Plan[]]) => {
          return (
          <div key={type} className='flex flex-col gap-2'>
            <p className='text-fgd-3 text-sm'>{type}</p>
            {plans.map((plan) => {
          const planTotalBalance = plan.positions.reduce((acc, position) => acc.plus(position.amount), new BigNumber(0));
          const planTotalBalanceUsd = plan.positions.reduce((acc, position) => acc.plus(position.amount.times(plan.price ?? 0)), new BigNumber(0));
          return (
          <div className='flex items-center w-full p-3 border rounded-lg text-fgd-1 border-fgd-4 justify-between' key={plan.name}>
            <div className='flex flex-col gap-2'>
              <div className='text-sm font-bold flex items-center gap-1'><img
          className={`flex-shrink-0 h-4 w-4`}
          src={plan.assets[0].logo}
          onError={({ currentTarget }) => {
            currentTarget.onerror = null // prevents looping
            currentTarget.hidden = true
          }}
        />{plan.name}</div>
              <div className='text-xs'>via {plan.protocol}</div>
            </div>
            <div className='flex flex-col gap-2 justify-between'>
              <div className='text-sm font-bold'>{planTotalBalance ? formatNumber(planTotalBalance, undefined, { maximumFractionDigits: 2 }) : '-'} {plan.assets[0].symbol}</div>
              <div className='text-xs'>${planTotalBalanceUsd ? formatNumber(planTotalBalanceUsd, undefined, { maximumFractionDigits: 2 }) : '-'}</div>
            </div>
            <div className='flex flex-col gap-2 justify-between'>
              <div className='text-sm text-right text-green'>{plan.apr}%</div>
              {plan.positions.length > 1 && <div className='text-xs underline'>{plan.positions.length} positions</div>}
            </div>
            <div className='text-sm flex gap-1 items-center'>
              <Button onClick={() => setSelectedDepositPlan(plan)}>Deposit</Button>
              <Button onClick={() => setSelectedWithdrawPlan(plan)}>Withdraw</Button>
            </div>
          </div>
        )})
      }</div>)})}
          </section>
        </StickyScrolledContainer>
      </div>
    )
  }
}
