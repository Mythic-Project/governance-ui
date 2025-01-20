import React from 'react'
import cx from 'classnames'
import { CashIcon } from '@heroicons/react/solid'
import { formatNumber } from '@utils/formatNumber'
import { BigNumber } from 'bignumber.js'
import Address from '@components/Address'
import { Wallet } from '@models/treasury/Wallet'

interface Props {
  className?: string
  walletAddress: string
  totalBalance: BigNumber
}

export default function Header(props: Props) {
  return (
    <div
      className={cx(
        props.className,
        'bg-bkg-1',
        'min-h-[128px]',
        'px-8',
        'py-4',
        'flex',
        'items-center',
        'justify-between'
      )}
    >
      <div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white/20">
            <CashIcon className="h-6 w-6 stroke-primary-light" />
          </div>
          <div>
            <div className="text-white/50 text-sm">Defi Treasury</div>
            <div className="text-fgd-1 font-bold text-2xl">
              <div className="overflow-hidden">
                <div
                  className={cx(
                    'align-baseline',
                    'font-bold',
                    'overflow-hidden',
                    'text-2xl',
                    'text-ellipsis',
                    'text-fgd-1',
                    'whitespace-nowrap'
                  )}
                >
                  ${formatNumber(new BigNumber(props.totalBalance))}
                </div>
              </div>
              <Address address={props.walletAddress} className="text-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
