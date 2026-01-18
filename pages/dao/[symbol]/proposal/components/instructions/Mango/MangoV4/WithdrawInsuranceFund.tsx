/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { useContext, useEffect, useState } from 'react'
import * as yup from 'yup'
import { isFormValid } from '@utils/formValidation'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'
import { NewProposalContext } from '../../../../new'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { Governance } from '@solana/spl-governance'
import { ProgramAccount } from '@solana/spl-governance'
import { serializeInstructionToBase64 } from '@solana/spl-governance'
import { AccountType, AssetAccount } from '@utils/uiTypes/assets'
import InstructionForm, { InstructionInput } from '../../FormCreator'
import { InstructionInputType } from '../../inputInstructionType'
import UseMangoV4 from '../../../../../../../../hooks/useMangoV4'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  Token,
} from '@solana/spl-token'
import { TransactionInstruction } from '@solana/web3.js'
import { useConnection } from '@solana/wallet-adapter-react'
import { BN } from '@coral-xyz/anchor'
import ProgramSelector from '@components/Mango/ProgramSelector'
import useProgramSelector from '@components/Mango/useProgramSelector'
import { tryGetMint } from '@utils/tokens'
import { toNative } from '@blockworks-foundation/mango-v4'

interface WithdrawInsuranceFundForm {
  governedAccount: AssetAccount | null
  amount: number
  holdupTime: number
}

interface MintInfo {
  decimals: number
  symbol: string
}

const WithdrawInsuranceFund = ({
  index,
  governance,
}: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const wallet = useWalletOnePointOh()
  const programSelectorHook = useProgramSelector()
  const { mangoClient, mangoGroup } = UseMangoV4(
    programSelectorHook.program?.val,
    programSelectorHook.program?.group,
  )
  const { assetAccounts } = useGovernanceAssets()
  const { connection } = useConnection()
  const solAccounts = assetAccounts.filter(
    (x) =>
      x.type === AccountType.SOL &&
      mangoGroup?.admin &&
      x.extensions.transferAddress?.equals(mangoGroup.admin),
  )
  const shouldBeGoverned = !!(index !== 0 && governance)
  const [mintInfo, setMintInfo] = useState<MintInfo | null>(null)
  const [form, setForm] = useState<WithdrawInsuranceFundForm>({
    governedAccount: null,
    amount: 0,
    holdupTime: 0,
  })
  const [formErrors, setFormErrors] = useState({})
  const { handleSetInstructions } = useContext(NewProposalContext)

  useEffect(() => {
    const getMintInfo = async () => {
      if (mangoGroup) {
        const mint = await tryGetMint(connection, mangoGroup.insuranceMint)
        if (mint) {
          setMintInfo({
            decimals: mint.account.decimals,
            symbol: 'USDC', // Insurance fund is typically USDC
          })
        }
      }
    }
    getMintInfo()
  }, [mangoGroup, connection])

  const validateInstruction = async (): Promise<boolean> => {
    const { isValid, validationErrors } = await isFormValid(schema, form)
    setFormErrors(validationErrors)
    return isValid
  }
  async function getInstruction(): Promise<UiInstruction> {
    const isValid = await validateInstruction()
    let serializedInstruction = ''
    const prerequisiteInstructions: TransactionInstruction[] = []
    if (
      isValid &&
      form.governedAccount?.governance?.account &&
      wallet?.publicKey &&
      mangoGroup &&
      mangoClient &&
      form.amount > 0
    ) {
      const insuranceMint = mangoGroup.insuranceMint

      const ataAddress = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        insuranceMint,
        form.governedAccount.extensions.transferAddress!,
        true,
      )

      const depositAccountInfo = await connection.getAccountInfo(ataAddress)
      if (!depositAccountInfo) {
        // generate the instruction for creating the ATA
        prerequisiteInstructions.push(
          Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            insuranceMint,
            ataAddress,
            form.governedAccount.extensions.transferAddress!,
            wallet.publicKey,
          ),
        )
      }

      const nativeAmount = toNative(form.amount, mintInfo?.decimals || 6)

      const ix = await mangoClient!.program.methods
        .groupWithdrawInsuranceFund(nativeAmount)
        .accounts({
          group: mangoGroup.publicKey,
          admin: form.governedAccount.extensions.transferAddress,
          insuranceVault: mangoGroup.insuranceVault,
          destination: ataAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction()

      serializedInstruction = serializeInstructionToBase64(ix)
    }
    const obj: UiInstruction = {
      prerequisiteInstructions,
      serializedInstruction: serializedInstruction,
      isValid,
      governance: form.governedAccount?.governance,
      customHoldUpTime: form.holdupTime,
    }
    return obj
  }

  useEffect(() => {
    handleSetInstructions(
      { governedAccount: form.governedAccount?.governance, getInstruction },
      index,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO please fix, it can cause difficult bugs. You might wanna check out https://bobbyhadz.com/blog/react-hooks-exhaustive-deps for info. -@asktree
  }, [form, mangoClient, mangoGroup, mintInfo])
  const schema = yup.object().shape({
    governedAccount: yup
      .object()
      .nullable()
      .required('Program governed account is required'),
  })
  const inputs: InstructionInput[] = [
    {
      label: 'Governance',
      initialValue: form.governedAccount,
      name: 'governedAccount',
      type: InstructionInputType.GOVERNED_ACCOUNT,
      shouldBeGoverned: shouldBeGoverned as any,
      governance: governance,
      options: solAccounts,
    },
    {
      label: `Amount (${mintInfo?.symbol || 'tokens'})`,
      initialValue: form.amount,
      type: InstructionInputType.INPUT,
      inputType: 'number',
      name: 'amount',
    },
    {
      label: 'Instruction hold up time (days)',
      initialValue: form.holdupTime,
      type: InstructionInputType.INPUT,
      inputType: 'number',
      name: 'holdupTime',
    },
  ]

  return (
    <>
      <ProgramSelector
        programSelectorHook={programSelectorHook}
      ></ProgramSelector>
      {form && (
        <InstructionForm
          outerForm={form}
          setForm={setForm}
          inputs={inputs}
          setFormErrors={setFormErrors}
          formErrors={formErrors}
        ></InstructionForm>
      )}
    </>
  )
}

export default WithdrawInsuranceFund
