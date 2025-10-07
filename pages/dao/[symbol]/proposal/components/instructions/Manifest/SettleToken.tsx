// PATH: ./components/Instructions/SettleToken.tsx
import { useContext, useEffect, useState, useCallback } from 'react'
import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js'
import * as yup from 'yup'
import { isFormValid } from '@utils/formValidation'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { Governance, ProgramAccount, serializeInstructionToBase64 } from '@solana/spl-governance'
import { AssetAccount } from '@utils/uiTypes/assets'
import InstructionForm from '../FormCreator'
import { InstructionInputType } from '../inputInstructionType'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { Market, UiWrapper } from '@cks-systems/manifest-sdk'
import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js'
import { getVaultAddress } from '@cks-systems/manifest-sdk/dist/cjs/utils'
import { createSettleFundsInstruction } from '@cks-systems/manifest-sdk/dist/cjs/ui_wrapper/instructions'
import { useConnection } from '@solana/wallet-adapter-react'
import { NewProposalContext } from '../../../../../../../context'
import {
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token-new"; // ✅ Import context from separate file

const MANIFEST_PROGRAM_ID = new PublicKey('MNFSTqtC93rEfYHB6hF82sKdZpUDFWkViLByLd1k1Ms')
const FEE_WALLET = new PublicKey('4GbrVmMPYyWaHsfRw7ZRnKzb98McuPovGqr27zmpNbhh')

interface CancelLimitOrderForm {
  governedAccount: AssetAccount | null
  unsettled: { name: string; value: string } | null
}

const schema = yup.object().shape({
  governedAccount: yup.object().nullable().required('Program governed account is required'),
})

const SettleToken = ({
                       index,
                       governance,
                     }: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const wallet = useWalletOnePointOh()
  const { connection } = useConnection()
  const { assetAccounts } = useGovernanceAssets()

  // ✅ Get context safely
  const context = useContext(NewProposalContext)
  const handleSetInstructions = context?.handleSetInstructions

  const [unsettledList] = useState<{ name: string; value: string }[]>([])
  const shouldBeGoverned = !!(index !== 0 && governance)
  const [form, setForm] = useState<CancelLimitOrderForm>({ governedAccount: null, unsettled: null })
  const [formErrors, setFormErrors] = useState<any>({})

  const validateInstruction = useCallback(async (): Promise<boolean> => {
    const { isValid, validationErrors } = await isFormValid(schema, form)
    setFormErrors(validationErrors)
    return isValid
  }, [form])

  const getInstruction = useCallback(async (): Promise<UiInstruction> => {
    const isValid = await validateInstruction()
    const ixes: { serializedInstruction: string; holdUpTime: number }[] = []
    const signers: Keypair[] = []
    const prerequisiteInstructions: TransactionInstruction[] = []

    if (!isValid || !wallet?.publicKey || !form.governedAccount?.governance?.account || !form.unsettled || !connection) {
      return {
        serializedInstruction: '',
        additionalSerializedInstructions: [],
        prerequisiteInstructions,
        prerequisiteInstructionsSigners: signers,
        isValid: false,
        governance: form.governedAccount?.governance ?? undefined,
        customHoldUpTime: 0,
        chunkBy: 1,
      }
    }

    const owner = form.governedAccount.isSol
        ? form.governedAccount.extensions.transferAddress!
        : form.governedAccount.extensions.token!.account.owner!

    const wrapperAcc = await UiWrapper.fetchFirstUserWrapper(connection as any, owner)
    if (!wrapperAcc) throw new Error('Wrapper account not found')

    const market = await Market.loadFromAddress({
      connection: connection as any,
      address: new PublicKey(form.unsettled.value),
    })

    const mintBase = market.baseMint()
    const mintQuote = market.quoteMint()
    const wrapperPk = wrapperAcc.pubkey
    const needToCreateWSolAcc = mintBase.equals(WRAPPED_SOL_MINT) || mintQuote.equals(WRAPPED_SOL_MINT)

    const traderTokenAccountBase = await getAssociatedTokenAddress(mintBase, owner, true, TOKEN_2022_PROGRAM_ID)
    const traderTokenAccountQuote = await getAssociatedTokenAddress(mintQuote, owner, true, TOKEN_2022_PROGRAM_ID)
    const platformAta = await getAssociatedTokenAddress(mintQuote, FEE_WALLET, true, TOKEN_2022_PROGRAM_ID)

    const settleOrderIx = createSettleFundsInstruction(
        {
          wrapperState: wrapperPk,
          owner,
          market: market.address,
          manifestProgram: MANIFEST_PROGRAM_ID,
          traderTokenAccountBase,
          traderTokenAccountQuote,
          vaultBase: getVaultAddress(market.address, mintBase),
          vaultQuote: getVaultAddress(market.address, mintQuote),
          mintBase,
          mintQuote,
          tokenProgramBase: TOKEN_2022_PROGRAM_ID,
          tokenProgramQuote: TOKEN_2022_PROGRAM_ID,
          platformTokenAccount: platformAta,
        },
        { params: { feeMantissa: 10 ** 9 * 0.0001, platformFeePercent: 100 } }
    )

    ixes.push({ serializedInstruction: serializeInstructionToBase64(settleOrderIx), holdUpTime: 0 })

    if (needToCreateWSolAcc) {
      const wsolAta = getAssociatedTokenAddressSync(WRAPPED_SOL_MINT, owner, true, TOKEN_2022_PROGRAM_ID)
      const solTransferIx = createCloseAccountInstruction(wsolAta, owner, owner)
      ixes.push({ serializedInstruction: serializeInstructionToBase64(solTransferIx), holdUpTime: 0 })
    }

    return {
      serializedInstruction: '',
      additionalSerializedInstructions: ixes,
      prerequisiteInstructions,
      prerequisiteInstructionsSigners: signers,
      isValid,
      governance: form.governedAccount?.governance ?? undefined,
      customHoldUpTime: 0,
      chunkBy: 1,
    }
  }, [form, wallet, connection, validateInstruction])

  useEffect(() => {
    if (typeof handleSetInstructions === 'function') {
      handleSetInstructions({ governedAccount: form.governedAccount?.governance ?? null, getInstruction },  getInstruction)
    }
  }, [form, getInstruction, handleSetInstructions, index])

  return (
      <InstructionForm
          outerForm={form}
          setForm={setForm}
          inputs={[
            {
              label: 'Governance',
              initialValue: form.governedAccount,
              name: 'governedAccount',
              type: InstructionInputType.GOVERNED_ACCOUNT,
              shouldBeGoverned,
              governance,
              options: assetAccounts.filter((x) => x.isSol),
              assetType: 'token',
            },
            {
              label: 'Unsettled',
              initialValue: form.unsettled,
              name: 'unsettled',
              type: InstructionInputType.SELECT,
              options: unsettledList,
            },
          ]}
          setFormErrors={setFormErrors}
          formErrors={formErrors}
      />
  )
}

export default SettleToken
