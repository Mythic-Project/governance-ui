import { AnchorProvider, Wallet } from "@coral-xyz/anchor"
import { PublicKey } from "@metaplex-foundation/js"
import { Connection } from "@solana/web3.js"
import { TokenVoterClient } from "TokenVoterPlugin/client"


export async function addTokenVoterPlugin(
  connection: Connection,
  wallet: Wallet,
  realmPk: PublicKey,
  communityMintPk: PublicKey,
  programIdPk: PublicKey,
  pluginMint: PublicKey
) {
  const provider = new AnchorProvider(connection, wallet as Wallet, {})
  const client = await TokenVoterClient.connect(provider)
  const program = client.program

  const registrarKey = client.getRegistrarPDA(realmPk, communityMintPk).registrar
  const maxVoterWeightRecord = (await client.getMaxVoterWeightRecordPDA(realmPk, communityMintPk)).maxVoterWeightPk
  
  const createRegistrarIx = await program.methods.createRegistrar(1)
    .accounts({
      registrar: registrarKey,
      governanceProgramId: programIdPk,
      realm: realmPk,
      governingTokenMint: communityMintPk,
      realmAuthority: wallet.publicKey,
      payer: wallet.publicKey
    })
    .instruction()

  const createMaxVwrIx = await program.methods.createMaxVoterWeightRecord()
    .accounts({
      registrar: registrarKey,
      governanceProgramId: programIdPk,
      realm: realmPk,
      realmGoverningTokenMint: communityMintPk,
      payer: wallet.publicKey,
      maxVoterWeightRecord
    })
    .instruction()

  const configureMintIx = await program.methods.configureMintConfig(0)
    .accounts({
      registrar: registrarKey,
      realm: realmPk,
      realmAuthority: wallet.publicKey,
      mint: pluginMint,
      maxVoterWeightRecord,
      governanceProgramId: programIdPk
    })
    .instruction()

  const instructions = [createRegistrarIx, createMaxVwrIx, configureMintIx]
  return {instructions}
}