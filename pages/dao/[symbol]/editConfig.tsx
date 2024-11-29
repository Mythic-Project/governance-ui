import Head from 'next/head'

import { EditRealmConfig } from '@hub/components/EditRealmConfig'
import useSelectedRealmPubkey from '@hooks/selectedRealm/useSelectedRealmPubkey'

export default function EditConfigPage() {
  const realmPk = useSelectedRealmPubkey()

  return (
    <>
      {/* We should obviously eventually refactor the queries used by EditWalletRules so that these providers aren't needed */}
      <Head>
        <title>Edit Org Config</title>
        <meta property="og:title" content="Edit Org Config" key="title" />
      </Head>
      <div className="dark">
        {realmPk && (
          <EditRealmConfig
            className="min-h-screen"
            realmUrlId={realmPk.toString()}
          />
        )}
      </div>
    </>
  )
}
