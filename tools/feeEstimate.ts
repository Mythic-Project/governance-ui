import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'
import axios from 'axios'

export const getFeeEstimate = async (connection: Connection) => {
  const defaultFee = 100000
  try {
    const response = await axios.request({
      url: connection.rpcEndpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        method: 'getRecentPrioritizationFees',
        jsonrpc: '2.0',
        params: [
          ['RNXnAJV1DeBt6Lytjz4wYzvS3d6bhsfidS5Np4ovwZz'],
          {
            percentile: 5050,
          },
        ],
        id: '1',
      }),
    })

    // compute budget unit price is in micro lamports.
    // 0.001 * 10**9 is very small.
    // Calculate average of top 100 fees to get a competitive rate

    const fees =
      response.data.result.map((entry) => entry.prioritizationFee) || []
    const topFees = fees.sort((a, b) => b - a).slice(0, 100)
    const averageFee =
      topFees.length > 0
        ? Math.ceil(topFees.reduce((sum, fee) => sum + fee, 0) / topFees.length)
        : 0
    console.log(averageFee)
    return Math.min(averageFee, LAMPORTS_PER_SOL * 0.0009)
  } catch (e) {
    return defaultFee
  }
}
