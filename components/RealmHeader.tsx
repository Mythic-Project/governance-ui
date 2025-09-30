import { useEffect, useState } from 'react'
import useRealm from 'hooks/useRealm'
import { ChartPieIcon, CogIcon, UsersIcon } from '@heroicons/react/outline'
import { ChevronLeftIcon, IdentificationIcon } from '@heroicons/react/solid'
import Link from 'next/link'
import useQueryContext from 'hooks/useQueryContext'
import { ExternalLinkIcon } from '@heroicons/react/outline'
import { getRealmExplorerHost } from 'tools/routing'
import { tryParsePublicKey } from '@tools/core/pubkey'
import { useRealmQuery } from '@hooks/queries/realm'
import { useConnection } from '@solana/wallet-adapter-react'
import { useGetOnchainMetadata } from '@hooks/useOnchainMetadata'

const RealmHeader = () => {
  const { fmtUrlWithCluster } = useQueryContext()
  const realm = useRealmQuery().data?.result
  const { REALM } = process.env
  const { connection } = useConnection()

  const { realmInfo, symbol, vsrMode } = useRealm()
  const realmData = useGetOnchainMetadata(realmInfo?.realmId).data

  const explorerHost = getRealmExplorerHost(realmInfo)
  const realmUrl = `https://${explorerHost}/account/${realmInfo?.realmId.toBase58()}${
    connection.rpcEndpoint.includes('devnet') ? '?cluster=devnet' : ''
  }`

  const [isBackNavVisible, setIsBackNavVisible] = useState(true)

  useEffect(() => {
    setIsBackNavVisible(realmInfo?.symbol !== REALM)
  }, [realmInfo?.symbol, REALM])

  return (
    <div className="px-4 pt-4 pb-4 rounded-t-lg bg-bkg-2 md:px-6 md:pt-6">
      <div
        className={`flex items-center ${
          isBackNavVisible ? 'justify-between' : 'justify-end'
        } mb-2 md:mb-4`}
      >
        {isBackNavVisible ? (
          <Link href={fmtUrlWithCluster('/realms')}>
            <a className="flex items-center text-sm transition-all default-transition text-fgd-2 hover:text-fgd-3">
              <ChevronLeftIcon className="w-6 h-6 " />
              Back
            </a>
          </Link>
        ) : null}
      </div>
      <div className="flex flex-col items-center md:flex-row md:justify-between">
        {realmData?.displayName || realmInfo?.displayName ? (
          <div className="flex items-center">
            <div className="flex flex-col items-center pb-3 md:flex-row md:pb-0">
              {realmData?.daoImage || realmInfo?.ogImage ? (
                <img
                  className="flex-shrink-0 w-8 mb-2 md:mb-0"
                  src={realmData?.daoImage || realmInfo?.ogImage}
                ></img>
              ) : (
                <div className="bg-[rgba(255,255,255,0.1)] h-14 w-14 flex font-bold items-center justify-center rounded-full text-fgd-3">
                  {realmData?.displayName.charAt(0) ||
                    realmInfo?.displayName?.charAt(0)}
                </div>
              )}
              <div className="flex items-center">
                <h1 className="ml-3">
                  {realmData?.displayName || realmInfo?.displayName}
                </h1>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-40 h-10 rounded-md animate-pulse bg-bkg-3" />
        )}
        <div className="flex items-center space-x-4">
          {vsrMode === 'default' && (
            <Link href={fmtUrlWithCluster(`/dao/${symbol}/token-stats`)}>
              <a className="flex items-center text-sm cursor-pointer default-transition text-fgd-2 hover:text-fgd-3">
                <ChartPieIcon className="flex-shrink-0 w-5 h-5 mr-1" />
                {typeof symbol === 'string' && tryParsePublicKey(symbol)
                  ? realm?.account.name
                  : symbol}{' '}
                stats
              </a>
            </Link>
          )}
          {realmData !== undefined && realm && vsrMode !== 'default' ? (
            <Link
              href={`https://v2.realms.today/dao/${realm.pubkey.toBase58()}/create-proposal`}
            >
              <a className="flex items-center text-sm cursor-pointer default-transition text-fgd-2 hover:text-fgd-3">
                <IdentificationIcon className="flex-shrink-0 w-5 h-5 mr-1" />
                {realmData ? 'Update' : 'Add'} Metadata
              </a>
            </Link>
          ) : null}
          <Link href={fmtUrlWithCluster(`/dao/${symbol}/members`)}>
            <a className="flex items-center text-sm cursor-pointer default-transition text-fgd-2 hover:text-fgd-3">
              <UsersIcon className="flex-shrink-0 w-5 h-5 mr-1" />
              Members
            </a>
          </Link>
          <Link href={fmtUrlWithCluster(`/dao/${symbol}/params`)}>
            <a className="flex items-center text-sm cursor-pointer default-transition text-fgd-2 hover:text-fgd-3">
              <CogIcon className="flex-shrink-0 w-5 h-5 mr-1" />
              Params
            </a>
          </Link>
          <a
            className="flex items-center text-sm default-transition text-fgd-2 hover:text-fgd-3"
            href={realmUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLinkIcon className="flex-shrink-0 w-5 h-5" />
          </a>
        </div>
      </div>
      {vsrMode === 'default' && realm && realmData !== undefined ? (
        <div className="w-full flex justify-end mt-4">
          <Link
            href={`https://v2.realms.today/dao/${realm.pubkey.toBase58()}/create-proposal`}
          >
            <a className="flex items-center text-sm cursor-pointer default-transition text-fgd-2 hover:text-fgd-3">
              <IdentificationIcon className="flex-shrink-0 w-5 h-5 mr-1" />
              {realmData ? 'Update' : 'Add'} Onchain Metadata
            </a>
          </Link>
        </div>
      ) : null}
    </div>
  )
}

export default RealmHeader
