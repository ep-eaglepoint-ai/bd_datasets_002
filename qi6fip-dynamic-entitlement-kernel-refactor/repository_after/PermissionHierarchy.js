export class PermissionHierarchy {
    constructor(config = {}) {
        this.hierarchy = config;
    }

    /**
     * Checks if grantedPermission implies requiredPermission.
     * Handles direct matches, wildcards, and transitive implications.
     */
    implies(grantedPermission, requiredPermission) {
        if (grantedPermission === requiredPermission) return true;
        if (grantedPermission === '*') return true;

        const implied = this.hierarchy[grantedPermission] || [];

        // Check direct implication
        if (implied.includes(requiredPermission)) return true;

        // Check transitive implications (DFS)
        for (const p of implied) {
            if (this.implies(p, requiredPermission)) return true;
        }

        return false;
    }

    /**
     * Returns all permissions implied by this permission.
     * Example: expand('ADMIN_DELETE') -> ['ADMIN_DELETE', 'WRITE', 'READ']
     */
    expand(permission) {
        const results = new Set([permission]);
        const queue = [permission];

        while (queue.length > 0) {
            const current = queue.shift();
            const implied = this.hierarchy[current] || [];
            for (const p of implied) {
                if (!results.has(p)) {
                    results.add(p);
                    queue.push(p);
                }
            }
        }

        return Array.from(results);
    }
}
