import { AnchorProvider, IdlAccounts, Program, Wallet } from "@coral-xyz/anchor"
import { MythicMetadata } from "./metadata"
import { PublicKey } from "@solana/web3.js"
import { useConnection } from "@solana/wallet-adapter-react"
import idl from "./idl.json"
import { MetadataItems, getMetadata, metadataKeys } from "./metadataKeys"
import { useQuery } from "@tanstack/react-query"
import { useRealmByPubkeyQuery } from "@hooks/queries/realm"
import { getNativeTreasuryAddress } from "@solana/spl-governance"

export type MetadataKey = IdlAccounts<MythicMetadata>["metadataKey"]
const metadataProgramId = new PublicKey("HASmJt3YnfzqkEnR93acGjT1pbVdoNB21zQdpnQqsXU3")

export function useGetOnchainMetadata(realmAddress: PublicKey | undefined) {
  const {connection} = useConnection()
  const provider = new AnchorProvider(connection, {} as Wallet, {})
  const client = new Program(idl as MythicMetadata, metadataProgramId, provider)
  const realm = useRealmByPubkeyQuery(realmAddress).data

  return useQuery({
    enabled: realm !== undefined,
    queryKey: ['get-onchain=metadata', {realmAddress: realmAddress?.toBase58()}],
    queryFn: async() => {
      if (!realm || !realm.result) {
        return null
      }

      if (!realm.result.account.authority) {
        return null
      }

      try {
        const treasuryAccount = await getNativeTreasuryAddress(
          realm.result.owner,
          realm.result.account.authority
        )

        const metadataAddress = getMetadata(
          treasuryAccount,
          realm.result.pubkey,
          metadataProgramId
        )

        const metadataData = await client.account.metadata.fetch(metadataAddress)
        const metadata: MetadataItems = {
          displayName: "",
          daoImage: "",
          bannerImage: "",
          shortDescription: "",
          category: "",
          website: "",
          twitter: "",
          discord: "",
          keywords: ""
        }

        for (const item of metadataData.items) {
          const selectedKey = metadataKeys.find(k => k.id.eq(item.metadataKeyId))
          metadata[selectedKey!.label] = item.value.toString()
        }

        return metadata
      } catch(e) {
        console.log(e)
        return null
      }
    },
    refetchOnWindowFocus: false
  })
}