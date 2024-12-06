import useQueryContext from '@hooks/useQueryContext'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import ThemeSwitch from './ThemeSwitch'
import { ExternalLinkIcon } from '@heroicons/react/outline'
import DialectNotifications from './Dialect'
import { useState } from 'react'

const ConnectWalletButtonDynamic = dynamic(
  async () => await import('./ConnectWalletButton'),
  { ssr: false }
)

const NavBar = () => {
  const { fmtUrlWithCluster } = useQueryContext()
  const [showTempPopup, setShowTempPopup] = useState(false)

  return (
    <div className="flex flex-col sm:grid sm:grid-cols-12 relative z-20">
      <div className="flex items-center justify-between h-20 col-span-12 px-4 xl:col-start-2 xl:col-span-10 md:px-8 xl:px-4">
        <div className="flex gap-2 sm:gap-8 items-center relative">
          <Link href={fmtUrlWithCluster('/realms')}>
            <div className="flex cursor-pointer sm:items-center min-w-[36px]">
              <picture>
                <source
                  srcSet="/img/logotype-realms-blue-white.svg"
                  media="(min-width: 640px)"
                />
                <img src="/img/logo-realms.svg" className="w-8 h-8 sm:w-24" />
              </picture>
            </div>
          </Link>
          <div 
            className="text-[#4deeea] neon-text cursor-pointer text-[15px] font-medium relative md:top-[1px]"
            onMouseEnter={() => setShowTempPopup(true)}
            onMouseLeave={() => setShowTempPopup(false)}
            onTouchStart={() => setShowTempPopup(true)}
            onTouchEnd={() => setShowTempPopup(false)}
            onPointerEnter={() => setShowTempPopup(true)}
            onPointerLeave={() => setShowTempPopup(true)}
          >
            Leaderboard
          </div>
          {
            showTempPopup &&
            <div className="p-2 border-[1px] border-[#df1fff] rounded-md absolute right-0 top-8 text-sm neon-box">
              Coming Soon
            </div>
          }
        </div>
        <div className="flex items-center justify-end space-x-2 md:space-x-4">
          <a
            className="border-b border-transparent items-center cursor-pointer -mb-[1px] transition-colors hidden sm:flex hover:border-white"
            href="https://docs.realms.today/"
            target="_blank"
            rel="noreferrer"
          >
            <div className="text-white text-sm">Read the Docs</div>
            <ExternalLinkIcon className="stroke-white h-4 w-4 ml-2" />
          </a>
          <ThemeSwitch />
          <DialectNotifications />
          <ConnectWalletButtonDynamic />
        </div>
      </div>
    </div>
  )
}

export default NavBar
