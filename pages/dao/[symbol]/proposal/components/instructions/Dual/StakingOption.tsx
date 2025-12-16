import React, { useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { ProgramAccount, Governance } from '@solana/spl-governance'
import { UiInstruction, DualFinanceStakingOptionForm } from '@utils/uiTypes/proposalCreationTypes'
import { NewProposalContext } from '../../../new'
import GovernedAccountSelect from '../../GovernedAccountSelect'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import Input from '@components/inputs/Input'
import { getConfigInstruction } from '@utils/instructions/Dual'
import { getDualFinanceStakingOptionSchema } from '@utils/validations'
import Tooltip from '@components/Tooltip'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { useConnection } from '@solana/wallet-adapter-react'
import { getTreasuryAccountItemInfoV2Async } from '@utils/treasuryTools'
import { AssetAccount } from '@utils/uiTypes/assets'

interface MintMetadata {
    logo: string
    name: string
    symbol: string
    displayPrice: string
    decimals: number
}

const StakingOption = ({
                           index,
                           governance,
                       }: {
    index: number
    governance: ProgramAccount<Governance> | null
}) => {
    const [form, setForm] = useState<DualFinanceStakingOptionForm>({
        soName: undefined,
        optionExpirationUnixSeconds: 0,
        numTokens: '0',
        lotSize: 1,
        baseTreasury: undefined,
        quoteTreasury: undefined,
        payer: undefined,
        userPk: undefined,
        strike: 0,
    })

    const { connection: rawConnection } = useConnection()
    const wallet = useWalletOnePointOh()
    const { assetAccounts } = useGovernanceAssets()
    const [governedAccount, setGovernedAccount] = useState<ProgramAccount<Governance> | undefined>()
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})
    const [, setBaseMetadata] = useState<MintMetadata>()
    const [, setQuoteMetadata] = useState<MintMetadata>()
    const { handleSetInstructions } = useContext(NewProposalContext)

    const schema = useMemo(() => getDualFinanceStakingOptionSchema({ form, connection: rawConnection }), [
        form,
        rawConnection,
    ])

    const handleSetForm = useCallback(
        ({ propertyName, value }: { propertyName: keyof DualFinanceStakingOptionForm; value: any }) => {
            setFormErrors({})
            setForm((prev) => ({ ...prev, [propertyName]: value }))
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
        return getConfigInstruction({
            connection: connectionContext,
            form,
            schema,
            setFormErrors,
            wallet,
        })
    }, [connectionContext, form, schema, wallet])

    // Handle instructions
    useEffect(() => {
        handleSetInstructions({ governedAccount, getInstruction }, index)
    }, [governedAccount, getInstruction, handleSetInstructions, index])

    // Fetch base/quote metadata whenever treasury changes
    const fetchAssetMetadata = useCallback(
        async (asset: AssetAccount | undefined, base: boolean) => {
            if (!asset || !asset.extensions.mint) return base ? setBaseMetadata(undefined) : setQuoteMetadata(undefined)
            const info = await getTreasuryAccountItemInfoV2Async(asset)
            const metadata: MintMetadata = {
                logo: info.logo,
                name: info.name,
                symbol: info.symbol,
                displayPrice: info.displayPrice,
                decimals: asset.extensions.mint.account.decimals,
            }
            base ? setBaseMetadata(metadata) : setQuoteMetadata(metadata)
        },
        []
    )

    useEffect(() => {
        (async () => {
            await fetchAssetMetadata(form.baseTreasury, true)
            await fetchAssetMetadata(form.quoteTreasury, false)
            setGovernedAccount(form.baseTreasury?.governance)
        })()
    }, [form.baseTreasury, form.quoteTreasury, fetchAssetMetadata])



    return (
        <>
            <Tooltip content="Custom name to identify the Staking Option">
                <Input
                    label="Name"
                    value={form.soName}
                    type="text"
                    onChange={(evt) => handleSetForm({ value: evt.target.value, propertyName: 'soName' })}
                    error={formErrors.soName}
                />
            </Tooltip>

            <Tooltip content="Treasury providing the assets">
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

            <Tooltip content="Treasury receiving payment for exercise">
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

            {/* Other inputs: numTokens, expiration, strike, lotSize, payer, userPk */}
            {/* Render base/quote metadata if available */}
        </>
    )
}

export default StakingOption
