import type { FastifyBaseLogger } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSchedulerRuntime, type ScheduledJob } from '../scheduler-runtime';

function fakeLogger(): FastifyBaseLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  } as unknown as FastifyBaseLogger;
}

describe('SchedulerRuntime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs a job on demand via runJobOnce', async () => {
    const run = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const runtime = createSchedulerRuntime({
      jobs: [{ name: 'j', run }],
      intervalMs: 1000,
      logger: fakeLogger(),
    });
    await runtime.runJobOnce('j');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('isolates a failing job — never throws, logs the failure with context', async () => {
    const logger = fakeLogger();
    const run = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('boom'));
    const runtime = createSchedulerRuntime({
      jobs: [{ name: 'bad', run }],
      intervalMs: 1000,
      logger,
    });
    await expect(runtime.runJobOnce('bad')).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ job: 'bad' }),
      expect.any(String),
    );
  });

  it('warns on an unknown job instead of throwing', async () => {
    const logger = fakeLogger();
    const runtime = createSchedulerRuntime({ jobs: [], intervalMs: 1000, logger });
    await expect(runtime.runJobOnce('nope')).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('starts one timer per job, stops cleanly, and leaves no timers running', () => {
    vi.useFakeTimers();
    const jobs: ScheduledJob[] = [
      { name: 'a', run: vi.fn<() => Promise<void>>().mockResolvedValue(undefined) },
      { name: 'b', run: vi.fn<() => Promise<void>>().mockResolvedValue(undefined) },
    ];
    const runtime = createSchedulerRuntime({ jobs, intervalMs: 1000, logger: fakeLogger() });

    expect(runtime.isRunning()).toBe(false);
    runtime.start();
    expect(runtime.isRunning()).toBe(true);
    expect(vi.getTimerCount()).toBe(2);

    runtime.stop();
    expect(runtime.isRunning()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not create duplicate registrations on repeated start', () => {
    vi.useFakeTimers();
    const logger = fakeLogger();
    const jobs: ScheduledJob[] = [
      { name: 'a', run: vi.fn<() => Promise<void>>().mockResolvedValue(undefined) },
    ];
    const runtime = createSchedulerRuntime({ jobs, intervalMs: 1000, logger });

    runtime.start();
    runtime.start(); // guarded — must not add a second timer
    expect(vi.getTimerCount()).toBe(1);
    expect(logger.warn).toHaveBeenCalled();

    runtime.stop();
  });

  it('a scheduled tick invokes the job; a tick failure does not stop future ticks', async () => {
    vi.useFakeTimers();
    const run = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue(undefined);
    const runtime = createSchedulerRuntime({
      jobs: [{ name: 'a', run }],
      intervalMs: 1000,
      logger: fakeLogger(),
    });

    runtime.start();
    await vi.advanceTimersByTimeAsync(1000); // tick 1 → rejects (caught)
    await vi.advanceTimersByTimeAsync(1000); // tick 2 → resolves
    expect(run).toHaveBeenCalledTimes(2);

    runtime.stop();
  });
});
