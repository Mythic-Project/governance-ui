import Input from '@components/inputs/Input'
import Select from '@components/inputs/Select'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import useRealmAccount from '@hooks/useRealmAccount'
import {
  getGovernanceAccounts,
  getTokenOwnerRecordAddress,
  Governance,
  ProgramAccount,
  ProposalState,
  pubkeyFilter,
  serializeInstructionToBase64,
  TOKEN_PROGRAM_ID,
  VoteRecord,
  withDepositGoverningTokens,
  withRelinquishVote,
  withWithdrawGoverningTokens,
} from '@solana/spl-governance'
import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import {
  getMintMinAmountAsDecimal,
  parseMintNaturalAmountFromDecimalAsBN,
} from '@tools/sdk/units'
import { precision } from '@utils/formatting'
import {
  JoinDAOForm,
  UiInstruction,
  WithdrawDAOForm,
} from '@utils/uiTypes/proposalCreationTypes'
import { useRouter } from 'next/router'
import { useContext, useEffect, useMemo, useState } from 'react'
import GovernedAccountSelect from '../GovernedAccountSelect'
import { notify } from '@utils/notifications'
import { NewProposalContext } from '../../new'
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { fetchProgramVersion } from '@hooks/queries/useProgramVersionQuery'
import { useRealmsByProgramQuery } from '@hooks/queries/realm'
import { DEFAULT_GOVERNANCE_PROGRAM_ID } from '@solana/governance-program-library'
import { BN } from 'bn.js'
import { shortenAddress } from '@utils/address'
import { createUnchartedRealmInfo, RealmInfo } from '@models/registry/api'
import { getRealm } from '@realms-today/spl-governance'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token-new'
import { getProposals } from '@utils/GovernanceTools'

/** This is an instruction component to deposit tokens in another DAO */
const WithdrawFromDAO = ({
  index,
  governance,
}: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const router = useRouter()
  const { cluster } = router.query
  //Small hack to prevent race conditions with cluster change until we remove connection from store and move it to global dep.
  const routeHasClusterInPath = router.asPath.includes('cluster')

  const wallet = useWalletOnePointOh()
  const connection = useLegacyConnectionContext()

  const { governedTokenAccounts } = useGovernanceAssets()

  const { handleSetInstructions } = useContext(NewProposalContext)

  const [form, setForm] = useState<WithdrawDAOForm>({
    governedAccount: undefined,
    mintInfo: undefined,
    realm: '',
    amount: undefined,
  })
  const [formErrors, setFormErrors] = useState({})
  const handleSetForm = ({ propertyName, value }) => {
    setFormErrors({})
    setForm({ ...form, [propertyName]: value })
  }

  const mintMinAmount = form.mintInfo
    ? getMintMinAmountAsDecimal(form.mintInfo)
    : 1
  const currentPrecision = precision(mintMinAmount)

  const [certifiedRealms, setCertifiedRealms] = useState<
    ReadonlyArray<RealmInfo>
  >([])

  const { data: queryRealms } = useRealmsByProgramQuery(
    DEFAULT_GOVERNANCE_PROGRAM_ID,
  )

  const setAmount = (event) => {
    const value = event.target.value
    handleSetForm({
      value: value,
      propertyName: 'amount',
    })
  }

  const setRealm = (event) => {
    const value = event.target.value
    handleSetForm({
      value: value,
      propertyName: 'realm',
    })
  }

  const validateAmountOnBlur = () => {
    const value = form.amount

    handleSetForm({
      value: parseFloat(
        Math.max(
          Number(mintMinAmount),
          Math.min(Number(Number.MAX_SAFE_INTEGER), Number(value)),
        ).toFixed(currentPrecision),
      ),
      propertyName: 'amount',
    })
  }

  async function getInstruction() {
    if (
      !connection ||
      !form.realm ||
      !form.governedAccount?.governance.account ||
      !wallet?.publicKey
    ) {
      return {
        serializedInstruction: '',
        isValid: false,
        governance: form.governedAccount?.governance,
      }
    }
    const realm = await getRealm(connection.current, new PublicKey(form.realm))

    const governances = await getGovernanceAccounts(
      connection.current,
      realm.owner,
      Governance,
      [pubkeyFilter(1, new PublicKey(form.realm))!],
    )

    const proposalsArrays = await getProposals(
      governances.map((x) => x.pubkey),
      connection,
      realm.owner,
    )
    const proposals = proposalsArrays.flatMap((x) => x)

    const myVoteRecords = await getGovernanceAccounts(
      connection.current,
      realm.owner,
      VoteRecord,
      [pubkeyFilter(33, form.governedAccount.extensions.transferAddress)!],
    )

    const ownVoteRecordsByProposal = Object.fromEntries(
      myVoteRecords.map((x) => [x.account.proposal.toString(), x] as const),
    ) as Record<string, (typeof myVoteRecords)[number]>

    const unReleased = proposals?.filter(
      (x) =>
        (x.account.state === ProposalState.Completed ||
          x.account.state === ProposalState.Executing ||
          x.account.state === ProposalState.SigningOff ||
          x.account.state === ProposalState.Succeeded ||
          x.account.state === ProposalState.ExecutingWithErrors ||
          x.account.state === ProposalState.Defeated ||
          x.account.state === ProposalState.Vetoed ||
          x.account.state === ProposalState.Cancelled) &&
        ownVoteRecordsByProposal?.[x.pubkey.toBase58()] &&
        !ownVoteRecordsByProposal?.[x.pubkey.toBase58()]?.account
          .isRelinquished,
    )

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

    for (const proposal of unReleased) {
      await withRelinquishVote(
        instructions,
        realm!.owner,
        programVersion,
        realm!.pubkey,
        proposal!.account.governance,
        proposal!.pubkey,
        voterTokenRecord,
        realm.account.communityMint,
        ownVoteRecordsByProposal[proposal!.pubkey.toBase58()].pubkey,
        form.governedAccount.extensions.transferAddress,
        form.governedAccount.extensions.transferAddress,
      )
    }

    await withWithdrawGoverningTokens(
      instructions,
      realm.owner,
      programVersion,
      new PublicKey(form.realm),
      destinationAccount,
      mint,
      form.governedAccount.extensions.transferAddress!,
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

export default WithdrawFromDAO
