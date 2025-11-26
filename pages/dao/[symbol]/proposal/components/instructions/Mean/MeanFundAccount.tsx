import Input from '@components/inputs/Input'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { PaymentStreamingAccount } from '@mean-dao/payment-streaming'
import { Governance, ProgramAccount } from '@solana/spl-governance'
import { getMintMinAmountAsDecimal } from '@tools/sdk/units'
import { precision } from '@utils/formatting'
import getMeanFundAccountInstruction from '@utils/instructions/Mean/getMeanFundAccountInstruction'
import { MeanFundAccount } from '@utils/uiTypes/proposalCreationTypes'
import { getMeanFundAccountSchema } from '@utils/validations'
import React, { useContext, useEffect, useState, useCallback } from 'react'
import { NewProposalContext } from '../../../new'
import GovernedAccountSelect from '../../GovernedAccountSelect'
import SelectStreamingAccount from './SelectStreamingAccount'
import { useConnection } from '@solana/wallet-adapter-react'
import type { ConnectionContext, EndpointTypes } from '@utils/connection'

const { connection } = useConnection()

const cluster: EndpointTypes = (process.env.NEXT_PUBLIC_CLUSTER as EndpointTypes) || 'devnet'

const connectionCtx: ConnectionContext = {
    current: connection,
    endpoint: connection.rpcEndpoint ?? '',
    cluster,
}

interface Props {
    index: number
    governance: ProgramAccount<Governance> | null
}

const MeanFundAccountComponent = ({ index, governance }: Props) => {// ✅ replace deprecated hook

    const [form, setForm] = useState<MeanFundAccount>({
        governedTokenAccount: undefined,
        mintInfo: undefined,
        amount: undefined,
        paymentStreamingAccount: undefined,
    })
    const [formErrors, setFormErrors] = useState({})

    const handleSetForm = ({ propertyName, value }, restForm = {}) => {
        setFormErrors({})
        setForm({ ...form, [propertyName]: value, ...restForm })
    }

    const shouldBeGoverned = index !== 0 && !!governance
    const { governedTokenAccountsWithoutNfts } = useGovernanceAssets()

    const schema = getMeanFundAccountSchema({ form })
    const { handleSetInstructions } = useContext(NewProposalContext)

    const getInstruction = useCallback(() => {
        return getMeanFundAccountInstruction({
            connection: connectionCtx,
            form,
            setFormErrors,
            schema,
        })
    }, [form, schema])

    // ✅ fix useEffect dependencies
    useEffect(() => {
        handleSetInstructions(
            {
                governedAccount: form.governedTokenAccount?.governance,
                getInstruction,
            },
            index,
        )
    }, [getInstruction, handleSetInstructions, index, form.governedTokenAccount?.governance])

    // mint info
    const mintMinAmount = form.mintInfo
        ? getMintMinAmountAsDecimal(form.mintInfo)
        : 1
    const currentPrecision = precision(mintMinAmount)

    useEffect(() => {
        setForm((prev) => ({
            ...prev,
            mintInfo: prev.governedTokenAccount?.extensions.mint?.account,
        }))
    }, [form.governedTokenAccount])

    const validateAmountOnBlur = () => {
        const value = form.amount
        handleSetForm({
            value: parseFloat(
                Math.max(mintMinAmount, Math.min(Number.MAX_SAFE_INTEGER, value ?? 0)).toFixed(
                    currentPrecision,
                ),
            ),
            propertyName: 'amount',
        })
    }

    const setAmount = (event: any) => {
        const value = event.target.value
        handleSetForm({
            value,
            propertyName: 'amount',
        })
    }

    const formPaymentStreamingAccount = form.paymentStreamingAccount as
        | PaymentStreamingAccount
        | undefined

    return (
        <>
            <SelectStreamingAccount
                label="Select streaming account destination"
                onChange={(paymentStreamingAccount) => {
                    handleSetForm(
                        { value: paymentStreamingAccount, propertyName: 'paymentStreamingAccount' },
                        { governedTokenAccount: undefined },
                    )
                }}
                value={formPaymentStreamingAccount}
                error={formErrors['paymentStreamingAccount']}
            />
            <GovernedAccountSelect
                label="Select source of funds"
                governedAccounts={governedTokenAccountsWithoutNfts.filter(
                    (a) =>
                        a.extensions.mint?.publicKey.toBase58() === formPaymentStreamingAccount?.mint.toString(),
                )}
                onChange={(value) => handleSetForm({ value, propertyName: 'governedTokenAccount' })}
                value={form.governedTokenAccount}
                error={formErrors['governedTokenAccount']}
                shouldBeGoverned={shouldBeGoverned}
                governance={governance}
                type="token"
            />
            <Input
                min={mintMinAmount}
                max={Number.MAX_SAFE_INTEGER}
                label="Amount"
                value={form.amount}
                type="number"
                onChange={setAmount}
                step={mintMinAmount}
                error={formErrors['amount']}
                onBlur={validateAmountOnBlur}
                inputMode="decimal"
            />
        </>
    )
}

export default MeanFundAccountComponent
