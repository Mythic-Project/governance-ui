import { AnchorProvider, IdlAccounts, Program, Wallet } from "@coral-xyz/anchor"
import { MythicMetadata } from "./metadata"
import { PublicKey, SystemProgram } from "@solana/web3.js"
import { useConnection } from "@solana/wallet-adapter-react"
import idl from "./idl.json"
import { MetadataItems, getMetadata, metadataKeys } from "./metadataKeys"
import { useQuery } from "@tanstack/react-query"
import { useRealmByPubkeyQuery } from "@hooks/queries/realm"
import { getNativeTreasuryAddress } from "@solana/spl-governance"

export type MetadataKey = IdlAccounts<MythicMetadata>["metadataKey"]
export type MetadataItemForList = {
  displayName: string | undefined
  daoImage: string | undefined
  realm: PublicKey
  issuingAuthority: PublicKey
}

const metadataProgramId = new PublicKey("metaThtkusoWYDvHBFXfvc93Z3d8iBeDZ4DVyq8SYVR")

export function useGetOnchainMetadata(realmAddress: PublicKey | undefined) {
  const {connection} = useConnection()
  const provider = new AnchorProvider(connection, {} as Wallet, {})
  const client = new Program(idl as MythicMetadata, metadataProgramId, provider)
  const realm = useRealmByPubkeyQuery(realmAddress).data

  return useQuery({
    enabled: realm !== undefined,
    queryKey: ['get-onchain-metadata', {realmAddress: realmAddress?.toBase58()}],
    queryFn: async() => {
      if (!realm || !realm.result) {
        return null
      }

      if (!realm.result.account.authority) {
        return null
      }

      const authorityOwner = await connection.getAccountInfo(realm.result.account.authority)
      
      try {
        const treasuryAccount = await getNativeTreasuryAddress(
          realm.result.owner,
          realm.result.account.authority
        )

        const issuingAuthority = 
          authorityOwner?.owner.equals(SystemProgram.programId) ?
            realm.result.account.authority :
            treasuryAccount

        const metadataAddress = getMetadata(
          issuingAuthority,
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
    refetchOnWindowFocus: false,
    staleTime: 3600000, // 1 hour
    cacheTime: 3600000 * 24 * 10,
  })
}

export function useGetAllMetadata() {
  const { connection } = useConnection()
  const provider = new AnchorProvider(connection, {} as Wallet, {})
  const client = new Program(idl as MythicMetadata, metadataProgramId, provider)

  const query = useQuery({
    queryKey: ['get-onchain-metadata'],
    queryFn: async () => {
      const metadatas = await client.account.metadata.all()
      const displayNameKeyId = metadataKeys[1].id
      const daoImageKeyId = metadataKeys[2].id
      
      const metadataItems: MetadataItemForList[] = metadatas.map(metadata => {
        const displayName = metadata.account.items.find(i => i.metadataKeyId.eq(displayNameKeyId))?.value.toString()
        const daoImage = metadata.account.items.find(i => i.metadataKeyId.eq(daoImageKeyId))?.value.toString()
        
        return {
          displayName,
          daoImage,
          realm: metadata.account.subject,
          issuingAuthority: metadata.account.issuingAuthority
        }
      })

      return metadataItems
    },
    staleTime: 3600000, // 1 hour
    cacheTime: 3600000 * 24 * 10,
    refetchOnWindowFocus: false
  })

  return query
}