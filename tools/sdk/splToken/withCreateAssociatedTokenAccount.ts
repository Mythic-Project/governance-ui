import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token-new"
import { PublicKey, TransactionInstruction } from '@solana/web3.js'

/**
 * Creates an associated token account for a given owner and mint.
 * Supports both legacy SPL Token and Token-2022 program.
 */
export const withCreateAssociatedTokenAccount = async (
    instructions: TransactionInstruction[],
    mintPk: PublicKey,
    ownerPk: PublicKey,
    payerPk: PublicKey,
    useToken2022 = false,
) => {
  const programId = useToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID

  const ataPk = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      programId,
      mintPk,
      ownerPk,
      true,
  )

  instructions.push(
      Token.createAssociatedTokenAccountInstruction(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          programId,
          mintPk,
          ataPk,
          ownerPk,
          payerPk,
      ),
  )

  return ataPk
}
