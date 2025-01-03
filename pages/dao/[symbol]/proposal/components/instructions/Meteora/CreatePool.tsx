import { useContext, useEffect, useState } from 'react'
import * as yup from 'yup'
import {
  Governance,
  ProgramAccount,
  serializeInstructionToBase64,
} from '@solana/spl-governance'
import { validateInstruction } from '@utils/instructionTools'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'
import { PublicKey } from '@solana/web3.js'

import { NewProposalContext } from '../../../new'
import InstructionForm, { InstructionInput } from '../FormCreator'
import { InstructionInputType } from '../inputInstructionType'
import { AssetAccount } from '@utils/uiTypes/assets'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { useRealmQuery } from '@hooks/queries/realm'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { useMeteoraClient } from '@hooks/useMeteoraClient'
interface CreatePoolForm {
  governedAccount: AssetAccount | undefined
  tokenAMint: string
  tokenBMint: string
  fee: number
}

const CreateMeteoraPool = ({
  index,
  governance,
}: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const realm = useRealmQuery().data?.result
  const { assetAccounts } = useGovernanceAssets()
  const wallet = useWalletOnePointOh()
  const { meteoraClient } = useMeteoraClient()
  const shouldBeGoverned = !!(index !== 0 && governance)
  const [form, setForm] = useState<CreatePoolForm>()
  const [formErrors, setFormErrors] = useState({})
  const { handleSetInstructions } = useContext(NewProposalContext)

  const schema = yup.object().shape({
    governedAccount: yup
      .object()
      .nullable()
      .required('Governed account is required'),
    tokenAMint: yup.string().required('Token A mint is required'),
    tokenBMint: yup.string().required('Token B mint is required'),
    fee: yup
      .number()
      .min(0, 'Fee must be positive')
      .max(100, 'Fee must be less than 100')
      .required('Fee is required'),
  })

  async function getInstruction(): Promise<UiInstruction> {
    const isValid = await validateInstruction({ schema, form, setFormErrors })
    let serializedInstruction = ''

    if (
      isValid &&
      form?.governedAccount?.governance?.account &&
      wallet?.publicKey &&
      meteoraClient
    ) {
      const createPoolIx = await meteoraClient.createPool({
        tokenAMint: new PublicKey(form.tokenAMint),
        tokenBMint: new PublicKey(form.tokenBMint),
        authority: wallet.publicKey,
        fee: form.fee,
      })

      serializedInstruction = serializeInstructionToBase64(createPoolIx)
    }

    return {
      serializedInstruction,
      isValid,
      governance: form?.governedAccount?.governance,
    }
  }

  const inputs: InstructionInput[] = [
    {
      label: 'Governance',
      initialValue: null,
      name: 'governedAccount',
      type: InstructionInputType.GOVERNED_ACCOUNT,
      shouldBeGoverned,
      governance,
      options: assetAccounts,
    },
    {
      label: 'Token A Mint',
      initialValue: '',
      name: 'tokenAMint',
      type: InstructionInputType.INPUT,
      inputType: 'text',
    },
    {
      label: 'Token B Mint',
      initialValue: '',
      name: 'tokenBMint',
      type: InstructionInputType.INPUT,
      inputType: 'text',
    },
    {
      label: 'Fee (%)',
      initialValue: 0,
      name: 'fee',
      type: InstructionInputType.INPUT,
      inputType: 'number',
      min: 0,
      max: 100,
    },
  ]

  useEffect(() => {
    handleSetInstructions(
      {
        governedAccount: form?.governedAccount?.governance,
        getInstruction,
      },
      index
    )
  }, [form, handleSetInstructions, index])

  return (
    <InstructionForm
      outerForm={form}
      setForm={setForm}
      inputs={inputs}
      setFormErrors={setFormErrors}
      formErrors={formErrors}
    />
  )
}

export default CreateMeteoraPool