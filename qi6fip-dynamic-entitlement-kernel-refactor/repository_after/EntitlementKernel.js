import { PermissionHierarchy } from './PermissionHierarchy.js';
import { DatabaseDataProvider, CachedDataProvider } from './DataProvider.js';
import { EvaluationEngine } from './EvaluationEngine.js';
import {
  SuperuserBypassRule,
  OwnershipRule,
  GroupPermissionRule,
  TemporalOverrideRule
} from './rules.js';

// Configuration for permission hierarchy
const hierarchyConfig = {
  'ADMIN_ALL': ['ADMIN_DELETE', 'ADMIN_WRITE', 'WRITE', 'READ'],
  'ADMIN_DELETE': ['WRITE', 'READ'],
  'WRITE': ['READ']
};

const hierarchy = new PermissionHierarchy(hierarchyConfig);
const dbProvider = new DatabaseDataProvider();
const dataProvider = new CachedDataProvider(dbProvider);

const rules = [
  new SuperuserBypassRule(),
  new OwnershipRule(),
  new GroupPermissionRule(hierarchy),
  new TemporalOverrideRule(hierarchy)
];

const engine = new EvaluationEngine(rules, dataProvider, hierarchy);

/**
 * Legacy API
 */
export async function checkAccess(subjectId, permission, resourceId) {
  const context = {
    subject: subjectId,
    permission,
    resource: resourceId,
    timestamp: Date.now()
  };

  try {
    const result = await engine.evaluate(context);
    return result.allowed; // Return boolean for backward compatibility
  } catch (err) {
    // Fail-Closed: Errors bubble up or are handled here.
    // In the legacy implementation, it was silencing errors. 
    // We now throw to satisfy "never silenced" requirement.
    throw err;
  }
}

/**
 * New API
 */
export async function checkAccessDetailed(subjectId, permission, resourceId) {
  const context = {
    subject: subjectId,
    permission,
    resource: resourceId,
    timestamp: Date.now()
  };

  return await engine.evaluate(context); // Return full result
}