
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { storesApi, tasksApi, ordersApi, productsApi } from '@/api'

// Mock fetch
global.fetch = vi.fn()

describe('API Module', () =&gt; {
  beforeEach(() =&gt; {
    vi.clearAllMocks()
  })

  describe('Stores API', () =&gt; {
    it('should get all stores', async () =&gt; {
      const mockStores = [
        { id: 1, name: 'Store 1', platform: 'douyin', is_active: true }
      ]
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () =&gt; mockStores,
      })

      const stores = await storesApi.getAll()
      expect(stores).toEqual(mockStores)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/stores'),
        expect.any(Object)
      )
    })

    it('should create a store', async () =&gt; {
      const newStore = { 
        name: 'New Store', 
        platform: 'douyin', 
        username: 'test',
        is_active: true 
      }
      const mockResponse = { id: 1 }
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () =&gt; mockResponse,
      })

      const result = await storesApi.create(newStore)
      expect(result).toEqual(mockResponse)
    })

    it('should handle API errors', async () =&gt; {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
      })

      await expect(storesApi.getAll()).rejects.toThrow()
    })
  })

  describe('Tasks API', () =&gt; {
    it('should get all tasks', async () =&gt; {
      const mockTasks = [
        { id: 1, store_id: 1, name: 'Task 1', status: 'pending' }
      ]
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () =&gt; mockTasks,
      })

      const tasks = await tasksApi.getAll()
      expect(tasks).toEqual(mockTasks)
    })

    it('should get tasks by store id', async () =&gt; {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () =&gt; [],
      })

      await tasksApi.getAll(1)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('?store_id=1'),
        expect.any(Object)
      )
    })
  })

  describe('Orders API', () =&gt; {
    it('should get all orders', async () =&gt; {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () =&gt; [],
      })

      const orders = await ordersApi.getAll()
      expect(Array.isArray(orders)).toBe(true)
    })
  })

  describe('Products API', () =&gt; {
    it('should get all products', async () =&gt; {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () =&gt; [],
      })

      const products = await productsApi.getAll()
      expect(Array.isArray(products)).toBe(true)
    })
  })
})

