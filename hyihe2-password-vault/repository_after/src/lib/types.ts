export interface VaultItem {
  id: string; // UUID
  encryptedData: string; // Base64 (contains title, username, password, url, notes, tags)
  iv: string; // Base64
  createdAt: number;
  updatedAt: number;
  history?: VaultHistoryItem[];
}

export interface VaultHistoryItem {
    encryptedData: string;
    iv: string;
    updatedAt: number;
}

export interface AutoLockConfig {
    enabled: boolean;
    timeoutMinutes: number;
}

export interface DecryptedVaultItem {
  id: string;
  data: VaultItemData;
  createdAt: number;
  updatedAt: number;
}

export interface VaultItemData {
  title: string;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  tags?: string[];
  category?: string;
}

export interface VaultMeta {
  salt: string; // Base64
  validator: string; // Encrypted known string ("VALID") to verify password
  validatorIv: string; // IV for the validator
  wrappedKey: string; // The DEK (Data Encryption Key) wrapped by the Master Key (KEK) - optional architecture, or we can regenerate KEK each time.
                      // PLAN CHANGE: To allow password changes easily, we should wrap the DEK. 
                      // 1. Generate random DEK.
                      // 2. Encrypt DEK with Master Key (KEK) derived from password. Store this as `wrappedKey`.
                      // 3. Encrypt data with DEK.
                      // To unlock: derive KEK from input password -> unwrap DEK -> decrypt data with DEK.
  wrappedKeyIv: string; // IV used to wrap the key
}
