// PATH: tools/sdk/utils/tokens.tsx
import { Connection, Keypair, PublicKey, TransactionInstruction, Commitment } from '@solana/web3.js'
import { AccountInfo, MintInfo, MintLayout, Token, u64 } from '@solana/spl-token'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token-new'
import { chunks } from './helpers'
import { parseTokenAccountData } from './parseTokenAccountData'
import tokenPriceService from './services/tokenPrice'
import { formatMintNaturalAmountAsDecimal } from '@tools/sdk/units'
import { getAccountName, WSOL_MINT } from '@components/instructions/tools'
import { AssetAccount } from '@utils/uiTypes/assets'
import { BN } from '@coral-xyz/anchor'

export type TokenAccount = AccountInfo & { extensions?: any[], isToken2022?: boolean }
export type MintAccount = MintInfo

export type TokenProgramAccount<T> = { publicKey: PublicKey; account: T }

/** Get all token accounts owned by a wallet (Token-2022) */
export async function getOwnedTokenAccounts(
    connection: Connection,
    publicKey: PublicKey,
): Promise<TokenProgramAccount<TokenAccount>[]> {
  const result = await connection.getTokenAccountsByOwner(publicKey, {
    programId: TOKEN_2022_PROGRAM_ID,
  })

  return result.value.map((r) => ({
    publicKey: r.pubkey,
    account: parseTokenAccountData(r.pubkey, Buffer.from(r.account.data)),
  }))
}

/** Get mint data using Token-2022 program */


/** Parse Mint layout raw buffer into MintInfo */
export async function getMint(
    connection: Connection,
    publicKey: PublicKey,
): Promise<TokenProgramAccount<MintInfo> | undefined> {
  try {
    const info = await connection.getAccountInfo(publicKey)
    if (!info) return undefined

    const data = info.data
    const mintRaw = MintLayout.decode(data)

    const mint: MintInfo = {
      mintAuthority: mintRaw.mintAuthorityOption === 0 ? null : new PublicKey(mintRaw.mintAuthority),
      supply: u64.fromBuffer(mintRaw.supply),
      decimals: mintRaw.decimals,
      isInitialized: mintRaw.isInitialized !== 0,
      freezeAuthority: mintRaw.freezeAuthorityOption === 0 ? null : new PublicKey(mintRaw.freezeAuthority),
    }

    return { publicKey, account: mint }
  } catch (ex) {
    console.error(`Can't fetch mint ${publicKey.toBase58()} @ ${connection.rpcEndpoint}`, ex)
    return undefined
  }
}

export default getMint

/** Try fetching a token account (Token-2022) */
export async function tryGetTokenAccount(
    connection: Connection,
    publicKey: PublicKey,
): Promise<TokenProgramAccount<TokenAccount> | undefined> {
  try {
    const result = await connection.getAccountInfo(publicKey)
    if (!result?.owner.equals(TOKEN_2022_PROGRAM_ID)) return undefined
    return { publicKey, account: parseTokenAccountData(publicKey, Buffer.from(result.data)) }
  } catch {
    return undefined
  }
}

/** Try fetching mint from token account */
export async function tryGetTokenMint(
    connection: Connection,
    publicKey: PublicKey,
): Promise<TokenProgramAccount<MintAccount> | undefined> {
  const tokenAccount = await tryGetTokenAccount(connection, publicKey)
  if (!tokenAccount) return undefined
  return getMint(connection, tokenAccount.account.mint)
}

/** Approve token transfer */
export function approveTokenTransfer(
    instructions: TransactionInstruction[],
    cleanupInstructions: TransactionInstruction[],
    account: PublicKey,
    owner: PublicKey,
    amount: number | u64,
    autoRevoke = true,
    delegate?: PublicKey,
    existingTransferAuthority?: Keypair,
): Keypair {
  const tokenProgram = TOKEN_2022_PROGRAM_ID
  const transferAuthority = existingTransferAuthority || new Keypair()
  if (typeof amount !== 'number') amount = new u64(amount.toArray())

  instructions.push(
      Token.createApproveInstruction(tokenProgram, account, delegate ?? transferAuthority.publicKey, owner, [], amount),
  )

  if (autoRevoke) {
    cleanupInstructions.push(Token.createRevokeInstruction(tokenProgram, account, owner, []))
  }

  return transferAuthority
}

/** Fetch multiple accounts in chunks */
export async function getMultipleAccountInfoChunked(
    connection: Connection,
    keys: PublicKey[],
    commitment: Commitment | undefined = 'recent',
) {
  return (
      await Promise.all(chunks(keys, 99).map((chunk) => connection.getMultipleAccountsInfo(chunk, commitment)))
  ).flat()
}

/** Helpers to format token/mint account labels (UI) */
export function getTokenAccountLabelInfo(acc: AssetAccount | undefined) {
  if (!acc?.extensions.token || !acc.extensions.mint) return {}

  const info = tokenPriceService.getTokenInfo(acc.extensions.mint.publicKey.toBase58())
  return {
    tokenAccount: acc.extensions.token.publicKey.toBase58(),
    tokenName: info?.name ?? acc.extensions.mint.publicKey.toBase58(),
    tokenAccountName: getAccountName(acc.extensions.token.publicKey),
    amount: formatMintNaturalAmountAsDecimal(acc.extensions.mint.account, acc.extensions.token?.account.amount),
    imgUrl: info?.logoURI ?? '',
  }
}

export function getSolAccountLabel(acc: AssetAccount | undefined) {
  if (!acc?.extensions.mint) return {}

  const info = tokenPriceService.getTokenInfo(WSOL_MINT)
  return {
    tokenAccount: acc.extensions.transferAddress!.toBase58(),
    tokenName: 'SOL',
    tokenAccountName: acc.extensions.transferAddress ? getAccountName(acc.extensions.transferAddress) : '',
    amount: formatMintNaturalAmountAsDecimal(acc.extensions.mint.account, new BN(acc.extensions.solAccount!.lamports)),
    imgUrl: info?.logoURI ?? '',
  }
}
