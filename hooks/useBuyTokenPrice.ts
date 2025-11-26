import { useState, useEffect } from 'react'
import { TokenInfo } from '@solana/spl-token-registry'
import {getJupiterPricesByMintStrings} from "@hooks/queries/jupiterPrice";

export function useBuyTokenPrice(buyToken?: TokenInfo) {
    const [price, setPrice] = useState<string | null>(null)

    useEffect(() => {
        async function getPrice() {
            if (!buyToken?.address) return
            try {
                const resp = await getJupiterPricesByMintStrings([buyToken.address])
                const fetchedPrice = resp[buyToken.address]?.price
                if (fetchedPrice) setPrice(fetchedPrice.toString())
            } catch (err) {
                console.error('Error fetching Jupiter price:', err)
            }
        }

        getPrice()
    }, [buyToken])

    return price
}
