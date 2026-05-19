
import { vi } from 'vitest'

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
}

export const mockRoute = {
  path: '/',
  name: 'Home',
  params: {},
  query: {},
  meta: {},
}

