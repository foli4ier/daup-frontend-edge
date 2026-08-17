import React, { createContext, useContext, useState, useCallback } from 'react';
import { useWasmLoader } from '../hooks/useWasmLoader';

export interface DIDWalletContextType {
  isConnected: boolean;
  did: string | null;
  publicKey: string | null;
  privateKey: string | null;
  seed: string | null;
  connectWallet: (seed: string) => void;
  disconnectWallet: () => void;
  signMessage: (message: string) => string;
  verifySignature: (message: string, signature: string, publicKey: string) => boolean;
  wasmLoaded: boolean;
  wasmError: string | null;
  isLoadingWasm: boolean;
}

const DIDWalletContext = createContext<DIDWalletContextType | undefined>(undefined);

export const DIDWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { wasmLoaded, isLoading, error: wasmError, exports: cryptoEngine } = useWasmLoader();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [seed, setSeed] = useState<string | null>(null);
  const [did, setDid] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);

  const connectWallet = useCallback((walletSeed: string) => {
    if (!walletSeed.trim()) return;
    
    // Generate simulated DID and key pair names based on seed
    const cleanSeed = walletSeed.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    const pub = `${cleanSeed}-pub`;
    const prv = `${cleanSeed}-prv`;
    const didUri = `did:daup:${pub}`;

    setSeed(walletSeed);
    setPublicKey(pub);
    setPrivateKey(prv);
    setDid(didUri);
    setIsConnected(true);
  }, []);

  const disconnectWallet = useCallback(() => {
    setSeed(null);
    setPublicKey(null);
    setPrivateKey(null);
    setDid(null);
    setIsConnected(false);
  }, []);

  const signMessage = useCallback((message: string): string => {
    if (!isConnected || !privateKey) {
      throw new Error('Wallet is not connected');
    }
    return cryptoEngine.sign_envelope(message, privateKey);
  }, [isConnected, privateKey, cryptoEngine]);

  const verifySignature = useCallback((message: string, signature: string, pubKey: string): boolean => {
    return cryptoEngine.verify_envelope(message, signature, pubKey);
  }, [cryptoEngine]);

  return (
    <DIDWalletContext.Provider
      value={{
        isConnected,
        did,
        publicKey,
        privateKey,
        seed,
        connectWallet,
        disconnectWallet,
        signMessage,
        verifySignature,
        wasmLoaded,
        wasmError,
        isLoadingWasm: isLoading
      }}
    >
      {children}
    </DIDWalletContext.Provider>
  );
};

export const useDIDWallet = () => {
  const context = useContext(DIDWalletContext);
  if (context === undefined) {
    throw new Error('useDIDWallet must be used within a DIDWalletProvider');
  }
  return context;
};
