import { DasNftObject } from '@hooks/queries/digitalAssets'
import { fetchNFTbyMint } from '@hooks/queries/nft'
import { Metaplex } from '@metaplex-foundation/js'
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js'

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
  const MPL_CORE_PROGRAM_ID = new PublicKey('CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d');
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
  } catch (error) {
    if (nft.interface === 'MplCoreAsset') {
      // fallback for mpl core assets
      const ix: TransactionInstruction = {
        keys: [
          { pubkey: mint, isSigner: false, isWritable: true },
          {
            pubkey: new PublicKey(nft.grouping.find((g) => g.group_key === 'collection')!.group_value),
            isSigner: false,
            isWritable: false,
          },
          { pubkey: fromOwner,
            isSigner: true,
            isWritable: true,
          },
          {
            pubkey: MPL_CORE_PROGRAM_ID,
            isSigner: false,
            isWritable: false,
          },
          { pubkey: toOwner, isSigner: false, isWritable: false },
          {
            pubkey: MPL_CORE_PROGRAM_ID,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: MPL_CORE_PROGRAM_ID,
            isSigner: false,
            isWritable: false,
          },
        ],
        programId: MPL_CORE_PROGRAM_ID,
        data: Buffer.from([14,0])
      } 
      return ix;
    } else {
      throw new Error('failed to create transfer instruction')
    }
  }
}
