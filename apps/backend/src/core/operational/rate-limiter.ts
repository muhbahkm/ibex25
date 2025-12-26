/**
 * Rate Limiter
 *
 * C1: In-memory rate limiting implementation (tenant-aware).
 * Tracks request counts per storeId and endpoint category.
 *
 * This is a lightweight implementation - NO Redis.
 * Suitable for single-instance deployments.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

type EndpointCategory = 'read' | 'write';

export class RateLimiter {
  private readonly storeLimits: Map<string, Map<EndpointCategory, RateLimitEntry>> = new Map();
  private readonly readLimit: number;
  private readonly writeLimit: number;
  private readonly windowMs: number;

  constructor(
    readLimit: number = 100, // requests per window
    writeLimit: number = 20, // requests per window
    windowMs: number = 60000, // 1 minute
  ) {
    this.readLimit = readLimit;
    this.writeLimit = writeLimit;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed
   * Returns true if allowed, false if rate limited
   */
  isAllowed(storeId: string, category: EndpointCategory): boolean {
    const now = Date.now();
    const storeLimits = this.getOrCreateStoreLimits(storeId);
    const entry = storeLimits.get(category);

    if (!entry || now >= entry.resetAt) {
      // Reset window
      const limit = category === 'read' ? this.readLimit : this.writeLimit;
      storeLimits.set(category, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return true;
    }

    const limit = category === 'read' ? this.readLimit : this.writeLimit;
    if (entry.count >= limit) {
      return false;
    }

    // Increment count
    entry.count++;
    return true;
  }

  /**
   * Get remaining requests in current window
   */
  getRemaining(storeId: string, category: EndpointCategory): number {
    const storeLimits = this.getOrCreateStoreLimits(storeId);
    const entry = storeLimits.get(category);
    const now = Date.now();

    if (!entry || now >= entry.resetAt) {
      const limit = category === 'read' ? this.readLimit : this.writeLimit;
      return limit;
    }

    const limit = category === 'read' ? this.readLimit : this.writeLimit;
    return Math.max(0, limit - entry.count);
  }

  /**
   * Get time until reset (in milliseconds)
   */
  getResetTime(storeId: string, category: EndpointCategory): number {
    const storeLimits = this.getOrCreateStoreLimits(storeId);
    const entry = storeLimits.get(category);
    const now = Date.now();

    if (!entry || now >= entry.resetAt) {
      return 0;
    }

    return entry.resetAt - now;
  }

  /**
   * Clean up old entries (call periodically to prevent memory leaks)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [storeId, limits] of this.storeLimits.entries()) {
      let hasActiveEntries = false;
      for (const entry of limits.values()) {
        if (now < entry.resetAt) {
          hasActiveEntries = true;
          break;
        }
      }
      if (!hasActiveEntries) {
        this.storeLimits.delete(storeId);
      }
    }
  }

  private getOrCreateStoreLimits(storeId: string): Map<EndpointCategory, RateLimitEntry> {
    if (!this.storeLimits.has(storeId)) {
      this.storeLimits.set(storeId, new Map());
    }
    return this.storeLimits.get(storeId)!;
  }
}

