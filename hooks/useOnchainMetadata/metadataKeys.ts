import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

const metadataKeysIds: number[] = []

type MetadataKey = {
  label: string
  id: BN
}

export interface MetadataItems {
  // symbol: string
  displayName: string
  daoImage: string
  bannerImage: string
  shortDescription: string
  category: string
  website: string
  twitter: string
  discord: string
  keywords: string
}

const metadataKeysLabels = [
  'realm-metadata', 'displayName', 'daoImage', 
  'bannerImage', 'shortDescription',
  'category', 'website', 'twitter',
  'discord', 'keywords'
];

for (let i=20000; i<20010;i++) {
  metadataKeysIds.push(i)
}


export const metadataKeys: MetadataKey[] = metadataKeysIds.map((id, index) => ({
  label: metadataKeysLabels[index],
  id: new BN(id)
}))

export function getMetadataKey(programId: PublicKey) {
  return PublicKey.findProgramAddressSync([
    Buffer.from("mythic_metadata"),
    Buffer.from("metadata_key"),
    metadataKeys[0].id.toArrayLike(Buffer, "le", 8)
  ],
    programId
  )[0]
}

export function getMetadata(
  authority: PublicKey,
  realm: PublicKey,
  programId: PublicKey
) {
  return PublicKey.findProgramAddressSync([
    Buffer.from("mythic_metadata"),
    Buffer.from("metadata"),
    getMetadataKey(programId).toBuffer(),
    authority.toBuffer(),
    realm.toBuffer()
  ],
    programId
  )[0]
}