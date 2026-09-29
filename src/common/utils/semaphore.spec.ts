import { Semaphore } from './semaphore';

describe('Semaphore', () => {
  it('runs work immediately while a slot is available', async () => {
    const semaphore = new Semaphore(2);
    const order: number[] = [];

    await Promise.all([
      semaphore.run(async () => {
        order.push(1);
      }),
      semaphore.run(async () => {
        order.push(2);
      }),
    ]);

    expect(order).toEqual([1, 2]);
  });

  it('queues work beyond the configured concurrency limit and runs it once a slot frees', async () => {
    const semaphore = new Semaphore(1);
    const running: number[] = [];
    const maxConcurrent: number[] = [];

    const track = async (id: number) => {
      running.push(id);
      maxConcurrent.push(running.length);
      await new Promise((resolve) => setTimeout(resolve, 10));
      running.splice(running.indexOf(id), 1);
      return id;
    };

    const results = await Promise.all([
      semaphore.run(() => track(1)),
      semaphore.run(() => track(2)),
      semaphore.run(() => track(3)),
    ]);

    expect(results).toEqual([1, 2, 3]);
    expect(Math.max(...maxConcurrent)).toBe(1);
  });

  it('releases a slot after a resolved run, allowing the next queued task to start', async () => {
    const semaphore = new Semaphore(1);
    let releaseFirst!: () => void;
    let secondStarted = false;

    const first = semaphore.run(
      () =>
        new Promise<string>(
          (resolve) => (releaseFirst = () => resolve('first')),
        ),
    );
    const second = semaphore.run(async () => {
      secondStarted = true;
      return 'second';
    });

    // While `first` is still pending, its slot is held: `second` must not
    // have started yet.
    await Promise.resolve();
    expect(secondStarted).toBe(false);

    releaseFirst();
    await first;
    await second;
    expect(secondStarted).toBe(true);
  });

  it('releases a slot after a rejected run, and the rejection propagates to the caller without leaking the slot', async () => {
    const semaphore = new Semaphore(1);

    await expect(
      semaphore.run(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    // If the slot leaked, this second call would hang forever and the test
    // would time out instead of resolving.
    const result = await semaphore.run(async () => 'recovered');
    expect(result).toBe('recovered');
  });
});
