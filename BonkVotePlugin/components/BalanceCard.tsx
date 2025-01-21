import { GovernancePowerTitle } from '@components/TokenBalance/TokenBalanceCardWrapper'
import { TokenDeposit } from '@components/TokenBalance/TokenDeposit'
import { BN } from '@coral-xyz/anchor'
import {
  useRealmCommunityMintInfoQuery,
  useRealmCouncilMintInfoQuery,
} from '@hooks/queries/mintInfo'
import { useRealmQuery } from '@hooks/queries/realm'
import { useRealmVoterWeightPlugins } from '@hooks/useRealmVoterWeightPlugins'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { GoverningTokenRole } from '@solana/spl-governance'

const BonkBalanceCard = ({ role }: { role?: 'community' | 'council' }) => {
  const mint = useRealmCommunityMintInfoQuery().data?.result
  const councilMint = useRealmCouncilMintInfoQuery().data?.result
  const realm = useRealmQuery().data?.result

  const wallet = useWalletOnePointOh()
  const connected = !!wallet?.connected
  const { ownVoterWeight: communityOwnVoterWeight } =
    useRealmVoterWeightPlugins('community')
  const councilDepositVisible = realm?.account.config.councilMint !== undefined

  return (
    <>
      {mint ? (
        <div className={`${`w-full gap-8 md:gap-12`}`}>
          <GovernancePowerTitle />
          {!connected && (
            <div className={'text-xs text-white/50 mt-8'}>
              Connect your wallet to see governance power
            </div>
          )}
          <div className="w-full">
            {communityOwnVoterWeight && (
              <div className="">
                <div className="flex flex-row items-center gap-x-2">
                  <h3>Bonk Power:</h3>
                  <h3 className="">
                    {communityOwnVoterWeight.value
                      ?.div(new BN(10 ** mint.decimals))
                      .toNumber()}
                    .
                    {communityOwnVoterWeight.value
                      ?.mod(new BN(10 ** mint.decimals))
                      .toNumber()}{' '}
                  </h3>
                </div>
                <div className="text-orange text-sm mb-4">
                  <a href="https://bonkdao.com">
                    Kindly visit bonkdao.com to adjust governing power
                  </a>
                </div>
              </div>
            )}
            {councilDepositVisible && role !== 'community' && (
              <TokenDeposit
                mint={councilMint}
                tokenRole={GoverningTokenRole.Council}
                inAccountDetails={true}
              />
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="h-12 mb-4 rounded-lg animate-pulse bg-bkg-3" />
          <div className="h-10 rounded-lg animate-pulse bg-bkg-3" />
        </>
      )}
    </>
  )
}

export default BonkBalanceCard
