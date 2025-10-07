// PATH: ./pages/dao/[symbol]/proposal/components/instructions/Mean/MeanWithdrawFromAccount.tsx

import Input from '@components/inputs/Input'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { PaymentStreamingAccount } from '@mean-dao/payment-streaming'
import { Governance, ProgramAccount } from '@solana/spl-governance'
import { getMintMinAmountAsDecimal } from '@tools/sdk/units'
import { precision } from '@utils/formatting'
import getMeanWithdrawFromAccountInstruction from '@utils/instructions/Mean/getMeanWithdrawFromAccountInstruction'
import getMint from '@utils/instructions/Mean/getMint'
import { MeanWithdrawFromAccount } from '@utils/uiTypes/proposalCreationTypes'
import { getMeanWithdrawFromAccountSchema } from '@utils/validations'
import React, { useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { NewProposalContext } from '../../../new'
import SelectStreamingAccount from './SelectStreamingAccount'
import { useConnection } from '@solana/wallet-adapter-react'
import type { ConnectionContext, EndpointTypes } from '@utils/connection'

interface Props {
  index: number
  governance: ProgramAccount<Governance> | null
}

const clusterEnv: EndpointTypes = (process.env.NEXT_PUBLIC_CLUSTER as EndpointTypes) || 'devnet'

const MeanWithdrawFromAccountComponent = ({ index, governance }: Props) => {

  // wrap connection in proper ConnectionContext
  const connectionCtx = useMemo<ConnectionContext>(() => {
    const { connection } = useConnection()
    return {
      current: connection,
      endpoint: connection.rpcEndpoint ?? '',
      cluster: clusterEnv,
    }
  }, [])

  const [form, setForm] = useState<MeanWithdrawFromAccount>({
    governedTokenAccount: undefined,
    mintInfo: undefined,
    amount: undefined,
    paymentStreamingAccount: undefined,
    destination: undefined,
  })

  const [formErrors, setFormErrors] = useState({})

  const handleSetForm = ({ propertyName, value }, restForm = {}) => {
    setFormErrors({})
    setForm({ ...form, [propertyName]: value, ...restForm })
  }

  const { governedTokenAccountsWithoutNfts } = useGovernanceAssets()
  const governedTokenAccountsJson = useMemo(() => JSON.stringify(governedTokenAccountsWithoutNfts), [
    governedTokenAccountsWithoutNfts,
  ])

  const schema = getMeanWithdrawFromAccountSchema({ form, connection: connectionCtx, mintInfo: form.mintInfo })
  const { handleSetInstructions } = useContext(NewProposalContext)

  const getInstruction = useCallback(() => {
    return getMeanWithdrawFromAccountInstruction({
      connection: connectionCtx,
      form,
      setFormErrors,
      schema,
    })
  }, [connectionCtx, form, schema])

  useEffect(() => {
    handleSetInstructions(
        {
          governedAccount: form.governedTokenAccount?.governance,
          getInstruction,
        },
        index,
    )
  }, [form, getInstruction, handleSetInstructions, index])

  // payment streaming account selection
  const shouldBeGoverned = index !== 0 && !!governance
  const formPaymentStreamingAccount = form.paymentStreamingAccount as PaymentStreamingAccount | undefined

  useEffect(() => {
    const value =
        formPaymentStreamingAccount &&
        governedTokenAccountsWithoutNfts.find(
            (acc) =>
                acc.governance.pubkey.toBase58() === formPaymentStreamingAccount.owner.toString() && acc.isSol,
        )
    setForm((prevForm) => ({
      ...prevForm,
      governedTokenAccount: value,
    }))
  }, [governedTokenAccountsJson, formPaymentStreamingAccount, governedTokenAccountsWithoutNfts])

  // mint info
  useEffect(() => {
    setForm((prevForm) => ({
      ...prevForm,
      mintInfo: formPaymentStreamingAccount && getMint(governedTokenAccountsWithoutNfts, formPaymentStreamingAccount),
    }))
  }, [governedTokenAccountsJson, formPaymentStreamingAccount, governedTokenAccountsWithoutNfts])

  const mintMinAmount = form.mintInfo ? getMintMinAmountAsDecimal(form.mintInfo) : 1
  const currentPrecision = precision(mintMinAmount)

  const validateAmountOnBlur = () => {
    const value = form.amount
    handleSetForm({
      value: parseFloat(
          Math.max(mintMinAmount, Math.min(Number.MAX_SAFE_INTEGER, value ?? 0)).toFixed(currentPrecision),
      ),
      propertyName: 'amount',
    })
  }

  const setAmount = (event: { target: { value: any } }) => {
    handleSetForm({
      value: event.target.value,
      propertyName: 'amount',
    })
  }

  return (
      <>
        <SelectStreamingAccount
            label="Select streaming account source"
            onChange={(paymentStreamingAccount) =>
                handleSetForm({ value: paymentStreamingAccount, propertyName: 'paymentStreamingAccount' })
            }
            value={formPaymentStreamingAccount}
            error={formErrors['paymentStreamingAccount']}
            shouldBeGoverned={shouldBeGoverned}
            governance={governance}
        />
        <Input
            label="Destination account"
            value={form.destination}
            type="text"
            onChange={(evt) =>
                handleSetForm({ value: evt.target.value.trim(), propertyName: 'destination' })
            }
            error={formErrors['destination']}
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

export default MeanWithdrawFromAccountComponent
