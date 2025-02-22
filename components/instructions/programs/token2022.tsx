import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js'
import { AccountMetaData } from '@solana/spl-governance'
import { tryGetMint } from '../../../utils/tokens'
import tokenPriceService from '@utils/services/tokenPrice'
import {
  decodeTransferCheckedInstruction,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token-new'
import { toUiDecimals } from '@blockworks-foundation/mango-v4'
import HarvestTokenPanel from '@components/Token2022/HarvestTokensPanel'

interface TokenMintMetadata {
  name: string
}

// Mint metadata for Well known tokens displayed on the instruction card
const MINT_METADATA = {
  MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac: { name: 'MNGO' },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { name: 'USDC' },
  '5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm': { name: 'SOCN' },
  SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt: { name: 'SRM' },
  MyHd6a7HWKTMeJMHBkrbMq4hZwZxwn9x7dxXcopQ4Wd: { name: 'OMH' },
  UXPhBoR3qG4UCiGNJfV7MqhHyFqKN68g45GoYvAeL2M: { name: 'UXP' },
  H7uqouPsJkeEiLpCEoC1qYVVquDrZan6ZfdPK2gS44zm: { name: 'FORE' },
  BaoawH9p2J8yUK9r5YXQs3hQwmUJgscACjmTkh8rMwYL: { name: 'ALL' },
}

export function getMintMetadata(
  tokenMintPk: PublicKey | undefined,
): TokenMintMetadata {
  const tokenMintAddress = tokenMintPk ? tokenMintPk.toBase58() : ''
  const tokenInfo = tokenMintAddress
    ? tokenPriceService.getTokenInfo(tokenMintAddress)
    : null
  return tokenInfo
    ? { name: tokenInfo.symbol }
    : MINT_METADATA[tokenMintAddress]
}

export const TOKEN_2022_INST = {
  TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: {
    12: {
      name: 'Token: Transfer checked',
      accounts: [
        { name: 'Source', important: true },
        { name: 'Mint', important: true },
        { name: 'Destination' },
        { name: 'Authority' },
      ],
      getDataUI: async (
        connection: Connection,
        data: Uint8Array,
        accounts: AccountMetaData[],
      ) => {
        const tokenMint = await tryGetMint(connection, accounts[1].pubkey)
        const tokenMintDescriptor = getMintMetadata(accounts[1].pubkey)
        const transferChecked = decodeTransferCheckedInstruction(
          new TransactionInstruction({
            keys: accounts,
            data: Buffer.from(data),
            programId: TOKEN_2022_PROGRAM_ID,
          }),
          TOKEN_2022_PROGRAM_ID,
        )

        const tokenAmount = tokenMint
          ? toUiDecimals(
              Number(transferChecked.data.amount),
              transferChecked.data.decimals,
            )
          : transferChecked.data.amount.toString()

        return (
          <>
            {tokenMint ? (
              <div>
                <div>
                  <span>Amount:</span>
                  <span>{`${tokenAmount} ${
                    tokenMintDescriptor?.name ?? ''
                  }`}</span>
                </div>
              </div>
            ) : (
              <div>{JSON.stringify(data)}</div>
            )}
          </>
        )
      },
    },
    26: {
      name: 'Token: Withdraw Fees From Mint',
      accounts: [
        { name: 'Mint' },
        { name: 'Destination' },
        { name: 'Authority' },
      ],
      getDataUI: async (
        connection: Connection,
        data: Uint8Array,
        accounts: AccountMetaData[],
      ) => {
        return <HarvestTokenPanel mint={accounts[0].pubkey}></HarvestTokenPanel>
      },
    },
  },
}
