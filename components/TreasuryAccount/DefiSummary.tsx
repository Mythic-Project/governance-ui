import { ChevronRightIcon } from '@heroicons/react/outline';
import { useDefi } from '@hooks/useDefi';
import useQueryContext from '@hooks/useQueryContext';
import useRealm from '@hooks/useRealm';
import { Plan } from '@hub/providers/Defi';
import { formatNumber } from '@utils/formatNumber'
import { BigNumber } from 'bignumber.js';
import Link from 'next/dist/client/link';
import cx from 'classnames';
import { useState } from 'react';
import WithdrawModal from '@components/treasuryV2/Plans/save/WithdrawModal';
import DepositModal from '@components/treasuryV2/Plans/save/DepositModal';
import Button from '@components/Button';
import { useTreasurySelectState } from '@components/treasuryV2/Details/treasurySelectStore';
import { Wallet } from '@models/treasury/Wallet';
import { AssetType } from '@models/treasury/Asset';

const DefiSummary = ({wallet, firstWallet}: {wallet?: Wallet, firstWallet?: boolean}) => {
  const { plans: unfilteredPlans } = useDefi();
  const plans = wallet ? unfilteredPlans.map((plan) => {
    const position = plan.positions.find((position) => wallet.assets.find((asset) => asset.type === AssetType.Token && asset.address === position.accountAddress));
    return {
      ...plan,
      positions: position ? [position] : [],
    };
  }) : unfilteredPlans;
  const { fmtUrlWithCluster } = useQueryContext();
  const [startDefiTreasury, setStartDefiTreasury] = useState(false);
  const [_treasurySelect, setTreasurySelect] = useTreasurySelectState()
  const [selectedDepositPlan, setSelectedDepositPlan] = useState<Plan | null>(null);
  const [selectedWithdrawPlan, setSelectedWithdrawPlan] = useState<Plan | null>(null);
  const { symbol } = useRealm();
  const totalBalance = plans.reduce((acc, plan) => acc.plus(plan.positions.reduce((acc, position) => acc.plus(position.amount), new BigNumber(0))), new BigNumber(0));
  const totalDeposited = plans.reduce((acc, plan) => acc.plus(plan.positions.reduce((acc, position) => acc.plus(position.amount), new BigNumber(0))), new BigNumber(0));
  const averageApr = totalDeposited.isZero() ? new BigNumber(0) : plans.reduce(
    (acc, plan) => {
      const totalDepositedInPlan = plan.positions.reduce((acc, position) => acc.plus(position.amount), new BigNumber(0));
      return acc.plus(
      totalDepositedInPlan.times(plan.apr)
    )}, new BigNumber(0)).dividedBy(totalDeposited);
    const totalEarnings = plans.reduce((acc, plan) => acc.plus(plan.positions.reduce((acc, position) => acc.plus(position.earnings ?? 0), new BigNumber(0))), new BigNumber(0));

    if (wallet && plans.flatMap((plan) => plan.positions).length === 0 && !firstWallet && !startDefiTreasury) {
      return <div 
      onClick={() => setStartDefiTreasury(true)}
      className={cx("mb-3 px-4 py-2 rounded-md w-full flex flex-col gap-2", !wallet ? "cursor-default" : "cursor-pointer bg-bkg-2 hover:bg-bkg-1 text-fgd-3 text-sm")}>
        Start Defi Treasury for this wallet
      </div>;
    }
  return (
    <>    
    {!!selectedDepositPlan && <DepositModal plan={selectedDepositPlan} isOpen={!!selectedDepositPlan} onClose={() => setSelectedDepositPlan(null)} />}
    {!!selectedWithdrawPlan && <WithdrawModal plan={selectedWithdrawPlan} isOpen={!!selectedWithdrawPlan} onClose={() => setSelectedWithdrawPlan(null)} />}
    <div onClick={() => {
      if (wallet) {
        setTreasurySelect({
          _kind: 'Defi',
          selectedGovernance: wallet.governanceAddress ?? '',
          selectedWalletAddress: wallet.address,
        })
      }
    }} className={cx("mb-3 px-4 py-2 rounded-md w-full flex flex-col gap-2", !wallet ? "cursor-default" : "cursor-pointer bg-bkg-2 hover:bg-bkg-1")}>
      <div className='flex justify-between'>
        <div>
        <p className="text-fgd-3">Defi Balance</p>
        <span className="hero-text">
          ${formatNumber(totalBalance)}
        </span>
        </div>
       { !wallet && <Link href={fmtUrlWithCluster(`/dao/${symbol}/treasury/v2`)}>
          <a
            className={`default-transition flex items-center text-fgd-2 text-sm transition-all hover:text-fgd-3`}
          >
            Manage
            <ChevronRightIcon className="flex-shrink-0 h-6 w-6" />
          </a>
        </Link>}
      </div>
        <div className='flex justify-between'>
        <div>
          <div className="text-white/50 text-sm">APY</div>
          <div className="text-green">{averageApr.toFixed(2)}%</div>
        </div>
        <div className='text-right'>
          <div className="text-white/50 text-sm">Cumulative Earnings</div>
          <div className="text-green">${formatNumber(totalEarnings)}</div>
        </div>
      </div>
      {
        plans.map((plan) => {
          const planTotalBalance = plan.positions.reduce((acc, position) => acc.plus(position.amount), new BigNumber(0));
          const planTotalBalanceUsd = plan.positions.reduce((acc, position) => acc.plus(position.amount.times(plan.price ?? 0)), new BigNumber(0));
          return (
          <div className='flex items-center w-full p-3 border rounded-lg text-fgd-1 border-fgd-4 justify-between group/plan' key={plan.name}>
            <div className='flex flex-col gap-2 flex-1'>
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
            <div className='flex flex-col gap-2 justify-between flex-1'>
              <div className='text-sm font-bold'>{planTotalBalance ? formatNumber(planTotalBalance, undefined, { maximumFractionDigits: 2 }) : '-'} {plan.assets[0].symbol}</div>
              <div className='text-xs'>${planTotalBalanceUsd ? formatNumber(planTotalBalanceUsd, undefined, { maximumFractionDigits: 2 }) : '-'}</div>
            </div>
            <div className='w-[150px] flex justify-end'>
            <div className='flex flex-col gap-2 justify-between group-hover/plan:hidden'>
              <div className='text-sm text-right text-green'>{plan.apr}%</div>
              {plan.positions.length > 1 && <div className='text-xs underline'>{plan.positions.length} positions</div>}
            </div>
            <div className='text-sm group-hover/plan:flex hidden gap-1 items-center'>
              <Button onClick={() => setSelectedDepositPlan(plan)}>Deposit</Button>
              <Button onClick={() => setSelectedWithdrawPlan(plan)}>Withdraw</Button>
            </div>
            </div>
          </div>
        )})
      }
    </div>
    </>
  )
}

export default DefiSummary
