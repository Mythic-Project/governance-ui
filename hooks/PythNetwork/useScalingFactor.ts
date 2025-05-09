import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { determineVotingPowerType } from '@hooks/queries/governancePower'
import useSelectedRealmPubkey from '@hooks/selectedRealm/useSelectedRealmPubkey'
import { useConnection } from '@solana/wallet-adapter-react'
import { useAsync } from 'react-async-hook'
import { useQuery } from '@tanstack/react-query'
import { PythStakingClient } from '@pythnetwork/staking-sdk'

/**
 * Returns undefined for everything except the Pyth DAO
 */
export default function usePythScalingFactor(): number | undefined {
  const realm = useSelectedRealmPubkey()
  const { connection } = useConnection()
  const { result: plugin } = useAsync(
    async () =>
      realm && determineVotingPowerType(connection, realm, 'community'),
    [connection, realm],
  )

  const { data: scalingFactor } = useQuery(
    ['pyth-scaling-factor'],
    async (): Promise<number> => {
      const pythClient = new PythStakingClient({
        connection,
      })
      return pythClient.getScalingFactor()
    },
    { enabled: plugin == 'pyth' },
  )

  if (plugin == 'pyth') {
    return scalingFactor
  } else {
    return undefined
  }
}
