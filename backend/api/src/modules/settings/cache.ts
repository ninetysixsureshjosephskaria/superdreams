/**
 * In-process configuration cache. Settings are read far more than written, so
 * the whole (small) key→value set is loaded once and served from memory. Every
 * write invalidates the cache so the next read reloads — this keeps reads fast
 * while guaranteeing writes take effect immediately.
 *
 * This deliberately uses no external cache (introduces no new Redis pattern).
 * In a multi-instance deployment a shared cache would replace this class without
 * changing its callers.
 */
export class SettingsCache {
  private readonly values = new Map<string, unknown>();
  private loaded = false;

  public isLoaded(): boolean {
    return this.loaded;
  }

  /** Populates the cache from `loader` once; subsequent calls are no-ops until invalidated. */
  public async ensureLoaded(
    loader: () => Promise<Array<{ key: string; value: unknown }>>,
  ): Promise<void> {
    if (this.loaded) {
      return;
    }
    const rows = await loader();
    this.values.clear();
    for (const row of rows) {
      this.values.set(row.key, row.value);
    }
    this.loaded = true;
  }

  public get(key: string): unknown {
    return this.values.get(key);
  }

  public has(key: string): boolean {
    return this.values.has(key);
  }

  public size(): number {
    return this.values.size;
  }

  /** Clears the cache; the next read reloads from the database. */
  public invalidate(): void {
    this.values.clear();
    this.loaded = false;
  }
}
