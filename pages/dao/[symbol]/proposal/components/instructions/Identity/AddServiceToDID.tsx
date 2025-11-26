// PATH: ./pages/dao/[symbol]/proposal/components/instructions/Identity/AddServiceToDID.tsx

import { useCallback, useContext, useEffect, useState } from 'react'
import * as yup from 'yup'
import {
  Governance,
  ProgramAccount,
  serializeInstructionToBase64,
} from '@solana/spl-governance'
import { validateInstruction } from '@utils/instructionTools'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'

import { NewProposalContext } from '../../../new'
import InstructionForm, { InstructionInput } from '../FormCreator'
import { AssetAccount } from '@utils/uiTypes/assets'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { DidSolIdentifier, DidSolService } from '@identity.com/sol-did-client'
import {
  governanceInstructionInput,
  governedAccountToWallet,
  instructionInputs,
  SchemaComponents,
} from '@utils/instructions/Identity/util'
import { useRealmQuery } from '@hooks/queries/realm'
import { useConnection } from '@solana/wallet-adapter-react'


interface AddServiceToDIDForm {
  governedAccount: AssetAccount | undefined
  did: string
  alias: string
  serviceEndpoint: string
  serviceType: string
}

const AddServiceToDID = ({
                           index,
                           governance,
                         }: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const realm = useRealmQuery().data?.result
  const { assetAccounts } = useGovernanceAssets()
  const { connection } = useConnection()
  const shouldBeGoverned = index !== 0 && governance
  const [form, setForm] = useState<AddServiceToDIDForm>()
  const [formErrors, setFormErrors] = useState({})
  const { handleSetInstructions } = useContext(NewProposalContext)

  // ✅ Déclare le schema avant son usage
  const schema = yup.object().shape(SchemaComponents)

  const getInstruction = useCallback(async (): Promise<UiInstruction> => {
    const isValid = await validateInstruction({ schema, form, setFormErrors })
    let serializedInstructions = ['']

    if (
        isValid &&
        form?.governedAccount?.governance?.pubkey &&
        connection
    ) {
      const service = DidSolService.build(DidSolIdentifier.parse(form.did), {
        connection,
        wallet: governedAccountToWallet(form.governedAccount),
      })

      const addServiceIxs = await service
          .addService({
            fragment: form.alias,
            serviceEndpoint: form.serviceEndpoint,
            serviceType: form.serviceType,
          })
          .withAutomaticAlloc(form.governedAccount.pubkey)
          .instructions()

      serializedInstructions = addServiceIxs.map(serializeInstructionToBase64)
    }

    const [serializedInstruction, ...additionalSerializedInstructions] =
        serializedInstructions.reverse()

    return {
      serializedInstruction,
      additionalSerializedInstructions,
      isValid,
      governance: form?.governedAccount?.governance,
    }
  }, [form, connection, schema, setFormErrors])

  useEffect(() => {
    handleSetInstructions(
        { governedAccount: form?.governedAccount?.governance, getInstruction },
        index,
    )
  }, [form, handleSetInstructions, index, getInstruction])

  const inputs: InstructionInput[] = [
    governanceInstructionInput(
        realm,
        governance || undefined,
        assetAccounts,
        shouldBeGoverned,
    ),
    instructionInputs.did,
    instructionInputs.serviceEndpoint,
    instructionInputs.serviceType,
    instructionInputs.alias,
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
      </>
  )
}

export default AddServiceToDID
