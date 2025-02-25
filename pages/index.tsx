import { useEffect } from 'react';
import { useRouter } from 'next/router';

const Index = () => {
  const router = useRouter();
  const REALM = process.env.REALM; // Process.env fonctionne directement ici

  useEffect(() => {
    const mainUrl = REALM ? `/dao/${REALM}` : '/realms';
    if (!router.asPath.includes(mainUrl)) {
      router.replace(mainUrl);
    }
  }, [REALM, router]); // Ne pas oublier d'ajouter `router` à la dépendance

  return null; // Pas besoin d'afficher quoi que ce soit
};

export default Index;