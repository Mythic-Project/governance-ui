import React, { useContext, useEffect, useState, useCallback } from 'react'
import { ProgramAccount, Governance } from '@solana/spl-governance'
import { UiInstruction, DualFinanceAirdropForm } from '@utils/uiTypes/proposalCreationTypes'
import { NewProposalContext } from '../../../new'
import GovernedAccountSelect from '../../GovernedAccountSelect'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import Input from '@components/inputs/Input'
import { getGovernanceAirdropInstruction, getMerkleAirdropInstruction } from '@utils/instructions/Dual/airdrop'
import { getDualFinanceGovernanceAirdropSchema, getDualFinanceMerkleAirdropSchema } from '@utils/validations'
import Tooltip from '@components/Tooltip'
import Select from '@components/inputs/Select'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { useConnection } from '@solana/wallet-adapter-react'
import { Connection } from '@solana/web3.js'
import { EndpointTypes } from '@models/types' // make sure path is correct

interface ConnectionContext {
  current: Connection
  endpoint: string
  cluster: EndpointTypes
}

const DualAirdrop = ({
                       index,
                       governance,
                     }: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const { connection: rawConnection } = useConnection() // MUST be before using it


  const wallet = useWalletOnePointOh()
  const shouldBeGoverned = !!(index !== 0 && governance)
  const { assetAccounts } = useGovernanceAssets()
  const [governedAccount, setGovernedAccount] = useState<ProgramAccount<Governance> | undefined>(undefined)
  const [form, setForm] = useState<DualFinanceAirdropForm>({
    root: '',
    amountPerVoter: 0,
    eligibilityStart: 0,
    eligibilityEnd: 0,
    amount: 0,
    treasury: undefined,
  })
  const [airdropType, setAirdropType] = useState<'Merkle Proof' | 'Governance'>('Merkle Proof')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const { handleSetInstructions } = useContext(NewProposalContext)

  const merkleSchema = getDualFinanceMerkleAirdropSchema({ form })
  const governanceSchema = getDualFinanceGovernanceAirdropSchema({ form })

  const handleSetForm = useCallback(
      ({ propertyName, value }: { propertyName: keyof DualFinanceAirdropForm; value: any }) => {
        setFormErrors({})
        setForm((prev) => ({ ...prev, [propertyName]: value }))
      },
      []
  )

  const getInstruction = useCallback(async (): Promise<UiInstruction> => {
    const connectionContext: ConnectionContext = {
      current: rawConnection,
      endpoint: '',
      cluster: 'mainnet' as EndpointTypes,
    }

    if (airdropType === 'Merkle Proof') {
      return getMerkleAirdropInstruction({
        connection: connectionContext,
        form,
        schema: merkleSchema,
        setFormErrors,
        wallet,
      })
    } else {
      return getGovernanceAirdropInstruction({
        connection: connectionContext,
        form,
        schema: governanceSchema,
        setFormErrors,
        wallet,
      })
    }
  }, [airdropType, form, wallet, merkleSchema, governanceSchema, rawConnection])


  useEffect(() => {
    handleSetInstructions({ governedAccount, getInstruction }, index)
  }, [governedAccount, getInstruction, handleSetInstructions, index])

  useEffect(() => {
    setGovernedAccount(form.treasury?.governance)
  }, [form.treasury])

  return (
      <>
        <Select
            onChange={(value: 'Merkle Proof' | 'Governance') => setAirdropType(value)}
            label="Airdrop Type"
            placeholder="Airdrop Type"
            value={airdropType}
        >
          <Select.Option key="merkleOption" value="Merkle Proof">
            Merkle Proof
          </Select.Option>
          <Select.Option key="governanceOption" value="Governance">
            Governance
          </Select.Option>
        </Select>

        {airdropType === 'Merkle Proof' && (
            <Tooltip content="Merkle root of the airdrop. See airdrop SDK docs.">
              <Input
                  label="Root"
                  value={form.root}
                  type="text"
                  onChange={(evt) => handleSetForm({ value: evt.target.value, propertyName: 'root' })}
                  error={formErrors.root}
              />
            </Tooltip>
        )}

        {airdropType === 'Governance' && (
            <>
              <Input
                  label="Eligibility start unix timestamp"
                  value={form.eligibilityStart}
                  type="number"
                  onChange={(evt) => handleSetForm({ value: evt.target.value, propertyName: 'eligibilityStart' })}
                  error={formErrors.eligibilityStart}
              />
              <Input
                  label="Eligibility end unix timestamp"
                  value={form.eligibilityEnd}
                  type="number"
                  onChange={(evt) => handleSetForm({ value: evt.target.value, propertyName: 'eligibilityEnd' })}
                  error={formErrors.eligibilityEnd}
              />
              <Input
                  label="Amount per voter"
                  value={form.amountPerVoter}
                  type="number"
                  onChange={(evt) => handleSetForm({ value: evt.target.value, propertyName: 'amountPerVoter' })}
                  error={formErrors.amountPerVoter}
              />
            </>
        )}

        <Input
            label="Total number of tokens"
            value={form.amount}
            type="text"
            onChange={(evt) => handleSetForm({ value: evt.target.value, propertyName: 'amount' })}
            error={formErrors.amount}
        />

        <GovernedAccountSelect
            label="Treasury"
            governedAccounts={assetAccounts}
            onChange={(value) => handleSetForm({ value, propertyName: 'treasury' })}
            value={form.treasury}
            error={formErrors.treasury}
            shouldBeGoverned={shouldBeGoverned}
            governance={governance}
            type="token"
        />
      </>
  )
}

export default DualAirdrop
