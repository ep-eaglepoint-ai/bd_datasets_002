import { db } from './infra/persistence.js';
import { cache } from './infra/cache.js';

/**
 * DataProvider Interface/Base Class
 */
export class DataProvider {
    async getUser(userId) { throw new Error('Not implemented'); }
    async getResource(resourceId) { throw new Error('Not implemented'); }
    async getGroupPermissions(groupId, permission) { throw new Error('Not implemented'); }
    async getUserMemberships(userId, groupId) { throw new Error('Not implemented'); }
    async getOverrides(userId, resourceId) { throw new Error('Not implemented'); }
}

/**
 * Implementation using real Database
 */
export class DatabaseDataProvider extends DataProvider {
    async getUser(userId) {
        const result = await db.execute('SELECT uuid, is_superuser FROM accounts WHERE uuid = ?', [userId]);
        const user = result[0];
        if (!user) return null;
        return {
            id: user.uuid,
            isSuperuser: !!user.is_superuser,
            roles: [] // Placeholder
        };
    }

    async getResource(resourceId) {
        const result = await db.execute('SELECT asset_id, owner_id, group_id FROM assets WHERE asset_id = ?', [resourceId]);
        const resource = result[0];
        if (!resource) return null;
        return {
            id: resource.asset_id,
            ownerId: resource.owner_id,
            groupId: resource.group_id
        };
    }

    async getGroupPermissions(groupId, permission) {
        // Note: We filter by permission if needed or return all for the group
        return await db.execute(
            'SELECT permission_name, expiry FROM group_permissions WHERE group_id = ? AND (expiry IS NULL OR expiry > NOW())',
            [groupId]
        );
    }

    async getUserMemberships(userId, groupId) {
        return await db.execute(
            'SELECT 1 FROM memberships WHERE user_id = ? AND group_id = ?',
            [userId, groupId]
        );
    }

    async getOverrides(userId, resourceId) {
        return await db.execute(
            'SELECT action, expires_at FROM overrides WHERE u_id = ? AND r_id = ? AND (expires_at IS NULL OR expires_at > NOW())',
            [userId, resourceId]
        );
    }
}

/**
 * Implementation using In-Memory data (for deterministic testing)
 */
export class InMemoryDataProvider extends DataProvider {
    constructor(data = {}) {
        super();
        this.users = data.users || {};
        this.resources = data.resources || {};
        this.groupPermissions = data.groupPermissions || {}; // groupId -> perms[]
        this.memberships = data.memberships || {}; // userId -> groupId[]
        this.overrides = data.overrides || {}; // userId:resourceId -> perms[]
    }

    async getUser(userId) { return this.users[userId] || null; }
    async getResource(resourceId) { return this.resources[resourceId] || null; }

    async getGroupPermissions(groupId) {
        return this.groupPermissions[groupId] || [];
    }

    async getUserMemberships(userId, groupId) {
        const userGroups = this.memberships[userId] || [];
        return userGroups.includes(groupId) ? [{}] : [];
    }

    async getOverrides(userId, resourceId) {
        return this.overrides[`${userId}:${resourceId}`] || [];
    }
}

/**
 * Decorator that adds caching (Phase 2.2)
 */
export class CachedDataProvider extends DataProvider {
    constructor(provider) {
        super();
        this.provider = provider;
    }

    async getUser(userId) {
        const cacheKey = `user:${userId}`;
        const cached = await cache.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const user = await this.provider.getUser(userId);
        if (user) await cache.set(cacheKey, JSON.stringify(user), 300);
        return user;
    }

    async getResource(resourceId) {
        const cacheKey = `resource:${resourceId}`;
        const cached = await cache.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const resource = await this.provider.getResource(resourceId);
        if (resource) await cache.set(cacheKey, JSON.stringify(resource), 300);
        return resource;
    }

    async getGroupPermissions(groupId, permission) {
        const cacheKey = `group_perms:${groupId}`;
        const cached = await cache.get(cacheKey);

        if (cached) {
            const data = JSON.parse(cached);
            // Validated temporal permissions BEFORE returning (Requirement 5)
            // Check if any permission in the set is expired
            const now = Date.now();
            const stillValid = data.every(p => !p.expiry || new Date(p.expiry).getTime() > now);

            if (stillValid) return data;
            // If any expired, clear cache and re-fetch
        }

        const perms = await this.provider.getGroupPermissions(groupId, permission);
        await cache.set(cacheKey, JSON.stringify(perms), 300);
        return perms;
    }

    async getUserMemberships(userId, groupId) {
        return this.provider.getUserMemberships(userId, groupId);
    }

    async getOverrides(userId, resourceId) {
        return this.provider.getOverrides(userId, resourceId);
    }
}
