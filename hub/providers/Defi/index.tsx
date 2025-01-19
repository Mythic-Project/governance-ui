import { createContext } from 'react';
import useTreasuryInfo from '@hooks/useTreasuryInfo';
import { Status } from '@hub/types/Result';
import { useSavePlans } from './plans/save';
import { BigNumber } from 'bignumber.js';
import { PublicKey } from '@solana/web3.js';

export type Plan = {
  id: string;
  assets: {
    symbol: string;
    mintAddress: string;
    logo: string;
    decimals: number;
  }[];
  price?: number;
  apr: number;
  name: string;
  protocol: string;
  deposit: (amount: number, realmsWalletAddress: PublicKey) => void;
}

export type Position = {
  planId: string;
  amount: BigNumber;
  accountAddress: string;
}

interface Value {
  plans: Plan[];
  positions: Position[];
}

export const DEFAULT: Value = {
  plans: [],
  positions: [],
};

export const context = createContext(DEFAULT);

interface Props {
  children?: React.ReactNode;
}

export function DefiProvider(props: Props) {
  const data = useTreasuryInfo();
  const loadedData = data._tag === Status.Ok ? data.data : null;
  const {
    plans: savePlans,
    positions: savePositions,
  } = useSavePlans(loadedData?.wallets);

  return (
    <context.Provider
      value={{
        plans: [
          ...savePlans,
        ],
        positions: [
          ...savePositions,
        ],
      }}
    >
      {props.children}
    </context.Provider>
  );
}
