import { Governance } from '@solana/spl-governance'
import { ProgramAccount } from '@solana/spl-governance'
import {
  TorqueCreateRecurringPaymentForm,
  TorqueDurationUnit,
  TorqueFrequencyUnit,
  TorqueStreamType,
  UiInstruction,
} from '@utils/uiTypes/proposalCreationTypes'
import { NewProposalContext } from '../../../new'
import { useContext, useEffect, useMemo, useState } from 'react'
import * as yup from 'yup'
import { isFormValid, validatePubkey } from '@utils/formValidation'
import { InstructionInputType } from '../inputInstructionType'
import InstructionForm, { InstructionInput } from '../FormCreator'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { parseMintNaturalAmountFromDecimal } from '@tools/sdk/units'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { useTorque } from './useTorque'
import { StreamedRewardCadenceType } from '@torque-labs/sdk'

interface CreateRecurringPaymentProps {
  index: number
  governance: ProgramAccount<Governance> | null
}

// Helper function to convert time units to days
const convertToSeconds = (value: number, unit: TorqueDurationUnit): number => {
  switch (unit) {
    case 'hours':
      return value * 3600
    case 'days':
      return value * 24 * 3600
    case 'weeks':
      return value * 7 * 24 * 3600
    case 'months':
      return value * 30 * 24 * 3600 // Approximate
    case 'years':
      return value * 365 * 24 * 3600 // Approximate
    default:
      return 0
  }
}

const INTERVAL_OPTIONS: TorqueFrequencyUnit[] = [
  { name: 'Hours', value: 'hours' as TorqueDurationUnit },
  { name: 'Days', value: 'days' as TorqueDurationUnit },
  { name: 'Weeks', value: 'weeks' as TorqueDurationUnit },
  { name: 'Months', value: 'months' as TorqueDurationUnit },
  { name: 'Years', value: 'years' as TorqueDurationUnit },
]

const STREAM_TYPES: TorqueStreamType[] = [
  {
    name: 'Monthly',
    value: 'FIRST_OF_EVERY_MONTH' as StreamedRewardCadenceType,
    description: 'Pays out at the first of every month.',
  },
  {
    name: 'Fixed Interval',
    value: 'FIXED_INTERVAL' as StreamedRewardCadenceType,
    description: 'Pays out at a fixed interval.',
  },
]

function CreateRecurringPayment({
  index,
  governance,
}: CreateRecurringPaymentProps) {
  // State
  const [formErrors, setFormErrors] = useState({})
  const [form, setForm] = useState<TorqueCreateRecurringPaymentForm>({
    governedTokenAccount: undefined,
    tokenAmount: 0,
    streamType: STREAM_TYPES[0],
    paymentFrequency: 0,
    paymentFrequencyUnit: INTERVAL_OPTIONS[0],
    paymentDuration: 0,
    paymentDestination: '',
  })

  // Hooks
  const { fetchDaoProject, createStreamOffer, createStreamDistributor } =
    useTorque()
  const wallet = useWalletOnePointOh()
  const { governedSPLTokenAccounts, governedNativeAccounts } =
    useGovernanceAssets()

  // Contexts
  const { handleSetInstructions } = useContext(NewProposalContext)

  // Consts
  const shouldBeGoverned = !!(index !== 0 && governance)
  const schema = yup.object().shape({
    governedTokenAccount: yup.object().required('Token is required'),
    tokenAmount: yup
      .number()
      .required('Token amount is required')
      .moreThan(0, 'Token amount must be more than 0'),
    streamType: yup.object().required('Stream type is required'),
    paymentDestination: yup
      .string()
      .required('Payment destination is required')
      .test('is-valid-address', 'Please enter a valid PublicKey', (value) =>
        value ? validatePubkey(value) : false,
      ),
    paymentDuration: yup.number().required('Payment duration is required'),
  })

  const { totalPayments, totalAmount } = useMemo(() => {
    if (!form.tokenAmount) {
      return {
        totalPayments: 0,
        totalAmount: 0,
      }
    }

    // Calculate how many payments will be made based on frequency and duration
    const totalPayments = form.paymentDuration

    // Calculate total amount
    return {
      totalPayments,
      totalAmount: form.tokenAmount * totalPayments,
    }
  }, [form.tokenAmount, form.paymentDuration])

  const getInstruction = async () => {
    // Validate form
    const { isValid, validationErrors } = await isFormValid(schema, form)
    setFormErrors(validationErrors)

    if (!isValid) return
    if (!wallet || !wallet.publicKey) return
    if (!form.governedTokenAccount) return

    let tokenMint: string | undefined
    let tokenBalance: number | undefined
    let tokenDecimals: number | undefined
    let payer: string | undefined
    const daoWallet =
      form.governedTokenAccount.governance.account.realm.toBase58()

    if (form.governedTokenAccount.isToken) {
      tokenMint =
        form.governedTokenAccount.extensions.mint?.publicKey.toString()
      tokenBalance = Number(
        form.governedTokenAccount?.extensions.amount?.toString(),
      )
      payer =
        form.governedTokenAccount.extensions.token?.account.owner.toString()
      tokenDecimals =
        form.governedTokenAccount.extensions.mint?.account.decimals
    } else if (form.governedTokenAccount.isSol) {
      tokenBalance = Number(
        form.governedTokenAccount.extensions.amount?.toString(),
      )
      payer = form.governedTokenAccount.pubkey.toString()
      tokenMint = 'So11111111111111111111111111111111111111112'
      tokenDecimals = 9
    }

    // Check if the token details are valid
    if (!tokenMint || !tokenBalance || !payer || !tokenDecimals) {
      return setFormErrors({
        governedTokenAccount: 'Missing details from token account',
      })
    }

    // Check if the dao has enough balance
    if (
      tokenBalance <
      parseMintNaturalAmountFromDecimal(totalAmount, tokenDecimals ?? 0)
    ) {
      return setFormErrors({
        tokenAmount: 'Insufficient balance',
      })
    }

    // If it's a Monthly stream we need to make sure the payment frequency is greater than 1
    // if(form.streamType.value === 'FIRST_OF_EVERY_MONTH' && (!form.paymentFrequency || form.paymentFrequency <= 1)) {
    //   return setFormErrors({
    //     paymentFrequency: 'Payment frequency must be greater than 1',
    //   })
    // }

    const interval =
      form.streamType.value === 'FIXED_INTERVAL'
        ? convertToSeconds(
            form.paymentFrequency ?? 0,
            form.paymentFrequencyUnit?.value ?? 'days',
          )
        : 0

    const project = await fetchDaoProject(daoWallet)

    if (!project) return

    const offer = await createStreamOffer(form, project.id)

    console.log('offer', offer)
    const { serializedIx } = await createStreamDistributor({
      offerId: offer.id,
      totalAmount: totalAmount,
      amountPerPayment: form.tokenAmount,
      token: tokenMint,
      decimals: tokenDecimals,
      numberOfPayments: form.paymentDuration,
      streamType: form.streamType,
      paymentInterval: interval,
      startDate: new Date().toISOString(),
      payer: payer,
    })

    const obj: UiInstruction = {
      serializedInstruction: serializedIx,
      isValid,
      governance: form.governedTokenAccount.governance,
    }

    return obj
  }

  useEffect(() => {
    // The part that integrates with the new proposal creation
    handleSetInstructions(
      {
        governedAccount: form.governedTokenAccount?.governance,
        getInstruction,
      },
      index,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  const inputs: InstructionInput[] = useMemo(() => {
    const inputs: InstructionInput[] = [
      {
        label: 'Select Token',
        initialValue: form.governedTokenAccount,
        name: 'governedTokenAccount',
        type: InstructionInputType.GOVERNED_ACCOUNT,
        shouldBeGoverned: shouldBeGoverned,
        governance: governance,
        options: [...governedSPLTokenAccounts, ...governedNativeAccounts],
        assetType: 'token' as const,
      },
      {
        label: 'Payment Amount',
        subtitle: 'Amount to be paid per payment',
        initialValue: form.tokenAmount,
        type: InstructionInputType.INPUT,
        inputType: 'number',
        name: 'tokenAmount',
        additionalComponent: totalAmount ? (
          <p style={{ marginTop: `0px` }}>
            Total amount to be paid out: {totalAmount} over {totalPayments}{' '}
            payments.
          </p>
        ) : null,
      },
      {
        label: 'Payment Destination',
        initialValue: form.paymentDestination,
        type: InstructionInputType.INPUT,
        inputType: 'text',
        name: 'paymentDestination',
      },
      {
        label: 'Stream Type',
        subtitle: STREAM_TYPES.find(
          (type) => type.value === form.streamType.value,
        )?.description,
        initialValue: form.streamType,
        type: InstructionInputType.SELECT,
        name: 'streamType',
        options: STREAM_TYPES,
      },
    ]

    switch (form.streamType.value) {
      case 'FIRST_OF_EVERY_MONTH':
        inputs.push({
          label: 'Payment Duration',
          subtitle: 'How many months to pay out for.',
          initialValue: form.paymentDuration ?? 0,
          type: InstructionInputType.INPUT,
          inputType: 'number',
          name: 'paymentDuration',
          additionalComponent: null,
        })
        break
      case 'FIXED_INTERVAL':
        inputs.push({
          label: 'Payment Duration',
          subtitle: 'How many payments do you want to make?',
          initialValue: form.paymentDuration,
          type: InstructionInputType.INPUT,
          inputType: 'number',
          name: 'paymentDuration',
          additionalComponent: null,
        })
        inputs.push({
          label: 'Payment Interval',
          subtitle: 'How often payments should occur',
          initialValue: form.paymentFrequency,
          type: InstructionInputType.INPUT,
          inputType: 'number',
          name: 'paymentFrequency',
          additionalComponent: null,
        })
        inputs.push({
          label: 'Payment Interval Unit',
          subtitle: 'Unit of time between payments',
          initialValue: form.paymentFrequencyUnit,
          type: InstructionInputType.SELECT,
          name: 'paymentFrequencyUnit',
          options: INTERVAL_OPTIONS,
        })
        break
      default:
        break
    }

    return inputs
  }, [
    form.governedTokenAccount,
    form.tokenAmount,
    form.paymentDestination,
    form.streamType,
    form.paymentDuration,
    form.paymentFrequency,
    form.paymentFrequencyUnit,
    shouldBeGoverned,
    governance,
    governedSPLTokenAccounts,
    governedNativeAccounts,
    totalAmount,
    totalPayments,
  ])
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

export default CreateRecurringPayment
