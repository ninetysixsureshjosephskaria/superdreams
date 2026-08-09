import type { FastifyBaseLogger } from 'fastify';

/**
 * A single background job. `run` performs one execution of the job's existing,
 * idempotent logic (e.g. a module's `create*Scheduler(...).run()`). The runtime
 * never inspects the result — it only invokes and guards it.
 */
export interface ScheduledJob {
  readonly name: string;
  run: () => Promise<unknown>;
}

export interface SchedulerRuntime {
  /** Starts one interval timer per job. Idempotent — a second call is ignored. */
  start: () => void;
  /** Clears every timer. Safe to call when not started (no-op). */
  stop: () => void;
  isRunning: () => boolean;
  listJobs: () => readonly string[];
  /**
   * Runs a single job once with the same error isolation as a scheduled tick.
   * Never throws (a failing job is logged, not propagated). Backs on-demand
   * execution and tests without waiting on a real interval.
   */
  runJobOnce: (name: string) => Promise<void>;
}

export interface SchedulerRuntimeOptions {
  jobs: readonly ScheduledJob[];
  intervalMs: number;
  logger: FastifyBaseLogger;
}

/**
 * Minimal in-process scheduler runtime. It is the single host that actually
 * *runs* the modules' existing job factories — it does not define new jobs or
 * duplicate their logic. Timers are `unref`'d so they never keep the process (or
 * a test's event loop) alive, and each tick is fully isolated: a job failure is
 * logged with context and the next tick still fires, never crashing the process.
 */
export function createSchedulerRuntime(options: SchedulerRuntimeOptions): SchedulerRuntime {
  const { jobs, intervalMs, logger } = options;
  const timers = new Map<string, NodeJS.Timeout>();
  let running = false;

  async function tick(job: ScheduledJob): Promise<void> {
    try {
      await job.run();
    } catch (error) {
      logger.error({ err: error, job: job.name }, 'scheduled job failed; will retry next tick');
    }
  }

  return {
    start(): void {
      if (running) {
        logger.warn('scheduler runtime already started; ignoring duplicate start');
        return;
      }
      running = true;
      for (const job of jobs) {
        const timer = setInterval(() => {
          void tick(job);
        }, intervalMs);
        timer.unref();
        timers.set(job.name, timer);
      }
      logger.info({ jobs: jobs.map((job) => job.name), intervalMs }, 'scheduler runtime started');
    },

    stop(): void {
      for (const timer of timers.values()) {
        clearInterval(timer);
      }
      timers.clear();
      running = false;
    },

    isRunning(): boolean {
      return running;
    },

    listJobs(): readonly string[] {
      return jobs.map((job) => job.name);
    },

    async runJobOnce(name: string): Promise<void> {
      const job = jobs.find((candidate) => candidate.name === name);
      if (!job) {
        logger.warn({ job: name }, 'unknown scheduled job requested');
        return;
      }
      await tick(job);
    },
  };
}
