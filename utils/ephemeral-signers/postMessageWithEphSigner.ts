import {
  ChatMessageBody,
  GOVERNANCE_CHAT_SCHEMA,
  PostChatMessageArgs,
  SYSTEM_PROGRAM_ID,
  getRealmConfigAddress,
} from '@solana/spl-governance'
import {
  AccountMeta,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js'
import { serialize } from 'borsh'

export async function withPostChatMessageEphSigner(
  instructions: TransactionInstruction[],
  signers: Keypair[],
  chatProgramId: PublicKey,
  governanceProgramId: PublicKey,
  realm: PublicKey,
  governance: PublicKey,
  proposal: PublicKey,
  tokenOwnerRecord: PublicKey,
  governanceAuthority: PublicKey,
  payer: PublicKey,
  replyTo: PublicKey | undefined,
  body: ChatMessageBody,
  chatMessage: PublicKey,
  voterWeightRecord?: PublicKey,
) {
  const args = new PostChatMessageArgs({
    body,
  })

  const data = Buffer.from(serialize(GOVERNANCE_CHAT_SCHEMA, args))

  const keys = [
    {
      pubkey: governanceProgramId,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: realm,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: governance,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: proposal,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: tokenOwnerRecord,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: governanceAuthority,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: chatMessage,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: payer,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: SYSTEM_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
  ]

  if (replyTo) {
    keys.push({
      pubkey: replyTo,
      isWritable: false,
      isSigner: false,
    })
  }

  await withRealmConfigPluginAccounts(
    keys,
    governanceProgramId,
    realm,
    voterWeightRecord,
  )

  instructions.push(
    new TransactionInstruction({
      keys,
      programId: chatProgramId,
      data,
    }),
  )

  return chatMessage
}

export async function withRealmConfigPluginAccounts(
  keys: AccountMeta[],
  programId: PublicKey,
  realm: PublicKey,
  voterWeightRecord?: PublicKey | undefined,
  maxVoterWeightRecord?: PublicKey | undefined,
) {
  const realmConfigAddress = await getRealmConfigAddress(programId, realm)

  keys.push({
    pubkey: realmConfigAddress,
    isWritable: false,
    isSigner: false,
  })

  if (voterWeightRecord) {
    keys.push({
      pubkey: voterWeightRecord,
      isWritable: false,
      isSigner: false,
    })
  }

  if (maxVoterWeightRecord) {
    keys.push({
      pubkey: maxVoterWeightRecord,
      isWritable: false,
      isSigner: false,
    })
  }
}
