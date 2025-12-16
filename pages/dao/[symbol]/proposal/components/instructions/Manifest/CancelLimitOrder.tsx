// PATH: ./components/CancelLimitOrder.tsx
import { useState, useCallback } from 'react'
import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js'
import * as yup from 'yup'
import { isFormValid } from '@utils/formValidation'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'
import { Governance, ProgramAccount, serializeInstructionToBase64, SYSTEM_PROGRAM_ID } from '@solana/spl-governance'
import { AssetAccount } from '@utils/uiTypes/assets'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { Market, UiWrapper } from '@cks-systems/manifest-sdk'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js'
import { createAssociatedTokenAccountIdempotentInstruction, createCloseAccountInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token-new'
import { getVaultAddress } from '@cks-systems/manifest-sdk/dist/cjs/utils'
import { createCancelOrderInstruction, createSettleFundsInstruction } from '@cks-systems/manifest-sdk/dist/cjs/ui_wrapper/instructions'
import { UiOpenOrder } from '@utils/uiTypes/manifest'
import { useConnection } from '@solana/wallet-adapter-react'
import tokenPriceService from "services/tokenPriceService"
import BN from "bn.js";

// Form interface
interface CancelLimitOrderForm {
  governedAccount: AssetAccount & { governance?: ProgramAccount<Governance> } | null
  openOrder: { name: string; value: string } | null
}

const MANIFEST_PROGRAM_ID = new PublicKey('MNFSTqtC93rEfYHB6hF82sKdZpUDFWkViLByLd1k1Ms')
const FEE_WALLET = new PublicKey('4GbrVmMPYyWaHsfRw7ZRnKzb98McuPovGqr27zmpNbhh')
const CancelLimitOrder = () => {
  const wallet = useWalletOnePointOh()
  const {connection} = useConnection()
  const [openOrders, setOpenOrders] = useState<UiOpenOrder[]>([])
  const [, setOpenOrdersList] = useState<{ name: string; value: string }[]>([])
  const [form] = useState<CancelLimitOrderForm>({governedAccount: null, openOrder: null})
  const [, setFormErrors] = useState({})
// --- validateInstruction ---
  const validateInstruction = useCallback(async (): Promise<boolean> => {
    const schema = yup.object().shape({
      governedAccount: yup.object().nullable().required('Program governed account is required'),
    })
    const {isValid, validationErrors} = await isFormValid(schema, form)
    setFormErrors(validationErrors)
    return isValid
  }, [form])

  // --- getInstruction ---
  useCallback(async (): Promise<UiInstruction> => {
    if (!wallet?.publicKey || !form.governedAccount) throw new Error('Wallet or governed account missing')
    const isValid = await validateInstruction()
    const ixes: { serializedInstruction: string; holdUpTime: number }[] = []
    const signers: Keypair[] = []
    const prerequisiteInstructions: TransactionInstruction[] = []

    if (!isValid) return {
      serializedInstruction: '',
      additionalSerializedInstructions: ixes,
      prerequisiteInstructions,
      prerequisiteInstructionsSigners: signers,
      isValid,
      governance: undefined,
      customHoldUpTime: 0,
      chunkBy: 1
    }

    const order = openOrders.find(o => o.clientOrderId.toString() === form.openOrder?.value)
    if (!order) throw new Error('Open order not found')

    const isBid = order.isBid
    const owner = form.governedAccount.isSol
        ? form.governedAccount.extensions.transferAddress!
        : form.governedAccount.extensions.token!.account.owner!

    const wrapper = await UiWrapper.fetchFirstUserWrapper(connection, owner)
    if (!wrapper) throw new Error('Wrapper not found')

    const market = await Market.loadFromAddress({connection, address: new PublicKey(order.market)})
    const quoteMint = market.quoteMint()
    const baseMint = market.baseMint()
    const wrapperPk = wrapper.pubkey

    const needToCreateWSolAcc = baseMint.equals(WRAPPED_SOL_MINT) || quoteMint.equals(WRAPPED_SOL_MINT)

    const traderTokenAccountBase = getAssociatedTokenAddressSync(baseMint, owner, true, TOKEN_PROGRAM_ID)
    const traderTokenAccountQuote = getAssociatedTokenAddressSync(quoteMint, owner, true, TOKEN_PROGRAM_ID)
    const platformAta = getAssociatedTokenAddressSync(quoteMint, FEE_WALLET, true, TOKEN_PROGRAM_ID)

    if (!platformAta) {
      prerequisiteInstructions.push(createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, platformAta, FEE_WALLET, quoteMint, TOKEN_PROGRAM_ID))
    }
    if (!traderTokenAccountQuote) {
      prerequisiteInstructions.push(createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, traderTokenAccountQuote, owner, quoteMint, TOKEN_PROGRAM_ID))
    }
    if (!traderTokenAccountBase) {
      prerequisiteInstructions.push(createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, traderTokenAccountBase, owner, baseMint, TOKEN_PROGRAM_ID))
    }

    const mint = isBid ? quoteMint : baseMint

    const cancelOrderIx = createCancelOrderInstruction({
      wrapperState: wrapperPk,
      owner,
      traderTokenAccount: getAssociatedTokenAddressSync(mint, owner, true),
      market: market.address,
      vault: getVaultAddress(market.address, mint),
      mint,
      systemProgram: SYSTEM_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      manifestProgram: MANIFEST_PROGRAM_ID
    }, {params: {clientOrderId: order.clientOrderId}})

    ixes.push({serializedInstruction: serializeInstructionToBase64(cancelOrderIx), holdUpTime: 0})

    const settleOrderIx = createSettleFundsInstruction({
      wrapperState: wrapperPk,
      owner,
      market: market.address,
      manifestProgram: MANIFEST_PROGRAM_ID,
      traderTokenAccountBase,
      traderTokenAccountQuote,
      vaultBase: getVaultAddress(market.address, baseMint),
      vaultQuote: getVaultAddress(market.address, quoteMint),
      mintBase: baseMint,
      mintQuote: quoteMint,
      tokenProgramBase: TOKEN_PROGRAM_ID,
      tokenProgramQuote: TOKEN_PROGRAM_ID,
      platformTokenAccount: platformAta
    }, {params: {feeMantissa: 10 ** 9 * 0.0001, platformFeePercent: 100}})

    ixes.push({serializedInstruction: serializeInstructionToBase64(settleOrderIx), holdUpTime: 0})

    if (needToCreateWSolAcc) {
      const wsolAta = getAssociatedTokenAddressSync(WRAPPED_SOL_MINT, owner, true)
      const solTransferIx = createCloseAccountInstruction(wsolAta, owner, owner)
      ixes.push({serializedInstruction: serializeInstructionToBase64(solTransferIx), holdUpTime: 0})
    }

    return {
      serializedInstruction: '',
      additionalSerializedInstructions: ixes,
      prerequisiteInstructions,
      prerequisiteInstructionsSigners: signers,
      isValid,
      governance: form.governedAccount.governance,
      customHoldUpTime: 0,
      chunkBy: 1
    }
  }, [form, wallet, openOrders, connection, validateInstruction]);
// --- fetchWrapperOrders ---
  useCallback(async (): Promise<UiOpenOrder[]> => {
    if (!form.governedAccount) return [];

    const owner = form.governedAccount.isSol
        ? form.governedAccount.extensions.transferAddress!
        : form.governedAccount.extensions.token!.account.owner!;

    const wrapperAcc = await UiWrapper.fetchFirstUserWrapper(connection, owner);
    if (!wrapperAcc) return [];

    const wrapper = UiWrapper.loadFromBuffer({
      address: wrapperAcc.pubkey,
      buffer: wrapperAcc.account.data,
    });

    const allMarketPks = wrapper.activeMarkets();
    const allMarketInfos = await connection.getMultipleAccountsInfo(allMarketPks);

    const orders: UiOpenOrder[] = allMarketPks.flatMap((addr, i) => {
      const market = Market.loadFromBuffer({ address: addr, buffer: allMarketInfos[i]!.data });
      const openOrdersForMarket = wrapper.openOrdersForMarket(market.address) ?? [];

      return openOrdersForMarket.map((oo) => {
        // oo est UiWrapperOpenOrder, donc pas de sequenceNumber
        const clientOrderId = oo.clientOrderId instanceof BN ? BigInt(oo.clientOrderId.toString()) : BigInt(0);
        const numBaseAtoms = oo.numBaseAtoms instanceof BN ? BigInt(oo.numBaseAtoms.toString()) : BigInt(0);

        return {
          clientOrderId,
          orderSequenceNumber: BigInt(0),
          price: oo.price ?? 0,
          numBaseAtoms,
          dataIndex: oo.dataIndex ?? 0,
          baseMint: market.baseMint(),
          quoteMint: market.quoteMint(),
          market: market.address,
          isBid: oo.isBid ?? true,
          tokenPrice: 0, // juste un fallback
        } as unknown as UiOpenOrder;

      });
    });


    setOpenOrders(orders);

    setOpenOrdersList(
        orders.map((o) => ({
          name: `${o.isBid ? 'BUY' : 'SELL'} ${tokenPriceService.getTokenSymbol(
              o.baseMint.toBase58()
          )}`,
          value: o.clientOrderId.toString(),
        }))
    );

    return orders;
  }, [form.governedAccount, connection]);
}
export default CancelLimitOrder;


