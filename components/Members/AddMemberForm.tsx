import { PublicKey } from '@solana/web3.js'
import React, { FC, useState, useMemo, useCallback } from 'react'
import debounce from 'lodash/debounce'
import Input from 'components/inputs/Input'
import Button, { SecondaryButton } from '@components/Button'
import VoteBySwitch from 'pages/dao/[symbol]/proposal/components/VoteBySwitch'
import { abbreviateAddress, precision } from 'utils/formatting'
import { getMintSchema } from 'utils/validations'
import { MintForm, UiInstruction } from 'utils/uiTypes/proposalCreationTypes'
import {
  getInstructionDataFromBase64,
  serializeInstructionToBase64,
  withDepositGoverningTokens,
} from '@solana/spl-governance'
import { useRouter } from 'next/router'
import { notify } from 'utils/notifications'
import useQueryContext from '@hooks/useQueryContext'
import { getMintInstruction, validateInstruction } from 'utils/instructionTools'
import AddMemberIcon from '@components/AddMemberIcon'
import {
  ArrowCircleDownIcon,
  ArrowCircleUpIcon,
  RefreshIcon,
} from '@heroicons/react/outline'
import useCreateProposal from '@hooks/useCreateProposal'
import { AssetAccount } from '@utils/uiTypes/assets'
import useProgramVersion from '@hooks/useProgramVersion'
import { useMintInfoByPubkeyQuery } from '@hooks/queries/mintInfo'
import BigNumber from 'bignumber.js'
import { getMintNaturalAmountFromDecimalAsBN } from '@tools/sdk/units'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { useRealmQuery } from '@hooks/queries/realm'
import { DEFAULT_GOVERNANCE_PROGRAM_VERSION } from '@components/instructions/tools'
import { useVoteByCouncilToggle } from '@hooks/useVoteByCouncilToggle'
import { resolveDomain } from '@utils/domains'
import useRealm from "@hooks/useRealm"
import {useConnection} from "@solana/wallet-adapter-react";
import {ConnectionContext} from "@utils/connection";

// ── Types ──
interface AddMemberFormState extends Omit<MintForm, 'mintAccount'> {
  description: string
  title: string
}

// ── Component ──
const AddMemberForm: FC<{ close: () => void; mintAccount: AssetAccount }> = ({
                                                                               close,
                                                                               mintAccount,
                                                                             }) => {
  const programVersion = useProgramVersion()
  const [showOptions, setShowOptions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const { handleCreateProposal } = useCreateProposal()
  const router = useRouter()
  const connection = useConnection()
  const wallet = useWalletOnePointOh()
  const { voteByCouncil, shouldShowVoteByCouncilToggle, setVoteByCouncil } =
      useVoteByCouncilToggle()
  const { fmtUrlWithCluster } = useQueryContext()
  const { symbol } = router.query
  const realm = useRealmQuery().data?.result
  const [form, setForm] = useState<AddMemberFormState>({
    destinationAccount: '',
    amount: 1,
    programId: undefined,
    description: '',
    title: '',
  })
  const { realmInfo } = useRealm()
  const { data: mintInfo } = useMintInfoByPubkeyQuery(mintAccount.pubkey)
  const programId: PublicKey | undefined = realmInfo?.programId

  const mintMinAmount = mintInfo?.found
      ? new BigNumber(1).shiftedBy(mintInfo.result.decimals).toNumber()
      : 1
  const currentPrecision = precision(mintMinAmount)

  // ── handleSetForm ──
  const handleSetForm = useCallback(
      ({ propertyName, value }: { propertyName: keyof AddMemberFormState; value: any }) => {
        setFormErrors({})
        setForm((prev) => ({ ...prev, [propertyName]: value }))
      },
      []
  )

  // ── Resolve Domain ──
  const [isResolvingDomain, setIsResolvingDomain] = useState(false)
  useMemo(
      () =>
          debounce(async (domain: string) => {
            try {
              const resolved = await resolveDomain(connection.connection, domain)
              if (resolved) {
                handleSetForm({
                  propertyName: 'destinationAccount',
                  value: resolved.toBase58(),
                })
              }
            } catch (err) {
              console.error('Domain resolution error', err)
            } finally {
              setIsResolvingDomain(false)
            }
          }, 500),
      [connection, handleSetForm]
  );
  const setAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSetForm({ propertyName: 'amount', value: e.target.value })
  }

  const validateAmountOnBlur = () => {
    const value = form.amount
    handleSetForm({
      propertyName: 'amount',
      value: parseFloat(
          Math.max(
              Number(mintMinAmount),
              Math.min(Number(Number.MAX_SAFE_INTEGER), Number(value))
          ).toFixed(currentPrecision)
      ),
    })
  }

  const getInstruction = async (): Promise<UiInstruction | false> => {
    if ((programVersion ?? DEFAULT_GOVERNANCE_PROGRAM_VERSION) >= 3) {
      const isValid = await validateInstruction({
        schema: getMintSchema({ form: { ...form, mintAccount }, connection }),
        form: { ...form, mintAccount },
        setFormErrors,
      })
      if (!isValid) return false
      if (!programId || !realm || !form.destinationAccount || !wallet?.publicKey || !mintInfo?.result)
        return false

      const ixArray: any[] = []
      await withDepositGoverningTokens(
          ixArray,
          programId,
          programVersion ?? DEFAULT_GOVERNANCE_PROGRAM_VERSION,
          realm.pubkey,
          mintAccount.pubkey,
          mintAccount.pubkey,
          new PublicKey(form.destinationAccount),
          mintAccount.extensions.mint!.account.mintAuthority!,
          new PublicKey(form.destinationAccount),
          getMintNaturalAmountFromDecimalAsBN(form.amount ?? 1, mintInfo.result.decimals),
          true
      )
      return {
        serializedInstruction: serializeInstructionToBase64(ixArray[0]),
        isValid: true,
        governance: mintAccount.governance,
      }
    } else {
      const connectionContext: ConnectionContext = {
        current: connection.connection, // Connection de Solana
        cluster: 'mainnet',        // ou 'devnet', selon ton cas
        endpoint: connection.connection.rpcEndpoint, // facultatif si tu as besoin
      }

      const mintInstruction = await getMintInstruction({
        schema: getMintSchema({ form: { ...form, mintAccount }, connection: connectionContext }),
        form: { ...form, mintAccount },
        programId,
        connection: connectionContext,
        wallet,
        governedMintInfoAccount: mintAccount,
        setFormErrors,
      })

      return mintInstruction.isValid ? mintInstruction : false
    }
  }

  const handlePropose = async () => {
    setIsLoading(true)
    const instruction = await getInstruction()
    if (!!instruction && wallet && realmInfo) {
      const governance = mintAccount.governance
      if (!realm) throw new Error('No realm selected')

      try {
        const proposalAddress = await handleCreateProposal({
          title: form.title || `Add member ${abbreviateAddress(new PublicKey(form.destinationAccount))}`,
          description: form.description || '',
          governance,
          instructionsData: [
            {
              data: instruction.serializedInstruction ? getInstructionDataFromBase64(instruction.serializedInstruction) : null,
              holdUpTime: governance?.account?.config.minInstructionHoldUpTime,
              prerequisiteInstructions: instruction.prerequisiteInstructions || [],
            },
          ],
          voteByCouncil,
          isDraft: false,
        })
        await router.push(fmtUrlWithCluster(`/dao/${symbol}/proposal/${proposalAddress}`))
      } catch (error) {
        console.error('Proposal creation error', error)
        notify({ type: 'error', message: `${error}` })
        close()
      }
    }
    setIsLoading(false)
  }

  const abbrevAddress = (() => {
    try { return abbreviateAddress(new PublicKey(form.destinationAccount)) } catch { return '' }
  })()
  const proposalTitle = `Add member ${abbrevAddress}`

  function handleDestinationAccountChange(): void {
        throw new Error("Function not implemented.")
    }

  return (
      <>
        <div className="flex items-center gap-x-3">
          <AddMemberIcon className="w-8 mb-2" />
          <h2 className="text-xl">Add new member to {realmInfo?.displayName}</h2>
        </div>

        <div className="relative">
          <Input
              label="Member's wallet"
              placeholder="Wallet or domain (e.g. domain.solana)"
              value={form.destinationAccount}
              type="text"
              onChange={handleDestinationAccountChange}
              error={formErrors['destinationAccount']}
              useDefaultStyle={false}
              className="p-4 w-full bg-bkg-3 border rounded-md"
              wrapperClassName="my-6"
              noMaxWidth
          />
          {isResolvingDomain && (
              <RefreshIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-primary-light" />
          )}
        </div>

        <div className="flex items-center cursor-pointer w-24 my-3" onClick={() => setShowOptions(!showOptions)}>
          {showOptions ? <ArrowCircleUpIcon className="h-4 w-4 mr-1 text-primary-light" /> : <ArrowCircleDownIcon className="h-4 w-4 mr-1 text-primary-light" />}
          <small className="text-fgd-3">Options</small>
        </div>

        {showOptions && (
            <>
              <Input
                  noMaxWidth
                  useDefaultStyle={false}
                  className="p-4 w-full bg-bkg-3 border border-bkg-3 default-transition text-sm text-fgd-1 rounded-md focus:border-bkg-3 focus:outline-none mb-6"
                  wrapperClassName="mb-6"
                  label="Title of your proposal"
                  placeholder="Title of your proposal"
                  value={form.title || proposalTitle}
                  type="text"
                  onChange={(event) =>
                      handleSetForm({ propertyName: 'title', value: event.target.value })
                  }
              />

              <Input
                  noMaxWidth
                  useDefaultStyle={false}
                  className="p-4 w-full bg-bkg-3 border border-bkg-3 default-transition text-sm text-fgd-1 rounded-md focus:border-bkg-3 focus:outline-none mb-6"
                  wrapperClassName="mb-6"
                  label="Description"
                  placeholder="Description of your proposal (optional)"
                  value={form.description}
                  type="text"
                  onChange={(event) =>
                      handleSetForm({ propertyName: 'description', value: event.target.value })
                  }
              />

              <Input
                  noMaxWidth
                  useDefaultStyle={false}
                  className="p-4 w-full bg-bkg-3 border border-bkg-3 default-transition text-sm text-fgd-1 rounded-md focus:border-bkg-3 focus:outline-none mb-6"
                  wrapperClassName="mb-6"
                  min={mintMinAmount}
                  label="Voter weight"
                  value={form.amount}
                  type="number"
                  onChange={setAmount}
                  step={mintMinAmount}
                  error={formErrors['amount']}
                  onBlur={validateAmountOnBlur}
              />

              {shouldShowVoteByCouncilToggle && (
                  <VoteBySwitch
                      checked={voteByCouncil}
                      onChange={() => setVoteByCouncil(!voteByCouncil)}
                  />
              )}
            </>
        )}

        <div className="flex gap-x-6 justify-end items-center mt-8">
          <SecondaryButton
              disabled={isLoading}
              className="w-44"
              onClick={() => close()}
          >
            Cancel
          </SecondaryButton>

          <Button
              disabled={!form.destinationAccount || isLoading}
              className="w-44 flex justify-center items-center"
              onClick={() => handlePropose()}
          >
            Add proposal
          </Button>
        </div>
      </>
  )
}

export default AddMemberForm
