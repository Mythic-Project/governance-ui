import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor"
import { useRealmQuery } from "@hooks/queries/realm"
import { useRealmVoterWeightPlugins } from "@hooks/useRealmVoterWeightPlugins"
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token-new"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { withdrawTokensHandler } from "TokenVoterPlugin/actions/withdrawTokens"
import { TokenVoterClient } from "TokenVoterPlugin/client"
import { SplGovernance } from "governance-idl-sdk"

export function useWithdrawTokens() {
  const wallet = useWallet()
  const {connection} = useConnection()
  const client = useQueryClient()
  const {plugins} = useRealmVoterWeightPlugins('community')
  const pluginParams = plugins?.voterWeight[0].params as any
  const pluginMintKey = pluginParams?.votingMintConfigs?.[0].mint ? 
    pluginParams.votingMintConfigs[0].mint :
    undefined

  const realm = useRealmQuery().data?.result
  const {
    ownVoterWeight: communityOwnVoterWeight,
  } = useRealmVoterWeightPlugins('community')

  const tokenAccount = wallet.publicKey && pluginMintKey ?
    getAssociatedTokenAddressSync(
      pluginMintKey, 
      wallet.publicKey, 
      undefined, 
      TOKEN_2022_PROGRAM_ID
    ) : null

  return useMutation({
    mutationKey: ["withdraw-tokens-mutation", {realm: realm?.pubkey, publicKey: wallet.publicKey}],
    mutationFn: async() => {
      if (
        !realm || !communityOwnVoterWeight || !communityOwnVoterWeight.value || 
        !wallet || !wallet.publicKey || !pluginMintKey
      ) {
        return null
      }

      const govClient = new SplGovernance(connection, realm?.owner)
      const provider = new AnchorProvider(connection, {} as Wallet, {})
      const tokenClient = await TokenVoterClient.connect(provider)

      const publicKey = wallet.publicKey
      const tokenOwnerRecord = await govClient.getTokenOwnerRecord(
        realm.pubkey, publicKey, realm.account.communityMint
      )

      await withdrawTokensHandler(
        connection,
        wallet,
        govClient,
        realm.pubkey,
        realm.account.communityMint,
        pluginMintKey,
        publicKey,
        communityOwnVoterWeight.value,
        tokenOwnerRecord,
        tokenClient.program
      )

      return new BN(0)
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