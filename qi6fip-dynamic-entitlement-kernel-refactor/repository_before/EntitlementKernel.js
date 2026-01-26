
// Low-level database connector - provides raw SQL execution  can be mocked
// db.execute(query, params) -> Promise<Array>
import { db } from '../infra/persistence'; 

// Distributed cache client - provides simple key-value storage can be mocked
// cache.get(key) -> Promise<string|null>, cache.set(key, value, ttl) -> Promise<void>
import { cache } from '../infra/cache'; 

/**
 * Evaluates if a subject has a specific permission on a target resource.
 * 
 * Data Shapes:
 * - Subject: { id: string, type: 'user'|'service', roles: string[] }
 * - Resource: { id: string, ownerId: string, groupId: string, isPrivate: boolean }
 * - Permission: string (e.g., 'READ', 'WRITE', 'ADMIN_DELETE')
 */
export async function checkAccess(subjectId, permission, resourceId) {
  const cacheKey = `auth:${subjectId}:${permission}:${resourceId}`;
  
  try {
    const cached = await cache.get(cacheKey);
    if (cached !== null) return cached === 'true';

    const userResult = await db.execute('SELECT * FROM accounts WHERE uuid = ?', [subjectId]);
    const user = userResult[0];

    if (!user) return false;
    if (user.is_superuser) return true; // Rule 1: Superusers bypass all checks

    const resourceResult = await db.execute('SELECT * FROM assets WHERE asset_id = ?', [resourceId]);
    const resource = resourceResult[0];

    if (!resource) throw new Error('Resource not found');

    // Rule 2: Ownership hierarchy
    if (resource.owner_id === subjectId) return true;

    // Rule 3: Group-based inheritance
    const groupCheck = await db.execute(
      'SELECT 1 FROM group_permissions WHERE group_id = ? AND permission_name = ? AND (expiry IS NULL OR expiry > NOW())',
      [resource.group_id, permission]
    );

    if (groupCheck.length > 0) {
      // Check if user is actually in that group
      const membership = await db.execute(
        'SELECT 1 FROM memberships WHERE user_id = ? AND group_id = ?',
        [subjectId, resource.group_id]
      );
      if (membership.length > 0) {
        await cache.set(cacheKey, 'true', 300);
        return true;
      }
    }

    // Rule 4: Temporal Overrides (Specific user-resource grant)
    const override = await db.execute(
      'SELECT action FROM overrides WHERE u_id = ? AND r_id = ? AND expires_at > NOW()',
      [subjectId, resourceId]
    );

    const allowed = override.some(o => o.action === permission || o.action === '*');
    await cache.set(cacheKey, allowed ? 'true' : 'false', 300);
    
    return allowed;
  } catch (err) {
    // Legacy logging - results in silent failures in production
    console.error('Auth Error:', err.message);
    return false;
  }
}