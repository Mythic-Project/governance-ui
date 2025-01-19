import { useContext } from 'react';

import { context } from '@hub/providers/Defi';

export function useDefi() {
  return useContext(context);
}
