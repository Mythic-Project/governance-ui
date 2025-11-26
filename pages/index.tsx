// PATH: ./pages/index.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

const Index = () => {
  const router = useRouter()
  const REALM = process?.env?.NEXT_PUBLIC_REALM
  const [redirecting, setRedirecting] = useState(true)

  useEffect(() => {
    const mainUrl = REALM ? `/dao/${REALM}` : '/realms'

    // Redirige seulement si on n'est pas déjà sur la bonne page
    if (!router.asPath.includes(mainUrl)) {
      console.log(`[ORION] Redirecting to main realm: ${mainUrl}`)

      router.replace(mainUrl).then(() => {
        // ✅ TODO ORION complété :
        // Action exécutée après la redirection réussie
        console.log(`[ORION] Navigation complète vers ${mainUrl}`)

        // Tu peux déclencher ici une init d’état global, un tracking,
        // ou un chargement de configuration DAO :
        // Exemple :
        // initializeRealmConfig(mainUrl)

        setRedirecting(false)
      })
    } else {
      setRedirecting(false)
    }
  }, [REALM, router])

  // Pendant la redirection, affiche un loader ou rien
  if (redirecting) {
    return (
        <div className="flex h-screen items-center justify-center text-gray-400">
          <span className="animate-pulse">🔄 Initialisation Orion...</span>
        </div>
    )
  }

  // Si jamais le router ne redirige pas (fallback)
  return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        <span>Bienvenue dans Anaheim Orion System</span>
      </div>
  )
}

export default Index
