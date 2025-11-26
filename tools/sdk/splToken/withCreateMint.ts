// PATH: governance/tools/sdk/splToken/withMintTo.ts

import {Token, TOKEN_PROGRAM_ID, u64} from '@solana/spl-token'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token-new'
import { PublicKey, TransactionInstruction } from '@solana/web3.js'



/**
 * Adds a MintTo instruction to a transaction.
 * Supports both legacy SPL Token and Token-2022.
 *
 * @param instructions     Array of tx instructions to append to
 * @param mintPk           Mint address
 * @param destinationPk    Destination token account
 * @param mintAuthorityPk  Mint authority
 * @param amount           Amount to mint
 * @param useToken2022     If true, will use TOKEN_2022_PROGRAM_ID instead of TOKEN_PROGRAM_ID
 */
// @ts-ignore: unused export
/* eslint-disable @typescript-eslint/no-unused-vars */
export const withMintTo = async (
    instructions: TransactionInstruction[],
    mintPk: PublicKey,
    destinationPk: PublicKey,
    mintAuthorityPk: PublicKey,
    amount: number | u64,
    useToken2022 = false, // <-- new param
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
/* eslint-enable @typescript-eslint/no-unused-vars */
