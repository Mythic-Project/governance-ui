import { SequenceType } from "@blockworks-foundation/mangolana/lib/globalTypes"
import { BN, Program } from "@coral-xyz/anchor"
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token-new"
import { WalletContextState } from "@solana/wallet-adapter-react"
import { Connection, PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY, TransactionInstruction } from "@solana/web3.js"
import { sendTransactionsV3, txBatchesToInstructionSetWithSigners } from "@utils/sendTransactions"
import { TokenVoter } from "BonkVotePlugin/token-type"
import { tokenRegistrarKey, tokenVoterKey, tokenVwrKey } from "BonkVotePlugin/utils"
import { SplGovernance } from "governance-idl-sdk"

async function addTokensHandler(
    connection: Connection,
    wallet: WalletContextState,
    ixClient: SplGovernance,
    realmAccount: PublicKey,
    tokenMint: PublicKey,
    depositMint: PublicKey,
    tokenAccount: PublicKey,
    userAccount: PublicKey,
    amount: BN,
    tokenVoterClient?: Program<TokenVoter> | undefined
) {
  const ixs: TransactionInstruction[] = []

  // Plugin Deposit
  if (tokenVoterClient) {
    const tokenOwnerRecordKey = ixClient.pda.tokenOwnerRecordAccount({
      realmAccount, governingTokenMintAccount: tokenMint, governingTokenOwner: userAccount
    }).publicKey

    const tokenOwnerRecord = await connection.getAccountInfo(tokenOwnerRecordKey)

    if (!tokenOwnerRecord) {
      const createTokenOwnerRecordIx = await ixClient.createTokenOwnerRecordInstruction(
        realmAccount, userAccount, tokenMint, userAccount
      )
      ixs.push(createTokenOwnerRecordIx)
    }

    const registrarKey = tokenRegistrarKey(realmAccount, tokenMint, tokenVoterClient.programId)
    const [voterKey] = tokenVoterKey(realmAccount, tokenMint, userAccount, tokenVoterClient.programId)
    const [tokenVwr] = tokenVwrKey(realmAccount, tokenMint, userAccount, tokenVoterClient.programId)
    const vault = getAssociatedTokenAddressSync(depositMint, voterKey, true, TOKEN_2022_PROGRAM_ID)

    try {
      await tokenVoterClient.account.voter.fetch(voterKey)
    } catch {
      const createVoterIx = await tokenVoterClient.methods.createVoterWeightRecord()
      .accounts({
        registrar: registrarKey,
        voter: voterKey,
        voterWeightRecord: tokenVwr,
        voterAuthority: userAccount,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY
      }).instruction()
  
      ixs.push(createVoterIx)
    }

    let depositEntryIndex = 0

    const depositIx = await tokenVoterClient.methods.deposit(
      depositEntryIndex, 
      amount
    ).accounts({
      mint: depositMint,
      tokenOwnerRecord: tokenOwnerRecordKey,
      depositAuthority: wallet.publicKey ?? undefined,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      registrar: registrarKey,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      voter: voterKey,
      vault,
      voterWeightRecord: tokenVwr,
      depositToken: tokenAccount,
    }).instruction()
    
    ixs.push(depositIx)
  } else {
    const vanillaDepositIx = await ixClient.depositGoverningTokensInstruction(
      realmAccount,
      tokenMint,
      tokenAccount,
      userAccount,
      userAccount,
      userAccount,
      amount,
    )

    ixs.push(vanillaDepositIx)
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

export default addTokensHandler