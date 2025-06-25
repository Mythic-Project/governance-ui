import useRealm from '@hooks/useRealm'
import dynamic from 'next/dynamic'
import { ChevronRightIcon } from '@heroicons/react/solid'
import useQueryContext from '@hooks/useQueryContext'
import GatewayCard from '@components/Gateway/GatewayCard'
import ClaimUnreleasedNFTs from './ClaimUnreleasedNFTs'
import Link from 'next/link'
import { useAddressQuery_CommunityTokenOwner } from '@hooks/queries/addresses/tokenOwnerRecord'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { useUserCommunityTokenOwnerRecord } from '@hooks/queries/tokenOwnerRecord'
import ClaimUnreleasedPositions from 'HeliumVotePlugin/components/ClaimUnreleasedPositions'
import VanillaAccountDetails from './VanillaAccountDetails'
import GovernancePowerCard from '@components/GovernancePower/GovernancePowerCard'
import SelectPrimaryDelegators from '@components/SelectPrimaryDelegators'
import PythAccountDetails from 'PythVotePlugin/components/PythAccountDetails'
import { useRealmVoterWeightPlugins } from '@hooks/useRealmVoterWeightPlugins'
import { ReactNode } from 'react'
import QuadraticVotingPower from '@components/ProposalVotingPower/QuadraticVotingPower'
import VanillaVotingPower from '@components/GovernancePower/Power/Vanilla/VanillaVotingPower'
import React from 'react'
import ParclAccountDetails from 'ParclVotePlugin/components/ParclAccountDetails'
import BonkBalanceCard from 'BonkVotePlugin/components/BalanceCard'
import TokenVoterBalanceCard from 'TokenVoterPlugin/components/BalanceCard'
import { USDC_MINT } from '@blockworks-foundation/mango-v4'
import { SecondaryButton } from '@components/Button'
import ImgWithLoader from '@components/ImgWithLoader'
import TokenIcon from '@components/treasuryV2/icons/TokenIcon'
import { useRealmQuery } from '@hooks/queries/realm'
import { abbreviateAddress } from '@utils/formatting'
import tokenPriceService from '@utils/services/tokenPrice'

const LockPluginTokenBalanceCard = dynamic(
  () =>
    import(
      'VoteStakeRegistry/components/TokenBalance/LockPluginTokenBalanceCard'
    ),
)

const HeliumVotingPowerCard = dynamic(() =>
  import('HeliumVotePlugin/components/VotingPowerCard').then((module) => {
    const { VotingPowerCard } = module
    return VotingPowerCard
  }),
)

const NftVotingPower = dynamic(
  () => import('../ProposalVotingPower/NftVotingPower'),
)

export const GovernancePowerTitle = () => {
  const { symbol } = useRealm()
  const { fmtUrlWithCluster } = useQueryContext()
  const wallet = useWalletOnePointOh()
  const connected = !!wallet?.connected
  const { data: tokenOwnerRecordPk } = useAddressQuery_CommunityTokenOwner()

  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="mb-0">My governance power</h3>
      <Link href={fmtUrlWithCluster(`/dao/${symbol}/account/me`)}>
        <a
          className={`default-transition flex items-center text-fgd-2 text-sm transition-all hover:text-fgd-3 ${
            !connected || !tokenOwnerRecordPk
              ? 'opacity-50 pointer-events-none'
              : ''
          }`}
        >
          View
          <ChevronRightIcon className="flex-shrink-0 w-6 h-6" />
        </a>
      </Link>
    </div>
  )
}

const TokenBalanceCardInner = ({
  inAccountDetails,
}: {
  inAccountDetails?: boolean
}) => {
  const ownTokenRecord = useUserCommunityTokenOwnerRecord().data?.result
  const { plugins } = useRealmVoterWeightPlugins('community')
  const requiredCards = plugins?.voterWeight.map((plugin) => plugin.name)

  const showHeliumCard = requiredCards?.includes('HeliumVSR')
  const showDefaultVSRCard = requiredCards?.includes('VSR')
  const showPythCard = requiredCards?.includes('pyth')
  const showNftCard = requiredCards?.includes('NFT')
  const showGatewayCard = requiredCards?.includes('gateway')
  const showQvCard = requiredCards?.includes('QV')
  const showParclCard = requiredCards?.includes('parcl')
  const showBonkCard = requiredCards?.includes('bonk')
  const showTokenVoterCard = requiredCards?.includes('token_voter')

  if (showDefaultVSRCard && inAccountDetails) {
    return <LockPluginTokenBalanceCard inAccountDetails={inAccountDetails} /> // does this ever actually occur in the component hierarchy?
  }

  const cards: ReactNode[] = []

  if (
    showHeliumCard &&
    (!ownTokenRecord ||
      ownTokenRecord.account.governingTokenDepositAmount.isZero())
  ) {
    cards.push(
      <React.Fragment key="helium">
        {!inAccountDetails && <GovernancePowerTitle />}
        <HeliumVotingPowerCard inAccountDetails={inAccountDetails} />
        <ClaimUnreleasedPositions inAccountDetails={inAccountDetails} />
      </React.Fragment>,
    )
  }

  if (showNftCard && inAccountDetails) {
    cards.push(
      <div className="grid grid-cols-2 gap-x-2 w-full" key="nft">
        <div>
          <NftVotingPower inAccountDetails={inAccountDetails} />
          <ClaimUnreleasedNFTs inAccountDetails={inAccountDetails} />
        </div>
        <VanillaAccountDetails />
      </div>,
    )
  }

  if (showBonkCard) {
    cards.push(
      <React.Fragment key="bonk">{<BonkBalanceCard />}</React.Fragment>,
    )
  }

  if (showPythCard) {
    cards.push(
      <React.Fragment key="pyth">
        {inAccountDetails ? <PythAccountDetails /> : <GovernancePowerCard />}
      </React.Fragment>,
    )
  }

  if (showTokenVoterCard) {
    cards.push(
      <React.Fragment key="token_voter">
        {<TokenVoterBalanceCard />}
      </React.Fragment>,
    )
  }

  if (showGatewayCard) {
    cards.push(
      <React.Fragment key="gateway">
        {inAccountDetails ? (
          <GatewayCard role="community" />
        ) : (
          <GovernancePowerCard />
        )}
      </React.Fragment>,
    )
  }

  if (showQvCard) {
    cards.push(
      <React.Fragment key="qv">
        {inAccountDetails && (
          <>
            <QuadraticVotingPower role="community" />
            <VanillaVotingPower role="council" hideIfZero />
          </>
        )}
      </React.Fragment>,
    )
  }

  if (showParclCard) {
    cards.push(
      <React.Fragment key="parcl">
        {!inAccountDetails && <GovernancePowerTitle />}
        <ParclAccountDetails />
      </React.Fragment>,
    )
  }

  //Default
  if (cards.length === 0) {
    cards.push(
      <React.Fragment key="vanilla">
        {inAccountDetails ? <VanillaAccountDetails /> : <GovernancePowerCard />}
      </React.Fragment>,
    )
  }

  return <>{cards}</>
}

export const GovernanceTokenSwap = () => {
  const realm = useRealmQuery().data?.result
  const realmAccount = realm?.account
  const communityMint = realmAccount?.communityMint.toBase58()
  let tokenInfo = tokenPriceService._tokenList.find(
    (x) => x.address === communityMint,
  )

  if (communityMint === 'ELPrcU7qRV3DUz8AP6siTE7GkR3gkkBvGmgBRiLnC19Y') {
    //@ts-ignore
    tokenInfo = { symbol: 'SFM' }
  }

  return communityMint && tokenInfo ? (
    <div className="flex items-center justify-end py-2">
      <SecondaryButton
        className="relative -bottom-[18px] -right-[15px] rounded-none border-0"
        onClick={() => {
          window.open(
            `https://cabana.exchange/swap/${USDC_MINT.toBase58()}-${communityMint.toString()}?daoRef=realms`,
            '_blank',
          )
        }}
      >
        <div className="flex items-center space-x-1">
          <span>Swap</span>
          <span>
            {tokenInfo?.symbol
              ? tokenInfo.symbol
              : abbreviateAddress(communityMint)}{' '}
          </span>
          {tokenInfo?.logoURI ? (
            <ImgWithLoader
              className="ml-1 h-4 w-4"
              src={tokenInfo?.logoURI}
            ></ImgWithLoader>
          ) : (
            <TokenIcon className="ml-1 h-4 w-4 stroke-white" />
          )}{' '}
        </div>
      </SecondaryButton>
    </div>
  ) : null
}

const TokenBalanceCardWrapper = ({
  inAccountDetails,
}: {
  inAccountDetails?: boolean
}) => {
  return (
    <div
      className={`rounded-lg bg-bkg-2 ${inAccountDetails ? `` : `p-4 md:p-6`}`}
    >
      <TokenBalanceCardInner inAccountDetails={inAccountDetails} />
      <SelectPrimaryDelegators />
      <GovernanceTokenSwap></GovernanceTokenSwap>
    </div>
  )
}

export default TokenBalanceCardWrapper
