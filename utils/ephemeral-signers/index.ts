import { StandardWalletAdapter } from '@solana/wallet-adapter-base'
import { Wallet } from '@solana/wallet-adapter-react'
import { Keypair, PublicKey } from '@solana/web3.js'

/**
 * Outputs `num` number of ephemeral signers for a transaction, designed to be used only in cases
 * where SquadsX is the connected wallet, and a throwaway keypair is signing a transaction.
 * @arg Wallet - A standard wallet context from @solana/wallet-adapter-react
 * @arg num - The number of ephemeral signers to generate
 * @returns - An array of ephemeral signer PublicKeys
 */
export async function getEphemeralSigners(
  wallet: Wallet,
  num: number
): Promise<PublicKey[]> {
  let adapter = wallet.adapter as StandardWalletAdapter

  const features = adapter.wallet.features

  if (
    adapter &&
    'standard' in adapter &&
    SquadsGetEphemeralSignersFeatureIdentifier in features
  ) {
    const ephemeralSignerFeature = (await features[
      SquadsGetEphemeralSignersFeatureIdentifier
    ]) as EphemeralSignerFeature

    const ephemeralSigners = (await ephemeralSignerFeature.getEphemeralSigners(
      num
    )) as GetEphemeralSignersOutput

    // WIP: Types for Solana wallet adapter features can be difficult
    // @ts-ignore
    return ephemeralSigners.map((signer) => new PublicKey(signer))
  } else {
    return [Keypair.generate().publicKey]
  }
}

export type GetEphemeralSignersOutput = {
  method: 'getEphemeralSigners'
  result: {
    ok: boolean
    value: {
      addresses: string[]
    }
  }
}

export const SquadsGetEphemeralSignersFeatureIdentifier = 'fuse:getEphemeralSigners' as const

export type WalletAdapterFeature<
  FeatureName extends string,
  FeatureProperties extends Record<string, any> = {},
  FeatureMethods extends Record<string, (...args: any[]) => any> = {}
> = {
  [K in FeatureName]: FeatureProperties &
    {
      [M in keyof FeatureMethods]: (
        ...args: Parameters<FeatureMethods[M]>
      ) => ReturnType<FeatureMethods[M]>
    }
}

export type WalletWithEphemeralSigners = WalletAdapterFeature<
  'standard',
  {
    'fuse:getEphemeralSigners': EphemeralSignerFeature
  }
>

export type EphemeralSignerFeature = {
  getEphemeralSigners: (num: number) => GetEphemeralSignersOutput
}
