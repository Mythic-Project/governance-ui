import React, { useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { ProgramAccount, Governance } from '@solana/spl-governance'
import { UiInstruction, DualFinanceInitStrikeForm } from '@utils/uiTypes/proposalCreationTypes'
import { NewProposalContext } from '../../../new'
import GovernedAccountSelect from '../../GovernedAccountSelect'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import Input from '@components/inputs/Input'
import { getInitStrikeInstruction } from '@utils/instructions/Dual'
import { getDualFinanceInitStrikeSchema } from '@utils/validations'
import Tooltip from '@components/Tooltip'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { useConnection } from '@solana/wallet-adapter-react'

const InitStrike = ({
                        index,
                        governance,
                    }: {
    index: number
    governance: ProgramAccount<Governance> | null
}) => {
    const [form, setForm] = useState<DualFinanceInitStrikeForm>({
        payer: undefined,
        baseTreasury: undefined,
        soName: '',
        strikes: '',
    })

    const { connection: rawConnection } = useConnection()
    const wallet = useWalletOnePointOh()
    const shouldBeGoverned = !!(index !== 0 && governance)
    const { assetAccounts } = useGovernanceAssets()
    const [governedAccount, setGovernedAccount] = useState<ProgramAccount<Governance> | undefined>()
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})
    const { handleSetInstructions } = useContext(NewProposalContext)

    // Memoize schema
    const schema = useMemo(() => getDualFinanceInitStrikeSchema(), [])

    // Stable form setter
    const handleSetForm = useCallback(
        ({ propertyName, value }: { propertyName: keyof DualFinanceInitStrikeForm; value: any }) => {
            setFormErrors({})
            setForm(prev => ({ ...prev, [propertyName]: value }))
        },
        []
    )

    // Wrap connection in expected ConnectionContext
    const connectionContext = useMemo(
        () => ({
            current: rawConnection,
            endpoint: '', // optional RPC
            cluster: 'mainnet' as 'mainnet' | 'devnet',
        }),
        [rawConnection]
    )

    // Instruction callback
    const getInstruction = useCallback((): Promise<UiInstruction> => {
        return getInitStrikeInstruction({
            connection: connectionContext,
            form,
            schema,
            setFormErrors,
            wallet,
        })
    }, [connectionContext, form, schema, wallet])

    // Register instruction with proposal
    useEffect(() => {
        handleSetInstructions({ governedAccount, getInstruction }, index)
    }, [governedAccount, getInstruction, handleSetInstructions, index])

    // Update governed account when baseTreasury changes
    useEffect(() => {
        setGovernedAccount(form.baseTreasury?.governance)
    }, [form.baseTreasury])

    return (
        <>
            <Input
                label="SO Name"
                value={form.soName}
                type="text"
                onChange={(evt) => handleSetForm({ value: evt.target.value, propertyName: 'soName' })}
                error={formErrors.soName}
            />

            <Tooltip content="Strike prices for the staking option. Units are quote atoms per lot. Comma separated string">
                <Input
                    label="Strikes"
                    value={form.strikes}
                    type="text"
                    onChange={(evt) => handleSetForm({ value: evt.target.value, propertyName: 'strikes' })}
                    error={formErrors.strikes}
                />
            </Tooltip>

            <Tooltip content="Needed for computing the Staking Option Address in addition to the SO Name.">
                <GovernedAccountSelect
                    label="Base Treasury"
                    governedAccounts={assetAccounts}
                    onChange={(value) => handleSetForm({ value, propertyName: 'baseTreasury' })}
                    value={form.baseTreasury}
                    error={formErrors.baseTreasury}
                    governance={governance}
                    type="token"
                />
            </Tooltip>

            <Tooltip content="Rent payer">
                <GovernedAccountSelect
                    label="Payer Account"
                    governedAccounts={assetAccounts.filter(
                        (x) =>
                            x.isSol &&
                            form.baseTreasury?.governance &&
                            x.governance.pubkey.equals(form.baseTreasury.governance.pubkey)
                    )}
                    onChange={(value) => handleSetForm({ value, propertyName: 'payer' })}
                    value={form.payer}
                    error={formErrors.payer}
                    shouldBeGoverned={shouldBeGoverned}
                    governance={governance}
                />
            </Tooltip>
        </>
    )
}

export default InitStrike
