/**
 * Policy Engine Integration (OPA-like)
 * 
 * This service provides field-level authorization by consulting
 * an external policy engine (Open Policy Agent or similar).
 */

interface PolicyInput {
  user: {
    id: string;
    role: string;
    scopes?: string[];
  } | null;
  resource: string;
  action: string;
  field?: string;
}

interface PolicyResult {
  allow: boolean;
  reason?: string;
}

// Mock OPA endpoint for demo purposes
const OPA_ENDPOINT = process.env.OPA_ENDPOINT || 'http://localhost:8181/v1/data/graphql/authz';

/**
 * Consults the policy engine for authorization decisions.
 * In production, this would make an HTTP call to OPA.
 */
export async function checkPolicy(input: PolicyInput): Promise<PolicyResult> {
  // Mock implementation - in production, call OPA
  // Example: const response = await fetch(OPA_ENDPOINT, { method: 'POST', body: JSON.stringify({ input }) });
  
  // Role-based access control logic (mock)
  if (!input.user) {
    // Guest users can only read public fields
    if (input.action === 'read' && input.resource === 'public') {
      return { allow: true };
    }
    return { allow: false, reason: 'Authentication required' };
  }

  // Admin can do anything
  if (input.user.role === 'admin') {
    return { allow: true };
  }

  // Users can read their own data
  if (input.action === 'read') {
    return { allow: true };
  }

  // Only admins can mutate
  if (input.action === 'write' && input.user.role !== 'admin') {
    return { allow: false, reason: 'Admin role required for mutations' };
  }

  return { allow: true };
}

/**
 * Directive-like authorization check for field-level access.
 * @param requiredRole The role required to access this field
 * @param userRole The user's current role
 */
export function requireRole(requiredRole: string, userRole: string | undefined): boolean {
  if (!userRole) return false;
  if (userRole === 'admin') return true;
  return userRole === requiredRole;
}

/**
 * Auth directive types for schema definition
 */
export const authDirectiveTypeDefs = `
  directive @auth(requires: Role = USER) on FIELD_DEFINITION | OBJECT

  enum Role {
    ADMIN
    USER
    GUEST
  }
`;
