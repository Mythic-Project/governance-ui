import { sendTransactionsV3, SequenceType } from 'utils/sendTransactions'
import { chunks } from '@utils/helpers'

import {
  prepareRealmCreation,
  RealmCreation,
  Web3Context,
} from '@tools/governance/prepareRealmCreation'
import { trySentryLog } from '@utils/logs'
import { ComputeBudgetProgram, SystemProgram } from '@solana/web3.js'
import { FEE_WALLET } from '@utils/orders'
import {
  lamportsToSol,
  solToLamports,
} from '@marinade.finance/marinade-ts-sdk/dist/src/util'
import { BN } from '@coral-xyz/anchor'

/// Creates multisig realm with community mint with 0 supply
/// and council mint used as multisig token
type MultisigWallet = RealmCreation & Web3Context

export default async function createMultisigWallet({
  connection,
  wallet,
  ...params
}: MultisigWallet) {
  const {
    communityMintPk,
    councilMintPk,
    realmPk,
    realmInstructions,
    realmSigners,
    mintsSetupInstructions,
    mintsSetupSigners,
    councilMembersInstructions,
  } = await prepareRealmCreation({
    connection,
    wallet,
    isMultiSig: true,
    ...params,
  })
  const solBalance = await connection.getBalance(wallet.publicKey!)
  if (lamportsToSol(new BN(solBalance)) < 1.05) {
    throw new Error('You need to have at least 1.05 SOL to create a realm')
  }

  try {
    const councilMembersChunks = chunks(councilMembersInstructions, 8)

    const allSigners = [...mintsSetupSigners, ...realmSigners]

    const cuLimtIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 800_000,
    })
    realmInstructions.unshift(cuLimtIx)

    const txes = [
      ...chunks(mintsSetupInstructions, 5),
      ...councilMembersChunks,
      ...chunks(realmInstructions, 15),
      [
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey!,
          toPubkey: FEE_WALLET,
          lamports: solToLamports(2).toNumber(),
        }),
      ],
    ].map((txBatch) => {
      return {
        instructionsSet: txBatch.map((txInst) => {
          const signers = allSigners.filter((x) =>
            txInst.keys
              .filter((key) => key.isSigner)
              .find((key) => key.pubkey.equals(x.publicKey)),
          )
          return {
            transactionInstruction: txInst,
            signers,
          }
        }),
        sequenceType: SequenceType.Sequential,
      }
    })

    const tx = await sendTransactionsV3({
      connection,
      wallet,
      transactionInstructions: txes,
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
