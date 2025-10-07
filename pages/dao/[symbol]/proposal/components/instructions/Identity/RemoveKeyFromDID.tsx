// PATH: ./pages/dao/[symbol]/proposal/components/instructions/Identity/RemoveKeyFromDID.tsx

import { useContext, useEffect, useState, useCallback, useMemo } from 'react'
import * as yup from 'yup'
import { Governance, ProgramAccount, serializeInstructionToBase64 } from '@solana/spl-governance'
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
import {handleSetInstructions} from "./RemoveServiceFromDID";

interface RemoveKeyFromDIDForm {
  governedAccount: AssetAccount | undefined
  did: string
  alias: string
}

const RemoveKeyFromDID = ({
                            index,
                            governance,
                          }: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const realm = useRealmQuery().data?.result
  const { assetAccounts } = useGovernanceAssets()
  const { connection } = useConnection() // ✅ useConnection (no `.current`)
  const [form, setForm] = useState<RemoveKeyFromDIDForm>()
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const shouldBeGoverned = index !== 0 && governance

  const schema = useMemo(
      () =>
          yup.object().shape({
            governedAccount: SchemaComponents.governedAccount,
            did: SchemaComponents.did,
            alias: SchemaComponents.alias,
          }),
      []
  )

  const getInstruction = useCallback(async (): Promise<UiInstruction> => {
    const isValid = await validateInstruction({ schema, form, setFormErrors })
    let serializedInstructions: string[] = ['']

    if (isValid && form?.governedAccount?.governance?.account && connection) {
      const service = DidSolService.build(DidSolIdentifier.parse(form.did), {
        connection,
        wallet: governedAccountToWallet(form.governedAccount),
      })

      const removeKeyIxs = await service
          .removeVerificationMethod(form.alias)
          .withAutomaticAlloc(form.governedAccount.governance.pubkey)
          .instructions()

      serializedInstructions = removeKeyIxs.map(serializeInstructionToBase64)
    }

    const [serializedInstruction, ...additionalSerializedInstructions] =
        serializedInstructions.reverse()

    return {
      serializedInstruction,
      additionalSerializedInstructions,
      isValid,
      governance: form?.governedAccount?.governance,
    }
  }, [form, connection, schema, setFormErrors]) // ✅ all deps included

  useEffect(() => {
    handleSetInstructions({governedAccount: form?.governedAccount?.governance, getInstruction}, index)
  }, [form, getInstruction, index]) // ✅ no warning now

  const inputs: InstructionInput[] = [
    governanceInstructionInput(realm, governance || undefined, assetAccounts, shouldBeGoverned),
    instructionInputs.did,
    instructionInputs.alias,
  ]

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

export default RemoveKeyFromDID
