import React from 'react'
import { TokenInfo } from '@solana/spl-token-registry'
import {useBuyTokenPrice} from "@hooks/useBuyTokenPrice";


interface BuyTokenPriceProps {
    buyToken: TokenInfo
}

export default function BuyTokenPrice({ buyToken }: BuyTokenPriceProps) {
    const price = useBuyTokenPrice(buyToken)

    return (
        <div className="text-white/70 text-sm">
            {price ? (
                <>1 {buyToken.symbol} ≈ ${price}</>
            ) : (
                <>Loading price for {buyToken.symbol}...</>
            )}
        </div>
    )
}