import Head from 'next/head'
import { useRouter } from 'next/router'
import { PublicKey } from '@solana/web3.js'

import { EditWalletRules } from '@hub/components/EditWalletRules'
import useSelectedRealmPubkey from '@hooks/selectedRealm/useSelectedRealmPubkey'

export default function EditWallet() {
  const router = useRouter()
  const { governanceId } = router.query

  // router queries are undefined on first load, apparently
  const governanceAddress =
    typeof governanceId === 'string' ? new PublicKey(governanceId) : undefined

  const realmPk = useSelectedRealmPubkey()

  return (
    governanceAddress &&
    realmPk && (
      <>
        <Head>
          <title>Edit Wallet Rules</title>
          <meta property="og:title" content="Edit Wallet" key="title" />
        </Head>
        <div className="dark w-full max-w-3xl mx-auto">
          <div className="dark:bg-neutral-900 rounded px-4 lg:px-8">
            <EditWalletRules
              governanceAddress={governanceAddress}
              realmPk={realmPk}
            />
          </div>
        </div>
      </>
    )
  )
}
