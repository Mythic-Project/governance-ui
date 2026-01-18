import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as yup from 'yup'
import { createHash } from 'crypto'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import {
  Governance,
  serializeInstructionToBase64,
} from '@solana/spl-governance'
import { ProgramAccount } from '@solana/spl-governance'
import { AccountType, AssetAccount } from '@utils/uiTypes/assets'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { NewProposalContext } from '../../../new'
import InstructionForm, { InstructionInput } from '../FormCreator'
import { InstructionInputType } from '../inputInstructionType'
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext'
import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { tryGetTokenAccount } from '@utils/tokens'
import Button from '@components/Button'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token-new'
import { validateInstruction } from '@utils/instructionTools'

// Mango V3 Reimbursement Program ID
const REIMBURSEMENT_PROGRAM_ID = new PublicKey(
  'm3roABq4Ta3sGyFRLdY4LH1KN16zBtg586gJ3UxoBzb'
)

// Default group address - can be changed in the form
const DEFAULT_GROUP = 'Hy4ZsZkVa1ZTVa2ghkKY3TsThYEK9MgaL8VPF569jsHP'

interface WithdrawFromVaultsForm {
  governedAccount: AssetAccount | null
  groupAddress: string
}

type VaultInfo = {
  publicKey: PublicKey
  mint: PublicKey
  amount: bigint
  tokenIndex: number
  symbol?: string
}

// Group account offsets (after 8-byte Anchor discriminator)
const GROUP_OFFSETS = {
  GROUP_NUM: 8,
  TABLE: 12,
  CLAIM_TRANSFER_DESTINATION: 44,
  AUTHORITY: 76,
  VAULTS: 108, // 16 * 32 = 512 bytes
  CLAIM_MINTS: 620, // 16 * 32 = 512 bytes
  MINTS: 1132, // 16 * 32 = 512 bytes
  REIMBURSEMENT_STARTED: 1644,
  BUMP: 1645,
  TESTING: 1646,
}

// Create the Anchor instruction discriminator
function getInstructionDiscriminator(name: string): Buffer {
  const hash = createHash('sha256')
    .update(`global:${name}`)
    .digest()
  return hash.slice(0, 8)
}

// Parse Group account data
function parseGroupAccount(data: Buffer) {
  const vaults: PublicKey[] = []
  const mints: PublicKey[] = []

  for (let i = 0; i < 16; i++) {
    const vaultOffset = GROUP_OFFSETS.VAULTS + i * 32
    const mintOffset = GROUP_OFFSETS.MINTS + i * 32
    vaults.push(new PublicKey(data.slice(vaultOffset, vaultOffset + 32)))
    mints.push(new PublicKey(data.slice(mintOffset, mintOffset + 32)))
  }

  return {
    groupNum: data.readUInt32LE(GROUP_OFFSETS.GROUP_NUM),
    authority: new PublicKey(
      data.slice(GROUP_OFFSETS.AUTHORITY, GROUP_OFFSETS.AUTHORITY + 32)
    ),
    vaults,
    mints,
    bump: data[GROUP_OFFSETS.BUMP],
  }
}

// Build withdraw_to_authority instruction
function buildWithdrawToAuthorityInstruction(
  group: PublicKey,
  vault: PublicKey,
  authorityTokenAccount: PublicKey,
  authority: PublicKey,
  tokenIndex: number
): TransactionInstruction {
  const discriminator = getInstructionDiscriminator('withdraw_to_authority')

  // token_index is usize (u64 on Solana)
  const data = Buffer.alloc(16)
  discriminator.copy(data, 0)
  data.writeBigUInt64LE(BigInt(tokenIndex), 8)

  return new TransactionInstruction({
    programId: REIMBURSEMENT_PROGRAM_ID,
    keys: [
      { pubkey: group, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: authorityTokenAccount, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  })
}

// Get the authority address based on account type
function getAuthorityAddress(account: AssetAccount | null): PublicKey | null {
  if (!account) return null

  // For SOL accounts, use transferAddress (native treasury)
  if (account.extensions.transferAddress) {
    return account.extensions.transferAddress
  }

  // For PROGRAM accounts, the authority is stored in extensions.program.authority
  // This is the program's upgrade authority which can sign
  if (account.type === AccountType.PROGRAM && account.extensions.program?.authority) {
    return account.extensions.program.authority
  }

  // For old-style governance, try native treasury
  if (account.governance.nativeTreasuryAddress) {
    return account.governance.nativeTreasuryAddress
  }

  // Fallback to governed account
  return account.governance.account.governedAccount || account.pubkey
}

const WithdrawFromVaults = ({
  index,
  governance,
}: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const wallet = useWalletOnePointOh()
  const { assetAccounts } = useGovernanceAssets()
  // Include SOL, PROGRAM, and GENERIC accounts as possible authorities
  const governanceAccounts = assetAccounts.filter(
    (x) =>
      x.type === AccountType.SOL ||
      x.type === AccountType.PROGRAM ||
      x.type === AccountType.GENERIC
  )
  const connection = useLegacyConnectionContext()
  const shouldBeGoverned = !!(index !== 0 && governance)

  const [form, setForm] = useState<WithdrawFromVaultsForm>({
    governedAccount: null,
    groupAddress: DEFAULT_GROUP,
  })
  const [vaults, setVaults] = useState<VaultInfo[]>([])
  const [selectedVaults, setSelectedVaults] = useState<Set<number>>(new Set())
  const [groupData, setGroupData] = useState<ReturnType<
    typeof parseGroupAccount
  > | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const { handleSetInstructions } = useContext(NewProposalContext)

  const schema = useMemo(
    () =>
      yup.object().shape({
        governedAccount: yup
          .object()
          .nullable()
          .required('Governance account is required'),
        groupAddress: yup.string().required('Group address is required'),
      }),
    []
  )

  const fetchGroupAndVaults = async () => {
    if (!form.groupAddress) return
    setIsLoading(true)

    try {
      const groupPubkey = new PublicKey(form.groupAddress)
      const groupAccountInfo = await connection.current.getAccountInfo(
        groupPubkey
      )

      if (!groupAccountInfo) {
        console.error('Group account not found')
        setIsLoading(false)
        return
      }

      const parsed = parseGroupAccount(groupAccountInfo.data as Buffer)
      setGroupData(parsed)

      // Fetch vault balances
      const vaultInfos: VaultInfo[] = []
      for (let i = 0; i < 16; i++) {
        const vault = parsed.vaults[i]
        const mint = parsed.mints[i]

        // Skip empty vaults (default pubkey)
        if (vault.equals(PublicKey.default)) continue

        try {
          const tokenAccount = await tryGetTokenAccount(
            connection.current,
            vault
          )

          if (tokenAccount && Number(tokenAccount.account.amount) > 0) {
            vaultInfos.push({
              publicKey: vault,
              mint: mint,
              amount: BigInt(tokenAccount.account.amount.toString()),
              tokenIndex: i,
            })
          }
        } catch (e) {
          console.log(`Vault ${i} error:`, e)
        }
      }

      setVaults(vaultInfos)
      // Select all vaults by default - chunking handles tx size
      setSelectedVaults(new Set(vaultInfos.map((v) => v.tokenIndex)))
    } catch (e) {
      console.error('Error fetching group:', e)
    }

    setIsLoading(false)
  }

  const toggleVaultSelection = (tokenIndex: number) => {
    setSelectedVaults((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(tokenIndex)) {
        newSet.delete(tokenIndex)
      } else {
        newSet.add(tokenIndex)
      }
      return newSet
    })
  }

  const selectAllVaults = () => {
    setSelectedVaults(new Set(vaults.map((v) => v.tokenIndex)))
  }

  const deselectAllVaults = () => {
    setSelectedVaults(new Set())
  }

  const getInstruction = useCallback(async () => {
    const isValid = await validateInstruction({ schema, form, setFormErrors })
    const serializedInstruction = ''
    const additionalSerializedInstructions: string[] = []
    const prerequisiteInstructions: TransactionInstruction[] = []
    const mintsOfCurrentlyPushedAtaInstructions: string[] = []

    const selectedVaultsList = vaults.filter((v) =>
      selectedVaults.has(v.tokenIndex)
    )

    const authority = getAuthorityAddress(form.governedAccount)

    if (
      isValid &&
      form.governedAccount?.governance?.account &&
      wallet?.publicKey &&
      selectedVaultsList.length > 0 &&
      groupData &&
      authority
    ) {
      const groupPubkey = new PublicKey(form.groupAddress)

      for (const vault of selectedVaultsList) {
        // Get ATA address for the authority
        const ataAddress = getAssociatedTokenAddressSync(
          vault.mint,
          authority,
          true, // allowOwnerOffCurve
          TOKEN_PROGRAM_ID
        )

        // Always add idempotent ATA creation - it's safe even if ATA exists
        if (!mintsOfCurrentlyPushedAtaInstructions.includes(vault.mint.toBase58())) {
          prerequisiteInstructions.push(
            createAssociatedTokenAccountIdempotentInstruction(
              wallet.publicKey, // payer
              ataAddress,
              authority, // owner
              vault.mint,
              TOKEN_PROGRAM_ID
            )
          )
          mintsOfCurrentlyPushedAtaInstructions.push(vault.mint.toBase58())
        }

        // Build withdraw instruction
        const ix = buildWithdrawToAuthorityInstruction(
          groupPubkey,
          vault.publicKey,
          ataAddress,
          authority,
          vault.tokenIndex
        )

        additionalSerializedInstructions.push(serializeInstructionToBase64(ix))
      }
    }

    const obj: UiInstruction = {
      serializedInstruction,
      isValid,
      governance: form.governedAccount?.governance,
      additionalSerializedInstructions,
      prerequisiteInstructions,
      chunkBy: 2,
    }
    return obj
  }, [
    connection,
    form,
    groupData,
    schema,
    selectedVaults,
    vaults,
    wallet?.publicKey,
  ])

  useEffect(() => {
    handleSetInstructions(
      { governedAccount: form.governedAccount?.governance, getInstruction },
      index,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO please fix, it can cause difficult bugs. You might wanna check out https://bobbyhadz.com/blog/react-hooks-exhaustive-deps for info. -@asktree
  }, [form, getInstruction, handleSetInstructions, index, selectedVaults, vaults])

  const inputs: InstructionInput[] = [
    {
      label: 'Governance',
      initialValue: form.governedAccount,
      name: 'governedAccount',
      type: InstructionInputType.GOVERNED_ACCOUNT,
      shouldBeGoverned: shouldBeGoverned as any,
      governance: governance,
      options: governanceAccounts,
    },
    {
      label: 'Reimbursement Group Address',
      initialValue: form.groupAddress,
      type: InstructionInputType.INPUT,
      inputType: 'text',
      name: 'groupAddress',
      additionalComponent: (
        <div>
          <Button onClick={fetchGroupAndVaults} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Load Vaults'}
          </Button>
        </div>
      ),
    },
  ]

  const formatAmount = (amount: bigint, decimals = 6) => {
    const divisor = BigInt(10 ** decimals)
    const intPart = amount / divisor
    const fracPart = amount % divisor
    return `${intPart}.${fracPart.toString().padStart(decimals, '0')}`
  }

  return (
    <>
      {form && (
        <>
          <InstructionForm
            outerForm={form}
            setForm={setForm}
            inputs={inputs}
            setFormErrors={setFormErrors}
            formErrors={formErrors}
          ></InstructionForm>
          {vaults.length > 0 && (
            <div className="border-t border-th-bkg-2 px-6 py-3">
              <div className="flex justify-between items-center mb-3">
                <span className="whitespace-nowrap text-th-fgd-3">
                  Select vaults to withdraw ({selectedVaults.size}/{vaults.length} selected)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllVaults}
                    className="text-xs text-primary-light hover:text-primary-dark"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllVaults}
                    className="text-xs text-primary-light hover:text-primary-dark"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              {groupData && (
                <div className="text-xs mb-2 p-2 bg-bkg-3 rounded">
                  <div>
                    <span className="text-fgd-3">Group authority: </span>
                    <span className="font-mono text-primary-light">
                      {groupData.authority.toBase58()}
                    </span>
                  </div>
                  <div>
                    <span className="text-fgd-3">Selected: </span>
                    <span className="font-mono">
                      {getAuthorityAddress(form.governedAccount)?.toBase58() || 'None'}
                    </span>
                  </div>
                  <div className="text-fgd-4 text-[10px]">
                    (pubkey: {form.governedAccount?.pubkey?.toBase58()?.slice(0,8)}... |
                    native: {form.governedAccount?.governance?.nativeTreasuryAddress?.toBase58()?.slice(0,8)}...)
                  </div>
                  {form.governedAccount &&
                    !groupData.authority.equals(
                      getAuthorityAddress(form.governedAccount) || PublicKey.default
                    ) && (
                      <div className="text-red-400 mt-1">
                        ⚠️ Mismatch! Need governance with authority: {groupData.authority.toBase58()}
                      </div>
                    )}
                </div>
              )}
              <div className="text-xs text-orange-300 mb-2">
                Note: Instructions are chunked (2 per tx). Select vaults and create proposal.
              </div>
              <div className="flex flex-col font-mono text-th-fgd-2 text-sm">
                {vaults.map((vault) => (
                  <label
                    key={vault.publicKey.toBase58()}
                    className="flex items-center justify-between py-1 border-b border-th-bkg-3 cursor-pointer hover:bg-bkg-3"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedVaults.has(vault.tokenIndex)}
                        onChange={() => toggleVaultSelection(vault.tokenIndex)}
                        className="w-4 h-4"
                      />
                      <span>Token {vault.tokenIndex}</span>
                    </div>
                    <span className="truncate max-w-[120px] text-xs">
                      {vault.mint.toBase58().slice(0, 8)}...
                    </span>
                    <span>{formatAmount(vault.amount)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {groupData && vaults.length === 0 && !isLoading && (
            <div className="px-6 py-3 text-th-fgd-3">
              No vaults with balance found
            </div>
          )}
        </>
      )}
    </>
  )
}

export default WithdrawFromVaults
