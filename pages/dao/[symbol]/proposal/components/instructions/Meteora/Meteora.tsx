/**
 * The following code fixes the errors by retrieving the mint info for each token
 * and passing it to getMintDecimalAmountFromNatural instead of a PublicKey.
 */

// Start of Selection
import { Connection } from '@solana/web3.js'
import { AccountMetaData } from '@solana/spl-governance'
import { tryGetTokenAccount, tryGetMint } from '@utils/tokens'
import { getMintDecimalAmountFromNatural } from '@tools/sdk/units'

export const METEORA_INSTRUCTIONS = {
  'M3mxk5W2tt27WGZWpZR7hUpV7c5Hqm8GfwUtbyLJGrj1': {
    // Create Pool instruction
    1: {
      name: 'Create Liquidity Pool',
      accounts: [
        { name: 'Token A Mint' },
        { name: 'Token B Mint' },
        { name: 'Pool Authority' },
        { name: 'Fee Account' },
        { name: 'Pool State' },
        { name: 'Token Program' },
      ],
      getDataUI: async (
        connection: Connection,
        data: Uint8Array,
        accounts: AccountMetaData[]
      ) => {
        const tokenAAccount = await tryGetTokenAccount(
          connection,
          accounts[0].pubkey
        )
        const tokenBAccount = await tryGetTokenAccount(
          connection,
          accounts[1].pubkey
        )

        const tokenAMintInfo = tokenAAccount?.account.mint
          ? await tryGetMint(connection, tokenAAccount.account.mint)
          : null

        const tokenBMintInfo = tokenBAccount?.account.mint
          ? await tryGetMint(connection, tokenBAccount.account.mint)
          : null

        return (
          <div className="space-y-3">
            <div>
              <div className="font-bold">Token A:</div>
              <div>
                {tokenAAccount &&
                  tokenAMintInfo &&
                  getMintDecimalAmountFromNatural(
                    tokenAMintInfo.account,
                    tokenAAccount.account.amount
                  ).toFormat()}
              </div>
            </div>
            <div>
              <div className="font-bold">Token B:</div>
              <div>
                {tokenBAccount &&
                  tokenBMintInfo &&
                  getMintDecimalAmountFromNatural(
                    tokenBMintInfo.account,
                    tokenBAccount.account.amount
                  ).toFormat()}
              </div>
            </div>
          </div>
        )
      },
    },
  },
}