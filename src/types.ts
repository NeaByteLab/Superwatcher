/**
 * Buffered event before flush.
 * @description Holds mutable kind and path during debounce.
 */
export interface PendingEntry {
  /** Mutable event kind */
  kind: EventKind
  /** Normalized file path */
  path: string
}

/**
 * Emitted file system event.
 * @description Readonly event dispatched to onChange callback.
 */
export interface WatchEvent {
  /** File system event kind */
  readonly kind: EventKind
  /** Normalized file path */
  readonly path: string
}

/**
 * Configuration for Superwatcher constructor.
 * @description Defines paths, debounce, ignore, and callbacks.
 */
export interface WatcherOptions {
  /** Milliseconds to debounce events */
  readonly debounceMs: number
  /** Matchers to exclude file paths */
  readonly ignore?: readonly IgnoreMatcher[]
  /** Callback receiving batched watch events */
  readonly onChange: (events: WatchEvent[]) => void
  /** File or directory paths to watch */
  readonly path: string | readonly string[]
  /** Watch subdirectories recursively */
  readonly recursive?: boolean
  /** Write stability polling configuration */
  readonly writeStable?: WriteStable
}

/**
 * Write stability polling options.
 * @description Controls size polling interval and stability threshold.
 */
export interface WriteStable {
  /** Milliseconds between size polls */
  readonly interval: number
  /** Milliseconds of stable size required */
  readonly threshold: number
}

/** File system event classification. */
export type EventKind = 'access' | 'create' | 'modify' | 'remove'

/** Ignore pattern as string, RegExp, or function. */
export type IgnoreMatcher = string | RegExp | ((path: string) => boolean)

/**
 * Compiled ignore matcher function.
 * @param filePath - Normalized file path to test
 * @returns True if path should be ignored
 */
export type IgnoreMatcherFn = (filePath: string) => boolean

/** Timer identifier from setTimeout. */
export type TimerId = ReturnType<typeof setTimeout>
