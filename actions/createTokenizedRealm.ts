import {
  sendTransactionsV3,
  SequenceType,
  txBatchesToInstructionSetWithSigners,
} from 'utils/sendTransactions'
import { chunks } from '@utils/helpers'

import {
  prepareRealmCreation,
  RealmCreation,
  Web3Context,
} from '@tools/governance/prepareRealmCreation'
import { trySentryLog } from '@utils/logs'
import { BN, Wallet } from '@coral-xyz/anchor'
import {
  SetRealmAuthorityAction,
  withSetRealmAuthority,
} from '@solana/spl-governance'
import { PluginName, pluginNameToCanonicalProgramId } from '@constants/plugins'
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js'
import { addQVPlugin } from './addPlugins/addQVPlugin'
import { defaultSybilResistancePass } from '../GatewayPlugin/config'
import { addGatewayPlugin } from './addPlugins/addGatewayPlugin'
import { Coefficients } from '@solana/governance-program-library'
import { addTokenVoterPlugin } from './addPlugins/addTokenVoterPlugin'
import {
  lamportsToSol,
  solToLamports,
} from '@marinade.finance/marinade-ts-sdk/dist/src/util'
import { FEE_WALLET } from '@utils/orders'

type CreateWithPlugin = {
  pluginList: PluginName[]
  coefficientA: number
  coefficientB: number
  coefficientC: number
  civicPass: string
}
type TokenizedRealm = Web3Context & RealmCreation & CreateWithPlugin

function determineVoterWeightAddin(
  pluginList: PluginName[],
): PublicKey | undefined {
  if (pluginList.length === 0) return undefined
  // the last plugin in the chain is the one that is attached to the realm.
  return pluginNameToCanonicalProgramId(pluginList[pluginList.length - 1])
}

export default async function createTokenizedRealm({
  connection,
  wallet,
  pluginList,
  ...params
}: TokenizedRealm) {
  // Check if the DAO requires any plugins at startup, and if so, add them.
  const voterWeightAddin = determineVoterWeightAddin(pluginList)
  // Note - this does not support council token addins or max voter weight yet as there are no examples of plugins that use that for a tokenised realm.
  const communityTokenConfig = {
    ...params.communityTokenConfig,
    voterWeightAddin,
  }

  if (pluginList.includes('token_voter') && !params.existingCommunityMintPk) {
    throw new Error('It is mandatory to provide community mint public key.')
  }

  const {
    communityMintPk,
    councilMintPk,
    realmPk,
    realmInstructions,
    realmSigners,
    mintsSetupInstructions,
    mintsSetupSigners,
    councilMembersInstructions,
    walletPk,
    programIdPk,
    mainGovernancePk,
    programVersion,
  } = await prepareRealmCreation({
    connection,
    wallet,
    ...params,
    communityTokenConfig,
    pluginList,
  })

  const solBalance = await connection.getBalance(wallet.publicKey!)
  if (lamportsToSol(new BN(solBalance)) < 1.05) {
    throw new Error('You need to have at least 1.05 SOL to create a realm')
  }

  try {
    const councilMembersChunks = chunks(councilMembersInstructions, 10)
    // only walletPk needs to sign the minting instructions and it's a signer by default and we don't have to include any more signers
    const councilMembersSignersChunks = Array(councilMembersChunks.length).fill(
      [],
    )
    console.log('CREATE GOV TOKEN REALM: sending transactions')

    const pluginSigners: Keypair[] = []
    const pluginIxes: TransactionInstruction[] = []

    let predecessorProgramId: PublicKey | undefined = undefined

    if (pluginList.includes('gateway')) {
      // By default, use Civic's uniqueness pass. TODO allow this to be overridden in advanced mode.
      const passType = new PublicKey(
        params.civicPass || defaultSybilResistancePass.value,
      )

      const { pluginProgramId, instructions } = await addGatewayPlugin(
        connection,
        wallet as Wallet,
        realmPk,
        communityMintPk,
        programIdPk,
        predecessorProgramId,
        passType,
      )

      pluginIxes.push(...instructions)
      predecessorProgramId = pluginProgramId
    }
    if (pluginList.includes('QV')) {
      const qvCoefficientsFromForm = [
        params.coefficientA,
        params.coefficientB,
        params.coefficientC,
      ] as Coefficients
      const { pluginProgramId, instructions } = await addQVPlugin(
        connection,
        wallet as Wallet,
        realmPk,
        communityMintPk,
        programIdPk,
        predecessorProgramId,
        qvCoefficientsFromForm,
        params.existingCommunityMintPk,
      )

      pluginIxes.push(...instructions)
      predecessorProgramId = pluginProgramId
    }

    if (pluginList.includes('token_voter')) {
      const { instructions } = await addTokenVoterPlugin(
        connection,
        wallet as Wallet,
        realmPk,
        communityMintPk,
        programIdPk,
        params.existingCommunityMintPk!,
      )

      pluginIxes.push(...instructions)
    }

    if (pluginIxes.length > 0) {
      // finally, transfer the realm authority to the Realm PDA
      // Set the community governance as the realm authority
      withSetRealmAuthority(
        pluginIxes,
        programIdPk,
        programVersion,
        realmPk,
        walletPk,
        mainGovernancePk,
        SetRealmAuthorityAction.SetChecked,
      )
    }

    const signers = [
      mintsSetupSigners,
      ...councilMembersSignersChunks,
      realmSigners,
      pluginSigners,
    ]

    const cuLimtIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000})
    realmInstructions.unshift(cuLimtIx)

    const ixes = [
      mintsSetupInstructions,
      ...councilMembersChunks,
      realmInstructions,
      pluginIxes,
      [
        SystemProgram.transfer({
          fromPubkey: walletPk,
          toPubkey: FEE_WALLET,
          lamports: solToLamports(1).toNumber(),
        }),
      ],
    ].map((ixBatch, batchIdx) => ({
      instructionsSet: txBatchesToInstructionSetWithSigners(
        ixBatch,
        signers,
        batchIdx,
      ),
      sequenceType: SequenceType.Sequential,
    }))

    const tx = await sendTransactionsV3({
      connection,
      wallet,
      transactionInstructions: ixes,
    })

    const logInfo = {
      realmId: realmPk,
      realmSymbol: params.realmName,
      wallet: wallet.publicKey?.toBase58(),
      cluster: connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet',
    }
    trySentryLog({
      tag: 'realmCreated',
      objToStringify: logInfo,
    })

    return {
      tx,
      realmPk,
      communityMintPk,
      councilMintPk,
    }
  } catch (ex) {
    console.error(ex)
    throw ex
  }
}
