import { useContext, useEffect, useState } from 'react'
import * as yup from 'yup'
import { isFormValid, validatePubkey } from '@utils/formValidation'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { Governance } from '@solana/spl-governance'
import { ProgramAccount } from '@solana/spl-governance'
import { serializeInstructionToBase64 } from '@solana/spl-governance'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import InstructionForm, { InstructionInput } from '../FormCreator'
import { InstructionInputType } from '../inputInstructionType'
import { NewProposalContext } from '../../../new'
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext'
import { PublicKey } from '@solana/web3.js'
import { AssetAccount } from '@utils/uiTypes/assets'
import { PythStakingClient } from '@pythnetwork/staking-sdk'

export interface PythTransferAccountForm {
  governedAccount: AssetAccount | null
  stakeAccount: string
  newOwner: string
}

const PythTransferAccount = ({
  index,
  governance,
}: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const wallet = useWalletOnePointOh()
  const connection = useLegacyConnectionContext()
  const { assetAccounts } = useGovernanceAssets()
  const shouldBeGoverned = !!(index !== 0 && governance)
  const [form, setForm] = useState<PythTransferAccountForm>({
    governedAccount: null,
    stakeAccount: '',
    newOwner: '',
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

    if (
      isValid &&
      form.governedAccount?.governance?.account &&
      wallet?.publicKey
    ) {
      const pythClient = new PythStakingClient({
        connection: connection.current,
      })

      const stakeAccountPublicKey = new PublicKey(form.stakeAccount)
      const newOwner = new PublicKey(form.newOwner)
      const instruction = await pythClient.getTransferAccountInstruction(
        stakeAccountPublicKey,
        form.governedAccount.governance.pubkey,
        newOwner,
      )

      return {
        serializedInstruction: serializeInstructionToBase64(instruction),
        isValid,
        governance: form.governedAccount?.governance,
        chunkBy: 1,
      }
    } else {
      return {
        serializedInstruction: '',
        isValid,
        governance: form.governedAccount?.governance,
        chunkBy: 1,
      }
    }
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
    stakeAccount: yup
      .string()
      .required('Stake account is required')
      .test(
        'is-stake-account-valid',
        'Invalid Stake Account',
        function (val: string) {
          return val ? validatePubkey(val) : true
        },
      ),
    newOwner: yup
      .string()
      .required('New owner is required')
      .test(
        'is-new-owner-valid',
        'Invalid new owner',
        function (val: string) {
          return val ? validatePubkey(val) : true
        },
      ),
  })
  const inputs: InstructionInput[] = [
    {
      label: 'Governance',
      initialValue: form.governedAccount,
      name: 'governedAccount',
      type: InstructionInputType.GOVERNED_ACCOUNT,
      shouldBeGoverned: shouldBeGoverned as any,
      governance: governance,
      options: assetAccounts,
    },
    {
      label: 'Stake Account',
      initialValue: form.stakeAccount,
      type: InstructionInputType.INPUT,
      inputType: 'text',
      name: 'stakeAccount',
    },
    {
      label: 'New Owner',
      initialValue: form.newOwner,
      type: InstructionInputType.INPUT,
      inputType: 'text',
      name: 'newOwner',
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

export default PythTransferAccount
