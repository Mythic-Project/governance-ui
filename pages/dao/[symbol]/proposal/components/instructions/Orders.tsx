// PATH: ./pages/dao/[symbol]/proposal/components/instructions/Mango/MangoV4/Orders.tsx

import { useState, useEffect } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useConnection } from '@solana/wallet-adapter-react'
import { TokenInfo } from '@solana/spl-token-registry'
import {getJupiterPricesByMintStrings} from "@hooks/queries/jupiterPrice";


export function Orders() {
    // === HOOKS ET ÉTATS ===
    const { connection } = useConnection()

    const TOKEN_2022_PROGRAM = new PublicKey(
        'TokenzQdW3NLMpJbA1JpRCMrF5Aw2uAzaG6qz3MabYk'
    )

    const [buyToken, setBuyToken] = useState<TokenInfo | null>(null)
    const [sellToken, setSellToken] = useState<any>(null)
    const [price, setPrice] = useState<string>('0')
    const [sellAmount, setSellAmount] = useState<string>('0')
    const [buyAmount, setBuyAmount] = useState<string>('0')
    const [sideMode, setSideMode] = useState<'Buy' | 'Sell'>('Sell')
    const [selectedSolWallet, setSelectedSolWallet] = useState<any>(null)

    // === FONCTION POUR METTRE À JOUR LA PRÉVISUALISATION ===
    const updateOrderPreview = (token: TokenInfo) => {
        console.log('Updating order preview for', token.symbol)
        // Ici tu pourras ajouter de la logique plus poussée plus tard
    }

    // === EXEMPLE DE USEEFFECT POUR RÉCUPÉRER LES PRIX ===
    useEffect(() => {
        if (!buyToken) return

        const getPrice = async () => {
            try {
                const resp = await getJupiterPricesByMintStrings([buyToken.address])
                const fetchedPrice = resp[buyToken.address]?.price

                if (fetchedPrice) {
                    setPrice(fetchedPrice.toString())
                    console.log(`ORION: Price updated for ${buyToken.symbol}`)
                    updateOrderPreview(buyToken)
                } else {
                    console.warn(`No price found for token ${buyToken.address}`)
                }
            } catch (err) {
                console.error('Error fetching Jupiter price:', err)
            }
        }

        getPrice().then(_r => {
            // TODO ORION
        })
    }, [buyToken])

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold">Orders Component</h2>
            <p>Price: {price}</p>
            <p>Sell Amount: {sellAmount}</p>
            <p>Buy Amount: {buyAmount}</p>
            <p>Mode: {sideMode}</p>
        </div>
    )
}