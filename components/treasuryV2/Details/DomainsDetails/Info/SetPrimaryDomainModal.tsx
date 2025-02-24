import Modal from '@components/Modal'
import { Governance, ProgramAccount } from '@solana/spl-governance'
import useCreateProposal from '@hooks/useCreateProposal'
import useQueryContext from '@hooks/useQueryContext'
import { useRouter } from 'next/router'
import useRealm from '@hooks/useRealm'
import React, { useState } from 'react'
import Button from '@components/Button'
import { useVoteByCouncilToggle } from '@hooks/useVoteByCouncilToggle'
import { InstructionDataWithHoldUpTime } from 'actions/createProposal'
import type { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'
import { notify } from '@utils/notifications'
import { setPrimaryDomain } from '@bonfida/spl-name-service'
import { serializeInstructionToBase64 } from '@solana/spl-governance'
import { PublicKey } from '@solana/web3.js'
import { useConnection } from '@solana/wallet-adapter-react'
import type { Domain } from '@models/treasury/Domain'
import VoteBySwitch from 'pages/dao/[symbol]/proposal/components/VoteBySwitch'
import { abbreviateAddress } from '@utils/formatting'

const SetPrimaryDomainModal = ({
  closeModal,
  isOpen,
  governance,
  domain,
}: {
  closeModal: () => void
  isOpen: boolean
  governance: ProgramAccount<Governance>
  domain: Domain
}) => {
  const router = useRouter()
  const { symbol } = useRealm()
  const { fmtUrlWithCluster } = useQueryContext()
  const { handleCreateProposal } = useCreateProposal()
  const [creatingProposal, setCreatingProposal] = useState(false)
  const { voteByCouncil, shouldShowVoteByCouncilToggle, setVoteByCouncil } =
    useVoteByCouncilToggle()
  const { connection } = useConnection()

  async function handleCreateSetPrimaryDomainProposal() {
    setCreatingProposal(true)
    try {
      const setPrimaryDomainIx = await setPrimaryDomain(
        connection,
        new PublicKey(domain.address),
        new PublicKey(domain.owner),
      )

      if (setPrimaryDomainIx) {
        const instructionData = new InstructionDataWithHoldUpTime({
          instruction: {
            serializedInstruction:
              serializeInstructionToBase64(setPrimaryDomainIx),
            isValid: true,
            governance,
          },
          governance,
        })

        const proposalAddress = await handleCreateProposal({
          title: `Set ${
            domain.name
          }.sol as primary domain for ${abbreviateAddress(domain.owner)}`,
          description: `This proposal will set ${
            domain.name
          }.sol as the primary domain for the
          wallet ${abbreviateAddress(domain.owner)}.`,
          voteByCouncil,
          instructionsData: [instructionData],
          governance,
        })

        const url = fmtUrlWithCluster(
          `/dao/${symbol}/proposal/${proposalAddress}`,
        )

        router.push(url)
      }
    } catch (error) {
      notify({ type: 'error', message: `${error}` })
      console.error('Failed to create set primary domain proposal', error)
    } finally {
      setCreatingProposal(false)
    }
  }

  return (
    <Modal sizeClassName="sm:max-w-3xl" onClose={closeModal} isOpen={isOpen}>
      <div className="w-full space-y-4">
        <h3 className="flex flex-col mb-4">Set Primary Domain</h3>

        <p>
          This proposal will set {domain.name}.sol as the primary domain for the
          wallet {abbreviateAddress(domain.owner)}.
        </p>

        {shouldShowVoteByCouncilToggle && (
          <VoteBySwitch
            checked={voteByCouncil}
            onChange={() => {
              setVoteByCouncil(!voteByCouncil)
            }}
          ></VoteBySwitch>
        )}
      </div>
      <div className="flex justify-end pt-6 mt-6 space-x-4 border-t border-fgd-4">
        <Button
          isLoading={creatingProposal}
          disabled={creatingProposal}
          onClick={handleCreateSetPrimaryDomainProposal}
        >
          Add proposal
        </Button>
      </div>
    </Modal>
  )
}

export default SetPrimaryDomainModal
