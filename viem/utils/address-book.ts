import type { Address } from 'viem';
import { getAddress } from 'viem';

/**
 * AddressBook - Manages address-to-name mappings
 *
 * Features:
 * - Bidirectional address ↔ name mapping
 * - Case-insensitive lookups
 */
export class AddressBook {
    private addressToName: Map<string, string> = new Map();
    private nameToAddress: Map<string, Address> = new Map();

    // ==========================================
    // ADDRESS MAPPING
    // ==========================================

    /**
     * Register an address with a human-readable name
     */
    registerAddressName(address: Address, name: string): void {
        const checksummed = getAddress(address);
        const lowerName = name.toLowerCase();

        this.addressToName.set(checksummed, name);
        this.nameToAddress.set(lowerName, checksummed);
    }

    /**
     * Get name for an address
     */
    getAddressName(address: Address): string {
        const checksummed = getAddress(address);
        return this.addressToName.get(checksummed) ?? 'UNKNOWN';
    }

    /**
     * Get address for a name
     */
    getNamedAddress(name: string): Address | undefined {
        return this.nameToAddress.get(name.toLowerCase());
    }

    /**
     * Check if address has a registered name
     */
    hasAddress(address: Address): boolean {
        const checksummed = getAddress(address);
        return this.addressToName.has(checksummed);
    }

    /**
     * Check if name is registered
     */
    hasName(name: string): boolean {
        return this.nameToAddress.has(name.toLowerCase());
    }

    /**
     * Get all registered addresses
     */
    getAllAddresses(): Address[] {
        return Array.from(this.nameToAddress.values());
    }

    /**
     * Get all registered names
     */
    getAllNames(): string[] {
        return Array.from(this.addressToName.values());
    }

    // ==========================================
    // BULK OPERATIONS
    // ==========================================

    /**
     * Load multiple addresses from an array
     */
    loadAddresses(entries: Array<{ address: Address; name: string }>): void {
        for (const entry of entries) {
            this.registerAddressName(entry.address, entry.name);
        }
    }

    /**
     * Clear all mappings
     */
    clear(): void {
        this.addressToName.clear();
        this.nameToAddress.clear();
    }

    /**
     * Export current state for persistence
     */
    export(): Array<{ address: Address; name: string }> {
        const addresses: Array<{ address: Address; name: string }> = [];
        for (const [addr, name] of this.addressToName.entries()) {
            addresses.push({ address: addr as Address, name });
        }
        return addresses;
    }

    /**
     * Import from exported state
     */
    import(data: Array<{ address: Address; name: string }>): void {
        this.loadAddresses(data);
    }
}
