import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { LockupType } from 'VoteStakeRegistry/sdk/accounts'
import { withCreateNewDeposit } from './withCreateNewDeposit'
import { VsrClient } from './client'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token-new'
import { CUSTOM_BIO_VSR_PLUGIN_PK } from '@constants/plugins'

export const withVoteRegistryDeposit = async ({
  instructions,
  walletPk,
  fromPk,
  mintPk,
  realmPk,
  programId,
  programVersion,
  amount,
  tokenOwnerRecordPk,
  lockUpPeriodInDays,
  lockupKind,
  communityMintPk,
  client,
}: {
  instructions: TransactionInstruction[]
  walletPk: PublicKey
  //from where we deposit our founds
  fromPk: PublicKey
  mintPk: PublicKey
  realmPk: PublicKey
  programId: PublicKey
  programVersion: number
  amount: BN
  communityMintPk: PublicKey
  tokenOwnerRecordPk: PublicKey | null
  lockUpPeriodInDays: number
  lockupKind: LockupType
  client?: VsrClient
}) => {
  if (!client) {
    throw 'no vote registry plugin'
  }

  const { depositIdx, voter, registrar, voterATAPk, tokenProgram } =
    await withCreateNewDeposit({
      instructions,
      walletPk,
      mintPk,
      realmPk,
      programId,
      programVersion,
      tokenOwnerRecordPk,
      lockUpPeriodInDays,
      lockupKind,
      communityMintPk,
      client,
    })
  const depositInstruction = await client?.program.methods
    .deposit(depositIdx, amount)
    .accounts({
      registrar: registrar,
      voter: voter,
      vault: voterATAPk,
      depositToken: fromPk,
      depositAuthority: walletPk,
      tokenProgram,
    })
    .instruction()

  if (client.program.programId.toBase58() === CUSTOM_BIO_VSR_PLUGIN_PK) {
    depositInstruction.keys.splice(3, 0, {
      pubkey: mintPk,
      isSigner: false,
      isWritable: false,
    })
  }

  instructions.push(depositInstruction)
}
