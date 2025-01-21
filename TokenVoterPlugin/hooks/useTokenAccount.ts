import { useConnection } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import { useQuery } from "@tanstack/react-query"
import * as token from "@solana/spl-token-new"

// Fetch ATA for Token22 Program
export function useTokenAccountByKeyQuery(ata: PublicKey | null) {
  const {connection} = useConnection()

  return useQuery({
    queryKey: ['get-token-account', {ata}],
    queryFn: async() => {
      if (!ata) return null

      try {
        return await token.getAccount(connection, ata, undefined, token.TOKEN_2022_PROGRAM_ID)
      } catch(e) {
        console.log(e)
        return null
      }
    },
    refetchOnWindowFocus: true,
    staleTime: Infinity
  })
}