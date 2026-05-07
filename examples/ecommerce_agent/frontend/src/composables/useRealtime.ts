/**
 * 实时状态监控 - WebSocket 客户端
 * 用于连接后端 WebSocket 服务，接收实时事件推送
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage } from 'element-plus'

export interface RealtimeEvent {
  type: string
  data: any
  timestamp: string
  source: string
}

export interface ConnectionStats {
  total_connections: number
  by_channel: Record<string, number>
}

export type EventCallback = (event: RealtimeEvent) => void

class RealtimeClient {
  private ws: WebSocket | null = null
  private url: string = ''
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private heartbeatInterval: number | null = null
  private listeners: Map<string, Set<EventCallback>> = new Map()
  private globalListeners: Set<EventCallback> = new Set()
  private _connected = ref(false)
  private _stats = ref<ConnectionStats | null>(null)

  get connected() {
    return this._connected.value
  }

  get stats() {
    return this._stats.value
  }

  connect(url: string = '') {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.url = url || this.getWebSocketUrl()

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('🔌 WebSocket 连接成功')
        this._connected.value = true
        this.reconnectAttempts = 0
        this.startHeartbeat()
        this.startListening()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (e) {
          console.error('解析 WebSocket 消息失败:', e)
        }
      }

      this.ws.onclose = () => {
        console.log('🔌 WebSocket 连接关闭')
        this._connected.value = false
        this.stopHeartbeat()
        this.attemptReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket 错误:', error)
        this._connected.value = false
      }
    } catch (e) {
      console.error('WebSocket 连接失败:', e)
      this.attemptReconnect()
    }
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/api/realtime/ws`
  }

  private handleMessage(message: any) {
    const event: RealtimeEvent = {
      type: message.type,
      data: message.data,
      timestamp: message.timestamp,
      source: message.source
    }

    if (message.type === 'heartbeat') {
      return
    }

    this.globalListeners.forEach(callback => {
      try {
        callback(event)
      } catch (e) {
        console.error('Global listener error:', e)
      }
    })

    const typeListeners = this.listeners.get(event.type)
    if (typeListeners) {
      typeListeners.forEach(callback => {
        try {
          callback(event)
        } catch (e) {
          console.error('Type listener error:', e)
        }
      })
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'ping' }))
      }
    }, 25000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('已达到最大重连次数')
      return
    }

    this.reconnectAttempts++
    console.log(`${this.reconnectDelay / 1000}秒后尝试第${this.reconnectAttempts}次重连...`)

    setTimeout(() => {
      this.connect(this.url)
    }, this.reconnectDelay)
  }

  private startListening() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'get_status'
      }))
    }
  }

  disconnect() {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this._connected.value = false
    this.reconnectAttempts = this.maxReconnectAttempts
  }

  on(eventType: string, callback: EventCallback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(callback)
    return () => this.off(eventType, callback)
  }

  off(eventType: string, callback: EventCallback) {
    const typeListeners = this.listeners.get(eventType)
    if (typeListeners) {
      typeListeners.delete(callback)
    }
  }

  onAny(callback: EventCallback) {
    this.globalListeners.add(callback)
    return () => this.globalListeners.delete(callback)
  }

  send(action: string, data: any = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action, ...data }))
    }
  }

  subscribe(channels: string[]) {
    this.send('subscribe', { channels })
  }

  unsubscribe(channels: string[]) {
    this.send('unsubscribe', { channels })
  }

  getStatus() {
    this.send('get_status')
  }

  getResources() {
    this.send('get_resources')
  }
}

export const realtimeClient = new RealtimeClient()

export function useRealtime() {
  const connected = ref(false)
  const resourceUsage = ref<any>(null)
  const activeTasks = ref<any[]>([])
  const systemAlerts = ref<any[]>([])
  const browserStatus = ref<Record<number, any>>({})
  const recentLogs = ref<any[]>([])

  const connect = () => {
    realtimeClient.connect()

    realtimeClient.on('system:resource', (event) => {
      resourceUsage.value = event.data
    })

    realtimeClient.on('task:started', (event) => {
      const task = event.data
      const existing = activeTasks.value.find(t => t.task_id === task.task_id)
      if (!existing) {
        activeTasks.value.push({
          ...task,
          progress: 0,
          startTime: Date.now()
        })
      }
    })

    realtimeClient.on('task:progress', (event) => {
      const task = activeTasks.value.find(t => t.task_id === event.data.task_id)
      if (task) {
        task.progress = event.data.progress
        task.current_step = event.data.current_step
      }
    })

    realtimeClient.on('task:completed', (event) => {
      const task = activeTasks.value.find(t => t.task_id === event.data.task_id)
      if (task) {
        task.status = 'completed'
        task.completedAt = Date.now()
      }
    })

    realtimeClient.on('task:failed', (event) => {
      const task = activeTasks.value.find(t => t.task_id === event.data.task_id)
      if (task) {
        task.status = 'failed'
        task.error = event.data.error
      }
    })

    realtimeClient.on('task:log', (event) => {
      recentLogs.value.unshift({
        ...event.data,
        timestamp: event.timestamp
      })
      if (recentLogs.value.length > 100) {
        recentLogs.value.pop()
      }
    })

    realtimeClient.on('system:alert', (event) => {
      systemAlerts.value.unshift(event.data)
      if (systemAlerts.value.length > 50) {
        systemAlerts.value.pop()
      }
      ElMessage.warning(`${event.data.title}: ${event.data.message}`)
    })

    realtimeClient.on('browser:opened', (event) => {
      browserStatus.value[event.data.store_id] = {
        status: 'open',
        store_name: event.data.store_name,
        openedAt: Date.now()
      }
    })

    realtimeClient.on('browser:closed', (event) => {
      if (browserStatus.value[event.data.store_id]) {
        browserStatus.value[event.data.store_id].status = 'closed'
      }
    })

    realtimeClient.on('browser:error', (event) => {
      browserStatus.value[event.data.store_id] = {
        status: 'error',
        error: event.data.error
      }
      ElMessage.error(`浏览器错误: ${event.data.error}`)
    })
  }

  const disconnect = () => {
    realtimeClient.disconnect()
  }

  const onTaskCreated = (callback: EventCallback) => {
    return realtimeClient.on('task:created', callback)
  }

  const onTaskCompleted = (callback: EventCallback) => {
    return realtimeClient.on('task:completed', callback)
  }

  const onTaskFailed = (callback: EventCallback) => {
    return realtimeClient.on('task:failed', callback)
  }

  const onStoreLogin = (callback: EventCallback) => {
    return realtimeClient.on('store:login', callback)
  }

  const onAgentMessage = (callback: EventCallback) => {
    return realtimeClient.on('agent:message', callback)
  }

  onMounted(() => {
    connected.value = true
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    connected,
    resourceUsage,
    activeTasks,
    systemAlerts,
    browserStatus,
    recentLogs,
    connect,
    disconnect,
    onTaskCreated,
    onTaskCompleted,
    onTaskFailed,
    onStoreLogin,
    onAgentMessage
  }
}

export function useTaskRealtime(taskId: number) {
  const progress = ref(0)
  const logs = ref<any[]>([])
  const status = ref<'idle' | 'running' | 'completed' | 'failed'>('idle')
  const currentStep = ref(0)
  const totalSteps = ref(0)

  const unsubscribe: (() => void)[] = []

  onMounted(() => {
    unsubscribe.push(
      realtimeClient.on('task:started', (event) => {
        if (event.data.task_id === taskId) {
          status.value = 'running'
          totalSteps.value = event.data.total_steps
          progress.value = 0
        }
      })
    )

    unsubscribe.push(
      realtimeClient.on('task:progress', (event) => {
        if (event.data.task_id === taskId) {
          progress.value = event.data.progress
          currentStep.value = event.data.current_step
        }
      })
    )

    unsubscribe.push(
      realtimeClient.on('task:completed', (event) => {
        if (event.data.task_id === taskId) {
          status.value = 'completed'
          progress.value = 100
        }
      })
    )

    unsubscribe.push(
      realtimeClient.on('task:failed', (event) => {
        if (event.data.task_id === taskId) {
          status.value = 'failed'
        }
      })
    )

    unsubscribe.push(
      realtimeClient.on('task:log', (event) => {
        if (event.data.task_id === taskId) {
          logs.value.push({
            ...event.data,
            timestamp: event.timestamp
          })
        }
      })
    )
  })

  onUnmounted(() => {
    unsubscribe.forEach(unsub => unsub())
  })

  return {
    progress,
    logs,
    status,
    currentStep,
    totalSteps
  }
}
