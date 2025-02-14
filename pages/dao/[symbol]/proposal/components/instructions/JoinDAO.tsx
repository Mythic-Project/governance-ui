import Input from '@components/inputs/Input'
import Select from '@components/inputs/Select'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import useRealmAccount from '@hooks/useRealmAccount'
import {
  Governance,
  ProgramAccount,
  serializeInstructionToBase64,
  withDepositGoverningTokens,
} from '@solana/spl-governance'
import { TransactionInstruction } from '@solana/web3.js'
import {
  getMintMinAmountAsDecimal,
  parseMintNaturalAmountFromDecimalAsBN,
} from '@tools/sdk/units'
import { precision } from '@utils/formatting'
import { JoinDAOForm } from '@utils/uiTypes/proposalCreationTypes'
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

/** This is an instruction component to deposit tokens in another DAO */
const JoinDAO = ({
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

  const { governedSPLTokenAccounts } = useGovernanceAssets()

  const { handleSetInstructions } = useContext(NewProposalContext)

  const [form, setForm] = useState<JoinDAOForm>({
    governedAccount: undefined,
    mintInfo: undefined,
    realm: null,
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

  const { realmAccount: selectedRealm } = useRealmAccount(form.realm?.realmId)
  const { data: queryRealms } = useRealmsByProgramQuery(DEFAULT_GOVERNANCE_PROGRAM_ID)

  const validTokenAccounts = useMemo(() => {
    if (selectedRealm) {
      return governedSPLTokenAccounts.filter(
        (t) =>
          t.extensions.mint?.publicKey.toBase58() ===
          selectedRealm.account.communityMint.toBase58(),
      )
    } else return []
  }, [governedSPLTokenAccounts, selectedRealm])

  const setAmount = (event) => {
    const value = event.target.value
    handleSetForm({
      value: value,
      propertyName: 'amount',
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
      !form.amount ||
      !form.mintInfo ||
      !form.realm ||
      !selectedRealm ||
      !form.governedAccount?.governance.account ||
      !form.governedAccount.extensions.mint ||
      !form.governedAccount.extensions.token ||
      !wallet?.publicKey
    ) {
      return {
        serializedInstruction: '',
        isValid: false,
        governance: form.governedAccount?.governance,
      }
    }

    const instructions: TransactionInstruction[] = []

    const atomicAmount = parseMintNaturalAmountFromDecimalAsBN(
      form.amount,
      form.mintInfo.decimals,
    )

    const programVersion = await fetchProgramVersion(
      connection.current,
      form.realm.programId,
    )

    await withDepositGoverningTokens(
      instructions,
      form.realm.programId,
      programVersion,
      form.realm.realmId,
      form.governedAccount.pubkey,
      selectedRealm?.account.communityMint,
      form.governedAccount.extensions.token.account.owner,
      form.governedAccount.extensions.token.account.owner,
      wallet!.publicKey!,
      atomicAmount,
    )

    if (instructions.length != 1) {
      notify({ type: 'error', message: 'Something went wrong' })
    }

    return {
      serializedInstruction: serializeInstructionToBase64(instructions[0]),
      isValid: true,
      governance: form.governedAccount.governance,
    }
  }

  // Fetch realms to join
  useEffect(() => {
    if (queryRealms) {
      const mintsWithBalance = governedSPLTokenAccounts.filter(x => x.extensions.amount?.gt(new BN(0)))

      const uniqueMints = [...new Set(mintsWithBalance
        .map(t => t.extensions.mint?.publicKey.toBase58())
        .filter(t => t !== undefined))]

      const realms: RealmInfo[] = queryRealms
        .filter(realm => uniqueMints.includes(realm.account.communityMint.toBase58()))
        .map((x) => (
          createUnchartedRealmInfo({
            name: x.account.name,
            programId: x.owner.toBase58(),
            address: x.pubkey.toBase58(),
          })
        ))
  
      setCertifiedRealms(realms)
    } else setCertifiedRealms([])
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO please fix, it can cause difficult bugs. You might wanna check out https://bobbyhadz.com/blog/react-hooks-exhaustive-deps for info. -@asktree
  }, [queryRealms])

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
      <Select
        label={'Realm'}
        value={form.realm}
        onChange={(value) => {
          handleSetForm({ value, propertyName: 'realm' })
        }}
        componentLabel={
          form['realm'] ? form['realm'].displayName : 'Select Realm'
        }
        error={formErrors['realm']}
      >
        {certifiedRealms.map((r) => (
          <Select.Option
            className="border-red"
            key={r.realmId.toString()}
            value={r}
          >
            {r.displayName} 
            <span className="text-xs ml-2">
              ({shortenAddress(r.realmId.toBase58(), 8)})
            </span>
          </Select.Option>
        ))}
      </Select>
      {validTokenAccounts.length && selectedRealm ? (
        <>
          <GovernedAccountSelect
            label="Token Account"
            governedAccounts={validTokenAccounts}
            onChange={(value) => {
              handleSetForm({ value, propertyName: 'governedAccount' })
            }}
            value={form.governedAccount}
            error={formErrors['governedAccount']}
            shouldBeGoverned={!!governance}
            governance={governance}
          />
          {form.governedAccount && (
            <Input
              min={mintMinAmount}
              label="Amount"
              value={form.amount}
              type="number"
              onChange={setAmount}
              step={mintMinAmount}
              error={formErrors['amount']}
              onBlur={validateAmountOnBlur}
            />
          )}
        </>
      ) : (
        <h4>This DAO cannot join {selectedRealm?.account.name}</h4>
      )}
    </>
  )
}

export default JoinDAO
