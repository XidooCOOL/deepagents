
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRealtime, realtimeClient } from '@/composables/useRealtime'

// Mock WebSocket
class MockWebSocket {
  onopen: () =&gt; void = () =&gt; {}
  onmessage: (event: any) =&gt; void = () =&gt; {}
  onclose: () =&gt; void = () =&gt; {}
  onerror: (error: any) =&gt; void = () =&gt; {}
  readyState = 1
  send = vi.fn()
  close = vi.fn()
  
  constructor(url: string) {}
}

describe('useRealtime Composable', () =&gt; {
  let originalWebSocket: any

  beforeEach(() =&gt; {
    originalWebSocket = window.WebSocket
    ;(window as any).WebSocket = MockWebSocket
  })

  afterEach(() =&gt; {
    ;(window as any).WebSocket = originalWebSocket
  })

  describe('realtimeClient', () =&gt; {
    it('should be an instance of RealtimeClient', () =&gt; {
      expect(realtimeClient).toBeDefined()
      expect(typeof realtimeClient.connect).toBe('function')
      expect(typeof realtimeClient.disconnect).toBe('function')
      expect(typeof realtimeClient.send).toBe('function')
    })

    it('should allow subscribing to events', () =&gt; {
      const callback = vi.fn()
      const unsubscribe = realtimeClient.on('test_event', callback)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should allow subscribing to all events', () =&gt; {
      const callback = vi.fn()
      const unsubscribe = realtimeClient.onAny(callback)
      expect(typeof unsubscribe).toBe('function')
    })
  })

  describe('useRealtime composable', () => {
    it('should return reactive state and methods', () =&gt; {
      const { 
        connected, 
        resourceUsage, 
        activeTasks,
        connect,
        disconnect
      } = useRealtime()
      
      expect(connected).toBeDefined()
      expect(resourceUsage).toBeDefined()
      expect(activeTasks).toBeDefined()
      expect(typeof connect).toBe('function')
      expect(typeof disconnect).toBe('function')
    })

    it('should have event listener methods', () =&gt; {
      const { 
        onTaskCreated, 
        onTaskCompleted, 
        onTaskFailed,
        onStoreLogin,
        onAgentMessage
      } = useRealtime()
      
      expect(typeof onTaskCreated).toBe('function')
      expect(typeof onTaskCompleted).toBe('function')
      expect(typeof onTaskFailed).toBe('function')
      expect(typeof onStoreLogin).toBe('function')
      expect(typeof onAgentMessage).toBe('function')
    })
  })
})

