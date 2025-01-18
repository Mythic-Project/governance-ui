import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { getTreasuryAccountItemInfoV2Async } from '@utils/treasuryTools'
import React, { useEffect, useState } from 'react'
import AccountItem from './AccountItem'
import { AssetAccount } from '@utils/uiTypes/assets'
import Loading from '@components/Loading'

const AccountsItems = () => {
  const {
    governedTokenAccountsWithoutNfts,
    auxiliaryTokenAccounts,
  } = useGovernanceAssets()

  const [sortedAccounts, setSortedAccounts] = useState<AssetAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const sortAccounts = async () => {
      try {
        setIsLoading(true)
        const accounts = [
          ...governedTokenAccountsWithoutNfts,
          ...auxiliaryTokenAccounts,
        ]

        // Get all account info in parallel
        const accountsWithInfo = await Promise.all(
          accounts.map(async (account) => ({
            account,
            info: await getTreasuryAccountItemInfoV2Async(account),
          }))
        )

        // Sort based on the fetched info
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

    sortAccounts()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Loading></Loading>
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
