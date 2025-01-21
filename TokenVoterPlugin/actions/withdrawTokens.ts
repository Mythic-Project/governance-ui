import { BN, Program } from "@coral-xyz/anchor"
import { PublicKey } from "@metaplex-foundation/js"
import { TOKEN_2022_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token-new"
import { WalletContextState } from "@solana/wallet-adapter-react"
import { Connection, TransactionInstruction } from "@solana/web3.js"
import { SequenceType, sendTransactionsV3, txBatchesToInstructionSetWithSigners } from "@utils/sendTransactions"
import { TokenVoter } from "BonkVotePlugin/token-type"
import { tokenRegistrarKey, tokenVoterKey, tokenVwrKey } from "BonkVotePlugin/utils"
import { SplGovernance, TokenOwnerRecord } from "governance-idl-sdk"

export async function withdrawTokensHandler(
  connection: Connection,
  wallet: WalletContextState,
  govClient: SplGovernance,
  realmAccount: PublicKey,
  tokenMint: PublicKey,
  depositMint: PublicKey,
  userAccount: PublicKey,
  amount: BN,
  tokenOwnerRecord: TokenOwnerRecord,
  tokenVoterClient?: Program<TokenVoter> | undefined,
) {
    const ixs: TransactionInstruction[] = []

    if (tokenOwnerRecord.outstandingProposalCount > 0) {
      throw new Error("The user has the outstanding proposals. Can't withdraw the tokens.")
    }

    const userAta = getAssociatedTokenAddressSync(depositMint, userAccount, undefined, TOKEN_2022_PROGRAM_ID)
    const doesUserAtaExist = await connection.getAccountInfo(userAta)

    if (!doesUserAtaExist) {
      const createAtaIx = createAssociatedTokenAccountInstruction(
        userAccount,
        userAta,
        userAccount,
        depositMint,
        TOKEN_2022_PROGRAM_ID
      )

      ixs.push(createAtaIx)
    }

    if (tokenVoterClient) {
      const registrarKey = tokenRegistrarKey(realmAccount, tokenMint, tokenVoterClient.programId)
      const [voterKey] = tokenVoterKey(realmAccount, tokenMint, userAccount, tokenVoterClient.programId)
      const [tokenVwr] = tokenVwrKey(realmAccount, tokenMint, userAccount, tokenVoterClient.programId)
      const vault = getAssociatedTokenAddressSync(depositMint, voterKey, true, TOKEN_2022_PROGRAM_ID)

      const withdawIx = await tokenVoterClient.methods.withdraw(
        0, 
        amount
      ).accounts({
        registrar: registrarKey,
        voter: voterKey,
        voterAuthority: userAccount,
        tokenOwnerRecord: tokenOwnerRecord.publicKey,
        mint: depositMint,
        voterWeightRecord: tokenVwr,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        vault,
        destination: userAta
      })
      .instruction()

      ixs.push(withdawIx)
    }

    await sendTransactionsV3({
      connection,
      wallet,
      transactionInstructions: [{
        instructionsSet: txBatchesToInstructionSetWithSigners(ixs, []),
        sequenceType: SequenceType.Sequential
      }]
    })
}