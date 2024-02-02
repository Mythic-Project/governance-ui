import { PublicKey, Connection, Keypair } from '@solana/web3.js'
import { fetchRealmConfigQuery } from '@hooks/queries/realmConfig'
import { findPluginName, PluginName } from '@constants/plugins'
import { getRegistrarPDA } from '@utils/plugin/accounts'
import { BN } from '@coral-xyz/anchor'
import {
  GatewayClient,
  QuadraticClient,
} from '@solana/governance-program-library'
import { loadClient } from './loadClient'
import { AnchorProvider } from '@coral-xyz/anchor'
import EmptyWallet from '@utils/Mango/listingTools'

export interface PluginData {
  pluginProgramId: PublicKey
  name: string | undefined // you may need undefined here to allow "unknown" plugins
  params: any // the most challenging one- probably a typed data structure of some kind, that is related to the plugin, e.g. QV plugin has params: { coefficients: number[] }, Gateway plugin has params: { gatekeeperNetwork: Plugin } - these would come from the registrar
  voterWeight: BN // the weight after applying this plugin (taken from the voter's voterWeightRecord account)
  maxVoterWeight: BN | undefined // see above - can be undefined if the plugin does not set a max vw
}

export const getPredecessorProgramId = async (
  client: GatewayClient | QuadraticClient,
  realmPublicKey: PublicKey,
  governanceMintPublicKey: PublicKey
): Promise<PublicKey | null> => {
  // Get the registrar for the realm
  const { registrar } = await getRegistrarPDA(
    realmPublicKey,
    governanceMintPublicKey,
    client.program.programId
  )
  const registrarObject = await client.program.account.registrar.fetch(
    registrar
  )

  // Find the gatekeeper network from the registrar
  return registrarObject.previousVoterWeightPluginProgramId
}

export const getPlugins = async ({
  realmPublicKey,
  governanceMintPublicKey,
  connection,
}: {
  realmPublicKey: PublicKey
  governanceMintPublicKey: PublicKey
  connection: Connection
}): Promise<PluginName[]> => {
  const config = await fetchRealmConfigQuery(connection, realmPublicKey)
  const plugins: PluginName[] = []

  const options = AnchorProvider.defaultOptions()
  const provider = new AnchorProvider(
    connection,
    new EmptyWallet(Keypair.generate()),
    options
  )

  let programId =
    config.result?.account?.communityTokenConfig?.voterWeightAddin ?? null

  let pluginName = ''

  if (programId) {
    // build plugin list till we get null, which means we are at the end of the plugin chain

    do {
      pluginName = findPluginName(programId)
      if (pluginName) {
        plugins.push(pluginName as PluginName)
      }

      const client = await loadClient(pluginName as PluginName, provider)
      programId = await getPredecessorProgramId(
        client,
        realmPublicKey,
        governanceMintPublicKey
      )
    } while (pluginName !== null && programId !== null)
  }

  return plugins
}