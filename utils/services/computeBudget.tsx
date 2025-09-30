import {
  AddressLookupTableAccount,
  Blockhash,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionError,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  GetRecentPrioritizationFeesConfig,
  RecentPrioritizationFees,
} from '@solana/web3.js'

export class ComputeBudgetService {
  private connection: Connection

  constructor(connection: Connection) {
    this.connection = connection
  }

  private parseLogs(logMessages: Array<string> | null | undefined) {
    let insufficientFunds = false
    let slippageToleranceExceeded = false

    if (!logMessages) {
      return { insufficientFunds, slippageToleranceExceeded }
    }

    for (const message of logMessages) {
      if (
        message.includes('Program log: Error: insufficient funds') ||
        message.includes('Transfer: insufficient lamports')
      ) {
        insufficientFunds = true
      } else if (
        message.includes(
          'Program log: AnchorError occurred. Error Code: SlippageToleranceExceeded. Error Number: 6001. Error Message: Slippage tolerance exceeded.',
        )
      ) {
        slippageToleranceExceeded = true
      }
    }

    return { insufficientFunds, slippageToleranceExceeded }
  }

  async getSimulationUnitsTxn(
    transaction: VersionedTransaction | Transaction,
    signer?: Keypair,
    computeErrorMargin = 500,
  ): Promise<{
    units: number | undefined
    insufficientFunds: boolean
    slippageToleranceExceeded: boolean
    simulationError: TransactionError | string | null
  }> {
    let simulation

    if (transaction instanceof VersionedTransaction) {
      simulation = await this.connection.simulateTransaction(transaction, {
        replaceRecentBlockhash: true,
        sigVerify: false,
      })
    } else {
      if (!signer) {
        throw new Error(
          'Failed to simulate. Either include signer or use VersionedTransaction',
        )
      }
      simulation = await this.connection.simulateTransaction(transaction, [
        signer,
      ])
    }

    // eslint-disable-next-line prefer-const
    let { insufficientFunds, slippageToleranceExceeded } = this.parseLogs(
      simulation.value.logs,
    )

    let units: number | undefined
    if (simulation.value.err === 'InsufficientFundsForFee') {
      insufficientFunds = true
    }
    if (simulation.value.unitsConsumed) {
      units = parseInt(
        (
          simulation.value.unitsConsumed *
          (1 + computeErrorMargin / 10_000)
        ).toString(),
      )
    } else {
      units = simulation.value.err ? undefined : 500_000
    }

    return {
      units,
      insufficientFunds,
      slippageToleranceExceeded,
      simulationError: simulation.value.err,
    }
  }

  async getVersionedTransactionAndPriorityFees(
    walletPubkey: PublicKey,
    instructions: TransactionInstruction[],
    lookupTables?: AddressLookupTableAccount[],
  ): Promise<{ transaction: VersionedTransaction; priorityFees: number }> {
    //   const priorityFees = await this.fetchEstimatePriorityFees(
    //     instructions.flatMap((instruction) =>
    //       instruction.keys.map((key) => key.pubkey.toString()),
    //     ),
    //   );

    const instructionsCompiled = [
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 1000000,
      }),
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 10_000,
      }),
      ...instructions,
    ]

    const transaction = new VersionedTransaction(
      new TransactionMessage({
        instructions: instructionsCompiled,
        recentBlockhash: PublicKey.default.toString(),
        payerKey: walletPubkey,
      }).compileToV0Message(lookupTables),
    )

    return { transaction, priorityFees: 0 }
  }

  async getComputeUnitFees(
    instructions: TransactionInstruction[],
    signerKey: PublicKey,
    lookupTables?: AddressLookupTableAccount[],
  ): Promise<{
    microLamportsEstimate: number
    computeUnits: number
    insufficientFunds: boolean
    slippageToleranceExceeded: boolean
    simulationError: TransactionError | string | null
  }> {
    const { transaction, priorityFees: microLamportsEstimate } =
      await this.getVersionedTransactionAndPriorityFees(
        signerKey,
        instructions,
        lookupTables,
      )

    const {
      units: computeUnits,
      insufficientFunds,
      slippageToleranceExceeded,
      simulationError,
    } = await this.getSimulationUnitsTxn(transaction)

    return {
      microLamportsEstimate, // 0 for now
      // some instructions fail prior to executing previous ones
      // in that case we force it to be 500k for now
      computeUnits: computeUnits || 500_000,
      insufficientFunds,
      slippageToleranceExceeded,
      simulationError,
    }
  }
}
