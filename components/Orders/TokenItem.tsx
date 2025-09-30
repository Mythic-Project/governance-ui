import { toUiDecimals } from '@blockworks-foundation/mango-v4'
import ImgWithLoader from '@components/ImgWithLoader'
import TokenIcon from '@components/treasuryV2/icons/TokenIcon'
import { abbreviateAddress } from '@utils/formatting'
import { getTokenLabels, getTokenLabelsFromInfo } from '@utils/orders'
import tokenPriceService from '@utils/services/tokenPrice'
import { TokenInfo } from '@utils/services/types'
import { AssetAccount } from '@utils/uiTypes/assets'

export default function TokenItem({
  assetAccount,
  selectTokenAccount,
}: {
  assetAccount: AssetAccount | TokenInfo
  selectTokenAccount: (assetAccount: AssetAccount | TokenInfo) => void
}) {
  const isTokenInfo = isTokenInfoAccount(assetAccount)
  const { symbol, img, uiAmount } = !isTokenInfo
    ? getTokenLabels(assetAccount)
    : getTokenLabelsFromInfo(assetAccount)

  return (
    <div
      className="p-3 border-b flex last-of-type:border-none border-bkg-4 cursor-pointer hover:bg-bkg-1 focus:bg-bkg-1"
      onClick={() => selectTokenAccount(assetAccount)}
    >
      {!img ? (
        <TokenIcon className="h-6 w-6 stroke-white/5 mr-3" />
      ) : (
        <ImgWithLoader className="w-6 h-6 mr-3" src={img}></ImgWithLoader>
      )}
      <div>{symbol}</div>
      {uiAmount !== null ? (
        <div className="!ml-auto">{uiAmount.toFixed(4)}</div>
      ) : null}
    </div>
  )
}

function isTokenInfoAccount(
  account: AssetAccount | TokenInfo,
): account is TokenInfo {
  return (account as TokenInfo).symbol !== undefined
}
