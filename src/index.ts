import { Utils } from '@app/utils.ts'
import type * as Types from '@app/types.ts'

/**
 * Debounced file system watcher.
 * @description Watches paths and batches events with debounce.
 */
export class Superwatcher {
  /** Debounce delay in milliseconds */
  private readonly debounceMs: number
  /** Specific file names to watch */
  private readonly fileTargets: Set<string>
  /** Compiled ignore matcher functions */
  private readonly ignoreMatchers: Types.IgnoreMatcherFn[]
  /** Batched event change callback */
  private readonly onChange: (events: Types.WatchEvent[]) => void
  /** Events buffered during debounce */
  private readonly pendingPaths: Map<string, Types.PendingEntry> = new Map()
  /** Watch subdirectories recursively */
  private readonly recursive: boolean
  /** Active write stability poll timers */
  private readonly sizePollers: Map<string, Types.TimerId> = new Map()
  /** Resolved directory paths to watch */
  private readonly watchPaths: string[]
  /** Write stability polling configuration */
  private readonly writeStable: Types.WriteStable | undefined
  /** Active debounce flush timer */
  private debounceTimer: Types.TimerId | null = null
  /** Underlying Deno file system watcher */
  private watcher: Deno.FsWatcher | null = null

  /**
   * Create a Superwatcher instance.
   * @description Validates options and resolves watch paths.
   * @param options - Watcher configuration options
   */
  constructor(options: Types.WatcherOptions) {
    Utils.validateOptions(options)
    const rawPaths = Array.isArray(options.path)
      ? (options.path as string[])
      : [options.path as string]
    this.fileTargets = new Set()
    this.watchPaths = []
    this.recursive = options.recursive ?? true
    for (const targetPath of rawPaths) {
      try {
        Deno.statSync(targetPath)
      } catch {
        throw new Deno.errors.NotFound(`Cannot watch '${targetPath}' because it does not exist`)
      }
      const normalized = Utils.normalize(Deno.realPathSync(targetPath))
      const stat = Deno.statSync(normalized)
      if (stat.isFile) {
        const separatorIndex = normalized.lastIndexOf('/')
        const dirPath = separatorIndex > 0 ? normalized.slice(0, separatorIndex) : '.'
        this.fileTargets.add(Utils.baseName(normalized))
        if (!this.watchPaths.includes(dirPath)) {
          this.watchPaths.push(dirPath)
        }
      } else {
        this.watchPaths.push(normalized)
      }
    }
    this.debounceMs = options.debounceMs
    this.onChange = options.onChange
    this.writeStable = options.writeStable
    this.ignoreMatchers = (options.ignore ?? []).map((matcher) => this.compileMatcher(matcher))
  }

  /** Stop watching and release resources */
  dispose(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    for (const timer of this.sizePollers.values()) {
      clearTimeout(timer)
    }
    this.sizePollers.clear()
    this.pendingPaths.clear()
    try {
      this.watcher?.close()
    } catch {
      // no-op
    }
    this.watcher = null
  }

  /** Begin watching configured paths */
  start(): void {
    if (this.watchPaths.length === 0) {
      return
    }
    this.dispose()
    const recursive = this.fileTargets.size === 0 && this.recursive
    const paths = this.watchPaths.length === 1 ? this.watchPaths[0]! : this.watchPaths
    try {
      this.watcher = Deno.watchFs(paths, { recursive })
      this.listen()
    } catch {
      this.watcher = null
    }
  }

  /**
   * Compile an ignore matcher.
   * @description Converts string, RegExp, or function to matcher.
   * @param matcher - Raw ignore matcher pattern
   * @returns Compiled matcher function
   */
  private compileMatcher(matcher: Types.IgnoreMatcher): Types.IgnoreMatcherFn {
    if (typeof matcher === 'function') {
      return matcher
    }
    if (typeof matcher === 'string') {
      return (filePath) => filePath.endsWith(matcher) || Utils.baseName(filePath) === matcher
    }
    if (matcher instanceof RegExp) {
      return (filePath) => matcher.test(filePath)
    }
    return () => false
  }

  /** Flush pending events to onChange callback */
  private flush(): void {
    this.debounceTimer = null
    if (this.pendingPaths.size === 0) {
      return
    }
    const entries = [...this.pendingPaths.values()]
    this.pendingPaths.clear()
    const resolvedEvents: Types.WatchEvent[] = []
    let pendingCount = entries.length
    const emitResolved = (): void => {
      if (resolvedEvents.length === 0) {
        return
      }
      try {
        this.onChange(resolvedEvents)
      } catch {
        // no-op
      }
    }
    const collectEntry = (entry: Types.PendingEntry): void => {
      resolvedEvents.push({ kind: entry.kind, path: entry.path })
      pendingCount--
      if (pendingCount === 0) {
        emitResolved()
      }
    }
    for (const entry of entries) {
      this.resolveEntry(entry)
      if (this.writeStable && entry.kind !== 'remove') {
        this.pollWriteStable(entry.path, () => collectEntry(entry))
      } else {
        collectEntry(entry)
      }
    }
  }

  /**
   * Check if path is ignored.
   * @description Tests path against all compiled ignore matchers.
   * @param filePath - Normalized file path to check
   * @returns True if path matches any ignore rule
   */
  private isIgnored(filePath: string): boolean {
    for (const matchFn of this.ignoreMatchers) {
      if (matchFn(filePath)) {
        return true
      }
    }
    return false
  }

  /** Consume watcher events asynchronously */
  private async listen(): Promise<void> {
    if (!this.watcher) {
      return
    }
    try {
      for await (const event of this.watcher) {
        const kind = Utils.resolveEventKind(event.kind)
        if (kind === null) {
          continue
        }
        for (const eventPath of event.paths) {
          const normalized = Utils.normalize(eventPath)
          if (this.fileTargets.size > 0 && !this.fileTargets.has(Utils.baseName(normalized))) {
            continue
          }
          if (this.isIgnored(normalized)) {
            continue
          }
          this.setPending(normalized, kind)
          this.scheduleFlush()
        }
      }
    } catch {
      // no-op
    }
  }

  /**
   * Poll file size for stability.
   * @description Waits until file size stops changing before callback.
   * @param filePath - Path to poll for size stability
   * @param callback - Called when file size is stable
   */
  private pollWriteStable(filePath: string, callback: () => void): void {
    if (!this.writeStable) {
      callback()
      return
    }
    const existing = this.sizePollers.get(filePath)
    if (existing) {
      clearTimeout(existing)
    }
    let lastSize = -1
    let stableSince = Date.now()
    const { threshold, interval } = this.writeStable
    const poll = (): void => {
      try {
        const fileInfo = Deno.statSync(filePath)
        const now = Date.now()
        if (fileInfo.size !== lastSize) {
          lastSize = fileInfo.size
          stableSince = now
        }
        if (now - stableSince >= threshold) {
          this.sizePollers.delete(filePath)
          callback()
        } else {
          this.sizePollers.set(filePath, setTimeout(poll, interval))
        }
      } catch {
        this.sizePollers.delete(filePath)
      }
    }
    this.sizePollers.set(filePath, setTimeout(poll, interval))
  }

  /**
   * Resolve remove to modify if exists.
   * @description Corrects false remove events when file still exists.
   * @param entry - Pending entry to resolve
   */
  private resolveEntry(entry: Types.PendingEntry): void {
    if (entry.kind === 'remove') {
      try {
        Deno.statSync(entry.path)
        entry.kind = 'modify'
      } catch {
        // no-op
      }
    }
  }

  /** Schedule debounced flush of pending events */
  private scheduleFlush(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
    }
    this.debounceTimer = setTimeout(() => {
      this.flush()
    }, this.debounceMs)
  }

  /**
   * Buffer or update a pending event.
   * @description Merges remove-then-change sequences into modify.
   * @param filePath - Normalized file path
   * @param kind - File system event kind
   */
  private setPending(filePath: string, kind: Types.EventKind): void {
    const existing = this.pendingPaths.get(filePath)
    if (existing && existing.kind === 'remove' && kind !== 'remove') {
      existing.kind = 'modify'
    } else {
      this.pendingPaths.set(filePath, { path: filePath, kind })
    }
  }
}

/** Re-export all public type definitions */
export type * from '@app/types.ts'
