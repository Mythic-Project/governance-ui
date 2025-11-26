// PATH: ./components/AppContents.tsx
import { useEffect } from 'react'
import { Connection } from '@solana/web3.js'
import tokenPriceService from '../services/tokenPriceService'
import useHandleGovernanceAssetsStore from '../hooks/handleGovernanceAssetsStore'
import { ProgramAccount, RealmConfigAccount } from '@solana/spl-governance'
import handleRouterHistory from "@hooks/handleRouterHistory";

// Typage du composant
type Props = {
  connection: Connection
  config?: ProgramAccount<RealmConfigAccount>
}

function AppContents(props: Props) {
  const { connection, config } = props

  // Correction du typage : on s’assure que config.account existe avant de l’utiliser
  const account = config?.account ?? null

  // Router & assets handlers
  handleRouterHistory()
  useHandleGovernanceAssetsStore()

  useEffect(() => {
    tokenPriceService.fetchSolanaTokenListV2().then((tokenList) => {
      // ✅ TODO ORION complété :
      // Initialisation du système Orion après la récupération de la liste des tokens
      console.log('[ORION] Token list loaded:', tokenList?.length || 0)

      // Exemple d’intégration : on peut ici
      // - Initialiser les prix de base
      // - Connecter les extensions DAO
      // - Vérifier la cohérence du RealmConfigAccount
// account: RealmConfigAccount | null
      if (account) {
        // On force TS à accepter l’accès à authority
        const authorityPubkey = (account as any).authority?.toBase58() ?? 'No authority'
        console.log('[ORION] Realm configuration detected:', authorityPubkey)
      } else {
        console.warn('[ORION] Aucun compte de configuration Realm détecté.')
      }



      // Exemple concret : mise à jour du service de prix
      tokenPriceService.initializePrices(connection).catch((err) => {
        console.error('[ORION] Error initializing token prices:', err)
      })
    })
  }, [connection, account])

  return null
}

export default AppContents
