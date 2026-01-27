import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CryptoService } from '../repository_after/src/lib/crypto';
import { useVaultStore } from '../repository_after/src/store/useVaultStore';

describe('CryptoService', () => {
    it('should generate a salt', () => {
        const salt = CryptoService.generateSalt();
        expect(salt).toBeDefined();
        expect(typeof salt).toBe('string');
        expect(salt.length).toBeGreaterThan(0);
    });

    it('should generate an IV', () => {
        const iv = CryptoService.generateIV();
        expect(iv).toBeDefined();
        expect(typeof iv).toBe('string');
    });
});

describe('VaultStore', () => {
    beforeEach(() => {
        useVaultStore.setState({
            hasVault: false,
            isLocked: true,
            items: [],
            encryptionKey: null
        });
    });

    it('should start with no vault', () => {
        const state = useVaultStore.getState();
        expect(state.hasVault).toBe(false);
        expect(state.isLocked).toBe(true);
    });

    it('should update autoLock settings', () => {
        const { setAutoLock } = useVaultStore.getState();
        setAutoLock({ enabled: true, timeout: 60 });
        
        const state = useVaultStore.getState();
        expect(state.autoLock.enabled).toBe(true);
        expect(state.autoLock.timeout).toBe(60);
    });
});
