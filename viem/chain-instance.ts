import type { Chain } from 'viem';
import * as chains from 'viem/chains';
import { ChainKit } from './chain-kit';
import { getWrappedNativeToken } from './tokens/wrapped';

/**
 * ChainInstance - Global singleton map of chainId → ChainKit
 */
export class ChainInstance {
    private static instances = new Map<number, ChainKit>();

    /**
     * Get ChainKit for a chain (creates singleton if doesn't exist)
     * @param chainIdOrName - Chain ID (8453), name ('base'), or Chain object
     * @returns ChainKit singleton for the chain
     *
     * @example
     * const base = ChainInstance.for('base');
     * const optimism = ChainInstance.for(10);
     * const custom = ChainInstance.for(myCustomChain);
     */
    static for(chainIdOrNameOrChain: number | string | Chain): ChainKit {
        let chainId: number;
        let chain: Chain;

        // If it's already a Chain object
        if (typeof chainIdOrNameOrChain === 'object' && 'id' in chainIdOrNameOrChain) {
            chain = chainIdOrNameOrChain;
            chainId = chain.id;
        } else if (typeof chainIdOrNameOrChain === 'number') {
            chainId = chainIdOrNameOrChain;
            // Find chain by ID
            chain = Object.values(chains).find((c: any) => c?.id === chainId) as Chain;
            if (!chain)
                throw new Error(
                    `Chain ID ${chainId} not found in viem chains. Use ChainInstance.for(customChain) for custom chains.`
                );
        } else {
            // Find chain by name
            chain = (chains as any)[chainIdOrNameOrChain];
            if (!chain) {
                const available = Object.keys(chains)
                    .filter((k) => !k.includes('__'))
                    .slice(0, 20)
                    .join(', ');
                throw new Error(`Chain '${chainIdOrNameOrChain}' not found. Available: ${available}... (400+ total)`);
            }
            chainId = chain.id;
        }

        // Return existing or create new singleton
        if (!this.instances.has(chainId)) {
            // Try to get wrapped token from registry, pass null if not found to avoid error
            const wrappedToken = getWrappedNativeToken(chainId);
            this.instances.set(chainId, new ChainKit(chain, wrappedToken ?? null));
        }

        return this.instances.get(chainId)!;
    }

    /**
     * Check if chain is already initialized
     */
    static has(chainIdOrName: number | string): boolean {
        if (typeof chainIdOrName === 'number') {
            return this.instances.has(chainIdOrName);
        }
        const chain = (chains as any)[chainIdOrName];
        return chain ? this.instances.has(chain.id) : false;
    }

    /**
     * Get all initialized chains
     */
    static getAll(): ChainKit[] {
        return Array.from(this.instances.values());
    }

    /**
     * Clear all registries (for testing)
     */
    static clear(): void {
        this.instances.clear();
    }

    /**
     * Clear specific chain
     */
    static clearChain(chainIdOrName: number | string): void {
        if (typeof chainIdOrName === 'number') {
            this.instances.delete(chainIdOrName);
        } else {
            const chain = (chains as any)[chainIdOrName];
            if (chain) this.instances.delete(chain.id);
        }
    }
}
