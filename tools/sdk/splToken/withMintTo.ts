import { Token, TOKEN_PROGRAM_ID, u64 } from '@solana/spl-token'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token-new'
import { PublicKey, TransactionInstruction } from '@solana/web3.js'

/**
 * Adds a MintTo instruction to a transaction.
 * Supports both legacy SPL Token and Token-2022 program.
 */
export const withMintTo = async (
    instructions: TransactionInstruction[],
    mintPk: PublicKey,
    destinationPk: PublicKey,
    mintAuthorityPk: PublicKey,
    amount: number | u64,
    useToken2022 = false,
) => {
    const programId = useToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID

    instructions.push(
        Token.createMintToInstruction(
            programId,
            mintPk,
            destinationPk,
            mintAuthorityPk,
            [],
            amount,
        ),
    )
}
