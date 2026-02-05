import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useVaultStore } from '../repository_after/src/store/useVaultStore';
import { CryptoService } from '../repository_after/src/lib/crypto';

describe('VaultStore - Requirements 3, 9, 10, 13', () => {
    beforeEach(() => {
        // Reset store to initial state
        useVaultStore.setState({
            hasVault: false,
            isLocked: true,
            isLoading: false,
            items: [],
            encryptionKey: null,
            corruptedItems: 0,
            autoLock: { enabled: false, timeoutMinutes: 15 },
            lastActivity: Date.now()
        });
    });

    describe('Requirement 13: State Management', () => {
        it('should initialize with locked state', () => {
            const state = useVaultStore.getState();
            expect(state.hasVault).toBe(false);
            expect(state.isLocked).toBe(true);
            expect(state.items).toEqual([]);
            expect(state.encryptionKey).toBeNull();
        });

        it('should update autoLock settings', () => {
            const { setAutoLock } = useVaultStore.getState();
            setAutoLock({ enabled: true, timeoutMinutes: 60 });
            
            const state = useVaultStore.getState();
            expect(state.autoLock.enabled).toBe(true);
            expect(state.autoLock.timeoutMinutes).toBe(60);
        });

        it('should track last activity timestamp', () => {
            const { touchActivity } = useVaultStore.getState();
            const before = Date.now();
            touchActivity();
            const after = Date.now();
            
            const state = useVaultStore.getState();
            expect(state.lastActivity).toBeGreaterThanOrEqual(before);
            expect(state.lastActivity).toBeLessThanOrEqual(after);
        });
    });

    describe('Requirement 9: Auto-Lock', () => {
        it('should lock vault when auto-lock is triggered', () => {
            const { lockVault } = useVaultStore.getState();
            
            // Simulate unlocked state
            useVaultStore.setState({
                isLocked: false,
                encryptionKey: {} as CryptoKey
            });
            
            lockVault();
            
            const state = useVaultStore.getState();
            expect(state.isLocked).toBe(true);
            expect(state.encryptionKey).toBeNull();
        });

        it('should clear encryption key from memory on lock', () => {
            useVaultStore.setState({
                isLocked: false,
                encryptionKey: {} as CryptoKey
            });
            
            const { lockVault } = useVaultStore.getState();
            lockVault();
            
            expect(useVaultStore.getState().encryptionKey).toBeNull();
        });
    });

    describe('Requirement 3: Credential Storage (State)', () => {
        it('should maintain items in state', () => {
            const testItems = [
                { id: '1', data: { siteName: 'test', username: 'user', password: 'pass' }, createdAt: Date.now(), updatedAt: Date.now() }
            ];
            
            useVaultStore.setState({ items: testItems });
            
            const state = useVaultStore.getState();
            expect(state.items).toHaveLength(1);
            expect(state.items[0].id).toBe('1');
        });
    });

    describe('Requirement 16: Export/Import (State)', () => {
        it('should export vault data', async () => {
            const { exportVault } = useVaultStore.getState();
            const { storage } = await import('../repository_after/src/lib/storage');
            
            // Save a properly formatted VaultItem to IndexedDB
            const testItem = {
                id: 'export-test',
                encryptedData: 'test-encrypted-data',
                iv: 'test-iv',
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            
            await storage.saveItem(testItem);
            
            const exported = await exportVault();
            
            expect(exported).toBeDefined();
            const parsed = JSON.parse(exported);
            expect(parsed.items).toHaveLength(1);
            expect(parsed.items[0].id).toBe('export-test');
            expect(parsed.meta).toBeDefined();
        });

        it('should import vault data', async () => {
            const { importVault } = useVaultStore.getState();
            
            const importData = {
                date: new Date().toISOString(),
                version: 1,
                meta: {
                    salt: 'imported-salt',
                    validator: 'test-validator',
                    validatorIv: 'test-iv',
                    wrappedKey: 'test-wrapped',
                    wrappedKeyIv: 'test-wrapped-iv',
                    autoLock: { enabled: true, timeoutMinutes: 15 }
                },
                items: [
                    {
                        id: 'imported-1',
                        encryptedData: 'encrypted-data',
                        iv: 'test-iv',
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    }
                ]
            };
            
            await importVault(JSON.stringify(importData));
            
            const state = useVaultStore.getState();
            // After import, vault is locked and requires re-authentication
            expect(state.isLocked).toBe(true);
            expect(state.hasVault).toBe(true);
        });
    });
});
        it('should lock vault when auto-lock is triggered', () => {
            const { lockVault } = useVaultStore.getState();
            
            // Simulate unlocked state
            useVaultStore.setState({
                isLocked: false,
                encryptionKey: {} as CryptoKey
            });
            
            lockVault();
            
            const state = useVaultStore.getState();
            expect(state.isLocked).toBe(true);
            expect(state.encryptionKey).toBeNull();
        });

        it('should clear encryption key from memory on lock', () => {
            useVaultStore.setState({
                isLocked: false,
                encryptionKey: {} as CryptoKey
            });
            
            const { lockVault } = useVaultStore.getState();
            lockVault();
            
            expect(useVaultStore.getState().encryptionKey).toBeNull();
        });


