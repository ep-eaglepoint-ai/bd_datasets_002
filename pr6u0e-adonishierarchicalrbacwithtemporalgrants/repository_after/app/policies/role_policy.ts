// @ts-nocheck
import User from '#models/user'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import PermissionResolverService from '#services/permission_resolver_service'

export default class RolePolicy extends BasePolicy {
  private permissionResolver = new PermissionResolverService()

  /**
   * Check if user has a specific permission
   */
  async allows(user: User, permission: string, tenantId?: number): Promise<AuthorizerResponse> {
    const effectiveTenantId = tenantId || user.tenantId
    
    const hasPermission = await this.permissionResolver.userHasPermission(
      user.id,
      effectiveTenantId,
      permission
    )

    return hasPermission
  }

  /**
   * Check if user can edit invoices
   */
  async canEditInvoice(user: User, tenantId?: number): Promise<AuthorizerResponse> {
    return this.allows(user, 'can_edit_invoice', tenantId)
  }

  /**
   * Check if user can view reports
   */
  async canViewReports(user: User, tenantId?: number): Promise<AuthorizerResponse> {
    return this.allows(user, 'can_view_reports', tenantId)
  }

  /**
   * Check if user can manage users
   */
  async canManageUsers(user: User, tenantId?: number): Promise<AuthorizerResponse> {
    return this.allows(user, 'can_manage_users', tenantId)
  }

  /**
   * Check if user can access admin panel
   */
  async canAccessAdmin(user: User, tenantId?: number): Promise<AuthorizerResponse> {
    return this.allows(user, 'can_access_admin', tenantId)
  }

  /**
   * Check multiple permissions at once
   */
  async hasAnyPermission(
    user: User, 
    permissions: string[], 
    tenantId?: number
  ): Promise<AuthorizerResponse> {
    const effectiveTenantId = tenantId || user.tenantId
    
    const userPermissions = await this.permissionResolver.resolveUserPermissions(
      user.id,
      effectiveTenantId
    )

    const hasAny = permissions.some(permission => userPermissions.includes(permission))
    return hasAny
  }

  /**
   * Check if user has all specified permissions
   */
  async hasAllPermissions(
    user: User, 
    permissions: string[], 
    tenantId?: number
  ): Promise<AuthorizerResponse> {
    const effectiveTenantId = tenantId || user.tenantId
    
    const userPermissions = await this.permissionResolver.resolveUserPermissions(
      user.id,
      effectiveTenantId
    )

    const hasAll = permissions.every(permission => userPermissions.includes(permission))
    return hasAll
  }
}