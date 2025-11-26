import { DasNftObject } from '@hooks/queries/digitalAssets'
import { fetchNFTbyMint } from '@hooks/queries/nft'
import { Metaplex } from '@metaplex-foundation/js'
import { Connection, PublicKey } from '@solana/web3.js'
import { transferV1 } from "@metaplex-foundation/mpl-core"
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { generateSigner, publicKey, signerIdentity, signerPayer } from '@metaplex-foundation/umi'
import { toWeb3JsInstruction } from '@metaplex-foundation/umi-web3js-adapters'

export const createIx_transferNft = async (
  connection: Connection,
  fromOwner: PublicKey,
  toOwner: PublicKey,
  nft: DasNftObject,
  authority: PublicKey,
  payer: PublicKey
) => {
  const metaplex = new Metaplex(
    connection,
    // surely this doesn't matter? who cares what the cluster is if you know the endpoint?
    /*  {
      cluster:
        connection.en === 'mainnet' ? 'mainnet-beta' : connection.cluster,
     }*/
  ) //.use(walletAdapterIdentity(wallet)) // surely this doesnt matter either (IT DOES)
  //metaplex.identity = () => ({ publicKey: fromOwner } as any) // you need to do this to set payer and authority. I love OOP!!
  // except the payer might not be the same person. great!

  const mint = new PublicKey(nft.id);
  const umi = createUmi(connection.rpcEndpoint)
  const signer = generateSigner(umi);
  umi.use(signerIdentity(signer));

  try {
    const nft = await fetchNFTbyMint(connection, mint)
    if (!nft.result) throw 'failed to fetch nft'

    const tokenStandard = nft.result.tokenStandard
    const ruleSet = nft.result.programmableConfig?.ruleSet

    const ix = metaplex
      .nfts()
      .builders()
      .transfer({
        nftOrSft: {
          address: mint,
          tokenStandard,
        },
        authorizationDetails: ruleSet ? { rules: ruleSet } : undefined,
        toOwner,
        fromOwner,
      })
      .getInstructions()[0]

    ix.keys[9].pubkey = authority
    ix.keys[10].pubkey = payer
    return ix
  } catch(error) {
    if (nft.interface === 'MplCoreAsset') {
      // fallback for mpl core assets
      const ixMpl = transferV1(umi, {
        asset: publicKey(nft.id),
        newOwner: publicKey(toOwner),
        collection: nft.grouping.some((g) => g.group_key === 'collection')
          ? publicKey(
              nft.grouping.find((g) => g.group_key === 'collection')!.group_value
          ) : undefined,
      })

      const ix = toWeb3JsInstruction(ixMpl.items[0].instruction);
      ix.keys[2].pubkey = fromOwner;
      return ix;
    } else {
      throw new Error('failed to create transfer instruction')
    }
  }
}
