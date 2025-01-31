import Button from '@components/Button'
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { connection } from '@project-serum/common'
import {
  TOKEN_2022_PROGRAM_ID,
  unpackAccount,
  getTransferFeeAmount,
  createHarvestWithheldTokensToMintInstruction,
} from '@solana/spl-token-new'
import { PublicKey } from '@solana/web3.js'
import { notify } from '@utils/notifications'
import {
  sendTransactionsV3,
  SequenceType,
  txBatchesToInstructionSetWithSigners,
} from '@utils/sendTransactions'
import { chunk } from 'lodash'
import { useState } from 'react'

const HarvestTokenPanel = ({ mint }: { mint: PublicKey }) => {
  const connection = useLegacyConnectionContext()
  const wallet = useWalletOnePointOh()

  const [accountsToHarvest, setAccountsToHarvest] = useState<
    null | PublicKey[]
  >(null)
  const [isLoadingAccountsToHarvest, setIsLoadingAccountsToHarvest] =
    useState(false)
  const [isHarvesting, setIsHarvesting] = useState(false)

  const loadAccountsToHarvest = async () => {
    try {
      setIsLoadingAccountsToHarvest(true)
      const allAccounts = await connection.current.getProgramAccounts(
        TOKEN_2022_PROGRAM_ID,
        {
          commitment: 'confirmed',
          filters: [
            {
              memcmp: {
                offset: 0,
                bytes: mint.toString(),
              },
            },
          ],
        },
      )

      const accountsToWithdrawFrom: PublicKey[] = []
      for (const accountInfo of allAccounts) {
        const account = unpackAccount(
          accountInfo.pubkey,
          accountInfo.account,
          TOKEN_2022_PROGRAM_ID,
        )
        const transferFeeAmount = getTransferFeeAmount(account)
        if (
          transferFeeAmount !== null &&
          transferFeeAmount.withheldAmount > BigInt(0)
        ) {
          accountsToWithdrawFrom.push(accountInfo.pubkey)
        }
      }
      setAccountsToHarvest(accountsToWithdrawFrom)
    } catch (e) {
      notify({ type: 'error', message: `${e}` })
    }
    setIsLoadingAccountsToHarvest(false)
  }
  const harvestFees = async () => {
    try {
      setIsHarvesting(true)
      if (!accountsToHarvest || !accountsToHarvest.length) {
        notify({ type: 'error', message: 'No accounts to harvest' })
        return
      }
      const ixes = chunk(accountsToHarvest, 20).map((accountsChunk) =>
        createHarvestWithheldTokensToMintInstruction(mint, accountsChunk),
      )

      await sendTransactionsV3({
        connection: connection.current,
        wallet: wallet!,
        transactionInstructions: [
          {
            instructionsSet: txBatchesToInstructionSetWithSigners(ixes, []),
            sequenceType: SequenceType.Parallel,
          },
        ],
        autoFee: true,
      })
      // eslint-disable-next-line no-empty
    } catch (e) {}

    setIsHarvesting(false)
  }

  return (
    <>
      <div className="space-y-4">
        <p>
          Number of accounts to harvest -{' '}
          {accountsToHarvest === null ? (
            <Button
              isLoading={isLoadingAccountsToHarvest}
              onClick={loadAccountsToHarvest}
            >
              Load
            </Button>
          ) : (
            accountsToHarvest?.length
          )}
        </p>
        <p>
          <div className="pb-4">
            {accountsToHarvest === null
              ? 'Load accounts first'
              : accountsToHarvest.length > 0
              ? ''
              : 'No accounts to harvest'}{' '}
          </div>
          <Button
            isLoading={isHarvesting}
            onClick={harvestFees}
            disabled={accountsToHarvest === null}
          >
            Start harvesting
          </Button>
        </p>
      </div>
    </>
  )
}

export default HarvestTokenPanel
