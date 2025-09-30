import Input from '@components/inputs/Input'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import {
  getGovernanceAccounts,
  getProposal,
  getTokenOwnerRecordAddress,
  getVoteRecordAddress,
  Governance,
  ProgramAccount,
  pubkeyFilter,
  serializeInstructionToBase64,
  TOKEN_PROGRAM_ID,
  withRelinquishVote,
} from '@solana/spl-governance'
import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import {
  RelinquishDaoVoteForm,
  UiInstruction,
} from '@utils/uiTypes/proposalCreationTypes'
import { useRouter } from 'next/router'
import { useContext, useEffect, useState } from 'react'
import GovernedAccountSelect from '../GovernedAccountSelect'
import { NewProposalContext } from '../../new'
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { fetchProgramVersion } from '@hooks/queries/useProgramVersionQuery'
import { getRealm } from '@realms-today/spl-governance'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token-new'

const RelinquishDaoVote = ({
  index,
  governance,
}: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const wallet = useWalletOnePointOh()
  const connection = useLegacyConnectionContext()

  const { governedTokenAccounts } = useGovernanceAssets()

  const { handleSetInstructions } = useContext(NewProposalContext)

  const [form, setForm] = useState<RelinquishDaoVoteForm>({
    governedAccount: undefined,
    mintInfo: undefined,
    realm: '',
    proposal: '',
  })

  const [formErrors, setFormErrors] = useState({})
  const handleSetForm = ({ propertyName, value }) => {
    setFormErrors({})
    setForm({ ...form, [propertyName]: value })
  }


  const setRealm = (event) => {
    const value = event.target.value
    handleSetForm({
      value: value,
      propertyName: 'realm',
    })
  }

  const setProposal = (event) => {
    const value = event.target.value
    handleSetForm({
      value: value,
      propertyName: 'proposal',
    })
  }

  async function getInstruction() {
    if (
      !connection ||
      !form.realm ||
      !form.governedAccount?.governance.account ||
      !form.proposal ||
      !wallet?.publicKey
    ) {
      return {
        serializedInstruction: '',
        isValid: false,
        governance: form.governedAccount?.governance,
      }
    }
    const realm = await getRealm(connection.current, new PublicKey(form.realm))

    const instructions: TransactionInstruction[] = []
    const prerequisiteInstructions: TransactionInstruction[] = []

    const programVersion = await fetchProgramVersion(
      connection.current,
      realm.owner,
    )
    
    const mint = realm.account.communityMint
    const destinationAccount = getAssociatedTokenAddressSync(
      mint,
      form.governedAccount.extensions.transferAddress!,
      true,
      TOKEN_PROGRAM_ID,
    )

    const createaAta = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      destinationAccount,
      form.governedAccount.extensions.transferAddress!,
      mint,
    )
    prerequisiteInstructions.push(createaAta)

    const voterTokenRecord = await getTokenOwnerRecordAddress(
      realm.owner,
      realm.pubkey,
      realm.account.communityMint,
      form.governedAccount.extensions.transferAddress!,
    )

    const proposal = await getProposal(connection.current, new PublicKey(form.proposal))
    
    const voteRecordAddress = await getVoteRecordAddress(
      realm.owner,
      proposal.pubkey,
      voterTokenRecord
    )

    await withRelinquishVote(
      instructions,
      realm!.owner,
      programVersion,
      realm!.pubkey,
      proposal!.account.governance,
      proposal!.pubkey,
      voterTokenRecord,
      realm.account.communityMint,
      voteRecordAddress,
      form.governedAccount.extensions.transferAddress,
      form.governedAccount.extensions.transferAddress,
    )

    const obj: UiInstruction = {
      serializedInstruction: '',
      additionalSerializedInstructions: instructions.map((x) =>
        serializeInstructionToBase64(x),
      ),
      prerequisiteInstructions: prerequisiteInstructions,
      isValid: true,
      governance: form.governedAccount?.governance,
      customHoldUpTime: 0,
      chunkBy: 2,
    }
    return obj
  }

  // Update mint info when selected token account changes.
  useEffect(() => {
    setForm({
      ...form,
      mintInfo: form.governedAccount?.extensions.mint?.account,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO please fix, it can cause difficult bugs. You might wanna check out https://bobbyhadz.com/blog/react-hooks-exhaustive-deps for info. -@asktree
  }, [form.governedAccount])

  useEffect(() => {
    handleSetInstructions(
      {
        governedAccount: form.governedAccount?.governance,
        getInstruction,
      },
      index,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO please fix, it can cause difficult bugs. You might wanna check out https://bobbyhadz.com/blog/react-hooks-exhaustive-deps for info. -@asktree
  }, [form])

  return (
    <>
      <Input
        label="Realm"
        value={form.realm}
        type="text"
        onChange={setRealm}
        error={formErrors['realm']}
      />
      <Input
        label="Proposal"
        value={form.proposal}
        type="text"
        onChange={setProposal}
        error={formErrors['proposal']}
      />
      {form.realm ? (
        <>
          <GovernedAccountSelect
            label="Token Account"
            governedAccounts={governedTokenAccounts}
            onChange={(value) => {
              handleSetForm({ value, propertyName: 'governedAccount' })
            }}
            value={form.governedAccount}
            error={formErrors['governedAccount']}
            shouldBeGoverned={!!governance}
            governance={governance}
            type="wallet"
          />
        </>
      ) : null}
    </>
  )
}

export default RelinquishDaoVote
