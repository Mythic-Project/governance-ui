import { FunctionComponent, useMemo } from 'react'
import { LogoutIcon } from '@heroicons/react/outline'
import tokenPriceService from '@utils/services/tokenPrice'
import { fmtMintAmount } from '@tools/sdk/units'
import { PublicKey } from '@solana/web3.js'
import { Member } from '@utils/uiTypes/members'
import { MintInfo } from '@solana/spl-token'
import { useRealmQuery } from '@hooks/queries/realm'
import {
  useRealmCommunityMintInfoQuery,
  useRealmCouncilMintInfoQuery,
} from '@hooks/queries/mintInfo'
import { useRealmConfigQuery } from '@hooks/queries/realmConfig'
import { NFT_PLUGINS_PKS } from '@constants/plugins'
import { ProfileName } from '@components/Profile/ProfileName'
import { ProfileImage } from '@components/Profile'

interface MembersTabsProps {
  activeTab: Member
  onChange: (x) => void
  tabs: Array<Member>
  vsrMode?: boolean
}

const MembersTabs: FunctionComponent<MembersTabsProps> = ({
  activeTab,
  onChange,
  tabs,
  vsrMode,
}) => {
  const realm = useRealmQuery().data?.result
  const mint = useRealmCommunityMintInfoQuery().data?.result
  const councilMint = useRealmCouncilMintInfoQuery().data?.result

  const config = useRealmConfigQuery().data?.result
  const currentPluginPk = config?.account.communityTokenConfig.voterWeightAddin
  const isNftMode =
    (currentPluginPk &&
      NFT_PLUGINS_PKS.includes(currentPluginPk?.toBase58())) ||
    false

  const tokenName = realm
    ? tokenPriceService.getTokenInfo(realm?.account.communityMint.toBase58())
        ?.symbol
    : ''

  const nftName = isNftMode ? 'NFT' : undefined
  return (
    <div
      className={`overflow-y-auto relative thin-scroll`}
      style={{ maxHeight: '1065px' }}
    >
      <div
        className={`absolute bg-primary-light h-24 top-0 default-transition left-0 w-1 z-10`}
        style={{
          transform: `translateY(${
            tabs.findIndex(
              (t) => t.walletAddress === activeTab?.walletAddress,
            ) * 100
          }%)`,
        }}
      />
      {tabs.map((x) => {
        return (
          (mint || councilMint) && (
            <MemberItems
              key={x.walletAddress}
              member={x}
              mint={mint}
              councilMint={councilMint}
              activeTab={activeTab}
              tokenName={tokenName || nftName || ''}
              onChange={onChange}
              vsrMode={vsrMode}
            ></MemberItems>
          )
        )
      })}
    </div>
  )
}

export default MembersTabs

const MemberItems = ({
  member,
  mint,
  councilMint,
  activeTab,
  tokenName,
  onChange,
  vsrMode,
}: {
  member: Member
  mint?: MintInfo
  councilMint?: MintInfo
  activeTab: Member
  tokenName: string
  onChange: (member: Member) => void
  vsrMode?: boolean
}) => {
  const {
    walletAddress,
    councilVotes,
    communityVotes,
    hasCommunityTokenOutsideRealm,
    hasCouncilTokenOutsideRealm,
  } = member
  const communityAmount =
    communityVotes && !communityVotes.isZero()
      ? fmtMintAmount(mint, communityVotes)
      : null
  const councilAmount =
    councilVotes && !councilVotes.isZero()
      ? fmtMintAmount(councilMint, councilVotes)
      : null

  const renderAddressName = useMemo(() => {
    return (
      <ProfileName
        publicKey={new PublicKey(walletAddress)}
        height="12px"
        width="100px"
        dark={true}
      />
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO please fix, it can cause difficult bugs. You might wanna check out https://bobbyhadz.com/blog/react-hooks-exhaustive-deps for info. -@asktree
  }, [walletAddress])
  const renderAddressImage = useMemo(
    () => (
      <ProfileImage
        publicKey={new PublicKey(walletAddress)}
        expanded={false}
        className="w-6 h-6 text-fgd-3"
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO please fix, it can cause difficult bugs. You might wanna check out https://bobbyhadz.com/blog/react-hooks-exhaustive-deps for info. -@asktree
    [walletAddress],
  )
  return (
    <button
      key={walletAddress}
      onClick={() => onChange(member)}
      className={`cursor-pointer default-transition flex items-center h-24 px-4 relative w-full hover:bg-bkg-3 hover:rounded-md ${
        activeTab?.walletAddress === walletAddress
          ? `bg-bkg-3 rounded-md rounded-l-none text-primary-light`
          : `text-fgd-2 hover:text-primary-light`
      }
          `}
    >
      <div className="flex items-center text-left">
        <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 mr-2 rounded-full bg-bkg-4">
          {renderAddressImage}
        </div>
        <div>
          <h3 className="flex mb-1 text-base font-bold">{renderAddressName}</h3>
          {vsrMode ? (
            ''
          ) : (
            <span className="text-xs text-fgd-3">
              {(communityAmount || !councilAmount) && (
                <span className="flex items-center">
                  {tokenName} votes {communityAmount || 0}
                  {hasCommunityTokenOutsideRealm && (
                    <LogoutIcon className="w-4 h-4 ml-1"></LogoutIcon>
                  )}
                </span>
              )}
              {councilAmount && (
                <span className="flex items-center">
                  Council votes {councilAmount}{' '}
                  {hasCouncilTokenOutsideRealm && (
                    <LogoutIcon className="w-4 h-4 ml-1"></LogoutIcon>
                  )}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
