export class SuperuserBypassRule {
    constructor() {
        this.name = 'SUPERUSER_BYPASS';
    }

    async evaluate(context, dataProvider) {
        const user = await dataProvider.getUser(context.subject);
        if (user && user.isSuperuser) {
            return { matched: true, reason: 'BYPASS_SUPERUSER' };
        }
        return { matched: false };
    }
}

export class OwnershipRule {
    constructor() {
        this.name = 'OWNERSHIP';
    }

    async evaluate(context, dataProvider) {
        const resource = await dataProvider.getResource(context.resource);
        if (!resource) throw new Error('Resource not found');

        if (resource.ownerId === context.subject) {
            return { matched: true, reason: 'OWNER' };
        }
        return { matched: false };
    }
}

export class GroupPermissionRule {
    constructor(hierarchy) {
        this.name = 'GROUP_PERMISSION';
        this.hierarchy = hierarchy;
    }

    async evaluate(context, dataProvider) {
        const resource = await dataProvider.getResource(context.resource);
        if (!resource) return { matched: false };

        const permissions = await dataProvider.getGroupPermissions(
            resource.groupId,
            context.permission
        );

        if (permissions.length === 0) return { matched: false };

        // Check if any granted permission implies the requested one
        const hasPerm = permissions.some(p => this.hierarchy.implies(p.permission_name, context.permission));
        if (!hasPerm) return { matched: false };

        // Check if user is in group
        const membership = await dataProvider.getUserMemberships(
            context.subject,
            resource.groupId
        );

        if (membership.length > 0) {
            return { matched: true, reason: 'GROUP_PERMISSION' };
        }

        return { matched: false, reason: 'MISSING_MEMBERSHIP' };
    }
}

export class TemporalOverrideRule {
    constructor(hierarchy) {
        this.name = 'TEMPORAL_OVERRIDE';
        this.hierarchy = hierarchy;
    }

    async evaluate(context, dataProvider) {
        const overrides = await dataProvider.getOverrides(
            context.subject,
            context.resource
        );

        for (const override of overrides) {
            // Check expiry
            if (override.expires_at && new Date(override.expires_at).getTime() < context.timestamp) {
                continue; // Skip expired
            }

            // Check permission hierarchy
            if (this.hierarchy.implies(override.action, context.permission)) {
                return { matched: true, reason: 'TEMPORAL_OVERRIDE' };
            }
        }

        return { matched: false };
    }
}
