import { useState, useEffect } from 'react';
import { tsFallback, WasmExports } from '../utils/cryptoFallback';

export function useWasmLoader() {
  const [wasmLoaded, setWasmLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [wasmExports, setWasmExports] = useState<WasmExports>(tsFallback);

  useEffect(() => {
    async function loadWasm() {
      setIsLoading(true);
      try {
        // Attempt dynamically importing the generated WASM bundle
        const wasmPkg = await import(/* @vite-ignore */ '../wasm-pkg/daup_frontend_edge_wasm.js');
        
        if (wasmPkg && wasmPkg.default) {
          // Initialize the wasm module
          await wasmPkg.default();
          
          setWasmExports({
            sign_envelope: wasmPkg.sign_envelope,
            verify_envelope: wasmPkg.verify_envelope,
            dht_lookup: wasmPkg.dht_lookup
          });
          setWasmLoaded(true);
          setError(null);
        } else {
          throw new Error('Invalid WASM package structure');
        }
      } catch (err: any) {
        // Fall back to TS operations
        setWasmExports(tsFallback);
        setWasmLoaded(false);
        setError(err.message || 'WASM build not detected, operating in TypeScript Fallback Mode.');
      } finally {
        setIsLoading(false);
      }
    }

    loadWasm();
  }, []);

  return {
    wasmLoaded,
    isLoading,
    error,
    exports: wasmExports
  };
}
export type { WasmExports };
