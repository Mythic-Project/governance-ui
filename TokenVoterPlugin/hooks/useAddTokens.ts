import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor"
import { useRealmQuery } from "@hooks/queries/realm"
import { useRealmConfigQuery } from "@hooks/queries/realmConfig"
import { useRealmVoterWeightPlugins } from "@hooks/useRealmVoterWeightPlugins"
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token-new"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import addTokensHandler from "TokenVoterPlugin/actions/depositTokens"
import { TokenVoterClient } from "TokenVoterPlugin/client"
import { SplGovernance } from "governance-idl-sdk"
import { useTokenAccountByKeyQuery } from "./useTokenAccount"

export function useAddTokens() {
  const wallet = useWallet()
  const {connection} = useConnection()
  const client = useQueryClient()
  const realm = useRealmQuery().data?.result
  const realmConfig = useRealmConfigQuery().data?.result
  const {plugins} = useRealmVoterWeightPlugins('community')
  const pluginParams = plugins?.voterWeight[0].params as any
  const pluginMintKey = pluginParams?.votingMintConfigs?.[0].mint ? 
    pluginParams.votingMintConfigs[0].mint :
    undefined

  const tokenAccount = wallet.publicKey && pluginMintKey ?
    getAssociatedTokenAddressSync(
      pluginMintKey, 
      wallet.publicKey, 
      undefined, 
      TOKEN_2022_PROGRAM_ID
    ) : null

  const userPluginAta = useTokenAccountByKeyQuery(tokenAccount).data

  return useMutation({
    mutationKey: ["add-tokens-mutation", {realm: realm?.pubkey, publicKey: wallet.publicKey}],
    mutationFn: async() => {
      if (
        !realm || !realmConfig || !wallet || !wallet.publicKey || 
        !tokenAccount || !userPluginAta || !pluginMintKey
      ) {
        return null
      }
        
      const govClient = new SplGovernance(connection, realm.owner)
      const provider = new AnchorProvider(connection, {} as Wallet, {})
      const tokenClient = await TokenVoterClient.connect(provider)
      const publicKey = wallet.publicKey
      const amount = new BN(userPluginAta.amount.toString())

      await addTokensHandler(
        connection,
        wallet,
        govClient,
        realm.pubkey,
        realm.account.communityMint,
        pluginMintKey,
        tokenAccount,
        publicKey,
        amount,
        tokenClient.program
      )

      return amount
    },
    onSuccess: async() => {
      client.resetQueries({
        queryKey: ['get-token-account', {ata: tokenAccount}]
      })
      await client.invalidateQueries({
        queryKey: ['get-token-account', {ata: tokenAccount}]
      })
    }
  })
}