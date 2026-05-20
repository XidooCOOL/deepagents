import { describe, it, expect, vi, beforeEach } from 'vitest'
import { storesApi, tasksApi, ordersApi, productsApi } from '@/api'

// Mock fetch
global.fetch = vi.fn()

describe('API Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Stores API', () => {
    it('should get all stores', async () => {
      const mockStores = [
        { id: 1, name: 'Store 1', platform: 'douyin', is_active: true }
      ]
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockStores,
      })

      const stores = await storesApi.getAll()
      expect(stores).toEqual(mockStores)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/stores'),
        expect.any(Object)
      )
    })

    it('should create a store', async () => {
      const newStore = { 
        name: 'New Store', 
        platform: 'douyin', 
        username: 'test',
        is_active: true 
      }
      const mockResponse = { id: 1 }
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await storesApi.create(newStore)
      expect(result).toEqual(mockResponse)
    })

    it('should handle API errors', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
      })

      await expect(storesApi.getAll()).rejects.toThrow()
    })
  })

  describe('Tasks API', () => {
    it('should get all tasks', async () => {
      const mockTasks = [
        { id: 1, store_id: 1, name: 'Task 1', status: 'pending' }
      ]
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockTasks,
      })

      const tasks = await tasksApi.getAll()
      expect(tasks).toEqual(mockTasks)
    })

    it('should get tasks by store id', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [],
      })

      await tasksApi.getAll(1)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('?store_id=1'),
        expect.any(Object)
      )
    })
  })

  describe('Orders API', () => {
    it('should get all orders', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [],
      })

      const orders = await ordersApi.getAll()
      expect(Array.isArray(orders)).toBe(true)
    })
  })

  describe('Products API', () => {
    it('should get all products', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [],
      })

      const products = await productsApi.getAll()
      expect(Array.isArray(products)).toBe(true)
    })
  })
})
