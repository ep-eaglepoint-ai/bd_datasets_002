/**
 * Vitest setup: stub server-only so any code that imports lib/db in tests
 * does not throw (server-only throws outside Server Component context).
 */
import { vi } from 'vitest'

vi.mock('server-only', () => ({ default: {} }))
