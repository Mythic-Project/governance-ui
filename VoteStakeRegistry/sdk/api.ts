import { NftVoterClient } from '@utils/uiTypes/NftVoterClient'
import { PublicKey } from '@solana/web3.js'
import { HeliumVsrClient } from 'HeliumVotePlugin/sdk/client'
import { Registrar, Voter } from './accounts'
import { VsrClient } from './client'
import { CUSTOM_BIO_VSR_PLUGIN_PK } from '@constants/plugins'

export const tryGetVoter = async (
  voterPk: PublicKey,
  client: Pick<VsrClient, 'program'>,
) => {
  try {
    const voter = await client?.program.account.voter.fetch(voterPk)
    // The cast to any works around an anchor issue with interpreting enums
    return voter as unknown as Voter
  } catch (e) {
    return null
  }
}

export const tryGetRegistrar = async (
  registrarPk: PublicKey,
  client: Pick<VsrClient, 'program'>,
) => {
  try {
    const existingRegistrar =
      await client.program.account.registrar.fetch(registrarPk)
    return existingRegistrar as Registrar
  } catch (e) {
    return null
  }
}

export const tryGetHeliumRegistrar = async (
  registrarPk: PublicKey,
  client: HeliumVsrClient,
) => {
  try {
    const existingRegistrar =
      await client.program.account.registrar.fetch(registrarPk)

    return existingRegistrar
  } catch (e) {
    return null
  }
}

export const tryGetNftRegistrar = async (
  registrarPk: PublicKey,
  client: NftVoterClient,
) => {
  try {
    const existingRegistrar =
      await client.program.account.registrar.fetch(registrarPk)
    return existingRegistrar
  } catch (e) {
    return null
  }
}

export const getMintCfgIdx = async (
  registrarPk: PublicKey,
  mintPK: PublicKey,
  client: VsrClient,
) => {
  const existingRegistrar = await tryGetRegistrar(registrarPk, client)

  if (client.program.programId.toBase58() === CUSTOM_BIO_VSR_PLUGIN_PK) {
    return 0
  }
  
  const mintCfgIdx = existingRegistrar?.votingMints.findIndex(
    (x) => x.mint.toBase58() === mintPK.toBase58(),
  )
  if (mintCfgIdx === null || mintCfgIdx === -1) {
    throw 'mint not configured to use'
  }
  return mintCfgIdx
}
