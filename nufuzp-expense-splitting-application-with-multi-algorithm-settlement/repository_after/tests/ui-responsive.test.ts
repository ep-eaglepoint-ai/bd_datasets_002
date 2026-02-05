/**
 * Requirement 8: Responsive UI & touch targets
 * File-content assertions for:
 * - Mobile layouts: table → cards (ResponsiveTable, group page), hamburger nav behavior
 * - 44x44px minimum touch target on interactive elements (buttons, links, inputs)
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const repoRoot = path.resolve(__dirname, '..')

function readComponent(filePath: string): string {
  const full = path.join(repoRoot, filePath)
  expect(fs.existsSync(full), `${filePath} should exist`).toBe(true)
  return fs.readFileSync(full, 'utf8')
}

describe('Requirement 8: Responsive UI & touch targets', () => {
  describe('Mobile layout: table → cards', () => {
    it('ResponsiveTable shows table on md+ and cards on small screens', () => {
      const content = readComponent('components/ui/ResponsiveTable.tsx')
      expect(content).toContain('hidden md:block')
      expect(content).toContain('md:hidden')
      expect(content).toMatch(/table|thead|tbody/)
      expect(content).toMatch(/rounded-lg|shadow|border.*card|space-y/)
    })

    it('group detail page has list hidden on small and cards visible on small', () => {
      const content = readComponent('app/(dashboard)/groups/[groupId]/page.tsx')
      expect(content).toContain('hidden md:block')
      expect(content).toContain('md:hidden')
      expect(content).toMatch(/Mobile.*Cards|cards|card/i)
    })
  })

  describe('Hamburger nav behavior', () => {
    it('MobileNav renders hamburger button visible only on small (sm:hidden)', () => {
      const content = readComponent('components/ui/MobileNav.tsx')
      expect(content).toContain('sm:hidden')
      expect(content).toMatch(/Toggle menu|aria-label/i)
      expect(content).toContain('min-h-[44px]')
      expect(content).toContain('min-w-[44px]')
    })

    it('MobileNav has mobile menu overlay and nav links with 44px height', () => {
      const content = readComponent('components/ui/MobileNav.tsx')
      expect(content).toMatch(/fixed inset-0|z-50|bg-gray-600|bg-opacity/)
      expect(content).toMatch(/navItems|href.*dashboard|href.*groups/)
      expect(content).toContain('min-h-[44px]')
    })

    it('dashboard layout includes MobileNav and desktop nav hidden on small', () => {
      const content = readComponent('app/(dashboard)/layout.tsx')
      expect(content).toContain('MobileNav')
      expect(content).toMatch(/hidden sm:flex|sm:flex|sm:block|sm:hidden/)
    })
  })

  describe('44x44 touch target minimum on interactive elements', () => {
    const touchTargetPattern = /min-h-\[44px\]|min-w-\[44px\]/

    it('MobileNav interactive elements meet 44px minimum', () => {
      const content = readComponent('components/ui/MobileNav.tsx')
      expect(content).toMatch(touchTargetPattern)
      const count = (content.match(/min-h-\[44px\]|min-w-\[44px\]/g) || []).length
      expect(count).toBeGreaterThanOrEqual(3) // hamburger, close, nav links
    })

    it('dashboard layout nav links and sign-out meet 44px minimum', () => {
      const content = readComponent('app/(dashboard)/layout.tsx')
      expect(content).toMatch(touchTargetPattern)
    })

    it('LoginForm inputs and submit button meet 44px minimum', () => {
      const content = readComponent('components/forms/LoginForm.tsx')
      expect(content).toMatch(touchTargetPattern)
    })

    it('GroupForm inputs and buttons meet 44px minimum', () => {
      const content = readComponent('components/forms/GroupForm.tsx')
      expect(content).toMatch(touchTargetPattern)
    })

    it('InviteForm input and buttons meet 44px minimum', () => {
      const content = readComponent('components/forms/InviteForm.tsx')
      expect(content).toMatch(touchTargetPattern)
    })

    it('ExpenseForm inputs, checkboxes area, and buttons meet 44px minimum', () => {
      const content = readComponent('components/expenses/ExpenseForm.tsx')
      expect(content).toMatch(touchTargetPattern)
      const count = (content.match(/min-h-\[44px\]|min-w-\[44px\]/g) || []).length
      expect(count).toBeGreaterThanOrEqual(5)
    })

    it('SettlementForm inputs and submit meet 44px minimum', () => {
      const content = readComponent('components/forms/SettlementForm.tsx')
      expect(content).toMatch(touchTargetPattern)
    })

    it('LeaveGroupButton buttons meet 44px minimum', () => {
      const content = readComponent('components/groups/LeaveGroupButton.tsx')
      expect(content).toMatch(touchTargetPattern)
    })

    it('DeleteExpenseButton buttons/links meet 44px minimum', () => {
      const content = readComponent('components/expenses/DeleteExpenseButton.tsx')
      expect(content).toMatch(touchTargetPattern)
    })

    it('ErrorAlert dismiss button meets 44px minimum', () => {
      const content = readComponent('components/ui/ErrorAlert.tsx')
      expect(content).toMatch(touchTargetPattern)
    })

    it('dashboard page Create Group and group cards meet 44px minimum', () => {
      const content = readComponent('app/(dashboard)/dashboard/page.tsx')
      expect(content).toMatch(touchTargetPattern)
    })

    it('groups list page buttons and group cards meet 44px minimum', () => {
      const content = readComponent('app/(dashboard)/groups/page.tsx')
      expect(content).toMatch(touchTargetPattern)
    })

    it('group detail page back link and action buttons meet 44px minimum', () => {
      const content = readComponent('app/(dashboard)/groups/[groupId]/page.tsx')
      expect(content).toMatch(touchTargetPattern)
    })

    it('settlements page back link meets 44px minimum', () => {
      const content = readComponent('app/(dashboard)/groups/[groupId]/settlements/page.tsx')
      expect(content).toMatch(touchTargetPattern)
    })
  })
})
