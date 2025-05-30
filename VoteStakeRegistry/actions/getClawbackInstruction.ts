import { PublicKey } from '@solana/web3.js'

import { getRegistrarPDA, getVoterPDA } from 'VoteStakeRegistry/sdk/accounts'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { VsrClient } from 'VoteStakeRegistry/sdk/client'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token-new'
import { CUSTOM_BIO_VSR_PLUGIN_PK } from '@constants/plugins'

export const getClawbackInstruction = async ({
  realmPk,
  realmAuthority,
  voterWalletAddress,
  destination,
  voterDepositIndex,
  grantMintPk,
  realmCommunityMintPk,
  client,
}: {
  realmPk: PublicKey
  realmAuthority: PublicKey
  voterWalletAddress: PublicKey
  destination: PublicKey
  voterDepositIndex: number
  grantMintPk: PublicKey
  realmCommunityMintPk: PublicKey
  client?: VsrClient
}) => {
  const clientProgramId = client!.program.programId

  const { registrar } = getRegistrarPDA(
    realmPk,
    realmCommunityMintPk,
    clientProgramId,
  )
  const { voter } = getVoterPDA(registrar, voterWalletAddress, clientProgramId)

  const tokenProgram = client?.program.programId.toBase58() === CUSTOM_BIO_VSR_PLUGIN_PK ?
    TOKEN_2022_PROGRAM_ID :
    TOKEN_PROGRAM_ID

  const voterATAPk = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    tokenProgram,
    grantMintPk,
    voter,
    true,
  )

  const clawbackIx = await client?.program.methods
    .clawback(voterDepositIndex)
    .accounts({
      registrar,
      realmAuthority,
      voter,
      vault: voterATAPk,
      destination,
      tokenProgram,
    })
    .instruction()

  if (tokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
    clawbackIx?.keys.splice(4, 0, {
      pubkey: grantMintPk,
      isWritable: false,
      isSigner: false,
    })
  }
  
  return clawbackIx
}
