import { useContext, useEffect, useState } from 'react'
import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js'
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
import { Market, UiWrapper } from '@cks-systems/manifest-sdk'
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token-new'
import { getVaultAddress } from '@cks-systems/manifest-sdk/dist/cjs/utils'
import {
  createCancelOrderInstruction,
  createSettleFundsInstruction,
} from '@cks-systems/manifest-sdk/dist/cjs/ui_wrapper/instructions'
import { UiOpenOrder } from '@utils/uiTypes/manifest'
import tokenPriceService from '@utils/services/tokenPrice'
import { abbreviateAddress } from '@utils/formatting'

const MANIFEST_PROGRAM_ID = new PublicKey(
  'MNFSTqtC93rEfYHB6hF82sKdZpUDFWkViLByLd1k1Ms',
)

const FEE_WALLET = new PublicKey('4GbrVmMPYyWaHsfRw7ZRnKzb98McuPovGqr27zmpNbhh')

interface CancelLimitOrderForm {
  governedAccount: AssetAccount | null
  openOrder: { name: string; value: string } | null
}

const CancelLimitOrder = ({
  index,
  governance,
}: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const wallet = useWalletOnePointOh()
  const connection = useLegacyConnectionContext()

  const { assetAccounts } = useGovernanceAssets()
  const [openOrders, setOpenOrders] = useState<UiOpenOrder[]>([])
  const [openOrdersList, setOpenOrdersList] = useState<
    { name: string; value: string }[]
  >([])

  const shouldBeGoverned = !!(index !== 0 && governance)
  const [form, setForm] = useState<CancelLimitOrderForm>({
    governedAccount: null,
    openOrder: null,
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
      const order = openOrders.find(
        (x) => x.clientOrderId.toString() === form.openOrder?.value,
      )
      const isBid = order?.isBid

      const owner = form.governedAccount.isSol
        ? form.governedAccount.extensions.transferAddress!
        : form.governedAccount.extensions.token!.account.owner!

      const wrapper = await UiWrapper.fetchFirstUserWrapper(
        connection.current,
        owner,
      )
      const market = await Market.loadFromAddress({
        connection: connection.current,
        address: new PublicKey(order!.market),
      })
      const quoteMint = market.quoteMint()
      const baseMint = market.baseMint()
      const wrapperPk = wrapper!.pubkey

      const needToCreateWSolAcc =
        baseMint.equals(WRAPPED_SOL_MINT) || quoteMint.equals(WRAPPED_SOL_MINT)

      const traderTokenAccountBase = getAssociatedTokenAddressSync(
        baseMint,
        owner,
        true,
        TOKEN_PROGRAM_ID,
      )
      const traderTokenAccountQuote = getAssociatedTokenAddressSync(
        quoteMint,
        owner,
        true,
        TOKEN_PROGRAM_ID,
      )
      const platformAta = getAssociatedTokenAddressSync(
        quoteMint,
        FEE_WALLET,
        true,
        TOKEN_PROGRAM_ID,
      )

      const [platformAtaAccount, baseAtaAccount, quoteAtaAccount] =
        await Promise.all([
          connection.current.getAccountInfo(platformAta),
          connection.current.getAccountInfo(traderTokenAccountBase),
          connection.current.getAccountInfo(traderTokenAccountQuote),
        ])

      const doesPlatformAtaExists =
        platformAtaAccount && platformAtaAccount?.lamports > 0
      const doesTheBaseAtaExisits =
        baseAtaAccount && baseAtaAccount?.lamports > 0
      const doesTheQuoteAtaExisits =
        quoteAtaAccount && quoteAtaAccount?.lamports > 0

      if (!doesPlatformAtaExists) {
        const platformAtaCreateIx =
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey!,
            platformAta,
            FEE_WALLET,
            quoteMint,
            TOKEN_PROGRAM_ID,
          )
        prerequisiteInstructions.push(platformAtaCreateIx)
      }
      if (!doesTheQuoteAtaExisits) {
        const quoteAtaCreateIx =
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey!,
            traderTokenAccountQuote,
            owner,
            quoteMint,
            TOKEN_PROGRAM_ID,
          )
        prerequisiteInstructions.push(quoteAtaCreateIx)
      }
      if (!doesTheBaseAtaExisits) {
        const baseAtaCreateIx =
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey!,
            traderTokenAccountBase,
            owner,
            baseMint,
            TOKEN_PROGRAM_ID,
          )
        prerequisiteInstructions.push(baseAtaCreateIx)
      }

      const mint = isBid ? quoteMint : baseMint
      const cancelOrderIx: TransactionInstruction =
        createCancelOrderInstruction(
          {
            wrapperState: wrapperPk,
            owner: owner,
            traderTokenAccount: getAssociatedTokenAddressSync(
              mint,
              owner,
              true,
            ),
            market: market.address,
            vault: getVaultAddress(market.address, mint),
            mint: mint,
            systemProgram: SYSTEM_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            manifestProgram: MANIFEST_PROGRAM_ID,
          },
          {
            params: { clientOrderId: order!.clientOrderId },
          },
        )

      ixes.push({
        serializedInstruction: serializeInstructionToBase64({
          ...cancelOrderIx,
          keys: cancelOrderIx.keys.map((x, idx) => {
            if (idx === 1) {
              return {
                ...x,
                isWritable: true,
              }
            }
            return x
          }),
        }),
        holdUpTime: 0,
      })

      const settleOrderIx: TransactionInstruction =
        createSettleFundsInstruction(
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
            platformTokenAccount: platformAta,
          },
          {
            params: { feeMantissa: 10 ** 9 * 0.0001, platformFeePercent: 100 },
          },
        )
      ixes.push({
        serializedInstruction: serializeInstructionToBase64({
          ...settleOrderIx,
          keys: settleOrderIx.keys.map((x, idx) => {
            if (idx === 1) {
              return {
                ...x,
                isWritable: true,
              }
            }
            return x
          }),
        }),
        holdUpTime: 0,
      })

      if (needToCreateWSolAcc) {
        const wsolAta = getAssociatedTokenAddressSync(
          WRAPPED_SOL_MINT,
          owner,
          true,
        )
        const solTransferIx = createCloseAccountInstruction(
          wsolAta,
          owner,
          owner,
        )
        ixes.push({
          serializedInstruction: serializeInstructionToBase64(solTransferIx),
          holdUpTime: 0,
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
    const getWrapperOrders = async () => {
      const owner = form.governedAccount!.isSol
        ? form.governedAccount!.extensions.transferAddress!
        : form.governedAccount!.extensions.token!.account.owner!
      const wrapperAcc = await UiWrapper.fetchFirstUserWrapper(
        connection.current,
        owner,
      )
      if (!wrapperAcc) {
        return null
      }
      const wrapper = UiWrapper.loadFromBuffer({
        address: wrapperAcc.pubkey,
        buffer: wrapperAcc.account.data,
      })

      const allMarketPks = wrapper.activeMarkets()

      const allMarketInfos =
        await connection.current.getMultipleAccountsInfo(allMarketPks)
      const allMarkets = allMarketPks.map((address, i) =>
        Market.loadFromBuffer({ address, buffer: allMarketInfos[i]!.data }),
      )

      const openOrders = allMarkets.flatMap((m) => {
        const openOrdersForMarket = wrapper.openOrdersForMarket(m.address)!

        return m
          .openOrders()
          .filter((x) => x.trader.equals(owner))
          .map((oo) => ({
            ...oo,
            baseMint: m.baseMint(),
            quoteMint: m.quoteMint(),
            market: m.address,
            ...(openOrdersForMarket.find(
              (ooForMarket) =>
                ooForMarket.orderSequenceNumber.toString() ===
                oo.sequenceNumber.toString(),
            ) || {}),
          })) as UiOpenOrder[]
      })

      setOpenOrders(openOrders)
      setOpenOrdersList(
        openOrders.map((x) => {
          const baseInfo = tokenPriceService.getTokenInfo(x.baseMint.toBase58())
          const quoteInfo = tokenPriceService.getTokenInfo(
            x.quoteMint.toBase58(),
          )
          return {
            name: `${
              baseInfo?.symbol || abbreviateAddress(new PublicKey(x.baseMint))
            }/${
              quoteInfo?.symbol || abbreviateAddress(new PublicKey(x.quoteMint))
            } - ${x.isBid ? 'Buy' : 'Sell'} ${tokenPriceService.getTokenInfo(
              x.baseMint.toBase58(),
            )?.symbol} amount: ${x.numBaseTokens.toString()} price: ${
              x.tokenPrice
            }`,
            value: x.clientOrderId.toString(),
          }
        }),
      )
    }
    if (connection && form.governedAccount) {
      getWrapperOrders()
    }
  }, [connection, form.governedAccount])

  useEffect(() => {
    handleSetInstructions(
      { governedAccount: form.governedAccount?.governance, getInstruction },
      index,
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
      label: 'Governance',
      initialValue: form.governedAccount,
      name: 'governedAccount',
      type: InstructionInputType.GOVERNED_ACCOUNT,
      shouldBeGoverned: shouldBeGoverned as any,
      governance: governance,
      options: assetAccounts.filter((x) => x.isSol),
      assetType: 'token',
    },
    {
      label: 'Open Order',
      initialValue: form.openOrder,
      name: 'openOrder',
      type: InstructionInputType.SELECT,
      options: openOrdersList,
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

export default CancelLimitOrder
