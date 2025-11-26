import React, { useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { ProgramAccount, Governance } from '@solana/spl-governance'
import { UiInstruction, DualFinanceWithdrawForm } from '@utils/uiTypes/proposalCreationTypes'
import { NewProposalContext } from '../../../new'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { getWithdrawInstruction } from '@utils/instructions/Dual'
import { getDualFinanceWithdrawSchema } from '@utils/validations'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { useConnection } from '@solana/wallet-adapter-react'
import Input from '@components/inputs/Input'
import GovernedAccountSelect from '../../GovernedAccountSelect'
import Tooltip from '@components/Tooltip'

const DualWithdraw = ({
                        index,
                        governance,
                      }: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const [form, setForm] = useState<DualFinanceWithdrawForm>({
    soName: '', // required field
    baseTreasury: undefined,
    mintPk: undefined,
  })

  const { connection: rawConnection } = useConnection()
  const wallet = useWalletOnePointOh()
  const shouldBeGoverned = !!(index !== 0 && governance)
  const { assetAccounts } = useGovernanceAssets()
  const [governedAccount, setGovernedAccount] = useState<ProgramAccount<Governance> | undefined>()
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const { handleSetInstructions } = useContext(NewProposalContext)

  // Memoize schema to avoid recreating it every render
  const schema = useMemo(() => getDualFinanceWithdrawSchema(), [])

  // Stable form setter using functional update
  const handleSetForm = useCallback(
      ({ propertyName, value }: { propertyName: keyof DualFinanceWithdrawForm; value: any }) => {
        setFormErrors({})
        setForm(prev => ({ ...prev, [propertyName]: value }))
      },
      []
  )

  const getInstruction = useCallback((): Promise<UiInstruction> => {
    const connectionContext = {
      current: rawConnection,
      endpoint: '', // optional
      cluster: 'mainnet' as 'mainnet' | 'devnet',
    }

    return getWithdrawInstruction({
      connection: connectionContext,
      form,
      schema,
      setFormErrors,
      wallet,
    })
  }, [rawConnection, form, schema, wallet])

  // Set instructions for proposal
  useEffect(() => {
    handleSetInstructions({ governedAccount, getInstruction }, index)
  }, [governedAccount, getInstruction, handleSetInstructions, index])

  // Clear mintPk when baseTreasury changes
  useEffect(() => {
    handleSetForm({ value: undefined, propertyName: 'mintPk' })
  }, [form.baseTreasury, handleSetForm])

  // Update governed account when treasury changes
  useEffect(() => {
    setGovernedAccount(form.baseTreasury?.governance)
  }, [form.baseTreasury])

  return (
      <>
        <Tooltip content="Identifier for the Staking Option">
          <Input
              label="Name"
              value={form.soName}
              type="text"
              onChange={(evt) => handleSetForm({ value: evt.target.value, propertyName: 'soName' })}
              error={formErrors.soName}
          />
        </Tooltip>

        <Tooltip content="Treasury owned account receiving the tokens back.">
          <GovernedAccountSelect
              label="Base Treasury"
              governedAccounts={assetAccounts}
              onChange={(value) => handleSetForm({ value, propertyName: 'baseTreasury' })}
              value={form.baseTreasury}
              error={formErrors.baseTreasury}
              shouldBeGoverned={shouldBeGoverned}
              governance={governance}
              type="token"
          />
        </Tooltip>

        {form.baseTreasury?.isSol && (
            <Input
                label="Mint"
                value={form.mintPk}
                type="text"
                onChange={(evt) => handleSetForm({ value: evt.target.value, propertyName: 'mintPk' })}
                error={formErrors.mintPk}
            />
        )}
      </>
  )
}

export default DualWithdraw
