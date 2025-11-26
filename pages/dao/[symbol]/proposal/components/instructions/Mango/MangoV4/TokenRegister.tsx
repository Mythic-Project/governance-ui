// PATH: ./pages/dao/[symbol]/proposal/components/instructions/Mango/MangoV4/TokenRegister.tsx
import { useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { PublicKey, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import * as yup from 'yup'
import { BN } from '@coral-xyz/anchor'
import { isFormValid, validatePubkey } from '@utils/formValidation'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'
import { NewProposalContext } from '../../../../new'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { Governance, ProgramAccount, serializeInstructionToBase64 } from '@solana/spl-governance'
import InstructionForm, { InstructionInput } from '../../FormCreator'
import UseMangoV4 from '@hooks/useMangoV4'
import { toNative } from '@blockworks-foundation/mango-v4'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import ForwarderProgram, { useForwarderProgramHelpers } from '@components/ForwarderProgram/ForwarderProgram'
import { REDUCE_ONLY_OPTIONS } from '@utils/Mango/listingTools'
import ProgramSelector from '@components/Mango/ProgramSelector'
import useProgramSelector from '@components/Mango/useProgramSelector'
import { AccountType, AssetAccount } from '@utils/uiTypes/assets'
import { InstructionInputType } from '../../inputInstructionType'

interface TokenRegisterForm {
  governedAccount: AssetAccount | null
  mintPk: string
  oraclePk: string
  fallbackOracle: string
  maxStalenessSlots: string
  oracleConfFilter: number
  name: string
  adjustmentFactor: number
  util0: number
  rate0: number
  util1: number
  rate1: number
  maxRate: number
  loanFeeRate: number
  loanOriginationFeeRate: number
  maintAssetWeight: number
  initAssetWeight: number
  maintLiabWeight: number
  initLiabWeight: number
  liquidationFee: number
  minVaultToDepositsRatio: number
  netBorrowLimitWindowSizeTs: number
  netBorrowLimitPerWindowQuote: number
  tokenIndex: number
  holdupTime: number
  stablePriceDelayIntervalSeconds: number
  stablePriceGrowthLimit: number
  stablePriceDelayGrowthLimit: number
  tokenConditionalSwapTakerFeeRate: number
  tokenConditionalSwapMakerFeeRate: number
  flashLoanSwapFeeRate: number
  reduceOnly: { name: string; value: number }
  borrowWeightScaleStartQuote: number
  depositWeightScaleStartQuote: number
  interestCurveScaling: number
  interestTargetUtilization: number
  depositLimit: number
  insuranceFound: boolean
  zeroUtilRate: number
  platformLiquidationFee: number
  disableAssetLiquidation: boolean
  collateralFeePerDay: number
  tier: string
}

const TokenRegister = ({
                         index,
                         governance,
                       }: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const wallet = useWalletOnePointOh()
  const programSelectorHook = useProgramSelector()
  const { mangoClient, mangoGroup } = UseMangoV4(
      programSelectorHook.program?.val,
      programSelectorHook.program?.group
  )
  const { assetAccounts } = useGovernanceAssets()
  const forwarderProgramHelpers = useForwarderProgramHelpers()
  const { handleSetInstructions } = useContext(NewProposalContext)

  // Filter SOL accounts that match mangoGroup admin
  const solAccounts = useMemo(
      () =>
          assetAccounts.filter(
              (x) =>
                  x.type === AccountType.SOL &&
                  mangoGroup?.admin &&
                  x.extensions.transferAddress?.equals(mangoGroup.admin)
          ),
      [assetAccounts, mangoGroup]
  )

  const shouldBeGoverned = !!(index !== 0 && governance)

  const [form, setForm] = useState<TokenRegisterForm>({
    governedAccount: null,
    mintPk: '',
    oraclePk: '',
    fallbackOracle: '',
    maxStalenessSlots: '',
    oracleConfFilter: 0.1,
    name: '',
    adjustmentFactor: 0.004,
    util0: 0.7,
    rate0: 0.1,
    util1: 0.85,
    rate1: 0.2,
    maxRate: 2.0,
    loanFeeRate: 0.005,
    loanOriginationFeeRate: 0.0005,
    maintAssetWeight: 1,
    initAssetWeight: 1,
    maintLiabWeight: 1,
    initLiabWeight: 1,
    liquidationFee: 0,
    minVaultToDepositsRatio: 0.2,
    netBorrowLimitWindowSizeTs: 24 * 60 * 60,
    netBorrowLimitPerWindowQuote: toNative(1_000_000, 6).toNumber(),
    tokenIndex: 0,
    holdupTime: 0,
    stablePriceDelayIntervalSeconds: 3600,
    stablePriceGrowthLimit: 0.0003,
    stablePriceDelayGrowthLimit: 0.06,
    tokenConditionalSwapTakerFeeRate: 0,
    tokenConditionalSwapMakerFeeRate: 0,
    flashLoanSwapFeeRate: 0,
    reduceOnly: REDUCE_ONLY_OPTIONS[0],
    borrowWeightScaleStartQuote: toNative(10_000, 6).toNumber(),
    depositWeightScaleStartQuote: toNative(10_000, 6).toNumber(),
    depositLimit: 0,
    interestTargetUtilization: 0.5,
    interestCurveScaling: 4,
    insuranceFound: false,
    zeroUtilRate: 0,
    platformLiquidationFee: 0,
    disableAssetLiquidation: false,
    collateralFeePerDay: 0,
    tier: '',
  })

  const [formErrors, setFormErrors] = useState<Record<string, any>>({})

  const schema = useMemo(
      () =>
          yup.object().shape({
            governedAccount: yup.object().nullable().required('Governed account required'),
            oraclePk: yup
                .string()
                .required()
                .test('is-valid-address', 'Invalid PublicKey', (v) => (v ? validatePubkey(v) : true)),
            mintPk: yup
                .string()
                .required()
                .test('is-valid-address', 'Invalid PublicKey', (v) => (v ? validatePubkey(v) : true)),
            name: yup.string().required(),
            tokenIndex: yup.number().required(),
          }),
      []
  )

  const validateInstruction = useCallback(async () => {
    const { isValid, validationErrors } = await isFormValid(schema, form)
    setFormErrors(validationErrors)
    return isValid
  }, [form, schema])

  const getInstruction = useCallback(async (): Promise<UiInstruction> => {
    const isValid = await validateInstruction()
    let serializedInstruction = ''

    if (isValid && form.governedAccount?.governance?.account && wallet?.publicKey) {
      const ix = await mangoClient!.program.methods
          .tokenRegister(
              Number(form.tokenIndex),
              form.name,
              {
                confFilter: Number(form.oracleConfFilter),
                maxStalenessSlots: form.maxStalenessSlots !== '' ? Number(form.maxStalenessSlots) : null,
              },
              {
                adjustmentFactor: Number(form.adjustmentFactor),
                util0: Number(form.util0),
                rate0: Number(form.rate0),
                util1: Number(form.util1),
                rate1: Number(form.rate1),
                maxRate: Number(form.maxRate),
              },
              Number(form.loanFeeRate),
              Number(form.loanOriginationFeeRate),
              Number(form.maintAssetWeight),
              Number(form.initAssetWeight),
              Number(form.maintLiabWeight),
              Number(form.initLiabWeight),
              Number(form.liquidationFee),
              Number(form.stablePriceDelayIntervalSeconds),
              Number(form.stablePriceDelayGrowthLimit),
              Number(form.stablePriceGrowthLimit),
              Number(form.minVaultToDepositsRatio),
              new BN(form.netBorrowLimitWindowSizeTs),
              new BN(form.netBorrowLimitPerWindowQuote),
              Number(form.borrowWeightScaleStartQuote),
              Number(form.depositWeightScaleStartQuote),
              Number(form.reduceOnly.value),
              Number(form.tokenConditionalSwapTakerFeeRate),
              Number(form.tokenConditionalSwapMakerFeeRate),
              Number(form.flashLoanSwapFeeRate),
              Number(form.interestCurveScaling),
              Number(form.interestTargetUtilization),
              form.insuranceFound,
              new BN(form.depositLimit),
              Number(form.zeroUtilRate),
              Number(form.platformLiquidationFee),
              form.disableAssetLiquidation,
              Number(form.collateralFeePerDay),
              form.tier
          )
          .accounts({
            group: mangoGroup!.publicKey,
            admin: form.governedAccount.extensions.transferAddress,
            mint: new PublicKey(form.mintPk),
            oracle: new PublicKey(form.oraclePk),
            payer: form.governedAccount.extensions.transferAddress,
            rent: SYSVAR_RENT_PUBKEY,
            fallbackOracle: new PublicKey(form.fallbackOracle),
          })
          .instruction()

      serializedInstruction = serializeInstructionToBase64(forwarderProgramHelpers.withForwarderWrapper(ix))
    }

    return {
      serializedInstruction,
      isValid,
      chunkBy: 1,
      governance: form.governedAccount?.governance,
      customHoldUpTime: form.holdupTime,
    }
  }, [form, mangoClient, mangoGroup, wallet, forwarderProgramHelpers, validateInstruction])

  useEffect(() => {
    handleSetInstructions({ governedAccount: form.governedAccount?.governance, getInstruction }, index)
  }, [form, getInstruction, handleSetInstructions, index])

  useEffect(() => {
    if (!mangoGroup) return
    const tokenIndex =
        mangoGroup.banksMapByTokenIndex.size === 0
            ? 0
            : Math.max(...mangoGroup.banksMapByTokenIndex.keys()) + 1
    setForm((f) => ({ ...f, tokenIndex }))
  }, [mangoGroup])

  const inputs: InstructionInput[] = [
    {
      label: 'Governed Account',
      name: 'governedAccount',
      type: InstructionInputType.GOVERNED_ACCOUNT,
      initialValue: form.governedAccount,
      shouldBeGoverned,
      governance,
      options: solAccounts,
    },
    {
      label: 'Mint PublicKey',
      name: 'mintPk',
      type: InstructionInputType.INPUT,
      inputType: 'text',
      initialValue: form.mintPk,
    },
    {
      label: 'Oracle PublicKey',
      name: 'oraclePk',
      type: InstructionInputType.INPUT,
      inputType: 'text',
      initialValue: form.oraclePk,
    },
    {
      label: 'Token Name',
      name: 'name',
      type: InstructionInputType.INPUT,
      inputType: 'text',
      initialValue: form.name,
    },
    {
      label: 'Token Index',
      name: 'tokenIndex',
      type: InstructionInputType.INPUT,
      inputType: 'number',
      initialValue: form.tokenIndex,
    },
  ]

  return (
      <>
        <ProgramSelector programSelectorHook={programSelectorHook} />
        <InstructionForm
            outerForm={form}
            setForm={setForm}
            inputs={inputs}
            setFormErrors={setFormErrors}
            formErrors={formErrors}
        />
        <ForwarderProgram {...forwarderProgramHelpers} />
      </>
  )
}

export default TokenRegister
