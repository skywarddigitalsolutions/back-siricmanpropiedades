/**
 * Minimal async counting semaphore. Bounds how many `run()` callbacks can be
 * in flight at once; excess calls queue in FIFO order and start as soon as a
 * slot frees up. A slot is always released — whether the callback resolves
 * or rejects — so a rejection never leaks capacity.
 */
export class Semaphore {
  private available: number;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly maxConcurrency: number) {
    if (maxConcurrency < 1) {
      throw new Error('Semaphore maxConcurrency must be at least 1');
    }
    this.available = maxConcurrency;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.available > 0) {
      this.available -= 1;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  private release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
      return;
    }
    this.available += 1;
  }
}
