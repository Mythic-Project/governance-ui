/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { SecondaryButton } from '@components/Button'
import Loading from '@components/Loading'
import useRealm from '@hooks/useRealm'
import { getProgramVersionForRealm } from '@models/registry/api'
import { BN } from '@coral-xyz/anchor'
import { RpcContext } from '@solana/spl-governance'
import { notify } from '@utils/notifications'
import { useState } from 'react'
import { voteRegistryDepositWithoutLockup } from 'VoteStakeRegistry/actions/voteRegistryDepositWithoutLockup'
import useDepositStore from 'VoteStakeRegistry/stores/useDepositStore'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { useRealmQuery } from '@hooks/queries/realm'
import { useUserCommunityTokenOwnerRecord } from '@hooks/queries/tokenOwnerRecord'
import { useConnection } from '@solana/wallet-adapter-react'
import queryClient from '@hooks/queries/queryClient'
import { tokenAccountQueryKeys } from '@hooks/queries/tokenAccount'
import { useVsrClient } from '../../../VoterWeightPlugins/useVsrClient'
import { CUSTOM_BIO_VSR_PLUGIN_PK } from '@constants/plugins'

const DepositCommunityTokensBtn = ({ className = '', inAccountDetails }) => {
  const { getOwnedDeposits } = useDepositStore()
  const realm = useRealmQuery().data?.result

  const { realmInfo, realmTokenAccount } = useRealm()
  const [isLoading, setIsLoading] = useState(false)
  const wallet = useWalletOnePointOh()
  const connected = !!wallet?.connected
  const { connection } = useConnection()
  const endpoint = connection.rpcEndpoint
  const currentTokenOwnerRecord =
    useUserCommunityTokenOwnerRecord().data?.result
  const { vsrClient } = useVsrClient()

  const depositAllTokens = async function () {
    if (!realm) {
      throw 'No realm selected'
    }
    setIsLoading(true)
    const tokenOwnerRecordPk =
      typeof currentTokenOwnerRecord !== 'undefined'
        ? currentTokenOwnerRecord.pubkey
        : null
    const rpcContext = new RpcContext(
      realm.owner,
      getProgramVersionForRealm(realmInfo!),
      wallet!,
      connection,
      endpoint,
    )
    try {
      const mintPk = vsrClient?.program.programId.toBase58() === CUSTOM_BIO_VSR_PLUGIN_PK ?
        await vsrClient.getRegistrarAccount(realm.pubkey, realm.account.communityMint!)
          .then(r => r?.votingMints[0].mint!) :
        realm.account.communityMint!

      await voteRegistryDepositWithoutLockup({
        rpcContext,
        fromPk: realmTokenAccount!.publicKey,
        mintPk,
        realmPk: realm.pubkey,
        programId: realm.owner,
        programVersion: realmInfo?.programVersion!,
        amount: realmTokenAccount!.account.amount,
        tokenOwnerRecordPk,
        client: vsrClient,
        communityMintPk: realm.account.communityMint,
      })
      await getOwnedDeposits({
        realmPk: realm!.pubkey,
        communityMintPk: realm!.account.communityMint,
        walletPk: wallet!.publicKey!,
        client: vsrClient!,
        connection,
      })
      queryClient.invalidateQueries(
        tokenAccountQueryKeys.byOwner(
          connection.rpcEndpoint,
          wallet!.publicKey!,
        ),
      )

      queryClient.invalidateQueries(
        ['get-custom-vsr-token-account', {
          realm: realm.pubkey.toBase58(), 
          mint: realm.account.communityMint.toBase58(), 
          pubkey: wallet?.publicKey?.toBase58()
        }]
      )
    } catch (e) {
      console.log(e)
      notify({ message: `Something went wrong ${e}`, type: 'error' })
    }
    setIsLoading(false)
  }

  const hasTokensInWallet =
    realmTokenAccount && realmTokenAccount.account.amount.gt(new BN(0))

  const depositTooltipContent = !connected
    ? 'Connect your wallet to deposit'
    : !hasTokensInWallet
    ? "You don't have any governance tokens in your wallet to deposit."
    : ''

  return hasTokensInWallet || inAccountDetails ? (
    <SecondaryButton
      tooltipMessage={depositTooltipContent}
      className={`sm:w-1/2 ${className}`}
      disabled={!connected || !hasTokensInWallet || isLoading}
      onClick={depositAllTokens}
    >
      {isLoading ? <Loading></Loading> : 'Deposit'}
    </SecondaryButton>
  ) : null
}

export default DepositCommunityTokensBtn
