// pages/dao/[symbol]/proposal/components/instructions/DistrubtionProgram/CloseVaults.tsx
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as yup from 'yup'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import {
  Governance,
  SYSTEM_PROGRAM_ID,
  serializeInstructionToBase64,
} from '@solana/spl-governance'
import { ProgramAccount } from '@solana/spl-governance'
import { AccountType, AssetAccount } from '@utils/uiTypes/assets'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { NewProposalContext } from '../../../new'
import InstructionForm, { InstructionInput } from '../FormCreator'
import { InstructionInputType } from '../inputInstructionType'
import {
  Distribution,
  MangoMintsRedemptionClient,
} from '@blockworks-foundation/mango-mints-redemption'
import { AnchorProvider } from '@coral-xyz/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import EmptyWallet from '@utils/Mango/listingTools'
import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js'
import { tryGetTokenAccount } from '@utils/tokens'
import Button from '@components/Button'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,

  Token,
} from '@solana/spl-token'
import { validateInstruction } from '@utils/instructionTools'
import { SEASON_PREFIX } from './FillVaults'
import {TOKEN_2022_PROGRAM_ID} from "@solana/spl-token-new";

interface CloseVaultsForm {
  governedAccount: AssetAccount | null
  season: number
}

type Vault = {
  publicKey: PublicKey
  amount: bigint
  mintIndex: number
  mint: PublicKey
  type: string
}

const CloseVaults = ({
                       index,
                       governance,
                     }: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const wallet = useWalletOnePointOh()
  const { assetAccounts } = useGovernanceAssets()
  const solAccounts = assetAccounts.filter((x) => x.type === AccountType.SOL)
  const { connection } = useConnection()
  const shouldBeGoverned = !!(index !== 0 && governance)
  const [form, setForm] = useState<CloseVaultsForm>({
    governedAccount: null,
    season: 0,
  })
  const [client, setClient] = useState<MangoMintsRedemptionClient>()
  const [distribution, setDistribution] = useState<Distribution>()
  const [vaults, setVaults] = useState<{ [pubkey: string]: Vault }>()
  const [formErrors, setFormErrors] = useState({})
  const { handleSetInstructions } = useContext(NewProposalContext)

  const schema = useMemo(
      () =>
          yup.object().shape({
            governedAccount: yup
                .object()
                .nullable()
                .required('Program governed account is required'),
          }),
      []
  )

  const getInstruction = useCallback(async () => {
    const isValid = await validateInstruction({ schema, form, setFormErrors })
    const additionalSerializedInstructions: string[] = []
    const prerequisiteInstructions: TransactionInstruction[] = []

    if (isValid && form.governedAccount?.governance?.account && wallet?.publicKey && vaults) {
      const mintsOfCurrentlyPushedAtaInstructions: string[] = []

      for (const v of Object.values(vaults)) {
        const ataAddress = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_2022_PROGRAM_ID,
            v.mint,
            form.governedAccount.extensions.transferAddress!,
            true
        )

        const depositAccountInfo = await connection.getAccountInfo(ataAddress)
        if (!depositAccountInfo && !mintsOfCurrentlyPushedAtaInstructions.includes(v.mint.toBase58())) {
          prerequisiteInstructions.push(
              Token.createAssociatedTokenAccountInstruction(
                  ASSOCIATED_TOKEN_PROGRAM_ID,
                  TOKEN_2022_PROGRAM_ID,
                  v.mint,
                  ataAddress,
                  form.governedAccount.extensions.transferAddress!,
                  wallet.publicKey
              )
          )
          mintsOfCurrentlyPushedAtaInstructions.push(v.mint.toBase58())
        }

        const ix = await client?.program.methods
            .vaultClose()
            .accounts({
              distribution: distribution?.publicKey,
              vault: v.publicKey,
              mint: v.mint,
              destination: ataAddress,
              authority: form.governedAccount.extensions.transferAddress,
              systemProgram: SYSTEM_PROGRAM_ID,
              tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .instruction()
        if (ix) additionalSerializedInstructions.push(serializeInstructionToBase64(ix))
      }
    }

    return {
      additionalSerializedInstructions,
      prerequisiteInstructions,
      serializedInstruction: '',
      isValid,
      governance: form.governedAccount?.governance,
    } as UiInstruction
  }, [client?.program.methods, connection, distribution?.publicKey, form, schema, vaults, wallet?.publicKey])

  const handleSelectDistribution = useCallback(async (number: number) => {
    if (!client) return
    const dist = await client.loadDistribution(Number(`${SEASON_PREFIX}${number}`))
    setDistribution(dist)
  }, [client])

  const fetchVaults = useCallback(async () => {
    if (!client || !distribution) return
    const v: any = {}
    for (let i = 0; i < distribution.metadata!.mints.length; i++) {
      const mint = distribution.metadata!.mints[i]
      const type = mint.properties.type
      const vaultAddress = distribution.findVaultAddress(new PublicKey(mint.address))
      try {
        const tokenAccount = await tryGetTokenAccount(connection, vaultAddress)
        v[vaultAddress.toString()] = {
          publicKey: vaultAddress,
          amount: tokenAccount?.account.amount,
          mint: tokenAccount?.account.mint,
          mintIndex: i,
          type,
        }
      } catch {
        v[vaultAddress.toString()] = { amount: -1, mintIndex: i }
      }
    }
    setVaults(v)
  }, [client, connection, distribution])

  useEffect(() => {
    if (!distribution) return
    const fetchData = async () => {
      try {
        await fetchVaults()
      } catch (err) {
        console.error('Failed to fetch vaults:', err)
      }
    }
    fetchData().then(_r =>7 )
  }, [distribution, fetchVaults])

  useEffect(() => {
    const newClient = new MangoMintsRedemptionClient(
        new AnchorProvider(connection, new EmptyWallet(Keypair.generate()), { skipPreflight: true })
    )
    setClient(newClient)
  }, [connection])

  useEffect(() => {
    handleSetInstructions({ governedAccount: form.governedAccount?.governance, getInstruction }, index)
  }, [form, getInstruction, handleSetInstructions, index, vaults])

  const inputs: InstructionInput[] = [
    {
      label: 'Governance',
      initialValue: form.governedAccount,
      name: 'governedAccount',
      type: InstructionInputType.GOVERNED_ACCOUNT,
      shouldBeGoverned: shouldBeGoverned as any,
      governance,
      options: solAccounts,
    },
    {
      label: 'Distribution Number',
      initialValue: form.season,
      type: InstructionInputType.INPUT,
      additionalComponent: (
          <div>
            <Button onClick={() => handleSelectDistribution(form.season)}>Load</Button>
          </div>
      ),
      inputType: 'number',
      name: 'season',
    },
  ]

  return (
      <>
        <InstructionForm
            outerForm={form}
            setForm={setForm}
            inputs={inputs}
            setFormErrors={setFormErrors}
            formErrors={formErrors}
        />
        {distribution && vaults && (
            <div className="border-t border-th-bkg-2 px-6 py-3">
          <span className="mr-4 mb-3 flex flex-col whitespace-nowrap text-th-fgd-3">
            Vaults to close
          </span>
              <span className="flex flex-col font-mono text-th-fgd-2">
            {Object.entries(vaults).map(([address, vault]) => (
                <div key={address} className="flex justify-between">
                  <p>{address}</p>
                  <p>{distribution.metadata!.mints[vault.mintIndex].properties?.name}</p>
                  <span>{vault.amount > -1 ? vault.amount.toString() : 'Deleted'}</span>
                </div>
            ))}
          </span>
            </div>
        )}
      </>
  )
}

export default CloseVaults
