import React, { useCallback, useContext, useEffect, useState, useMemo } from 'react'
import { ProgramAccount, Governance } from '@solana/spl-governance'
import { UiInstruction, DualFinanceGsoWithdrawForm } from '@utils/uiTypes/proposalCreationTypes'
import { NewProposalContext } from '../../../new'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { getGsoWithdrawInstruction } from '@utils/instructions/Dual'
import { getDualFinanceGsoWithdrawSchema } from '@utils/validations'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { useConnection } from '@solana/wallet-adapter-react'
import Input from '@components/inputs/Input'
import GovernedAccountSelect from '../../GovernedAccountSelect'
import Tooltip from '@components/Tooltip'
import { Connection } from '@solana/web3.js'

interface ConnectionContext {
  current: Connection
  endpoint: string
  cluster: 'mainnet' | 'devnet'
}

const DualGsoWithdraw = ({
                           index,
                           governance,
                         }: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  // ✅ Initialize state to match required imported type
  const [form, setForm] = useState<DualFinanceGsoWithdrawForm>({
    soName: '', // required
    baseTreasury: undefined,
  })

  const { connection: rawConnection } = useConnection()
  const wallet = useWalletOnePointOh()
  const shouldBeGoverned = !!(index !== 0 && governance)
  const { assetAccounts } = useGovernanceAssets()
  const [governedAccount, setGovernedAccount] = useState<ProgramAccount<Governance> | undefined>()
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const { handleSetInstructions } = useContext(NewProposalContext)

  const schema = useMemo(() => getDualFinanceGsoWithdrawSchema(), [])

  const handleSetForm = useCallback(
      ({ propertyName, value }: { propertyName: keyof DualFinanceGsoWithdrawForm; value: any }) => {
        setFormErrors({})
        setForm(prev => ({ ...prev, [propertyName]: value }))
      },
      []
  )

  const getInstruction = useCallback((): Promise<UiInstruction> => {
    const connectionContext: ConnectionContext = {
      current: rawConnection,
      endpoint: '',
      cluster: 'mainnet',
    }
    return getGsoWithdrawInstruction({
      connection: connectionContext,
      form,
      schema,
      setFormErrors,
      wallet,
    })
  }, [rawConnection, form, schema, wallet])

  useEffect(() => {
    handleSetInstructions({ governedAccount, getInstruction }, index)
  }, [governedAccount, getInstruction, handleSetInstructions, index])

  useEffect(() => {
    // ✅ Clear baseTreasury safely
    handleSetForm({ value: undefined, propertyName: 'baseTreasury' })
  }, [form.baseTreasury, handleSetForm])

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
      </>
  )
}

export default DualGsoWithdraw
