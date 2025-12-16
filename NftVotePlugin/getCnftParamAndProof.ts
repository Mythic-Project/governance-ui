import { Connection, PublicKey } from '@solana/web3.js'
import { ConcurrentMerkleTreeAccount } from '@solana/spl-account-compression'
import { fetchDasAssetProofById } from '@hooks/queries/digitalAssets'
import { getNetworkFromEndpoint } from '@utils/connection'
import * as anchor from '@coral-xyz/anchor'
// ⚡️ TS2339: Property 'decode' does not exist on type 'typeof bs58'.
// Fix: Use the correct default import for bs58!
import bs58 from 'bs58'

/**
 * Decode a base58 string into a number array.
 */
function decode(stuff: string): number[] {
  // bs58 returns Uint8Array directly as the default import
  return Array.from(bs58.decode(stuff))
}

export default decode

/**
 * This is a helper function only for nft-voter-v2 used.
 * Given a cNFT, getCnftParamAndProof will get its metadata, leaf information and merkle proof.
 */
export async function getCnftParamAndProof(
    connection: Connection,
    compressedNft: any,
): Promise<{ param: any; additionalAccounts: any[] }> {
  const network = getNetworkFromEndpoint(connection.rpcEndpoint)
  if (network === 'localnet') throw new Error('Localnet not supported for this op')

  const { result: assetProof } = await fetchDasAssetProofById(
      network,
      new PublicKey(compressedNft.id),
  )

  const treeAccount = await ConcurrentMerkleTreeAccount.fromAccountAddress(
      connection,
      new PublicKey(compressedNft.compression.tree),
  )
  const canopyHeight = treeAccount.getCanopyDepth()
  const root = decode(assetProof.root)
  const proofLength = assetProof.proof.length

  const reducedProofs = assetProof.proof.slice(
      0,
      proofLength - (canopyHeight ? canopyHeight : 0),
  )

  const creators = compressedNft.creators.map((creator: any) => ({
    address: new PublicKey(creator.address),
    verified: creator.verified,
    share: creator.share,
  }))

  const rawCollection = compressedNft.grouping.find(
      (x: any) => x.group_key === 'collection',
  )

  const param = {
    name: compressedNft.content.metadata.name,
    symbol: compressedNft.content.metadata.symbol,
    uri: compressedNft.content.json_uri,
    sellerFeeBasisPoints: compressedNft.royalty.basis_points,
    primarySaleHappened: compressedNft.royalty.primary_sale_happened,
    creators,
    isMutable: compressedNft.mutable,
    editionNonce: compressedNft.supply.edition_nonce,
    collection: {
      key: rawCollection ? new PublicKey(rawCollection.group_value) : null,
      verified: true,
    },
    root,
    leafOwner: new PublicKey(compressedNft.ownership.owner),
    leafDelegate: new PublicKey(
        compressedNft.ownership.delegate || compressedNft.ownership.owner,
    ),
    nonce: new anchor.BN(compressedNft.compression.leaf_id),
    index: compressedNft.compression.leaf_id,
    proofLen: reducedProofs.length,
  }

  const additionalAccounts = [compressedNft.compression.tree, ...reducedProofs]

  return { param, additionalAccounts }
}