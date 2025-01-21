import VanillaVotingPower from "@components/GovernancePower/Power/Vanilla/VanillaVotingPower"
import VotingPowerPct from "@components/ProposalVotingPower/VotingPowerPct"
import { GovernancePowerTitle } from "@components/TokenBalance/TokenBalanceCardWrapper"
import { getMintMetadata } from "@components/instructions/programs/splToken"
import { BN } from "@coral-xyz/anchor"
import { useMintInfoByPubkeyQuery, useRealmCommunityMintInfoQuery } from "@hooks/queries/mintInfo"
import { useRealmQuery } from "@hooks/queries/realm"
import { useRealmVoterWeightPlugins } from "@hooks/useRealmVoterWeightPlugins"
import useWalletOnePointOh from "@hooks/useWalletOnePointOh"
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token-new"
import { PublicKey } from "@solana/web3.js"
import { useTokenAccountByKeyQuery } from "TokenVoterPlugin/hooks/useTokenAccount"
import BigNumber from "bignumber.js"
import { useEffect, useMemo, useState } from "react"
import DepositButton from "./Deposit"
import WithdrawButton from "./Withdraw"

const TokenVoterBalanceCard = ({role} : {role?: 'community' | 'council'}) => {
  const [power, setPower] = useState(new BN(0))
  const mint = useRealmCommunityMintInfoQuery().data?.result
  const {plugins} = useRealmVoterWeightPlugins('community')
  const pluginParams = plugins?.voterWeight[0].params as any
  const pluginMintKey = pluginParams?.votingMintConfigs?.[0].mint ? 
    pluginParams.votingMintConfigs[0].mint :
    undefined

  const pluginMint = useMintInfoByPubkeyQuery(pluginMintKey).data?.result
  const realm = useRealmQuery().data?.result

  const wallet = useWalletOnePointOh()

  const ataKey = getAssociatedTokenAddressSync(
    pluginMintKey ?? PublicKey.default, 
    wallet?.publicKey ?? PublicKey.default, 
    undefined, 
    TOKEN_2022_PROGRAM_ID
  )

  const userPluginAta = useTokenAccountByKeyQuery(ataKey).data
  
  const connected = !!wallet?.connected
  const {
    ownVoterWeight: communityOwnVoterWeight,
  } = useRealmVoterWeightPlugins('community')
  
  const councilDepositVisible = realm?.account.config.councilMint !== undefined
 
  useEffect(() => {
    if (communityOwnVoterWeight?.value) {
      setPower(communityOwnVoterWeight?.value)
    }
  }, [communityOwnVoterWeight])

  const formattedTotal = useMemo(
    () =>
      mint && communityOwnVoterWeight?.value
        ? new BigNumber(power.toString())
            .shiftedBy(-mint.decimals)
            .toString()
        : undefined,
    [mint, power]
  )

  const tokenName =
    getMintMetadata(pluginMintKey)?.name ?? realm?.account.name ?? ''

  const showDeposit = userPluginAta && userPluginAta.amount > BigInt(0)
  const showWithdraw = power && power.gt(new BN(0))

  const formattedAvailableTokens = useMemo(
    () =>
      mint && userPluginAta?.amount
        ? new BigNumber(userPluginAta.amount.toString())
            .shiftedBy(-mint.decimals)
            .toString()
        : undefined,
    [mint, userPluginAta]
  )
  
  return (
      <>
          {mint ? (
              <div className={`${`w-full gap-8 md:gap-12`}`}>
                  <GovernancePowerTitle />
                  {!connected && (
                    <div className={'text-xs text-white/50 mt-8 mb-2'}>
                      Connect your wallet to see governance power
                    </div>
                  )}
                  <div className="w-full"> 
                    <div className='p-3 rounded-md bg-bkg-1 mb-2'>
                      <div className="text-fgd-3 text-xs">
                        {tokenName}
                        {role === 'council' ? ' Council' : ''} votes
                      </div>
                    <div className="flex items-center justify-between mt-1">
                    <div className=" flex flex-row gap-x-2">
                      <div className="text-xl font-bold text-fgd-1 hero-text">
                        {formattedTotal ?? 0}
                      </div>
                    </div>
                    </div>
                    {pluginMint && communityOwnVoterWeight?.value && (
                      <VotingPowerPct
                        amount={new BigNumber(communityOwnVoterWeight.value.toString())}
                        total={new BigNumber(pluginMint.supply.toString())}
                      />
                    )}
                  </div>
                  {connected && <div className="flex flex-col gap-1 mt-2">
                      {showDeposit &&
                        <p className="text-xs font-semibold">
                          You have {formattedAvailableTokens} {tokenName} tokens to deposit
                        </p>
                      }
                      <div className="flex gap-1 mt-2 mb-4">
                        <DepositButton showDeposit={showDeposit} setPower={setPower}/>
                        <WithdrawButton showWithdraw={showWithdraw} setPower={setPower} />
                      </div>
                    </div>
                  }
                  {councilDepositVisible && role !== 'community' && wallet?.connected && (
                    <VanillaVotingPower className="w-full" role="council" />
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

export default TokenVoterBalanceCard
