import React, {useState, useEffect} from 'react'
import { PublicKey } from '@solana/web3.js'
import { useConnection } from '@solana/wallet-adapter-react'
import { tryGetNumber } from '@utils/formatting'
import { TokenInfo } from '@solana/spl-token-registry'
import { useOpenOrders } from '@hooks/useOpenOrders'
import { useUnsettledBalances } from '@hooks/useUnsettledBalances'
import { useRouter } from 'next/router'
import { useVoteByCouncilToggle } from '@hooks/useVoteByCouncilToggle'

// ✅ IMPORTS FIX POUR JSX
import { TrashIcon } from '@heroicons/react/solid'
import useGovernanceAssets from "@hooks/useGovernanceAssets";
import useWalletOnePointOh from "@hooks/useWalletOnePointOh";
import useQueryContext from "@hooks/useQueryContext";
import useCreateProposal from "@hooks/useCreateProposal"
import {getJupiterPricesByMintStrings} from "@hooks/queries/jupiterPrice";
import tokenPriceService from "@utils/services/tokenPrice";
import Button from "@components/Button";

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode
}
export const TrBody: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ children, ...props }) => (
    <tr {...props}>{children}</tr>
)

export const Td: React.FC<React.HTMLAttributes<HTMLTableCellElement>> = ({ children, ...props }) => (
    <td {...props}>{children}</td>
)

export const Table: React.FC<TableProps> = ({ children, ...props }) => {
  return (
      <table {...props}>
        {children}
      </table>
  )
}
export function Orders() {
  const {connection} = useConnection()
  const TOKEN_2022_PROGRAM = new PublicKey('TokenzQdW3NLMpJbA1JpRCMrF5Aw2uAzaG6qz3MabYk')

  const [buyToken, setBuyToken] = useState<TokenInfo | null>(null)
  const [sellToken, setSellToken] = useState<TokenInfo | null>(null)
  const [price, setPrice] = useState<string>('0')
  const [sellAmount, setSellAmount] = useState<string>('0')
  const [buyAmount, setBuyAmount] = useState<string>('0')
  const [sideMode, setSideMode] = useState<'Buy' | 'Sell'>('Sell')
  const [selectedSolWallet, setSelectedSolWallet] = useState<any>(null)

  const {governedTokenAccounts} = useGovernanceAssets()
  const {openOrders} = useOpenOrders(selectedSolWallet?.extensions?.transferAddress)
  const {unsettledBalances} = useUnsettledBalances(selectedSolWallet?.extensions?.transferAddress)
  const {handleCreateProposal} = useCreateProposal()
  const {fmtUrlWithCluster} = useQueryContext()
  const {voteByCouncil, shouldShowVoteByCouncilToggle, setVoteByCouncil} = useVoteByCouncilToggle()
  const wallet = useWalletOnePointOh()
  const router = useRouter()
  const connected = !!wallet?.connected

  const updateOrderPreview = (token: TokenInfo) => {
    console.log('🔄 Updating order preview for', token.symbol)
  }

  // === FETCH JUPITER PRICE ===
  useEffect(() => {
    if (!buyToken) return

    const getPrice = async () => {
      try {
        const resp = await getJupiterPricesByMintStrings([buyToken.address])
        const fetchedPrice = resp[buyToken.address]?.price

        if (fetchedPrice !== undefined) {
          setPrice(fetchedPrice.toString())
          updateOrderPreview(buyToken)
        }
      } catch (err) {
        console.error('❌ Error fetching Jupiter price:', err)
      }
    }

    getPrice()
  }, [buyToken])

// === UPDATE BUY AMOUNT ===
  useEffect(() => {
    const sellNum = new tryGetNumber()
    const priceNum = new tryGetNumber()

    // Vérifie que les deux sont bien des nombres
    setBuyAmount('0')
  }, [sellAmount, price, sideMode])



  // === SET DEFAULT WALLET ===
  useEffect(() => {
    if (!selectedSolWallet) {
      const solAccounts = governedTokenAccounts.filter((x) => x.isSol)
      if (solAccounts.length) setSelectedSolWallet(solAccounts[0])
    }
  }, [governedTokenAccounts, selectedSolWallet])

  // === RESET INPUTS WHEN WALLET CHANGES ===
  useEffect(() => {
    setSellToken(null)
    setSellAmount('0')
    setPrice('0')
    setBuyToken(null)
    setBuyAmount('0')
    setSideMode('Sell')
  }, [selectedSolWallet])

  // === JSX RENDER ===
  return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Open Orders</h2>

        {openOrders?.length ? (
            <div className="rounded-lg border border-th-bkg-4">
              <Table>
                <tbody>
                {openOrders.map((order: any, i: number) => (
                    <TrBody key={`${order.clientOrderId}-${i}`} className="hover:bg-th-bkg-3">
                      <Td>
                        <div className="flex flex-col">
   <span className={`font-body text-sm ${order.isBid ? 'text-th-up' : 'text-th-down'}`}>
  {(order.isBid ? 'BUY' : 'SELL')} {tokenPriceService.getTokenSymbol(order.baseMint.toBase58()) ?? 'UNKNOWN'}
</span>
                          <span className="text-xs text-th-fgd-4">
  {order.tokenPrice} {tokenPriceService.getTokenSymbol(order.quoteMint.toBase58()) ?? 'UNKNOWN'}
</span>
                        </div>
                      </Td>
                      <Td>
                        <Button className="bg-th-down text-th-button-text hover:bg-th-down-dark">
                          <TrashIcon className="w-4"/>
                        </Button>
                      </Td>
                    </TrBody>
                ))}
                </tbody>
              </Table>

            </div>
        ) : (
            <div className="flex items-center justify-center rounded-xl border border-th-bkg-4 p-6">
              <p>No open limit orders...</p>
            </div>
        )}
      </div>
  )
}
