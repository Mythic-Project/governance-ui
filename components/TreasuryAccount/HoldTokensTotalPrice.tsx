import Button, { SecondaryButton } from '@components/Button'
import useQueryContext from '@hooks/useQueryContext'
import { useTotalTreasuryPrice } from '@hooks/useTotalTreasuryPrice'
import { formatNumber } from '@utils/formatNumber'
import { useRouter } from 'next/router'

const HoldTokensTotalPrice = () => {
  const { totalPriceFormatted } = useTotalTreasuryPrice()
  const { symbol } = useRouter().query
  const router = useRouter()
  const { fmtUrlWithCluster } = useQueryContext()

  return (
    <div className="bg-bkg-1 mb-3 px-4 py-2 rounded-md w-full">
      <p className="text-fgd-3">Treasury Balance</p>
      <span className="hero-text flex items-center">
        <div className="mr-3">{`$${formatNumber(totalPriceFormatted)}`}</div>
        <SecondaryButton
          className="ml-auto"
          small
          onClick={() =>
            router.push(fmtUrlWithCluster(`/dao/${symbol}/treasury/orders`))
          }
        >
          Limit Orders
        </SecondaryButton>
      </span>
    </div>
  )
}

export default HoldTokensTotalPrice
