import { useContext, useEffect, useState, useCallback } from 'react'
import * as yup from 'yup'
import {
  Governance,
  ProgramAccount,
  serializeInstructionToBase64,
} from '@solana/spl-governance'
import { validateInstruction } from '@utils/instructionTools'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'

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
import { NewProposalContext } from '@components/../context/NewProposalContext'
import {useConnection} from "@solana/wallet-adapter-react";


export const { handleSetInstructions } = useContext(NewProposalContext)
interface RemoveServiceFromDIDForm {
  governedAccount: AssetAccount | undefined
  did: string
  alias: string
}

const RemoveServiceFromDID = ({
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

  const [form, setForm] = useState<RemoveServiceFromDIDForm>()
  const [formErrors, setFormErrors] = useState({})

  const context = useContext(
      NewProposalContext
  ) as {
    handleSetInstructions: (instruction: any, index: number) => void
  }

  const schema = yup.object().shape({
    governedAccount: SchemaComponents.governedAccount,
    did: SchemaComponents.did,
    alias: SchemaComponents.alias,
  })

  const getInstruction = useCallback(async (): Promise<UiInstruction> => {
    const isValid = await validateInstruction({ schema, form, setFormErrors })

    let serializedInstructions = ['']

    if (isValid && form?.governedAccount?.governance?.account && connection) {
      const service = DidSolService.build(DidSolIdentifier.parse(form.did), {
        connection,
        wallet: governedAccountToWallet(form.governedAccount),
      })

      const removeServiceIxs = await service
          .removeService(form.alias)
          .withAutomaticAlloc(form.governedAccount.governance.pubkey)
          .instructions()

      serializedInstructions = removeServiceIxs.map(serializeInstructionToBase64)
    }

    const [serializedInstruction, ...additionalSerializedInstructions] =
        serializedInstructions.reverse()

    return {
      serializedInstruction,
      additionalSerializedInstructions,
      isValid,
      governance: form?.governedAccount?.governance,
    }
  }, [form, connection, schema])

  useEffect(() => {
    context.handleSetInstructions(
        { governedAccount: form?.governedAccount?.governance, getInstruction },
        index
    )
  }, [form, getInstruction, context.handleSetInstructions, index, context])

  const inputs: InstructionInput[] = [
    governanceInstructionInput(realm, governance || undefined, assetAccounts, shouldBeGoverned),
    instructionInputs.did,
    instructionInputs.alias,
  ]

  return (
      <><RemoveServiceFromDID index={0} governance={null}/><InstructionForm
          outerForm={form}
          setForm={setForm}
          inputs={inputs}
          setFormErrors={setFormErrors}
          formErrors={formErrors}/></>
)
}

export default RemoveServiceFromDID
