import { ArrowRightIcon } from '@heroicons/react/outline'

const MANGO_DAO_PK = 'DPiH3H3c7t47BMxqTxLsuPQpEC6Kne8GA9VXbxpnZxFE'
const DISTRIBUTION_URL = `https://v2.realms.today/dao/${MANGO_DAO_PK}/distribute`

interface MangoDistributionBannerProps {
  realmPk: string | undefined
}

const MangoDistributionBanner = ({ realmPk }: MangoDistributionBannerProps) => {
  if (realmPk !== MANGO_DAO_PK) {
    return null
  }

  return (
    <div className="mx-4 md:mx-6 mt-4 rounded-lg bg-bkg-3 border border-fgd-4 p-4">
      <a
        href={DISTRIBUTION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500">
            <span className="text-lg">🥭</span>
          </div>
          <div>
            <h4 className="text-fgd-1 font-semibold">Mango DAO Distribution</h4>
            <p className="text-fgd-3 text-sm">Claim your tokens from the treasury distribution</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-primary-light">
          <span className="hidden sm:inline font-medium">Claim Now</span>
          <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </a>
    </div>
  )
}

export default MangoDistributionBanner
