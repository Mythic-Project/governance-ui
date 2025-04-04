import Button from '@components/Button'
import Input from '@components/inputs/Input'
import { getAccountName } from '@components/instructions/tools'
import useRealm from '@hooks/useRealm'
import { PublicKey } from '@solana/web3.js'
import {
  //   getMintDecimalAmountFromNatural,
  getMintMinAmountAsDecimal,
  getMintNaturalAmountFromDecimalAsBN,
} from '@tools/sdk/units'
import { tryParseKey } from '@tools/validators/pubkey'
import { debounce } from '@utils/debounce'
import { precision } from '@utils/formatting'
import {
  TokenAccount,
  TokenProgramAccount,
  tryGetTokenAccount,
} from '@utils/tokens'
import {
  SendTokenCompactViewForm,
  UiInstruction,
} from '@utils/uiTypes/proposalCreationTypes'
import React, { ChangeEvent, useEffect, useState } from 'react'
import useTreasuryAccountStore from 'stores/useTreasuryAccountStore'

import { getBatchTokenTransferSchema } from '@utils/validations'
import {
  ArrowCircleDownIcon,
  ArrowCircleUpIcon,
  //   InformationCircleIcon,
} from '@heroicons/react/solid'
import BigNumber from 'bignumber.js'
import { getInstructionDataFromBase64 } from '@solana/spl-governance'
import useQueryContext from '@hooks/useQueryContext'
import { useRouter } from 'next/router'
import { notify } from '@utils/notifications'
import Textarea from '@components/inputs/Textarea'
// import { Popover } from '@headlessui/react'
import AccountLabel from './AccountHeader'
import Tooltip from '@components/Tooltip'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import {
  getBatchSolTransferInstruction,
  getBatchTransferInstruction,
} from '@utils/instructionTools'
import VoteBySwitch from 'pages/dao/[symbol]/proposal/components/VoteBySwitch'
import useCreateProposal from '@hooks/useCreateProposal'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { useRealmQuery } from '@hooks/queries/realm'
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext'
import { fetchJupiterPrice } from '@hooks/queries/jupiterPrice'
import { useVoteByCouncilToggle } from '@hooks/useVoteByCouncilToggle'
import { AddAlt } from '@carbon/icons-react'
import { StyledLabel } from '@components/inputs/styles'

const SendTokens = () => {
  const currentAccount = useTreasuryAccountStore((s) => s.currentAccount)
  const connection = useLegacyConnectionContext()
  const realm = useRealmQuery().data?.result
  const { realmInfo, symbol } = useRealm()
  const { handleCreateProposal } = useCreateProposal()
  const { canUseTransferInstruction } = useGovernanceAssets()
  const tokenInfo = useTreasuryAccountStore((s) => s.tokenInfo)
  const isSol = currentAccount?.isSol
  const { fmtUrlWithCluster } = useQueryContext()
  const wallet = useWalletOnePointOh()
  const router = useRouter()
  const programId: PublicKey | undefined = realmInfo?.programId
  const [form, setForm] = useState<SendTokenCompactViewForm>({
    destinationAccount: [''],
    txDollarAmount: [undefined],
    amount: [undefined],
    governedTokenAccount: undefined,
    programId: programId?.toString(),
    mintInfo: undefined,
    title: '',
    description: '',
  })
  const { voteByCouncil, shouldShowVoteByCouncilToggle, setVoteByCouncil } =
    useVoteByCouncilToggle()
  const [showOptions, setShowOptions] = useState(false)
  const [destinationAccount, setDestinationAccount] = useState<
    (TokenProgramAccount<TokenAccount> | null)[]
  >([null])

  const [isLoading, setIsLoading] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const destinationAccountName = destinationAccount.map(
    (acc) => acc?.publicKey && getAccountName(acc?.account.address),
  )

  const mintMinAmount = form.governedTokenAccount?.extensions?.mint
    ? getMintMinAmountAsDecimal(
        form.governedTokenAccount.extensions.mint.account,
      )
    : 1
  const currentPrecision = precision(mintMinAmount)

  const handleSetForm = ({ propertyName, value }) => {
    setFormErrors({})
    setForm({ ...form, [propertyName]: value })
  }

  const handleSetMultipleProps = ({
    destinationAccount,
    amount,
    txDollarAmount,
  }: {
    amount: any
    txDollarAmount: any
    destinationAccount?: any
  }) => {
    setFormErrors({})

    setForm({
      ...form,
      destinationAccount: destinationAccount
        ? destinationAccount
        : form.destinationAccount,
      amount,
      txDollarAmount,
    })
  }

  const setAmount = (idx: number, event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    const newAmounts: any[] = [...form.amount]
    newAmounts[idx] = value

    handleSetForm({
      value: newAmounts,
      propertyName: 'amount',
    })
  }

  const validateAmountOnBlur = async (idx: number) => {
    const value = form.amount[idx]
    const newAmounts = [...form.amount]
    const newTxDollars = [...form.txDollarAmount]

    const newVal = parseFloat(
      Math.max(
        Number(mintMinAmount),
        Math.min(Number(Number.MAX_SAFE_INTEGER), Number(value)),
      ).toFixed(currentPrecision),
    )

    newAmounts[idx] = newVal

    const mint = currentAccount?.extensions.mint?.publicKey
    if (mint === undefined) {
      newTxDollars[idx] = undefined
    } else {
      const priceData = await fetchJupiterPrice(mint)
      const price = priceData.result?.price ?? 0

      const totalPrice = newVal * price
      const totalPriceFormatted =
        newVal && price ? new BigNumber(totalPrice).toFormat(2) : ''
      newTxDollars[idx] = totalPriceFormatted
    }

    handleSetMultipleProps({
      amount: newAmounts,
      txDollarAmount: newTxDollars,
    })
  }

  async function getInstruction(): Promise<UiInstruction[]> {
    const defaultProps = {
      schema,
      form,
      programId,
      connection,
      wallet,
      currentAccount,
      setFormErrors,
    }
    if (isSol) {
      return getBatchSolTransferInstruction(defaultProps)
    }
    return getBatchTransferInstruction(defaultProps)
  }

  const handleProposeTransfer = async () => {
    setIsLoading(true)
    const instruction: UiInstruction[] = await getInstruction()

    if (instruction.every((ix) => ix.isValid)) {
      const governance = currentAccount?.governance
      let proposalAddress: PublicKey | null = null
      if (!realm) {
        setIsLoading(false)
        throw 'No realm selected'
      }
      const instructionsData = instruction.map((ix) => ({
        data: ix.serializedInstruction
          ? getInstructionDataFromBase64(ix.serializedInstruction)
          : null,
        holdUpTime: governance?.account?.config.minInstructionHoldUpTime,
        prerequisiteInstructions: ix.prerequisiteInstructions || [],
        chunkBy: 4,
      }))

      try {
        proposalAddress = await handleCreateProposal({
          title: form.title ? form.title : proposalTitle,
          description: form.description ? form.description : '',
          voteByCouncil,
          instructionsData,
          governance: governance!,
        })
        const url = fmtUrlWithCluster(
          `/dao/${symbol}/proposal/${proposalAddress}`,
        )
        router.push(url)
      } catch (ex) {
        notify({ type: 'error', message: `${ex}` })
      }
    }
    setIsLoading(false)
  }

  const IsAmountNotHigherThenBalance = (idx: number) => {
    try {
      const mintValue = getMintNaturalAmountFromDecimalAsBN(
        form.amount[idx]!,
        form.governedTokenAccount!.extensions.mint!.account.decimals,
      )
      let gte: boolean | undefined = false
      gte = form.governedTokenAccount!.extensions.amount?.gte(mintValue)
      return gte
    } catch (e) {
      //silent fail
      return true
    }
  }
  useEffect(() => {
    if (currentAccount) {
      handleSetForm({
        value: currentAccount,
        propertyName: 'governedTokenAccount',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO please fix, it can cause difficult bugs. You might wanna check out https://bobbyhadz.com/blog/react-hooks-exhaustive-deps for info. -@asktree
  }, [currentAccount])

  const schema = getBatchTokenTransferSchema({
    form,
    connection,
    nftMode: false,
  })

  const proposalTitle = `Transfer tokens`
  // ${
  //   tokenInfo ? ` ${tokenInfo?.symbol} ` : ' '
  // }to ${
  //   tryParseKey(form.destinationAccount)
  //     ? abbreviateAddress(new PublicKey(form.destinationAccount))
  //     : ''
  // }`

  if (!currentAccount) {
    return null
  }

  const addRecipient = () => {
    const newAddresses = [...form.destinationAccount]
    const newAmounts = [...form.amount]
    const newTxDollars = [...form.txDollarAmount]

    newAddresses.push('')
    newAmounts.push(undefined)
    newTxDollars.push(undefined)

    handleSetMultipleProps({
      destinationAccount: newAddresses,
      amount: newAmounts,
      txDollarAmount: newTxDollars,
    })

    const currentAccounts = [...destinationAccount]
    currentAccounts.push(null)
    setDestinationAccount(currentAccounts)
  }

  const setAddress = (idx: number, address: string) => {
    const newAddresses = [...form.destinationAccount]
    newAddresses[idx] = address

    handleSetForm({
      value: newAddresses,
      propertyName: 'destinationAccount',
    })

    const currentAccounts = [...destinationAccount]

    debounce.debounceFcn(async () => {
      const pubKey = tryParseKey(address)
      if (pubKey) {
        const account = await tryGetTokenAccount(connection.current, pubKey)
        currentAccounts[idx] = account ? account : null
        setDestinationAccount(currentAccounts)
      } else {
        currentAccounts[idx] = null
        setDestinationAccount(currentAccounts)
      }
    })
  }

  return (
    <>
      <h3 className="mb-4 flex items-center">
        <>Send {tokenInfo && tokenInfo?.symbol}</>
      </h3>
      <AccountLabel />
      <div className="space-y-4 w-full pb-4">
        {form.destinationAccount.map((acc, idx) => (
          <div className="flex flex-col gap-2" key={idx}>
            <StyledLabel>Recipient {idx + 1}</StyledLabel>
            <Input
              label="Destination account"
              value={form.destinationAccount[idx]}
              type="text"
              onChange={(e) => setAddress(idx, e.target.value)}
              noMaxWidth={true}
              error={
                formErrors['destinationAccount'] &&
                formErrors['destinationAccount'][idx]
                  ? formErrors['destinationAccount'][idx]
                  : ''
              }
            />
            {destinationAccount[idx] && (
              <div>
                <div className="pb-0.5 text-fgd-3 text-xs">Account owner</div>
                <div className="text-xs break-all">
                  {destinationAccount[idx]!.account.owner.toString()}
                </div>
              </div>
            )}
            {destinationAccountName[idx] && (
              <div>
                <div className="pb-0.5 text-fgd-3 text-xs">Account name</div>
                <div className="text-xs break-all">
                  {destinationAccountName[idx]}
                </div>
              </div>
            )}

            <Input
              min={mintMinAmount}
              label={`Amount ${tokenInfo ? tokenInfo?.symbol : ''}`}
              value={form.amount[idx]}
              type="number"
              onChange={(e) => setAmount(idx, e)}
              step={mintMinAmount}
              error={
                formErrors['amount'] && formErrors['amount'][idx]
                  ? formErrors['amount'][idx]
                  : ''
              }
              onBlur={() => validateAmountOnBlur(idx)}
              noMaxWidth={true}
            />

            <small className="text-red">
              {form.txDollarAmount[idx]
                ? IsAmountNotHigherThenBalance(idx)
                  ? `~$${form.txDollarAmount[idx]}`
                  : 'Insufficient balance'
                : null}
            </small>
          </div>
        ))}
        <div
          className="flex gap-2 items-center justify-end cursor-pointer text-sm"
          onClick={addRecipient}
        >
          <AddAlt className="text-green" />
          <div>Add another recipient</div>
        </div>
        <div
          className={'flex items-center hover:cursor-pointer w-24'}
          onClick={() => setShowOptions(!showOptions)}
        >
          {showOptions ? (
            <ArrowCircleUpIcon className="h-4 w-4 mr-1 text-primary-light" />
          ) : (
            <ArrowCircleDownIcon className="h-4 w-4 mr-1 text-primary-light" />
          )}
          <small className="text-fgd-3">Options</small>
          {/* popover with description maybe will be needed later */}
          {/* <Popover className="relative ml-auto border-none flex">
            <Popover.Button className="focus:outline-none">
              <InformationCircleIcon className="h-4 w-4 mr-1 text-primary-light hover:cursor-pointer" />
            </Popover.Button>

            <Popover.Panel className="absolute z-10 right-4 top-4 w-80">
              <div className="bg-bkg-1 px-4 py-2 rounded-md text-xs">
                {`In case of empty fields of advanced options, title and description will be
                combination of amount token symbol and destination account e.g
                "Pay 10 sol to PF295R1YJ8n1..."`}
              </div>
            </Popover.Panel>
          </Popover> */}
        </div>
        {showOptions && (
          <>
            <Input
              noMaxWidth={true}
              label="Title"
              placeholder={
                form.amount && form.destinationAccount
                  ? proposalTitle
                  : 'Title of your proposal'
              }
              value={form.title}
              type="text"
              onChange={(evt) =>
                handleSetForm({
                  value: evt.target.value,
                  propertyName: 'title',
                })
              }
            />
            <Textarea
              noMaxWidth={true}
              label="Description"
              placeholder={
                'Description of your proposal or use a github gist link (optional)'
              }
              wrapperClassName="mb-5"
              value={form.description}
              onChange={(evt) =>
                handleSetForm({
                  value: evt.target.value,
                  propertyName: 'description',
                })
              }
            ></Textarea>
            {shouldShowVoteByCouncilToggle && (
              <VoteBySwitch
                checked={voteByCouncil}
                onChange={() => {
                  setVoteByCouncil(!voteByCouncil)
                }}
              ></VoteBySwitch>
            )}
          </>
        )}
      </div>
      <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0 mt-4">
        <Button
          className="ml-auto"
          onClick={handleProposeTransfer}
          isLoading={isLoading}
        >
          <Tooltip
            content={
              !canUseTransferInstruction
                ? 'You need to have connected wallet with ability to create token transfer proposals'
                : ''
            }
          >
            <div>Propose</div>
          </Tooltip>
        </Button>
      </div>
    </>
  )
}

export default SendTokens
