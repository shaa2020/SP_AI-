interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

class RateLimiter {
  private store: RateLimitStore = {}
  private maxRequests: number
  private windowMs: number

  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const record = this.store[identifier]

    if (!record || now > record.resetTime) {
      this.store[identifier] = {
        count: 1,
        resetTime: now + this.windowMs,
      }
      return true
    }

    if (record.count >= this.maxRequests) {
      return false
    }

    record.count++
    return true
  }

  getRemainingRequests(identifier: string): number {
    const record = this.store[identifier]
    if (!record || Date.now() > record.resetTime) {
      return this.maxRequests
    }
    return Math.max(0, this.maxRequests - record.count)
  }

  getResetTime(identifier: string): number {
    const record = this.store[identifier]
    return record?.resetTime || Date.now()
  }
}

export const rateLimiter = new RateLimiter()
