import { WSOL_MINT, WSOL_MINT_PK } from '@components/instructions/tools'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
} from '@solana/spl-token-new'
import { getFeeEstimate } from '@tools/feeEstimate'
import { createComputeBudgetIx } from '@blockworks-foundation/mango-v4'

export const AUTOBAHN_PROGRAM_ID = new PublicKey(
  'AutobNFLMzX1rFCDgwWpwr3ztG5c1oDbSrGq7Jj2LgE',
)
export const REALMS_TODAY_ATA = new PublicKey(
  '6bUaUqnkEoCKFkRrbT89vkeBSY9w4EE29WHtj56y49EN',
)
export function createChargeFeeIx(
  payer: PublicKey,
  payerAta: PublicKey,
  platformFeeAta: PublicKey,
  feeAmount: number,
  platformFeePct: number,
  splittedFeeAta?: PublicKey,
) {
  const keys = [
    {
      pubkey: TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: payerAta,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: platformFeeAta,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: payer,
      isWritable: false,
      isSigner: true,
    },
  ]

  if (splittedFeeAta) {
    keys.push({
      pubkey: splittedFeeAta,
      isWritable: true,
      isSigner: false,
    })
  }

  return new TransactionInstruction({
    keys,
    programId: AUTOBAHN_PROGRAM_ID,
    data: buildFeeIxData(feeAmount, platformFeePct),
  })
}

function buildFeeIxData(feeAmount: number, platformFeePct: number): Buffer {
  const instruction = 4

  // Buffer allocation for the resulting byte array
  // 1 byte for instruction, 8 bytes for feeAmount (u64), 1 byte for platform_fee_pct (u8)
  const buffer = Buffer.alloc(1 + 8 + 1)

  let offset = 0

  // Add the instruction as a u8
  buffer.writeUInt8(instruction, offset)
  offset += 1

  // Add the fee amount as a little-endian u64
  buffer.writeBigUInt64LE(BigInt(Math.round(feeAmount)), offset)
  offset += 8

  // Add the platform fee percentage as a u8
  buffer.writeUInt8(platformFeePct, offset)

  return buffer
}

export const chargeFee = async (
  payer: PublicKey,
  fee: number,
  connection: Connection,
) => {
  const txFee = await getFeeEstimate(connection)
  const instructions: TransactionInstruction[] = []
  const feeMint = WSOL_MINT_PK
  const payerAta = getAssociatedTokenAddressSync(feeMint, payer)

  const createPayerAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    payer,
    payerAta,
    payer,
    feeMint,
  )
  const solTransferIx = SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: payerAta,
    lamports: fee,
  })
  const syncNative = createSyncNativeInstruction(payerAta)
  const close = createCloseAccountInstruction(payerAta, payer, payer)
  instructions.push(
    createComputeBudgetIx(txFee),
    ComputeBudgetProgram.setComputeUnitLimit({ units: 80000 }),
    createPayerAtaIx,
    solTransferIx,
    syncNative,
    createChargeFeeIx(payer, payerAta, REALMS_TODAY_ATA, fee, 100),
    close,
  )
  return instructions
}

export const PROPOSAL_FEE = 500000
export const VOTE_FEE = 100000
