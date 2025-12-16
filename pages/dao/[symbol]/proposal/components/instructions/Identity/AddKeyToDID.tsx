// PATH: ./pages/dao/[symbol]/proposal/components/instructions/Identity/AddKeyToDID.tsx
import { useContext, useEffect, useState, useCallback, useMemo } from 'react'
import * as yup from 'yup'
import { Governance, ProgramAccount, serializeInstructionToBase64 } from '@solana/spl-governance'
import { validateInstruction } from '@utils/instructionTools'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'

import { NewProposalContext } from '../../../new'
import InstructionForm, { InstructionInput } from '../FormCreator'
import { AssetAccount } from '@utils/uiTypes/assets'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { PublicKey } from '@solana/web3.js'
import {
  BitwiseVerificationMethodFlag,
  DidSolIdentifier,
  DidSolService,
  VerificationMethodType,
} from '@identity.com/sol-did-client'
import {
  governanceInstructionInput,
  governedAccountToWallet,
  instructionInputs,
  SchemaComponents,
} from '@utils/instructions/Identity/util'
import { useRealmQuery } from '@hooks/queries/realm'
import { useConnection } from '@solana/wallet-adapter-react'

interface AddKeyToDIDForm {
  governedAccount: AssetAccount | undefined
  did: string
  key: string
  alias: string
}

const AddKeyToDID = ({
                       index,
                       governance,
                     }: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const realm = useRealmQuery().data?.result
  const { assetAccounts } = useGovernanceAssets()
  const { connection: rawConnection } = useConnection()
  const [form, setForm] = useState<AddKeyToDIDForm>()
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const { handleSetInstructions } = useContext(NewProposalContext)
  const shouldBeGoverned = index !== 0 && governance

  const schema = useMemo(() => yup.object().shape(SchemaComponents), [])

  const getInstruction = useCallback(async (): Promise<UiInstruction> => {
    const isValid = await validateInstruction({ schema, form, setFormErrors })
    let serializedInstructions: string[] = ['']

    if (isValid && form?.governedAccount?.governance?.pubkey && rawConnection) {
      const service = DidSolService.build(DidSolIdentifier.parse(form.did), {
        connection: rawConnection,
        wallet: governedAccountToWallet(form.governedAccount),
      })

      const addKeyIxs = await service
          .addVerificationMethod({
            flags: [BitwiseVerificationMethodFlag.CapabilityInvocation],
            fragment: form.alias,
            keyData: new PublicKey(form.key).toBuffer(),
            methodType: VerificationMethodType.Ed25519VerificationKey2018,
          })
          .withAutomaticAlloc(form.governedAccount.pubkey)
          .instructions()

      serializedInstructions = addKeyIxs.map(serializeInstructionToBase64)
    }

    const [serializedInstruction, ...additionalSerializedInstructions] = serializedInstructions.reverse()

    return {
      serializedInstruction,
      additionalSerializedInstructions,
      isValid,
      governance: form?.governedAccount?.governance,
    }
  }, [form, rawConnection, setFormErrors, schema])

  useEffect(() => {
    handleSetInstructions({ governedAccount: form?.governedAccount?.governance, getInstruction }, index)
  }, [form, getInstruction, handleSetInstructions, index])

  const inputs: InstructionInput[] = [
    governanceInstructionInput(realm, governance || undefined, assetAccounts, shouldBeGoverned),
    instructionInputs.did,
    instructionInputs.key,
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

export default AddKeyToDID
