import { useContext, useEffect, useState } from 'react'
import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import * as yup from 'yup'
import { isFormValid } from '@utils/formValidation'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { Governance } from '@solana/spl-governance'
import { ProgramAccount } from '@solana/spl-governance'
import { serializeInstructionToBase64 } from '@solana/spl-governance'
import { AccountType, AssetAccount } from '@utils/uiTypes/assets'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import useProgramSelector from '@components/Mango/useProgramSelector'
import InstructionForm, { InstructionInput } from '../FormCreator'
import { NewProposalContext } from '../../../new'
import { InstructionInputType } from '../inputInstructionType'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createWithdrawWithheldTokensFromMintInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token-new'
import { findATAAddrSync } from '@utils/ataTools'
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext'

interface WithdrawFeesForm {
  governedAccount: AssetAccount | null
  mint: string
  holdupTime: number
}

const WithdrawFees = ({
  index,
  governance,
}: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const wallet = useWalletOnePointOh()
  const connection = useLegacyConnectionContext()

  const { assetAccounts } = useGovernanceAssets()
  const solAccounts = assetAccounts.filter((x) => x.type === AccountType.SOL)
  const shouldBeGoverned = !!(index !== 0 && governance)
  const [form, setForm] = useState<WithdrawFeesForm>({
    governedAccount: null,
    mint: '',
    holdupTime: 0,
  })
  const [formErrors, setFormErrors] = useState({})
  const { handleSetInstructions } = useContext(NewProposalContext)

  const validateInstruction = async (): Promise<boolean> => {
    const { isValid, validationErrors } = await isFormValid(schema, form)
    setFormErrors(validationErrors)
    return isValid
  }
  async function getInstruction(): Promise<UiInstruction> {
    const isValid = await validateInstruction()
    let serializedInstruction = ''
    const additionalInstructions: TransactionInstruction[] = []
    if (
      isValid &&
      form.governedAccount?.governance?.account &&
      wallet?.publicKey
    ) {
      const solWallet = form.governedAccount.extensions.transferAddress!
      const mint = new PublicKey(form.mint)
      const ata = getAssociatedTokenAddressSync(
        mint,
        solWallet,
        true,
        TOKEN_2022_PROGRAM_ID,
      )
      const ataAccountInfo = await connection.current.getAccountInfo(ata)
      const isExsitingAta = ataAccountInfo && ataAccountInfo.lamports > 0
      if (!isExsitingAta) {
        additionalInstructions.push(
          createAssociatedTokenAccountIdempotentInstruction(
            solWallet,
            ata,
            solWallet,
            mint,
            TOKEN_2022_PROGRAM_ID,
          ),
        )
      }
      const ix = createWithdrawWithheldTokensFromMintInstruction(
        mint,
        ata,
        solWallet,
      )

      serializedInstruction = serializeInstructionToBase64(ix)
    }
    const obj: UiInstruction = {
      additionalSerializedInstructions: additionalInstructions.map((x) =>
        serializeInstructionToBase64(x),
      ),
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
  }, [form])

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
      label: 'Mint',
      initialValue: form.mint,
      type: InstructionInputType.INPUT,
      name: 'mint',
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

export default WithdrawFees
