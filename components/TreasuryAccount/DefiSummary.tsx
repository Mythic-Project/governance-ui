import Button from '@components/Button';
import { useDefi } from '@hooks/useDefi';
import { Plan } from '@hub/providers/Defi';
import { useState } from 'react';
import { formatNumber } from '@utils/formatNumber'
import DepositModal from '@components/treasuryV2/Plans/save/DepositModal';
import { BigNumber } from 'bignumber.js';
import { AccountTypeToken } from '@utils/uiTypes/assets';
import WithdrawModal from '@components/treasuryV2/Plans/save/WithdrawModal';

export type MergedPlan = Plan & {
  amount?: BigNumber;
}

const DefiSummary = ({ account }: { account: AccountTypeToken }) => {
  const { plans, positions } = useDefi();
  const isFetching = false;
  const [selectedDepositPlan, setSelectedDepositPlan] = useState<MergedPlan | null>(null);
  const [selectedWithdrawPlan, setSelectedWithdrawPlan] = useState<MergedPlan | null>(null);

  const mergedPositionPlans = plans.map((plan) => {
    console.log(account?.pubkey?.toBase58(), positions);
    const position = positions.find((position) => position.planId === plan.id && account.pubkey.toBase58() === position.accountAddress);
    return {
      ...plan,
      amount: position?.amount,
    };
  });

  return (
    <>
    {!!selectedDepositPlan && <DepositModal governedTokenAccount={account} plan={selectedDepositPlan} isOpen={!!selectedDepositPlan} onClose={() => setSelectedDepositPlan(null)} />}
    {!!selectedWithdrawPlan && <WithdrawModal governedTokenAccount={account} plan={selectedWithdrawPlan} isOpen={!!selectedWithdrawPlan} onClose={() => setSelectedWithdrawPlan(null)} />}
    <div className="bg-bkg-1 mb-3 px-4 py-2 rounded-md w-full flex flex-col gap-2">
      <div className='flex justify-between'>
        <div>
        <p className="text-fgd-3">Defi Balance</p>
        <span className="hero-text">
          {isFetching ? 'Fetching ...' : `$${formatNumber(1_000_000)}`}
        </span>
        </div>
      </div>
        <div className='flex justify-between'>
        <div>
          <div className="text-white/50 text-sm">Average APY</div>
          <div className="text-green/50">10%</div>
        </div>
        <div>
          <div className="text-white/50 text-sm">Cumulative Earnings</div>
          <div className="text-green/50">$100,000</div>
        </div>
      </div>
      {
        mergedPositionPlans.map((plan) => (
          <div className='flex items-center w-full p-3 border rounded-lg text-fgd-1 border-fgd-4 justify-between group' key={plan.name}>
            <div className='flex flex-col gap-2'>
              <div className='text-sm'>{plan.name}</div>
              <div className='text-xs'>{plan.protocol}</div>
            </div>
            <div className='flex flex-col gap-2 justify-between'>
              <div className='text-sm'>{plan.amount ? formatNumber(plan.amount, undefined, { maximumFractionDigits: 10 }) : '-'}</div>
              <div className='text-xs'>{plan.apr}</div>
            </div>
            <div className='text-sm group-hover:hidden'>${(plan.amount && plan.price) ? formatNumber(plan.amount.times(plan.price), undefined, { maximumFractionDigits: 10 }) : '-'}</div>
            <div className='text-sm group-hover:block hidden'>
              <Button onClick={() => setSelectedDepositPlan(plan)}>Deposit</Button>
              <Button onClick={() => setSelectedWithdrawPlan(plan)}>Withdraw</Button>
            </div>
          </div>
        ))
      }
    </div>
    </>
  )
}

export default DefiSummary
