import React from 'react'
import cx from 'classnames'
import type { PublicKey } from '@solana/web3.js'
import { DocumentDuplicateIcon } from '@heroicons/react/outline'

import Tooltip from '@components/Tooltip'
import { notify } from '@utils/notifications'

interface Props {
  domainName: string
  domainAddress: PublicKey
  className?: string
}

export default function DomainCopyButton(props: Props) {
  const base58 = props.domainAddress.toBase58()
  const text = `${props.domainName}.sol`

  return (
    <div className={cx(props.className, 'flex space-x-2 text-white/50')}>
      <a
        className="cursor-pointer transition-colors hover:text-fgd-1 hover:underline"
        href={`https://explorer.solana.com/address/${base58}`}
        target="_blank"
        rel="noreferrer"
      >
        {text}
      </a>
      <button
        className="h-[1.25em] w-[1.25em] transition-colors hover:text-fgd-1"
        onClick={async () => {
          try {
            await navigator?.clipboard?.writeText(text)
          } catch {
            notify({
              type: 'error',
              message: 'Could not copy domain to clipboard',
            })
          }
        }}
      >
        <Tooltip content="Copy Domain">
          <DocumentDuplicateIcon className="cursor-pointer h-[1.25em] w-[1.25em]" />
        </Tooltip>
      </button>
    </div>
  )
}
