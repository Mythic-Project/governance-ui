import React, { useContext, useEffect, useMemo, useState } from 'react'
import Input from '@components/inputs/Input'
import useRealm from '@hooks/useRealm'
import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import {
  AddCouncilMembersForm,
  UiInstruction,
} from '@utils/uiTypes/proposalCreationTypes'
import { NewProposalContext } from '../../new'
import { getAddCouncilMembersSchema } from '@utils/validations'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { serializeInstructionToBase64 } from '@solana/spl-governance'
import {validateInstruction} from '@utils/instructionTools'
import TextareaProps from '@components/inputs/Textarea'
import {withDepositGoverningTokens} from "@realms-today/spl-governance"
import { BN } from 'bn.js'
import useGoverningTokenMint from '@hooks/selectedRealm/useGoverningTokenMint'
import GovernedAccountSelect from '../GovernedAccountSelect'
import { useLegacyVoterWeight } from '@hooks/queries/governancePower'

const AddCouncilMembers = ({
  index,
}: {
  index: number
}) => {
  const { realmInfo } = useRealm()
  const communityMint = useGoverningTokenMint("community")
  const { result: ownVoterWeight } = useLegacyVoterWeight()
  const {assetAccounts} = useGovernanceAssets()

  const mintAssetAccount = useMemo(() => (
    communityMint ? 
      assetAccounts.find(account => account.pubkey.equals(communityMint)) :
      undefined
  ), [assetAccounts, communityMint])

  const [form, setForm] = useState<AddCouncilMembersForm>({
    governedTokenAccount: undefined,
    amount: undefined,
    memberAddresses: [],
    mintInfo: undefined
  })
  const [formErrors, setFormErrors] = useState({})
 
  const { handleSetInstructions } = useContext(NewProposalContext)

  const handleSetForm = ({ propertyName, value }) => {
    setFormErrors({})
    setForm({ ...form, [propertyName]: value })
  }
  const setMintInfo = (value) => {
    setForm({ ...form, mintInfo: value })
  }
  const setAmount = (event) => {
    const value = event.target.value
    handleSetForm({
      value: value,
      propertyName: 'amount',
    })
  }
  
  function handleAddressChange(value: string) {
    const addresses = value.split(",").map(a => a.trim())
    handleSetForm({
      value: addresses,
      propertyName: 'memberAddresses'
    })
  }

  async function getInstruction(): Promise<UiInstruction> {
    const isValid = await validateInstruction({ schema, form, setFormErrors })

    let serializedInstruction = ''
    const additionalInstructions: string[] = []

    if (form.amount && isValid && realmInfo && form.mintInfo && mintAssetAccount) {
      for (const member of form.memberAddresses) {
        const instructions: TransactionInstruction[] = []
        const amount = new BN(form.amount).mul(new BN(10**form.mintInfo.decimals))

        await withDepositGoverningTokens(
          instructions, 
          realmInfo.programId, 
          realmInfo.programVersion,
          realmInfo.realmId,
          mintAssetAccount.pubkey, 
          mintAssetAccount.pubkey,
          new PublicKey(member), 
          form.mintInfo.mintAuthority!,
          new PublicKey(member),
          amount
        )
        
        if (serializedInstruction) {
          additionalInstructions.push(serializeInstructionToBase64(instructions[0]))
        } else {
          serializedInstruction = serializeInstructionToBase64(instructions[0])
        }
      }
    }

    const obj = {
      serializedInstruction,
      additionalSerializedInstructions: additionalInstructions.length ? additionalInstructions : undefined,
      isValid,
      governance: form.governedTokenAccount?.governance,
      chunkBy: 1
    }

    return obj
  }
  
  useEffect(() => {
    handleSetInstructions(
      { governedAccount: form.governedTokenAccount?.governance, getInstruction },
      index
    )
  }, [form])

  useEffect(() => {
    setMintInfo(mintAssetAccount?.extensions.mint?.account)
  }, [mintAssetAccount])
  
  const schema = getAddCouncilMembersSchema()

  return (
    <>
     <GovernedAccountSelect
        label="Select Governance"
        governedAccounts={assetAccounts.filter((x) =>
          ownVoterWeight?.canCreateProposal(x.governance.account.config)
        )}
        onChange={(value) => {
          handleSetForm({ value, propertyName: 'governedTokenAccount' })
        }}
        value={form.governedTokenAccount}
        error={formErrors['governedTokenAccount']}
      ></GovernedAccountSelect>
      <TextareaProps 
        label="Member Addresses (separated by a comma)"
        value={form.memberAddresses}
        type="textarea"
        onChange={(evt) => handleAddressChange(evt.target.value)}
        error={formErrors['memberAddresses']}
        className='h-28'
      />

      <Input
        min={0}
        label="Amount of Tokens to each member"
        value={form.amount}
        type="number"
        onChange={setAmount}
        error={formErrors['amount']}
      />
    </>
  )
}

export default AddCouncilMembers
