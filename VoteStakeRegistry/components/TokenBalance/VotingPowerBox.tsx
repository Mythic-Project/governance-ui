import BigNumber from 'bignumber.js'
import { BN } from '@coral-xyz/anchor'
import { MintInfo } from '@solana/spl-token'
import { getMintDecimalAmount } from '@tools/sdk/units'
import { LightningBoltIcon } from '@heroicons/react/solid'
import Tooltip from '@components/Tooltip'
import VotingPowerPct from '@components/ProposalVotingPower/VotingPowerPct'
import clsx from 'clsx'

const VotingPowerBox = ({
  votingPower,
  mint,
  votingPowerFromDeposits,
  isLastPlugin = true,
  className = '',
  style,
}: {
  votingPower: BN
  mint: MintInfo
  votingPowerFromDeposits: BN
  isLastPlugin?: boolean
  className?: string
  style?: any
}) => {
  const votingPowerBigNum =
    votingPower && mint
      ? getMintDecimalAmount(mint, votingPower)
      : new BigNumber(0)

  const votingPowerFromDepositsBigNum =
    votingPowerFromDeposits && mint
      ? getMintDecimalAmount(mint, votingPowerFromDeposits)
      : new BigNumber(0)

  const max: BigNumber = getMintDecimalAmount(mint, new BN(mint.supply.toString()))

  return (
    <>
      <div
        className={`bg-bkg-1 flex justify-between items-center rounded-md ${className}`}
        style={style}
      >
        <div>
          <p className="text-fgd-3">
            {isLastPlugin ? 'Votes' : 'Token Power via Locking'}
          </p>
          <span
            className={clsx(
              'mb-0 flex font-bold items-center',
              isLastPlugin ? 'hero-text' : 'text-xs',
            )}
          >
            {votingPowerBigNum.toFormat(2)}{' '}
            {!votingPowerFromDeposits.isZero() && !votingPower.isZero() && (
              <Tooltip content="Vote Weight Multiplier – Increase your vote weight by locking tokens">
                <div className="cursor-help flex font-normal items-center text-xs ml-3 rounded-full bg-bkg-3 px-2 py-1">
                  <LightningBoltIcon className="h-3 mr-1 text-primary-light w-3" />
                  {`${votingPowerBigNum
                    .div(votingPowerFromDepositsBigNum)
                    .toFixed(2)}x`}
                </div>
              </Tooltip>
            )}
          </span>
        </div>
        <div>
          {votingPowerBigNum.gt(0)
            ? max &&
              !max.isZero() && (
                <VotingPowerPct amount={votingPowerBigNum} total={max} />
              )
            : null}
        </div>
      </div>
    </>
  )
}

export default VotingPowerBox
