import { CaretDown, InformationFilled, Timer } from '@carbon/icons-react'
import { Governance, Proposal } from '@solana/spl-governance'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import Tooltip from './Tooltip'

/** here's a horrible function chatgpt wrote for me :-) */
function formatDuration(seconds: number) {
  const minuteInSeconds = 60
  const hourInSeconds = minuteInSeconds * 60
  const dayInSeconds = hourInSeconds * 24

  const days = Math.floor(seconds / dayInSeconds)
  seconds %= dayInSeconds
  const hours = Math.floor(seconds / hourInSeconds)
  seconds %= hourInSeconds
  const minutes = Math.floor(seconds / minuteInSeconds)

  const parts = [
    days.toString().padStart(2, '0') + 'd',
    hours.toString().padStart(2, '0') + 'h',
    minutes.toString().padStart(2, '0') + 'm',
  ] as const

  return parts
}

const useCountdown = ({
  proposal,
  governance,
}: {
  proposal: Proposal
  governance: Governance
}) => {
  const [countdown, setCountdown] = useState<
    ReturnType<typeof getTimeToVoteEnd> | undefined
  >(undefined)

  const getTimeToVoteEnd = useCallback(() => {
    // todo this should probably be made impossible if its not already
    if (proposal.isVoteFinalized()) {
      return { state: 'done' } as const
    }

    const now = dayjs().unix() // TODO remove superfluous dependency
    const votingStartedAt = proposal.votingAt?.toNumber() ?? 0 // TODO when and why would this be null ?

    const totalSecondsElapsed = Math.max(0, now - votingStartedAt)
    const baseVotingTime = governance.config.baseVotingTime
    const coolOffTime = governance.config.votingCoolOffTime

    // If we're still in normal voting period
    if (totalSecondsElapsed < baseVotingTime) {
      return {
        state: 'voting',
        total: {
          secondsRemaining: baseVotingTime - totalSecondsElapsed,
          secondsElapsed: totalSecondsElapsed,
        },
      } as const
    }

    // If we're in cool-off period
    const coolOffSecondsElapsed = totalSecondsElapsed - baseVotingTime
    if (coolOffSecondsElapsed < coolOffTime) {
      return {
        state: 'cooloff',
        total: {
          secondsRemaining: coolOffTime - coolOffSecondsElapsed,
          secondsElapsed: coolOffSecondsElapsed,
        },
      } as const
    }

    return { state: 'done' } as const
  }, [
    governance.config.baseVotingTime,
    governance.config.votingCoolOffTime,
    proposal,
  ])

  useEffect(() => {
    const updateCountdown = () => {
      const newState = getTimeToVoteEnd()
      setCountdown(newState)
    }

    const interval = setInterval(() => {
      updateCountdown()
    }, 1000)

    updateCountdown()
    return () => clearInterval(interval)
  }, [getTimeToVoteEnd])

  return countdown
}

const ProposalTimer = ({
  proposal,
  governance,
}: {
  proposal: Proposal
  governance: Governance
}) => {
  const countdown = useCountdown({ proposal, governance })

  if (!countdown || countdown.state === 'done') return null

  return (
    <div className="flex items-center gap-1">
      <div className="min-w-[115px] bg-neutral-900 rounded-md py-1 px-2 flex flex-col">
        <div className="text-white flex justify-between items-center mb-1 gap-3 flex-nowrap">
          <Timer />
          <div className="flex gap-2">
            {formatDuration(countdown.total.secondsRemaining).map((x, i) => (
              <div key={i}>{x}</div>
            ))}
          </div>
        </div>
        <TimerBar proposal={proposal} governance={governance} size="xs" />
      </div>
      <Tooltip
        content={
          <div className="flex flex-col gap-4">
            {countdown.state === 'voting' ? (
              <>
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1 items-center">
                    <div className="rounded-sm h-2 w-2 bg-sky-500 inline-block" />
                    <div className="text-white">Unrestricted Voting Time</div>
                  </div>
                  <div>
                    The amount of time a voter has to approve or deny a
                    proposal.
                  </div>
                </div>
                {governance.config.votingCoolOffTime > 0 && (
                  <div className="flex flex-col gap-1">
                    <div className="text-neutral-400">
                      After voting time ends, a{' '}
                      {formatDuration(governance.config.votingCoolOffTime)
                        .filter((x) => !x.startsWith('00'))
                        .join(' ')}{' '}
                      cool-off period will begin where voters can only deny,
                      veto, or withdraw their vote.
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex gap-1 items-center">
                  <div className="rounded-sm h-2 w-2 bg-amber-400 inline-block" />
                  <div className="text-white">Cool-Off Voting Time</div>
                </div>
                <div>
                  During this period, voters can only deny, veto, or withdraw
                  their vote on the proposal.
                </div>
              </div>
            )}
          </div>
        }
      >
        <InformationFilled className="cursor-help h-3 w-3" />
      </Tooltip>
    </div>
  )
}

export const TimerBar = ({
  proposal,
  governance,
  size,
}: {
  proposal: Proposal
  governance: Governance
  size: 'xs' | 'lg'
}) => {
  const countdown = useCountdown({ proposal, governance })

  if (!countdown || countdown.state === 'done') return null

  return (
    <div className={clsx('flex', size === 'xs' ? 'h-[1.5px]' : 'h-[4px]')}>
      {countdown.state === 'voting' ? (
        <>
          <div
            style={{
              flex: countdown.total.secondsElapsed,
            }}
            className="bg-sky-900"
          />
          <Notch size={size} />
          <div
            style={{
              flex: countdown.total.secondsRemaining,
            }}
            className="bg-sky-500"
          />
        </>
      ) : (
        <>
          <div
            style={{
              flex: countdown.total.secondsElapsed,
            }}
            className="bg-[#665425]"
          />
          <Notch size={size} />
          <div
            style={{
              flex: countdown.total.secondsRemaining,
            }}
            className="bg-amber-500"
          />
        </>
      )}
    </div>
  )
}

const Notch = ({
  className,
  size,
}: {
  className?: string
  size: 'xs' | 'lg'
}) => (
  <div className={clsx(className, 'relative w-[1px] bg-white')}>
    <CaretDown
      size={20}
      className={clsx(
        'absolute text-white left-1/2 -translate-x-1/2',
        size === 'xs' ? 'top-[-13px] scale-50' : 'top-[-16px]',
      )}
    />
  </div>
)

export default ProposalTimer
