/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { useContext, useEffect, useState } from 'react'
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js'
import * as yup from 'yup'
import { isFormValid, validatePubkey } from '@utils/formValidation'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'
import { NewProposalContext } from '../../../new'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { Governance, SYSTEM_PROGRAM_ID } from '@solana/spl-governance'
import { ProgramAccount } from '@solana/spl-governance'
import { serializeInstructionToBase64 } from '@solana/spl-governance'
import { AssetAccount } from '@utils/uiTypes/assets'
import InstructionForm, { InstructionInput } from '../FormCreator'
import { InstructionInputType } from '../inputInstructionType'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { ManifestClient, Market, UiWrapper } from '@cks-systems/manifest-sdk'
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext'
import { useRealmProposalsQuery } from '@hooks/queries/proposal'
import tokenPriceService from '@utils/services/tokenPrice'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token-new'
import { toNative } from '@blockworks-foundation/mango-v4'
import { utils, uiWrapper } from '@cks-systems/manifest-sdk'
import { createCancelOrderInstruction } from '@cks-systems/manifest-sdk/dist/types/src/ui_wrapper'
const { getVaultAddress } = utils
const { createSettleFundsInstruction } = uiWrapper

const MANIFEST_PROGRAM_ID = new PublicKey(
  'MNFSTqtC93rEfYHB6hF82sKdZpUDFWkViLByLd1k1Ms'
)

interface PlaceLimitOrderForm {
  governedAccount: AssetAccount | null
  market: {
    name: string
    value: string
    quote: string
    base: string
  } | null
  amount: string
  price: string
  side: {
    name: string
    value: string
  }
  settlingHoldUp: number
}

const PlaceLimitOrder = ({
  index,
  governance,
}: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const wallet = useWalletOnePointOh()
  const connection = useLegacyConnectionContext()
  const proposals = useRealmProposalsQuery().data
  const { assetAccounts } = useGovernanceAssets()
  const [availableMarkets, setAvailableMarkets] = useState<
    {
      name: string
      value: string
      quote: string
      base: string
    }[]
  >([])
  const sideOptions = [
    {
      name: 'Buy',
      value: 'Buy',
    },
    {
      name: 'Sell',
      value: 'Sell',
    },
  ]
  const shouldBeGoverned = !!(index !== 0 && governance)
  const [form, setForm] = useState<PlaceLimitOrderForm>({
    governedAccount: null,
    market: null,
    amount: '0',
    price: '0',
    side: sideOptions[0],
    settlingHoldUp: 5,
  })
  const [formErrors, setFormErrors] = useState({})
  const { handleSetInstructions } = useContext(NewProposalContext)

  const validateInstruction = async (): Promise<boolean> => {
    const { isValid, validationErrors } = await isFormValid(schema, form)
    setFormErrors(validationErrors)
    return isValid
  }
  async function getInstruction(): Promise<UiInstruction> {
    const isValid = await validateInstruction()
    const ixes: (
      | string
      | {
          serializedInstruction: string
          holdUpTime: number
        }
    )[] = []
    const signers: Keypair[] = []
    const prerequisiteInstructions: TransactionInstruction[] = []
    if (
      isValid &&
      form.governedAccount?.governance?.account &&
      wallet?.publicKey
    ) {
      const orderId = Date.now()
      const isBid = form.side.value === 'Buy'
      const owner = form.governedAccount.extensions.token!.account.owner
      const wrapper = await UiWrapper.fetchFirstUserWrapper(
        connection.current,
        owner
      )
      const market = await Market.loadFromAddress({
        connection: connection.current,
        address: new PublicKey(form.market!.value),
      })
      const quoteMint = market.quoteMint()
      const baseMint = market.baseMint()
      let wrapperPk = wrapper?.pubkey

      const needToCreateWSolAcc = !isBid
        ? baseMint.equals(WRAPPED_SOL_MINT)
        : quoteMint.equals(WRAPPED_SOL_MINT)

      if (needToCreateWSolAcc) {
        const wsolAta = getAssociatedTokenAddressSync(
          WRAPPED_SOL_MINT,
          owner,
          true
        )
        const createPayerAtaIx = createAssociatedTokenAccountIdempotentInstruction(
          owner,
          wsolAta,
          owner,
          WRAPPED_SOL_MINT
        )
        const solTransferIx = SystemProgram.transfer({
          fromPubkey: owner,
          toPubkey: wsolAta,
          lamports: toNative(
            Number(
              !isBid ? form.amount : Number(form.amount) * Number(form.price)
            ),
            9
          ).toNumber(),
        })

        const syncNative = createSyncNativeInstruction(wsolAta)
        ixes.push(
          serializeInstructionToBase64(createPayerAtaIx),
          serializeInstructionToBase64(solTransferIx),
          serializeInstructionToBase64(syncNative)
        )
      }

      if (!wrapperPk) {
        const setup = await UiWrapper.setupIxs(
          connection.current,
          owner,
          wallet.publicKey
        )
        wrapperPk = setup.signers[0].publicKey

        prerequisiteInstructions.push(...setup.ixs)
        signers.push(
          ...setup.signers.map((x) => Keypair.fromSecretKey(x.secretKey))
        )
      }
      const placeIx = await UiWrapper['placeIx_'](
        market,
        {
          wrapper: wrapperPk!,
          owner,
          payer: owner,
          baseTokenProgram: TOKEN_PROGRAM_ID,
          quoteTokenProgram: TOKEN_PROGRAM_ID,
        },
        {
          isBid: isBid,
          amount: Number(form.amount),
          price: Number(form.price),
          orderId: orderId,
        }
      )
      ixes.push(...placeIx.ixs.map((x) => serializeInstructionToBase64(x)))

      const traderTokenAccountBase = getAssociatedTokenAddressSync(
        baseMint,
        owner,
        true,
        TOKEN_PROGRAM_ID
      )
      const traderTokenAccountQuote = getAssociatedTokenAddressSync(
        quoteMint,
        owner,
        true,
        TOKEN_PROGRAM_ID
      )

      const [baseAtaAccount, quoteAtaAccount] = await Promise.all([
        connection.current.getAccountInfo(traderTokenAccountBase),
        connection.current.getAccountInfo(traderTokenAccountQuote),
      ])

      const doesTheBaseAtaExisits =
        baseAtaAccount && baseAtaAccount?.lamports > 0
      const doesTheQuoteAtaExisits =
        quoteAtaAccount && quoteAtaAccount?.lamports > 0

      if (!doesTheQuoteAtaExisits) {
        const quoteAtaCreateIx = createAssociatedTokenAccountInstruction(
          owner,
          traderTokenAccountQuote,
          owner,
          quoteMint,
          TOKEN_PROGRAM_ID
        )
        ixes.push({
          serializedInstruction: serializeInstructionToBase64(quoteAtaCreateIx),
          holdUpTime: form.settlingHoldUp,
        })
      }
      if (!doesTheBaseAtaExisits) {
        const baseAtaCreateIx = createAssociatedTokenAccountInstruction(
          owner,
          traderTokenAccountBase,
          owner,
          baseMint,
          TOKEN_PROGRAM_ID
        )
        ixes.push({
          serializedInstruction: serializeInstructionToBase64(baseAtaCreateIx),
          holdUpTime: form.settlingHoldUp,
        })
      }

      const mint = isBid ? quoteMint : baseMint
      const cancelOrderIx: TransactionInstruction = createCancelOrderInstruction(
        {
          wrapperState: wrapperPk,
          owner: owner,
          traderTokenAccount: getAssociatedTokenAddressSync(mint, owner, true),
          market: market.address,
          vault: getVaultAddress(market.address, mint),
          mint: mint,
          systemProgram: SYSTEM_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          manifestProgram: MANIFEST_PROGRAM_ID,
        },
        {
          params: { clientOrderId: orderId },
        }
      )
      ixes.push({
        serializedInstruction: serializeInstructionToBase64(cancelOrderIx),
        holdUpTime: form.settlingHoldUp,
      })

      const settleOrderIx: TransactionInstruction = createSettleFundsInstruction(
        {
          wrapperState: wrapperPk,
          owner: owner,
          market: market.address,
          manifestProgram: MANIFEST_PROGRAM_ID,
          traderTokenAccountBase: traderTokenAccountBase,
          traderTokenAccountQuote: traderTokenAccountQuote,
          vaultBase: getVaultAddress(market.address, baseMint),
          vaultQuote: getVaultAddress(market.address, quoteMint),
          mintBase: baseMint,
          mintQuote: quoteMint,
          tokenProgramBase: TOKEN_PROGRAM_ID,
          tokenProgramQuote: TOKEN_PROGRAM_ID,
          platformTokenAccount: traderTokenAccountQuote,
        },
        {
          params: { feeMantissa: 10 ** 9 * 0.0001, platformFeePercent: 100 },
        }
      )
      ixes.push({
        serializedInstruction: serializeInstructionToBase64(settleOrderIx),
        holdUpTime: form.settlingHoldUp,
      })

      if (needToCreateWSolAcc) {
        const wsolAta = getAssociatedTokenAddressSync(
          WRAPPED_SOL_MINT,
          owner,
          true
        )
        const solTransferIx = createCloseAccountInstruction(
          wsolAta,
          owner,
          owner
        )
        ixes.push({
          serializedInstruction: serializeInstructionToBase64(solTransferIx),
          holdUpTime: form.settlingHoldUp,
        })
      }
    }
    const obj: UiInstruction = {
      serializedInstruction: '',
      additionalSerializedInstructions: ixes,
      prerequisiteInstructions: prerequisiteInstructions,
      prerequisiteInstructionsSigners: signers,
      isValid,
      governance: form.governedAccount?.governance,
      customHoldUpTime: 0,
      chunkBy: 1,
    }
    return obj
  }

  useEffect(() => {
    const getMarkets = async () => {
      const marketAccounts = await ManifestClient.getMarketProgramAccounts(
        connection.current
      )

      const markets = marketAccounts
        .map((x) =>
          Market.loadFromBuffer({
            address: x.pubkey,
            buffer: x.account.data,
          })
        )
        .sort((a, b) => Number(b.quoteVolume()) - Number(a.quoteVolume()))
        .map((x) => ({
          name: `${
            tokenPriceService.getTokenInfo(x.baseMint().toBase58())?.name
          }/${tokenPriceService.getTokenInfo(x.quoteMint().toBase58())?.name}`,
          value: x.address.toBase58(),
          quote: x.quoteMint().toBase58(),
          base: x.baseMint().toBase58(),
        }))

      setAvailableMarkets(markets)
    }
    if (connection && assetAccounts.length) {
      getMarkets()
    }
  }, [connection, assetAccounts])

  useEffect(() => {
    handleSetInstructions(
      { governedAccount: form.governedAccount?.governance, getInstruction },
      index
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO please fix, it can cause difficult bugs. You might wanna check out https://bobbyhadz.com/blog/react-hooks-exhaustive-deps for info. -@asktree
  }, [form])
  const schema = yup.object().shape({
    governedAccount: yup
      .object()
      .nullable()
      .required('Program governed account is required'),
  })
  const inputs: InstructionInput[] = [
    {
      label: 'Market',
      initialValue: form.market,
      name: 'market',
      type: InstructionInputType.SELECT,
      options: availableMarkets,
    },
    {
      label: 'Side',
      initialValue: form.side,
      name: 'side',
      type: InstructionInputType.SELECT,
      options: sideOptions,
    },
    //check quote and base
    //check sell or buy
    //validate if there is available quote or base in treasury
    {
      label: 'Governance',
      initialValue: form.governedAccount,
      name: 'governedAccount',
      type: InstructionInputType.GOVERNED_ACCOUNT,
      shouldBeGoverned: shouldBeGoverned as any,
      governance: governance,
      options: assetAccounts,
      assetType: 'token',
    },
    {
      label: 'Amount',
      initialValue: form.amount,
      name: 'amount',
      type: InstructionInputType.INPUT,
    },
    {
      label: 'Price',
      initialValue: form.price,
      name: 'price',
      type: InstructionInputType.INPUT,
    },
    {
      label: 'Settling instruction holdup (minutes)',
      initialValue: form.settlingHoldUp,
      name: 'settlingHoldUp',
      type: InstructionInputType.INPUT,
    },
  ]

  return (
    <>
      {form && (
        <InstructionForm
          outerForm={form}
          setForm={setForm}
          inputs={inputs}
          setFormErrors={setFormErrors}
          formErrors={formErrors}
        ></InstructionForm>
      )}
    </>
  )
}

export default PlaceLimitOrder
