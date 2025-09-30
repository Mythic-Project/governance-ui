import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { PublicKey } from '@solana/web3.js'
import { SideMode } from '@utils/orders'
import TokenItem from './TokenItem'
import { AssetAccount } from '@utils/uiTypes/assets'
import tokenPriceService from '@utils/services/tokenPrice'
import Input from '@components/inputs/Input'
import { useState } from 'react'
import { TokenInfo } from '@utils/services/types'

export default function TokenSearchBox({
  mode,
  wallet,
  selectSellToken,
  selectBuyToken,
}: {
  mode: SideMode
  wallet?: PublicKey
  selectSellToken: (assetAccount: AssetAccount) => void
  selectBuyToken: (tokenInfo: TokenInfo) => void
}) {
  const { governedTokenAccountsWithoutNfts, governedNativeAccounts } =
    useGovernanceAssets()

  const [search, setSearch] = useState('')

  const availableTokenAccounts = [
    governedNativeAccounts.find(
      (x) => x.extensions.transferAddress === wallet,
    )!,
    ...(governedTokenAccountsWithoutNfts?.filter(
      (x) => wallet && x.extensions.token?.account.owner.equals(wallet),
    ) || []),
  ].filter((x) => {
    const tokenInfo = tokenPriceService._tokenList.find(
      (tokenInfo) =>
        tokenInfo.address === x?.extensions?.mint?.publicKey.toBase58(),
    )
    return (
      x?.extensions.mint?.publicKey
        .toBase58()
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      tokenInfo?.name.toLocaleLowerCase().includes(search.toLowerCase()) ||
      tokenInfo?.symbol.toLowerCase().includes(search.toLowerCase())
    )
  })

  const buyTokenList = tokenPriceService._tokenList.filter(
    (x) =>
      x.address.toLowerCase().includes(search.toLowerCase()) ||
      x.name.toLowerCase().includes(search.toLowerCase()) ||
      x.symbol.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <Input
        className="my-4"
        type="text"
        placeholder="Search token"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      ></Input>
      <div className="flex flex-col items-center border border-bkg-4 my-3 rounded ">
        <div className="flex flex-col overflow-auto max-h-[500px] w-full">
          {mode === 'Sell'
            ? availableTokenAccounts.map((acc) => (
                <TokenItem
                  selectTokenAccount={selectSellToken}
                  key={acc?.pubkey?.toBase58()}
                  assetAccount={acc}
                ></TokenItem>
              ))
            : buyTokenList.map((acc) => (
                <TokenItem
                  selectTokenAccount={selectBuyToken}
                  key={acc.address}
                  assetAccount={acc}
                ></TokenItem>
              ))}
        </div>
      </div>
    </div>
  )
}
