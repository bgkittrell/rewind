import { offlineService } from './offlineService'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
  configurable: true,
})

// Mock fetch
global.fetch = vi.fn()

describe('OfflineService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    offlineService.clearQueue()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('initializes with online status', () => {
    expect(offlineService.getOnlineStatus()).toBe(true)
  })

  it('queues requests when offline', () => {
    const requestId = offlineService.queueRequest('/api/test', 'POST', { data: 'test' })

    expect(requestId).toBeDefined()
    expect(offlineService.getQueueSize()).toBe(1)
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('notifies listeners of status changes', () => {
    const listener = vi.fn()
    const unsubscribe = offlineService.addStatusListener(listener)

    // Simulate going offline
    window.dispatchEvent(new Event('offline'))
    expect(listener).toHaveBeenCalledWith(false)

    // Simulate going online
    window.dispatchEvent(new Event('online'))
    expect(listener).toHaveBeenCalledWith(true)

    unsubscribe()
  })

  it('processes queued requests when coming back online', async () => {
    // Queue a request
    offlineService.queueRequest('/api/test', 'POST', { data: 'test' })
    expect(offlineService.getQueueSize()).toBe(1)

    // Mock successful fetch
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response)

    // Simulate coming back online
    window.dispatchEvent(new Event('online'))

    // Wait for queue processing
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetch).toHaveBeenCalledWith('/api/test', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })

  it('loads queue from localStorage on initialization', () => {
    const savedQueue = JSON.stringify([
      {
        id: 'test-1',
        url: '/api/test',
        method: 'POST',
        body: { data: 'test' },
        timestamp: Date.now(),
      },
    ])

    localStorageMock.getItem.mockReturnValue(savedQueue)

    // Create a new instance to test loading
    const testService = new (offlineService.constructor as any)()
    expect(testService.getQueueSize()).toBe(1)
  })

  it('clears old requests from queue', () => {
    const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
    const recentTimestamp = Date.now() - 1 * 60 * 60 * 1000 // 1 hour ago

    const savedQueue = JSON.stringify([
      {
        id: 'old-request',
        url: '/api/old',
        method: 'POST',
        timestamp: oldTimestamp,
      },
      {
        id: 'recent-request',
        url: '/api/recent',
        method: 'POST',
        timestamp: recentTimestamp,
      },
    ])

    localStorageMock.getItem.mockReturnValue(savedQueue)

    // Create a new instance to test cleanup
    const testService = new (offlineService.constructor as any)()
    expect(testService.getQueueSize()).toBe(1) // Only recent request should remain
  })

  it('clears the entire queue', () => {
    offlineService.queueRequest('/api/test1', 'POST')
    offlineService.queueRequest('/api/test2', 'GET')

    expect(offlineService.getQueueSize()).toBe(2)

    offlineService.clearQueue()
    expect(offlineService.getQueueSize()).toBe(0)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('rewind-offline-queue', JSON.stringify([]))
  })
})
