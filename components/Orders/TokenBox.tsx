import { ArrowDown } from '@carbon/icons-react'
import ImgWithLoader from '@components/ImgWithLoader'
import TokenIcon from '@components/treasuryV2/icons/TokenIcon'

export default function TokenBox({
  img,
  symbol,
  uiAmount,
  onClick,
  disabled,
}: {
  img?: string
  symbol?: string
  uiAmount?: number
  onClick?: () => void
  disabled: boolean
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center border border-fgd-3 p-3 my-3 cursor-pointer hover:border-primary-light focus:border-primary-light bg-bkg-1 rounded-md ${
        disabled ? 'opacity-70 pointer-events-none' : ''
      }`}
    >
      <>
        <div className="mr-3">
          {!img ? (
            <TokenIcon className="h-10 w-10 stroke-white/50" />
          ) : (
            <ImgWithLoader className="w-6 h-6" src={img}></ImgWithLoader>
          )}
        </div>
        <div className="text-xs">{symbol ? symbol : 'No token selected'}</div>
        <div className="ml-auto flex items-center">
          <div className="pr-2">{uiAmount ? uiAmount?.toFixed(4) : ''}</div>
          <ArrowDown></ArrowDown>
        </div>
      </>
    </div>
  )
}
