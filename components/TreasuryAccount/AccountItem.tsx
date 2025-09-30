import { useEffect, useState, useMemo } from 'react'
import { getTreasuryAccountItemInfoV2Async } from '@utils/treasuryTools'
import { AssetAccount } from '@utils/uiTypes/assets'
import TokenIcon from '@components/treasuryV2/icons/TokenIcon'
import { useTokenMetadata } from '@hooks/queries/tokenMetadata'

const AccountItem = ({
  governedAccountTokenAccount,
}: {
  governedAccountTokenAccount: AssetAccount
}) => {
  const [accountAssetInfo, setAccountAssetInfo] = useState({
    amountFormatted: '',
    logo: '',
    name: '',
    symbol: '',
    displayPrice: '',
  })

  useEffect(() => {
    const fetchAccounAssetInfo = async () => {
      try {
        const info = await getTreasuryAccountItemInfoV2Async(
          governedAccountTokenAccount,
        )
        setAccountAssetInfo(info)
      } catch (error) {
        console.error('Error fetching treasury account info:', error)
      }
    }

    fetchAccounAssetInfo()
  }, [governedAccountTokenAccount])

  const { data } = useTokenMetadata(
    governedAccountTokenAccount.extensions.mint?.publicKey,
    !accountAssetInfo.logo,
  )

  const symbolFromMeta = useMemo(() => {
    return data?.symbol
  }, [data?.symbol])

  const { amountFormatted, logo, name, symbol, displayPrice } = accountAssetInfo

  return (
    <div className="flex items-center w-full p-3 border rounded-lg text-fgd-1 border-fgd-4">
      {logo ? (
        <img
          className={`flex-shrink-0 h-6 w-6 mr-2.5 mt-0.5 ${
            governedAccountTokenAccount.isSol && 'rounded-full'
          }`}
          src={logo}
          onError={({ currentTarget }) => {
            currentTarget.onerror = null // prevents looping
            currentTarget.hidden = true
          }}
        />
      ) : (
        <TokenIcon
          className={`flex-shrink-0 h-6 w-6 mr-2.5 mt-0.5 fill-current`}
        ></TokenIcon>
      )}
      <div className="w-full">
        <div className="flex items-start justify-between mb-1">
          <div className="text-sm font-semibold text-th-fgd-1">{name}</div>
        </div>
        <div className="text-xs text-fgd-3">
          {amountFormatted} {symbolFromMeta ? symbolFromMeta : symbol}
        </div>
        <div className="mt-0.5 text-fgd-3 text-xs">≈${displayPrice || 0}</div>
      </div>
    </div>
  )
}

export default AccountItem
