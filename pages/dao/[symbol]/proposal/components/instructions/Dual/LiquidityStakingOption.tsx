import React, { useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { ProgramAccount, Governance } from '@solana/spl-governance'
import { UiInstruction, DualFinanceLiquidityStakingOptionForm } from '@utils/uiTypes/proposalCreationTypes'
import { NewProposalContext } from '../../../new'
import GovernedAccountSelect from '../../GovernedAccountSelect'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import Input from '@components/inputs/Input'
import { getConfigLsoInstruction } from '@utils/instructions/Dual'
import { getDualFinanceLiquidityStakingOptionSchema } from '@utils/validations'
import Tooltip from '@components/Tooltip'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { useConnection } from '@solana/wallet-adapter-react'

const LiquidityStakingOption = ({
                                    index,
                                    governance,
                                }: {
    index: number
    governance: ProgramAccount<Governance> | null
}) => {
    const [form, setForm] = useState<DualFinanceLiquidityStakingOptionForm>({
        optionExpirationUnixSeconds: 0,
        numTokens: 0,
        lotSize: 0,
        baseTreasury: undefined,
        quoteTreasury: undefined,
        payer: undefined,
    })

    const { connection: rawConnection } = useConnection()
    const wallet = useWalletOnePointOh()
    const shouldBeGoverned = !!(index !== 0 && governance)
    const { assetAccounts } = useGovernanceAssets()
    const [governedAccount, setGovernedAccount] = useState<ProgramAccount<Governance> | undefined>()
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})
    const { handleSetInstructions } = useContext(NewProposalContext)

    const schema = useMemo(() => getDualFinanceLiquidityStakingOptionSchema({ form }), [form])

    const handleSetForm = useCallback(
        ({ propertyName, value }: { propertyName: keyof DualFinanceLiquidityStakingOptionForm; value: any }) => {
            setFormErrors({})
            setForm(prev => ({ ...prev, [propertyName]: value }))
        },
        []
    )

    const connectionContext = useMemo(
        () => ({
            current: rawConnection,
            endpoint: '',
            cluster: 'mainnet' as 'mainnet' | 'devnet',
        }),
        [rawConnection]
    )

    const getInstruction = useCallback((): Promise<UiInstruction> => {
        return getConfigLsoInstruction({
            connection: connectionContext,
            form,
            schema,
            setFormErrors,
            wallet,
        })
    }, [connectionContext, form, schema, wallet])

    useEffect(() => {
        handleSetInstructions({ governedAccount, getInstruction }, index)
    }, [governedAccount, getInstruction, handleSetInstructions, index])

    useEffect(() => {
        setGovernedAccount(form.baseTreasury?.governance)
    }, [form.baseTreasury])

    return (
        <>
            <Tooltip content="Treasury owned account providing the assets for the option. When the recipient exercises, these are the tokens they receive.">
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

            <Tooltip content="Treasury owned account receiving payment for the option exercise.">
                <GovernedAccountSelect
                    label="Quote Treasury"
                    governedAccounts={assetAccounts}
                    onChange={(value) => handleSetForm({ value, propertyName: 'quoteTreasury' })}
                    value={form.quoteTreasury}
                    error={formErrors.quoteTreasury}
                    governance={governance}
                    type="token"
                />
            </Tooltip>

            <Tooltip content="How many tokens are in the staking options. Units are in atoms of the base token.">
                <Input
                    label="Quantity"
                    value={form.numTokens}
                    type="number"
                    onChange={(evt) => handleSetForm({ value: evt.target.value, propertyName: 'numTokens' })}
                    error={formErrors.numTokens}
                />
            </Tooltip>

            <Tooltip content="Date in unix seconds for option expiration">
                <Input
                    label="Expiration"
                    value={form.optionExpirationUnixSeconds}
                    type="number"
                    onChange={(evt) =>
                        handleSetForm({ value: evt.target.value, propertyName: 'optionExpirationUnixSeconds' })
                    }
                    error={formErrors.optionExpirationUnixSeconds}
                />
            </Tooltip>

            <Tooltip content="Lot size for base atoms. This is the min size of an option.">
                <Input
                    label="Lot Size"
                    value={form.lotSize}
                    type="number"
                    onChange={(evt) => handleSetForm({ value: evt.target.value, propertyName: 'lotSize' })}
                    error={formErrors.lotSize}
                />
            </Tooltip>

            <Tooltip content="Rent payer. Should be the governance wallet with same governance as base treasury">
                <GovernedAccountSelect
                    label="Payer Account"
                    governedAccounts={assetAccounts.filter(
                        (x) => x.isSol && form.baseTreasury?.governance?.pubkey.equals(x.governance.pubkey)
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

export default LiquidityStakingOption
