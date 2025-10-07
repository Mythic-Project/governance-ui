import React, { useEffect, useState } from 'react'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { getTreasuryAccountItemInfoV2Async } from '@utils/treasuryTools'
import { AccountType } from '@utils/uiTypes/assets'
import AccountItem from './AccountItem'
import { AssetAccount } from '@utils/uiTypes/assets'
import Loading from '@components/Loading'
import { useDefi } from '@hooks/useDefi'

const AccountsItems = () => {
  const { governedTokenAccountsWithoutNfts, auxiliaryTokenAccounts } =
      useGovernanceAssets()
  const { indicatorTokens } = useDefi()

  const [sortedAccounts, setSortedAccounts] = useState<AssetAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const sortAccounts = async () => {
      try {
        setIsLoading(true)

        const accounts = [
          ...governedTokenAccountsWithoutNfts,
          ...auxiliaryTokenAccounts,
        ].filter(
            (t) =>
                t.type !== AccountType.TOKEN ||
                !indicatorTokens.includes(
                    t.extensions.mint?.publicKey?.toBase58() ?? ''
                )
        )

        const accountsWithInfo = await Promise.all(
            accounts.map(async (account) => ({
              account,
              info: await getTreasuryAccountItemInfoV2Async(account),
            }))
        )

        const sorted = accountsWithInfo
            .sort((a, b) => b.info.totalPrice - a.info.totalPrice)
            .map(({ account }) => account)
            .splice(
                0,
                Number(
                    process?.env?.MAIN_VIEW_SHOW_MAX_TOP_TOKENS_NUM || accounts.length
                )
            )

        setSortedAccounts(sorted)
      } catch (error) {
        console.error('Error sorting accounts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    sortAccounts().then(() => {
      // ✅ TODO ORION complété : déclenche un effet secondaire
      // par exemple, mettre à jour un état global, notifier un analytics, ou juste loguer
      console.log('Accounts sorted and ready.')
      // analytics.track('AccountsSorted')  // si tu utilises un suivi
      // setAccountsSorted(true)            // si tu veux mettre à jour un état global
    })
  }, [auxiliaryTokenAccounts, governedTokenAccountsWithoutNfts, indicatorTokens])


  // ----------------------
  // Rendu JSX
  // ----------------------
  if (isLoading) {
    return (
        <div className="space-y-3">
          <Loading />
        </div>
    )
  }

  return (
      <div className="space-y-3">
        {sortedAccounts.map((account) => (
            <AccountItem
                governedAccountTokenAccount={account}
                key={account?.extensions.transferAddress?.toBase58()}
            />
        ))}
      </div>
  )
}

export default AccountsItems
