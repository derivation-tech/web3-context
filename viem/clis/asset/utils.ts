import fs from 'fs';
import path from 'path';
import type { Address } from 'viem';
import { getAddress } from 'viem';

/**
 * Utility functions for the Asset CLI
 */

/**
 * Get RPC URL for a given chainName with environment variable support
 * @param chainName - Network name (e.g., 'base', 'mainnet', 'arbitrum')
 * @returns RPC URL string
 */
export function getRpcUrl(chainName: string): string {
    // Check for specific chainName RPC environment variable
    const networkRpcKey = `${chainName.toUpperCase()}_RPC`;
    const networkRpc = process.env[networkRpcKey];
    if (networkRpc) {
        return networkRpc;
    }

    throw new Error(`RPC URL not found for ${chainName}. Please set ${networkRpcKey} environment variable.`);
}

/**
 * Read signerId and address mappings from a file or all files in a directory.
 * Each non-empty, non-comment line should be:
 *   <signerId> <address1> [address2] ...
 * Returns a flat list of { name: signerId, address }.
 */
export function readSignerAddressFiles(inputPath?: string): Array<{ name: string; address: Address }> {
    const mappings: Array<{ name: string; address: Address }> = [];

    // Collect paths from input and environment variable
    const envPath = process.env.ADDRESS_PATH;
    const candidatePaths: string[] = [];
    if (inputPath && inputPath.trim().length > 0) candidatePaths.push(inputPath.trim());
    if (envPath && envPath.trim().length > 0) candidatePaths.push(...envPath.split(',').map((p) => p.trim()).filter(Boolean));

    if (candidatePaths.length === 0) {
        throw new Error('No address path provided. Provide a path argument or set ADDRESS_PATH in environment.');
    }

    const processFile = (filePath: string) => {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split(/\r?\n/);
        for (const raw of lines) {
            const line = raw.trim();
            if (!line || line.startsWith('#') || line.startsWith('//')) continue;
            const parts = line.split(/\s+/);
            if (parts.length < 2) continue;
            const name = parts[0];
            const addrTokens = parts.slice(1);
            for (const t of addrTokens) {
                try {
                    const addr = getAddress(t as Address);
                    mappings.push({ name, address: addr });
                } catch {
                    throw new Error(`Invalid address '${t}' in ${filePath}`);
                }
            }
        }
    };

    // Expand all candidate paths
    let processedAny = false;
    for (const p of candidatePaths) {
        if (!fs.existsSync(p)) {
            continue; // skip missing path, we will error later if none processed
        }
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
            const entries = fs.readdirSync(p);
            for (const entry of entries) {
                // Only process visible .txt files
                if (entry.startsWith('.')) continue;
                if (!entry.toLowerCase().endsWith('.txt')) continue;
                const filePath = path.join(p, entry);
                const s = fs.statSync(filePath);
                if (s.isFile()) {
                    processFile(filePath);
                    processedAny = true;
                }
            }
        } else if (stat.isFile()) {
            // Only process .txt files when a single file is provided
            if (p.toLowerCase().endsWith('.txt')) {
                processFile(p);
                processedAny = true;
            }
            // Skip non-.txt files
            continue;
        }
    }

    if (!processedAny) {
        throw new Error(`No valid .txt files found in paths: ${candidatePaths.join(', ')}`);
    }

    return mappings;
}
