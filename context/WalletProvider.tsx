// PATH: ./context/WalletProvider.tsx
import React, { createContext, ReactNode, useCallback, useState } from "react";
import { PublicKey } from "@solana/web3.js";

// Define the context type
export interface WalletContextType {
    publicKey: PublicKey | null;
    setWallet: (key: PublicKey | null) => void;
    resetWallet: () => void;
}

// Create the context with default no-op implementations
export const WalletContext = createContext<WalletContextType>({
    publicKey: null,
    setWallet: () => console.warn('setWallet called outside of provider'),
    resetWallet: () => console.warn('resetWallet called outside of provider'),
});

// WalletProvider component
export const WalletProvider = ({ children }: { children: ReactNode }) => {
    const [publicKey, setPublicKeyState] = useState<PublicKey | null>(null);

    const setWallet = useCallback((key: PublicKey | null) => {
        if (key) console.log('Wallet set:', key.toBase58());
        else console.log('Wallet set to null');
        setPublicKeyState(key);
    }, []);

    const resetWallet = useCallback(() => {
        console.log('Wallet reset');
        setPublicKeyState(null);
    }, []);

    return (
        <WalletContext.Provider value={{ publicKey, setWallet, resetWallet }}>
            {children}
        </WalletContext.Provider>
    );
};
