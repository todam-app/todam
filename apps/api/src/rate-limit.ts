import { HttpProblem } from "./errors.js";

interface Counter {
  count: number;
  resetAt: number;
}

export class InMemoryRateLimiter {
  private readonly counters = new Map<string, Counter>();

  assertAllowed(key: string, maximum: number, windowMs: number): void {
    const now = Date.now();
    const current = this.counters.get(key);
    if (!current || current.resetAt <= now) {
      this.counters.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    if (current.count >= maximum) {
      throw new HttpProblem(
        429,
        "RATE_LIMIT_EXCEEDED",
        "Trop de tentatives. Réessaie dans quelques minutes.",
      );
    }
    current.count += 1;

    if (this.counters.size > 10_000) {
      for (const [candidateKey, counter] of this.counters) {
        if (counter.resetAt <= now) this.counters.delete(candidateKey);
      }
    }
  }
}
