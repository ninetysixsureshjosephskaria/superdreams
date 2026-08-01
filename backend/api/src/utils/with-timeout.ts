/**
 * Races a promise against a timeout, rejecting if it does not settle in time.
 *
 * Used to keep health checks responsive when a downstream dependency is slow or
 * unreachable, so a hanging connection never blocks the health endpoint.
 */
export async function withTimeout<T>(
  operation: PromiseLike<T>,
  timeoutMs: number,
  message = 'Operation timed out',
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
