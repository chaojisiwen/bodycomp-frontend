import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom localStorage 兼容 mock（zustand persist 依赖 setItem/getItem/removeItem）
const store: Record<string, string> = {}

globalThis.localStorage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => {
    Object.keys(store).forEach((k) => delete store[k])
  }),
  length: 0,
  key: vi.fn(() => null),
} as unknown as Storage
