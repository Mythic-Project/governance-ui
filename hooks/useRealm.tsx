import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { CUSTOM_BIO_VSR_PLUGIN_PK, NFT_PLUGINS_PKS } from '@constants/plugins'
import { useVsrMode } from './useVsrMode'
import { useRealmQuery } from './queries/realm'
import {
    useUserCommunityTokenOwnerRecord,
    useUserCouncilTokenOwnerRecord,
} from './queries/tokenOwnerRecord'
import { useRealmConfigQuery } from './queries/realmConfig'
import { useSelectedRealmInfo } from './selectedRealm/useSelectedRealmRegistryEntry'
import { useTokenAccountForCustomVsrQuery, useUserTokenAccountsQuery } from './queries/tokenAccount'
import { PublicKey } from '@metaplex-foundation/js'

export default function useRealm() {
    const router = useRouter()
    const { symbol } = router.query

    const { data: tokenAccounts } = useUserTokenAccountsQuery()
    const realm = useRealmQuery().data?.result
    const realmInfo = useSelectedRealmInfo()
    const { data: vsrTokenAccount } = useTokenAccountForCustomVsrQuery()

    const config = useRealmConfigQuery().data?.result
    const currentPluginPk = config?.account?.communityTokenConfig?.voterWeightAddin

    const ownTokenRecord = useUserCommunityTokenOwnerRecord().data?.result
    const ownCouncilTokenRecord = useUserCouncilTokenOwnerRecord().data?.result

    const realmTokenAccount = useMemo(() => {
        if (currentPluginPk?.equals(new PublicKey(CUSTOM_BIO_VSR_PLUGIN_PK))) {
            return vsrTokenAccount
        }
        return realm && tokenAccounts?.find((a) =>
            a.account.mint.equals(realm.account.communityMint),
        )
    }, [realm, tokenAccounts, vsrTokenAccount, currentPluginPk])

    const councilTokenAccount = useMemo(() => {
        return realm && tokenAccounts?.find(
            (a) =>
                realm.account.config.councilMint &&
                a.account.mint.equals(realm.account.config.councilMint),
        )
    }, [realm, tokenAccounts])

    const realmCfgMaxOutstandingProposalCount = 10
    const toManyCommunityOutstandingProposalsForUser =
        (ownTokenRecord?.account.outstandingProposalCount ?? 0) >= realmCfgMaxOutstandingProposalCount

    const toManyCouncilOutstandingProposalsForUser =
        (ownCouncilTokenRecord?.account.outstandingProposalCount ?? 0) >= realmCfgMaxOutstandingProposalCount

    const vsrMode = useVsrMode()
    const isNftMode = currentPluginPk && NFT_PLUGINS_PKS.includes(currentPluginPk.toBase58())

    return useMemo(() => ({
        realmInfo,
        symbol,
        realmTokenAccount,
        councilTokenAccount,
        toManyCommunityOutstandingProposalsForUser,
        toManyCouncilOutstandingProposalsForUser,
        currentPluginPk,
        vsrMode,
        isNftMode,
    }), [
        councilTokenAccount,
        currentPluginPk,
        isNftMode,
        realmInfo,
        realmTokenAccount,
        symbol,
        toManyCommunityOutstandingProposalsForUser,
        toManyCouncilOutstandingProposalsForUser,
        vsrMode,
    ])
}
